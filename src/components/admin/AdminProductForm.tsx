"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upsertProduct } from "@/app/admin/actions";
import type { Product } from "@/db/schema";
import { Loader2, Save, X, Plus, Trash2, PlayCircle } from "lucide-react";

interface Props {
  product?: Product;
  onClose?: () => void;
}

const CATEGORIES = [
  { value: "interieur", label: "🏠 Intérieur" },
  { value: "exterieur", label: "🌳 Extérieur" },
  { value: "succulente", label: "🌵 Succulente" },
  { value: "aromatique", label: "🌿 Aromatique" },
];

const LIGHT_OPTIONS  = ["plein soleil", "mi-ombre", "ombre"];
const WATER_OPTIONS  = ["rare", "modéré", "fréquent"];
const CARE_OPTIONS   = ["facile", "moyen", "expert"];
const ZONES_TN = [
  { id: "nord",     label: "🟢 Nord (Tunis, Bizerte, Beja)" },
  { id: "sahel",    label: "🟡 Sahel (Sousse, Monastir, Mahdia)" },
  { id: "cotiere",  label: "🔵 Côtière (Sfax, Gabès, Nabeul)" },
  { id: "interieur",label: "🟠 Intérieur (Kairouan, Sidi Bouzid)" },
  { id: "sud",      label: "🔴 Sud (Tozeur, Djerba, Médenine)" },
];

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  try { return val ? JSON.parse(val) as T : fallback; }
  catch { return fallback; }
}

