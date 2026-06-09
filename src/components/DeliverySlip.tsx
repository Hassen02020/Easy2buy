"use client";

/**
 * DeliverySlip.tsx
 * -----------------
 * Bon de livraison format A5 / étiquette thermique.
 * Déclenche window.print() via le bouton "Imprimer Bon".
 * Le CSS print masque tout sauf #delivery-slip-root.
 */

import { Printer } from "lucide-react";
import { CONTACT } from "@/lib/contact";

interface SlipItem {
  productName: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
}

interface DeliverySlipProps {
  orderId: number;
  createdAt: Date | string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  items: SlipItem[];
  total: string | number;
  advanceAmount: string | number;
  remainingAmount: string | number;
  paymentMethod: string;
  deliveryNotes?: string | null;
  courierRemarks?: string | null;
}

function fmt(n: string | number | null | undefined) {
  return parseFloat(String(n ?? "0")).toFixed(3) + " TND";
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Espèces à la livraison",
  D17:              "D17",
  FLOUCI:           "Flouci",
  ONLINE:           "Carte en ligne",
  BANK_TRANSFER:    "Virement bancaire",
};

export function DeliverySlip(props: DeliverySlipProps) {
  const {
    orderId, createdAt, customerName, customerPhone,
    customerCity, customerAddress, items,
    total, advanceAmount, remainingAmount, paymentMethod,
    deliveryNotes, courierRemarks,
  } = props;

  const amountDue = parseFloat(String(remainingAmount)) > 0
    ? fmt(remainingAmount)
    : fmt(total);

  const dateStr = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <>
      {/* ── Bouton impression (masqué à l'impression) ── */}
      <button
        onClick={() => window.print()}
        className="no-print flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
      >
        <Printer size={16} /> Imprimer Bon
      </button>

      {/* ── Bon de livraison ── */}
      <div
        id="delivery-slip-root"
        style={{ display: "none", width: "148mm", minHeight: "210mm", padding: "8mm", boxSizing: "border-box", fontFamily: "monospace", color: "black", background: "white" }}
      >
        {/* ── HEADER ── */}
        <div style={{ borderBottom: "2px solid black", paddingBottom: "4mm", marginBottom: "4mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "14pt", fontWeight: "900", letterSpacing: "0.05em" }}>
                {CONTACT.businessName}
              </p>
              <p style={{ fontSize: "7pt", color: "#555" }}>{CONTACT.phone} · {CONTACT.phone2}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "11pt", fontWeight: "bold" }}>BON DE LIVRAISON</p>
              <p style={{ fontSize: "8pt" }}>N° <strong>#{orderId}</strong></p>
              <p style={{ fontSize: "7pt", color: "#555" }}>{dateStr}</p>
            </div>
          </div>
        </div>

        {/* ── CLIENT ── */}
        <div style={{ border: "1px solid black", borderRadius: "3mm", padding: "3mm", marginBottom: "4mm" }}>
          <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "1.5mm" }}>
            Destinataire
          </p>
          <p style={{ fontSize: "10pt", fontWeight: "bold" }}>{customerName}</p>
          <p style={{ fontSize: "8pt" }}>{customerPhone}</p>
          <p style={{ fontSize: "8pt" }}>{customerCity} — {customerAddress}</p>
        </div>

        {/* ── ARTICLES ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", marginBottom: "4mm" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid black" }}>
              <th style={{ textAlign: "left",  padding: "1mm 2mm", fontWeight: "bold" }}>Produit</th>
              <th style={{ textAlign: "center", padding: "1mm 2mm", fontWeight: "bold" }}>Qté</th>
              <th style={{ textAlign: "right",  padding: "1mm 2mm", fontWeight: "bold" }}>P.U.</th>
              <th style={{ textAlign: "right",  padding: "1mm 2mm", fontWeight: "bold" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "0.5px solid #ccc" }}>
                <td style={{ padding: "1.5mm 2mm" }}>{item.productName}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: "1.5mm 2mm", textAlign: "right", fontWeight: "bold" }}>{fmt(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── MONTANTS ── */}
        <div style={{ border: "2px solid black", borderRadius: "3mm", padding: "3mm", marginBottom: "4mm", textAlign: "right" }}>
          <p style={{ fontSize: "8pt", color: "#555" }}>
            Méthode : <strong>{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</strong>
          </p>
          {parseFloat(String(advanceAmount)) > 0 && (
            <p style={{ fontSize: "8pt", color: "#555" }}>
              Avance reçue : <strong>{fmt(advanceAmount)}</strong>
            </p>
          )}
          <p style={{ fontSize: "11pt", fontWeight: "900", marginTop: "1.5mm", borderTop: "1px solid black", paddingTop: "1.5mm" }}>
            MONTANT À PERCEVOIR : {amountDue}
          </p>
        </div>

        {/* ── REMARQUES & REPÈRES (delivery_notes) ── */}
        <div style={{ border: "1px solid black", borderRadius: "3mm", padding: "3mm", marginBottom: "4mm" }}>
          <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "1.5mm" }}>
            Remarques &amp; Repères
          </p>
          {deliveryNotes ? (
            <p style={{ fontSize: "8pt", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{deliveryNotes}</p>
          ) : (
            <p style={{ fontSize: "8pt", color: "#aaa", fontStyle: "italic" }}>Aucune remarque logistique.</p>
          )}
        </div>

        {/* ── ZONE MANUSCRITE LIVREUR ── */}
        <div style={{
          border: "2px dashed black",
          borderRadius: "3mm",
          padding: "3mm",
          minHeight: "28mm",
          marginBottom: "4mm",
        }}>
          <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "2mm" }}>
            Zone saisie livreur
          </p>
          {courierRemarks ? (
            <p style={{ fontSize: "8pt", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{courierRemarks}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5mm" }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ borderBottom: "0.5px solid #bbb", width: "100%" }} />
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: "1px solid black", paddingTop: "2mm", display: "flex", justifyContent: "space-between", fontSize: "6.5pt", color: "#777" }}>
          <span>{CONTACT.businessName} · {CONTACT.phone}</span>
          <span>Signature livreur : _____________</span>
        </div>
      </div>
    </>
  );
}
