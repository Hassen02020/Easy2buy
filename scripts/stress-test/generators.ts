/**
 * scripts/stress-test/generators.ts
 * -----------------------------------
 * Générateurs de données aléatoires pour le stress test 500 commandes/24h.
 * Aucune dépendance externe — pure logique TypeScript.
 */

// ---------------------------------------------------------------------------
// Types locaux (miroir du schéma Drizzle, sans import DB)
// ---------------------------------------------------------------------------

export type SimOrderStatus =
  | "PENDING" | "CONFIRMED" | "PREPARING"
  | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";

export type SimPaymentMethod = "D17" | "FLOUCI" | "CASH_ON_DELIVERY";

export type SimPaymentStatus = "UNPAID" | "PARTIAL_PAID" | "FULLY_PAID";

export interface SimOrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
  lineTotal: number;
  profitLine: number;
}

export interface SimOrder {
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: SimOrderStatus;
  paymentMethod: SimPaymentMethod;
  paymentStatus: SimPaymentStatus;
  advanceAmount: number;
  remainingAmount: number;
  assignedTo: number | null;   // staff agent ID
  deliveredBy: number | null;  // staff livreur ID
  createdAt: Date;
  items: SimOrderItem[];
}

// ---------------------------------------------------------------------------
// Données de référence
// ---------------------------------------------------------------------------

const CITIES = [
  "Tunis", "Sfax", "Sousse", "Monastir", "Bizerte",
  "Nabeul", "Hammamet", "Siliana", "Kairouan", "Gafsa",
];

const FIRST_NAMES = [
  "Mohamed", "Fatima", "Ahmed", "Leila", "Khaled",
  "Amira", "Youssef", "Sana", "Karim", "Rania",
  "Hassen", "Ines", "Bilel", "Salma", "Nizar",
];

const LAST_NAMES = [
  "Ben Ali", "Trabelsi", "Cherif", "Mansour", "Ayari",
  "Belhaj", "Saidi", "Maatoug", "Hamdi", "Souissi",
];

// Catalogue simulé (miroir products.ts — prix & coûts)
export const SIM_PRODUCTS: SimOrderItem[] = [
  { productId: 1, productName: "Jasmin Tunisien",      unitPrice: 34, purchasePrice: 18, quantity: 1, lineTotal: 34, profitLine: 16 },
  { productId: 2, productName: "Lavande",              unitPrice: 34, purchasePrice: 16, quantity: 1, lineTotal: 34, profitLine: 18 },
  { productId: 3, productName: "Olivier Tunisien",     unitPrice: 34, purchasePrice: 20, quantity: 1, lineTotal: 34, profitLine: 14 },
  { productId: 4, productName: "Grenadier",            unitPrice: 34, purchasePrice: 17, quantity: 1, lineTotal: 34, profitLine: 17 },
  { productId: 5, productName: "Figuier Commun",       unitPrice: 34, purchasePrice: 18, quantity: 1, lineTotal: 34, profitLine: 16 },
  { productId: 6, productName: "Oranger / Citronnier", unitPrice: 34, purchasePrice: 19, quantity: 1, lineTotal: 34, profitLine: 15 },
  { productId: 7, productName: "Pêcher de Tunisie",    unitPrice: 34, purchasePrice: 17, quantity: 1, lineTotal: 34, profitLine: 17 },
  { productId: 8, productName: "Pack 3 Arbres Fruitiers", unitPrice: 34, purchasePrice: 22, quantity: 1, lineTotal: 34, profitLine: 12 },
];

// Staff simulé
export const SIM_AGENTS   = [1, 2, 3];   // IDs agents
export const SIM_LIVREURS = [4, 5, 6];   // IDs livreurs

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPhone(): string {
  const prefix = rand(["20", "21", "22", "25", "26", "27", "28", "29",
                        "50", "51", "52", "53", "54", "55", "90", "92", "93", "94", "95", "96", "97", "98", "99"]);
  return `+216 ${prefix} ${randInt(100000, 999999)}`;
}

/**
 * Répartition pondérée des statuts (distribution réaliste) :
 *   DELIVERED  40%, PENDING 20%, CONFIRMED 15%, PREPARING 10%,
 *   SHIPPED 5%, CANCELLED 5%, RETURNED 5%
 */
function randStatus(): SimOrderStatus {
  const n = Math.random();
  if (n < 0.40) return "DELIVERED";
  if (n < 0.60) return "PENDING";
  if (n < 0.75) return "CONFIRMED";
  if (n < 0.85) return "PREPARING";
  if (n < 0.90) return "SHIPPED";
  if (n < 0.95) return "CANCELLED";
  return "RETURNED";
}

/**
 * Répartition paiement :
 *   COD 55%, D17 25%, FLOUCI 20%
 */
