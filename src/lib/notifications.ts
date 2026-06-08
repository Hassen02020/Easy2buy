/**
 * lib/notifications.ts
 * --------------------
 * Service de notifications déclenché lors des changements de statut de commande.
 *
 * Canaux supportés :
 *   - WhatsApp via Twilio (variable TWILIO_*)
 *   - Email via Resend (variable RESEND_API_KEY)
 *
 * L'appel est fait en "fire-and-forget" depuis l'API : les erreurs de
 * notification ne doivent JAMAIS faire échouer la transaction principale.
 */

import type { Order } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationChannel = "whatsapp" | "email" | "both";

export interface OrderNotificationPayload {
  order: Pick<Order, "id" | "customerName" | "customerPhone" | "status" | "total">;
  channel?: NotificationChannel;
}

// ---------------------------------------------------------------------------
// Message builder
// ---------------------------------------------------------------------------

function buildWhatsAppMessage(order: OrderNotificationPayload["order"]): string {
  const statusLabels: Record<string, string> = {
    CONFIRMED: "✅ confirmée",
    PREPARING: "🌿 en cours de préparation",
    SHIPPED:   "🚚 expédiée",
    DELIVERED: "🎉 livrée",
    CANCELLED: "❌ annulée",
  };

  const label = statusLabels[order.status] ?? order.status;

  return [
    `*Easy2Buy* 🌿`,
    ``,
    `Bonjour ${order.customerName},`,
    `Votre commande #${order.id} est ${label}.`,
    `Montant total : ${Number(order.total).toFixed(3)} TND`,
    ``,
    `Merci pour votre confiance !`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// WhatsApp via Twilio
// ---------------------------------------------------------------------------

async function sendWhatsApp(order: OrderNotificationPayload["order"]): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.warn("[notifications] WhatsApp skipped: TWILIO_* env vars not set.");
    return;
  }

  const to = `whatsapp:${order.customerPhone}`;
  const from = `whatsapp:${TWILIO_WHATSAPP_FROM}`;
  const body = buildWhatsAppMessage(order);

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[notifications] Twilio error:", err);
  }
}

// ---------------------------------------------------------------------------
// Email via Resend
// ---------------------------------------------------------------------------

async function sendEmail(order: OrderNotificationPayload["order"]): Promise<void> {
  const { RESEND_API_KEY, NOTIFICATION_EMAIL_TO } = process.env;

  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL_TO) {
    console.warn("[notifications] Email skipped: RESEND_API_KEY or NOTIFICATION_EMAIL_TO not set.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Easy2Buy <noreply@easy2buy.tn>",
      to: [NOTIFICATION_EMAIL_TO],
      subject: `Commande #${order.id} — ${order.status}`,
      text: buildWhatsAppMessage(order),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[notifications] Resend error:", err);
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

/**
 * Envoie une notification lors d'un changement de statut de commande.
 * Appelé de manière asynchrone — NE PAS await dans les routes critiques.
 *
 * @example
 *   void notifyOrderStatusChange({ order, channel: "both" });
 */
export async function notifyOrderStatusChange({
  order,
  channel = "both",
}: OrderNotificationPayload): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (channel === "whatsapp" || channel === "both") {
    tasks.push(sendWhatsApp(order));
  }
  if (channel === "email" || channel === "both") {
    tasks.push(sendEmail(order));
  }

  // Toutes les notifications en parallèle — une erreur n'en bloque pas une autre
  await Promise.allSettled(tasks);
}
