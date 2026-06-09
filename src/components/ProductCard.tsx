"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, Star, PlayCircle, Info } from "lucide-react";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types/product";

const ProductDetailModal = lazy(() =>
  import("@/components/ProductDetailModal").then(m => ({ default: m.ProductDetailModal }))
);

interface ProductCardProps {
  product: Product;
  allProducts?: Product[];
  index?: number;
  lang?: "fr" | "ar";
}

const ZONE_SHORT: Record<string, string> = {
  nord: "Nord", sahel: "Sahel", cotiere: "Côte", interieur: "Int.", sud: "Sud",
};

export function ProductCard({ product, allProducts = [], index = 0, lang = "fr" }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [showDetail, setShowDetail] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image });
  };

  const hasVideo = !!(product.videoUrl ?? product.video);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.07 }}
        className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 border border-forest-100 cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 bg-forest-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {product.badge}
          </span>
        )}
        {hasVideo && (
          <span className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full">
            <PlayCircle size={11} /> Vidéo
          </span>
        )}

        <div className="relative h-60 w-full overflow-hidden bg-forest-50">
          {product.video && !product.videoUrl ? (
            <video
              src={product.video}
              className="w-full h-full object-cover"
              autoPlay muted loop playsInline preload="none"
            />
          ) : (
            <Image
              src={product.images?.[0] ?? product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {/* Bouton détail */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">
              <Info size={12} /> Voir détails
            </span>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 leading-tight">{lang === "ar" && product.nameAr ? product.nameAr : product.name}</h3>
            <span className="shrink-0 text-lg font-bold text-forest-700">
              {product.price.toFixed(3)} <span className="text-xs font-medium">TND</span>
            </span>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 flex-1">{product.description}</p>

          {/* Infos rapides */}
          <div className="flex flex-wrap gap-1">
            {product.lightNeeds && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                ☀️ {product.lightNeeds}
              </span>
            )}
            {product.waterNeeds && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                💧 {product.waterNeeds}
              </span>
            )}
            {product.careDifficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${product.careDifficulty === "facile" ? "bg-green-50 text-green-700"
                : product.careDifficulty === "moyen" ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"}`}>
                🛠️ {product.careDifficulty}
              </span>
            )}
          </div>

          {/* Zones */}
          {product.climaticZones && product.climaticZones.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.climaticZones.map(z => (
                <span key={z} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {ZONE_SHORT[z] ?? z}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 text-amber-400 text-sm">
            <Star size={14} fill="currentColor" />
            <span className="text-gray-700 font-medium">{product.rating}</span>
            <span className="text-gray-400">({product.reviews})</span>
          </div>

          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className="mt-1 flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-gray-300 text-white rounded-xl py-2.5 px-4 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
          >
            <ShoppingCart size={16} />
            {product.inStock ? (lang === "ar" ? "أضف للسلة" : "Ajouter au panier") : (lang === "ar" ? "غير متوفر" : "Rupture de stock")}
          </button>
        </div>
      </motion.article>

      {showDetail && (
        <Suspense fallback={null}>
          <ProductDetailModal
            product={product}
            allProducts={allProducts}
            onClose={() => setShowDetail(false)}
          />
        </Suspense>
      )}
    </>
  );
}
