/**
 * lib/profitability.ts
 * ---------------------
 * Fonctions utilitaires de calcul de rentabilité.
 *
 * Formule de base :
 *   Bénéfice net commande = Σ(selling_price - purchase_price) × qty
 *                         - delivery_fee
 *                         - packaging_cost (fixe par commande)
 *                         - advertising_cost (% du CA)
 *
 * Toutes les valeurs sont manipulées en nombres décimaux précis
 * (on reçoit des strings depuis Drizzle pour les colonnes NUMERIC).
 */

// ---------------------------------------------------------------------------
// Paramètres de charges estimées (modifiables)
// ---------------------------------------------------------------------------

export const COST_CONFIG = {
  packagingPerOrder: 1.5,   // TND — coût emballage fixe par commande
  advertisingRatePct: 5,    // %  — charge pub/marketing sur le CA
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderItemProfit {
  productName: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  lineTotal: number;
  profitLine: number;
  marginPct: number; // % de marge brute sur cette ligne
}

export interface OrderProfitSummary {
  orderId: number;
  grossProfit: number;      // Σ profitLine de toutes les lignes
  deliveryFee: number;      // frais de livraison
  packagingCost: number;    // coût emballage estimé
  advertisingCost: number;  // charge pub estimée (% CA)
  netProfit: number;        // grossProfit - deliveryFee - packaging - pub
  items: OrderItemProfit[];
}

export interface PeriodProfitSummary {
  totalOrders: number;
  totalRevenue: number;
  totalPurchaseCost: number;
  totalDeliveryFees: number;
  totalPackagingCost: number;
  totalAdvertisingCost: number;
  totalNetProfit: number;
  avgNetProfitPerOrder: number;
  overallMarginPct: number;
}

// ---------------------------------------------------------------------------
// Calcul pour une ligne de commande
// ---------------------------------------------------------------------------

/**
 * Calcule le bénéfice et la marge d'une ligne de commande.
 * Les prix sont passés en string (format Drizzle NUMERIC) ou number.
 */
export function calcLineProfit(
  unitPrice: string | number,
  purchasePrice: string | number,
  quantity: number
): { profitLine: number; marginPct: number } {
  const sell = Number(unitPrice);
  const buy = Number(purchasePrice);
  const profitLine = (sell - buy) * quantity;
  const marginPct = sell > 0 ? ((sell - buy) / sell) * 100 : 0;
  return {
    profitLine: Math.round(profitLine * 100) / 100,
    marginPct: Math.round(marginPct * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Calcul pour une commande complète
// ---------------------------------------------------------------------------

export function calcOrderProfit(order: {
  id: number;
  deliveryFee: string | number;
  items: {
    productName: string;
    quantity: number;
    unitPrice: string | number;
    purchasePrice: string | number;
    lineTotal: string | number;
  }[];
}): OrderProfitSummary {
  const itemProfits: OrderItemProfit[] = order.items.map((item) => {
    const { profitLine, marginPct } = calcLineProfit(
      item.unitPrice,
      item.purchasePrice,
      item.quantity
    );
    return {
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      purchasePrice: Number(item.purchasePrice),
      lineTotal: Number(item.lineTotal),
      profitLine,
      marginPct,
    };
  });

  const grossProfit = itemProfits.reduce((sum, i) => sum + i.profitLine, 0);
  const deliveryFee = Number(order.deliveryFee);
  const revenue = itemProfits.reduce((sum, i) => sum + i.lineTotal, 0);
  const packagingCost = COST_CONFIG.packagingPerOrder;
  const advertisingCost = Math.round((revenue * COST_CONFIG.advertisingRatePct) / 100 * 1000) / 1000;
  const netProfit = Math.round((grossProfit - deliveryFee - packagingCost - advertisingCost) * 1000) / 1000;

  return {
    orderId: order.id,
    grossProfit: Math.round(grossProfit * 1000) / 1000,
    deliveryFee,
    packagingCost,
    advertisingCost,
    netProfit,
    items: itemProfits,
  };
}

// ---------------------------------------------------------------------------
// Agrégation sur une période (dashboard)
// ---------------------------------------------------------------------------

export function aggregateProfits(
  summaries: OrderProfitSummary[],
  revenues: number[]
): PeriodProfitSummary {
  const totalNetProfit = summaries.reduce((s, o) => s + o.netProfit, 0);
  const totalDeliveryFees = summaries.reduce((s, o) => s + o.deliveryFee, 0);
  const totalPackagingCost = summaries.reduce((s, o) => s + o.packagingCost, 0);
  const totalAdvertisingCost = summaries.reduce((s, o) => s + o.advertisingCost, 0);
  const totalRevenue = revenues.reduce((s, r) => s + r, 0);
  const totalPurchaseCost = summaries.reduce(
    (s, o) => s + o.items.reduce((si, i) => si + i.purchasePrice * i.quantity, 0),
    0
  );

  return {
    totalOrders: summaries.length,
    totalRevenue: Math.round(totalRevenue * 1000) / 1000,
    totalPurchaseCost: Math.round(totalPurchaseCost * 1000) / 1000,
    totalDeliveryFees: Math.round(totalDeliveryFees * 1000) / 1000,
    totalPackagingCost: Math.round(totalPackagingCost * 1000) / 1000,
    totalAdvertisingCost: Math.round(totalAdvertisingCost * 1000) / 1000,
    totalNetProfit: Math.round(totalNetProfit * 1000) / 1000,
    avgNetProfitPerOrder:
      summaries.length > 0
        ? Math.round((totalNetProfit / summaries.length) * 1000) / 1000
        : 0,
    overallMarginPct:
      totalRevenue > 0
        ? Math.round(((totalNetProfit / totalRevenue) * 100) * 100) / 100
        : 0,
  };
}
