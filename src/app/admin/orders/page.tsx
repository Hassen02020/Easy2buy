export const dynamic = "force-dynamic";
/**
 * app/admin/orders/page.tsx
 * --------------------------
 * Server Component — liste et filtre les commandes par statut.
 * Aucun JavaScript client n'est envoyé : filtre via searchParams (URL).
 *
 * Usage : /admin/orders?status=PENDING
 */

import { db } from "@/db";
import { AdminNav } from "@/components/AdminNav";
import { orders } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { OrderStatus } from "@/db/schema";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// DB helper (extracted so it can be called inside try/catch)
// ---------------------------------------------------------------------------

async function fetchOrders(activeStatus?: OrderStatus) {
  return db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      customerCity: orders.customerCity,
      total: orders.total,
      deliveryFee: orders.deliveryFee,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      advanceAmount: orders.advanceAmount,
      remainingAmount: orders.remainingAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(activeStatus ? eq(orders.status, activeStatus) : undefined)
    .orderBy(
      sql`CASE payment_status
        WHEN 'FULLY_PAID'   THEN 1
        WHEN 'PARTIAL_PAID' THEN 2
        WHEN 'UNPAID'       THEN 3
        ELSE 4
      END`,
      desc(orders.createdAt)
    );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  PENDING:   { label: "En attente",    color: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmée",     color: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "Préparation",   color: "bg-purple-100 text-purple-800" },
  SHIPPED:   { label: "Expédiée",      color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Livrée",        color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Annulée",       color: "bg-red-100 text-red-800" },
  RETURNED:  { label: "Retournée",     color: "bg-rose-100 text-rose-800" },
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

// ---------------------------------------------------------------------------
// Server Action — mise à jour du statut
// ---------------------------------------------------------------------------

async function updateOrderStatus(formData: FormData) {
  "use server";

  const orderId = Number(formData.get("orderId"));
  const newStatus = formData.get("status") as OrderStatus;

  if (!orderId || !ALL_STATUSES.includes(newStatus)) return;

  await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // Déclencher la notification si passage à CONFIRMED
  if (newStatus === "CONFIRMED") {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (order) {
      void notifyOrderStatusChange({ order, channel: "both" });
    }
  }

  revalidatePath("/admin/orders");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const activeStatus = ALL_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  // Requête — protégée : si DATABASE_URL absent ou DB injoignable, affiche un message clair.
  let rows: Awaited<ReturnType<typeof fetchOrders>> = [];
  let dbError: string | null = null;

  try {
    rows = await fetchOrders(activeStatus);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Impossible de se connecter à la base de données.";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/orders" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Gestion des commandes
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {rows.length} commande{rows.length !== 1 ? "s" : ""}{" "}
              {activeStatus ? `— ${STATUS_LABELS[activeStatus].label}` : "— toutes"}
            </p>
          </div>
        </div>

        {/* Filtres par statut */}
        <div className="flex flex-wrap gap-2 mb-6">
          <a
            href="/admin/orders"
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              !activeStatus
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            Toutes
          </a>
          {ALL_STATUSES.map((s) => (
            <a
              key={s}
              href={`/admin/orders?status=${s}`}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                activeStatus === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {STATUS_LABELS[s].label}
            </a>
          ))}
        </div>

        {/* Légende de tri */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 w-fit">
          <span className="font-semibold text-gray-600">Priorité de livraison :</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />1. Payée intégralement</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />2. Avance versée</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />3. À la réception</span>
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
            Aucune commande trouvée.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["#", "Client", "Ville", "Total", "Livraison", "Statut", "Paiement", "Date", "Action"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-gray-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((order) => (
                  <tr key={order.id} className={`transition-colors ${
                    order.paymentStatus === "FULLY_PAID"
                      ? "bg-green-50/60 hover:bg-green-50"
                      : order.paymentStatus === "PARTIAL_PAID"
                      ? "bg-amber-50/60 hover:bg-amber-50"
                      : "hover:bg-gray-50"
                  }`}>
                    <td className="px-4 py-3 font-mono">
                      <a href={`/admin/orders/${order.id}`} className="text-green-600 hover:underline font-semibold">
                        #{order.id}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-gray-400">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.customerCity}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {Number(order.total).toFixed(3)} TND
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {Number(order.deliveryFee).toFixed(3)} TND
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          STATUS_LABELS[order.status].color
                        }`}
                      >
                        {STATUS_LABELS[order.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {order.createdAt.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      {order.paymentStatus === "FULLY_PAID" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                            ✅ Payée intégralement
                          </span>
                          <p className="text-xs text-green-600 font-semibold pl-1">{Number(order.total).toFixed(3)} TND</p>
                        </div>
                      )}
                      {order.paymentStatus === "PARTIAL_PAID" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                            ⚡ Avance versée
                          </span>
                          <p className="text-xs text-amber-700 pl-1">
                            +{Number(order.advanceAmount).toFixed(3)} TND
                          </p>
                          <p className="text-xs text-red-500 pl-1 font-semibold">
                            Solde : {Number(order.remainingAmount).toFixed(3)} TND
                          </p>
                        </div>
                      )}
                      {order.paymentStatus === "UNPAID" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">
                            🚚 À la réception
                          </span>
                          <p className="text-xs text-gray-500 pl-1">{Number(order.total).toFixed(3)} TND</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <select
                          name="status"
                          defaultValue={order.status}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s].label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="ml-2 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
                        >
                          OK
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Erreur DB */}
        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-700 font-semibold text-sm mb-1">Base de données non disponible</p>
            <p className="text-red-500 text-xs font-mono">{dbError}</p>
            <p className="text-gray-500 text-xs mt-3">
              Configurez <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> dans{" "}
              <code className="bg-gray-100 px-1 rounded">.env.local</code> puis relancez le serveur.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
