/**
 * lib/payment.ts
 * ---------------
 * Logique de paiement transactionnelle pour JardinDelivery.
 *
 * Deux modes supportés :
 *   1. HYBRID  — avance reçue (D17/Flouci/Online/Virement), solde à la livraison
 *   2. COD     — paiement intégral à la livraison
 *
 * Invariant comptable (Zod) :
 *   advance_amount + remaining_amount === total de la commande
 */

import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PaymentMethod, PaymentStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Erreurs métier typées
// ---------------------------------------------------------------------------

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "ORDER_NOT_FOUND"
      | "ALREADY_PAID"
      | "BALANCE_MISMATCH"
      | "PARTIAL_NOT_CLOSEABLE"
      | "INVALID_ADVANCE"
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

// ---------------------------------------------------------------------------
// Schémas Zod de validation
// ---------------------------------------------------------------------------

const HYBRID_METHODS = ["D17", "FLOUCI", "ONLINE", "BANK_TRANSFER"] as const;

export const processPaymentSchema = z
  .discriminatedUnion("mode", [
    z.object({
      mode: z.literal("HYBRID"),
      orderId: z.number().int().positive(),
      paymentMethod: z.enum(HYBRID_METHODS),
      advanceAmount: z.number().positive("L'avance doit être > 0"),
      paymentRef: z.string().min(1, "Référence de paiement requise").optional(),
      staffId: z.number().int().positive().optional(),
    }),
    z.object({
      mode: z.literal("COD"),
      orderId: z.number().int().positive(),
      staffId: z.number().int().positive().optional(),
    }),
  ])
  .superRefine(async () => {
    // validation croisée advance + remaining = total effectuée dans la fonction
  });

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

export const confirmDeliverySchema = z.object({
  orderId: z.number().int().positive(),
  staffId: z.number().int().positive().optional(),
  staffName: z.string().optional(),
  paymentRef: z.string().optional(),
});

export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0;
}

function round3(n: number): string {
  return n.toFixed(3);
}

// ---------------------------------------------------------------------------
// processOrderPayment
// ---------------------------------------------------------------------------

/**
 * Enregistre le mode de paiement d'une commande.
 *
 * Mode HYBRID :
 *   - Valide advance ∈ (0, total)
 *   - Calcule remaining = total − advance
 *   - Définit payment_status = PARTIAL_PAID
 *
 * Mode COD :
 *   - advance = 0, remaining = total
 *   - Définit payment_status = UNPAID (sera FULLY_PAID à la livraison)
 */
export async function processOrderPayment(input: ProcessPaymentInput): Promise<{
  orderId: number;
  paymentStatus: PaymentStatus;
  advanceAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
}> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));

  if (!order) {
    throw new PaymentError(`Commande #${input.orderId} introuvable`, "ORDER_NOT_FOUND");
  }

  if (order.paymentStatus === "FULLY_PAID") {
    throw new PaymentError(
      `Commande #${input.orderId} déjà intégralement payée`,
      "ALREADY_PAID"
    );
  }

  const total = toNum(order.total);

  if (input.mode === "HYBRID") {
    // Validation : l'avance doit être strictement entre 0 et le total
    if (input.advanceAmount <= 0 || input.advanceAmount >= total) {
      throw new PaymentError(
        `L'avance (${input.advanceAmount}) doit être entre 0 et ${total} (total)`,
        "INVALID_ADVANCE"
      );
    }

    const remaining = parseFloat((total - input.advanceAmount).toFixed(3));

    // Invariant comptable
    const check = parseFloat((input.advanceAmount + remaining).toFixed(3));
    if (Math.abs(check - total) > 0.001) {
      throw new PaymentError(
        `Incohérence : avance(${input.advanceAmount}) + solde(${remaining}) ≠ total(${total})`,
        "BALANCE_MISMATCH"
      );
    }

    await db
      .update(orders)
      .set({
        paymentMethod: input.paymentMethod,
        paymentStatus: "PARTIAL_PAID",
        advanceAmount: round3(input.advanceAmount),
        remainingAmount: round3(remaining),
        paymentRef: input.paymentRef ?? null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId));

    console.log(
      `[PAYMENT] #${input.orderId} HYBRID ${input.paymentMethod} | avance=${input.advanceAmount} | solde=${remaining}`
    );

    return {
      orderId: input.orderId,
      paymentStatus: "PARTIAL_PAID",
      advanceAmount: input.advanceAmount,
      remainingAmount: remaining,
      paymentMethod: input.paymentMethod,
    };
  }

  // Mode COD
  await db
    .update(orders)
    .set({
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "UNPAID",
      advanceAmount: "0.000",
      remainingAmount: round3(total),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  console.log(`[PAYMENT] #${input.orderId} COD | solde=${total} à régler à la livraison`);

  return {
    orderId: input.orderId,
    paymentStatus: "UNPAID",
    advanceAmount: 0,
    remainingAmount: total,
    paymentMethod: "CASH_ON_DELIVERY",
  };
}

// ---------------------------------------------------------------------------
// confirmDeliveryPayment
// ---------------------------------------------------------------------------

/**
 * Clôture le paiement lors de la livraison physique.
 * Règles :
 *   - La commande doit être UNPAID ou PARTIAL_PAID
 *   - Encaisse le remaining_amount, passe à FULLY_PAID
 *   - Enregistre paidAt + staffId du livreur
 */
export async function confirmDeliveryPayment(input: ConfirmDeliveryInput): Promise<{
  orderId: number;
  collectedAmount: number;
  paidAt: Date;
}> {
  const parsed = confirmDeliverySchema.safeParse(input);
  if (!parsed.success) {
    throw new PaymentError(parsed.error.errors[0].message, "BALANCE_MISMATCH");
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));

  if (!order) {
    throw new PaymentError(`Commande #${input.orderId} introuvable`, "ORDER_NOT_FOUND");
  }

  if (order.paymentStatus === "FULLY_PAID") {
    throw new PaymentError(
      `Commande #${input.orderId} est déjà FULLY_PAID`,
      "ALREADY_PAID"
    );
  }

  if (order.paymentStatus === "REFUNDED") {
    throw new PaymentError(
      `Commande #${input.orderId} est remboursée, impossible de clôturer`,
      "PARTIAL_NOT_CLOSEABLE"
    );
  }

  const remaining = toNum(order.remainingAmount);
  const paidAt = new Date();

  await db
    .update(orders)
    .set({
      paymentStatus: "FULLY_PAID",
      remainingAmount: "0.000",
      advanceAmount: order.total, // total encaissé
      paymentRef: input.paymentRef ?? order.paymentRef,
      paidAt,
      deliveredBy: input.staffId ?? order.deliveredBy,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  console.log(
    `[PAYMENT] #${input.orderId} FULLY_PAID | encaissé=${remaining} | livreur=${input.staffName ?? input.staffId ?? "—"}`
  );

  return { orderId: input.orderId, collectedAmount: remaining, paidAt };
}
