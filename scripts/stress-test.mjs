/**
 * stress-test.mjs
 * ----------------
 * Stress test : 200 commandes simulées via POST /api/orders
 * Nécessite que le serveur Next.js soit en cours d'exécution.
 *
 * Usage : node scripts/stress-test.mjs
 */

const BASE_URL = "http://localhost:3001";
const TOTAL_ORDERS = 200;
const CONCURRENCY = 20; // envois simultanés par batch

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { name: "Ahmed Ben Ali", phone: "+21698000001", city: "Tunis", address: "12 Avenue Habib Bourguiba, Tunis 1001" },
  { name: "Fatma Trabelsi", phone: "+21621000002", city: "Sousse", address: "45 Rue de la Plage, Sousse 4000" },
  { name: "Mohamed Gharbi", phone: "+21655000003", city: "Sfax", address: "78 Avenue de l'Indépendance, Sfax 3000" },
  { name: "Leila Mansour", phone: "+21629000004", city: "Tunis", address: "3 Rue Ibn Khaldoun, Tunis 1002" },
  { name: "Karim Bouazizi", phone: "+21690000005", city: "Monastir", address: "22 Rue du Commerce, Monastir 5000" },
  { name: "Sara Jelassi", phone: "+21652000006", city: "Nabeul", address: "9 Avenue Carthage, Nabeul 8000" },
  { name: "Tarek Hamdi", phone: "+21644000007", city: "Bizerte", address: "56 Rue de la République, Bizerte 7000" },
  { name: "Amira Chatti", phone: "+21671000008", city: "Gabes", address: "14 Avenue Farhat Hached, Gabes 6000" },
];

