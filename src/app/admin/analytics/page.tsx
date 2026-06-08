/**
 * /admin/analytics
 * ------------------
 * Tableau de bord analytique :
 *   1. Ventes par zone géographique (zones actives / sans retour)
 *   2. Top produits (demande marché, CA, bénéfice)
 *   3. Clients à cibler (fidèles inactifs, jamais relancés)
 *   4. Clients à fort taux de confirmation (fiables)
 *   5. Produits sous-stockés vs très demandés
 */

import { db } from "@/db";
import { orders, orderItems, products, customerProfiles } from "@/db/schema";
import { desc, sql, eq, and, gte, lte } from "drizzle-orm";
import { AdminNav } from "@/components/AdminNav";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAnalyticsData(from?: string, to?: string) {
  const conditions: ReturnType<typeof gte>[] = [];
  if (from) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to)   conditions.push(lte(orders.createdAt, new Date(to + "T23:59:59")));
  const where = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  // ── 1. Ventes par ville/zone ─────────────────────────────────────────────
  const salesByCity = await db
    .select({
      city:           orders.customerCity,
      totalOrders:    sql<number>`count(*)::int`,
      deliveredOrders: sql<number>`count(*) filter (where status = 'DELIVERED')::int`,
      cancelledOrders: sql<number>`count(*) filter (where status = 'CANCELLED')::int`,
      returnedOrders:  sql<number>`count(*) filter (where status = 'RETURNED')::int`,
      revenue:         sql<number>`coalesce(sum(case when status='DELIVERED' then total::numeric else 0 end), 0)`,
      cancelRate:      sql<number>`round(count(*) filter (where status='CANCELLED') * 100.0 / nullif(count(*), 0), 1)`,
      returnRate:      sql<number>`round(count(*) filter (where status='RETURNED') * 100.0 / nullif(count(*), 0), 1)`,
    })
    .from(orders)
    .groupBy(orders.customerCity)
    .orderBy(desc(sql`count(*) filter (where status = 'DELIVERED')`));

  // ── 2. Top produits ──────────────────────────────────────────────────────
  const topProducts = await db
    .select({
      productId:   orderItems.productId,
      productName: orderItems.productName,
      totalQtySold: sql<number>`sum(${orderItems.quantity})::int`,
      totalRevenue: sql<number>`sum(${orderItems.lineTotal}::numeric)`,
      totalProfit:  sql<number>`sum(${orderItems.profitLine}::numeric)`,
      orderCount:   sql<number>`count(distinct ${orderItems.orderId})::int`,
      currentStock: sql<number>`(select stock from products p where p.id = ${orderItems.productId})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.status, "DELIVERED"))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`));

  // ── 3. Clients fidèles inactifs (à cibler = livrés mais pas commandé depuis 30j) ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const loyalInactive = await db
    .select({
      phone:           customerProfiles.phone,
      name:            customerProfiles.name,
      tier:            customerProfiles.tier,
      loyaltyScore:    customerProfiles.loyaltyScore,
      deliveredOrders: customerProfiles.deliveredOrders,
      totalSpent:      customerProfiles.totalSpent,
      lastOrderAt:     customerProfiles.lastOrderAt,
      discountPct:     customerProfiles.discountPct,
      referralCode:    customerProfiles.referralCode,
    })
    .from(customerProfiles)
    .where(
      and(
        sql`${customerProfiles.deliveredOrders} >= 2`,
        sql`${customerProfiles.isBlacklisted} = false`,
        sql`${customerProfiles.lastOrderAt} < ${thirtyDaysAgo.toISOString()}`,
      )
    )
    .orderBy(desc(customerProfiles.loyaltyScore));

  // ── 4. Clients à fort taux de confirmation (ratio livré/total ≥ 80% sur ≥3 cmd) ──
  const reliableCustomers = await db
    .select({
      phone:           customerProfiles.phone,
      name:            customerProfiles.name,
      tier:            customerProfiles.tier,
      loyaltyScore:    customerProfiles.loyaltyScore,
      totalOrders:     customerProfiles.totalOrders,
      deliveredOrders: customerProfiles.deliveredOrders,
      cancelledOrders: customerProfiles.cancelledOrders,
      totalSpent:      customerProfiles.totalSpent,
      discountPct:     customerProfiles.discountPct,
      referralCount:   customerProfiles.referralCount,
      confirmRate:     sql<number>`round(${customerProfiles.deliveredOrders} * 100.0 / nullif(${customerProfiles.totalOrders}, 0), 0)`,
    })
    .from(customerProfiles)
    .where(
      and(
        sql`${customerProfiles.totalOrders} >= 3`,
        sql`${customerProfiles.isBlacklisted} = false`,
        sql`round(${customerProfiles.deliveredOrders} * 100.0 / nullif(${customerProfiles.totalOrders}, 0), 0) >= 80`,
      )
    )
    .orderBy(desc(sql`round(${customerProfiles.deliveredOrders} * 100.0 / nullif(${customerProfiles.totalOrders}, 0), 0)`));

  // ── 5. Produits sous-stockés mais très demandés ───────────────────────────
  const hotLowStock = await db
    .select({
      id:           products.id,
      name:         products.name,
      stock:        products.stock,
      price:        products.price,
      totalSold:    sql<number>`coalesce((
        select sum(oi.quantity) from order_items oi
        inner join orders o on oi.order_id = o.id
        where oi.product_id = products.id and o.status = 'DELIVERED'
      ), 0)::int`,
    })
    .from(products)
    .where(sql`${products.stock} <= 5`)
    .orderBy(desc(sql`(
      select sum(oi.quantity) from order_items oi
      inner join orders o on oi.order_id = o.id
      where oi.product_id = products.id and o.status = 'DELIVERED'
    )`));

  // ── 6. KPIs globaux ───────────────────────────────────────────────────────
  const [kpis] = await db
    .select({
      totalOrders:    sql<number>`count(*)::int`,
      delivered:      sql<number>`count(*) filter (where status='DELIVERED')::int`,
      cancelled:      sql<number>`count(*) filter (where status='CANCELLED')::int`,
      returned:       sql<number>`count(*) filter (where status='RETURNED')::int`,
      totalRevenue:   sql<number>`coalesce(sum(case when status='DELIVERED' then total::numeric else 0 end), 0)`,
      avgOrderValue:  sql<number>`round(avg(case when status='DELIVERED' then total::numeric else null end), 3)`,
    })
    .from(orders);

  return { salesByCity, topProducts, loyalInactive, reliableCustomers, hotLowStock, kpis };
}

