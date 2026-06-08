/**
 * PATCH /api/orders/[id]/status
 * --------------------------------
 * Met à jour le statut d'une commande via la machine d'état.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateOrderStatus, InvalidTransitionError, OrderNotFoundError } from "@/lib/order-status";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Statut invalide", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const updated = await updateOrderStatus(orderId, parsed.data.status);
    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[PATCH /api/orders/status]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
