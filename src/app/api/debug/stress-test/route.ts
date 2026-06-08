/**
 * GET /api/debug/stress-test?count=500&concurrency=20&dryRun=true
 * -----------------------------------------------------------------
 * API route de debug pour déclencher le stress test via HTTP.
 * ⚠️  Accessible uniquement en développement (NODE_ENV !== "production").
 *
 * Query params :
 *   count       = nombre de commandes (défaut 500)
 *   concurrency = taille des batches parallèles (défaut 20)
 *   dryRun      = "true" pour simuler sans écrire en DB (défaut false)
 *   reportOnly  = "true" pour générer uniquement le rapport sans insertion
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { generateSimOrders } from "../../../../../scripts/stress-test/generators";
import { generateFinancialReport } from "../../../../../scripts/stress-test/report";

// Guard de sécurité
if (process.env.NODE_ENV === "production") {
  // La vérification se fait dans le handler, pas au niveau module
}

// ---------------------------------------------------------------------------
// Batch insert avec concurrence contrôlée
// ---------------------------------------------------------------------------

interface InsertResult {
  index:      number;
  orderId:    number | null;
  success:    boolean;
  durationMs: number;
  error?:     string;
}

async function insertOneOrderTx(
  order: ReturnType<typeof generateSimOrders>[0],
  index: number
): Promise<InsertResult> {
  const start = Date.now();
  try {
    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.execute<{ id: number }>(sql`
        INSERT INTO orders (
          customer_name, customer_phone, customer_city, customer_address,
          subtotal, delivery_fee, total,
          status, payment_method, payment_status,
          advance_amount, remaining_amount,
          assigned_to, delivered_by,
          created_at, updated_at
        ) VALUES (
          ${order.customerName}, ${order.customerPhone},
          ${order.customerCity}, ${order.customerAddress},
          ${order.subtotal.toFixed(2)}, ${order.deliveryFee.toFixed(2)},
          ${order.total.toFixed(2)},
          ${order.status}::order_status,
          ${order.paymentMethod}::payment_method,
          ${order.paymentStatus}::payment_status,
          ${order.advanceAmount.toFixed(3)}, ${order.remainingAmount.toFixed(3)},
          ${order.assignedTo}, ${order.deliveredBy},
          ${order.createdAt.toISOString()}, NOW()
        )
        RETURNING id
      `);

      const orderId = inserted.id;

      for (const item of order.items) {
        await tx.execute(sql`
          INSERT INTO order_items (
            order_id, product_id, product_name,
            unit_price, purchase_price,
            quantity, line_total, profit_line
          ) VALUES (
            ${orderId}, ${item.productId}, ${item.productName},
            ${item.unitPrice.toFixed(2)}, ${item.purchasePrice.toFixed(2)},
            ${item.quantity},
            ${item.lineTotal.toFixed(2)}, ${item.profitLine.toFixed(2)}
          )
        `);
      }

      return orderId;
    });

    return { index, orderId: result, success: true, durationMs: Date.now() - start };
  } catch (err) {
    return {
      index,
      orderId: null,
      success: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runBatches(
  orders: ReturnType<typeof generateSimOrders>,
  concurrency: number
): Promise<InsertResult[]> {
  const all: InsertResult[] = [];
  for (let i = 0; i < orders.length; i += concurrency) {
    const batch = orders.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((o, j) => insertOneOrderTx(o, i + j)));
    all.push(...results);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Bloquer en production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Cette route de debug est désactivée en production." },
      { status: 403 }
    );
  }

  const sp         = req.nextUrl.searchParams;
  const count       = Math.min(parseInt(sp.get("count")       ?? "500", 10), 2000);
  const concurrency = Math.min(parseInt(sp.get("concurrency") ?? "20",  10), 50);
  const dryRun      = sp.get("dryRun")      === "true";
  const reportOnly  = sp.get("reportOnly")  === "true";

  const tStart = Date.now();

  // 1. Génération
  const orders = generateSimOrders(count);

  // 2. Rapport en mémoire (sans DB)
  const report = generateFinancialReport(orders);

  if (reportOnly || dryRun) {
    return NextResponse.json({
      mode:       dryRun ? "dry_run" : "report_only",
      generated:  count,
      durationMs: Date.now() - tStart,
      report,
    });
  }

  // 3. Insertion réelle
  const insertResults = await runBatches(orders, concurrency);

  const succeeded  = insertResults.filter((r) => r.success);
  const failed     = insertResults.filter((r) => !r.success);
  const insertedIds = succeeded.map((r) => r.orderId!).filter(Boolean);

  // 4. Vérification invariants comptables en DB
  let dbAssert: {
    checked:    number;
    violations: number;
    maxDrift:   number;
    passed:     boolean;
  } | null = null;

  if (insertedIds.length > 0) {
    const [row] = await db.execute<{
      count_total:    string;
      sum_violations: string;
      max_drift:      string;
    }>(sql`
      SELECT
        COUNT(*)::text AS count_total,
        COUNT(*) FILTER (
          WHERE ABS(
            (advance_amount::numeric + remaining_amount::numeric) - total::numeric
          ) > 0.001
        )::text AS sum_violations,
        MAX(ABS(
          (advance_amount::numeric + remaining_amount::numeric) - total::numeric
        ))::text AS max_drift
      FROM orders
      WHERE id = ANY(${sql.raw(`ARRAY[${insertedIds.join(",")}]`)}::int[])
    `);

    const violations = parseInt(row.sum_violations ?? "0", 10);
    dbAssert = {
      checked:    parseInt(row.count_total ?? "0", 10),
      violations,
      maxDrift:   parseFloat(row.max_drift ?? "0"),
      passed:     violations === 0,
    };
  }

  const totalMs   = Date.now() - tStart;
  const avgMs     = Math.round(insertResults.reduce((s, r) => s + r.durationMs, 0) / insertResults.length);
  const throughput = Math.round((succeeded.length / totalMs) * 1000);

  return NextResponse.json({
    mode:        "live",
    generated:   count,
    succeeded:   succeeded.length,
    failed:      failed.length,
    failedDetails: failed.slice(0, 20).map((f) => ({
      index: f.index,
      error: f.error,
    })),
    performance: {
      totalMs,
      avgMsPerOrder: avgMs,
      throughputPerSec: throughput,
    },
    dbAssert,
    report,
  });
}
