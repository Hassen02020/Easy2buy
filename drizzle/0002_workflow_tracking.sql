-- Migration 0002 : Workflow Tracking
-- Colonnes packed_by / prepared_by + table workflow_events

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "packed_by"    INTEGER REFERENCES staff(id),
  ADD COLUMN IF NOT EXISTS "prepared_by"  INTEGER REFERENCES staff(id);

CREATE INDEX IF NOT EXISTS orders_packed_idx   ON orders(packed_by);
CREATE INDEX IF NOT EXISTS orders_prepared_idx ON orders(prepared_by);

-- Table traçabilité des transitions workflow
CREATE TABLE IF NOT EXISTS "workflow_events" (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  staff_id    INTEGER REFERENCES staff(id),
  staff_name  TEXT,
  action      TEXT NOT NULL,   -- 'PACKED' | 'PREPARED' | 'ASSIGNED' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'
  note        TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_order_idx ON workflow_events(order_id);
CREATE INDEX IF NOT EXISTS workflow_staff_idx ON workflow_events(staff_id);
