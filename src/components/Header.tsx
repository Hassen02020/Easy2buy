"use client";

/**
 * Header.tsx — Mobile-First sticky header
 * ─────────────────────────────────────────
 * Mobile  : Logo | Search icon | Cart badge | Hamburger
 * Desktop : Logo | Nav links | Lang switcher | Socials | Cart
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, ShoppingCart, Menu, X, Search,
  PackageSearch, Phone, ChevronRight,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { CONTACT } from "@/lib/contact";
import { t, type Lang } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// SVG réseaux sociaux (inline pour performance — pas d'import image)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeaderProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  onScrollCatalogue?: () => void;
  onScrollOrder?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Header({ lang, setLang, onScrollCatalogue, onScrollOrder }: HeaderProps) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ,    setSearchQ]    = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { toggleCart, totalItems } = useCartStore();
  const [mounted, setMounted]      = useState(false);
  useEffect(() => setMounted(true), []);
  const itemCount = mounted ? totalItems() : 0;

  const tr = t[lang];

  // Ouvre la recherche et focus l'input
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  // Ferme le menu en cas de navigation
  const handleNavClick = useCallback((cb?: () => void) => {
    setMenuOpen(false);
    cb?.();
  }, []);

  // Ferme le menu sur ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setSearchOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bloque le scroll body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HEADER BAR                                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-forest-100 shadow-sm"
        role="banner"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2">

          {/* ── Logo ────────────────────────────────────────────────────── */}
          <a
            href="/"
            className="flex items-center gap-1.5 font-extrabold text-forest-800 text-lg shrink-0"
            aria-label="Easy2Buy — Accueil"
          >
            <Leaf size={20} className="text-forest-500" />
            <span>Easy2Buy</span>
          </a>

          {/* ── Desktop nav (md+) ───────────────────────────────────────── */}
          <nav
            className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600"
            aria-label="Navigation principale"
          >
            <button
              onClick={() => handleNavClick(onScrollCatalogue)}
              className="hover:text-forest-700 transition-colors py-1"
            >
              {tr.nav.catalogue}
            </button>
            <button
              onClick={() => handleNavClick(onScrollOrder)}
              className="hover:text-forest-700 transition-colors py-1"
            >
              {tr.nav.order}
            </button>
            <a
              href="/suivi"
              className="flex items-center gap-1.5 text-forest-600 hover:text-forest-800 font-semibold transition-colors"
            >
              <PackageSearch size={15} /> {tr.nav.track}
            </a>
            <a
              href={`tel:${CONTACT.phone}`}
              className="flex items-center gap-1.5 text-gray-600 hover:text-forest-700 transition-colors"
            >
              <Phone size={14} /> {CONTACT.phone}
            </a>

            {/* Lang switcher */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
              {(["fr", "ar"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  title={l === "fr" ? "Français" : "العربية"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    lang === l
                      ? "bg-white text-forest-700 shadow scale-105"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <span>{l === "fr" ? "🇫🇷" : "🇹🇳"}</span>
                  <span>{l.toUpperCase()}</span>
                </button>
              ))}
            </div>

            {/* Socials */}
            <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer"
              aria-label="Facebook Easy2Buy" className="hover:text-blue-600 transition-colors text-gray-500">
              {FB_SVG}
            </a>
            <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"
              aria-label="Instagram Easy2Buy" className="hover:text-pink-600 transition-colors text-gray-500">
              {IG_SVG}
            </a>
          </nav>

          {/* ── Right icons ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-1">

            {/* Search toggle */}
            <button
              onClick={searchOpen ? () => setSearchOpen(false) : openSearch}
              className="p-2.5 rounded-xl hover:bg-forest-50 transition-colors text-gray-600"
              aria-label={searchOpen ? "Fermer la recherche" : "Rechercher"}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative p-2.5 rounded-xl hover:bg-forest-50 transition-colors"
              aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ""}`}
            >
              <ShoppingCart size={20} className="text-forest-700" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 bg-forest-600 text-white text-[10px] font-extrabold rounded-full min-w-[18px] min-h-[18px] flex items-center justify-center px-0.5"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2.5 rounded-xl hover:bg-forest-50 transition-colors text-gray-700"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── Search bar slide-down ──────────────────────────────────────── */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="searchbar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gray-100 bg-white"
            >
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Rechercher une plante…"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  aria-label="Rechercher une plante"
                />
                {searchQ && (
                  <button
                    onClick={() => setSearchQ("")}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Effacer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE-OVER MENU MOBILE                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.nav
              key="drawer"
              id="mobile-menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-40 w-72 bg-white shadow-2xl flex flex-col"
              aria-label="Menu mobile"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="flex items-center gap-1.5 font-extrabold text-forest-800 text-base">
                  <Leaf size={18} className="text-forest-500" /> Easy2Buy
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Nav links */}
              <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                {[
                  { label: tr.nav.catalogue, onClick: () => handleNavClick(onScrollCatalogue), icon: <Leaf size={18} /> },
                  { label: tr.nav.order,     onClick: () => handleNavClick(onScrollOrder),     icon: <ShoppingCart size={18} /> },
                  { label: tr.nav.track,     href: "/suivi",                                   icon: <PackageSearch size={18} /> },
                  { label: CONTACT.phone,    href: `tel:${CONTACT.phone}`,                     icon: <Phone size={18} /> },
                ].map(({ label, onClick, href, icon }) => {
                  const cls = "flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-forest-50 hover:text-forest-700 transition-colors text-left min-h-[44px]";
                  return href ? (
                    <a key={label} href={href} className={cls} onClick={() => setMenuOpen(false)}>
                      <span className="text-forest-500">{icon}</span>
                      <span className="flex-1">{label}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </a>
                  ) : (
                    <button key={label} onClick={onClick} className={cls}>
                      <span className="text-forest-500">{icon}</span>
                      <span className="flex-1">{label}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  );
                })}
              </div>

              {/* Lang switcher mobile */}
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Langue</p>
                <div className="flex gap-2">
                  {(["fr", "ar"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setMenuOpen(false); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all min-h-[44px] ${
                        lang === l
                          ? "bg-forest-600 text-white border-forest-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-forest-300"
                      }`}
                    >
                      <span>{l === "fr" ? "🇫🇷" : "🇹🇳"}</span>
                      <span>{l === "fr" ? "Français" : "العربية"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Socials mobile */}
              <div className="px-4 py-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Suivez-nous</p>
                <div className="flex gap-3 px-1">
                  <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    aria-label="Facebook">
                    {FB_SVG} Facebook
                  </a>
                  <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition-colors"
                    aria-label="Instagram">
                    {IG_SVG} Instagram
                  </a>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
