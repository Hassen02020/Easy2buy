/**
 * lib/referral.ts
 * ----------------
 * Gestion du système de parrainage :
 *   - Génération du code unique par client
 *   - Enregistrement d'un parrainage lors d'une commande
 *   - Confirmation + attribution des cadeaux quand le filleul est livré
 */

import { db } from "@/db";
import {
  customerProfiles,
  referrals,
  customerGifts,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Config récompenses parrainage
// ---------------------------------------------------------------------------

export const REFERRAL_CONFIG = {
  referrerRewardPct: 10, // parrain reçoit 10% de remise
  refereeRewardPct:  5,  // filleul reçoit 5% de remise sur sa 1ère commande
  giftEvery:         5,  // cadeau plante offerte tous les 5 filleuls confirmés
};

// ---------------------------------------------------------------------------
// Générer un code parrainage unique
// ---------------------------------------------------------------------------

export function generateReferralCode(name: string, phone: string): string {
  const namePart = name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");

  const phonePart = phone.replace(/\D/g, "").slice(-4);
  return `${namePart}-${phonePart}`;
}

// ---------------------------------------------------------------------------
// Assurer que le client a un code parrainage
// ---------------------------------------------------------------------------

export async function ensureReferralCode(phone: string, name: string): Promise<string> {
  const [profile] = await db
    .select({ referralCode: customerProfiles.referralCode })
    .from(customerProfiles)
    .where(eq(customerProfiles.phone, phone));

  if (profile?.referralCode) return profile.referralCode;

  const code = generateReferralCode(name, phone);
  await db
    .update(customerProfiles)
    .set({ referralCode: code, updatedAt: new Date() })
    .where(eq(customerProfiles.phone, phone));

  return code;
}

// ---------------------------------------------------------------------------
// Valider un code parrainage au moment de la commande
// ---------------------------------------------------------------------------

export async function applyReferralCode(
  referralCode: string,
  newCustomerPhone: string,
  newCustomerName: string
): Promise<{ valid: boolean; discountPct: number; message: string }> {
  if (!referralCode?.trim()) return { valid: false, discountPct: 0, message: "" };

  // Trouver le parrain
  const [referrer] = await db
    .select({ phone: customerProfiles.phone, name: customerProfiles.name, isBlacklisted: customerProfiles.isBlacklisted })
    .from(customerProfiles)
    .where(eq(customerProfiles.referralCode, referralCode.toUpperCase().trim()));

  if (!referrer) return { valid: false, discountPct: 0, message: "Code de parrainage invalide." };
  if (referrer.isBlacklisted) return { valid: false, discountPct: 0, message: "Code de parrainage invalide." };
  if (referrer.phone === newCustomerPhone) return { valid: false, discountPct: 0, message: "Vous ne pouvez pas utiliser votre propre code." };

  // Vérifier si ce filleul a déjà utilisé un code
  const [existing] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.refereePhone, newCustomerPhone));

  if (existing) return { valid: false, discountPct: 0, message: "Vous avez déjà utilisé un code de parrainage." };

  // Créer l'entrée parrainage PENDING
  await db.insert(referrals).values({
    referrerPhone: referrer.phone,
    refereePhone:  newCustomerPhone,
    refereeName:   newCustomerName,
    status:        "PENDING",
    referrerRewardPct: REFERRAL_CONFIG.referrerRewardPct,
    refereeRewardPct:  REFERRAL_CONFIG.refereeRewardPct,
  });

  // Marquer le filleul comme parrainé
  await db
    .update(customerProfiles)
    .set({ referredByPhone: referrer.phone, updatedAt: new Date() })
    .where(eq(customerProfiles.phone, newCustomerPhone))
    .catch(() => {}); // peut ne pas encore exister, l'upsert loyalty le créera

  return {
    valid: true,
    discountPct: REFERRAL_CONFIG.refereeRewardPct,
    message: `Code valide ! Vous bénéficiez de ${REFERRAL_CONFIG.refereeRewardPct}% de remise grâce à votre parrain.`,
  };
}

// ---------------------------------------------------------------------------
// Confirmer le parrainage après 1ère livraison du filleul
// ---------------------------------------------------------------------------

export async function confirmReferral(refereePhone: string, orderId: number) {
  const [ref] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.refereePhone, refereePhone),
        eq(referrals.status, "PENDING")
      )
    );

  if (!ref) return;

  // Passer à CONFIRMED
  await db
    .update(referrals)
    .set({ status: "CONFIRMED", orderId, confirmedAt: new Date() })
    .where(eq(referrals.id, ref.id));

  // Cadeau filleul : remise sur prochaine commande
  await db.insert(customerGifts).values({
    customerPhone: refereePhone,
    customerName:  ref.refereeName,
    type:          "REFERRAL_REWARD",
    label:         `🎁 Remise parrainage ${ref.refereeRewardPct}% — offerte par votre parrain`,
    discountPct:   ref.refereeRewardPct,
    createdBy:     "system",
  });

  // Cadeau parrain : remise + incrément compteur
  await db
    .update(customerProfiles)
    .set({
      referralCount: sql`${customerProfiles.referralCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(customerProfiles.phone, ref.referrerPhone));

  const [referrer] = await db
    .select({ referralCount: customerProfiles.referralCount, name: customerProfiles.name })
    .from(customerProfiles)
    .where(eq(customerProfiles.phone, ref.referrerPhone));

  if (!referrer) return;

  // Cadeau remise 10% au parrain
  await db.insert(customerGifts).values({
    customerPhone: ref.referrerPhone,
    customerName:  referrer.name,
    type:          "REFERRAL_REWARD",
    label:         `🎁 Remise parrainage ${ref.referrerRewardPct}% — votre filleul ${ref.refereeName} a commandé !`,
    discountPct:   ref.referrerRewardPct,
    createdBy:     "system",
  });

  // Tous les 5 filleuls → plante offerte
  if (referrer.referralCount % REFERRAL_CONFIG.giftEvery === 0) {
    await db.insert(customerGifts).values({
      customerPhone: ref.referrerPhone,
      customerName:  referrer.name,
      type:          "FREE_PRODUCT",
      label:         `🌿 Plante offerte — ${referrer.referralCount} filleuls parrainés !`,
      createdBy:     "system",
    });
  }

  // Marquer REWARDED
  await db
    .update(referrals)
    .set({ status: "REWARDED", rewardedAt: new Date() })
    .where(eq(referrals.id, ref.id));
}
