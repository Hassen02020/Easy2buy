export const dynamic = "force-dynamic";
/**
 * app/admin/orders/[id]/page.tsx
 * --------------------------------
 * Page détail d'une commande — panneau de gestion du paiement.
 *
 * Sections :
 *   - Résumé commande (client, items, totaux)
 *   - Panneau paiement : statut actuel + formulaires HYBRID / COD / Confirmer livraison
 *   - Historique audit
 */

import { db } from "@/db";
import { orders, orderItems, staff, auditLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { setOrderPayment, confirmDeliveryPayment, updateDeliveryNotes, updateCourierRemarks, assignTask } from "@/app/admin/actions";
import { DeliverySlip } from "@/components/DeliverySlip";

async function setPaymentAction(formData: FormData): Promise<void> {
  "use server";
  await setOrderPayment(formData);
}

async function confirmPaymentAction(formData: FormData): Promise<void> {
  "use server";
  await confirmDeliveryPayment(formData);
}

async function deliveryNotesAction(formData: FormData): Promise<void> {
  "use server";
  await updateDeliveryNotes(formData);
}

async function courierRemarksAction(formData: FormData): Promise<void> {
  "use server";
  await updateCourierRemarks(formData);
}

async function assignTaskAction(formData: FormData): Promise<void> {
  "use server";
  await assignTask(formData);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  D17:               "D17",
  FLOUCI:            "Flouci",
  ONLINE:            "En ligne",
  BANK_TRANSFER:     "Virement bancaire",
  CASH_ON_DELIVERY:  "Espèces à la livraison",
};

const PAYMENT_STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  UNPAID:       { label: "Non payée",        bg: "bg-gray-100",   color: "text-gray-700" },
  PARTIAL_PAID: { label: "Avance reçue",     bg: "bg-amber-100",  color: "text-amber-700" },
  FULLY_PAID:   { label: "Intégralement payée", bg: "bg-green-100", color: "text-green-700" },
  REFUNDED:     { label: "Remboursée",        bg: "bg-rose-100",   color: "text-rose-700" },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING:   "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "Préparation",
  SHIPPED:   "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  RETURNED:  "Retournée",
};

