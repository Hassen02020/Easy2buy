"use client";

import { useState } from "react";
import {
  Truck, CheckCircle2, Clock, Phone, MapPin, Banknote,
  MessageSquare, ChevronDown, ChevronUp, Printer, LogOut
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TourneeOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  total: string;
  advanceAmount: string;
  remainingAmount: string;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  deliveryNotes: string | null;
  courierRemarks: string | null;
  createdAt: Date;
}

interface Props {
  livreur: { id: number; name: string; role: string };
  tournee: TourneeOrder[];
  totalAEncaisser: number;
  totalEncaisse: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(v: string | number | null | undefined) {
  return parseFloat(String(v ?? "0")).toFixed(3) + " TND";
}

// ---------------------------------------------------------------------------
// Composant carte commande
// ---------------------------------------------------------------------------
function OrderCard({ order, onConfirm }: { order: TourneeOrder; onConfirm: (id: number, remarks: string) => Promise<void> }) {
  const [open, setOpen]       = useState(false);
  const [remarks, setRemarks] = useState(order.courierRemarks ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(order.status === "DELIVERED");

  const remaining = parseFloat(String(order.remainingAmount ?? "0"));
  const isFullyPaid = order.paymentStatus === "FULLY_PAID" || remaining <= 0;

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(order.id, remarks);
    setDone(true);
    setLoading(false);
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${done ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-base">{order.customerName}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              #{order.id}
            </span>
          </div>
          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium mb-1">
            <Phone size={13} /> {order.customerPhone}
          </a>
          <div className="flex items-start gap-1.5 text-sm text-gray-500">
            <MapPin size={13} className="mt-0.5 shrink-0" />
            <span>{order.customerAddress}, <strong>{order.customerCity}</strong></span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {done ? (
            <CheckCircle2 size={28} className="text-green-500 ml-auto mb-1" />
          ) : (
            <Clock size={28} className="text-amber-400 ml-auto mb-1" />
          )}
          <div className="text-lg font-extrabold text-gray-900">{fmt(order.total)}</div>
        </div>
      </div>

      {/* Statut paiement */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        {isFullyPaid ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full">
            <CheckCircle2 size={12} /> Déjà payé
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">
            <Banknote size={12} /> À encaisser : {fmt(order.remainingAmount)}
          </span>
        )}
        {order.advanceAmount && parseFloat(String(order.advanceAmount)) > 0 && (
          <span className="text-xs text-gray-400">Avance: {fmt(order.advanceAmount)}</span>
        )}
        {order.paymentMethod === "CASH_ON_DELIVERY" && (
          <span className="text-xs text-gray-400">• Paiement à la livraison</span>
        )}
      </div>

      {/* Notes livraison */}
      {order.deliveryNotes && (
        <div className="mx-4 mb-3 p-2.5 bg-blue-50 rounded-xl text-xs text-blue-700">
          📍 {order.deliveryNotes}
        </div>
      )}

      {/* Expandable section */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-1.5"><MessageSquare size={14} /> Remarques & action</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3">
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Remarques livreur (absent, mauvaise adresse...)"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-forest-500 focus:border-transparent outline-none"
            />

            <div className="flex gap-2">
              {!done && (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Confirmer encaissement
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Printer size={14} /> Bon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function TourneeClient({ livreur, tournee, totalAEncaisser, totalEncaisse }: Props) {
  const [orders, setOrders] = useState(tournee);
  const [tab, setTab]       = useState<"pending" | "done">("pending");

  const pending = orders.filter(o => o.status === "SHIPPED");
  const done    = orders.filter(o => o.status === "DELIVERED");

  async function handleConfirm(orderId: number, remarks: string) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED", courierRemarks: remarks }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "DELIVERED", courierRemarks: remarks } : o));
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const displayed = tab === "pending" ? pending : done;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={22} className="text-forest-600" />
            <div>
              <div className="font-bold text-gray-900 text-sm leading-none">Ma Tournée</div>
              <div className="text-xs text-gray-400">{livreur.name}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">À encaisser</div>
            <div className="text-xl font-extrabold text-red-600">{totalAEncaisser.toFixed(3)} TND</div>
            <div className="text-xs text-gray-400 mt-0.5">{pending.length} livraisons</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Encaissé</div>
            <div className="text-xl font-extrabold text-green-600">{totalEncaisse.toFixed(3)} TND</div>
            <div className="text-xs text-gray-400 mt-0.5">{done.length} livrées</div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {([["pending", "En attente", pending.length], ["done", "Livrées", done.length]] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === key ? "bg-forest-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === key ? "bg-white/20" : "bg-gray-100"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Liste */}
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{tab === "pending" ? "Aucune livraison en attente" : "Aucune livraison confirmée"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(order => (
              <OrderCard key={order.id} order={order} onConfirm={handleConfirm} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
