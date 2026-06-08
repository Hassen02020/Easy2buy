/**
 * lib/loyalty.ts
 * ---------------
 * Logique de fidélité client :
 *   - Upsert du profil à chaque commande
 *   - Calcul du score (0–100) et du tier
 *   - Blacklist automatique si seuil dépassé
 *   - Recalcul global (cron)
 */

import { db } from "@/db";
import { customerProfiles, orders, customerGifts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { CustomerTier } from "@/db/schema";

// ---------------------------------------------------------------------------
// Config seuils
// ---------------------------------------------------------------------------

export const LOYALTY_CONFIG = {
  /** Seuils de tier (nb commandes livrées) */
  tiers: {
    BRONZE: 2,
    SILVER: 5,
    GOLD:   10,
  },
  /** Remises automatiques par tier (%) */
  discounts: {
    NEW:       0,
    BRONZE:    5,
    SILVER:    10,
    GOLD:      15,
    BLACKLIST: 0,
  },
  /** Blacklist automatique si : */
  blacklist: {
    maxCancelRate:  0.6,  // > 60% d'annulations sur ≥ 3 commandes
    maxReturnRate:  0.5,  // > 50% de retours sur ≥ 3 commandes
    maxNoAnswer:    3,    // > 3 fois sans réponse
  },
};

// ---------------------------------------------------------------------------
// Calcul score (0–100)
// ---------------------------------------------------------------------------

interface ScoreInput {
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders:  number;
  noAnswerCount:   number;
  totalOrders:     number;
  totalSpent:      number;
  referralCount?:  number;
}

export function calcLoyaltyScore(s: ScoreInput): number {
  if (s.totalOrders === 0) return 0;

  // Base : % de livraisons réussies (0–50 pts)
  const deliveryRate = s.deliveredOrders / Math.max(s.totalOrders, 1);
  const base = deliveryRate * 50;

  // Bonus fidélité : nb commandes livrées (0–25 pts)
  const fidelityBonus = Math.min(s.deliveredOrders * 2.5, 25);

  // Bonus parrainage (0–15 pts)
  const referralBonus = Math.min((s as ScoreInput & { referralCount?: number }).referralCount ?? 0, 5) * 3;

  // Pénalités
  const cancelPenalty  = s.cancelledOrders * 5;
  const returnPenalty  = s.returnedOrders  * 8;
  const noAnswerPenalty = s.noAnswerCount  * 6;

  const raw = base + fidelityBonus + referralBonus - cancelPenalty - returnPenalty - noAnswerPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ---------------------------------------------------------------------------
// Calcul tier
// ---------------------------------------------------------------------------

export function calcTier(
  score: number,
  deliveredOrders: number,
  isBlacklisted: boolean
): CustomerTier {
  if (isBlacklisted) return "BLACKLIST";
  if (score < 10 && deliveredOrders >= 3) return "BLACKLIST"; // score catastrophique
  if (deliveredOrders >= LOYALTY_CONFIG.tiers.GOLD)   return "GOLD";
  if (deliveredOrders >= LOYALTY_CONFIG.tiers.SILVER) return "SILVER";
  if (deliveredOrders >= LOYALTY_CONFIG.tiers.BRONZE) return "BRONZE";
  return "NEW";
}

// ---------------------------------------------------------------------------
// Vérification blacklist automatique
// ---------------------------------------------------------------------------

interface BlacklistCheck {
  shouldBlacklist: boolean;
  reason: string | null;
}

export function checkAutoBlacklist(s: ScoreInput): BlacklistCheck {
  const cfg = LOYALTY_CONFIG.blacklist;

  if (s.noAnswerCount >= cfg.maxNoAnswer) {
    return { shouldBlacklist: true, reason: `Sans réponse ${s.noAnswerCount} fois` };
  }

  if (s.totalOrders >= 3) {
    const cancelRate = s.cancelledOrders / s.totalOrders;
    if (cancelRate > cfg.maxCancelRate) {
      return {
        shouldBlacklist: true,
        reason: `Taux d'annulation trop élevé (${Math.round(cancelRate * 100)}%)`,
      };
    }

    const returnRate = s.returnedOrders / s.totalOrders;
    if (returnRate > cfg.maxReturnRate) {
      return {
        shouldBlacklist: true,
        reason: `Taux de retour trop élevé (${Math.round(returnRate * 100)}%)`,
      };
    }
  }

  return { shouldBlacklist: false, reason: null };
}

// ---------------------------------------------------------------------------
// Upsert profil après chaque commande (appelé par le webhook/route orders)
// ---------------------------------------------------------------------------

export async function upsertCustomerProfile(phone: string, name: string) {
  // Agréger les stats depuis les commandes
  const stats = await db
    .select({
      totalOrders:     sql<number>`count(*)::int`,
      deliveredOrders: sql<number>`count(*) filter (where status = 'DELIVERED')::int`,
      cancelledOrders: sql<number>`count(*) filter (where status = 'CANCELLED')::int`,
      returnedOrders:  sql<number>`count(*) filter (where status = 'RETURNED')::int`,
      totalSpent:      sql<number>`coalesce(sum(case when status = 'DELIVERED' then total::numeric else 0 end), 0)`,
      lastOrderAt:     sql<string>`max(created_at)`,
    })
    .from(orders)
    .where(eq(orders.customerPhone, phone));

  const s = stats[0];
  const scoreInput: ScoreInput = {
    deliveredOrders: s.deliveredOrders,
    cancelledOrders: s.cancelledOrders,
    returnedOrders:  s.returnedOrders,
    noAnswerCount:   0, // mis à jour séparément par l'admin
    totalOrders:     s.totalOrders,
    totalSpent:      Number(s.totalSpent),
  };

  // Lire données existantes
  const [existing] = await db
    .select({
      noAnswerCount:  customerProfiles.noAnswerCount,
      isBlacklisted:  customerProfiles.isBlacklisted,
      referralCount:  customerProfiles.referralCount,
      referralCode:   customerProfiles.referralCode,
      referredByPhone: customerProfiles.referredByPhone,
      tier:           customerProfiles.tier,
    })
    .from(customerProfiles)
    .where(eq(customerProfiles.phone, phone));

  const noAnswerCount  = existing?.noAnswerCount ?? 0;
  const wasBlacklisted = existing?.isBlacklisted ?? false;
  const referralCount  = existing?.referralCount ?? 0;
  const prevTier       = existing?.tier ?? "NEW";

  scoreInput.noAnswerCount = noAnswerCount;
  scoreInput.referralCount  = referralCount;

  const score = calcLoyaltyScore(scoreInput);
  const autoBlacklist = checkAutoBlacklist(scoreInput);
  const isBlacklisted = wasBlacklisted || autoBlacklist.shouldBlacklist;
  const tier = calcTier(score, s.deliveredOrders, isBlacklisted);
  const discountPct = LOYALTY_CONFIG.discounts[tier];

  await db
    .insert(customerProfiles)
    .values({
      phone,
      name,
      totalOrders:     s.totalOrders,
      deliveredOrders: s.deliveredOrders,
      cancelledOrders: s.cancelledOrders,
      returnedOrders:  s.returnedOrders,
      noAnswerCount,
      totalSpent:      String(s.totalSpent),
      loyaltyScore:    score,
      tier,
      discountPct,
      isBlacklisted,
      blacklistReason: autoBlacklist.reason,
      blacklistedAt:   isBlacklisted && !wasBlacklisted ? new Date() : undefined,
      lastOrderAt:     s.lastOrderAt ? new Date(s.lastOrderAt) : undefined,
    })
    .onConflictDoUpdate({
      target: customerProfiles.phone,
      set: {
        name,
        totalOrders:     s.totalOrders,
        deliveredOrders: s.deliveredOrders,
        cancelledOrders: s.cancelledOrders,
        returnedOrders:  s.returnedOrders,
        noAnswerCount,
        totalSpent:      String(s.totalSpent),
        loyaltyScore:    score,
        tier,
        discountPct,
        isBlacklisted,
        blacklistReason: sql`CASE WHEN ${isBlacklisted} AND NOT is_blacklisted THEN ${autoBlacklist.reason} ELSE blacklist_reason END`,
        blacklistedAt:   sql`CASE WHEN ${isBlacklisted} AND NOT is_blacklisted THEN NOW() ELSE blacklisted_at END`,
        lastOrderAt:     s.lastOrderAt ? new Date(s.lastOrderAt) : undefined,
        updatedAt:       new Date(),
      },
    });

  // Générer un cadeau si le client vient de monter de tier
  const tierOrder: CustomerTier[] = ["NEW", "BRONZE", "SILVER", "GOLD"];
  const prevIdx = tierOrder.indexOf(prevTier as CustomerTier);
  const newIdx  = tierOrder.indexOf(tier as CustomerTier);
  if (!isBlacklisted && newIdx > prevIdx && newIdx > 0) {
    const giftLabels: Record<string, string> = {
      BRONZE: "🥉 Bienvenue au niveau Bronze ! Remise 5% sur votre prochaine commande",
      SILVER: "🥈 Niveau Argent atteint ! Remise 10% + livraison prioritaire",
      GOLD:   "🥇 Niveau Or atteint ! Remise 15% + cadeau surprise à votre prochaine commande",
    };
    await db.insert(customerGifts).values({
      customerPhone: phone,
      customerName:  name,
      type:  tier === "GOLD" ? "FREE_PRODUCT" : "DISCOUNT_COUPON",
      label: giftLabels[tier] ?? `Félicitations ! Nouveau tier : ${tier}`,
      discountPct: LOYALTY_CONFIG.discounts[tier as CustomerTier],
      createdBy: "system",
    }).catch(() => {}); // silencieux si déjà créé
  }

  return { score, tier, discountPct, isBlacklisted };
}

// ---------------------------------------------------------------------------
// Recalcul global (appelé par le cron)
// ---------------------------------------------------------------------------

export async function recalculateAllProfiles() {
  const profiles = await db.select().from(customerProfiles);

  for (const p of profiles) {
    if (!p.isBlacklisted) {
      await upsertCustomerProfile(p.phone, p.name);
    }
  }

  return profiles.length;
}
