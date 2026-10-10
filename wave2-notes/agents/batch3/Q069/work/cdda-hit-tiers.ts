// Licence: copyleft (CC-BY-SA 3.0 Unported, donor LICENSE.txt). Clean-room sketch of the described shape, not a translation.
// clean-room
export type HitTier = "miss" | "headshot" | "critical" | "good" | "standard" | "graze";

export interface HitResult { tier: HitTier; damageMult: number; isCrit: boolean; }

// Tier cut-offs on the goodhit scale: 0 = dead centre, 1 = miss.
const CUT = { headshot: 0.1, critical: 0.2, good: 0.5, standard: 0.8, graze: 1.0 };

// Goodhit = aim error plus the dodge share. avoidRoll and diffRoll are whole numbers from the attacker and defender.
export function goodhitFor(missedBy: number, avoidRoll: number, diffRoll: number): number {
  const dodgeShare = Math.max(0, Math.min(1, avoidRoll / diffRoll));
  return missedBy + dodgeShare;
}

// Classify one projectile hit. rnd() returns a uniform number in [0, 1).
// Checks run in donor order: miss, headshot, critical, good, standard, graze.
export function classifyHit(
  goodhit: number,
  critMult: number,   // projectile critical multiplier
  fatal: boolean,     // one hit would kill this body part or target
  isHead: boolean,
  critMod: number,    // body-part crit factor (1 for monsters)
  rnd: () => number,
): HitResult {
  if (goodhit >= CUT.graze) return { tier: "miss", damageMult: 0, isCrit: false };

  const stdHit = Math.sqrt(2 * critMult);
  const hitRoll = goodhit + rnd() * (1 - goodhit);   // uniform in [goodhit, 1)
  const critRoll = hitRoll * 0.5 < CUT.critical;     // more likely the closer the shot

  if (goodhit < CUT.headshot && (isHead || fatal)) {
    const m = (0.6 + 0.45 * critMod - 0.1 * hitRoll) * (stdHit + (critMult - stdHit) * critMod);
    return { tier: "headshot", damageMult: m, isCrit: true };
  }
  if (goodhit < CUT.critical && (critRoll || fatal)) {
    const m = (0.75 + 0.25 * critMod - 0.25 * hitRoll) * (stdHit + (critMult - stdHit) * critMod);
    return { tier: "critical", damageMult: m, isCrit: true };
  }
  if (goodhit < CUT.good) {
    return { tier: "good", damageMult: (1 - 0.5 * hitRoll) * stdHit, isCrit: false };
  }
  if (goodhit < CUT.standard) {
    return { tier: "standard", damageMult: 1.5 - hitRoll, isCrit: false };
  }
  return { tier: "graze", damageMult: 1.05 - hitRoll, isCrit: false };
}

export {};
