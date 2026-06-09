"use client";
import { useState } from "react";
import { ListeLivreur } from "@/components/ListeLivreur";

interface Order {
  id: number; customerName: string; customerPhone: string;
  customerCity: string; customerAddress: string | null; status: string;
  paymentStatus: string; total: string | number | null;
  remainingAmount: string | number | null; deliveredBy: number | null;
  deliveryNotes: string | null; createdAt: Date | string;
}
interface StaffMember { id: number; name: string; role: string; }
type SortKey = "city" | "total" | "deliveredBy" | "status";

const STATUS: Record<string, { l: string; c: string }> = {
  PENDING:   { l: "En attente",  c: "bg-gray-100 text-gray-700" },
  CONFIRMED: { l: "Confirmée",   c: "bg-blue-100 text-blue-700" },
  PREPARING: { l: "Préparation", c: "bg-purple-100 text-purple-700" },
  SHIPPED:   { l: "Expédiée",    c: "bg-indigo-100 text-indigo-700" },
};
const PAY: Record<string, { l: string; c: string }> = {
  UNPAID:       { l: "À payer livraison", c: "bg-amber-100 text-amber-700" },
  PARTIAL_PAID: { l: "Avance reçue",      c: "bg-orange-100 text-orange-700" },
  FULLY_PAID:   { l: "Payée",             c: "bg-green-100 text-green-700" },
  REFUNDED:     { l: "Remboursée",        c: "bg-rose-100 text-rose-700" },
};

const fmt = (n: string | number | null | undefined) => parseFloat(String(n ?? 0)).toFixed(3) + " TND";

export function TourneesClient({ orders, allStaff, sessionRole, sessionId }:
  { orders: Order[]; allStaff: StaffMember[]; sessionRole: string; sessionId: number }) {

  const [sortKey, setSortKey] = useState<SortKey>("deliveredBy");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [filterLivreur, setFilterLivreur] = useState("all");

  const livreurs = allStaff.filter(s => s.role !== "AGENT");

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(k); setSortDir(1); }
  }

  const filtered = orders.filter(o =>
    filterLivreur === "all" ? true :
    filterLivreur === "unassigned" ? !o.deliveredBy :
    o.deliveredBy === Number(filterLivreur)
  );

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0;
    if (sortKey === "city")        { av = a.customerCity; bv = b.customerCity; }
    if (sortKey === "total")       { av = parseFloat(String(a.total)); bv = parseFloat(String(b.total)); }
    if (sortKey === "deliveredBy") { av = a.deliveredBy ?? 0; bv = b.deliveredBy ?? 0; }
    if (sortKey === "status")      { av = a.status; bv = b.status; }
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  const groups = new Map<string, Order[]>();
  for (const o of sorted) {
    const k = o.deliveredBy ? String(o.deliveredBy) : "__unassigned__";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(o);
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => toggleSort(k)}
      className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none">
      {label} {sortKey === k ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3 flex-wrap">
        <label className="text-xs font-semibold text-gray-500 uppercase">Filtrer :</label>
        <select value={filterLivreur} onChange={e => setFilterLivreur(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none">
          <option value="all">Tous ({orders.length})</option>
          <option value="unassigned">Non assigné ({orders.filter(o => !o.deliveredBy).length})</option>
          {livreurs.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({orders.filter(o => o.deliveredBy === l.id).length})</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} affiché(s)</span>
        {filterLivreur !== "all" && filterLivreur !== "unassigned" && (() => {
          const liv = allStaff.find(s => s.id === Number(filterLivreur));
          return liv ? (
            <div className="ml-auto no-print">
              <ListeLivreur
                livreurName={liv.name}
                orders={filtered.map(o => ({
                  id: o.id,
                  customerName: o.customerName,
                  customerPhone: o.customerPhone,
                  customerCity: o.customerCity,
                  customerAddress: o.customerAddress ?? "",
                  total: o.total ?? 0,
                  remainingAmount: o.remainingAmount ?? 0,
                  paymentMethod: "CASH_ON_DELIVERY",
                  deliveryNotes: o.deliveryNotes,
                  status: o.status,
                }))}
              />
            </div>
          ) : null;
        })()}
      </div>

      {/* Groupes par livreur */}
      {Array.from(groups.entries()).map(([key, grp]) => {
        const livId = key === "__unassigned__" ? null : Number(key);
        const livName = livId ? (allStaff.find(s => s.id === livId)?.name ?? `#${livId}`) : "Non assigné";
        const totalRest = grp.reduce((s, o) => s + parseFloat(String(o.remainingAmount ?? 0)), 0);

        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 flex items-center justify-between flex-wrap gap-2 ${livId ? "bg-indigo-50 border-b border-indigo-100" : "bg-amber-50 border-b border-amber-100"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{livId ? "🚚" : "⚠️"}</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{livName}</p>
                  <p className="text-xs text-gray-500">{grp.length} commande(s)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">À encaisser total</p>
                <p className="font-bold text-gray-900">{fmt(totalRest)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">N°</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Client</th>
                    <Th k="city" label="Ville" />
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Tél.</th>
                    <Th k="total" label="Total" />
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">À percevoir</th>
                    <Th k="status" label="Statut" />
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Paiement</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grp.map(o => {
                    const st = STATUS[o.status] ?? { l: o.status, c: "bg-gray-100 text-gray-700" };
                    const py = PAY[o.paymentStatus] ?? { l: o.paymentStatus, c: "bg-gray-100 text-gray-700" };
                    return (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">#{o.id}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-900">{o.customerName}</p>
                          {o.deliveryNotes && <p className="text-xs text-gray-400 italic truncate max-w-[140px]">{o.deliveryNotes}</p>}
                        </td>
                        <td className="px-3 py-3 text-gray-700">{o.customerCity}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{o.customerPhone}</td>
                        <td className="px-3 py-3 font-semibold text-gray-900">{fmt(o.total)}</td>
                        <td className="px-3 py-3 font-bold text-amber-700">{fmt(o.remainingAmount)}</td>
                        <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.c}`}>{st.l}</span></td>
                        <td className="px-3 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${py.c}`}>{py.l}</span></td>
                        <td className="px-3 py-3">
                          <a href={`/admin/orders/${o.id}`}
                            className="text-xs bg-gray-900 hover:bg-gray-700 text-white font-bold px-3 py-1 rounded-lg">
                            Détail →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-semibold">Aucune commande en cours.</p>
        </div>
      )}
    </div>
  );
}
