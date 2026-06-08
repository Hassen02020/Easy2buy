export const dynamic = "force-dynamic";
/**
 * app/admin/products/page.tsx
 * Server Component — liste + formulaire de gestion des produits
 */

import { db } from "@/db";
import { products } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminProductForm from "@/components/admin/AdminProductForm";
import { deleteProduct } from "@/app/admin/actions";
import Image from "next/image";

const CAT_LABELS: Record<string, string> = {
  interieur: "Intérieur",
  exterieur: "Extérieur",
  succulente: "Succulente",
  aromatique: "Aromatique",
};

export default async function AdminProductsPage() {
  let rows: (typeof products.$inferSelect)[] = [];
  let dbError: string | null = null;

  try {
    rows = await db.select().from(products).orderBy(desc(products.createdAt));
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Erreur DB";
  }

  const typedRows = rows;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Catalogue Produits</h1>
            <p className="text-sm text-gray-500">{typedRows.length} produit(s) au total</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin/dashboard" className="text-sm border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl font-medium transition-colors">
              ← Dashboard
            </a>
          </div>
        </div>

        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-semibold text-sm">{dbError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire nouveau produit */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-800 mb-5">Ajouter un produit</h2>
              <AdminProductForm />
            </div>
          </div>

          {/* Liste des produits */}
          <div className="lg:col-span-2">
            {typedRows.length === 0 && !dbError ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                Aucun produit. Créez-en un avec le formulaire ci-contre.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Image", "Produit", "Cat.", "Vente", "Achat", "Marge", "Stock", "Statut", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {typedRows.map((p) => {
                      const margin = Number(p.price) - Number(p.purchasePrice);
                      const marginPct = Number(p.price) > 0 ? (margin / Number(p.price) * 100).toFixed(0) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {p.imageUrl ? (
                              <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="rounded-lg object-cover w-10 h-10" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-lg">🌿</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 truncate max-w-[140px]">{p.name}</p>
                            {p.description && <p className="text-xs text-gray-400 truncate max-w-[140px]">{p.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{CAT_LABELS[p.category]}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{Number(p.price).toFixed(2)} €</td>
                          <td className="px-4 py-3 text-red-500 whitespace-nowrap">{Number(p.purchasePrice).toFixed(2)} €</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${Number(marginPct) >= 30 ? "bg-green-100 text-green-700" : Number(marginPct) >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {marginPct}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${p.stock < 5 ? "text-red-600" : p.stock < 20 ? "text-amber-600" : "text-green-600"}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {p.active ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <form action={deleteProduct.bind(null, p.id)}>
                              <button type="submit" className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg transition-colors">
                                Désactiver
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
