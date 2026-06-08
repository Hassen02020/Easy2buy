/**
 * scripts/stress-test/report.ts
 * --------------------------------
 * Agrégation financière & analytique des commandes simulées.
 * Fonctionne sur les objets SimOrder en mémoire (sans DB).
 * Peut aussi être appelée avec des données réelles depuis la DB.
 */

import type { SimOrder } from "./generators";

// ---------------------------------------------------------------------------
// Types de rapport
// ---------------------------------------------------------------------------

export interface LivreurPerf {
  livreurId: number;
  delivered:      number;
  returned:       number;
  shipped:        number;
  returnRatePct:  number;
}

export interface AgentPerf {
  agentId:   number;
  total:     number;
  confirmed: number;
}

export interface FinancialReport {
  /** Nombre de commandes analysées */
  orderCount: number;

  /** Chiffre d'affaires brut (somme des totaux) */
  totalRevenue: number;

  /** Coût d'achat fournisseur total */
  totalPurchaseCost: number;

  /** Frais de livraison total */
  totalDeliveryFees: number;

  /** Bénéfice net = CA - coûts achat - frais livraison */
  netProfit: number;

  /** Marge nette (%) */
  netMarginPct: number;

  /** Montant total effectivement encaissé (FULLY_PAID + PARTIAL_PAID advance) */
  totalCollected: number;

  /** Montant restant à encaisser (remaining_amount) */
  totalPending: number;

  /** Taux de retour (RETURNED / total %) */
  returnRate: number;

  /** Taux d'annulation (CANCELLED / total %) */
  cancelRate: number;

  /** Taux de livraison réussie (DELIVERED / total %) */
  deliveryRate: number;

  /** Répartition des modes de paiement */
  paymentSplit: {
    COD:    number;
    D17:    number;
    FLOUCI: number;
  };

  /** Répartition des statuts de paiement */
  paymentStatusSplit: {
    UNPAID:       number;
    PARTIAL_PAID: number;
    FULLY_PAID:   number;
  };

  /** Performance par livreur */
  livreurPerf: LivreurPerf[];

  /** Performance par agent */
  agentPerf: AgentPerf[];

  /** Commande moyenne (panier moyen) */
  averageOrderValue: number;

  /** Produit le plus commandé */
  topProduct: { name: string; qty: number; revenue: number } | null;

  /** Ville avec le plus de commandes */
  topCity: { city: string; count: number } | null;