// ---------------------------------------------------------------------------
// Helpers UI
// ---------------------------------------------------------------------------

const TIER_BADGE: Record<string, string> = {
  NEW:       "bg-gray-100 text-gray-600",
  BRONZE:    "bg-orange-100 text-orange-700",
  SILVER:    "bg-slate-100 text-slate-700",
  GOLD:      "bg-yellow-100 text-yellow-700",
  BLACKLIST: "bg-red-100 text-red-700",
};
const TIER_ICON: Record<string, string> = {
  NEW: "🌱", BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", BLACKLIST: "🚫",
};

function Pct({ val, danger = 40 }: { val: number; danger?: number }) {
  const color = val >= danger ? "text-red-600 font-bold" : val > 0 ? "text-amber-600" : "text-green-600 font-semibold";
  return <span className={color}>{val ?? 0}%</span>;
}

function Bar({ value, max, color = "bg-forest-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmt(v: number | string) {
  return Number(v).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { from, to } = await searchParams;

  let data: Awaited<ReturnType<typeof getAnalyticsData>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getAnalyticsData(from, to);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur DB";
  }

  const maxRevenue = data ? Math.max(...data.salesByCity.map(c => Number(c.revenue)), 1) : 1;
  const maxQty     = data ? Math.max(...data.topProducts.map(p => Number(p.totalQtySold)), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/analytics" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-8">

        {/* Header + filtre */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Analyse des ventes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Zones, produits, clients à cibler</p>
          </div>
          <form className="flex items-center gap-2 text-sm" method="GET">
            <label className="text-gray-500 font-medium">Du</label>
            <input type="date" name="from" defaultValue={from}
              className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            <label className="text-gray-500 font-medium">au</label>
            <input type="date" name="to" defaultValue={to}
              className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-forest-400" />
            <button type="submit"
              className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors text-sm">
              Filtrer
            </button>
            {(from || to) && (
              <a href="/admin/analytics" className="text-gray-400 hover:text-gray-600 text-xs underline">Réinitialiser</a>
            )}
          </form>
        </div>

        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 text-sm font-semibold">{dbError}</div>
        )}

        {data && (
          <>
            {/* ── KPIs globaux ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Commandes",    val: data.kpis.totalOrders,              color: "text-gray-900" },
                { label: "Livrées ✅",   val: data.kpis.delivered,                color: "text-green-600" },
                { label: "Annulées ❌",  val: data.kpis.cancelled,                color: "text-red-500" },
                { label: "Retournées ↩", val: data.kpis.returned,                 color: "text-rose-500" },
                { label: "CA livré",     val: fmt(data.kpis.totalRevenue) + " TND", color: "text-forest-700" },
                { label: "Panier moyen", val: fmt(data.kpis.avgOrderValue ?? 0) + " TND", color: "text-indigo-600" },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{k.label}</p>
                  <p className={`text-xl font-extrabold mt-1 ${k.color}`}>{k.val}</p>
                </div>
              ))}
            </div>

            {/* ── Section : Zones ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-800">📍 Ventes par zone</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{data.salesByCity.length} villes</span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      {["Ville", "Commandes", "Livrées", "Ann.", "Ret.", "Taux ann.", "Taux ret.", "CA livré", "Qualité zone"].map(h => (
                        <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.salesByCity.map(row => {
                      const quality = Number(row.cancelRate) <= 20 && Number(row.returnRate) <= 10
                        ? { label: "✅ Excellente", cls: "text-green-700 bg-green-50" }
                        : Number(row.cancelRate) <= 40
                        ? { label: "⚠️ Moyenne", cls: "text-amber-700 bg-amber-50" }
                        : { label: "🚫 Risquée", cls: "text-red-700 bg-red-50" };
                      return (
                        <tr key={row.city} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-800">{row.city}</td>
                          <td className="px-4 py-3 font-semibold">{row.totalOrders}</td>
                          <td className="px-4 py-3">
                            <span className="text-green-700 font-bold">{row.deliveredOrders}</span>
                            <Bar value={row.deliveredOrders} max={row.totalOrders} color="bg-green-400" />
                          </td>
                          <td className="px-4 py-3 text-red-500">{row.cancelledOrders}</td>
                          <td className="px-4 py-3 text-rose-500">{row.returnedOrders}</td>
                          <td className="px-4 py-3"><Pct val={Number(row.cancelRate)} /></td>
                          <td className="px-4 py-3"><Pct val={Number(row.returnRate)} danger={20} /></td>
                          <td className="px-4 py-3 font-bold text-forest-700">{fmt(row.revenue)} TND</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${quality.cls}`}>{quality.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Zones sans retour */}
              {(() => {
                const zeroReturn = data.salesByCity.filter(c => c.returnedOrders === 0 && c.deliveredOrders >= 2);
                if (!zeroReturn.length) return null;
                return (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-green-700 mb-2">🌟 Zones sans aucun retour (≥2 livraisons)</p>
                    <div className="flex flex-wrap gap-2">
                      {zeroReturn.map(c => (
                        <span key={c.city} className="text-xs bg-white border border-green-300 text-green-700 font-semibold px-3 py-1 rounded-full">
                          {c.city} — {c.deliveredOrders} livraisons
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* ── Section : Top produits ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-800">🌿 Produits les plus demandés</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{data.topProducts.length} références</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.topProducts.slice(0, 12).map((p, i) => {
                  const stockLevel = p.currentStock === 0
                    ? { label: "Rupture 🚨", cls: "bg-red-100 text-red-700" }
                    : p.currentStock <= 3
                    ? { label: `Stock faible (${p.currentStock})`, cls: "bg-amber-100 text-amber-700" }
                    : { label: `En stock (${p.currentStock})`, cls: "bg-green-100 text-green-700" };

                  return (
                    <div key={p.productId} className={`bg-white rounded-2xl border p-4 shadow-sm space-y-2.5 ${i === 0 ? "border-yellow-300" : i <= 2 ? "border-forest-200" : "border-gray-200"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-lg font-extrabold text-gray-300 mr-1">#{i + 1}</span>
                          <p className="font-bold text-gray-800 inline">{p.productName}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${stockLevel.cls}`}>
                          {stockLevel.label}
                        </span>
                      </div>

                      <Bar value={Number(p.totalQtySold)} max={maxQty} color={i === 0 ? "bg-yellow-400" : i <= 2 ? "bg-forest-500" : "bg-gray-300"} />

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 rounded-xl p-2">
                          <p className="text-gray-400">Qté vendue</p>
                          <p className="font-extrabold text-gray-800 text-sm">{p.totalQtySold}</p>
                        </div>
                        <div className="bg-forest-50 rounded-xl p-2">
                          <p className="text-gray-400">CA</p>
                          <p className="font-extrabold text-forest-700 text-sm">{fmt(p.totalRevenue)}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-2">
                          <p className="text-gray-400">Bénéfice</p>
                          <p className="font-extrabold text-green-700 text-sm">{fmt(p.totalProfit)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 text-right">{p.orderCount} commande{p.orderCount > 1 ? "s" : ""}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Section : Produits rupture & forte demande ── */}
            {data.hotLowStock.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-extrabold text-gray-800">🚨 Réapprovisionner en urgence</h2>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-xs text-red-600 font-semibold mb-3">Produits avec stock ≤ 5 unités qui se vendent bien</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {data.hotLowStock.map(p => (
                      <div key={p.id} className="bg-white rounded-xl border border-red-200 p-3 text-sm space-y-1">
                        <p className="font-bold text-gray-800 text-xs">{p.name}</p>
                        <div className="flex justify-between text-xs">
                          <span className={`font-bold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                            {p.stock === 0 ? "Rupture 🚨" : `${p.stock} restants`}
                          </span>
                          <span className="text-gray-400">{p.totalSold} vendus</span>
                        </div>
                        <p className="text-xs text-gray-500">{fmt(p.price)} TND / unité</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Section : Clients à fort taux de confirmation ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-800">🎯 Clients fiables à cibler</h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  ≥ 80% confirmation — {data.reliableCustomers.length} clients
                </span>
              </div>
              <p className="text-xs text-gray-500">Ces clients confirment et reçoivent presque toujours leurs commandes. Idéaux pour les nouvelles offres.</p>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      {["Client", "Tier", "Taux livraison", "Commandes", "CA total", "Filleuls", "Remise"].map(h => (
                        <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.reliableCustomers.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Aucun client avec ≥ 3 commandes et ≥ 80% de livraison.</td></tr>
                    )}
                    {data.reliableCustomers.map(c => (
                      <tr key={c.phone} className="hover:bg-green-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${TIER_BADGE[c.tier]}`}>
                            {TIER_ICON[c.tier]} {c.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-green-700 font-extrabold text-base">{c.confirmRate}%</span>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${c.confirmRate}%` }} />
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {c.deliveredOrders}/{c.totalOrders} livrées
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{c.totalOrders}</td>
                        <td className="px-4 py-3 font-bold text-forest-700">{fmt(c.totalSpent)} TND</td>
                        <td className="px-4 py-3 text-center">
                          {c.referralCount > 0
                            ? <span className="text-amber-600 font-bold">{c.referralCount} 🤝</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {c.discountPct > 0
                            ? <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded-full text-xs">{c.discountPct}%</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Section : Clients fidèles inactifs à relancer ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-800">💤 Clients fidèles à relancer</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  Inactifs +30j — {data.loyalInactive.length} clients
                </span>
              </div>
              <p className="text-xs text-gray-500">Ces clients ont déjà commandé plusieurs fois mais n'ont pas commandé depuis plus de 30 jours. Contactez-les avec une offre.</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.loyalInactive.length === 0 && (
                  <div className="col-span-3 text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
                    Aucun client fidèle inactif depuis 30 jours. 🎉
                  </div>
                )}
                {data.loyalInactive.map(c => {
                  const daysSince = c.lastOrderAt
                    ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div key={c.phone} className="bg-white rounded-2xl border border-amber-200 p-4 space-y-2 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${TIER_BADGE[c.tier]}`}>
                          {TIER_ICON[c.tier]} {c.tier}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div className="bg-gray-50 rounded-lg p-1.5">
                          <p className="text-gray-400">Livraisons</p>
                          <p className="font-extrabold text-gray-800">{c.deliveredOrders}</p>
                        </div>
                        <div className="bg-forest-50 rounded-lg p-1.5">
                          <p className="text-gray-400">CA</p>
                          <p className="font-extrabold text-forest-700">{fmt(c.totalSpent)}</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-1.5">
                          <p className="text-gray-400">Inactif</p>
                          <p className="font-extrabold text-amber-600">{daysSince}j</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-gray-500">
                          {c.discountPct > 0
                            ? <span className="text-green-600 font-semibold">Remise active : {c.discountPct}%</span>
                            : <span className="text-gray-400">Pas de remise active</span>}
                        </div>
                        {c.referralCode && (
                          <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            {c.referralCode}
                          </span>
                        )}
                      </div>

                      <a
                        href={`https://wa.me/216${c.phone.replace(/\D/g, "").slice(-8)}?text=${encodeURIComponent(`Bonjour ${c.name} ! 🌿 Cela fait ${daysSince} jours que vous n'avez pas commandé. Nous avons de nouvelles plantes pour vous${c.discountPct > 0 ? ` + ${c.discountPct}% de remise !` : " !"} 🎁`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-xl transition-colors w-full"
                      >
                        📲 Relancer sur WhatsApp
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
