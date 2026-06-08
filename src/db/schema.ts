import {
  pgTable,
  pgEnum,
  serial,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Cycle de vie d'une commande */
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",    // reçue, en attente de confirmation
  "CONFIRMED",  // confirmée par l'admin
  "PREPARING",  // en cours de préparation
  "SHIPPED",    // expédiée / en livraison
  "DELIVERED",  // livrée avec succès
  "CANCELLED",  // annulée
  "RETURNED",   // retournée — livrée puis renvoyée
]);

/** Tier fidélité client */
export const customerTierEnum = pgEnum("customer_tier", [
  "NEW",       // nouveau client (< 2 commandes)
  "BRONZE",    // 2–4 commandes livrées
  "SILVER",    // 5–9 commandes livrées
  "GOLD",      // 10+ commandes livrées
  "BLACKLIST", // bloqué
]);

/** Rôles du personnel backoffice */
export const staffRoleEnum = pgEnum("staff_role", [
  "ADMIN",      // accès total
  "AGENT",      // gestion des commandes
  "LIVREUR",    // livraison uniquement
]);

/** Méthodes de paiement acceptées */
export const paymentMethodEnum = pgEnum("payment_method", [
  "D17",               // D17 Tunisia (mobile payment)
  "FLOUCI",            // Flouci app
  "ONLINE",            // Paiement en ligne carte bancaire
  "BANK_TRANSFER",     // Virement bancaire
  "CASH_ON_DELIVERY",  // Paiement à la livraison (espèces)
]);

/** Statut de paiement d'une commande */
export const paymentStatusEnum = pgEnum("payment_status", [
  "UNPAID",        // Aucun paiement reçu (COD en attente)
  "PARTIAL_PAID",  // Avance reçue, solde à la livraison
  "FULLY_PAID",    // Paiement intégral reçu
  "REFUNDED",      // Remboursée
]);

/** Catégories de plantes */
export const productCategoryEnum = pgEnum("product_category", [
  "interieur",
  "exterieur",
  "succulente",
  "aromatique",
]);

// ---------------------------------------------------------------------------
// Table: staff
// ---------------------------------------------------------------------------

export const staff = pgTable(
  "staff",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    role: staffRoleEnum("role").notNull().default("AGENT"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("staff_email_idx").on(t.email)]
);

// ---------------------------------------------------------------------------
// Table: products
// ---------------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    /** Prix de vente client — DECIMAL(10,2) */
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    /** Prix d'achat fournisseur — base du calcul de rentabilité */
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
    category: productCategoryEnum("category").notNull(),
    /** Image principale (rétrocompat) */
    imageUrl: text("image_url"),
    /** Galerie multi-images — JSON array d'URLs */
    images: text("images").default("[]"),
    /** Lien vidéo courte (YouTube / TikTok / Instagram Reels / MP4 direct) */
    videoUrl: text("video_url"),
    /** Besoins en lumière : "plein soleil" | "mi-ombre" | "ombre" */
    lightNeeds: text("light_needs"),
    /** Arrosage : "rare" | "modéré" | "fréquent" */
    waterNeeds: text("water_needs"),
    /** Températures min–max tolérées (ex: "10–40°C") */
    tempRange: text("temp_range"),
    /** Zones climatiques Tunisie compatibles — JSON array ex: ["côtière","nord","sahel"] */
    climaticZones: text("climatic_zones").default("[]"),
    /** Entretien : "facile" | "moyen" | "expert" */
    careDifficulty: text("care_difficulty"),
    /** IDs de plantes similaires/recommandées — JSON array d'ids */
    suggestedProductIds: text("suggested_product_ids").default("[]"),
    /** Stock disponible — décrémenté de manière atomique lors de chaque commande */
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("products_slug_idx").on(t.slug)]
);

