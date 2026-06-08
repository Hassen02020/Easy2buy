import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

/**
 * Pool de connexions PostgreSQL.
 * - max: 10 connexions simultanées (adapté à un serveur Node.js single-process)
 * - idle_timeout: libère les connexions inactives après 30 s
 * - connect_timeout: échoue vite si la DB est injoignable
 *
 * NOTE: Ne jamais utiliser `prepare: true` avec PgBouncer en mode transaction.
 */
const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

const poolClient = postgres(connectionString, {
  max: isServerless ? 1 : 10,
  idle_timeout: isServerless ? 20 : 30,
  connect_timeout: 10,
  prepare: false,
  ssl: isServerless ? "require" : false,
});

export const db = drizzle(poolClient, { schema });

/**
 * Helper de transaction typé.
 * Usage:
 *   await withTransaction(async (tx) => {
 *     await tx.insert(orders).values(...)
 *     await tx.update(products).set(...)
 *   });
 */
export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.transaction(fn);
}
