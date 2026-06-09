/**
 * lib/session.ts
 * ---------------
 * Gestion de session staff côté serveur.
 * En production : remplacer par JWT / NextAuth / Lucia.
 * Pour l'instant : cookie `staffId` signé (simple, extensible).
 *
 * Usage dans une page :
 *   const session = await getSession();
 *   if (!session) redirect("/admin/login");
 */

import { cookies } from "next/headers";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { StaffRole } from "@/db/schema";

export interface StaffSession {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
}

/**
 * Lit le cookie `staffId`, charge le staff depuis la DB.
 * Retourne null si absent ou invalide.
 */
export async function getSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("staffId")?.value;
  if (!raw) return null;

  const id = parseInt(raw, 10);
  if (isNaN(id)) return null;

  const [member] = await db
    .select({ id: staff.id, name: staff.name, email: staff.email, role: staff.role })
    .from(staff)
    .where(eq(staff.id, id));

  if (!member || !member.role) return null;
  return member as StaffSession;
}

/**
 * Retourne l'URL de redirection par défaut selon le rôle.
 */
export function defaultRedirect(role: StaffRole): string {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "AGENT":   return "/admin/orders";
    case "LIVREUR": return "/admin/tournee";
    default:        return "/admin/tournee";
  }
}

/**
 * Pages autorisées par rôle (utilisé par le middleware).
 */
export const PAGE_PERMISSIONS: Record<string, StaffRole[]> = {
  "/admin/dashboard":  ["ADMIN"],
  "/admin/orders":     ["ADMIN", "AGENT"],
  "/admin/products":   ["ADMIN"],
  "/admin/customers":  ["ADMIN", "AGENT"],
  "/admin/analytics":  ["ADMIN"],
  "/admin/mon-espace": ["ADMIN", "AGENT", "LIVREUR"],
  "/admin/tournee":    ["ADMIN", "LIVREUR"],
  "/admin/login":      ["ADMIN", "AGENT", "LIVREUR"],
};