// ---------------------------------------------------------------------------
// Table: orders
// ---------------------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** Informations client */
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerCity: text("customer_city").notNull(),
    customerAddress: text("customer_address").notNull(),
    notes: text("notes"),
    /** Montants */
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    /** Statut — valeur par défaut PENDING (ACID: défini en même temps que les items) */
    status: orderStatusEnum("status").notNull().default("PENDING"),
    /** RBAC — Personnel assigné */
    assignedTo: integer("assigned_to").references(() => staff.id),    // agent responsable
    confirmedBy: integer("confirmed_by").references(() => staff.id),  // qui a confirmé
    deliveredBy: integer("delivered_by").references(() => staff.id),  // livreur
    /** Paiement */
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH_ON_DELIVERY"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
    /** Avance reçue (mode hybride) */
    advanceAmount: numeric("advance_amount", { precision: 10, scale: 3 }).notNull().default("0"),
    /** Solde restant à encaisser à la livraison */
    remainingAmount: numeric("remaining_amount", { precision: 10, scale: 3 }).notNull().default("0"),
    /** Référence externe (ID transaction D17/Flouci/Virement) */
    paymentRef: text("payment_ref"),
    /** Date de solde complet */
    paidAt: timestamp("paid_at"),
    /** Timestamps */
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_assigned_idx").on(t.assignedTo),
    index("orders_delivered_idx").on(t.deliveredBy),
  ]
);

// ---------------------------------------------------------------------------
// Table: order_items
// ---------------------------------------------------------------------------

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  /** Snapshot du nom au moment de la commande (le produit peut changer de nom) */
  productName: text("product_name").notNull(),
  /** Snapshot du prix de vente unitaire au moment de la commande */
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  /** Snapshot du prix d'achat fournisseur au moment de la commande */
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull(),
  /** Prix ligne = unit_price × quantity */
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  /**
   * Bénéfice net de la ligne = (unit_price - purchase_price) × quantity
   * La delivery_fee est déduite au niveau de la commande (orders.delivery_fee)
   */
  profitLine: numeric("profit_line", { precision: 10, scale: 2 }).notNull().default("0"),
});

// ---------------------------------------------------------------------------
// Table: audit_log  (traçabilité des changements de statut)
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    /** Qui a fait l'action (null = système/client) */
    staffId: integer("staff_id").references(() => staff.id),
    staffName: text("staff_name"),          // snapshot du nom
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    note: text("note"),                     // commentaire optionnel
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_order_idx").on(t.orderId)]
);

// ---------------------------------------------------------------------------
// Relations Drizzle (pour les jointures typées)
// ---------------------------------------------------------------------------

