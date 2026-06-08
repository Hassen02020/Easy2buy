"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShoppingCart, Sun, Droplets, Thermometer, Wrench,
  MapPin, PlayCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types/product";

interface Props {
  product: Product;
  allProducts?: Product[];
  onClose: () => void;
}

const ZONE_LABELS: Record<string, string> = {
  nord:      "🟢 Nord",
  sahel:     "🟡 Sahel",
  cotiere:   "🔵 Côtière",
  interieur: "🟠 Intérieur",
  sud:       "🔴 Sud",
};

const CARE_COLORS: Record<string, string> = {
  facile: "bg-green-100 text-green-700",
  moyen:  "bg-amber-100 text-amber-700",
  expert: "bg-red-100 text-red-700",
};

function getVideoEmbed(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1`;
  return null;
}

export function ProductDetailModal({ product, allProducts = [], onClose }: Props) {
  const addItem = useCartStore(s => s.addItem);
  const allImages = product.images?.length ? product.images : product.image ? [product.image] : [];
  const [imgIdx, setImgIdx]     = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  const videoUrl = product.videoUrl ?? product.video;
  const embedUrl = videoUrl ? getVideoEmbed(videoUrl) : null;

  const suggested = allProducts.filter(p =>
    product.suggestedProductIds?.includes(Number(p.id))
  );

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.image });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white shadow rounded-full p-2 transition-colors">
            <X size={18} />
          </button>

          {/* Galerie */}
          <div className="relative w-full h-64 sm:h-80 bg-forest-50 overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
            {showVideo && embedUrl ? (
              <iframe src={embedUrl} className="w-full h-full" allow="autoplay" allowFullScreen />
            ) : showVideo && videoUrl ? (
              <video src={videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : allImages[imgIdx] ? (
              <Image src={allImages[imgIdx]} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl">🌿</div>
            )}

            {/* Nav galerie */}
            {allImages.length > 1 && !showVideo && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow transition-colors">
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, i) => (
                    <button key={i} onClick={() => { setImgIdx(i); setShowVideo(false); }}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? "bg-white" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}

            {/* Bouton vidéo */}
            {videoUrl && (
              <button onClick={() => setShowVideo(v => !v)}
                className={`absolute bottom-3 right-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow transition-colors
                  ${showVideo ? "bg-red-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                <PlayCircle size={14} />
                {showVideo ? "Fermer vidéo" : "Voir vidéo"}
              </button>
            )}
          </div>

          {/* Vignettes */}
          {allImages.length > 1 && (
            <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
              {allImages.map((url, i) => (
                <button key={i} onClick={() => { setImgIdx(i); setShowVideo(false); }}
                  className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors
                    ${i === imgIdx && !showVideo ? "border-forest-500" : "border-transparent"}`}>
                  <Image src={url} alt="" width={48} height={48} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 space-y-5">
            {/* Nom + prix */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">{product.name}</h2>
                {product.badge && (
                  <span className="inline-block mt-1 text-xs bg-forest-100 text-forest-700 font-semibold px-2 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-extrabold text-forest-700">{product.price.toFixed(3)}</p>
                <p className="text-xs text-gray-400 font-medium">TND</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {/* Infos plante */}
            {(product.lightNeeds || product.waterNeeds || product.tempRange || product.careDifficulty) && (
              <div className="bg-forest-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-forest-700 uppercase tracking-wide">🌱 Besoins de la plante</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {product.lightNeeds && (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                      <Sun size={15} className="text-amber-500 shrink-0" />
                      <span className="text-gray-700 capitalize">{product.lightNeeds}</span>
                    </div>
                  )}
                  {product.waterNeeds && (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                      <Droplets size={15} className="text-blue-500 shrink-0" />
                      <span className="text-gray-700 capitalize">{product.waterNeeds}</span>
                    </div>
                  )}
                  {product.tempRange && (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                      <Thermometer size={15} className="text-red-400 shrink-0" />
                      <span className="text-gray-700">{product.tempRange}</span>
                    </div>
                  )}
                  {product.careDifficulty && (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                      <Wrench size={15} className="text-gray-400 shrink-0" />
                      <span className={`capitalize text-xs font-bold px-2 py-0.5 rounded-full ${CARE_COLORS[product.careDifficulty] ?? "bg-gray-100 text-gray-600"}`}>
                        {product.careDifficulty}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Zones climatiques */}
            {product.climaticZones && product.climaticZones.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin size={13} /> Zones compatibles en Tunisie
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.climaticZones.map(z => (
                    <span key={z} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
                      {ZONE_LABELS[z] ?? z}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ajouter au panier */}
            <button
              onClick={handleAdd}
              disabled={!product.inStock}
              className="w-full flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl transition-colors text-base"
            >
              <ShoppingCart size={18} />
              {product.inStock ? "Ajouter au panier" : "Rupture de stock"}
            </button>

            {/* Suggestions */}
            {suggested.length > 0 && (
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">💡 On vous recommande aussi</h3>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {suggested.map(s => (
                    <div key={s.id} className="shrink-0 w-32 rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
                      <div className="h-20 relative bg-forest-50">
                        {s.image ? (
                          <Image src={s.image} alt={s.name} fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl">🌿</div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-forest-700 font-bold">{s.price.toFixed(3)} TND</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
