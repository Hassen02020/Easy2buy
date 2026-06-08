/**
 * /suivi/[id]/facture
 * --------------------
 * Facture imprimable — accessible uniquement si la commande est intégralement payée
 * ou livrée en mode COD.
 */

import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

export default async function FacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) notFound();

  // Seules les commandes payées ont accès à la facture
  const canPrint =
    order.paymentStatus === "FULLY_PAID" ||
    (order.status === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY");

  if (!canPrint) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const fmt = (v: string | number) =>
    Number(v).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const invoiceDate = order.paidAt ?? order.updatedAt;
  const invoiceNum  = `FAC-${String(order.id).padStart(6, "0")}`;

  const PAYMENT_LABELS: Record<string, string> = {
    CASH_ON_DELIVERY: "Espèces à la livraison",
    D17:              "D17",
    FLOUCI:           "Flouci",
    ONLINE:           "Carte en ligne",
    BANK_TRANSFER:    "Virement bancaire",
  };

  return (
    <>
      {/* Print button — masqué à l'impression */}
      <PrintButton />

      {/* Facture */}
      <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center py-10 print:py-0">
        <div
          id="invoice"
          className="bg-white w-full max-w-2xl print:max-w-none shadow-xl print:shadow-none rounded-2xl print:rounded-none p-10 print:p-8 space-y-8 text-sm"
        >
          {/* En-tête */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-forest-700 tracking-tight">🌿 Easy2Buy</h1>
              <p className="text-xs text-gray-400 mt-1">Livraison de plantes à domicile — Tunisie</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Facture</p>
              <p className="text-xl font-extrabold text-gray-900">{invoiceNum}</p>
              <p className="text-xs text-gray-500 mt-1">
                Date : {invoiceDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Client */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Émetteur</p>
              <p className="font-bold text-gray-800">Easy2Buy</p>
              <p className="text-gray-500">Tunisie</p>
              <p className="text-gray-500">contact@easy2buy.tn</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Destinataire</p>
              <p className="font-bold text-gray-800">{order.customerName}</p>
              <p className="text-gray-500">{order.customerAddress}</p>
              <p className="text-gray-500">{order.customerCity}</p>
              <p className="text-gray-500">{order.customerPhone}</p>
            </div>
          </div>

          {/* Détails commande */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">
              <span className="w-1/2">Désignation</span>
              <span className="w-1/6 text-right">P.U.</span>
              <span className="w-1/6 text-right">Qté</span>
              <span className="w-1/6 text-right">Total</span>
            </div>

            {items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 border-b border-gray-100 text-gray-700">
                <span className="w-1/2 font-medium">{item.productName}</span>
                <span className="w-1/6 text-right text-gray-500">{fmt(item.unitPrice)} TND</span>
                <span className="w-1/6 text-right text-gray-500">{item.quantity}</span>
                <span className="w-1/6 text-right font-semibold">{fmt(item.lineTotal)} TND</span>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total HT</span>
                <span>{fmt(order.subtotal)} TND</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Frais de livraison</span>
                <span>{fmt(order.deliveryFee)} TND</span>
              </div>
              <div className="flex justify-between font-extrabold text-gray-900 text-base border-t border-gray-300 pt-2 mt-1">
                <span>Total TTC</span>
                <span className="text-forest-700">{fmt(order.total)} TND</span>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 space-y-1">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Paiement</p>
            <div className="flex justify-between text-sm text-green-800">
              <span>Mode</span>
              <span className="font-semibold">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm text-green-800">
              <span>Statut</span>
              <span className="font-bold">✅ Intégralement payée</span>
            </div>
            {order.paidAt && (
              <div className="flex justify-between text-sm text-green-800">
                <span>Date de paiement</span>
                <span>{order.paidAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
            )}
          </div>

          {/* Commande ref */}
          <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
            <span>Réf. commande : #{order.id}</span>
            <span>Générée le {new Date().toLocaleDateString("fr-FR")}</span>
          </div>

          {/* Pied de page */}
          <div className="text-center text-xs text-gray-300 pt-2">
            Merci pour votre commande 🌱 — Easy2Buy, Tunisie
          </div>
        </div>
      </div>
    </>
  );
}
