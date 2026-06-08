"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, PackageSearch, Clock, CheckCircle2, Truck,
  Package, ThumbsUp, XCircle, Printer, Banknote,
  CreditCard, ChevronRight, Leaf,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItem {
  productName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

interface TrackResult {
  id: number;
  customerName: string;
  customerCity: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  advanceAmount: string;
  remainingAmount: string;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
  currentStep: number;
  totalSteps: number;
  canPrintInvoice: boolean;
  cancelled?: boolean;
}

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

const STEPS = [
  { key: "PENDING",   label: "En attente",       icon: Clock,        desc: "Votre commande a été reçue et est en cours de traitement." },
  { key: "CONFIRMED", label: "Confirmée",         icon: CheckCircle2, desc: "Notre équipe a confirmé votre commande." },
  { key: "PREPARING", label: "En préparation",    icon: Package,      desc: "Vos plantes sont soigneusement emballées." },
  { key: "SHIPPED",   label: "En livraison",      icon: Truck,        desc: "Le livreur est en route vers vous !" },
  { key: "DELIVERED", label: "Livrée",            icon: ThumbsUp,     desc: "Commande livrée avec succès. Merci !" },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Espèces à la livraison",
  D17:              "D17",
  FLOUCI:           "Flouci",
  ONLINE:           "Carte en ligne",
  BANK_TRANSFER:    "Virement bancaire",
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UNPAID:       { label: "Non payée",          color: "text-gray-500 bg-gray-100" },
  PARTIAL_PAID: { label: "Avance versée",       color: "text-amber-700 bg-amber-100" },
  FULLY_PAID:   { label: "Intégralement payée", color: "text-green-700 bg-green-100" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuiviPage() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<TrackResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim().replace(/^#/, "");
    if (!id) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/orders/${id}/track`);
      if (res.status === 404) { setError("Aucune commande trouvée avec ce numéro."); return; }
      if (!res.ok)             { setError("Erreur lors de la recherche. Réessayez."); return; }
      const data: TrackResult = await res.json();
      setResult(data);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: string | number) =>
    Number(v).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " TND";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-forest-700 font-extrabold text-lg">
            <Leaf size={22} className="text-forest-500" /> Easy2Buy
          </a>
          <span className="text-sm text-gray-400">Suivi de commande</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-forest-100 mb-2">
            <PackageSearch size={28} className="text-forest-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Suivre ma commande</h1>
          <p className="text-gray-500 text-sm">Saisissez le numéro reçu lors de votre commande</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">#</span>
            <input
              type="number"
              min="1"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="Numéro de commande"
              className="w-full pl-7 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !orderId.trim()}
            className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-gray-300 text-white font-bold px-5 py-3 rounded-2xl transition-colors shadow-sm"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Search size={16} />}
            Chercher
          </button>
        </form>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl max-w-md mx-auto">
            <XCircle size={16} /> {error}
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div key={result.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Header commande */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Commande</p>
                    <h2 className="text-2xl font-extrabold text-gray-900">#{result.id}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {result.customerName} — {result.customerCity}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Passée le {new Date(result.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      PAYMENT_STATUS_LABELS[result.paymentStatus]?.color ?? "bg-gray-100 text-gray-500"
                    }`}>
                      {PAYMENT_STATUS_LABELS[result.paymentStatus]?.label}
                    </span>
                    <p className="text-xl font-extrabold text-forest-700">{fmt(result.total)}</p>
                    <p className="text-xs text-gray-400">{PAYMENT_LABELS[result.paymentMethod] ?? result.paymentMethod}</p>
                  </div>
                </div>

                {/* Avance / Solde */}
                {result.paymentStatus === "PARTIAL_PAID" && (
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
                      <p className="text-xs text-green-600 font-semibold mb-0.5">Avance versée</p>
                      <p className="font-extrabold text-green-700">{fmt(result.advanceAmount)}</p>
                    </div>
                    <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
                      <p className="text-xs text-amber-600 font-semibold mb-0.5">Solde à payer à la livraison</p>
                      <p className="font-extrabold text-amber-700">{fmt(result.remainingAmount)}</p>
                    </div>
                  </div>
                )}

                {result.paymentStatus === "FULLY_PAID" && result.paidAt && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
                    ✅ Payée intégralement le {new Date(result.paidAt).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Stepper */}
              {!result.cancelled && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-5">Statut de la commande</h3>
                  <div className="space-y-0">
                    {STEPS.map((step, i) => {
                      const done    = i < result.currentStep;
                      const current = i === result.currentStep;
                      const pending = i > result.currentStep;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              done    ? "bg-forest-600 text-white" :
                              current ? "bg-forest-100 text-forest-600 ring-2 ring-forest-400 ring-offset-2" :
                                        "bg-gray-100 text-gray-300"
                            }`}>
                              <Icon size={16} />
                            </div>
                            {i < STEPS.length - 1 && (
                              <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${done ? "bg-forest-400" : "bg-gray-200"}`} />
                            )}
                          </div>

                          {/* Label */}
                          <div className={`pb-5 pt-1.5 ${pending ? "opacity-40" : ""}`}>
                            <p className={`text-sm font-bold ${current ? "text-forest-700" : done ? "text-gray-700" : "text-gray-400"}`}>
                              {step.label}
                              {current && (
                                <span className="ml-2 text-xs font-semibold text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                                  Statut actuel
                                </span>
                              )}
                            </p>
                            {(done || current) && (
                              <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {result.status === "CANCELLED" && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                      <XCircle size={16} /> Cette commande a été annulée.
                    </div>
                  )}
                </div>
              )}

              {/* Détail articles */}
              {result.items.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4">Articles commandés</h3>
                  <div className="space-y-2">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-semibold text-gray-800">{item.productName}</p>
                          <p className="text-xs text-gray-400">{fmt(item.unitPrice)} × {item.quantity}</p>
                        </div>
                        <span className="font-bold text-gray-700">{fmt(item.lineTotal)}</span>
                      </div>
                    ))}
                    <div className="pt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-gray-500">
                        <span>Sous-total</span><span>{fmt(result.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Livraison</span><span>{fmt(result.deliveryFee)}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-200">
                        <span>Total</span><span className="text-forest-700">{fmt(result.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton facture */}
              {result.canPrintInvoice && (
                <motion.a
                  href={`/suivi/${result.id}/facture`}
                  target="_blank"
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center justify-between bg-forest-600 hover:bg-forest-700 text-white font-bold px-6 py-4 rounded-3xl shadow-md transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Printer size={20} />
                    <div>
                      <p className="text-sm font-extrabold">Télécharger ma facture</p>
                      <p className="text-xs text-forest-200 font-normal">Facture officielle — commande #{result.id}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="opacity-70" />
                </motion.a>
              )}

              {/* Message si pas encore payé */}
              {!result.canPrintInvoice && result.status !== "CANCELLED" && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700">
                  <Banknote size={18} className="shrink-0" />
                  <div>
                    <p className="font-semibold">Facture disponible après paiement complet</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {result.paymentStatus === "PARTIAL_PAID"
                        ? `Solde restant : ${fmt(result.remainingAmount)} à régler à la livraison.`
                        : "Le paiement sera collecté à la livraison."}
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!result && !error && (
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Search,      title: "Saisissez le n°",    desc: "Le numéro de commande vous a été communiqué à la confirmation." },
              { icon: Truck,       title: "Suivez en temps réel", desc: "Consultez l'état de votre livraison à tout moment." },
              { icon: CreditCard,  title: "Téléchargez la facture", desc: "Une facture est disponible dès que votre commande est payée." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-2 shadow-sm">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-forest-50 rounded-xl">
                  <Icon size={18} className="text-forest-600" />
                </div>
                <p className="font-bold text-sm text-gray-800">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
