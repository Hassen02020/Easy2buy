"use server";

/**
 * app/admin/actions.ts
 * ---------------------
 * Server Actions pour le backoffice :
 *   - upsertProduct   : créer ou modifier un produit
 *   - changeOrderStatus : changer le statut + écrire dans audit_log
 *   - assignOrder     : assigner agent / livreur à une commande
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { products, orders, auditLog, staff, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { OrderStatus, PaymentMethod, StaffRole } from "@/db/schema";
import {
  processOrderPayment,
  confirmDeliveryPayment as _confirmDelivery,
  PaymentError,
} from "@/lib/payment";
import { requireAccess, RBACError } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Product Upsert
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url("URL invalide").optional().or(z.literal("")),
  images: z.string().optional(),           // JSON array string
  videoUrl: z.string().url().optional().or(z.literal("")),
  lightNeeds: z.string().max(50).optional().or(z.literal("")),
  waterNeeds: z.string().max(50).optional().or(z.literal("")),
  tempRange: z.string().max(30).optional().or(z.literal("")),
  climaticZones: z.string().optional(),    // JSON array string
  careDifficulty: z.string().max(20).optional().or(z.literal("")),
  suggestedProductIds: z.string().optional(), // JSON array string
  price: z.coerce.number().positive("Prix de vente requis"),
  purchasePrice: z.coerce.number().min(0),
  category: z.enum(["interieur", "exterieur", "succulente", "aromatique"]),
  stock: z.coerce.number().int().min(0),
  active: z.coerce.boolean().optional().default(true),
});

export async function upsertProduct(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { id, name, ...rest } = parsed.data;
  const slug = slugify(name);

  const dbValues = {
    name,
    slug,
    description: rest.description,
    imageUrl: rest.imageUrl || null,
    images: rest.images || "[]",
    videoUrl: rest.videoUrl || null,
    lightNeeds: rest.lightNeeds || null,
    waterNeeds: rest.waterNeeds || null,
    tempRange: rest.tempRange || null,
    climaticZones: rest.climaticZones || "[]",
    careDifficulty: rest.careDifficulty || null,
    suggestedProductIds: rest.suggestedProductIds || "[]",
    price: String(rest.price),
    purchasePrice: String(rest.purchasePrice),
    category: rest.category,
    stock: rest.stock,
    active: rest.active ?? true,
  };

  if (id) {
    await db
      .update(products)
      .set({ ...dbValues, updatedAt: new Date() })
      .where(eq(products.id, id));
  } else {
    await db.insert(products).values(dbValues);
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  redirect("/admin/products");
}

// ---------------------------------------------------------------------------
// Delete Product
// ---------------------------------------------------------------------------

export async function deleteProduct(id: number) {
  await db.update(products).set({ active: false }).where(eq(products.id, id));
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Change Order Status + Audit Trail
// ---------------------------------------------------------------------------

const statusSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  newStatus: z.enum(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
  staffId: z.coerce.number().int().positive().optional(),
  note: z.string().max(300).optional(),
});

export async function changeOrderStatus(formData: FormData) {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Données invalides" };

  const { orderId, newStatus, staffId, note } = parsed.data;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { error: "Commande introuvable" };

  // Résoudre le nom du staff pour le snapshot audit
  let staffName: string | null = null;
  if (staffId) {
    const [member] = await db.select().from(staff).where(eq(staff.id, staffId));
    staffName = member?.name ?? null;
  }

  // Mise à jour RBAC automatique selon le statut
  const rbacUpdate: Partial<typeof orders.$inferInsert> = {
    status: newStatus,
    updatedAt: new Date(),
  };
  if (newStatus === "CONFIRMED" && staffId) rbacUpdate.confirmedBy = staffId;
  if (newStatus === "DELIVERED" && staffId)  rbacUpdate.deliveredBy = staffId;

  await db.update(orders).set(rbacUpdate).where(eq(orders.id, orderId));

  // Écriture dans audit_log
  await db.insert(auditLog).values({
    orderId,
    staffId: staffId ?? null,
    staffName,
    fromStatus: order.status,
    toStatus: newStatus as OrderStatus,
    note: note ?? null,
  });

  // Log console (notification simulée)
  console.log(`[AUDIT] Commande #${orderId} : ${order.status} → ${newStatus} | par ${staffName ?? "système"}`);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
}

// ---------------------------------------------------------------------------
// Assign Order
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  assignedTo: z.coerce.number().int().positive().optional(),
  deliveredBy: z.coerce.number().int().positive().optional(),
});

export async function assignOrder(formData: FormData) {
  const parsed = assignSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Données invalides" };

  const { orderId, assignedTo, deliveredBy } = parsed.data;

  await db
    .update(orders)
    .set({
      ...(assignedTo !== undefined && { assignedTo }),
      ...(deliveredBy !== undefined && { deliveredBy }),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath("/admin/orders");
}

// ---------------------------------------------------------------------------
// setOrderPayment — définir le mode de paiement (HYBRID ou COD)
// ---------------------------------------------------------------------------

const setPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  mode: z.enum(["HYBRID", "COD"]),
  paymentMethod: z.enum(["D17", "FLOUCI", "ONLINE", "BANK_TRANSFER", "CASH_ON_DELIVERY"]).optional(),
  advanceAmount: z.coerce.number().optional(),
  paymentRef: z.string().optional(),
  staffId: z.coerce.number().int().positive().optional(),
});

export async function setOrderPayment(formData: FormData): Promise<{ error?: string }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = setPaymentSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { orderId, mode, paymentMethod, advanceAmount, paymentRef, staffId } = parsed.data;

  try {
    if (mode === "HYBRID") {
      if (!paymentMethod || paymentMethod === "CASH_ON_DELIVERY" || !advanceAmount) {
        return { error: "Méthode et montant d'avance requis pour le mode hybride" };
      }
      await processOrderPayment({
        mode: "HYBRID",
        orderId,
        paymentMethod: paymentMethod as Exclude<PaymentMethod, "CASH_ON_DELIVERY">,
        advanceAmount,
        paymentRef,
        staffId,
      });
    } else {
      await processOrderPayment({ mode: "COD", orderId, staffId });
    }
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    console.error("[setOrderPayment]", err);
    return { error: "Erreur serveur lors de l'enregistrement du paiement" };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

// ---------------------------------------------------------------------------
// confirmDeliveryPayment — clôturer le paiement à la livraison
// ---------------------------------------------------------------------------

const confirmPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  staffId: z.coerce.number().int().positive().optional(),
  paymentRef: z.string().optional(),
});

export async function confirmDeliveryPayment(formData: FormData): Promise<{ error?: string; collected?: number }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = confirmPaymentSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Récupérer le nom du staff si staffId fourni
  let staffName: string | undefined;
  if (parsed.data.staffId) {
    const [member] = await db.select({ name: staff.name }).from(staff).where(eq(staff.id, parsed.data.staffId));
    staffName = member?.name;
  }

  try {
    const result = await _confirmDelivery({
      orderId: parsed.data.orderId,
      staffId: parsed.data.staffId,
      staffName,
      paymentRef: parsed.data.paymentRef,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    revalidatePath("/admin/dashboard");
    return { collected: result.collectedAmount };
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    console.error("[confirmDeliveryPayment]", err);
    return { error: "Erreur lors de la confirmation du paiement" };
  }
}

// ---------------------------------------------------------------------------
// Workflow — Assignation de tâche (ASSIGN_ORDER : Admin / Agent)
// ---------------------------------------------------------------------------

/**
 * assignTask : assigne un membre du staff à un rôle sur une commande.
 * FormData : orderId, role ("assignedTo"|"preparedBy"|"packedBy"|"deliveredBy"), staffId, actorRole
 */
