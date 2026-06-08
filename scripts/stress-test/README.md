# Easy2Buy — Stress Test 500 commandes/24h

## Architecture

```
scripts/stress-test/
├── generators.ts        # Génération aléatoire de 500 SimOrder
├── run-stress-test.ts   # Runner CLI : insère en DB + assertions + rapport
└── report.ts            # generateFinancialReport() — agrégation O(n)

src/app/api/debug/stress-test/
└── route.ts             # GET /api/debug/stress-test (dev uniquement)
```

---

## Modes d'exécution

### 1. CLI (recommandé)

```bash
# Installer tsx si absent
npm install

# Dry run — génère 500 commandes + rapport sans toucher la DB
npm run stress:dry

# Run réel — insère 50 commandes (test rapide)
npm run stress:small

# Run réel — insère 500 commandes, batches de 20
npm run stress:run

# Options avancées
npx tsx scripts/stress-test/run-stress-test.ts \
  --count=500 \
  --concurrency=30 \
  --dry=false
```

### 2. API Route (dev local uniquement)

```
# Rapport seul, sans DB
GET /api/debug/stress-test?count=500&reportOnly=true

# Dry run
GET /api/debug/stress-test?count=500&dryRun=true

# Insertion réelle, batches de 20
GET /api/debug/stress-test?count=500&concurrency=20
```

> ⛔ La route retourne `403` en `NODE_ENV=production`.

---

## Ce que vérifie le stress test

### 1. Transactions Drizzle (verrous DB)
- Chaque commande est insérée dans une **transaction ACID** séparée.
- Les batches s'exécutent en `Promise.all` limité (`concurrency` max 50).
- Les erreurs de transaction sont isolées — une erreur n'annule pas les autres.

### 2. Invariant comptable (ASSERT)
Après insertion, requête SQL de vérification :
```sql
SELECT COUNT(*) FILTER (
  WHERE ABS((advance_amount + remaining_amount) - total) > 0.001
) AS violations
FROM orders WHERE id = ANY($ids)
```
**PASS** = 0 violations → `advance + remaining === total` pour chaque commande.

### 3. Rapport financier (`generateFinancialReport`)

| Métrique | Description |
|----------|-------------|
| `totalRevenue` | CA brut hors annulées |
| `netProfit` | CA − coûts achat − frais livraison |
| `netMarginPct` | Marge nette (%) |
| `returnRate` | % commandes RETURNED |
| `cancelRate` | % commandes CANCELLED |
| `paymentSplit` | Répartition COD / D17 / FLOUCI |
| `livreurPerf` | Livraisons / retours par livreur |
| `agentPerf` | Confirmations par agent |
| `topProduct` | Produit le plus commandé |
| `topCity` | Ville avec le plus de commandes |

---

## Distribution des données générées

| Statut | Probabilité |
|--------|-------------|
| DELIVERED | 40% |
| PENDING | 20% |
| CONFIRMED | 15% |
| PREPARING | 10% |
| SHIPPED | 5% |
| CANCELLED | 5% |
| RETURNED | 5% |

| Paiement | Probabilité |
|----------|-------------|
| CASH_ON_DELIVERY | 55% |
| D17 | 25% |
| FLOUCI | 20% |

---

## Exemple de sortie

```
🚀  Easy2Buy Stress Test — 500 commandes, concurrence 20
📦  Génération de 500 commandes simulées…
  ✅  500 commandes générées en 12ms

  Batch 1/25 (20 commandes)… ✅ 20 ok, ❌ 0 échecs, ~48ms/op
  Batch 2/25 (20 commandes)… ✅ 20 ok, ❌ 0 échecs, ~51ms/op
  …

📈  Résultats d'insertion :
  Total     : 500
  ✅ Succès : 500
  ❌ Échecs : 0
  ⏱  Durée  : 6.24s
  ⚡ Avg    : 49ms/commande
  🔥 Débit  : ~80 insertions/s

📐  Vérification des invariants comptables…
  ✅  ASSERT OK — advance + remaining === total pour toutes les commandes.

💰  RAPPORT FINANCIER — 500 commandes simulées
  CA total brut             : 22 847.000 TND
  Bénéfice net              : 9 104.200 TND
  Marge nette               : 39.8%
  Taux de retour            : 5.0%
  Performance livreurs :
    Livreur #4 — 72 livraisons, 9 retours, taux retour 11.1%
    …
```
