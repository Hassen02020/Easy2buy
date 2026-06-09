"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Leaf } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: parseInt(staffId, 10) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); return; }
      router.push(data.redirect);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Leaf className="text-forest-600" size={28} />
          <span className="text-2xl font-extrabold text-forest-700">Easy2Buy</span>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-1 text-center">Accès Staff</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Connectez-vous avec votre ID staff</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-1">
              ID Staff
            </label>
            <input
              id="staffId"
              type="number"
              min="1"
              required
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              placeholder="Ex: 1"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-forest-500 focus:border-transparent outline-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
