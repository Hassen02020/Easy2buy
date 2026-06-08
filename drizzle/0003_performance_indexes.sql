-- Migration 0003 : Index de performance sur la table orders
-- Améliore les requêtes de filtrage par status, date et assignation

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status
  ON orders (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assigned_to
  ON orders (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_delivered_by
  ON orders (delivered_by)
  WHERE delivered_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_confirmed_by
  ON orders (confirmed_by)
  WHERE confirmed_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created
  ON orders (status, created_at DESC);

-- Index sur order_items pour les jointures par order_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);