// Products IDs seront récupérés depuis la DB via l'API
// Pour le test, on utilise des IDs fictifs (1 et 2)
// L'API retournera 404/409 si le produit n'existe pas — on mesure aussi les erreurs
const ITEM_VARIANTS = [
  [{ productId: 1, quantity: 1 }],
  [{ productId: 1, quantity: 2 }],
  [{ productId: 2, quantity: 1 }],
  [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
];

function randomCustomer() {
  return CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
}

function randomItems() {
  return ITEM_VARIANTS[Math.floor(Math.random() * ITEM_VARIANTS.length)];
}

// ---------------------------------------------------------------------------
// Seed : créer les produits de test via la DB directement
// ---------------------------------------------------------------------------

async function seedProducts() {
  console.log("🌱 Seed des produits de test...");

  // On vérifie d'abord si le serveur répond
  try {
    const ping = await fetch(`${BASE_URL}/api/orders`, { method: "GET" });
    // 405 = route existe mais GET non supporté = serveur UP
    if (ping.status !== 405 && ping.status !== 200 && ping.status !== 404) {
      throw new Error(`Serveur inaccessible (status: ${ping.status})`);
    }
  } catch (err) {
    if (err.message.includes("fetch failed") || err.code === "ECONNREFUSED") {
      console.error("❌ Serveur Next.js inaccessible sur", BASE_URL);
      console.error("   Lancez d'abord : npm run dev");
      process.exit(1);
    }
  }

  console.log(`✅ Serveur accessible sur ${BASE_URL}`);
}

// ---------------------------------------------------------------------------
// Envoyer une commande
// ---------------------------------------------------------------------------

async function sendOrder(index) {
  const customer = randomCustomer();
  const items = randomItems();
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerCity: customer.city,
        customerAddress: customer.address,
        notes: `Commande stress test #${index}`,
        items,
      }),
    });

    const duration = Date.now() - start;
    const body = await res.json().catch(() => ({}));

    return {
      index,
      status: res.status,
      ok: res.status === 201,
      duration,
      orderId: body.orderId ?? null,
      error: body.error ?? null,
    };
  } catch (err) {
    return {
      index,
      status: 0,
      ok: false,
      duration: Date.now() - start,
      orderId: null,
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Exécution par batches
// ---------------------------------------------------------------------------

async function runBatch(indices) {
  return Promise.all(indices.map((i) => sendOrder(i)));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  🚀 STRESS TEST — JardinDelivery API");
  console.log("  " + new Date().toLocaleString("fr-FR"));
  console.log("═".repeat(60));
  console.log(`  Total commandes : ${TOTAL_ORDERS}`);
  console.log(`  Concurrence     : ${CONCURRENCY} req/batch`);
  console.log(`  Endpoint        : POST ${BASE_URL}/api/orders`);
  console.log("═".repeat(60) + "\n");

  await seedProducts();

  const results = [];
  const globalStart = Date.now();

  for (let i = 0; i < TOTAL_ORDERS; i += CONCURRENCY) {
    const batchIndices = Array.from(
      { length: Math.min(CONCURRENCY, TOTAL_ORDERS - i) },
      (_, k) => i + k + 1
    );

    process.stdout.write(`\r  Envoi batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(TOTAL_ORDERS / CONCURRENCY)} (${i + batchIndices.length}/${TOTAL_ORDERS})...`);

    const batchResults = await runBatch(batchIndices);
    results.push(...batchResults);
  }

  const totalDuration = Date.now() - globalStart;
  console.log("\n");

  // ---------------------------------------------------------------------------
  // Analyse des résultats
  // ---------------------------------------------------------------------------

  const successful   = results.filter((r) => r.ok);
  const failed       = results.filter((r) => !r.ok);
  const stockErrors  = failed.filter((r) => r.status === 409);
  const serverErrors = failed.filter((r) => r.status === 500 || r.status === 0);
  const validationErrors = failed.filter((r) => r.status === 422);

  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p90 = durations[Math.floor(durations.length * 0.9)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  const throughput = (TOTAL_ORDERS / (totalDuration / 1000)).toFixed(1);

  console.log("═".repeat(60));
  console.log("  📊 RÉSULTATS DU STRESS TEST");
  console.log("═".repeat(60));
  console.log(`\n  ⏱  Durée totale        : ${totalDuration} ms (${(totalDuration / 1000).toFixed(2)} s)`);
  console.log(`  ⚡ Débit               : ${throughput} req/s`);
  console.log(`\n  ✅ Succès (201)        : ${successful.length} / ${TOTAL_ORDERS} (${((successful.length / TOTAL_ORDERS) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Échecs totaux       : ${failed.length} / ${TOTAL_ORDERS}`);
  if (stockErrors.length)   console.log(`     ├─ Stock insuffisant (409) : ${stockErrors.length}`);
  if (validationErrors.length) console.log(`     ├─ Validation (422)       : ${validationErrors.length}`);
  if (serverErrors.length)  console.log(`     └─ Erreurs serveur (500/0) : ${serverErrors.length}`);

  console.log(`\n  📈 Latences`);
  console.log(`     ├─ Min    : ${minDuration} ms`);
  console.log(`     ├─ Moy    : ${avgDuration.toFixed(0)} ms`);
  console.log(`     ├─ P50    : ${p50} ms`);
  console.log(`     ├─ P90    : ${p90} ms`);
  console.log(`     ├─ P99    : ${p99} ms`);
  console.log(`     └─ Max    : ${maxDuration} ms`);

  // Histogramme des codes de statut
  const statusMap = {};
  for (const r of results) {
    statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
  }
  console.log(`\n  📋 Codes HTTP reçus`);
  for (const [code, cnt] of Object.entries(statusMap).sort()) {
    const bar = "█".repeat(Math.round((cnt / TOTAL_ORDERS) * 30));
    const pct = ((cnt / TOTAL_ORDERS) * 100).toFixed(1);
    console.log(`     ├─ HTTP ${code} : ${String(cnt).padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  }

  // Quelques exemples d'erreurs
  if (failed.length > 0 && failed.length <= 10) {
    console.log(`\n  🔍 Détail des erreurs`);
    for (const f of failed.slice(0, 5)) {
      console.log(`     ├─ #${f.index} [${f.status}] ${f.error ?? "sans message"}`);
    }
  }

  // Résumé final
  console.log("\n" + "═".repeat(60));
  if (serverErrors.length === 0 && failed.length <= stockErrors.length + validationErrors.length) {
    console.log("  🟢 RÉSULTAT : API stable — aucune erreur serveur");
  } else {
    console.log("  🔴 RÉSULTAT : Erreurs serveur détectées — vérifier les logs");
  }
  console.log("═".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
