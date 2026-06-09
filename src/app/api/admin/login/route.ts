import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultRedirect } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { staffId } = await req.json().catch(() => ({}));
  if (!staffId || isNaN(Number(staffId))) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const [member] = await db
    .select({ id: staff.id, name: staff.name, role: staff.role, active: staff.active })
    .from(staff)
    .where(eq(staff.id, Number(staffId)));

  if (!member || !member.active) {
    return NextResponse.json({ error: "Staff introuvable ou inactif" }, { status: 404 });
  }

  const redirect = defaultRedirect(member.role);

  const res = NextResponse.json({ success: true, role: member.role, redirect });
  res.cookies.set("staffId", String(member.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  // Cookie rôle lisible par le middleware Edge (non sensible — pas de données privées)
  res.cookies.set("staffRole", member.role, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