function fmt(n: string | number | null | undefined) {
  return parseFloat(String(n ?? "0")).toFixed(3) + " TND";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getOrderDetail(id: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const logs  = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.orderId, id))
    .orderBy(desc(auditLog.createdAt));
  const allStaff = await db.select({ id: staff.id, name: staff.name, role: staff.role }).from(staff).where(eq(staff.active, true));

  return { order, items, logs, allStaff };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) notFound();

  const data = await getOrderDetail(orderId).catch(() => null);
  if (!data) notFound();

  const { order, items, logs, allStaff } = data;
  const payMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? PAYMENT_STATUS_META.UNPAID;
  const canSetPayment  = order.paymentStatus === "UNPAID";
  const canConfirmPayment = order.paymentStatus === "UNPAID" || order.paymentStatus === "PARTIAL_PAID";
  const isFullyPaid    = order.paymentStatus === "FULLY_PAID";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <a href="/admin/orders" className="text-sm text-gray-400 hover:text-gray-600">← Commandes</a>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Commande #{order.id}</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${payMeta.bg} ${payMeta.color}`}>
              {payMeta.label}
            </span>
            {/* Bouton Imprimer Bon — client component */}
            <DeliverySlip
              orderId={order.id}
              createdAt={order.createdAt}
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              customerCity={order.customerCity}
              customerAddress={order.customerAddress}
              items={items.map(i => ({
                productName: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                lineTotal: i.lineTotal,
              }))}
              total={order.total}
              advanceAmount={order.advanceAmount}
              remainingAmount={order.remainingAmount}
              paymentMethod={order.paymentMethod}
              deliveryNotes={order.deliveryNotes}
              courierRemarks={order.courierRemarks}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : résumé + items ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Info client */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Client</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Nom",      order.customerName],
                  ["Téléphone", order.customerPhone],
                  ["Ville",    order.customerCity],
                  ["Adresse",  order.customerAddress],
                  ["Notes",    order.notes ?? "—"],
                  ["Date",     new Date(order.createdAt).toLocaleString("fr-FR")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-400 text-xs">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Articles */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Articles</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Produit", "Qté", "Prix unit.", "Total ligne", "Marge"].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => {
                    const margin = parseFloat(item.unitPrice) - parseFloat(item.purchasePrice ?? "0");
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(item.unitPrice)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(item.lineTotal)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${margin >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            +{fmt(margin * item.quantity)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Totaux */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <div className="text-sm space-y-1 text-right">
                  <div className="text-gray-500">Sous-total : <span className="font-semibold text-gray-800">{fmt(order.subtotal)}</span></div>
                  <div className="text-gray-500">Livraison : <span className="font-semibold text-gray-800">{fmt(order.deliveryFee)}</span></div>
                  <div className="text-base font-extrabold text-gray-900 border-t border-gray-300 pt-1 mt-1">
                    Total : {fmt(order.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes logistiques (delivery_notes) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">Remarques Livraison</h2>
              <form action={deliveryNotesAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <textarea
                  name="deliveryNotes"
                  rows={3}
                  defaultValue={order.deliveryNotes ?? ""}
                  placeholder="Repères logistiques, code d’accès, contact gardien…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
                />
                <button
                  type="submit"
                  className="text-xs bg-forest-600 hover:bg-forest-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Enregistrer remarques
                </button>
              </form>
            </div>

            {/* Saisie livreur (courier_remarks) */}
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
              <h2 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">Saisie Livreur</h2>
              <p className="text-xs text-amber-600 mb-3">Rempli après la tentative de livraison.</p>
              <form action={courierRemarksAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <textarea
                  name="courierRemarks"
                  rows={3}
                  defaultValue={order.courierRemarks ?? ""}
                  placeholder="Client absent, refus, report, commentaire libre…"
                  className="w-full border border-amber-100 bg-amber-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                <button
                  type="submit"
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Enregistrer saisie livreur
                </button>
              </form>
            </div>

            {/* Audit log */}
            {logs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Historique</h2>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {logs.map(log => (
                    <li key={log.id} className="px-5 py-3 flex items-start gap-3">
                      <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <div>
                        <p className="text-gray-800 font-medium">
                          {log.fromStatus} → {log.toStatus}
                        </p>
                        {log.staffName && <p className="text-gray-400 text-xs">Par : {log.staffName}</p>}
                        {log.note && <p className="text-gray-500 text-xs italic">{log.note}</p>}
                        <p className="text-gray-400 text-xs">
                          {new Date(log.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Colonne droite : assignation + paiement ── */}
          <div className="space-y-4">

            {/* ── Panneau Assignation Équipe ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4">Assignation Équipe</h2>

              {[
                { label: "Agent responsable",  role: "assignedTo",  current: order.assignedTo,  filter: (s: typeof allStaff[number]) => s.role !== "LIVREUR" },
                { label: "Préparateur",        role: "preparedBy",  current: order.preparedBy,  filter: (s: typeof allStaff[number]) => s.role !== "LIVREUR" },
                { label: "Emballeur",          role: "packedBy",    current: order.packedBy,    filter: (_s: typeof allStaff[number]) => true },
                { label: "Livreur",            role: "deliveredBy", current: order.deliveredBy, filter: (s: typeof allStaff[number]) => s.role !== "AGENT" },
              ].map(({ label, role, current, filter }) => {
                const options = allStaff.filter(filter);
                return (
                  <form key={role} action={assignTaskAction} className="flex items-center gap-2 mb-2">
                    <input type="hidden" name="orderId"    value={order.id} />
                    <input type="hidden" name="role"       value={role} />
                    <input type="hidden" name="actorRole"  value="ADMIN" />
                    <label htmlFor={`assign-${role}`} className="text-xs text-gray-500 w-28 shrink-0">{label}</label>
                    <select
                      id={`assign-${role}`}
                      name="staffId"
                      defaultValue={current ?? ""}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-forest-400"
                    >
                      <option value="">— Non assigné —</option>
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs bg-forest-600 hover:bg-forest-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
                      ✓
                    </button>
                  </form>
                );
              })}
            </div>

            {/* Récapitulatif paiement */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Paiement</h2>
              <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${payMeta.bg} ${payMeta.color}`}>
                {payMeta.label}
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Méthode</span>
                  <span className="font-semibold text-gray-900">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Avance reçue</span>
                  <span className="font-semibold text-green-600">{fmt(order.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2">
                  <span>Solde restant</span>
                  <span className={`font-bold ${parseFloat(String(order.remainingAmount)) > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {fmt(order.remainingAmount)}
                  </span>
                </div>
                {order.paymentRef && (
                  <div className="flex justify-between text-gray-600">
                    <span>Référence</span>
                    <span className="font-mono text-xs text-gray-500">{order.paymentRef}</span>
                  </div>
                )}
                {order.paidAt && (
                  <div className="text-xs text-gray-400 text-right">
                    Soldé le {new Date(order.paidAt).toLocaleString("fr-FR")}
                  </div>
                )}
              </div>
            </div>

            {/* Formulaire : définir le paiement (HYBRID / COD) */}
            {canSetPayment && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4">
                  Enregistrer le paiement
                </h2>
                <form action={setPaymentAction} className="space-y-3 text-sm">
                  <input type="hidden" name="orderId" value={order.id} />

                  <div>
                    <label className="text-gray-600 font-medium block mb-1">Mode</label>
                    <select name="mode" className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="COD">Espèces à la livraison (COD)</option>
                      <option value="HYBRID">Avance + solde livraison</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-600 font-medium block mb-1">Méthode d'avance</label>
                    <select name="paymentMethod" className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                      <option value="D17">D17</option>
                      <option value="FLOUCI">Flouci</option>
                      <option value="ONLINE">En ligne (carte)</option>
                      <option value="BANK_TRANSFER">Virement bancaire</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-600 font-medium block mb-1">
                      Montant avance (TND) <span className="text-gray-400 font-normal">— laisser vide si COD</span>
                    </label>
                    <input
                      type="number"
                      name="advanceAmount"
                      step="0.001"
                      min="0"
                      max={parseFloat(String(order.total))}
                      placeholder="0.000"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Total commande : <strong>{fmt(order.total)}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-600 font-medium block mb-1">Référence de paiement</label>
                    <input
                      type="text"
                      name="paymentRef"
                      placeholder="ID transaction D17 / Flouci..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    Enregistrer
                  </button>
                </form>
              </div>
            )}

            {/* Formulaire : confirmer paiement à la livraison */}
            {canConfirmPayment && !isFullyPaid && (
              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h2 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">
                  Confirmer la réception du solde
                </h2>
                <p className="text-xs text-amber-700 mb-4">
                  Solde à encaisser à la livraison : <strong>{fmt(order.remainingAmount)}</strong>
                </p>
                <form action={confirmPaymentAction} className="space-y-3 text-sm">
                  <input type="hidden" name="orderId" value={order.id} />

                  <div>
                    <label className="text-gray-700 font-medium block mb-1">Livreur</label>
                    <select name="staffId" className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500">
                      <option value="">— Sélectionner —</option>
                      {allStaff.filter(s => s.role !== "AGENT").map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-700 font-medium block mb-1">Référence (optionnel)</label>
                    <input
                      type="text"
                      name="paymentRef"
                      placeholder="Reçu, bordereau..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    ✓ Confirmer paiement intégral
                  </button>
                </form>
              </div>
            )}

            {isFullyPaid && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <p className="text-green-700 font-bold text-sm">✅ Commande intégralement payée</p>
                {order.paidAt && (
                  <p className="text-green-500 text-xs mt-1">
                    {new Date(order.paidAt).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
