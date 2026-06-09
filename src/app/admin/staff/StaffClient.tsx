"use client";

import { useState, useTransition } from "react";
import { UserPlus, Pencil, ToggleLeft, ToggleRight, Copy, Check, Loader2, X, Save } from "lucide-react";
import { createStaff, updateStaff, toggleStaffActive } from "./actions";
import type { Staff } from "@/db/schema";

// ---------------------------------------------------------------------------
// Badge rôle
// ---------------------------------------------------------------------------
const ROLE_META = {
  ADMIN:   { label: "Admin",   color: "bg-purple-100 text-purple-700" },
  AGENT:   { label: "Agent",   color: "bg-blue-100 text-blue-700" },
  LIVREUR: { label: "Livreur", color: "bg-amber-100 text-amber-700" },
} as const;

function RoleBadge({ role }: { role: keyof typeof ROLE_META }) {
  const m = ROLE_META[role];
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${m.color}`}>{m.label}</span>;
}

// ---------------------------------------------------------------------------
// Copie ID
// ---------------------------------------------------------------------------
function CopyId({ id }: { id: number }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(String(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      title="Copier l'ID de connexion"
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-mono transition-colors"
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      ID&nbsp;<strong>{id}</strong>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Formulaire création / édition
// ---------------------------------------------------------------------------
interface FormData { name: string; email: string; phone: string; role: "ADMIN" | "AGENT" | "LIVREUR" }
const EMPTY: FormData = { name: "", email: "", phone: "", role: "AGENT" };

function StaffForm({
  initial,
  editId,
  onClose,
}: {
  initial?: FormData;
  editId?: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial ?? EMPTY);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function set(k: keyof FormData, v: string) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    if (editId) fd.append("id", String(editId));
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = editId ? await updateStaff(fd) : await createStaff(fd);
      if (res?.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{editId ? "Modifier le membre" : "Ajouter un membre"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              required value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Karim Ben Ali"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-forest-500 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email" required value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="karim@easy2buy.tn"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-forest-500 outline-none"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
              placeholder="+21621000000"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-forest-500 outline-none"
            />
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ADMIN", "AGENT", "LIVREUR"] as const).map(r => (
                <button
                  key={r} type="button" onClick={() => set("role", r)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.role === r
                      ? r === "ADMIN" ? "border-purple-500 bg-purple-50 text-purple-700"
                      : r === "AGENT" ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {r === "ADMIN" ? "🟣" : r === "AGENT" ? "🔵" : "🟡"} {ROLE_META[r].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {form.role === "ADMIN" && "Accès complet à tout le backoffice"}
              {form.role === "AGENT" && "Gestion des commandes et clients"}
              {form.role === "LIVREUR" && "Vue tournée uniquement, pas de prix d'achat"}
            </p>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={pending}
              className="flex-1 bg-forest-600 hover:bg-forest-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editId ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carte membre
// ---------------------------------------------------------------------------
function MemberCard({
  member,
  currentAdminId,
}: {
  member: Staff;
  currentAdminId: number;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [pending, startTransition] = useTransition();
  const isSelf = member.id === currentAdminId;

  function handleToggle() {
    if (isSelf) return;
    const fd = new FormData();
    fd.append("id", String(member.id));
    fd.append("active", String(!member.active));
    startTransition(() => toggleStaffActive(fd));
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${!member.active ? "opacity-50" : "border-gray-100 shadow-sm"}`}>
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
          member.role === "ADMIN" ? "bg-purple-100 text-purple-700"
          : member.role === "AGENT" ? "bg-blue-100 text-blue-700"
          : "bg-amber-100 text-amber-700"
        }`}>
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{member.name}</span>
            <RoleBadge role={member.role} />
            {isSelf && <span className="text-xs text-gray-400">(vous)</span>}
            {!member.active && <span className="text-xs text-red-500 font-semibold">Inactif</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 truncate">{member.email}</div>
          {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
        </div>

        {/* ID connexion */}
        <CopyId id={member.id} />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="Modifier"
          >
            <Pencil size={16} />
          </button>
          {!isSelf && (
            <button
              onClick={handleToggle} disabled={pending}
              className={`p-2 rounded-lg transition-colors ${member.active ? "hover:bg-red-50 text-green-500 hover:text-red-500" : "hover:bg-green-50 text-red-400 hover:text-green-600"}`}
              title={member.active ? "Désactiver" : "Réactiver"}
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : member.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            </button>
          )}
        </div>
      </div>

      {showEdit && (
        <StaffForm
          editId={member.id}
          initial={{ name: member.name, email: member.email, phone: member.phone ?? "", role: member.role }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function StaffClient({
  members,
  currentAdminId,
}: {
  members: Staff[];
  currentAdminId: number;
}) {
  const [showAdd, setShowAdd] = useState(false);

  const byRole = {
    ADMIN:   members.filter(m => m.role === "ADMIN"),
    AGENT:   members.filter(m => m.role === "AGENT"),
    LIVREUR: members.filter(m => m.role === "LIVREUR"),
  };

  return (
    <>
      {/* Bouton ajouter */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full mb-6 flex items-center justify-center gap-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-2xl py-3 transition-colors"
      >
        <UserPlus size={18} /> Ajouter un membre
      </button>

      {/* Info connexion */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700">
        💡 <strong>Connexion :</strong> chaque membre se connecte via <strong>son ID</strong> sur{" "}
        <a href="/admin/login" target="_blank" className="underline font-semibold">/admin/login</a>. Cliquez sur l'ID pour le copier.
      </div>

      {/* Groupes par rôle */}
      {(["ADMIN", "AGENT", "LIVREUR"] as const).map(role => {
        const list = byRole[role];
        if (list.length === 0) return null;
        return (
          <div key={role} className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{role === "ADMIN" ? "🟣" : role === "AGENT" ? "🔵" : "🟡"}</span>
              {ROLE_META[role].label}s — {list.length}
            </h2>
            <div className="space-y-2">
              {list.map(m => (
                <MemberCard key={m.id} member={m} currentAdminId={currentAdminId} />
              ))}
            </div>
          </div>
        );
      })}

      {members.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p>Aucun membre — cliquez sur "Ajouter" pour commencer.</p>
        </div>
      )}

      {showAdd && <StaffForm onClose={() => setShowAdd(false)} />}
    </>
  );
}
