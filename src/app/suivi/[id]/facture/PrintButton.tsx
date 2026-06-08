"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <div className="print:hidden fixed top-4 right-4 z-50">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-colors text-sm"
      >
        <Printer size={16} /> Imprimer / Enregistrer PDF
      </button>
    </div>
  );
}