export const staffRelations = relations(staff, ({ many }) => ({
  assignedOrders: many(orders, { relationName: "assignedOrders" }),
  confirmedOrders: many(orders, { relationName: "confirmedOrders" }),
  deliveredOrders: many(orders, { relationName: "deliveredOrders" }),
  auditActions: many(auditLog),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  auditTrail: many(auditLog),
  assignedAgent: one(staff, { fields: [orders.assignedTo], references: [staff.id], relationName: "assignedOrders" }),
  confirmedAgent: one(staff, { fields: [orders.confirmedBy], references: [staff.id], relationName: "confirmedOrders" }),
  deliveryAgent: one(staff, { fields: [orders.deliveredBy], references: [staff.id], relationName: "deliveredOrders" }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  order: one(orders, { fields: [auditLog.orderId], references: [orders.id] }),
  staff: one(staff, { fields: [auditLog.staffId], references: [staff.id] }),
}));

// ---------------------------------------------------------------------------
// Table: customer_profiles
// ---------------------------------------------------------------------------

export const customerProfiles = pgTable(
  "customer_profiles",
  {
    id: serial("id").primaryKey(),
    /** Clé naturelle — numéro de téléphone (identifiant unique client) */
    phone: text("phone").notNull().unique(),
    name: text("name").notNull(),
    /** Statistiques cumulées */
    totalOrders:    integer("total_orders").notNull().default(0),
    deliveredOrders: integer("delivered_orders").notNull().default(0),
    cancelledOrders: integer("cancelled_orders").notNull().default(0),
    returnedOrders:  integer("returned_orders").notNull().default(0),
    noAnswerCount:   integer("no_answer_count").notNull().default(0),  // nb fois sans réponse
    totalSpent: numeric("total_spent", { precision: 12, scale: 3 }).notNull().default("0"),
    /** Score de fidélité calculé (0–100) */
    loyaltyScore: integer("loyalty_score").notNull().default(0),
    /** Tier automatique */
    tier: customerTierEnum("tier").notNull().default("NEW"),
    /** Remise accordée (%) — 0 par défaut, modifiable manuellement */
    discountPct: integer("discount_pct").notNull().default(0),
    /** Blacklist */
    isBlacklisted: boolean("is_blacklisted").notNull().default(false),
    blacklistReason: text("blacklist_reason"),
    blacklistedAt: timestamp("blacklisted_at"),
    blacklistedBy: integer("blacklisted_by").references(() => staff.id),
    /** Code de parrainage unique (ex: JOHN-4X7K) */
    referralCode: text("referral_code").unique(),
    /** Nb de filleuls ayant commandé au moins une fois */
    referralCount: integer("referral_count").notNull().default(0),
    /** Parrainé par (phone du parrain) */
    referredByPhone: text("referred_by_phone"),
    /** Notes internes admin */
    notes: text("notes"),
    /** Timestamps */
    lastOrderAt: timestamp("last_order_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("customer_phone_idx").on(t.phone),
    index("customer_tier_idx").on(t.tier),
    index("customer_blacklist_idx").on(t.isBlacklisted),
  ]
);

// ---------------------------------------------------------------------------
// Table: referrals
// ---------------------------------------------------------------------------

/** Statut d'un parrainage */
export const referralStatusEnum = pgEnum("referral_status", [
  "PENDING",    // filleul inscrit mais pas encore commandé
  "CONFIRMED",  // filleul a passé sa 1ère commande livrée → remise déclenchée
  "REWARDED",   // parrain a reçu sa récompense
]);

export const referrals = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    referrerPhone: text("referrer_phone").notNull(), // parrain
    refereePhone:  text("referee_phone").notNull(),  // filleul
    refereeName:   text("referee_name").notNull(),
    orderId: integer("order_id").references(() => orders.id), // 1ère commande du filleul
    status: referralStatusEnum("status").notNull().default("PENDING"),
    referrerRewardPct: integer("referrer_reward_pct").notNull().default(10), // % remise parrain
    refereeRewardPct:  integer("referee_reward_pct").notNull().default(5),  // % remise filleul
    createdAt: timestamp("created_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
    rewardedAt:  timestamp("rewarded_at"),
  },
  (t) => [
    index("referral_referrer_idx").on(t.referrerPhone),
    index("referral_referee_idx").on(t.refereePhone),
  ]
);

// ---------------------------------------------------------------------------
// Table: customer_gifts
// ---------------------------------------------------------------------------

/** Type de cadeau */
export const giftTypeEnum = pgEnum("gift_type", [
  "DISCOUNT_COUPON",   // coupon remise %
  "FREE_DELIVERY",     // livraison offerte
  "FREE_PRODUCT",      // plante offerte
  "LOYALTY_BONUS",     // bonus fidélité (points/TND)
  "REFERRAL_REWARD",   // récompense parrainage
]);

export const customerGifts = pgTable(
  "customer_gifts",
  {
    id: serial("id").primaryKey(),
    customerPhone: text("customer_phone").notNull(),
    customerName:  text("customer_name").notNull(),
    type: giftTypeEnum("type").notNull(),
    label: text("label").notNull(),           // ex: "Remise 15% — Client Or"
    discountPct: integer("discount_pct"),     // si type DISCOUNT_COUPON
    freeProductId: integer("free_product_id").references(() => products.id), // si FREE_PRODUCT
    isUsed: boolean("is_used").notNull().default(false),
    usedAt: timestamp("used_at"),
    usedOnOrderId: integer("used_on_order_id").references(() => orders.id),
    expiresAt: timestamp("expires_at"),       // null = pas d'expiration
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Qui a créé ce cadeau (admin ou système) */
    createdBy: text("created_by").notNull().default("system"),
  },
  (t) => [
    index("gift_phone_idx").on(t.customerPhone),
    index("gift_used_idx").on(t.isUsed),
  ]
);

// ---------------------------------------------------------------------------
// Types inférés
// ---------------------------------------------------------------------------

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type StaffRole = (typeof staffRoleEnum.enumValues)[number];
export type AuditLog = typeof auditLog.$inferSelect;
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type CustomerTier = (typeof customerTierEnum.enumValues)[number];
export type Referral = typeof referrals.$inferSelect;
export type CustomerGift = typeof customerGifts.$inferSelect;
export type GiftType = (typeof giftTypeEnum.enumValues)[number];
