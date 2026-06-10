"use client";

import { useRef, useState, lazy, Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Leaf,
  Truck,
  ShieldCheck,
  Star,
  ShoppingCart,
  ChevronDown,
  Sprout,
  Sun,
  Droplets,
} from "lucide-react";
import { products, categories } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

const OrderForm = lazy(() => import("@/components/OrderForm").then(m => ({ default: m.OrderForm })));

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const orderRef = useRef<HTMLElement>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const { lang, setLang, isRtl } = useLang();
  const tr = t[lang];

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

      {/* ── HEADER ── */}
      <Header
        lang={lang}
        setLang={setLang}
        onScrollCatalogue={() => scrollTo(catalogRef)}
        onScrollOrder={() => scrollTo(orderRef)}
      />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-900 via-forest-800 to-forest-600 text-white min-h-[90vh] flex items-center">
        {/* Slideshow arrière-plan jardins tunisiens */}
        {[
          "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80", // jardin fleuri
          "https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?w=1600&q=80", // plantes vertes
          "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1600&q=80", // olivier méditerranéen
          "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=1600&q=80", // lavande violette
          "https://images.unsplash.com/photo-1444392061186-9fc38f84f726?w=1600&q=80", // jardin verdoyant
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
            <Image src={src} alt="Jardin tunisien" fill className="object-cover" sizes="100vw" />
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
      <Footer
        lang={lang}
        onScrollCatalogue={() => scrollTo(catalogRef)}
        onScrollOrder={() => scrollTo(orderRef)}
      />

      {/* ── BOTTOM NAV (mobile) ── */}
      <BottomNav
        onShopPress={() => scrollTo(catalogRef)}
        onOrderPress={() => scrollTo(orderRef)}
      />

    </div>
  );
}
