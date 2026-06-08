import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";

const STATUS_STEPS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Numéro invalide" }, { status: 400 });
  }

  const [order] = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      customerCity: orders.customerCity,
      subtotal: orders.subtotal,
      deliveryFee: orders.deliveryFee,
      total: orders.total,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      advanceAmount: orders.advanceAmount,
      remainingAmount: orders.remainingAmount,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // Ne pas exposer les infos si annulée/retournée — retourner statut minimal
  if (order.status === "CANCELLED" || order.status === "RETURNED") {
    return NextResponse.json({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      items: [],
      cancelled: true,
    });
  }

  const items = await db
    .select({
      productName: orderItems.productName,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const currentStep = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

  return NextResponse.json({
    id: order.id,
    customerName: order.customerName,
    customerCity: order.customerCity,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    advanceAmount: order.advanceAmount,
    remainingAmount: order.remainingAmount,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    items,
    currentStep,
    totalSteps: STATUS_STEPS.length,
    canPrintInvoice:
      order.paymentStatus === "FULLY_PAID" ||
      (order.status === "DELIVERED" && order.paymentMethod === "CASH_ON_DELIVERY"),
  });
}