function randPaymentMethod(): SimPaymentMethod {
  const n = Math.random();
  if (n < 0.55) return "CASH_ON_DELIVERY";
  if (n < 0.80) return "D17";
  return "FLOUCI";
}

/**
 * Détermine paymentStatus cohérent avec le statut de commande.
 * - DELIVERED + non-COD → FULLY_PAID
 * - DELIVERED + COD     → FULLY_PAID (collecté)
 * - En cours + non-COD  → PARTIAL_PAID 40% / FULLY_PAID 20% / UNPAID 40%
 * - En cours + COD      → UNPAID
 * - CANCELLED/RETURNED  → UNPAID
 */
function derivePaymentStatus(
  status: SimOrderStatus,
  method: SimPaymentMethod
): SimPaymentStatus {
  if (status === "CANCELLED" || status === "RETURNED") return "UNPAID";
  if (status === "DELIVERED") return "FULLY_PAID";
  if (method === "CASH_ON_DELIVERY") return "UNPAID";
  const n = Math.random();
  if (n < 0.40) return "PARTIAL_PAID";
  if (n < 0.60) return "FULLY_PAID";
  return "UNPAID";
}

/**
 * Calcule advance + remaining cohérents avec paymentStatus et total.
 */
function calcPaymentAmounts(
  total: number,
  paymentStatus: SimPaymentStatus
): { advance: number; remaining: number } {
  if (paymentStatus === "FULLY_PAID") {
    return { advance: total, remaining: 0 };
  }
  if (paymentStatus === "PARTIAL_PAID") {
    // Avance entre 20% et 80% du total, arrondie à 3 décimales
    const pct = randInt(20, 80) / 100;
    const advance = Math.round(total * pct * 1000) / 1000;
    const remaining = Math.round((total - advance) * 1000) / 1000;
    return { advance, remaining };
  }
  // UNPAID
  return { advance: 0, remaining: total };
}

/**
 * Date aléatoire dans les dernières 24h
 */
function randDateIn24h(baseDate: Date): Date {
  const msIn24h = 24 * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * msIn24h);
  return new Date(baseDate.getTime() - offset);
}

// ---------------------------------------------------------------------------
// Générateur principal
// ---------------------------------------------------------------------------

/**
 * Génère `count` commandes simulées sur une période de 24h.
 * @param count     Nombre de commandes à générer (défaut: 500)
 * @param baseDate  Date de référence = "maintenant"
 */
export function generateSimOrders(
  count = 500,
  baseDate: Date = new Date()
): SimOrder[] {
  const orders: SimOrder[] = [];

  for (let i = 0; i < count; i++) {
    // Sélectionner 1 à 3 produits aléatoires (sans doublon)
    const numItems = randInt(1, 3);
    const shuffled = [...SIM_PRODUCTS].sort(() => Math.random() - 0.5);
    const selectedItems: SimOrderItem[] = shuffled.slice(0, numItems).map((p) => {
      const qty = randInt(1, 3);
      return {
        ...p,
        quantity: qty,
        lineTotal: Math.round(p.unitPrice * qty * 1000) / 1000,
        profitLine: Math.round((p.unitPrice - p.purchasePrice) * qty * 1000) / 1000,
      };
    });

    const subtotal = Math.round(selectedItems.reduce((s, it) => s + it.lineTotal, 0) * 1000) / 1000;
    // Frais de livraison : 7 ou 8 TND selon la ville
    const deliveryFee = rand([7, 8]);
    const total = Math.round((subtotal + deliveryFee) * 1000) / 1000;

    const status        = randStatus();
    const paymentMethod = randPaymentMethod();
    const paymentStatus = derivePaymentStatus(status, paymentMethod);
    const { advance, remaining } = calcPaymentAmounts(total, paymentStatus);

    // Livreur uniquement si commande expédiée/livrée/retournée
    const hasLivreur = ["SHIPPED", "DELIVERED", "RETURNED"].includes(status);
    // Agent toujours assigné sauf PENDING pur
    const hasAgent   = status !== "PENDING" || Math.random() > 0.3;

    const firstName = rand(FIRST_NAMES);
    const lastName  = rand(LAST_NAMES);

    orders.push({
      customerName:    `${firstName} ${lastName}`,
      customerPhone:   randPhone(),
      customerCity:    rand(CITIES),
      customerAddress: `Rue ${randInt(1, 200)} ${rand(CITIES)}, ${randInt(1000, 9999)}`,
      subtotal,
      deliveryFee,
      total,
      status,
      paymentMethod,
      paymentStatus,
      advanceAmount:   advance,
      remainingAmount: remaining,
      assignedTo:      hasAgent   ? rand(SIM_AGENTS)   : null,
      deliveredBy:     hasLivreur ? rand(SIM_LIVREURS) : null,
      createdAt:       randDateIn24h(baseDate),
      items:           selectedItems,
    });
  }

  return orders;
}
