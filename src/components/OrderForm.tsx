"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2, XCircle, Loader2,
  User, Phone, MapPin, MessageSquare, Building2,
  CreditCard, Truck, ChevronLeft, Banknote, Smartphone,
  ChevronDown, Search,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { calculateDeliveryFee, MAX_ITEMS_PER_ORDER } from "@/lib/delivery";
import { ContactBlock } from "@/components/ContactBlock";

const MIN_ADVANCE_RATIO = 0.4; // 40% minimum

// ---------------------------------------------------------------------------
// Gouvernorats & Municipalités Tunisie
// ---------------------------------------------------------------------------

const TUNISIA_LOCATIONS: { gov: string; cities: string[] }[] = [
  { gov: "Tunis",          cities: ["Tunis","La Marsa","Carthage","Le Bardo","La Goulette","Hammam-Lif","Ben Arous","Bou Mhel el-Bassatine","El Mourouj","Fouchana","Mornag"] },
  { gov: "Ariana",         cities: ["Ariana","Raoued","Mnihla","Ettadhamen","Kalâat el-Andalous","Sidi Thabet","La Soukra","Borj Louzir"] },
  { gov: "Ben Arous",      cities: ["Ben Arous","Hammam-Lif","Hammam Chott","Bou Mhel el-Bassatine","Ezzahra","Radès","Mégrine","Mohamadia","Mornag","El Mourouj","Khalidia","Medina Jedida"] },
  { gov: "Manouba",        cities: ["Manouba","Douar Hicher","Oued Ellil","Tebourba","El Batan","Djedeida","Mornaguia","Borj Amri"] },
  { gov: "Nabeul",         cities: ["Nabeul","Hammamet","Kelibia","Menzel Temime","Grombalia","Soliman","Bir Bou Rekba","Takelsa","Beni Khalled","Korba","Maamoura","El Haouaria","Dar Chaabane"] },
  { gov: "Zaghouan",       cities: ["Zaghouan","Zriba","Bir Mcherga","El Fahs","Nadhour","Saouaf"] },
  { gov: "Bizerte",        cities: ["Bizerte","Menzel Bourguiba","Mateur","Ras Jebel","Menzel Jemil","Tinja","Utique","Ghezala","Joumine","Sejnane","Aousja"] },
  { gov: "Béja",           cities: ["Béja","Testour","Téboursouk","Medjez el-Bab","Amdoun","Goubellat","Nefza","Thibar"] },
  { gov: "Jendouba",       cities: ["Jendouba","Tabarka","Aïn Draham","Fernana","Ghardimaou","Oued Melliz","Bou Salem","Balta-Bou Aouane"] },
  { gov: "Le Kef",         cities: ["Le Kef","Dahmani","Tajerouine","Kalaat Senan","Sers","Nebeur","Sakiet Sidi Youssef","Touiref","El Ksour","Jerissa"] },
  { gov: "Siliana",        cities: ["Siliana","Bou Arada","Gaâfour","El Krib","El Aroussa","Kesra","Makthar","Rohia","Sidi Bou Rouis","Bargou"] },
  { gov: "Sousse",         cities: ["Sousse","Hammam Sousse","Kalâa Kebira","Akouda","Msaken","Sidi Bou Ali","Enfidha","Hergla","Kondar","Sidi El Hani","Kalâa Sghira","Ksar Hellal"] },
  { gov: "Monastir",       cities: ["Monastir","Ksar Hellal","Bembla","Ouardanine","Sahline","Téboulba","Moknine","Zeramdine","Jammel","Bekalta","Beni Hassen","Sayada"] },
  { gov: "Mahdia",         cities: ["Mahdia","El Jem","Chebba","Ksour Essef","Sidi Alouane","Bou Merdes","Ouled Chamakh","Hebira","Melloulèche"] },
  { gov: "Sfax",           cities: ["Sfax","Sakiet Ezzit","Sakiet Eddaïer","Thyna","El Aïn","Bir Ali Ben Khalifa","Agareb","Jebeniana","Mahres","Kerkenah","Menzel Chaker","Ghraiba","El Hencha"] },
  { gov: "Kairouan",       cities: ["Kairouan","Sbikha","El Alâa","Nasrallah","El Oueslatia","Haffouz","Chebika","Bouhajla","Menzel Mehiri","Hajeb El Aïoun"] },
  { gov: "Kasserine",      cities: ["Kasserine","Sbeitla","Sbeïtla","Thala","Feriana","Foussana","El Ayoun","Hassi El Ferid","Jdliane","Majel Bel Abbès","Ezzouhour"] },
  { gov: "Sidi Bouzid",    cities: ["Sidi Bouzid","Regueb","Ouled Haffouz","Bir El Hafey","Sidi Ali Ben Aoun","Meknassy","Souk Jedid","Mezzouna","Jilma","Cebbala","Menzel Bouzaïane"] },
  { gov: "Gabès",          cities: ["Gabès","El Hamma","Mareth","Matmata","Nouvelle Matmata","Menzel El Habib","Ghannouche","Ghannouch","Métouia","Kettana"] },
  { gov: "Médenine",       cities: ["Médenine","Zarzis","Ben Gardane","Jerba - Houmt Souk","Jerba - Midoun","Jerba - Ajim","Sidi Makhlouf","Beni Khedache"] },
  { gov: "Tataouine",      cities: ["Tataouine","Ghomrassen","Bir Lahmar","Smar","Remada","Dhehiba"] },
  { gov: "Gafsa",          cities: ["Gafsa","Métlaoui","Mdhilla","El Guettar","Belkhir","Sened","El Ksar","Redeyef","Moularès","Sidi Aïch"] },
  { gov: "Tozeur",         cities: ["Tozeur","Nefta","Degache","Hazoua","Tameghza"] },
  { gov: "Kébili",         cities: ["Kébili","Douz","Souk Lahad","El Faouar","Jemna"] },
];

