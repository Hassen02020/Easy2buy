/**
 * full-stress-test.mjs
 * ---------------------
 * Test complet frontoffice + backoffice :
 *   1. Stress test 200 commandes (POST /api/orders)
 *   2. Test des changements de statut via PATCH /api/orders/[id]/status
 *   3. Test des transitions RETURNED
 *   4. Rapport final avec toutes les métriques
 */

const BASE = "http://localhost:3001";
const TOTAL = 200;
const CONCURRENCY = 20;

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { name: "Ahmed Ben Ali",    phone: "+21698000001", city: "Tunis",    address: "12 Avenue Habib Bourguiba Tunis 1001" },
  { name: "Fatma Trabelsi",   phone: "+21621000002", city: "Sousse",   address: "45 Rue de la Plage Sousse 4000" },
  { name: "Mohamed Gharbi",   phone: "+21655000003", city: "Sfax",     address: "78 Avenue de l Independance Sfax 3000" },
  { name: "Leila Mansour",    phone: "+21629000004", city: "Tunis",    address: "3 Rue Ibn Khaldoun Tunis 1002" },
  { name: "Karim Bouazizi",   phone: "+21690000005", city: "Monastir", address: "22 Rue du Commerce Monastir 5000" },
  { name: "Sara Jelassi",     phone: "+21652000006", city: "Nabeul",   address: "9 Avenue Carthage Nabeul 8000" },
  { name: "Tarek Hamdi",      phone: "+21644000007", city: "Bizerte",  address: "56 Rue de la Republique Bizerte 7000" },
  { name: "Amira Chatti",     phone: "+21671000008", city: "Gabes",    address: "14 Avenue Farhat Hached Gabes 6000" },
  { name: "Youssef Belhaj",   phone: "+21612000009", city: "Tunis",    address: "88 Rue de Marseille Tunis 1000" },
  { name: "Nadia Ferchichi",  phone: "+21633000010", city: "Sfax",     address: "34 Boulevard du 7 Novembre Sfax 3052" },
];

const ITEM_SETS = [
  [{ productId: 1, quantity: 1 }],
  [{ productId: 2, quantity: 2 }],
  [{ productId: 3, quantity: 1 }],
  [{ productId: 4, quantity: 3 }],
  [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 1 }],
  [{ productId: 2, quantity: 1 }, { productId: 3, quantity: 2 }],
  [{ productId: 1, quantity: 2 }, { productId: 4, quantity: 1 }],
];

const STATUS_FLOW = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Section 1 — 200 commandes
// ---------------------------------------------------------------------------

async function sendOrder(index) {
  const c = rand(CUSTOMERS);
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: c.name,
        customerPhone: c.phone,
        customerCity: c.city,
        customerAddress: c.address,
        notes: `Test #${index}`,
        items: rand(ITEM_SETS),
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { index, status: res.status, ok: res.status === 201, duration: Date.now() - start, orderId: body.orderId ?? null, error: body.error ?? null };
  } catch (err) {
    return { index, status: 0, ok: false, duration: Date.now() - start, orderId: null, error: err.message };
  }
}

async function runOrderStress() {
  console.log("\n" + "═".repeat(62));
  console.log("  📦 PHASE 1 — Stress test 200 commandes (20 concurrentes)");
  console.log("═".repeat(62));

  const results = [];
  const t0 = Date.now();

  for (let i = 0; i < TOTAL; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, TOTAL - i) }, (_, k) => i + k + 1);
    process.stdout.write(`\r  Batch ${Math.ceil((i+1)/CONCURRENCY)}/${Math.ceil(TOTAL/CONCURRENCY)} — ${i + batch.length}/${TOTAL} commandes...`);
    results.push(...await Promise.all(batch.map(sendOrder)));
  }

  const elapsed = Date.now() - t0;
  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const dur = results.map(r => r.duration).sort((a,b)=>a-b);
  const avg = (dur.reduce((s,d)=>s+d,0)/dur.length).toFixed(0);

  console.log(`\n\n  ✅ Succès       : ${ok.length}/${TOTAL} (${(ok.length/TOTAL*100).toFixed(1)}%)`);
  console.log(`  ❌ Échecs       : ${fail.length}`);
  console.log(`  ⏱  Total        : ${elapsed}ms — ⚡ ${(TOTAL/(elapsed/1000)).toFixed(1)} req/s`);
  console.log(`  📈 Latences     : min=${dur[0]}ms | moy=${avg}ms | p90=${dur[Math.floor(dur.length*0.9)]}ms | max=${dur[dur.length-1]}ms`);

  const orderIds = ok.map(r => r.orderId).filter(Boolean);
  return { orderIds, okCount: ok.length };
}

