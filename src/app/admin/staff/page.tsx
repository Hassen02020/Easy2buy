export const dynamic = "force-dynamic";
/**
 * /admin/staff  — Gestion du personnel (ADMIN uniquement)
 */

import { db } from "@/db";
import { staff } from "@/db/schema";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminNav } from "@/components/AdminNav";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/rbac";
import StaffClient from "./StaffClient";
import type { StaffRole } from "@/db/schema";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin/dashboard");

  const members = await db
    .select()
    .from(staff)
    .orderBy(desc(staff.createdAt));

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/staff" role={session.role as StaffRole} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">👥 Gestion du Personnel</h1>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} membres · chaque ID sert à se connecter</p>
          </div>
        </div>
        <StaffClient members={members} currentAdminId={session.id} />
      </div>
    </div>
  );
}