// Flat list pour la recherche
const ALL_CITIES = TUNISIA_LOCATIONS.flatMap(({ gov, cities }) =>
  cities.map((c) => ({ label: c, gov }))
);

// ---------------------------------------------------------------------------
// CityCombobox component
// ---------------------------------------------------------------------------

function CityCombobox({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Sync query when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.length < 1
    ? ALL_CITIES.slice(0, 30)
    : ALL_CITIES.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.gov.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40);

  const handleSelect = (label: string) => {
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl ${
        hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
      } focus-within:ring-2 ${
        hasError ? "focus-within:ring-red-400" : "focus-within:ring-forest-400"
      } transition overflow-hidden`}>
        <Search size={14} className="ml-3 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Tunis, Sousse, Sfax…"
          autoComplete="off"
          className="flex-1 px-3 py-3 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="px-3 text-gray-400 hover:text-gray-600"
          aria-label="Afficher la liste"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            key="dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto scrollbar-hide"
          >
            {filtered.map(({ label, gov }) => (
              <li
                key={`${gov}-${label}`}
                role="option"
                aria-selected={value === label}
                onMouseDown={() => handleSelect(label)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  value === label
                    ? "bg-forest-50 text-forest-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] text-gray-400 font-medium">{gov}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const customerSchema = z.object({
  name: z.string().min(2, "Nom requis (2 car. min)").max(100).regex(/^[\p{L}\s'-]+$/u, "Nom invalide"),
  phone: z.string().min(8, "Numéro trop court").max(20).regex(/^[+\d\s\-().]+$/, "Numéro invalide"),
  city: z.string().min(2, "Ville requise").max(100),
  address: z.string().min(10, "Adresse trop courte (10 car. min)").max(300),
  notes: z.string().max(500).optional(),
});

type CustomerData = z.infer<typeof customerSchema>;

type PaymentMode = "COD" | "HYBRID";
type PaymentMethod = "D17" | "FLOUCI" | "ONLINE" | "BANK_TRANSFER";

interface PaymentData {
  mode: PaymentMode;
  method?: PaymentMethod;
  advanceAmount?: number;
  paymentRef?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { id: "D17",           label: "D17",            icon: "📱", desc: "Paiement mobile D17" },
  { id: "FLOUCI",        label: "Flouci",          icon: "💚", desc: "App Flouci Tunisie" },
  { id: "ONLINE",        label: "Carte en ligne",  icon: "💳", desc: "Visa / Mastercard" },
  { id: "BANK_TRANSFER", label: "Virement",        icon: "🏦", desc: "Virement bancaire" },
];

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[
        { n: 1, label: "Mes infos" },
        { n: 2, label: "Paiement" },
      ].map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
            step >= n ? "bg-forest-600 text-white" : "bg-gray-200 text-gray-500"
          }`}>{n}</div>
          <span className={`text-xs font-medium ${step >= n ? "text-forest-700" : "text-gray-400"}`}>{label}</span>
          {i < 1 && <div className={`flex-1 h-0.5 rounded ${step > n ? "bg-forest-500" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface OrderFormProps {
  onSuccess?: () => void;
}

export function OrderForm({ onSuccess }: OrderFormProps) {
  const [step, setStep]           = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]  = useState(false);
  const [error, setError]          = useState<string | null>(null);
  const [orderId, setOrderId]      = useState<number | null>(null);

  // Customer form
  const { register, handleSubmit, getValues, setValue, control, formState: { errors } } = useForm<CustomerData>({
    resolver: zodResolver(customerSchema),
  });

  // Adresse livraison == adresse client
  const [sameAddress, setSameAddress] = useState(true);
  const cityValue2 = useWatch({ control, name: "city", defaultValue: "" });

  // Sync auto : quand la ville change et sameAddress=true, met à jour l'adresse
  useEffect(() => {
    if (sameAddress) {
      setValue(
        "address",
        cityValue2 && cityValue2.length >= 2 ? `Livraison à ${cityValue2} — adresse à préciser` : "Adresse à confirmer avec le livreur",
        { shouldValidate: false }
      );
    }
  }, [cityValue2, sameAddress, setValue]);

  const handleSameAddress = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      setValue("address", cityValue2 ? `Livraison à ${cityValue2} — adresse à préciser` : "Adresse à confirmer avec le livreur", { shouldValidate: false });
    } else {
      setValue("address", "", { shouldValidate: false });
    }
  };

  // Payment state
  const [payMode, setPayMode]           = useState<PaymentMode>("COD");
  const [payMethod, setPayMethod]       = useState<PaymentMethod>("D17");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentRef, setPaymentRef]     = useState<string>("");

  // Parrainage
  const [referralCode, setReferralCode]   = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle"|"checking"|"valid"|"invalid">("idle");
  const [referralMsg, setReferralMsg]     = useState("");
  const [referralDiscount, setReferralDiscount] = useState(0);

  const checkReferralCode = async (code: string) => {
    if (!code.trim()) { setReferralStatus("idle"); setReferralMsg(""); setReferralDiscount(0); return; }
    setReferralStatus("checking");
    try {
      const res = await fetch(`/api/referral/check?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setReferralStatus("valid");
        setReferralMsg(data.message);
        setReferralDiscount(data.discountPct);
      } else {
        setReferralStatus("invalid");
        setReferralMsg(data.message || "Code invalide");
        setReferralDiscount(0);
      }
    } catch {
      setReferralStatus("idle");
    }
  };

  const { items, totalPrice, clearCart } = useCartStore();
  const subtotal = totalPrice();

  // Calcul dynamique selon la ville saisie
  const cityValue = cityValue2;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const deliveryQuote = calculateDeliveryFee(cityValue ?? "");
  const deliveryFee = deliveryQuote.fee;
  const total = subtotal + deliveryFee;
  const overLimit = totalQty > MAX_ITEMS_PER_ORDER;

  // Step 1 → 2
  const goToPayment = handleSubmit(() => {
    setError(null);
    setStep(2);
  });

  // Step 2 → submit
  const submitOrder = async () => {
    const data = getValues();
    setSubmitting(true);
    setError(null);

    const validItems = items
      .map((i) => ({ productId: parseInt(i.id, 10), quantity: i.quantity }))
      .filter((i) => !isNaN(i.productId) && i.productId > 0);

    if (validItems.length === 0) {
      setError("Aucun article valide dans le panier.");
      setSubmitting(false);
      return;
    }

    // Validation avance : minimum 40% du total
    const advance = parseFloat(advanceAmount || "0");
    const minAdvance = parseFloat((total * MIN_ADVANCE_RATIO).toFixed(3));
    if (payMode === "HYBRID") {
      if (!advance || advance < minAdvance) {
        setError(`L'avance minimum est de 40% = ${minAdvance.toFixed(3)} TND`);
        setSubmitting(false);
        return;
      }
      if (advance >= total) {
        setError(`L'avance doit être inférieure au total (${total.toFixed(3)} TND)`);
        setSubmitting(false);
        return;
      }
    }

    const paymentData: PaymentData = payMode === "HYBRID"
      ? { mode: "HYBRID", method: payMethod, advanceAmount: advance, paymentRef: paymentRef || undefined }
      : { mode: "COD" };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: data.name,
          customerPhone: data.phone,
          customerCity: data.city,
          customerAddress: data.address,
          notes: data.notes,
          items: validItems,
          paymentMethod: payMode === "COD" ? "CASH_ON_DELIVERY" : paymentData.method,
          referralCode: referralStatus === "valid" ? referralCode.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erreur serveur");
      }

      const result = await res.json();
      setOrderId(result.orderId);
      clearCart();
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-xl border ${hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${hasError ? "focus:ring-red-400" : "focus:ring-forest-400"} transition`;

  // ── Success screen ──
  if (submitted) {
    return (
      <section className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-lg p-8 border border-forest-100 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
          <CheckCircle2 size={60} className="text-forest-500" />
          <h3 className="text-2xl font-extrabold text-gray-900">Commande #{orderId} reçue !</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Merci ! Nous vous contacterons très vite pour confirmer la livraison.
          </p>
          <div className={`w-full rounded-xl px-4 py-3 text-sm font-semibold mt-2 ${
            payMode === "COD" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {payMode === "COD"
              ? `💵 Paiement à la livraison — ${total.toFixed(3)} TND`
              : `✅ Avance de ${parseFloat(advanceAmount).toFixed(3)} TND enregistrée — Solde : ${(total - parseFloat(advanceAmount)).toFixed(3)} TND`
            }
          </div>
          <button
            onClick={() => { setSubmitted(false); setStep(1); setAdvanceAmount(""); setPaymentRef(""); setPayMode("COD"); }}
            className="mt-2 text-forest-600 font-semibold text-sm underline"
          >
            Passer une nouvelle commande
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section id="order" className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-lg p-6 sm:p-8 border border-forest-100">

      <StepBar step={step} />

      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 1 : Infos client ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Vos informations</h2>
            <p className="text-sm text-gray-500 mb-5">Livraison à domicile — confirmation par appel ou SMS.</p>

            <form onSubmit={goToPayment} noValidate className="space-y-4">

              <div>
                <label htmlFor="field-name" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                  <User size={14} className="text-forest-500" /> Nom complet
                </label>
                <input id="field-name" {...register("name")} placeholder="Votre nom" className={inputCls(!!errors.name)} autoComplete="name" />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="field-phone" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                  <Phone size={14} className="text-forest-500" /> Téléphone
                </label>
                <input id="field-phone" {...register("phone")} type="tel" placeholder="+216 XX XXX XXX" className={inputCls(!!errors.phone)} autoComplete="tel" />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                  <Building2 size={14} className="text-forest-500" /> Gouvernorat / Municipalité
                </label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <CityCombobox
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      hasError={!!errors.city}
                    />
                  )}
                />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="field-address" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <MapPin size={14} className="text-forest-500" /> Adresse de livraison
                  </label>
                  {/* Toggle même adresse */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => handleSameAddress(!sameAddress)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        sameAddress ? "bg-forest-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        sameAddress ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {sameAddress ? "Même adresse" : "Autre adresse"}
                    </span>
                  </label>
                </div>

                {sameAddress ? (
                  <div className="flex items-center gap-2 bg-forest-50 border border-forest-200 rounded-xl px-4 py-3 text-sm text-forest-700">
                    <MapPin size={14} className="text-forest-500 shrink-0" />
                    <span className="flex-1">
                      {cityValue && cityValue.length >= 2
                        ? <>Livraison à <strong>{cityValue}</strong> — vous préciserez l&apos;adresse exacte à notre équipe.</>  
                        : "Sélectionnez d'abord votre ville ci-dessus."}
                    </span>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="field-address"
                      {...register("address")}
                      rows={3}
                      placeholder="Rue, quartier, immeuble, numéro…"
                      className={inputCls(!!errors.address)}
                      autoComplete="street-address"
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
                  </>
                )}
              </div>

              <div>
                <label htmlFor="field-notes" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                  <MessageSquare size={14} className="text-forest-500" /> Notes (optionnel)
                </label>
                <textarea id="field-notes" {...register("notes")} rows={2} placeholder="Instructions spéciales..." className={inputCls(!!errors.notes)} />
              </div>

              {/* Code parrainage */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <label htmlFor="field-referral" className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  🎁 Code de parrainage <span className="text-xs font-normal text-amber-500">(optionnel)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="field-referral"
                    type="text"
                    value={referralCode}
                    onChange={e => { setReferralCode(e.target.value.toUpperCase()); setReferralStatus("idle"); }}
                    onBlur={e => checkReferralCode(e.target.value)}
                    placeholder="ex : AYOU-1234"
                    maxLength={12}
                    className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white uppercase"
                  />
                  <button type="button" onClick={() => checkReferralCode(referralCode)}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 rounded-lg">
                    {referralStatus === "checking" ? "..." : "Vérifier"}
                  </button>
                </div>
                {referralStatus === "valid" && (
                  <p className="text-xs text-green-700 font-semibold">✅ {referralMsg}</p>
                )}
                {referralStatus === "invalid" && (
                  <p className="text-xs text-red-600">❌ {referralMsg}</p>
                )}
              </div>

              {/* Récap panier */}
              {items.length > 0 && (
                <div className="bg-forest-50 rounded-xl px-4 py-3 text-sm border border-forest-200 space-y-1">
                  {items.map(i => (
                    <div key={i.id} className="flex justify-between text-forest-800">
                      <span>{i.name} × {i.quantity}</span>
                      <span className="font-semibold">{(i.price * i.quantity).toFixed(3)} TND</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-forest-700 border-t border-forest-200 pt-1">
                    <span>Sous-total</span><span>{subtotal.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between text-forest-700">
                    <span className="flex items-center gap-1">
                      Livraison
                      {cityValue && cityValue.length >= 2 && (
                        <span className="text-xs text-gray-400">({deliveryQuote.zone} · J+{deliveryQuote.estimatedDays})</span>
                      )}
                    </span>
                    <span>{deliveryFee.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-forest-900 border-t border-forest-200 pt-1">
                    <span>Total</span><span>{total.toFixed(3)} TND</span>
                  </div>
                </div>
              )}

              {items.length === 0 && (
                <p className="text-center text-xs text-gray-400">Ajoutez des plantes au panier avant de commander.</p>
              )}

              {overLimit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
                  ⚠️ Maximum {MAX_ITEMS_PER_ORDER} articles par commande. Les frais sont plafonnés à {MAX_ITEMS_PER_ORDER} articles.
                </div>
              )}

              <button
                type="submit"
                disabled={items.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl transition-colors"
              >
                <CreditCard size={18} /> Choisir le paiement →
              </button>

              {/* Bloc contact oral */}
              <ContactBlock items={items} />

            </form>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 : Paiement ── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Mode de paiement</h2>
                <p className="text-sm text-gray-500">
                  Sous-total <strong>{subtotal.toFixed(3)}</strong> + livraison <strong>{deliveryFee.toFixed(3)}</strong> ({deliveryQuote.zone}) = <strong className="text-forest-700">{total.toFixed(3)} TND</strong>
                </p>
              </div>
            </div>

            {/* COD vs Hybride */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayMode("COD")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  payMode === "COD" ? "border-forest-500 bg-forest-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Truck size={28} className={payMode === "COD" ? "text-forest-600" : "text-gray-400"} />
                <span className={`text-sm font-bold ${payMode === "COD" ? "text-forest-700" : "text-gray-600"}`}>
                  Payer à la livraison
                </span>
                <span className="text-xs text-gray-400 text-center">Espèces remises au livreur</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMode("HYBRID")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  payMode === "HYBRID" ? "border-forest-500 bg-forest-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <Smartphone size={28} className={payMode === "HYBRID" ? "text-forest-600" : "text-gray-400"} />
                <span className={`text-sm font-bold ${payMode === "HYBRID" ? "text-forest-700" : "text-gray-600"}`}>
                  Payer une avance
                </span>
                <span className="text-xs text-gray-400 text-center">D17 / Flouci / Virement</span>
              </button>
            </div>

            {/* Mode COD : récap */}
            {payMode === "COD" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Banknote size={16} /> Paiement à la livraison
                </div>
                <p>Vous payez <strong>{total.toFixed(3)} TND</strong> en espèces lorsque le livreur arrive.</p>
              </div>
            )}

            {/* Mode HYBRID : choix méthode + avance */}
            {payMode === "HYBRID" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        payMethod === m.id ? "border-forest-500 bg-forest-50 text-forest-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Montant de l'avance (TND)
                    <span className="ml-1 text-xs font-normal text-amber-600">minimum 40% = {(total * MIN_ADVANCE_RATIO).toFixed(3)} TND</span>
                  </label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    step="0.001"
                    min={(total * MIN_ADVANCE_RATIO).toFixed(3)}
                    max={(total - 0.001).toFixed(3)}
                    placeholder={(total * MIN_ADVANCE_RATIO).toFixed(3)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                  {/* Barre de progression avance */}
                  {advanceAmount && parseFloat(advanceAmount) >= total * MIN_ADVANCE_RATIO && parseFloat(advanceAmount) < total && (() => {
                    const adv = parseFloat(advanceAmount);
                    const pct = Math.min((adv / total) * 100, 100);
                    return (
                      <div className="mt-2 space-y-1.5">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex justify-between">
                          <span>Avance : <strong>{adv.toFixed(3)} TND</strong></span>
                          <span>Solde livraison : <strong>{(total - adv).toFixed(3)} TND</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                  {advanceAmount && parseFloat(advanceAmount) > 0 && parseFloat(advanceAmount) < total * MIN_ADVANCE_RATIO && (
                    <p className="mt-1 text-xs text-red-500">⚠ Avance insuffisante — minimum {(total * MIN_ADVANCE_RATIO).toFixed(3)} TND (40%)</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Référence de transaction <span className="text-gray-400 text-xs">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="ID transaction D17, Flouci..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">
                <XCircle size={16} /> {error}
              </div>
            )}

            {/* Bloc contact oral — étape 2 */}
            <ContactBlock items={items} />

            <button
              type="button"
              onClick={submitOrder}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-2xl transition-colors"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? "Envoi en cours..." : "Confirmer la commande"}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </section>
  );
}
