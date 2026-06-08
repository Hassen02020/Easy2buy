"use client";

/**
 * BottomNav.tsx — Bottom Navigation Bar (mobile only)
 * ─────────────────────────────────────────────────────
 * 4 onglets fixes en bas : Accueil | Boutique | Panier | Suivi
 * Masqué sur md+ (tablette/desktop).
 * Touch targets ≥ 44px conformément aux WCAG 2.5.5.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Leaf, ShoppingCart, PackageSearch } from "lucide-react";
import { useCartStore } from "@/store/cart";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BottomNavProps {
  /** Callback déclenché quand l'onglet "Boutique" est pressé */
  onShopPress?: () => void;
  /** Callback déclenché quand l'onglet "Commander" est pressé */
  onOrderPress?: () => void;
}

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

type TabId = "home" | "shop" | "cart" | "track";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BottomNav({ onShopPress, onOrderPress }: BottomNavProps) {
  const [active, setActive]   = useState<TabId>("home");
  const [mounted, setMounted] = useState(false);

  const { toggleCart, totalItems } = useCartStore();
  useEffect(() => setMounted(true), []);
  const itemCount = mounted ? totalItems() : 0;

  // Sync l'onglet actif avec l'URL (pour /suivi)
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/suivi")) setActive("track");
      else setActive("home");
    }
  }, []);

  const handleTab = (id: TabId) => {
    setActive(id);
    if (id === "shop")  { onShopPress?.(); return; }
    if (id === "cart")  { toggleCart();    return; }
    if (id === "track") { window.location.href = "/suivi"; return; }
    if (id === "home")  { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  };

  const tabs: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "home",
      label: "Accueil",
      icon: <Home size={22} />,
    },
    {
      id: "shop",
      label: "Boutique",
      icon: <Leaf size={22} />,
    },
    {
      id: "cart",
      label: "Panier",
      icon: <ShoppingCart size={22} />,
      badge: itemCount > 0 ? itemCount : undefined,
    },
    {
      id: "track",
      label: "Suivi",
      icon: <PackageSearch size={22} />,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      aria-label="Navigation principale mobile"
      role="navigation"
    >
      {/* Safe area pour les téléphones avec encoche bas (iPhone home bar) */}
      <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map((tab) => {
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]
                transition-colors relative select-none
                ${isActive ? "text-forest-600" : "text-gray-400 hover:text-gray-600"}
              `}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Indicateur actif */}
              {isActive && (
                <motion.span
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-forest-500 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}

              {/* Icône + badge panier */}
              <span className="relative">
                <motion.span
                  animate={isActive ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="block"
                >
                  {tab.icon}
                </motion.span>

                <AnimatePresence>
                  {tab.badge !== undefined && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-2 bg-forest-600 text-white text-[10px] font-extrabold rounded-full min-w-[16px] min-h-[16px] flex items-center justify-center px-0.5 leading-none"
                    >
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>

              {/* Label */}
              <span className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? "text-forest-600" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
