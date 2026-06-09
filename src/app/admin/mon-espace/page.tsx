export const dynamic = "force-dynamic";
/**
 * app/admin/mon-espace/page.tsx
 * --------------------------------
 * Vue filtrée par staff_id — chaque employé voit UNIQUEMENT ses commandes.
 * URL : /admin/mon-espace?staffId=3
 *
 * En production, remplacer staffId par la session authentifiée.
 */

import { db } from "@/db";
import { orders, staff, workflowEvents } from "@/db/schema";
import { eq, or, count, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { ROLE_LABELS, ROLE_COLORS, checkAccess } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import type { StaffRole, OrderStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "En attente",  color: "text-amber-700",  bg: "bg-amber-50" },
  CONFIRMED: { label: "Confirmée",   color: "text-blue-700",   bg: "bg-blue-50" },
  PREPARING: { label: "Préparation", color: "text-purple-700", bg: "bg-purple-50" },
  SHIPPED:   { label: "Expédiée",    color: "text-indigo-700", bg: "bg-indigo-50" },
  DELIVERED: { label: "Livrée",      color: "text-green-700",  bg: "bg-green-50" },
  CANCELLED: { label: "Annulée",     color: "text-red-700",    bg: "bg-red-50" },
  RETURNED:  { label: "Retournée",   color: "text-rose-700",   bg: "bg-rose-50" },
};

function fmt(n: string | number | null | undefined) {
  return parseFloat(String(n ?? "0")).toFixed(3) + " TND";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getMySpace(staffId: number) {
  const [member] = await db.select().from(staff).where(eq(staff.id, staffId));
  if (!member) return null;

  // Commandes où ce staff est impliqué (tous rôles)
  const myOrders = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.assignedTo,  staffId),
        eq(orders.preparedBy,  staffId),
        eq(orders.packedBy,    staffId),
        eq(orders.deliveredBy, staffId),
        eq(orders.confirmedBy, staffId),
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(50);

  // KPIs personnels
  const [kpis] = await db
    .select({
      confirmed: count(),
    })
    .from(orders)
    .where(eq(orders.confirmedBy, staffId));

  const [packKpi] = await db
    .select({ packed: count() })
    .from(orders)
    .where(eq(orders.packedBy, staffId));

  const [delivKpi] = await db
    .select({ delivered: count() })
    .from(orders)
    .where(eq(orders.deliveredBy, staffId));

  const [retKpi] = await db
    .select({ returned: count() })
    .from(orders)
    .where(eq(orders.deliveredBy, staffId));

  // Derniers workflow events de ce staff
  const recentEvents = await db
    .select()
    .from(workflowEvents)
    .where(eq(workflowEvents.staffId, staffId))
    .orderBy(desc(workflowEvents.createdAt))
    .limit(10);

  return {
    member,
    myOrders,
    kpis: {
      confirmed: Number(kpis?.confirmed ?? 0),
      packed:    Number(packKpi?.packed ?? 0),
      delivered: Number(delivKpi?.delivered ?? 0),
      returned:  Number(retKpi?.returned ?? 0),
    },
    recentEvents,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{ staffId?: string }>;
}

export default async function MonEspacePage({ searchParams }: PageProps) {
  // Session cookie en priorité
  const session = await getSession();
  const { staffId: staffIdStr } = await searchParams;

  // Résoudre l'ID : session > query param (admin peut consulter un autre profil)
  let staffId: number;
  if (session) {
    // ADMIN peut voir un autre profil via ?staffId=X
    if (session.role === "ADMIN" && staffIdStr) {
      staffId = Number(staffIdStr);
    } else {
      staffId = session.id;
    }
  } else if (staffIdStr) {
    staffId = Number(staffIdStr);
  } else {
    redirect("/admin/login");
    return;
  }

  if (!staffId || isNaN(staffId)) {
    redirect("/admin/login");
    return;
  }

  const data = await getMySpace(staffId);
  if (!data) notFound();

  const { member, myOrders, kpis, recentEvents } = data;
  const roleLabel = ROLE_LABELS[member.role as StaffRole] ?? member.role;
  const roleColor = ROLE_COLORS[member.role as StaffRole] ?? "bg-gray-100 text-gray-700";
  const canConfirmDelivery = checkAccess(member.role as StaffRole, "CONFIRM_DELIVERY");
  const deliveryRate = kpis.delivered > 0
    ? (((kpis.delivered - kpis.returned) / kpis.delivered) * 100).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/mon-espace" role={session?.role as StaffRole} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header profil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-forest-100 flex items-center justify-center text-xl font-extrabold text-forest-700">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">{member.name}</h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{member.email}</p>
          </div>
          {session?.role === "ADMIN" && (
            <a href="/admin/staff" className="text-xs text-gray-400 hover:text-gray-600 underline">← Gérer le personnel</a>
          )}
        </div>

        {/* KPIs personnels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Ventes confirmées",  value: kpis.confirmed, color: "text-blue-600",  bg: "bg-blue-50 border-blue-100" },
            { label: "Colis emballés",     value: kpis.packed,    color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
            { label: "Livraisons",         value: kpis.delivered, color: "text-green-600",  bg: "bg-green-50 border-green-100" },
            { label: "Taux succès livr.",  value: deliveryRate === "—" ? "—" : `${deliveryRate}%`, color: "text-forest-600", bg: "bg-forest-50 border-forest-100" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Commandes assignées */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Mes commandes</h2>
                <p className="text-xs text-gray-400">{myOrders.length} commande(s) assignées</p>
              </div>
            </div>

            {myOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                Aucune commande assignée pour l&apos;instant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["#", "Client", "Ville", "Total", "Mon rôle", "Statut", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myOrders.map((order) => {
                      const meta = STATUS_META[order.status];
                      const myRole = order.deliveredBy === staffId ? "Livreur"
                        : order.packedBy    === staffId ? "Emballeur"
                        : order.preparedBy  === staffId ? "Préparateur"
                        : order.confirmedBy === staffId ? "Confirmateur"
                        : "Agent";
                      return (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{order.id}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{order.customerName}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{order.customerCity}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{fmt(order.total)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{myRole}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <a href={`/admin/orders/${order.id}`}
                              className="text-xs text-forest-600 hover:text-forest-800 font-semibold underline">
                              Ouvrir →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activité récente */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">Activité récente</h2>
              <p className="text-xs text-gray-400">Dernières actions effectuées</p>
            </div>
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">Aucune activité récente.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentEvents.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 rounded-full bg-forest-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">
                        {ev.action} — <span className="font-mono text-gray-500">#{ev.orderId}</span>
                      </p>
                      {ev.note && <p className="text-xs text-gray-400 truncate">{ev.note}</p>}
                      <p className="text-xs text-gray-300 mt-0.5">
                        {new Date(ev.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Accès conditionnel RBAC */}
            {canConfirmDelivery && (
              <div className="px-4 pb-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <p className="font-bold mb-1">⚡ Votre accès livreur</p>
                  <p>Vous pouvez confirmer les paiements à la livraison depuis chaque fiche commande.</p>
                  <a href="/admin/orders?status=SHIPPED" className="underline font-semibold mt-1 inline-block">
                    Voir commandes expédiées →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
