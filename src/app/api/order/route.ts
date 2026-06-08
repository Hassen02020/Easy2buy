import { NextResponse } from "next/server";

/** Route legacy — remplacée par POST /api/orders */
export async function POST() {
  return NextResponse.json(
    { error: "Cette route est dépréciée. Utilisez POST /api/orders" },
    { status: 410 }
  );
}
