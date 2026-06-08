import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)',
  'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders (assigned_to) WHERE assigned_to IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_orders_delivered_by ON orders (delivered_by) WHERE delivered_by IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON orders (confirmed_by) WHERE confirmed_by IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)',
];

for (const q of indexes) {
  await sql.unsafe(q);
  console.log('OK:', q.slice(0, 65));
}
await sql.end();
console.log('Tous les indexes créés avec succès !');
