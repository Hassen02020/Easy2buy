export const dynamic = "force-dynamic";
/**
 * app/admin/dashboard/page.tsx
 * -----------------------------
 * Server Component — Dashboard opérationnel & analytique complet.
 *
 * Sections :
 *   1. KPIs financiers (CA, coût, bénéfice, marge)
 *   2. Commandes par statut
 *   3. Performance du personnel (agents + livreurs)
 *   4. Taux de retours par employé
 *   5. Tableau commandes avec filtres agent/livreur/client
 *
 * Filtre par période via ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import { db } from "@/db";
import { orders, orderItems, staff } from "@/db/schema";
import { eq, gte, lte, and, count, desc, sql, inArray } from "drizzle-orm";
import type { OrderStatus, StaffRole } from "@/db/schema";
import { calcOrderProfit, aggregateProfits } from "@/lib/profitability";
import { AdminNav } from "@/components/AdminNav";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "En attente",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  CONFIRMED: { label: "Confirmées",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  PREPARING: { label: "Préparation", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  SHIPPED:   { label: "Expédiées",   color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  DELIVERED: { label: "Livrées",     color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  CANCELLED: { label: "Annulées",    color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  RETURNED:  { label: "Retournées",  color: "text-rose-700",   bg: "bg-rose-50 border-rose-200" },
};

function fmt(n: number) {
  return n.toFixed(3) + " TND";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getDashboardData(from?: string, to?: string, filterAgent?: string, filterDeliverer?: string, filterCustomer?: string) {
  const conditions = [];
  if (from) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to)   conditions.push(lte(orders.createdAt, new Date(to + "T23:59:59")));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Comptage par statut
  const statusCounts = await db
    .select({ status: orders.status, cnt: count() })
    .from(orders)
    .where(where)
    .groupBy(orders.status);

  // Tous les membres du staff (colonnes ciblées)
  const allStaff = await db
    .select({ id: staff.id, name: staff.name, role: staff.role, email: staff.email })
    .from(staff)
    .where(eq(staff.active, true));

  // Performance des agents (commandes confirmées par agent)
  const agentPerf = await db
    .select({
      staffId: orders.confirmedBy,
      confirmed: count(),
    })
    .from(orders)
    .where(where)
    .groupBy(orders.confirmedBy);

  // Performance des livreurs (commandes livrées par livreur)
  const delivererPerf = await db
    .select({
      staffId: orders.deliveredBy,
      delivered: count(),
      returned: sql<number>`SUM(CASE WHEN ${orders.status} = 'RETURNED' THEN 1 ELSE 0 END)`,
    })
    .from(orders)
    .where(where)
    .groupBy(orders.deliveredBy);

  // Taux de retour par livreur
  const returnsByDeliverer = await db
    .select({
      staffId: orders.deliveredBy,
      cnt: count(),
    })
    .from(orders)
    .where(and(where, eq(orders.status, "RETURNED")))
    .groupBy(orders.deliveredBy);

  // Dernières commandes
  const recentOrders = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      customerCity: orders.customerCity,
      status: orders.status,
      total: orders.total,
      deliveryFee: orders.deliveryFee,
      createdAt: orders.createdAt,
      assignedTo: orders.assignedTo,
      deliveredBy: orders.deliveredBy,
      confirmedBy: orders.confirmedBy,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(30);

  // Filtres optionnels côté JS (simple pour éviter les jointures complexes)
  const filteredOrders = recentOrders.filter((o) => {
    if (filterCustomer && !o.customerName.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
    if (filterAgent && o.assignedTo !== Number(filterAgent)) return false;
    if (filterDeliverer && o.deliveredBy !== Number(filterDeliverer)) return false;
    return true;
  });

  // Items pour rentabilité — uniquement pour les commandes récentes chargées
  const recentOrderIds = recentOrders.map((o) => o.id);
  const allItems = recentOrderIds.length > 0
    ? await db
        .select({
          orderId:       orderItems.orderId,
          productName:   orderItems.productName,
          quantity:      orderItems.quantity,
          unitPrice:     orderItems.unitPrice,
          purchasePrice: orderItems.purchasePrice,
          lineTotal:     orderItems.lineTotal,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, recentOrderIds))
    : [];
  const itemsByOrder: Record<number, typeof allItems> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  const profitSummaries = filteredOrders.map((o) =>
    calcOrderProfit({
      id: o.id,
      deliveryFee: o.deliveryFee,
      items: (itemsByOrder[o.id] ?? []).map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        purchasePrice: i.purchasePrice,
        lineTotal: i.lineTotal,
      })),
    })
  );

  const revenues = filteredOrders.map((o) => Number(o.total));
  const period = aggregateProfits(profitSummaries, revenues);

  return { statusCounts, filteredOrders, profitSummaries, period, allStaff, agentPerf, delivererPerf, returnsByDeliverer };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; agent?: string; deliverer?: string; customer?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const { from, to, agent, deliverer, customer } = await searchParams;

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getDashboardData(from, to, agent, deliverer, customer);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur DB";
  }

  const allStatuses = Object.keys(STATUS_META) as OrderStatus[];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/dashboard" role={session!.role as StaffRole} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Rentabilité & suivi des commandes</p>
          </div>
          {/* Filtre période */}
          <form className="flex items-center gap-2 text-sm" method="GET">
            <label className="text-gray-600 font-medium">Du</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            />
            <label className="text-gray-600 font-medium">au</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Filtrer
            </button>
            {(from || to) && (
              <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 text-xs underline">
                Réinitialiser
              </a>
            )}
          </form>
        </div>

        {/* Erreur DB */}
        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-semibold text-sm">{dbError}</p>
            <p className="text-gray-500 text-xs mt-2">
              Configurez <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> dans{" "}
              <code className="bg-gray-100 px-1 rounded">.env.local</code>
            </p>
          </div>
        )}

        {data && (
          <>
            {/* ── KPIs Financiers ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Chiffre d'affaires", value: fmt(data.period.totalRevenue),        sub: `${data.period.totalOrders} commande(s)`,        color: "text-gray-900" },
                { label: "Coût d'achat",        value: fmt(data.period.totalPurchaseCost),   sub: "Fournisseurs",                                  color: "text-red-600" },
                { label: "Livraison",            value: fmt(data.period.totalDeliveryFees),  sub: "Frais transport",                               color: "text-orange-600" },
                { label: "Emballage",            value: fmt(data.period.totalPackagingCost), sub: "1.500 TND × commande",                           color: "text-amber-600" },
                { label: "Publicité",            value: fmt(data.period.totalAdvertisingCost), sub: "5% du CA estimé",                            color: "text-purple-600" },
                { label: "Bénéfice net",         value: fmt(data.period.totalNetProfit),      sub: `Marge : ${data.period.overallMarginPct}%`,  color: data.period.totalNetProfit >= 0 ? "text-green-600" : "text-red-600" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-xl font-extrabold mt-1 ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Commandes par statut ── */}
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">Commandes par statut</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {allStatuses.map((s) => {
                  const meta = STATUS_META[s];
                  const cnt = data.statusCounts.find((sc) => sc.status === s)?.cnt ?? 0;
                  return (
                    <a key={s} href={`/admin/orders?status=${s}`}
                      className={`flex flex-col items-center p-4 rounded-2xl border ${meta.bg} hover:shadow-md transition-shadow`}>
                      <span className={`text-3xl font-extrabold ${meta.color}`}>{cnt}</span>
                      <span className={`text-xs font-semibold mt-1 ${meta.color}`}>{meta.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* ── Performance du personnel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Agents */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">Performance Agents</h2>
                  <p className="text-xs text-gray-400">Commandes confirmées par agent</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Agent", "Rôle", "Confirmées"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allStaff.filter((s) => s.role === "AGENT" || s.role === "ADMIN").map((member) => {
                      const perf = data.agentPerf.find((p) => p.staffId === member.id);
                      const confirmed = perf?.confirmed ?? 0;
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-400">{member.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              member.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}>{member.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{confirmed}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(confirmed * 2, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {data.allStaff.filter((s) => s.role === "AGENT" || s.role === "ADMIN").length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun agent enregistré</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Livreurs + taux de retour */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">Performance Livreurs</h2>
                  <p className="text-xs text-gray-400">Livraisons effectuées & taux de retour</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Livreur", "Livrées", "Retours", "Taux"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allStaff.filter((s) => s.role === "LIVREUR" || s.role === "ADMIN").map((member) => {
                      const perf = data.delivererPerf.find((p) => p.staffId === member.id);
                      const ret  = data.returnsByDeliverer.find((r) => r.staffId === member.id);
                      const delivered = Number(perf?.delivered ?? 0);
                      const returned  = Number(ret?.cnt ?? 0);
                      const rate = delivered > 0 ? ((returned / delivered) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{member.name}</p>
                          </td>
                          <td className="px-4 py-3 font-bold text-green-600">{delivered}</td>
                          <td className="px-4 py-3 font-bold text-rose-500">{returned}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              Number(rate) === 0 ? "bg-green-100 text-green-700"
                              : Number(rate) < 10 ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                            }`}>{rate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    {data.allStaff.filter((s) => s.role === "LIVREUR" || s.role === "ADMIN").length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">Aucun livreur enregistré</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Tableau commandes avec filtres ── */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-bold text-gray-800">Suivi des commandes</h2>
                <form method="GET" className="flex flex-wrap gap-2 text-xs">
                  {from && <input type="hidden" name="from" value={from} />}
                  {to   && <input type="hidden" name="to"   value={to} />}
                  <input name="customer" defaultValue={customer} placeholder="Client..." className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <select name="agent" defaultValue={agent} className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option value="">Tous agents</option>
                    {data.allStaff.filter((s) => s.role !== "LIVREUR").map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select name="deliverer" defaultValue={deliverer} className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option value="">Tous livreurs</option>
                    {data.allStaff.filter((s) => s.role !== "AGENT").map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors">Filtrer</button>
                  <a href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 underline py-1.5">Reset</a>
                </form>
              </div>

              {data.filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                  Aucune commande sur cette période.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-auto shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["#", "Client", "Ville", "CA", "Bén. net", "Marge", "Agent", "Livreur", "Statut", "Date"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.filteredOrders.map((order, idx) => {
                        const profit = data.profitSummaries[idx];
                        const meta = STATUS_META[order.status];
                        const marginPct = Number(order.total) > 0 ? ((profit.netProfit / Number(order.total)) * 100).toFixed(1) : "0.0";
                        const agentName  = data.allStaff.find((s) => s.id === order.assignedTo)?.name ?? "—";
                        const delivName  = data.allStaff.find((s) => s.id === order.deliveredBy)?.name ?? "—";
                        return (
                          <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.status === "RETURNED" ? "bg-rose-50" : ""}`}>
                            <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{order.id}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{order.customerName}</td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{order.customerCity}</td>
                            <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{fmt(Number(order.total))}</td>
                            <td className={`px-4 py-3 font-bold whitespace-nowrap ${profit.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                              {fmt(profit.netProfit)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(marginPct) >= 20 ? "bg-green-100 text-green-700" : Number(marginPct) >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                {marginPct}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{agentName}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{delivName}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                              {order.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