export default function AdminProductForm({ product, onClose }: Props) {
  const [pending, setPending]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string[]>>({});
  const formRef                 = useRef<HTMLFormElement>(null);

  // Multi-images
  const [images, setImages]     = useState<string[]>(
    parseJson<string[]>(product?.images, product?.imageUrl ? [product.imageUrl] : [])
  );
  const [imgInput, setImgInput] = useState("");

  // Zones climatiques
  const [zones, setZones] = useState<string[]>(
    parseJson<string[]>(product?.climaticZones, [])
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    fd.set("images", JSON.stringify(images));
    fd.set("climaticZones", JSON.stringify(zones));
    if (images[0]) fd.set("imageUrl", images[0]);
    const result = await upsertProduct(fd);
    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setPending(false);
    }
  }

  const inp = (hasError: boolean) =>
    `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 transition-colors ${
      hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    }`;

  const section = (title: string, icon: string) => (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-gray-100">
      <span>{icon}</span>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h3>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      {/* ── Infos de base ── */}
      {section("Informations générales", "📋")}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom du produit *</label>
          <input name="name" defaultValue={product?.name} placeholder="Ex: Monstera Deliciosa" className={inp(!!errors.name)} required />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
          <textarea name="description" defaultValue={product?.description ?? ""} rows={3}
            placeholder="Description, origine, caractéristiques..." className={inp(!!errors.description)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Catégorie *</label>
          <select name="category" defaultValue={product?.category ?? "interieur"} className={inp(false)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock</label>
          <input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className={inp(false)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Prix de vente (TND) *</label>
          <input name="price" type="number" step="0.001" min="0" defaultValue={product?.price ?? ""} placeholder="29.900" className={inp(!!errors.price)} required />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price[0]}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Prix d&apos;achat (TND) *</label>
          <input name="purchasePrice" type="number" step="0.001" min="0" defaultValue={product?.purchasePrice ?? "0"} placeholder="12.000" className={inp(false)} required />
        </div>
      </div>

      {/* ── Galerie images ── */}
      {section("Galerie photos", "🖼️")}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={imgInput}
            onChange={e => setImgInput(e.target.value)}
            placeholder="https://... (URL image)"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
          />
          <button type="button"
            onClick={() => { if (imgInput.trim()) { setImages(p => [...p, imgInput.trim()]); setImgInput(""); } }}
            className="flex items-center gap-1 bg-forest-600 hover:bg-forest-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={14} /> Ajouter
          </button>
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <Image src={url} alt={`img-${i}`} width={64} height={64}
                  className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                  onError={() => {}} />
                {i === 0 && <span className="absolute top-0.5 left-0.5 text-[9px] bg-forest-600 text-white px-1 rounded font-bold">Principal</span>}
                <button type="button" onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:flex">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400">La 1ère image sera l&apos;image principale. Glissez pour réordonner.</p>
      </div>

      {/* ── Vidéo courte ── */}
      {section("Vidéo courte", "🎬")}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Lien vidéo <span className="font-normal text-gray-400">(YouTube, TikTok, Instagram Reels, MP4…)</span>
        </label>
        <div className="flex gap-2 items-center">
          <PlayCircle size={18} className="text-gray-400 shrink-0" />
          <input name="videoUrl" type="url" defaultValue={product?.videoUrl ?? ""}
            placeholder="https://youtu.be/xxx ou https://www.tiktok.com/..."
            className={`flex-1 ${inp(false)}`} />
        </div>
      </div>

      {/* ── Informations plante & climat ── */}
      {section("Besoins de la plante", "🌱")}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">☀️ Lumière</label>
          <select name="lightNeeds" defaultValue={product?.lightNeeds ?? ""} className={inp(false)}>
            <option value="">— choisir —</option>
            {LIGHT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">💧 Arrosage</label>
          <select name="waterNeeds" defaultValue={product?.waterNeeds ?? ""} className={inp(false)}>
            <option value="">— choisir —</option>
            {WATER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">🌡️ Température</label>
          <input name="tempRange" defaultValue={product?.tempRange ?? ""}
            placeholder="ex: 10–40°C" className={inp(false)} />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">🛠️ Difficulté entretien</label>
          <div className="flex gap-2">
            {CARE_OPTIONS.map(o => {
              const colors: Record<string, string> = { facile: "green", moyen: "amber", expert: "red" };
              const c = colors[o];
              const sel = product?.careDifficulty === o;
              return (
                <label key={o} className={`flex-1 text-center cursor-pointer border rounded-xl py-2 text-xs font-bold transition-colors
                  ${sel ? `border-${c}-500 bg-${c}-50 text-${c}-700` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <input type="radio" name="careDifficulty" value={o} defaultChecked={sel} className="sr-only" />
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Zones climatiques Tunisie ── */}
      {section("Zones climatiques compatibles (Tunisie)", "🗺️")}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ZONES_TN.map(z => (
          <label key={z.id} className={`flex items-center gap-2 cursor-pointer border rounded-xl px-3 py-2 text-sm transition-colors
            ${zones.includes(z.id) ? "border-forest-500 bg-forest-50 text-forest-700 font-semibold" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
            <input type="checkbox" className="sr-only"
              checked={zones.includes(z.id)}
              onChange={e => setZones(prev => e.target.checked ? [...prev, z.id] : prev.filter(x => x !== z.id))} />
            {zones.includes(z.id) ? "✓ " : ""}{z.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400">Cochez les zones où cette plante s&apos;épanouit bien.</p>

      {/* ── Suggestions ── */}
      {section("Plantes suggérées", "💡")}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          IDs des plantes à recommander <span className="font-normal text-gray-400">(séparés par virgule)</span>
        </label>
        <input name="suggestedProductIds"
          defaultValue={parseJson<number[]>(product?.suggestedProductIds, []).join(",")}
          placeholder="ex: 3,7,12"
          className={inp(false)}
          onChange={e => {
            const ids = e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            e.target.setAttribute("data-parsed", JSON.stringify(ids));
          }}
        />
        <p className="text-xs text-gray-400 mt-1">Ces plantes apparaîtront dans la section &quot;On vous recommande aussi&quot;.</p>
      </div>

      {/* Actif */}
      <div className="flex items-center gap-3 pt-1">
        <input type="hidden" name="active" value="false" />
        <input type="checkbox" name="active" value="true" id="active"
          defaultChecked={product?.active ?? true} className="w-4 h-4 accent-forest-600" />
        <label htmlFor="active" className="text-sm text-gray-700 font-medium">Produit actif (visible sur la boutique)</label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {product ? "Mettre à jour" : "Créer le produit"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl border border-gray-200 text-sm transition-colors">
            <X size={14} /> Annuler
          </button>
        )}
      </div>
    </form>
  );
}
