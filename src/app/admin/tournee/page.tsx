export const dynamic = "force-dynamic";
/**
 * /admin/tournee
 * ---------------
 * Vue "Ma Tournée" — réservée aux LIVREURS.
 * Affiche toutes les commandes SHIPPED assignées au livreur connecté.
 * Actions : Confirmer encaissement, saisir remarque.
 */

import { db } from "@/db";
import { orders, staff } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TourneeClient from "./TourneeClient";

// ---------------------------------------------------------------------------
// Requête Drizzle — liste tournée livreur
// ---------------------------------------------------------------------------
async function getTournee(livreurId: number) {
  return db
    .select({
      id:              orders.id,
      customerName:    orders.customerName,
      customerPhone:   orders.customerPhone,
      customerCity:    orders.customerCity,
      customerAddress: orders.customerAddress,
      total:           orders.total,
      advanceAmount:   orders.advanceAmount,
      remainingAmount: orders.remainingAmount,
      paymentStatus:   orders.paymentStatus,
      paymentMethod:   orders.paymentMethod,
      status:          orders.status,
      deliveryNotes:   orders.deliveryNotes,
      courierRemarks:  orders.courierRemarks,
      createdAt:       orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.deliveredBy, livreurId),
        inArray(orders.status, ["SHIPPED", "DELIVERED"])
      )
    )
    .orderBy(orders.createdAt);
}

async function getLivreurInfo(id: number) {
  const [member] = await db
    .select({ id: staff.id, name: staff.name, role: staff.role })
    .from(staff)
    .where(eq(staff.id, id));
  return member ?? null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function TourneePage({
  searchParams,
}: {
  searchParams: Promise<{ staffId?: string }>;
}) {
  const session = await getSession();
  const sp = await searchParams;

  // Déterminer l'ID livreur : session cookie ou query param fallback
  let livreurId: number | null = null;
  if (session?.role === "LIVREUR" || session?.role === "ADMIN") {
    livreurId = session.role === "LIVREUR" ? session.id : parseInt(sp.staffId ?? "0", 10) || null;
  } else if (sp.staffId) {
    livreurId = parseInt(sp.staffId, 10);
  }

  if (!livreurId || isNaN(livreurId)) {
    redirect("/admin/login");
  }

  const [livreur, tournee] = await Promise.all([
    getLivreurInfo(livreurId),
    getTournee(livreurId),
  ]);

  if (!livreur) redirect("/admin/login");

  const totalAEncaisser = tournee
    .filter(o => o.status === "SHIPPED")
    .reduce((s, o) => s + parseFloat(String(o.remainingAmount ?? "0")), 0);

  const totalEncaisse = tournee
    .filter(o => o.status === "DELIVERED")
    .reduce((s, o) => s + parseFloat(String(o.total ?? "0")), 0);

  return (
    <TourneeClient
      livreur={livreur}
      tournee={tournee}
      totalAEncaisser={totalAEncaisser}
      totalEncaisse={totalEncaisse}
    />
  );
}