  /** Vérification des invariants comptables */
  paymentInvariantViolations: number;
  paymentInvariantMaxDriftTND: number;
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Agrège un tableau de SimOrder et retourne un rapport financier complet.
 * Complexité O(n) — une seule passe sur les commandes.
 *
 * @param orders  Tableau de commandes simulées (ou réelles castées)
 */
export function generateFinancialReport(orders: SimOrder[]): FinancialReport {
  const n = orders.length;
  if (n === 0) {
    throw new Error("generateFinancialReport: tableau vide");
  }

  // Accumulateurs
  let totalRevenue      = 0;
  let totalPurchaseCost = 0;
  let totalDeliveryFees = 0;
  let totalCollected    = 0;
  let totalPending      = 0;

  let countReturned   = 0;
  let countCancelled  = 0;
  let countDelivered  = 0;

  const paymentSplit       = { COD: 0, D17: 0, FLOUCI: 0 };
  const paymentStatusSplit = { UNPAID: 0, PARTIAL_PAID: 0, FULLY_PAID: 0 };

  // Maps pour aggrégations multi-dimensionnelles
  const livreurMap = new Map<number, LivreurPerf>();
  const agentMap   = new Map<number, AgentPerf>();
  const productMap = new Map<string, { qty: number; revenue: number }>();
  const cityMap    = new Map<string, number>();

  // Suivi des violations d'invariants comptables
  let invariantViolations = 0;
  let maxDrift = 0;

  for (const o of orders) {
    // ── Comptage statuts ──────────────────────────────────────────────────
    if (o.status === "RETURNED")  countReturned++;
    if (o.status === "CANCELLED") countCancelled++;
    if (o.status === "DELIVERED") countDelivered++;

    // ── Revenus & coûts ───────────────────────────────────────────────────
    // On compte seulement les commandes non-annulées pour le CA
    if (o.status !== "CANCELLED") {
      totalRevenue      += o.total;
      totalDeliveryFees += o.deliveryFee;

      // Coût d'achat = somme des (purchasePrice × qty) de chaque ligne
      const purchaseCost = o.items.reduce(
        (sum, item) => sum + item.purchasePrice * item.quantity, 0
      );
      totalPurchaseCost += purchaseCost;
    }

    // ── Encaissements ─────────────────────────────────────────────────────
    totalCollected += o.advanceAmount;
    totalPending   += o.remainingAmount;

    // ── Modes de paiement ─────────────────────────────────────────────────
    if (o.paymentMethod === "CASH_ON_DELIVERY") paymentSplit.COD++;
    else if (o.paymentMethod === "D17")         paymentSplit.D17++;
    else if (o.paymentMethod === "FLOUCI")      paymentSplit.FLOUCI++;

    // ── Statuts de paiement ───────────────────────────────────────────────
    paymentStatusSplit[o.paymentStatus]++;

    // ── Performance livreurs ──────────────────────────────────────────────
    if (o.deliveredBy !== null) {
      const lId = o.deliveredBy;
      if (!livreurMap.has(lId)) {
        livreurMap.set(lId, { livreurId: lId, delivered: 0, returned: 0, shipped: 0, returnRatePct: 0 });
      }
      const lp = livreurMap.get(lId)!;
      if (o.status === "DELIVERED") lp.delivered++;
      if (o.status === "RETURNED")  lp.returned++;
      if (o.status === "SHIPPED")   lp.shipped++;
    }

    // ── Performance agents ────────────────────────────────────────────────
    if (o.assignedTo !== null) {
      const aId = o.assignedTo;
      if (!agentMap.has(aId)) {
        agentMap.set(aId, { agentId: aId, total: 0, confirmed: 0 });
      }
      const ap = agentMap.get(aId)!;
      ap.total++;
      if (["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"].includes(o.status)) {
        ap.confirmed++;
      }
    }

    // ── Produits populaires ───────────────────────────────────────────────
    for (const item of o.items) {
      const key = item.productName;
      if (!productMap.has(key)) productMap.set(key, { qty: 0, revenue: 0 });
      const pm = productMap.get(key)!;
      pm.qty     += item.quantity;
      pm.revenue += item.lineTotal;
    }

    // ── Villes ───────────────────────────────────────────────────────────
    cityMap.set(o.customerCity, (cityMap.get(o.customerCity) ?? 0) + 1);

    // ── Invariant comptable : advance + remaining ≈ total ────────────────
    const drift = Math.abs((o.advanceAmount + o.remainingAmount) - o.total);
    if (drift > 0.005) {
      invariantViolations++;
      if (drift > maxDrift) maxDrift = drift;
    }
  }

  // ── Post-calcul livreurs ──────────────────────────────────────────────────
  const livreurPerf: LivreurPerf[] = [];
  for (const lp of livreurMap.values()) {
    const totalHandled = lp.delivered + lp.returned + lp.shipped;
    lp.returnRatePct = totalHandled > 0 ? (lp.returned / totalHandled) * 100 : 0;
    livreurPerf.push(lp);
  }
  livreurPerf.sort((a, b) => b.delivered - a.delivered);

  // ── Post-calcul agents ────────────────────────────────────────────────────
  const agentPerf: AgentPerf[] = Array.from(agentMap.values())
    .sort((a, b) => b.confirmed - a.confirmed);

  // ── Top produit ───────────────────────────────────────────────────────────
  let topProduct: FinancialReport["topProduct"] = null;
  for (const [name, data] of productMap.entries()) {
    if (!topProduct || data.qty > topProduct.qty) {
      topProduct = { name, ...data };
    }
  }

  // ── Top ville ─────────────────────────────────────────────────────────────
  let topCity: FinancialReport["topCity"] = null;
  for (const [city, count] of cityMap.entries()) {
    if (!topCity || count > topCity.count) {
      topCity = { city, count };
    }
  }

  const netProfit    = totalRevenue - totalPurchaseCost - totalDeliveryFees;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    orderCount:           n,
    totalRevenue:         Math.round(totalRevenue      * 1000) / 1000,
    totalPurchaseCost:    Math.round(totalPurchaseCost * 1000) / 1000,
    totalDeliveryFees:    Math.round(totalDeliveryFees * 1000) / 1000,
    netProfit:            Math.round(netProfit         * 1000) / 1000,
    netMarginPct:         Math.round(netMarginPct      * 100)  / 100,
    totalCollected:       Math.round(totalCollected    * 1000) / 1000,
    totalPending:         Math.round(totalPending      * 1000) / 1000,
    returnRate:           Math.round((countReturned  / n) * 10000) / 100,
    cancelRate:           Math.round((countCancelled / n) * 10000) / 100,
    deliveryRate:         Math.round((countDelivered / n) * 10000) / 100,
    paymentSplit,
    paymentStatusSplit,
    livreurPerf,
    agentPerf,
    averageOrderValue:    Math.round((totalRevenue / n)  * 1000) / 1000,
    topProduct,
    topCity,
    paymentInvariantViolations:  invariantViolations,
    paymentInvariantMaxDriftTND: Math.round(maxDrift * 1000000) / 1000000,
  };
}
