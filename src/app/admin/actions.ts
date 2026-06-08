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
import { products, orders, auditLog, staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { OrderStatus, PaymentMethod } from "@/db/schema";
import {
  processOrderPayment,
  confirmDeliveryPayment as _confirmDelivery,
  PaymentError,
} from "@/lib/payment";

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
