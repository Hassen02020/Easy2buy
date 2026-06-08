"use client";

/**
 * Footer.tsx — Mobile-First footer
 * ──────────────────────────────────
 * Mobile  : 2 colonnes liens rapides + CTA WhatsApp / Appeler plein largeur
 * Desktop : 3 colonnes (Marque | Contact | Réseaux)
 */

import { Phone, Leaf, PackageSearch, Home, BookOpen } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { t, type Lang } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.523 5.83L.057 23.886a.5.5 0 00.611.61l6.083-1.464A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.671-.523-5.188-1.435l-.372-.22-3.853.928.942-3.814-.242-.38A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

const FB_SVG = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.258h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const IG_SVG = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const MSG_SVG = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.128 0 11.453c0 3.607 1.797 6.82 4.608 8.946V24l4.214-2.314A13.08 13.08 0 0012 21.907c6.627 0 12-5.128 12-11.454C24 5.128 18.627 0 12 0zm1.187 15.428l-3.05-3.253-5.955 3.253 6.554-6.962 3.123 3.253 5.883-3.253-6.555 6.962z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FooterProps {
  lang: Lang;
  onScrollCatalogue?: () => void;
  onScrollOrder?: () => void;
}

// ---------------------------------------------------------------------------
// WA message
// ---------------------------------------------------------------------------

const WA_MSG = encodeURIComponent("Bonjour 🌿 Je souhaite passer une commande Easy2Buy.");

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Footer({ lang, onScrollCatalogue, onScrollOrder }: FooterProps) {
  const tr = t[lang];

  return (
    <footer className="bg-forest-950 text-white/70 text-sm" role="contentinfo">

      {/* ── CTA Mobile bande verte ── */}
      <div className="bg-forest-700 md:hidden">
        <div className="grid grid-cols-2 divide-x divide-forest-600">
          <a
            href={`https://wa.me/${CONTACT.whatsapp}?text=${WA_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 font-bold text-white hover:bg-forest-600 transition-colors min-h-[56px]"
            aria-label="Nous contacter sur WhatsApp"
          >
            {WA_SVG}
            <span>WhatsApp</span>
          </a>
          <a
            href={`tel:${CONTACT.phone}`}
            className="flex items-center justify-center gap-2 py-4 font-bold text-white hover:bg-forest-600 transition-colors min-h-[56px]"
            aria-label={`Appeler le ${CONTACT.phone}`}
          >
            <Phone size={18} />
            <span>Appeler</span>
          </a>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Mobile : 2 colonnes | Desktop : 3 colonnes */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">

          {/* Colonne 1 : Marque */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-white text-base">
              <Leaf size={18} className="text-forest-400" />
              Easy2Buy
            </div>
            <p className="text-xs text-white/50 leading-relaxed max-w-xs">
              {lang === "ar"
                ? "نباتات طبيعية توصل لباب منزلك في تونس."
                : "Plantes vivantes livrées à domicile en Tunisie."}
            </p>
            {/* CTA desktop WhatsApp */}
            <a
              href={`https://wa.me/${CONTACT.whatsapp}?text=${WA_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-xs mt-2"
              aria-label="Commander sur WhatsApp"
            >
              {WA_SVG}
              Commander sur WhatsApp
            </a>
          </div>

          {/* Colonne 2 : Liens rapides */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">
              {lang === "ar" ? "روابط سريعة" : "Liens rapides"}
            </p>
            <nav aria-label="Liens rapides footer">
              <ul className="space-y-2">
                {[
                  { label: lang === "ar" ? "الرئيسية" : "Accueil",           href: "/",       icon: <Home size={13} /> },
                  { label: tr.nav.catalogue,                                  onClick: onScrollCatalogue, icon: <BookOpen size={13} /> },
                  { label: tr.nav.track,                                      href: "/suivi",  icon: <PackageSearch size={13} /> },
                  { label: lang === "ar" ? "اطلب الآن" : "Commander",        onClick: onScrollOrder,    icon: <Leaf size={13} /> },
                ].map(({ label, href, onClick, icon }) => (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors py-1 min-h-[36px]"
                      >
                        <span className="text-forest-400">{icon}</span>
                        {label}
                      </a>
                    ) : (
                      <button
                        onClick={onClick}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors py-1 min-h-[36px] text-left"
                      >
                        <span className="text-forest-400">{icon}</span>
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Colonne 3 : Contact + Réseaux */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">
              {tr.footer.contact}
            </p>
            <a
              href={`tel:${CONTACT.phone}`}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors py-1 min-h-[36px]"
            >
              <Phone size={13} className="text-forest-400" /> {CONTACT.phone}
            </a>
            <a
              href={`tel:${CONTACT.phone2}`}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors py-1 min-h-[36px]"
            >
              <Phone size={13} className="text-forest-400" /> {CONTACT.phone2}
            </a>

            <p className="text-xs font-bold text-white uppercase tracking-wide mt-4 mb-2">
              {tr.footer.follow}
            </p>
            <div className="flex gap-3">
              <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer"
                aria-label="Facebook" className="flex items-center gap-1.5 text-white/60 hover:text-blue-400 transition-colors min-h-[36px]">
                {FB_SVG} <span className="text-xs">Facebook</span>
              </a>
              <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"
                aria-label="Instagram" className="flex items-center gap-1.5 text-white/60 hover:text-pink-400 transition-colors min-h-[36px]">
                {IG_SVG} <span className="text-xs">Instagram</span>
              </a>
              <a href={CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer"
                aria-label="Messenger" className="flex items-center gap-1.5 text-white/60 hover:text-indigo-400 transition-colors min-h-[36px]">
                {MSG_SVG} <span className="text-xs">Messenger</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <span>&copy; {new Date().getFullYear()} Easy2Buy Tunisia. {tr.footer.rights}</span>
          <span className="text-forest-600 font-semibold">Simple. Fast. Shopping.</span>
        </div>
      </div>

      {/* Spacer pour la BottomNav mobile */}
      <div className="md:hidden h-16" aria-hidden="true" />
    </footer>
  );
}
