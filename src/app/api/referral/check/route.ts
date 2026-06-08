import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customerProfiles, referrals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { REFERRAL_CONFIG } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  if (!code) return NextResponse.json({ valid: false, message: "Code manquant" });

  const [referrer] = await db
    .select({ phone: customerProfiles.phone, name: customerProfiles.name, isBlacklisted: customerProfiles.isBlacklisted })
    .from(customerProfiles)
    .where(eq(customerProfiles.referralCode, code));

  if (!referrer || referrer.isBlacklisted) {
    return NextResponse.json({ valid: false, message: "Code de parrainage invalide." });
  }

  if (phone && referrer.phone === phone) {
    return NextResponse.json({ valid: false, message: "Vous ne pouvez pas utiliser votre propre code." });
  }

  if (phone) {
    const [existing] = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(and(eq(referrals.refereePhone, phone)));

    if (existing) {
      return NextResponse.json({ valid: false, message: "Vous avez déjà utilisé un code de parrainage." });
    }
  }

  return NextResponse.json({
    valid: true,
    discountPct: REFERRAL_CONFIG.refereeRewardPct,
    referrerName: referrer.name,
    message: `Code valide ! Vous bénéficiez de ${REFERRAL_CONFIG.refereeRewardPct}% de remise grâce au parrainage de ${referrer.name}.`,
  });
}
