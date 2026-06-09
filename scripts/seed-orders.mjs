/**
 * scripts/seed-orders.mjs
 * Injecte des commandes de test dans la DB Neon pour valider :
 *  - Bon de commande (impression)
 *  - Liste commandes par statut
 *  - Liste livreur
 *
 * Usage : node scripts/seed-orders.mjs
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// ── Données de test ──────────────────────────────────────────────────────────

const CLIENTS = [
  { name: "Ahmed Ben Ali",      phone: "+21620111001", city: "Tunis",    address: "12 Rue de la République, Bab Bhar" },
  { name: "Sonia Trabelsi",     phone: "+21622222002", city: "Sousse",   address: "Hay Riadh, Bloc C Apt 14" },
  { name: "Mohamed Chtioui",    phone: "+21625333003", city: "Sfax",     address: "Route Tunis Km3, Sakiet Ezzit" },
  { name: "Leila Mansour",      phone: "+21629444004", city: "Nabeul",   address: "Cité des Orangers, Villa 7" },
  { name: "Karim Bouzid",       phone: "+21698555005", city: "Monastir", address: "Centre Ville, Av Habib Bourguiba" },
  { name: "Fatma Chaabane",     phone: "+21650666006", city: "Bizerte",  address: "Menzel Bourguiba, Rue 18 Janvier" },
  { name: "Youssef Hamdi",      phone: "+21655777007", city: "Gabès",    address: "Cité Erriadh, Imm 5 App 3" },
  { name: "Rim Jendoubi",       phone: "+21658888008", city: "Tunis",    address: "Les Berges du Lac 2, Tour C" },
];

const STATUSES = [
  "PENDING", "PENDING",
  "CONFIRMED", "CONFIRMED",
  "PREPARING",
  "SHIPPED", "SHIPPED",
  "DELIVERED", "DELIVERED", "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const PRODUCTS_SEED = [
  { name: "Monstera Deliciosa",  unitPrice: "29.900", purchasePrice: "12.000", qty: 1 },
  { name: "Ficus Lyrata",        unitPrice: "45.000", purchasePrice: "18.000", qty: 1 },
  { name: "Cactus Boule",        unitPrice: "12.500", purchasePrice: "4.000",  qty: 3 },
  { name: "Orchidée Blanche",    unitPrice: "38.000", purchasePrice: "15.000", qty: 2 },
  { name: "Lavande",             unitPrice: "9.900",  purchasePrice: "3.500",  qty: 4 },
  { name: "Aloe Vera",           unitPrice: "14.000", purchasePrice: "5.000",  qty: 2 },
  { name: "Pothos Doré",         unitPrice: "18.500", purchasePrice: "7.000",  qty: 1 },
  { name: "Sansevieria",         unitPrice: "22.000", purchasePrice: "9.000",  qty: 1 },
];

const PAY_METHODS = ["CASH_ON_DELIVERY", "D17", "FLOUCI", "CASH_ON_DELIVERY", "BANK_TRANSFER"];
const PAY_STATUSES = {
  PENDING:   "UNPAID",
  CONFIRMED: "UNPAID",
  PREPARING: "PARTIAL_PAID",
  SHIPPED:   "PARTIAL_PAID",
  DELIVERED: "FULLY_PAID",
  CANCELLED: "UNPAID",
  RETURNED:  "REFUNDED",
};

const DELIVERY_FEES = {
  Tunis: "7.000", Sousse: "9.000", Sfax: "12.000",
  Nabeul: "9.000", Monastir: "10.000", Bizerte: "8.000", Gabès: "15.000",
};

// ── Récupérer les staffs existants ───────────────────────────────────────────

const staffRows = await sql`SELECT id, role FROM staff WHERE active = true`;
const agents    = staffRows.filter(s => s.role === "AGENT" || s.role === "ADMIN").map(s => s.id);
const livreurs  = staffRows.filter(s => s.role === "LIVREUR" || s.role === "ADMIN").map(s => s.id);

function pick(arr) { return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null; }
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ── Insérer les commandes ────────────────────────────────────────────────────

let inserted = 0;

for (let i = 0; i < 20; i++) {
  const client  = CLIENTS[i % CLIENTS.length];
  const status  = STATUSES[i % STATUSES.length];
  const payMethod = PAY_METHODS[i % PAY_METHODS.length];
  const payStatus = PAY_STATUSES[status];
  const deliveryFee = DELIVERY_FEES[client.city] ?? "10.000";

  // Choisir 1 ou 2 produits
  const prod1 = PRODUCTS_SEED[i % PRODUCTS_SEED.length];
  const prod2 = i % 3 === 0 ? PRODUCTS_SEED[(i + 3) % PRODUCTS_SEED.length] : null;

  const line1 = parseFloat(prod1.unitPrice) * prod1.qty;
  const line2 = prod2 ? parseFloat(prod2.unitPrice) * prod2.qty : 0;
  const subtotal = (line1 + line2).toFixed(3);
  const total    = (parseFloat(subtotal) + parseFloat(deliveryFee)).toFixed(3);
  const advance  = payStatus === "PARTIAL_PAID" ? (parseFloat(total) * 0.4).toFixed(3) : "0.000";
  const remaining = (parseFloat(total) - parseFloat(advance)).toFixed(3);

  const daysAgo = rand(0, 30);
  const createdAt = new Date(Date.now() - daysAgo * 86400000);

  const assignedTo  = ["CONFIRMED","PREPARING","SHIPPED","DELIVERED"].includes(status) ? pick(agents) : null;
  const deliveredBy = ["SHIPPED","DELIVERED"].includes(status) ? pick(livreurs) : null;
  const confirmedBy = ["CONFIRMED","PREPARING","SHIPPED","DELIVERED"].includes(status) ? pick(agents) : null;

  const [order] = await sql`
    INSERT INTO orders (
      customer_name, customer_phone, customer_city, customer_address,
      subtotal, delivery_fee, total, status,
      payment_method, payment_status, advance_amount, remaining_amount,
      assigned_to, confirmed_by, delivered_by,
      notes, created_at, updated_at
    ) VALUES (
      ${client.name}, ${client.phone}, ${client.city}, ${client.address},
      ${subtotal}, ${deliveryFee}, ${total}, ${status},
      ${payMethod}, ${payStatus}, ${advance}, ${remaining},
      ${assignedTo}, ${confirmedBy}, ${deliveredBy},
      ${i % 4 === 0 ? "Appeler avant livraison" : null},
      ${createdAt}, ${createdAt}
    ) RETURNING id
  `;

  // Items
  const items = prod2 ? [prod1, prod2] : [prod1];
  for (const p of items) {
    const lineTotal  = (parseFloat(p.unitPrice) * p.qty).toFixed(3);
    const profitLine = ((parseFloat(p.unitPrice) - parseFloat(p.purchasePrice)) * p.qty).toFixed(3);
    await sql`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, purchase_price, quantity, line_total, profit_line)
      VALUES (
        ${order.id}, 1, ${p.name},
        ${p.unitPrice}, ${p.purchasePrice},
        ${p.qty}, ${lineTotal}, ${profitLine}
      )
    `;
  }

  console.log(`✓ Commande #${order.id} — ${client.name} — ${status} — ${total} TND`);
  inserted++;
}

await sql.end();
console.log(`\n✅ ${inserted} commandes insérées avec succès !`);
