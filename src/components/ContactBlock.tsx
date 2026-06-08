"use client";

import { Phone } from "lucide-react";
import { CONTACT, waLink, waOrderMessage } from "@/lib/contact";

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.523 5.83L.057 23.886a.5.5 0 00.611.61l6.083-1.464A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.671-.523-5.188-1.435l-.372-.22-3.853.928.942-3.814-.242-.38A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

const MSG_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.128 0 11.453c0 3.607 1.797 6.82 4.608 8.946V24l4.214-2.314A13.08 13.08 0 0012 21.907c6.627 0 12-5.128 12-11.454C24 5.128 18.627 0 12 0zm1.187 15.428l-3.05-3.253-5.955 3.253 6.554-6.962 3.123 3.253 5.883-3.253-6.555 6.962z" />
  </svg>
);

interface Props {
  items?: { name: string; quantity: number }[];
}

export function ContactBlock({ items = [] }: Props) {
  const cartSummary = items.length
    ? items.map(i => `• ${i.name} ×${i.quantity}`).join("\n")
    : undefined;
  const waMsg = waOrderMessage(cartSummary);

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
      <div className="text-center">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          📞 Vous préférez commander par téléphone ?
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Appelez-nous ou écrivez-nous, on s&apos;occupe de tout !
        </p>
      </div>

      {/* Appels */}
      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${CONTACT.whatsapp}`}
          className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl transition-colors text-xs">
          <Phone size={15} /> {CONTACT.phone}
        </a>
        <a href={`tel:${CONTACT.whatsapp2}`}
          className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl transition-colors text-xs">
          <Phone size={15} /> {CONTACT.phone2}
        </a>
      </div>

      {/* WhatsApp ×2 + Messenger */}
      <div className="grid grid-cols-3 gap-2">
        <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold py-2.5 rounded-xl transition-colors text-center">
          {WA_SVG}
          <span className="text-xs">{CONTACT.phone}</span>
        </a>
        <a href={`https://wa.me/${CONTACT.whatsapp2}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold py-2.5 rounded-xl transition-colors text-center">
          {WA_SVG}
          <span className="text-xs">{CONTACT.phone2}</span>
        </a>
        <a href={CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold py-2.5 rounded-xl transition-colors text-center">
          {MSG_SVG}
          <span className="text-xs">Messenger</span>
        </a>
      </div>
    </div>
  );
}
