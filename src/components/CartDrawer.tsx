"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag, Leaf, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { products } from "@/data/products";

interface CartDrawerProps {
  onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, addItem } =
    useCartStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const total = totalPrice();

  // Produits suggérés : exclure ceux déjà dans le panier, max 4
  const cartIds = new Set(items.map((i) => i.id));
  const suggestions = products
    .filter((p) => !cartIds.has(String(p.id)))
    .slice(0, 4);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeCart}
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            aria-label="Panier"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-forest-600" />
                <h2 className="font-bold text-gray-900 text-lg">
                  Votre panier
                </h2>
                {items.length > 0 && (
                  <span className="bg-forest-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Fermer le panier"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 py-20">
                  <Leaf size={48} className="text-forest-200" />
                  <p className="text-center text-sm">
                    Votre panier est vide.
                    <br />
                    Ajoutez de belles plantes !
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ duration: 0.22 }}
                      className="flex gap-3 bg-cream-50 rounded-2xl p-3 border border-forest-100 relative group"
                    >
                      {/* ── Bouton suppression VISIBLE coin haut-droit ── */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
                        aria-label={`Supprimer ${item.name}`}
                      >
                        <X size={12} />
                      </button>

                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate pr-2">
                          {item.name}
                        </p>
                        <p className="text-forest-700 font-bold text-sm mt-0.5">
                          {(item.price * item.quantity).toFixed(3)} TND
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-forest-50 transition-colors"
                            aria-label="Diminuer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-forest-50 transition-colors"
                            aria-label="Augmenter"
                          >
                            <Plus size={12} />
                          </button>
                          {/* Bouton Trash secondaire inline */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={12} />
                            <span>Retirer</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* ── BANNIÈRE "Complétez vos achats" ── */}
              {suggestions.length > 0 && (
                <div className="mt-4 rounded-2xl border border-forest-100 bg-forest-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                    <Sparkles size={14} className="text-forest-500" />
                    <p className="text-xs font-bold text-forest-700 uppercase tracking-wide">
                      Complétez vos achats
                    </p>
                  </div>
                  <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
                    {suggestions.map((p) => (
                        <button
                          key={p.id}
                          onClick={() =>
                            addItem({
                              id: String(p.id),
                              name: p.name,
                              price: p.price,
                              image: p.image,
                            })
                          }
                          className="flex-shrink-0 w-24 flex flex-col items-center gap-1.5 bg-white rounded-xl p-2 border border-forest-100 hover:border-forest-400 hover:shadow-sm transition-all group"
                          aria-label={`Ajouter ${p.name}`}
                        >
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden">
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="56px"
                            />
                          </div>
                          <p className="text-[10px] font-semibold text-gray-700 text-center leading-tight line-clamp-2">
                            {p.name}
                          </p>
                          <span className="text-[10px] font-bold text-forest-600">
                            {p.price.toFixed(3)} TND
                          </span>
                          <span className="text-[10px] bg-forest-600 text-white rounded-full px-2 py-0.5 font-bold group-hover:bg-forest-700 transition-colors">
                            + Ajouter
                          </span>
                        </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <footer className="px-5 py-4 border-t border-gray-100 space-y-3 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Total</span>
                  <span className="text-2xl font-extrabold text-forest-800">
                    {total.toFixed(3)} TND
                  </span>
                </div>
                <button
                  onClick={() => {
                    closeCart();
                    onCheckout();
                  }}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
                >
                  Commander maintenant
                </button>
                <p className="text-center text-xs text-gray-400">
                  Livraison calculée à l&apos;étape suivante
                </p>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