export async function assignTask(formData: FormData): Promise<{ error?: string }> {
  const orderId    = Number(formData.get("orderId"));
  const role       = String(formData.get("role")) as "assignedTo" | "preparedBy" | "packedBy" | "deliveredBy";
  const staffId    = Number(formData.get("staffId")) || null;
  const actorRole  = String(formData.get("actorRole") ?? "") as StaffRole;

  if (!orderId || !role) return { error: "Paramètres manquants." };

  try {
    requireAccess(actorRole, "ASSIGN_ORDER");
  } catch (e) {
    if (e instanceof RBACError) return { error: e.message };
    throw e;
  }

  // Récupère le nom du staff assigné pour le log
  let staffName: string | null = null;
  if (staffId) {
    const [member] = await db.select({ name: staff.name }).from(staff).where(eq(staff.id, staffId));
    staffName = member?.name ?? null;
  }

  const ROLE_TO_COLUMN = {
    assignedTo:  { col: orders.assignedTo,  action: "ASSIGNED"  },
    preparedBy:  { col: orders.preparedBy,  action: "PREPARED"  },
    packedBy:    { col: orders.packedBy,    action: "PACKED"    },
    deliveredBy: { col: orders.deliveredBy, action: "DELIVERED" },
  } as const;

  const mapping = ROLE_TO_COLUMN[role];
  if (!mapping) return { error: "Rôle invalide." };

  await db.transaction(async (tx) => {
    await tx.update(orders)
      .set({ [role]: staffId, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx.insert(workflowEvents).values({
      orderId,
      staffId,
      staffName,
      action: mapping.action,
      note: staffName ? `Assigné à ${staffName}` : "Désassigné",
    });
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}

// ---------------------------------------------------------------------------
// Workflow — Marquer "Emballé" (MARK_PACKED : Admin / Agent / Livreur)
// ---------------------------------------------------------------------------

export async function markPacked(formData: FormData): Promise<{ error?: string }> {
  const orderId   = Number(formData.get("orderId"));
  const staffId   = Number(formData.get("staffId")) || null;
  const actorRole = String(formData.get("actorRole") ?? "") as StaffRole;

  if (!orderId) return { error: "orderId manquant." };

  try { requireAccess(actorRole, "MARK_PACKED"); }
  catch (e) { if (e instanceof RBACError) return { error: e.message }; throw e; }

  let staffName: string | null = null;
  if (staffId) {
    const [m] = await db.select({ name: staff.name }).from(staff).where(eq(staff.id, staffId));
    staffName = m?.name ?? null;
  }

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ packedBy: staffId, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(workflowEvents).values({ orderId, staffId, staffName, action: "PACKED", note: `Emballé par ${staffName ?? "inconnu"}` });
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Workflow — Marquer "Préparé" (MARK_PREPARED : Admin / Agent)
// ---------------------------------------------------------------------------

export async function markPrepared(formData: FormData): Promise<{ error?: string }> {
  const orderId   = Number(formData.get("orderId"));
  const staffId   = Number(formData.get("staffId")) || null;
  const actorRole = String(formData.get("actorRole") ?? "") as StaffRole;

  if (!orderId) return { error: "orderId manquant." };

  try { requireAccess(actorRole, "MARK_PREPARED"); }
  catch (e) { if (e instanceof RBACError) return { error: e.message }; throw e; }

  let staffName: string | null = null;
  if (staffId) {
    const [m] = await db.select({ name: staff.name }).from(staff).where(eq(staff.id, staffId));
    staffName = m?.name ?? null;
  }

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ preparedBy: staffId, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(workflowEvents).values({ orderId, staffId, staffName, action: "PREPARED", note: `Préparé par ${staffName ?? "inconnu"}` });
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Modifier infos client sur commande (AGENT/ADMIN) + historique workflow
// ---------------------------------------------------------------------------

export async function updateCustomerInfo(formData: FormData): Promise<{ error?: string }> {
  const orderId     = Number(formData.get("orderId"));
  const staffId     = Number(formData.get("staffId")) || null;
  const actorRole   = String(formData.get("actorRole") ?? "") as StaffRole;
  const phone       = String(formData.get("customerPhone") ?? "").trim();
  const address     = String(formData.get("customerAddress") ?? "").trim();
  const city        = String(formData.get("customerCity") ?? "").trim();
  const notes       = String(formData.get("notes") ?? "").trim();

  if (!orderId) return { error: "orderId manquant." };

  try { requireAccess(actorRole, "CHANGE_STATUS"); }
  catch (e) { if (e instanceof RBACError) return { error: e.message }; throw e; }

  const [order] = await db.select({ customerPhone: orders.customerPhone, customerAddress: orders.customerAddress }).from(orders).where(eq(orders.id, orderId));
  if (!order) return { error: "Commande introuvable." };

  let staffName: string | null = null;
  if (staffId) {
    const [m] = await db.select({ name: staff.name }).from(staff).where(eq(staff.id, staffId));
    staffName = m?.name ?? null;
  }

  const changes: string[] = [];
  if (phone && phone !== order.customerPhone) changes.push(`Tél: ${order.customerPhone} → ${phone}`);
  if (address && address !== order.customerAddress) changes.push(`Adresse modifiée`);
  if (city) changes.push(`Ville: ${city}`);

  await db.transaction(async (tx) => {
    await tx.update(orders).set({
      ...(phone   && { customerPhone: phone }),
      ...(address && { customerAddress: address }),
      ...(city    && { customerCity: city }),
      ...(notes   !== undefined && { notes: notes || null }),
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    if (changes.length > 0) {
      await tx.insert(workflowEvents).values({
        orderId,
        staffId,
        staffName,
        action: "ASSIGNED",
        note: `Infos client modifiées par ${staffName ?? "staff"}: ${changes.join("; ")}`,
      });
    }
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Bon de Livraison — Notes logistiques (Admin / Agent)
// ---------------------------------------------------------------------------

export async function updateDeliveryNotes(formData: FormData): Promise<void> {
  const orderId = Number(formData.get("orderId"));
  const deliveryNotes = String(formData.get("deliveryNotes") ?? "").trim();
  if (!orderId) return;

  await db
    .update(orders)
    .set({ deliveryNotes: deliveryNotes || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  revalidatePath(`/admin/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// Bon de Livraison — Remarques livreur
// ---------------------------------------------------------------------------

export async function updateCourierRemarks(formData: FormData): Promise<void> {
  const orderId = Number(formData.get("orderId"));
  const courierRemarks = String(formData.get("courierRemarks") ?? "").trim();
  if (!orderId) return;

  await db
    .update(orders)
    .set({ courierRemarks: courierRemarks || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  revalidatePath(`/admin/orders/${orderId}`);
}