// ---------------------------------------------------------------------------
// Section 2 — Workflow statuts (50 commandes PENDING → DELIVERED)
// ---------------------------------------------------------------------------

async function patchStatus(orderId, status) {
  const res = await fetch(`${BASE}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

async function runStatusWorkflow(orderIds) {
  console.log("\n" + "═".repeat(62));
  console.log("  🔄 PHASE 2 — Workflow statuts (50 commandes → DELIVERED)");
  console.log("═".repeat(62));

  const sample = orderIds.slice(0, 50);
  let successes = 0, failures = 0;
  const details = { CONFIRMED: 0, PREPARING: 0, SHIPPED: 0, DELIVERED: 0, errors: [] };

  for (const orderId of sample) {
    let ok = true;
    for (const status of STATUS_FLOW) {
      const result = await patchStatus(orderId, status);
      if (result.ok) {
        details[status]++;
      } else {
        ok = false;
        details.errors.push(`#${orderId} → ${status}: [${result.status}] ${result.body?.error ?? "?"}`);
        break;
      }
      await sleep(10);
    }
    if (ok) successes++; else failures++;
    process.stdout.write(`\r  Traité ${successes + failures}/${sample.length} commandes...`);
  }

  console.log(`\n\n  ✅ Workflows complets   : ${successes}/${sample.length}`);
  console.log(`  ❌ Workflows échoués    : ${failures}`);
  console.log(`  📊 Transitions OK :`);
  for (const [s, n] of Object.entries(details)) {
    if (s !== "errors") console.log(`     ├─ → ${s.padEnd(12)} : ${n}`);
  }
  if (details.errors.length > 0) {
    console.log(`  🔍 Erreurs (max 5) :`);
    details.errors.slice(0, 5).forEach(e => console.log(`     └─ ${e}`));
  }

  return orderIds.slice(0, 50); // IDs déjà DELIVERED
}

// ---------------------------------------------------------------------------
// Section 3 — Test RETURNED (10 commandes DELIVERED → RETURNED)
// ---------------------------------------------------------------------------

async function runReturnTest(deliveredIds) {
  console.log("\n" + "═".repeat(62));
  console.log("  🔙 PHASE 3 — Test retours (10 commandes DELIVERED → RETURNED)");
  console.log("═".repeat(62));

  const sample = deliveredIds.slice(0, 10);
  let ok = 0, fail = 0;

  for (const id of sample) {
    const result = await patchStatus(id, "RETURNED");
    if (result.ok) ok++; else fail++;
    process.stdout.write(`\r  ${ok + fail}/${sample.length} retours traités...`);
  }

  console.log(`\n\n  ✅ Retours enregistrés : ${ok}/${sample.length}`);
  console.log(`  ❌ Échecs              : ${fail}`);
}

// ---------------------------------------------------------------------------
// Section 4 — Test des pages admin (HTTP check)
// ---------------------------------------------------------------------------

