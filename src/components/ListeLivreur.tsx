"use client";

/**
 * ListeLivreur.tsx
 * -----------------
 * Feuille de route imprimable A4 à remettre au livreur.
 * Déclenche window.print() — CSS print affiche uniquement #liste-livreur-root.
 */

import { CONTACT } from "@/lib/contact";

interface LivreurOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  total: string | number;
  remainingAmount: string | number;
  paymentMethod: string;
  deliveryNotes?: string | null;
  status: string;
}

interface ListeLivreurProps {
  livreurName: string;
  date?: string;
  orders: LivreurOrder[];
}

const PAY: Record<string, string> = {
  CASH_ON_DELIVERY: "Espèces livraison",
  D17:              "D17",
  FLOUCI:           "Flouci",
  ONLINE:           "Carte en ligne",
  BANK_TRANSFER:    "Virement",
};

const fmt = (n: string | number | null | undefined) =>
  parseFloat(String(n ?? 0)).toFixed(3) + " TND";

export function ListeLivreur({ livreurName, date, orders }: ListeLivreurProps) {
  const totalARemettre = orders.reduce(
    (s, o) => s + parseFloat(String(o.remainingAmount ?? 0)), 0
  );
  const dateStr = date ?? new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <>
      <button
        onClick={() => window.print()}
        className="no-print flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
      >
        🖨️ Imprimer Liste Livreur
      </button>

      <div
        id="liste-livreur-root"
        style={{ display: "none", width: "210mm", minHeight: "297mm", padding: "12mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "9pt", background: "white", color: "black" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #1a472a", paddingBottom: "5mm", marginBottom: "6mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4mm" }}>
            <img src="/logoeasy2buy.png" alt="Logo" style={{ height: "15mm", width: "auto", objectFit: "contain" }} />
            <div>
              <p style={{ fontSize: "15pt", fontWeight: "900", color: "#1a472a", margin: 0 }}>{CONTACT.businessName}</p>
              <p style={{ fontSize: "8pt", color: "#555", margin: "1mm 0 0" }}>{CONTACT.phone} · {CONTACT.phone2}</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "13pt", fontWeight: "bold", margin: 0 }}>FEUILLE DE ROUTE</p>
            <p style={{ fontSize: "9pt", margin: "1mm 0 0" }}>Livreur : <strong>{livreurName}</strong></p>
            <p style={{ fontSize: "8pt", color: "#555", margin: "1mm 0 0" }}>{dateStr}</p>
          </div>
        </div>

        {/* Résumé */}
        <div style={{ display: "flex", gap: "5mm", marginBottom: "6mm" }}>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "3mm", textAlign: "center" }}>
            <p style={{ fontSize: "7pt", color: "#555", margin: "0 0 1mm", textTransform: "uppercase" }}>Commandes</p>
            <p style={{ fontSize: "16pt", fontWeight: "900", margin: 0, color: "#1a472a" }}>{orders.length}</p>
          </div>
          <div style={{ flex: 2, border: "2px solid #1a472a", borderRadius: "3mm", padding: "3mm", textAlign: "center", backgroundColor: "#f0fdf4" }}>
            <p style={{ fontSize: "7pt", color: "#555", margin: "0 0 1mm", textTransform: "uppercase" }}>Total à encaisser</p>
            <p style={{ fontSize: "16pt", fontWeight: "900", margin: 0, color: "#1a472a" }}>{fmt(totalARemettre)}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "3mm", textAlign: "center" }}>
            <p style={{ fontSize: "7pt", color: "#555", margin: "0 0 1mm", textTransform: "uppercase" }}>Date</p>
            <p style={{ fontSize: "9pt", fontWeight: "bold", margin: 0 }}>{dateStr}</p>
          </div>
        </div>

        {/* Tableau des commandes */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", marginBottom: "6mm" }}>
          <thead>
            <tr style={{ backgroundColor: "#1a472a", color: "white" }}>
              <th style={{ padding: "2mm 2.5mm", textAlign: "left", fontWeight: "bold", width: "8mm" }}>#</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "left", fontWeight: "bold" }}>Client</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "left", fontWeight: "bold" }}>Téléphone</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "left", fontWeight: "bold" }}>Ville / Adresse</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "right", fontWeight: "bold" }}>Montant</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "center", fontWeight: "bold" }}>Paiement</th>
              <th style={{ padding: "2mm 2.5mm", textAlign: "center", fontWeight: "bold", width: "18mm" }}>Remis ✓</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} style={{ backgroundColor: i % 2 === 0 ? "#f9fafb" : "white", borderBottom: "0.5px solid #e5e7eb" }}>
                <td style={{ padding: "2mm 2.5mm", fontWeight: "bold", color: "#555" }}>#{o.id}</td>
                <td style={{ padding: "2mm 2.5mm", fontWeight: "bold" }}>
                  {o.customerName}
                  {o.deliveryNotes && (
                    <p style={{ fontSize: "7pt", color: "#6b7280", margin: "0.5mm 0 0", fontStyle: "italic" }}>
                      ℹ️ {o.deliveryNotes}
                    </p>
                  )}
                </td>
                <td style={{ padding: "2mm 2.5mm" }}>{o.customerPhone}</td>
                <td style={{ padding: "2mm 2.5mm" }}>
                  <strong>{o.customerCity}</strong>
                  {o.customerAddress && (
                    <p style={{ margin: "0.5mm 0 0", fontSize: "7pt", color: "#555" }}>{o.customerAddress}</p>
                  )}
                </td>
                <td style={{ padding: "2mm 2.5mm", textAlign: "right", fontWeight: "900", color: "#1a472a" }}>{fmt(o.remainingAmount)}</td>
                <td style={{ padding: "2mm 2.5mm", textAlign: "center", fontSize: "7pt" }}>{PAY[o.paymentMethod] ?? o.paymentMethod}</td>
                <td style={{ padding: "2mm 2.5mm", textAlign: "center" }}>
                  <div style={{ border: "1.5px solid #999", width: "12mm", height: "8mm", margin: "0 auto", borderRadius: "1mm" }} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #1a472a", backgroundColor: "#f0fdf4" }}>
              <td colSpan={4} style={{ padding: "2.5mm", fontWeight: "bold", textAlign: "right" }}>TOTAL À REMETTRE :</td>
              <td style={{ padding: "2.5mm", textAlign: "right", fontWeight: "900", fontSize: "11pt", color: "#1a472a" }}>{fmt(totalARemettre)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        {/* Zone signature livreur */}
        <div style={{ display: "flex", gap: "8mm", marginTop: "8mm" }}>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "3mm" }}>
            <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", color: "#555", margin: "0 0 8mm" }}>Signature livreur</p>
            <div style={{ borderTop: "1px solid #999" }} />
          </div>
          <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "3mm", padding: "3mm" }}>
            <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", color: "#555", margin: "0 0 8mm" }}>Cachet &amp; Signature responsable</p>
            <div style={{ borderTop: "1px solid #999" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "8mm", borderTop: "1px solid #e5e7eb", paddingTop: "3mm", display: "flex", justifyContent: "space-between", fontSize: "7pt", color: "#9ca3af" }}>
          <span>{CONTACT.businessName} · {CONTACT.phone}</span>
          <span>Document généré le {dateStr}</span>
        </div>
      </div>
    </>
  );
}
