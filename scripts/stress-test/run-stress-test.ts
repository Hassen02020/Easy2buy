/**
 * scripts/stress-test/run-stress-test.ts
 * ----------------------------------------
 * Stress test backend : insère 500 commandes via transactions Drizzle
 * et vérifie les invariants comptables (advance + remaining === total).
 *
 * Usage :
 *   npx tsx scripts/stress-test/run-stress-test.ts
 *   npx tsx scripts/stress-test/run-stress-test.ts --count=100 --concurrency=10
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { generateSimOrders, type SimOrder } from "./generators";
import { generateFinancialReport } from "./report";

// ---------------------------------------------------------------------------
// Configuration CLI
// ---------------------------------------------------------------------------

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace("--", "").split("=");
      return [k, v ?? "true"];
    })
);

const COUNT       = parseInt(args.count       ?? "500", 10);
const CONCURRENCY = parseInt(args.concurrency ?? "20",  10);  // batches parallèles
const DRY_RUN     = args.dry === "true";

// ---------------------------------------------------------------------------
// DB setup (connexion directe, pas le pool serverless)
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL manquant dans les variables d'environnement.");
  process.exit(1);
}

const pgClient = postgres(DATABASE_URL, { max: CONCURRENCY + 2, ssl: "require" });
const db = drizzle(pgClient);

// ---------------------------------------------------------------------------
// Types résultats
// ---------------------------------------------------------------------------

interface InsertResult {
  index:    number;
  orderId:  number | null;
  success:  boolean;
  durationMs: number;
  error?:   string;
}

// ---------------------------------------------------------------------------
// Insertion d'une commande en transaction
// ---------------------------------------------------------------------------

async function insertOneOrder(order: SimOrder, index: number): Promise<InsertResult> {
  const start = Date.now();

  if (DRY_RUN) {
    return { index, orderId: null, success: true, durationMs: 0 };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // ── Insertion commande principale ─────────────────────────────────────
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

      // ── Insertion des lignes de commande ─────────────────────────────────
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

    return {
      index,
      orderId: result,
      success: true,
      durationMs: Date.now() - start,
    };
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

// ---------------------------------------------------------------------------
// Batch runner avec concurrence limitée (évite OOM et pool saturation)
// ---------------------------------------------------------------------------

async function runBatch(
  orders: SimOrder[],
  startIndex: number,
  concurrency: number
): Promise<InsertResult[]> {
  const results: InsertResult[] = [];

  for (let i = 0; i < orders.length; i += concurrency) {
    const batch    = orders.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const total    = Math.ceil(orders.length / concurrency);

    process.stdout.write(`  Batch ${batchNum}/${total} (${batch.length} commandes)…`);

    const batchResults = await Promise.all(
      batch.map((o, j) => insertOneOrder(o, startIndex + i + j))
    );

    const failed = batchResults.filter((r) => !r.success);
    const avgMs  = Math.round(batchResults.reduce((s, r) => s + r.durationMs, 0) / batchResults.length);

    console.log(` ✅ ${batchResults.length - failed.length} ok, ❌ ${failed.length} échecs, ~${avgMs}ms/op`);

    if (failed.length > 0) {
      for (const f of failed) {
        console.error(`    ↳ #${f.index} ERREUR: ${f.error}`);
      }
    }

    results.push(...batchResults);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Assertion comptable
// ---------------------------------------------------------------------------

async function assertPaymentInvariants(orderIds: number[]): Promise<void> {
  console.log("\n📐  Vérification des invariants comptables…");

  const [row] = await db.execute<{
    count_total: string;
    sum_violations: string;
    max_drift: string;
  }>(sql`
    SELECT
      COUNT(*)::text                                           AS count_total,
      COUNT(*) FILTER (
        WHERE ABS(
          (advance_amount::numeric + remaining_amount::numeric) - total::numeric
        ) > 0.001
      )::text                                                  AS sum_violations,
      MAX(ABS(
        (advance_amount::numeric + remaining_amount::numeric) - total::numeric
      ))::text                                                 AS max_drift
    FROM orders
    WHERE id = ANY(${sql.raw(`ARRAY[${orderIds.join(",")}]`)}::int[])
  `);

  const violations = parseInt(row.sum_violations ?? "0", 10);
  const maxDrift   = parseFloat(row.max_drift ?? "0");
  const checked    = parseInt(row.count_total ?? "0", 10);

  console.log(`  ℹ️  Commandes vérifiées : ${checked}`);
  console.log(`  ℹ️  Dérive max advance+remaining vs total : ${maxDrift.toFixed(6)} TND`);

  if (violations === 0) {
    console.log("  ✅  ASSERT OK — advance + remaining === total pour toutes les commandes.");
  } else {
    console.error(`  ❌  ASSERT FAIL — ${violations} commandes ont advance+remaining ≠ total !`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

async function runStressTest(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`🚀  Easy2Buy Stress Test — ${COUNT} commandes, concurrence ${CONCURRENCY}`);
  if (DRY_RUN) console.log("⚠️   DRY RUN activé — aucune écriture en base");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Génération
  console.log(`📦  Génération de ${COUNT} commandes simulées…`);
  const t0 = Date.now();
  const orders = generateSimOrders(COUNT);
  console.log(`  ✅  ${orders.length} commandes générées en ${Date.now() - t0}ms\n`);

  // Statistiques de génération
  const statuses = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const methods = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] ?? 0) + 1;
    return acc;
  }, {});

  console.log("📊  Distribution générée :");
  console.log("  Statuts   :", Object.entries(statuses).map(([k, v]) => `${k}=${v}`).join("  "));
  console.log("  Paiements :", Object.entries(methods).map(([k, v]) => `${k}=${v}`).join("  "));
  console.log();

  // 2. Insertion avec batches limités
  console.log(`💾  Insertion en base (batches de ${CONCURRENCY})…`);
  const t1 = Date.now();
  const results = await runBatch(orders, 0, CONCURRENCY);
  const elapsed = Date.now() - t1;

  const successResults = results.filter((r) => r.success);
  const failResults    = results.filter((r) => !r.success);
  const insertedIds    = successResults.map((r) => r.orderId!).filter(Boolean);
  const avgMs          = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length);
  const throughput     = Math.round((successResults.length / elapsed) * 1000);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📈  Résultats d'insertion :");
  console.log(`  Total     : ${results.length}`);
  console.log(`  ✅ Succès : ${successResults.length}`);
  console.log(`  ❌ Échecs : ${failResults.length}`);
  console.log(`  ⏱  Durée  : ${(elapsed / 1000).toFixed(2)}s`);
  console.log(`  ⚡ Avg    : ${avgMs}ms/commande`);
  console.log(`  🔥 Débit  : ~${throughput} insertions/s`);

  if (failResults.length > 0) {
    console.warn(`\n⚠️   ${failResults.length} TRANSACTIONS ÉCHOUÉES :`);
    failResults.slice(0, 10).forEach((f) => {
      console.warn(`  #${f.index}: ${f.error}`);
    });
    if (failResults.length > 10) {
      console.warn(`  … et ${failResults.length - 10} autres.`);
    }
  }

  // 3. Vérification des invariants (skip si dry run ou 0 insertions)
  if (!DRY_RUN && insertedIds.length > 0) {
    await assertPaymentInvariants(insertedIds);
  }

  // 4. Rapport financier
  console.log("\n📋  Génération du rapport financier…");
  const report = generateFinancialReport(orders);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("💰  RAPPORT FINANCIER — 500 commandes simulées");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  CA total brut             : ${report.totalRevenue.toFixed(3)} TND`);
  console.log(`  Coût d'achat total        : ${report.totalPurchaseCost.toFixed(3)} TND`);
  console.log(`  Frais de livraison total  : ${report.totalDeliveryFees.toFixed(3)} TND`);
  console.log(`  Bénéfice net              : ${report.netProfit.toFixed(3)} TND`);
  console.log(`  Marge nette               : ${report.netMarginPct.toFixed(1)}%`);
  console.log();
  console.log(`  Taux de retour            : ${report.returnRate.toFixed(1)}%`);
  console.log(`  Taux d'annulation         : ${report.cancelRate.toFixed(1)}%`);
  console.log();
  console.log("  Répartition paiement :");
  console.log(`    COD                     : ${report.paymentSplit.COD} (${((report.paymentSplit.COD / COUNT) * 100).toFixed(1)}%)`);
  console.log(`    D17                     : ${report.paymentSplit.D17} (${((report.paymentSplit.D17 / COUNT) * 100).toFixed(1)}%)`);
  console.log(`    Flouci                  : ${report.paymentSplit.FLOUCI} (${((report.paymentSplit.FLOUCI / COUNT) * 100).toFixed(1)}%)`);
  console.log();
  console.log("  Performance livreurs :");
  for (const l of report.livreurPerf) {
    console.log(`    Livreur #${l.livreurId} — ${l.delivered} livraisons, ${l.returned} retours, taux retour ${l.returnRatePct.toFixed(1)}%`);
  }
  console.log();
  console.log("  Top agents (confirmations) :");
  for (const a of report.agentPerf) {
    console.log(`    Agent #${a.agentId} — ${a.confirmed} confirmées, ${a.total} assignées`);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅  Stress test terminé.");

  await pgClient.end();
}

runStressTest().catch((err) => {
  console.error("💥 Erreur fatale :", err);
  process.exit(1);
});
