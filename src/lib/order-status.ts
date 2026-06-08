/**
 * lib/order-status.ts
 * --------------------
 * Gestion des transitions de statut de commande.
 *
 * Machine d'état :
 *   PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED
 *                                              ↘ CANCELLED (depuis tout statut sauf DELIVERED)
 */

import { db } from "@/db";
import { orders, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyOrderStatusChange } from "./notifications";
import type { OrderStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Machine d'état — transitions autorisées
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED:   ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED:  [],
};

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Transition invalide : ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class OrderNotFoundError extends Error {
  constructor(id: number) {
    super(`Commande #${id} introuvable`);
    this.name = "OrderNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Met à jour le statut d'une commande après validation de la transition.
 * Écrit dans audit_log, déclenche une notification simulée (console) + réelle si configurée.
 *
 * @returns La commande mise à jour
 */
export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  options?: { staffId?: number; staffName?: string; note?: string }
): Promise<typeof orders.$inferSelect> {
  // 1. Charger la commande courante
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) throw new OrderNotFoundError(orderId);

  // 2. Valider la transition
  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    throw new InvalidTransitionError(order.status, newStatus);
  }

  // 3. Appliquer la mise à jour
  const [updated] = await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  // 4. Écriture dans audit_log
  await db.insert(auditLog).values({
    orderId,
    staffId: options?.staffId ?? null,
    staffName: options?.staffName ?? null,
    fromStatus: order.status,
    toStatus: newStatus,
    note: options?.note ?? null,
  });

  // 5. Notification simulée (console) — toujours activée
  console.log(
    `[ORDER STATUS] #${orderId} : ${order.status} → ${newStatus} | Client: ${order.customerName} | ${new Date().toISOString()}`
  );

  // 6. Notification réelle (WhatsApp/Email) — si les env vars sont configurées
  void notifyOrderStatusChange({ order: updated, channel: "both" });

  return updated;
}

// ---------------------------------------------------------------------------
// Helper — statuts suivants disponibles pour l'UI
// ---------------------------------------------------------------------------

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}