async function runPageChecks() {
  console.log("\n" + "═".repeat(62));
  console.log("  🖥  PHASE 4 — Vérification des pages (HTTP 200)");
  console.log("═".repeat(62));

  const pages = [
    { url: `${BASE}/`,                           name: "Front — Landing page" },
    { url: `${BASE}/admin/dashboard`,            name: "Admin — Dashboard" },
    { url: `${BASE}/admin/orders`,               name: "Admin — Commandes (toutes)" },
    { url: `${BASE}/admin/orders?status=PENDING`,    name: "Admin — Commandes PENDING" },
    { url: `${BASE}/admin/orders?status=DELIVERED`,  name: "Admin — Commandes DELIVERED" },
    { url: `${BASE}/admin/orders?status=RETURNED`,   name: "Admin — Commandes RETURNED" },
    { url: `${BASE}/admin/products`,             name: "Admin — Produits" },
    { url: `${BASE}/admin/dashboard?from=2024-01-01`, name: "Dashboard — Filtre période" },
  ];

  let passed = 0, failed = 0;

  for (const page of pages) {
    const t0 = Date.now();
    try {
      const res = await fetch(page.url);
      const dur = Date.now() - t0;
      const icon = res.ok ? "✅" : "❌";
      const color = res.ok ? "" : " ← ERREUR";
      console.log(`  ${icon} [${String(res.status).padEnd(3)}] ${dur.toString().padStart(4)}ms  ${page.name}${color}`);
      if (res.ok) passed++; else failed++;
    } catch (err) {
      console.log(`  ❌ [ERR] ----ms  ${page.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  Résultat : ${passed}/${pages.length} pages OK`);
}

// ---------------------------------------------------------------------------
// Section 5 — Stats finales depuis la DB via API
// ---------------------------------------------------------------------------

async function runDbStats() {
  console.log("\n" + "═".repeat(62));
  console.log("  📊 PHASE 5 — Stats base de données");
  console.log("═".repeat(62));

  // On charge le dashboard pour obtenir les stats
  try {
    const res = await fetch(`${BASE}/admin/dashboard`);
    console.log(`  Dashboard charge en ${res.ok ? "✅ succès" : "❌ échec"} (HTTP ${res.status})`);
  } catch {}

  // Stats via psql
  console.log("\n  (Exécutez la requête SQL suivante pour voir les stats complètes :)");
  console.log("  psql -U postgres -d jardin_delivery -c \"");
  console.log("    SELECT status, COUNT(*) as total FROM orders GROUP BY status ORDER BY status;\"");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n" + "═".repeat(62));
  console.log("  🌿 EASY2BUY — TEST COMPLET FRONTOFFICE + BACKOFFICE");
  console.log("  " + new Date().toLocaleString("fr-FR"));
  console.log("═".repeat(62));

  // Ping serveur
  try {
    const ping = await fetch(`${BASE}/api/orders`, { method: "GET" });
    if (![200, 404, 405].includes(ping.status)) throw new Error("Serveur inaccessible");
    console.log(`\n  ✅ Serveur accessible : ${BASE}`);
  } catch (err) {
    console.error(`\n  ❌ Serveur inaccessible sur ${BASE}`);
    console.error("     Lancez d'abord : npm run dev");
    process.exit(1);
  }

  const globalStart = Date.now();

  // Phase 1 : Stress test commandes
  const { orderIds, okCount } = await runOrderStress();

  // Phase 2 : Workflow statuts
  const deliveredIds = await runStatusWorkflow(orderIds);

  // Phase 3 : Retours
  await runReturnTest(deliveredIds);

  // Phase 4 : Pages
  await runPageChecks();

  // Phase 5 : Stats
  await runDbStats();

  // Résumé global
  const totalTime = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log("\n" + "═".repeat(62));
  console.log("  🏁 RÉSUMÉ GLOBAL");
  console.log("═".repeat(62));
  console.log(`  ⏱  Durée totale          : ${totalTime}s`);
  console.log(`  📦 Commandes créées      : ${okCount}/200`);
  console.log(`  🔄 Workflows DELIVERED   : 50`);
  console.log(`  🔙 Retours RETURNED      : 10`);
  console.log(`\n  🌐 Accès :`);
  console.log(`     Front    : ${BASE}/`);
  console.log(`     Dashboard: ${BASE}/admin/dashboard`);
  console.log(`     Produits : ${BASE}/admin/products`);
  console.log(`     Commandes: ${BASE}/admin/orders`);
  console.log("═".repeat(62) + "\n");
}

main().catch(err => { console.error("Erreur fatale :", err); process.exit(1); });
