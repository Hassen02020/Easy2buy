import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

if (process.env.NODE_ENV === "production") {
  // guard handled in handler
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }
  try {
    const [time] = await db.execute<{ now: string }>(sql`SELECT NOW()::text AS now`);

    // Produits actifs disponibles
    const activeProducts = await db
      .select({ id: products.id, name: products.name, stock: products.stock, price: products.price })
      .from(products)
      .where(eq(products.active, true))
      .limit(5);

    // Test d'insertion factice pour voir l'erreur exacte
    let orderTestError: string | null = null;
    try {
      const firstProduct = activeProducts[0];
      if (firstProduct) {
        await db.execute(sql`
          INSERT INTO orders (customer_name, customer_phone, customer_city, customer_address, subtotal, delivery_fee, total, status, payment_method, payment_status, advance_amount, remaining_amount)
          VALUES ('__TEST__', '__TEST__', '__TEST__', '__TEST_ADDRESS_12345__', '10.00', '7.00', '17.00', 'PENDING', 'CASH_ON_DELIVERY', 'UNPAID', '0.000', '17.000')
          RETURNING id
        `);
        // rollback immédiat
        await db.execute(sql`DELETE FROM orders WHERE customer_name = '__TEST__'`);
        orderTestError = null;
      }
    } catch (err) {
      orderTestError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      ok: true,
      dbTime: time.now,
      activeProductsCount: activeProducts.length,
      sampleProducts: activeProducts,
      orderInsertTest: orderTestError ?? "OK",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
