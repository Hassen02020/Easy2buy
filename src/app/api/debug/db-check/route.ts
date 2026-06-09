import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [row] = await db.execute<{ now: string }>(sql`SELECT NOW()::text AS now`);
    return NextResponse.json({ ok: true, dbTime: row.now });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
