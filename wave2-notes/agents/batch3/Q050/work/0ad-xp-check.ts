// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

interface TierRules {
  requiredXp: number[];   // XP needed to leave tier i; the top tier has no entry
}

interface Veteran {
  tier: number;
  xp: number;
  alive: boolean;
}

// XP one hit is worth: the victim's loot XP times the share of its max health this hit removed.
function xpForHit(victimLootXp: number, healthRemoved: number, victimMaxHp: number): number {
  if (healthRemoved <= 0 || victimMaxHp <= 0) return 0;
  return (victimLootXp * healthRemoved) / victimMaxHp;
}

// Add XP, then climb as many tiers as the carried XP pays for.
function addXp(v: Veteran, amount: number, rules: TierRules): void {
  v.xp += amount;
  let tier = v.tier;
  while (tier < rules.requiredXp.length && v.xp >= rules.requiredXp[tier]) {
    v.xp -= rules.requiredXp[tier];
    tier += 1;
  }
  // XP is spent even when the unit is dead, but the tier only changes for a living unit (as in the donor).
  if (tier !== v.tier && v.alive) v.tier = tier;
}

// Example with the donor's infantry tier-0 requirement of 100 XP.
const rules: TierRules = { requiredXp: [100, 150] };
const v: Veteran = { tier: 0, xp: 0, alive: true };
addXp(v, xpForHit(100, 60, 120), rules); // 50 XP, still tier 0
addXp(v, xpForHit(130, 60, 120), rules); // +65 XP: 115 -> tier 1 with 15 carried

export {};
