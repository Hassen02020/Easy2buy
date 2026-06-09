"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

const staffSchema = z.object({
  id:    z.coerce.number().optional(),
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  role:  z.enum(["ADMIN", "AGENT", "LIVREUR"]),
});

export async function createStaff(fd: FormData) {
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { name, email, phone, role } = parsed.data;
  try {
    await db.insert(staff).values({ name, email, phone: phone || null, role, active: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) return { error: "Cet email est déjà utilisé." };
    return { error: "Erreur lors de la création." };
  }
  revalidatePath("/admin/staff");
}

export async function updateStaff(fd: FormData) {
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { id, name, email, phone, role } = parsed.data;
  if (!id) return { error: "ID manquant" };

  try {
    await db.update(staff).set({ name, email, phone: phone || null, role }).where(eq(staff.id, id));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unique") || msg.includes("duplicate")) return { error: "Cet email est déjà utilisé." };
    return { error: "Erreur lors de la mise à jour." };
  }
  revalidatePath("/admin/staff");
}

export async function toggleStaffActive(fd: FormData) {
  const id     = parseInt(fd.get("id") as string, 10);
  const active = fd.get("active") === "true";
  if (isNaN(id)) return;
  await db.update(staff).set({ active }).where(eq(staff.id, id));
  revalidatePath("/admin/staff");
}
