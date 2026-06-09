-- ============================================================
-- sync-neon-prod.sql
-- Synchronisation complète du schéma Easy2Buy vers Neon (prod)
-- Exécuter dans : console.neon.tech → SQL Editor
-- Toutes les opérations sont IF NOT EXISTS (idempotent)
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."order_status" AS ENUM(
    'PENDING','CONFIRMED','PREPARING','SHIPPED','DELIVERED','CANCELLED','RETURNED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payment_method" AS ENUM(
    'D17','FLOUCI','ONLINE','BANK_TRANSFER','CASH_ON_DELIVERY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."payment_status" AS ENUM(
    'UNPAID','PARTIAL_PAID','FULLY_PAID','REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."product_category" AS ENUM(
    'interieur','exterieur','succulente','aromatique'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."staff_role" AS ENUM('ADMIN','AGENT','LIVREUR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."customer_tier" AS ENUM(
    'NEW','BRONZE','SILVER','GOLD','BLACKLIST'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."referral_status" AS ENUM('PENDING','CONFIRMED','REWARDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."gift_type" AS ENUM(
    'DISCOUNT_COUPON','FREE_DELIVERY','FREE_PRODUCT','LOYALTY_BONUS','REFERRAL_REWARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."workflow_action" AS ENUM(
    'ASSIGNED','PREPARED','PACKED','CONFIRMED','SHIPPED','DELIVERED','RETURNED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. TABLE staff ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "staff" (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT,
  role       staff_role NOT NULL DEFAULT 'AGENT',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_email_idx ON staff(email);

-- ── 3. TABLE products ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "products" (
  id                   SERIAL PRIMARY KEY,
  slug                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  description          TEXT,
  price                NUMERIC(10,2) NOT NULL,
  purchase_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  category             product_category NOT NULL,
  image_url            TEXT,
  images               TEXT DEFAULT '[]',
  video_url            TEXT,
  light_needs          TEXT,
  water_needs          TEXT,
  temp_range           TEXT,
  climatic_zones       TEXT DEFAULT '[]',
  care_difficulty      TEXT,
  suggested_product_ids TEXT DEFAULT '[]',
  stock                INTEGER NOT NULL DEFAULT 0,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);

-- ── 4. TABLE orders ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "orders" (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_city    TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes            TEXT,
  subtotal         NUMERIC(10,2) NOT NULL,
  delivery_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  status           order_status NOT NULL DEFAULT 'PENDING',
  assigned_to      INTEGER REFERENCES staff(id),
  confirmed_by     INTEGER REFERENCES staff(id),
  prepared_by      INTEGER REFERENCES staff(id),
  packed_by        INTEGER REFERENCES staff(id),
  delivered_by     INTEGER REFERENCES staff(id),
  payment_method   payment_method NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status   payment_status NOT NULL DEFAULT 'UNPAID',
  advance_amount   NUMERIC(10,3) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(10,3) NOT NULL DEFAULT 0,
  delivery_notes   TEXT,
  courier_remarks  TEXT,
  payment_ref      TEXT,
  paid_at          TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Colonnes potentiellement manquantes (idempotent)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by     INTEGER REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_by       INTEGER REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_remarks TEXT;

CREATE INDEX IF NOT EXISTS orders_status_idx    ON orders(status);
CREATE INDEX IF NOT EXISTS orders_assigned_idx  ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS orders_prepared_idx  ON orders(prepared_by);
CREATE INDEX IF NOT EXISTS orders_packed_idx    ON orders(packed_by);
CREATE INDEX IF NOT EXISTS orders_delivered_idx ON orders(delivered_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- ── 5. TABLE order_items ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "order_items" (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  product_name   TEXT NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity       INTEGER NOT NULL,
  line_total     NUMERIC(10,2) NOT NULL,
  profit_line    NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ── 6. TABLE audit_log ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_log" (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id    INTEGER REFERENCES staff(id),
  staff_name  TEXT,
  from_status order_status,
  to_status   order_status NOT NULL,
  note        TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_order_idx ON audit_log(order_id);

-- ── 7. TABLE workflow_events ────────────────────────────────

CREATE TABLE IF NOT EXISTS "workflow_events" (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id   INTEGER REFERENCES staff(id),
  staff_name TEXT,
  action     workflow_action NOT NULL,
  note       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workflow_order_idx ON workflow_events(order_id);
CREATE INDEX IF NOT EXISTS workflow_staff_idx ON workflow_events(staff_id);

-- ── 8. TABLE customer_profiles ──────────────────────────────

CREATE TABLE IF NOT EXISTS "customer_profiles" (
  id                SERIAL PRIMARY KEY,
  phone             TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  total_orders      INTEGER NOT NULL DEFAULT 0,
  delivered_orders  INTEGER NOT NULL DEFAULT 0,
  cancelled_orders  INTEGER NOT NULL DEFAULT 0,
  returned_orders   INTEGER NOT NULL DEFAULT 0,
  no_answer_count   INTEGER NOT NULL DEFAULT 0,
  total_spent       NUMERIC(12,3) NOT NULL DEFAULT 0,
  loyalty_score     INTEGER NOT NULL DEFAULT 0,
  tier              customer_tier NOT NULL DEFAULT 'NEW',
  discount_pct      INTEGER NOT NULL DEFAULT 0,
  is_blacklisted    BOOLEAN NOT NULL DEFAULT FALSE,
  blacklist_reason  TEXT,
  blacklisted_at    TIMESTAMP,
  blacklisted_by    INTEGER REFERENCES staff(id),
  referral_code     TEXT UNIQUE,
  referral_count    INTEGER NOT NULL DEFAULT 0,
  referred_by_phone TEXT,
  notes             TEXT,
  last_order_at     TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS referral_code     TEXT UNIQUE;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS referral_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS referred_by_phone TEXT;

CREATE INDEX IF NOT EXISTS customer_phone_idx     ON customer_profiles(phone);
CREATE INDEX IF NOT EXISTS customer_tier_idx      ON customer_profiles(tier);
CREATE INDEX IF NOT EXISTS customer_blacklist_idx ON customer_profiles(is_blacklisted);

-- ── 9. TABLE referrals ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "referrals" (
  id                  SERIAL PRIMARY KEY,
  referrer_phone      TEXT NOT NULL,
  referee_phone       TEXT NOT NULL,
  referee_name        TEXT NOT NULL,
  order_id            INTEGER REFERENCES orders(id),
  status              referral_status NOT NULL DEFAULT 'PENDING',
  referrer_reward_pct INTEGER NOT NULL DEFAULT 10,
  referee_reward_pct  INTEGER NOT NULL DEFAULT 5,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMP,
  rewarded_at         TIMESTAMP
);
CREATE INDEX IF NOT EXISTS referral_referrer_idx ON referrals(referrer_phone);
CREATE INDEX IF NOT EXISTS referral_referee_idx  ON referrals(referee_phone);

-- ── 10. TABLE customer_gifts ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "customer_gifts" (
  id                SERIAL PRIMARY KEY,
  customer_phone    TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  type              gift_type NOT NULL,
  label             TEXT NOT NULL,
  discount_pct      INTEGER,
  free_product_id   INTEGER REFERENCES products(id),
  is_used           BOOLEAN NOT NULL DEFAULT FALSE,
  used_at           TIMESTAMP,
  used_on_order_id  INTEGER REFERENCES orders(id),
  expires_at        TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by        TEXT NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS gift_phone_idx ON customer_gifts(customer_phone);
CREATE INDEX IF NOT EXISTS gift_used_idx  ON customer_gifts(is_used);

-- ── 11. STAFF DE DÉMONSTRATION ───────────────────────────────
-- (ne rien faire si déjà présents)

INSERT INTO staff (name, email, phone, role, active)
VALUES
  ('Admin Owner',   'admin@easy2buy.tn',   '+21698000001', 'ADMIN',   true),
  ('Agent Sami',    'agent@easy2buy.tn',   '+21698000002', 'AGENT',   true),
  ('Livreur Khaled','livreur@easy2buy.tn', '+21698000003', 'LIVREUR', true)
ON CONFLICT (email) DO NOTHING;

-- ── FIN ─────────────────────────────────────────────────────
-- Vérification rapide :
SELECT 'staff'             AS tbl, count(*) FROM staff
UNION ALL
SELECT 'products',           count(*) FROM products
UNION ALL
SELECT 'orders',             count(*) FROM orders
UNION ALL
SELECT 'order_items',        count(*) FROM order_items
UNION ALL
SELECT 'workflow_events',    count(*) FROM workflow_events
UNION ALL
SELECT 'audit_log',          count(*) FROM audit_log
UNION ALL
SELECT 'customer_profiles',  count(*) FROM customer_profiles;
