/**
 * /admin/customers
 * -----------------
 * Tableau de bord fidélité clients :
 *   - Score, tier, remise
 *   - Actions : blacklist, incrément noAnswer, ajuster remise, notes
 */

import { db } from "@/db";
import { customerProfiles, referrals, customerGifts } from "@/db/schema";
import { desc, eq, count, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CustomerTier } from "@/db/schema";
import { LOYALTY_CONFIG } from "@/lib/loyalty";
import { REFERRAL_CONFIG } from "@/lib/referral";
import { AdminNav } from "@/components/AdminNav";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { StaffRole } from "@/db/schema";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

async function blacklistCustomer(formData: FormData): Promise<void> {
  "use server";
  const id     = Number(formData.get("id"));
  const reason = String(formData.get("reason") || "Blacklisté manuellement par l'admin");
  await db.update(customerProfiles).set({
    isBlacklisted: true,
    tier: "BLACKLIST",
    blacklistReason: reason,
    blacklistedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(customerProfiles.id, id));
  revalidatePath("/admin/customers");
}

async function unblacklistCustomer(formData: FormData): Promise<void> {
  "use server";
  const id = Number(formData.get("id"));
  await db.update(customerProfiles).set({
    isBlacklisted: false,
    tier: "BRONZE",
    blacklistReason: null,
    blacklistedAt: null,
    updatedAt: new Date(),
  }).where(eq(customerProfiles.id, id));
  revalidatePath("/admin/customers");
}

async function incrementNoAnswer(formData: FormData): Promise<void> {
  "use server";
  const id = Number(formData.get("id"));
  const [c] = await db.select({ noAnswerCount: customerProfiles.noAnswerCount })
    .from(customerProfiles).where(eq(customerProfiles.id, id));
  const newCount = (c?.noAnswerCount ?? 0) + 1;
  const autoBlacklist = newCount >= LOYALTY_CONFIG.blacklist.maxNoAnswer;
  await db.update(customerProfiles).set({
    noAnswerCount: newCount,
    ...(autoBlacklist ? {
      isBlacklisted: true,
      tier: "BLACKLIST" as CustomerTier,
      blacklistReason: `Sans réponse ${newCount} fois`,
      blacklistedAt: new Date(),
    } : {}),
    updatedAt: new Date(),
  }).where(eq(customerProfiles.id, id));
  revalidatePath("/admin/customers");
}

async function updateDiscount(formData: FormData): Promise<void> {
  "use server";
  const id  = Number(formData.get("id"));
  const pct = Math.min(50, Math.max(0, Number(formData.get("discountPct"))));
  await db.update(customerProfiles).set({ discountPct: pct, updatedAt: new Date() })
    .where(eq(customerProfiles.id, id));
  revalidatePath("/admin/customers");
}

async function addManualGift(formData: FormData): Promise<void> {
  "use server";
  const phone = String(formData.get("phone"));
  const name  = String(formData.get("name"));
  const label = String(formData.get("label") || "Cadeau offert par l'admin");
  const pct   = Number(formData.get("pct") || 0);
  await db.insert(customerGifts).values({
    customerPhone: phone,
    customerName:  name,
    type:          pct > 0 ? "DISCOUNT_COUPON" : "FREE_PRODUCT",
    label,
    discountPct:   pct > 0 ? pct : null,
    createdBy:     "admin",
  });
  revalidatePath("/admin/customers");
}

async function markGiftUsed(formData: FormData): Promise<void> {
  "use server";
  const id = Number(formData.get("giftId"));
  await db.update(customerGifts).set({ isUsed: true, usedAt: new Date() })
    .where(eq(customerGifts.id, id));
  revalidatePath("/admin/customers");
}

// ---------------------------------------------------------------------------
// Helpers UI
// ---------------------------------------------------------------------------

const TIER_CONFIG: Record<CustomerTier, { label: string; color: string; icon: string }> = {
  NEW:       { label: "Nouveau",  color: "bg-gray-100 text-gray-600",    icon: "🌱" },
  BRONZE:    { label: "Bronze",   color: "bg-orange-100 text-orange-700", icon: "🥉" },
  SILVER:    { label: "Argent",   color: "bg-slate-100 text-slate-700",  icon: "🥈" },
  GOLD:      { label: "Or",       color: "bg-yellow-100 text-yellow-700", icon: "🥇" },
  BLACKLIST: { label: "Blacklist",color: "bg-red-100 text-red-700",      icon: "🚫" },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminCustomersPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const customers = await db
    .select()
    .from(customerProfiles)
    .orderBy(desc(customerProfiles.loyaltyScore));

  // Cadeaux actifs (non utilisés) par client
  const allGifts = await db
    .select()
    .from(customerGifts)
    .where(eq(customerGifts.isUsed, false));

  // Parrainages confirmés par parrain
  const allReferrals = await db
    .select()
    .from(referrals);

  const giftsByPhone = allGifts.reduce<Record<string, typeof allGifts>>((acc, g) => {
    acc[g.customerPhone] ??= [];
    acc[g.customerPhone].push(g);
    return acc;
  }, {});

  const pendingReferralsByPhone = allReferrals.reduce<Record<string, number>>((acc, r) => {
    if (r.status === "PENDING") acc[r.referrerPhone] = (acc[r.referrerPhone] ?? 0) + 1;
    return acc;
  }, {});

  const gold     = customers.filter(c => c.tier === "GOLD").length;
  const silver   = customers.filter(c => c.tier === "SILVER").length;
  const bronze   = customers.filter(c => c.tier === "BRONZE").length;
  const blacklisted = customers.filter(c => c.isBlacklisted).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="/admin/customers" role={session!.role as StaffRole} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Clients & Fidélité</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} clients enregistrés</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Or 🥇",       val: gold,      color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "Argent 🥈",   val: silver,    color: "bg-slate-50 border-slate-200 text-slate-700" },
            { label: "Bronze 🥉",   val: bronze,    color: "bg-orange-50 border-orange-200 text-orange-700" },
            { label: "Blacklistés 🚫", val: blacklisted, color: "bg-red-50 border-red-200 text-red-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-2xl font-extrabold">{s.val}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                {["Client", "Commandes", "Dépensé", "Score", "Tier", "Parrainage", "Cadeaux", "Remise", "Sans rép.", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Aucun client enregistré.</td></tr>
              )}
              {customers.map(c => {
                const tier = TIER_CONFIG[c.tier];
                return (
                  <tr key={c.id} className={`transition-colors ${c.isBlacklisted ? "bg-red-50/60" : "hover:bg-gray-50"}`}>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                      {c.referralCode && (
                        <p className="text-xs text-amber-600 mt-0.5 font-mono font-bold">{c.referralCode}</p>
                      )}
                      {c.isBlacklisted && (
                        <p className="text-xs text-red-500 mt-0.5">🚫 {c.blacklistReason}</p>
                      )}
                    </td>

                    {/* Stats commandes */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-700">{c.totalOrders} total</p>
                      <p className="text-xs text-green-600">✅ {c.deliveredOrders} livrées</p>
                      <p className="text-xs text-red-500">❌ {c.cancelledOrders} ann. · ↩ {c.returnedOrders} ret.</p>
                    </td>

                    {/* Dépensé */}
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {Number(c.totalSpent).toFixed(3)} TND
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3"><ScoreBar score={c.loyaltyScore} /></td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${tier.color}`}>
                        {tier.icon} {tier.label}
                      </span>
                    </td>

                    {/* Parrainage */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-700">
                          🤝 {c.referralCount} filleul{c.referralCount !== 1 ? "s" : ""}
                        </p>
                        {(pendingReferralsByPhone[c.phone] ?? 0) > 0 && (
                          <p className="text-xs text-amber-600">⏳ {pendingReferralsByPhone[c.phone]} en attente</p>
                        )}
                        {c.referredByPhone && (
                          <p className="text-xs text-gray-400">Parrainé par {c.referredByPhone}</p>
                        )}
                        {c.referralCode && (
                          <p className="text-xs text-gray-400">Code : <span className="font-mono font-bold text-amber-600">{c.referralCode}</span></p>
                        )}
                      </div>
                    </td>

                    {/* Cadeaux actifs */}
                    {(() => {
                      const gifts = giftsByPhone[c.phone] ?? [];
                      return (
                        <td className="px-4 py-3">
                          {gifts.length === 0 ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : (
                            <div className="space-y-1">
                              {gifts.slice(0, 3).map(g => (
                                <div key={g.id} className="flex items-center gap-1">
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold max-w-[140px] truncate" title={g.label}>
                                    {g.label}
                                  </span>
                                  <form action={markGiftUsed}>
                                    <input type="hidden" name="giftId" value={g.id} />
                                    <button type="submit" className="text-xs text-gray-400 hover:text-red-500" title="Marquer comme utilisé">✓</button>
                                  </form>
                                </div>
                              ))}
                              {gifts.length > 3 && <p className="text-xs text-gray-400">+{gifts.length - 3} autre(s)</p>}
                            </div>
                          )}
                          {/* Ajouter cadeau manuel */}
                          <details className="mt-1">
                            <summary className="text-xs text-forest-600 cursor-pointer hover:underline">🎁 Offrir</summary>
                            <form action={addManualGift} className="mt-1 space-y-1">
                              <input type="hidden" name="phone" value={c.phone} />
                              <input type="hidden" name="name" value={c.name} />
                              <input type="text" name="label" placeholder="Description du cadeau" required
                                className="text-xs border border-gray-200 rounded px-2 py-1 w-full" />
                              <div className="flex gap-1">
                                <input type="number" name="pct" placeholder="% remise (0=plante)" min={0} max={50}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 w-24" />
                                <button type="submit" className="text-xs bg-forest-600 text-white px-2 py-1 rounded hover:bg-forest-700">✓</button>
                              </div>
                            </form>
                          </details>
                        </td>
                      );
                    })()}

                    {/* Remise */}
                    <td className="px-4 py-3">
                      <form action={updateDiscount} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="number" name="discountPct"
                          defaultValue={c.discountPct} min={0} max={50}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center"
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <button type="submit" className="text-xs bg-forest-600 text-white px-2 py-1 rounded-lg hover:bg-forest-700">✓</button>
                      </form>
                    </td>

                    {/* Sans réponse */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${c.noAnswerCount >= 3 ? "text-red-600" : "text-gray-600"}`}>
                          {c.noAnswerCount}
                        </span>
                        <form action={incrementNoAnswer}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit"
                            className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-200 font-semibold"
                            title="Marquer sans réponse">
                            +1
                          </button>
                        </form>
                      </div>
                    </td>

                    {/* Actions blacklist */}
                    <td className="px-4 py-3">
                      {!c.isBlacklisted ? (
                        <form action={blacklistCustomer} className="flex flex-col gap-1">
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="text" name="reason"
                            placeholder="Motif (optionnel)"
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-36"
                          />
                          <button type="submit"
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-3 py-1 rounded-lg">
                            🚫 Blacklister
                          </button>
                        </form>
                      ) : (
                        <form action={unblacklistCustomer}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit"
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-semibold px-3 py-1 rounded-lg">
                            ✅ Débloquer
                          </button>
                        </form>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Légende scores */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-sm">
          <h3 className="font-bold text-gray-700 mb-3">Règles de fidélité & parrainage</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-600">
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">🏆 Tiers (livraisons réussies)</p>
              <p>🌱 Nouveau : 0–1 commande</p>
              <p>🥉 Bronze : {LOYALTY_CONFIG.tiers.BRONZE}–{LOYALTY_CONFIG.tiers.SILVER - 1} → {LOYALTY_CONFIG.discounts.BRONZE}% remise</p>
              <p>🥈 Argent : {LOYALTY_CONFIG.tiers.SILVER}–{LOYALTY_CONFIG.tiers.GOLD - 1} → {LOYALTY_CONFIG.discounts.SILVER}% remise</p>
              <p>🥇 Or : {LOYALTY_CONFIG.tiers.GOLD}+ → {LOYALTY_CONFIG.discounts.GOLD}% remise + 🌿 cadeau</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">🤝 Parrainage</p>
              <p>🎁 Filleul : {REFERRAL_CONFIG.refereeRewardPct}% remise sur 1ère commande</p>
              <p>🎁 Parrain : {REFERRAL_CONFIG.referrerRewardPct}% remise par filleul livré</p>
              <p>🌿 Plante offerte tous les {REFERRAL_CONFIG.giftEvery} filleuls</p>
              <p className="text-gray-400">Code généré automatiquement à la 1ère commande</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">🚫 Blacklist automatique</p>
              <p>🚫 {LOYALTY_CONFIG.blacklist.maxNoAnswer}+ fois sans réponse</p>
              <p>🚫 &gt;{LOYALTY_CONFIG.blacklist.maxCancelRate * 100}% d'annulations (≥3 cmd)</p>
              <p>🚫 &gt;{LOYALTY_CONFIG.blacklist.maxReturnRate * 100}% de retours (≥3 cmd)</p>
              <p className="text-gray-400">Commandes bloquées automatiquement</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
