"use client";

import { useRef, useState, useEffect, lazy, Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Leaf,
  Truck,
  ShieldCheck,
  Star,
  ShoppingCart,
  Phone,
  ChevronDown,
  Sprout,
  Sun,
  Droplets,
  PackageSearch,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { products, categories } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { CONTACT, waLink, waOrderMessage } from "@/lib/contact";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

const OrderForm = lazy(() => import("@/components/OrderForm").then(m => ({ default: m.OrderForm })));

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const orderRef = useRef<HTMLElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const { toggleCart, totalItems } = useCartStore();
  const { lang, setLang, isRtl } = useLang();
  const tr = t[lang];

  useEffect(() => { setMounted(true); }, []);

  const itemCount = mounted ? totalItems() : 0;

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={isRtl ? "font-sans" : ""}>
      <CartDrawer onCheckout={() => scrollTo(orderRef)} />

      {/* Floating Cart Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring" }}
        onClick={toggleCart}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white font-bold px-5 py-3.5 rounded-full shadow-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
        aria-label={tr.ariaCart}
      >
        <ShoppingCart size={20} />
        <span className="text-sm">{tr.cart.open}</span>
        {itemCount > 0 && (
          <span className="bg-white text-forest-700 text-xs font-extrabold rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </motion.button>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-forest-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-forest-800 text-xl">
            <Leaf size={22} className="text-forest-500" />
            Easy2Buy
          </div>
          <div className="hidden sm:flex items-center gap-5 text-sm font-medium text-gray-600">
            <button onClick={() => scrollTo(catalogRef)} className="hover:text-forest-700 transition-colors">{tr.nav.catalogue}</button>
            <button onClick={() => scrollTo(orderRef)} className="hover:text-forest-700 transition-colors">{tr.nav.order}</button>
            <a href="/suivi" className="flex items-center gap-1.5 text-forest-600 hover:text-forest-800 font-semibold transition-colors">
              <PackageSearch size={15} /> {tr.nav.track}
            </a>
            <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-forest-700 transition-colors">
              <Phone size={14} /> {CONTACT.phone}
            </a>
            {/* Switcher langue */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setLang("fr")}
                title="Français"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  lang === "fr"
                    ? "bg-white text-forest-700 shadow-md scale-105"
                    : "text-gray-400 hover:text-gray-700 hover:bg-white/60"
                }`}
              >
                <span className="text-base leading-none">🇫🇷</span>
                <span>FR</span>
              </button>
              <button
                onClick={() => setLang("ar")}
                title="العربية"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  lang === "ar"
                    ? "bg-white text-forest-700 shadow-md scale-105"
                    : "text-gray-400 hover:text-gray-700 hover:bg-white/60"
                }`}
              >
                <span className="text-base leading-none">🇹🇳</span>
                <span>AR</span>
              </button>
            </div>
            {/* Facebook */}
            <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook" className="hover:text-blue-600 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.258h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram" className="hover:text-pink-600 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>
          <button
            onClick={toggleCart}
            className="relative p-2 rounded-xl hover:bg-forest-50 transition-colors"
            aria-label="Panier"
          >
            <ShoppingCart size={22} className="text-forest-700" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-forest-600 text-white text-xs font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] min-w-[18px] min-h-[18px]">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-forest-600 text-white min-h-[90vh] flex items-center">
        {/* Slideshow arrière-plan jardins tunisiens */}
        {[
          "https://images.unsplash.com/photo-1490750967868-88df5691cc88?w=1600&q=80",  // jasmin
          "https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=1600&q=80",  // lavande
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1600&q=80",  // olivier
          "https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=1600&q=80",  // pêcher
          "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80",  // jardin
        ].map((src, i) => (
          <motion.div
            key={src}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.65, 0.65, 0] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              delay: i * 5,
              ease: "easeInOut",
              times: [0, 0.08, 0.92, 1],
            }}
          >
            <Image src={src} alt="Jardin tunisien" fill className="object-cover" priority={i === 0} sizes="100vw" />
          </motion.div>
        ))}
        {/* Overlay dégradé pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/60 via-forest-900/35 to-forest-900/10" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 bg-white/20 text-white text-base font-bold px-5 py-2.5 rounded-full border border-white/30 backdrop-blur-sm shadow-lg">
              <Sprout size={18} /> {tr.hero.badge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              {tr.hero.title1}{" "}
              <span className="text-forest-300">{tr.hero.title2}</span>{" "}{tr.hero.title3}
            </h1>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">{tr.hero.desc}</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo(catalogRef)} className="bg-forest-400 hover:bg-forest-300 text-forest-950 font-bold px-7 py-3.5 rounded-2xl transition-colors shadow-lg">
                {tr.hero.cta1}
              </button>
              <button onClick={() => scrollTo(orderRef)} className="border border-white/40 hover:bg-white/10 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors">
                {tr.hero.cta2}
              </button>
            </div>
            <div className="flex gap-6 pt-2">
              {tr.heroBadges.map(({ label }, idx) => {
                const icons = [Truck, ShieldCheck, Star];
                const Icon = icons[idx];
                return (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-sm text-white/75"
                >
                  <Icon size={14} className="text-forest-300" />
                  {label}
                </div>
              );
              })}
            </div>
          </motion.div>

          {/* ── Bande produits flottante ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex flex-col gap-3 w-full max-w-sm"
          >
            <p className="text-white text-sm font-extrabold uppercase tracking-widest mb-2 drop-shadow-lg">
              {tr.featuredStrip}
            </p>
            <div className="overflow-hidden max-h-[420px] relative" style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
              <motion.div
                className="flex flex-col gap-3"
                animate={{ y: ["0%", "-50%"] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                {[...products.slice(0, 6), ...products.slice(0, 6)].map((p, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2.5 transition-colors cursor-pointer group shrink-0"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-300" sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{lang === "ar" && p.nameAr ? p.nameAr : p.name}</p>
                      <p className="text-forest-300 font-bold text-sm">{p.price.toFixed(3)} TND</p>
                      {p.badge && (
                        <span className="inline-block text-[10px] bg-forest-500/40 text-forest-200 px-1.5 py-0.5 rounded-full mt-0.5">{p.badge}</span>
                      )}
                    </div>
                    <div className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-forest-400 transition-colors">
                      <ShoppingCart size={13} className="text-white" />
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>

        <button
          onClick={() => scrollTo(catalogRef)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-white"
          aria-label={tr.ariaScroll}
        >
          <ChevronDown size={28} />
        </button>
      </section>

      {/* ── FEATURES STRIP ── */}
      <section className="bg-forest-800 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {tr.features.map(({ title, desc }, idx) => {
            const icons = [Truck, Leaf, ShieldCheck];
            const Icon = icons[idx];
            return (
            <div
              key={title}
              className="flex flex-col items-center gap-2 px-4"
            >
              <Icon size={28} className="text-forest-300" />
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-white/70 text-sm">{desc}</p>
            </div>
          );
          })}
        </div>
      </section>

      {/* ── CATALOGUE ── */}
      <section
        ref={catalogRef}
        id="catalogue"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            {tr.catalogue.title}{" "}<span className="text-forest-600">{tr.catalogue.highlight}</span>
          </h2>
          <p className="mt-2 text-gray-500 text-base max-w-lg mx-auto">
            {tr.catalogue.desc}
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex gap-3 flex-wrap justify-center mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2.5 rounded-full text-base font-bold transition-all border-2 ${
                activeCategory === cat.id
                  ? "bg-forest-600 text-white border-forest-600 shadow-lg scale-105"
                  : "bg-white text-gray-700 border-gray-300 hover:border-forest-500 hover:text-forest-700 hover:shadow-md hover:scale-105"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} allProducts={products} index={i} lang={lang} />
          ))}
        </div>
      </section>

      {/* ── CARE TIPS ── */}
      <section className="bg-forest-50 border-y border-forest-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10"
          >
            {tr.care.title}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {tr.care.items.map(({ title, tips }, idx) => {
              const icons  = [Droplets, Sun, Sprout];
              const colors = ["bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600", "bg-forest-100 text-forest-600"];
              const Icon   = icons[idx];
              const color  = colors[idx];
              return (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-forest-100"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <ul className="space-y-1.5">
                  {tips.map((tip) => (
                    <li key={tip} className="text-sm text-gray-500 flex gap-2">
                      <span className="text-forest-400 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center mb-10"
        >
          {tr.testimonials.title}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {tr.testimonials.items.map(({ name, text, plant }) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-forest-100"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill="currentColor"
                    className="text-amber-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm italic mb-4">
                &ldquo;{text}&rdquo;
              </p>
              <div>
                <p className="font-bold text-gray-900 text-sm">{name}</p>
                <p className="text-xs text-forest-600">{plant}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ORDER SECTION ── */}
      <section
        ref={orderRef}
        id="order"
        className="bg-gradient-to-b from-forest-50 to-cream-100 py-16 border-t border-forest-100"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-extrabold text-gray-900">
              {tr.order.title}
            </h2>
            <p className="text-gray-500 mt-2">{tr.order.desc}</p>
          </motion.div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-400 text-sm">{lang === "ar" ? "جاري التحميل…" : "Chargement du formulaire…"}</div>}>
            <OrderForm />
          </Suspense>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-forest-950 text-white/70 text-sm py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Marque */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-white text-lg">
                <Leaf size={20} className="text-forest-400" />
                Easy2Buy
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Plantes vivantes livrées à domicile. Intérieur, extérieur, aromatiques — pour chaque espace vert.
              </p>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">{tr.footer.contact}</p>
              <a href={`tel:${CONTACT.whatsapp}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={13} /> {CONTACT.phone}
              </a>
              <a href={`tel:${CONTACT.whatsapp2}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={13} /> {CONTACT.phone2}
              </a>
              <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-400 transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.523 5.83L.057 23.886a.5.5 0 00.611.61l6.083-1.464A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.671-.523-5.188-1.435l-.372-.22-3.853.928.942-3.814-.242-.38A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </a>
            </div>

            {/* Réseaux sociaux */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">{tr.footer.follow}</p>
              <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.258h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                Facebook — Easy2BuyTunisia
              </a>
              <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-pink-400 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram — Easy2BuyTunisia
              </a>
              <a href={CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M12 0C5.373 0 0 5.128 0 11.453c0 3.607 1.797 6.82 4.608 8.946V24l4.214-2.314A13.08 13.08 0 0012 21.907c6.627 0 12-5.128 12-11.454C24 5.128 18.627 0 12 0zm1.187 15.428l-3.05-3.253-5.955 3.253 6.554-6.962 3.123 3.253 5.883-3.253-6.555 6.962z"/></svg>
                Messenger
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} Easy2Buy Tunisia. {tr.footer.rights}
          </div>
        </div>
      </footer>

    </div>
  );
}
