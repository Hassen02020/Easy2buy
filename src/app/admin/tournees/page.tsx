export const dynamic = "force-dynamic";

import { db } from "@/db";
import { orders, staff } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import type { StaffRole } from "@/db/schema";
import { TourneesClient } from "./TourneesClient";

export default async function TourneesPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const role: StaffRole = session.role;
  if (role === "LIVREUR") redirect("/admin/tournee");

  // Toutes les commandes actives (pas annulées/retournées)
  const activeOrders = await db
    .select()
    .from(orders)
    .where(
      inArray(orders.status, ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED"])
    );

  // Tous les staff actifs
  const allStaff = await db
    .select({ id: staff.id, name: staff.name, role: staff.role })
    .from(staff)
    .where(eq(staff.active, true));

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="tournees" role={role} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Gestion des Tournées</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeOrders.length} commande(s) en cours · connecté : <strong>{session.name}</strong>
          </p>
        </div>
        <TourneesClient orders={activeOrders} allStaff={allStaff} sessionRole={role as string} sessionId={session.id} />
      </div>
    </div>
  );
}
