"use client";

/**
 * InvoicePDF.tsx
 * Facture imprimable format A4 — déclenche window.print()
 * Le CSS print masque tout sauf #invoice-root
 */

import { CONTACT } from "@/lib/contact";

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
}

interface InvoicePDFProps {
  orderId: number;
  createdAt: Date | string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: string | number;
  deliveryFee: string | number;
  total: string | number;
  advanceAmount: string | number;
  remainingAmount: string | number;
  paymentMethod: string;
  paymentStatus: string;
  deliveredByName?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Espèces à la livraison",
  D17:              "D17",
  FLOUCI:           "Flouci",
  ONLINE:           "Carte en ligne",
  BANK_TRANSFER:    "Virement bancaire",
};

const PAY_STATUS: Record<string, string> = {
  UNPAID:       "Non payée",
  PARTIAL_PAID: "Avance reçue",
  FULLY_PAID:   "Intégralement payée",
  REFUNDED:     "Remboursée",
};

const fmt = (n: string | number) => parseFloat(String(n ?? 0)).toFixed(3) + " TND";

export function InvoicePDF(props: InvoicePDFProps) {
  const {
    orderId, createdAt, customerName, customerPhone,
    customerCity, customerAddress, items,
    subtotal, deliveryFee, total, advanceAmount, remainingAmount,
    paymentMethod, paymentStatus, deliveredByName,
  } = props;

  const dateStr = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <>
      <button
        onClick={() => window.print()}
        className="no-print flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
      >
        🧾 Imprimer Facture
      </button>

      <div
        id="invoice-root"
        style={{ display: "none", width: "210mm", minHeight: "297mm", padding: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "10pt", background: "white", color: "black" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10mm", borderBottom: "3px solid #1a472a", paddingBottom: "6mm" }}>
          <div>
            <p style={{ fontSize: "18pt", fontWeight: "900", color: "#1a472a", margin: 0 }}>{CONTACT.businessName}</p>
            <p style={{ margin: "2mm 0 0", fontSize: "9pt", color: "#555" }}>{CONTACT.phone} · {CONTACT.phone2}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "16pt", fontWeight: "bold", margin: 0 }}>FACTURE</p>
            <p style={{ margin: "1mm 0 0", fontSize: "10pt" }}>N° <strong>FAC-{String(orderId).padStart(6, "0")}</strong></p>
            <p style={{ margin: "1mm 0 0", fontSize: "9pt", color: "#555" }}>Date : {dateStr}</p>
          </div>
        </div>

        {/* Client */}
        <div style={{ display: "flex", gap: "10mm", marginBottom: "8mm" }}>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "4mm" }}>
            <p style={{ fontWeight: "bold", fontSize: "8pt", textTransform: "uppercase", color: "#555", margin: "0 0 2mm" }}>Vendu par</p>
            <p style={{ fontWeight: "bold", margin: 0 }}>{CONTACT.businessName}</p>
            <p style={{ margin: "1mm 0 0", color: "#555" }}>{CONTACT.phone}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "4mm" }}>
            <p style={{ fontWeight: "bold", fontSize: "8pt", textTransform: "uppercase", color: "#555", margin: "0 0 2mm" }}>Facturé à</p>
            <p style={{ fontWeight: "bold", margin: 0 }}>{customerName}</p>
            <p style={{ margin: "1mm 0 0" }}>{customerPhone}</p>
            <p style={{ margin: "1mm 0 0", color: "#555" }}>{customerCity} — {customerAddress}</p>
          </div>
        </div>

        {/* Articles */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm", fontSize: "9pt" }}>
          <thead>
            <tr style={{ backgroundColor: "#1a472a", color: "white" }}>
              <th style={{ padding: "2mm 3mm", textAlign: "left", fontWeight: "bold" }}>Désignation</th>
              <th style={{ padding: "2mm 3mm", textAlign: "center", fontWeight: "bold" }}>Qté</th>
              <th style={{ padding: "2mm 3mm", textAlign: "right", fontWeight: "bold" }}>Prix unit. (TND)</th>
              <th style={{ padding: "2mm 3mm", textAlign: "right", fontWeight: "bold" }}>Total (TND)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "white" }}>
                <td style={{ padding: "2mm 3mm", borderBottom: "0.5px solid #ddd" }}>{item.productName}</td>
                <td style={{ padding: "2mm 3mm", borderBottom: "0.5px solid #ddd", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "2mm 3mm", borderBottom: "0.5px solid #ddd", textAlign: "right" }}>{parseFloat(String(item.unitPrice)).toFixed(3)}</td>
                <td style={{ padding: "2mm 3mm", borderBottom: "0.5px solid #ddd", textAlign: "right", fontWeight: "bold" }}>{parseFloat(String(item.lineTotal)).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8mm" }}>
          <table style={{ fontSize: "10pt", borderCollapse: "collapse", minWidth: "80mm" }}>
            <tbody>
              <tr>
                <td style={{ padding: "1.5mm 3mm", color: "#555" }}>Sous-total</td>
                <td style={{ padding: "1.5mm 3mm", textAlign: "right" }}>{fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: "1.5mm 3mm", color: "#555" }}>Frais de livraison</td>
                <td style={{ padding: "1.5mm 3mm", textAlign: "right" }}>{fmt(deliveryFee)}</td>
              </tr>
              {parseFloat(String(advanceAmount)) > 0 && (
                <tr>
                  <td style={{ padding: "1.5mm 3mm", color: "#555" }}>Avance reçue</td>
                  <td style={{ padding: "1.5mm 3mm", textAlign: "right", color: "#16a34a" }}>- {fmt(advanceAmount)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid #1a472a" }}>
                <td style={{ padding: "2mm 3mm", fontWeight: "900", fontSize: "12pt", color: "#1a472a" }}>TOTAL À PAYER</td>
                <td style={{ padding: "2mm 3mm", textAlign: "right", fontWeight: "900", fontSize: "12pt", color: "#1a472a" }}>{fmt(parseFloat(String(remainingAmount)) > 0 ? remainingAmount : total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Paiement */}
        <div style={{ border: "1px solid #ccc", borderRadius: "3mm", padding: "4mm", marginBottom: "8mm", display: "flex", gap: "8mm" }}>
          <div>
            <p style={{ fontWeight: "bold", fontSize: "8pt", textTransform: "uppercase", color: "#555", margin: "0 0 1mm" }}>Mode de paiement</p>
            <p style={{ margin: 0 }}>{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</p>
          </div>
          <div>
            <p style={{ fontWeight: "bold", fontSize: "8pt", textTransform: "uppercase", color: "#555", margin: "0 0 1mm" }}>Statut</p>
            <p style={{ margin: 0, fontWeight: "bold" }}>{PAY_STATUS[paymentStatus] ?? paymentStatus}</p>
          </div>
          {deliveredByName && (
            <div>
              <p style={{ fontWeight: "bold", fontSize: "8pt", textTransform: "uppercase", color: "#555", margin: "0 0 1mm" }}>Livreur</p>
              <p style={{ margin: 0 }}>{deliveredByName}</p>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15mm" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "8pt", color: "#555", margin: "0 0 10mm" }}>Signature client</p>
            <div style={{ borderTop: "1px solid black", width: "60mm" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "8pt", color: "#555", margin: "0 0 10mm" }}>Cachet &amp; Signature vendeur</p>
            <div style={{ borderTop: "1px solid black", width: "60mm" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "10mm", borderTop: "1px solid #ccc", paddingTop: "3mm", textAlign: "center", fontSize: "7.5pt", color: "#777" }}>
          <p style={{ margin: 0 }}>
            {CONTACT.businessName} · {CONTACT.phone} · Merci de votre confiance !
          </p>
        </div>
      </div>
    </>
  );
}
