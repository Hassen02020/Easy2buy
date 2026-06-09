"use client";
import { useState, useTransition } from "react";

interface StaffMember { id: number; name: string; role: string; }
interface Props {
  orderId: number;
  order: {
    status: string; customerName: string; customerPhone: string;
    customerCity: string; customerAddress: string | null; notes: string | null;
    assignedTo: number | null; preparedBy: number | null; packedBy: number | null;
    deliveredBy: number | null; confirmedBy: number | null;
  };
  allStaff: StaffMember[];
  sessionRole: string;
  sessionId: number;
  assignTaskAction: (fd: FormData) => Promise<{ error?: string }>;
  updateCustomerInfoAction: (fd: FormData) => Promise<{ error?: string }>;
  changeStatusAction: (fd: FormData) => Promise<{ error?: string }>;
}

const STATUSES = [
  { v: "PENDING",   l: "En attente",  c: "bg-gray-100 text-gray-700" },
  { v: "CONFIRMED", l: "Confirmée",   c: "bg-blue-100 text-blue-700" },
  { v: "PREPARING", l: "Préparation", c: "bg-purple-100 text-purple-700" },
  { v: "SHIPPED",   l: "Expédiée",    c: "bg-indigo-100 text-indigo-700" },
  { v: "DELIVERED", l: "Livrée",      c: "bg-green-100 text-green-700" },
  { v: "CANCELLED", l: "Annulée",     c: "bg-red-100 text-red-700" },
  { v: "RETURNED",  l: "Retournée",   c: "bg-rose-100 text-rose-700" },
];
const FLOW = ["PENDING","CONFIRMED","PREPARING","SHIPPED","DELIVERED"];

export function OrderDetailClient({ orderId, order, allStaff, sessionRole, sessionId,
  assignTaskAction, updateCustomerInfoAction, changeStatusAction }: Props) {
  const [pending, start] = useTransition();
  const [editClient, setEditClient] = useState(false);
  const [assignMsg, setAssignMsg]   = useState("");
  const [clientMsg, setClientMsg]   = useState("");
  const [statusMsg, setStatusMsg]   = useState("");
  const canEdit = sessionRole === "ADMIN" || sessionRole === "AGENT";
  const meta = STATUSES.find(s => s.v === order.status);
  const idx  = FLOW.indexOf(order.status);

  function sName(id: number | null) {
    if (!id) return <span className="text-gray-400 italic text-xs">—</span>;
    const m = allStaff.find(s => s.id === id);
    return <span className="font-semibold text-gray-800">{m?.name ?? `#${id}`}</span>;
  }

  function doAssign(role: string, val: string) {
    const fd = new FormData();
    fd.set("orderId", String(orderId)); fd.set("role", role);
    fd.set("staffId", val); fd.set("actorRole", sessionRole);
    start(async () => { const r = await assignTaskAction(fd); setAssignMsg(r?.error ?? "✓ Enregistré"); });
  }

  return (
    <div className="space-y-4">

      {/* Statut + progression */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Progression</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${meta?.c}`}>{meta?.l}</span>
        </div>
        <div className="flex gap-1 mb-4">
          {FLOW.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`w-full h-1.5 rounded-full ${i <= idx ? "bg-green-500" : "bg-gray-200"}`} />
              <span className={`text-[9px] font-semibold ${i <= idx ? "text-green-600" : "text-gray-400"}`}>
                {STATUSES.find(x => x.v === s)?.l}
              </span>
            </div>
          ))}
        </div>
        {canEdit && (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget);
            fd.set("orderId", String(orderId)); fd.set("staffId", String(sessionId)); fd.set("actorRole", sessionRole);
            start(async () => { const r = await changeStatusAction(fd); setStatusMsg(r?.error ?? "✓ Statut mis à jour"); });
          }} className="flex items-center gap-2 flex-wrap">
            <select name="newStatus" defaultValue={order.status}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <button type="submit" disabled={pending}
              className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
              {pending ? "…" : "Changer statut"}
            </button>
            {statusMsg && <span className={`text-xs font-medium ${statusMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{statusMsg}</span>}
          </form>
        )}
      </div>

      {/* Acteurs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-3">Acteurs</h2>
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          {[["Confirmée par", order.confirmedBy],["Agent", order.assignedTo],
            ["Préparateur", order.preparedBy],["Emballeur", order.packedBy],
            ["Livreur", order.deliveredBy]].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-gray-400 text-xs">{l}</p>
              <p>{sName(v as number | null)}</p>
            </div>
          ))}
          <div>
            <p className="text-gray-400 text-xs">Client</p>
            <p className="font-semibold text-gray-800">{order.customerName}</p>
          </div>
        </div>
        {canEdit && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigner livreur</p>
            <select defaultValue={order.deliveredBy ?? ""} onChange={e => doAssign("deliveredBy", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-forest-400">
              <option value="">— Non assigné —</option>
              {allStaff.filter(s => s.role !== "AGENT").map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
            {assignMsg && <p className={`text-xs mt-1 font-medium ${assignMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{assignMsg}</p>}
          </div>
        )}
      </div>

      {/* Infos client */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Client</h2>
          {canEdit && (
            <button onClick={() => setEditClient(!editClient)}
              className="text-xs text-forest-600 hover:text-forest-800 font-semibold underline">
              {editClient ? "Annuler" : "✏️ Modifier"}
            </button>
          )}
        </div>
        {!editClient ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[["Nom", order.customerName],["Tél.", order.customerPhone],
              ["Ville", order.customerCity],["Adresse", order.customerAddress ?? "—"],
              ["Notes", order.notes ?? "—"]].map(([l, v]) => (
              <div key={String(l)}>
                <p className="text-gray-400 text-xs">{l}</p>
                <p className="font-medium text-gray-800">{v}</p>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget);
            fd.set("orderId", String(orderId)); fd.set("staffId", String(sessionId)); fd.set("actorRole", sessionRole);
            start(async () => { const r = await updateCustomerInfoAction(fd);
              setClientMsg(r?.error ?? "✓ Mis à jour"); if (!r?.error) setEditClient(false); });
          }} className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Téléphone</label>
                <input name="customerPhone" defaultValue={order.customerPhone}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Ville</label>
                <input name="customerCity" defaultValue={order.customerCity}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400" />
              </div>
            </div>
            <textarea name="customerAddress" rows={2} placeholder="Adresse" defaultValue={order.customerAddress ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-forest-400" />
            <textarea name="notes" rows={2} placeholder="Notes internes" defaultValue={order.notes ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-forest-400" />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={pending}
                className="bg-forest-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-forest-700 transition-colors disabled:opacity-50">
                {pending ? "…" : "Sauvegarder"}
              </button>
              {clientMsg && <span className={`text-xs font-medium ${clientMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{clientMsg}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
