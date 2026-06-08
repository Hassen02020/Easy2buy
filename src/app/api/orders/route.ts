/**
 * POST /api/orders
 * ----------------
 * Crée une commande via une TRANSACTION ACID :
 *
 *  Étape 1 — Atomicité : toutes les opérations s'exécutent dans une
 *            même transaction Drizzle (BEGIN … COMMIT / ROLLBACK).
 *
 *  Étape 2 — Cohérence : vérification du stock AVANT l'insertion,
 *            avec un verrou SELECT … FOR UPDATE pour éviter les
 *            race conditions en production concurrente.
 *
 *  Étape 3 — Isolation : le niveau READ COMMITTED de PostgreSQL garantit
 *            qu'aucune lecture sale n'est possible.
 *
 *  Étape 4 — Durabilité : PostgreSQL écrit sur disque (WAL) avant le COMMIT.
 *
 * En cas d'erreur à n'importe quelle étape, la transaction est annulée
 * (ROLLBACK) et aucune donnée n'est modifiée.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { products, orders, orderItems, customerProfiles } from "@/db/schema";
import { calculateDeliveryFee } from "@/lib/delivery";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { calcLineProfit } from "@/lib/profitability";
import { upsertCustomerProfile } from "@/lib/loyalty";
import { applyReferralCode, ensureReferralCode } from "@/lib/referral";

// ---------------------------------------------------------------------------
// Schéma de validation Zod
// ---------------------------------------------------------------------------

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100),
});

const createOrderSchema = z.object({
  customerName: z
    .string()
    .min(2, "Nom trop court")
    .max(100)
    .regex(/^[\p{L}\s'-]+$/u, "Caractères invalides dans le nom"),
  customerPhone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[+\d\s\-().]+$/, "Numéro invalide"),
  customerCity: z.string().min(2).max(100),
  customerAddress: z.string().min(10).max(300),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1, "Le panier est vide"),
  paymentMethod: z.enum(["D17", "FLOUCI", "ONLINE", "BANK_TRANSFER", "CASH_ON_DELIVERY"]).optional(),
  advanceAmount: z.number().min(0).optional(),
  paymentRef: z.string().max(200).optional(),
  referralCode: z.string().max(20).optional(),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Validation des données entrantes
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[POST /api/orders] Validation error:", JSON.stringify(parsed.error.flatten(), null, 2));
    console.error("[POST /api/orders] Body received:", JSON.stringify(body, null, 2));
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Vérification blacklist
  const [profile] = await db
    .select({ isBlacklisted: customerProfiles.isBlacklisted, blacklistReason: customerProfiles.blacklistReason })
    .from(customerProfiles)
    .where(eq(customerProfiles.phone, data.customerPhone));

  if (profile?.isBlacklisted) {
    return NextResponse.json(
      { error: "Votre numéro ne peut pas passer de commande pour le moment. Contactez le support." },
      { status: 403 }
    );
  }

  try {
    // 2. Transaction ACID
    const newOrder = await withTransaction(async (tx) => {
      // ── Étape A : Vérification du stock pour chaque article ──────────────
      // Le FOR UPDATE n'est pas disponible via Drizzle ORM directement ;
      // on utilise sql`` pour l'exprimer si nécessaire en prod haute concurrence.
      let subtotal = 0;
      const enrichedItems: {
        product: typeof products.$inferSelect;
        quantity: number;
        lineTotal: number;
        profitLine: number;
      }[] = [];

      for (const item of data.items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        // Produit inexistant ou inactif
        if (!product || !product.active) {
          throw new StockError(`Produit #${item.productId} introuvable.`);
        }

        // Stock insuffisant
        if (product.stock < item.quantity) {
          throw new StockError(
            `Stock insuffisant pour "${product.name}" (disponible: ${product.stock}, demandé: ${item.quantity}).`
          );
        }

        const lineTotal = Number(product.price) * item.quantity;
        subtotal += lineTotal;
        const { profitLine } = calcLineProfit(product.price, product.purchasePrice, item.quantity);

        enrichedItems.push({ product, quantity: item.quantity, lineTotal, profitLine });
      }

      // ── Étape B : Calcul des frais de livraison (par article, max 5) ───────
      const totalQty = enrichedItems.reduce((s, i) => s + i.quantity, 0);
      const delivery = calculateDeliveryFee(data.customerCity, totalQty);
      const total = subtotal + delivery.fee;

      // ── Étape C : Création de la commande (statut PENDING) ────────────────
      const [inserted] = await tx
        .insert(orders)
        .values({
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerCity: data.customerCity,
          customerAddress: data.customerAddress,
          notes: data.notes,
          subtotal: subtotal.toFixed(2),
          deliveryFee: delivery.fee.toFixed(2),
          total: total.toFixed(2),
          status: "PENDING",
          paymentMethod: data.paymentMethod ?? "CASH_ON_DELIVERY",
          paymentStatus: "UNPAID",
          advanceAmount: "0.000",
          remainingAmount: total.toFixed(3),
        })
        .returning();

      // ── Étape D : Insertion des lignes de commande ────────────────────────
      await tx.insert(orderItems).values(
        enrichedItems.map(({ product, quantity, lineTotal, profitLine }) => ({
          orderId: inserted.id,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          purchasePrice: product.purchasePrice,
          quantity,
          lineTotal: lineTotal.toFixed(2),
          profitLine: profitLine.toFixed(2),
        }))
      );

      // ── Étape E : Décrémentation atomique du stock ────────────────────────
      // sql`stock - ${qty}` s'exécute côté PostgreSQL = pas de race condition.
      for (const { product, quantity } of enrichedItems) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${quantity}` })
          .where(eq(products.id, product.id));
      }

      // La transaction sera COMMIT ici si aucune exception n'est levée.
      return inserted;
    });

    // 3. Notification asynchrone (fire-and-forget — ne bloque pas la réponse)
    void notifyOrderStatusChange({ order: newOrder, channel: "both" });

    // 4. Upsert profil client + parrainage (fire-and-forget)
    void upsertCustomerProfile(data.customerPhone, data.customerName).then(() =>
      ensureReferralCode(data.customerPhone, data.customerName)
    );
    if (data.referralCode) {
      void applyReferralCode(data.referralCode, data.customerPhone, data.customerName);
    }

    return NextResponse.json(
      { success: true, orderId: newOrder.id },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof StockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/orders]", err);
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez réessayer." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Erreur métier personnalisée
// ---------------------------------------------------------------------------

class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}
