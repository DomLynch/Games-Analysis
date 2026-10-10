// Licence: GPL-3.0-or-later (donor, zone/attack.cpp header: "either version 3 of the License, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface FinishRule {
  hpLimitPct: number;        // donor default 10 (percent of max HP)
  chancePerMille: number;    // 0..1000; donor compares against a 1..1000 roll
  flatDamage: number;        // replaces the hit's damage when it fires
  levelCap: number;          // defender level must be <= this; 0 means no finish
  onlyWhenFleeing: boolean;  // donor rule flag, default false
}

export interface FinishTarget {
  hp: number;
  maxHp: number;
  level: number;
  isPlayer: boolean;   // donor: never finishes a client
  fleeing: boolean;
}

// Returns the flat damage if the finish fires, otherwise null. roll(lo, hi) is an inclusive integer roll.
export function tryFinish(
  rule: FinishRule,
  t: FinishTarget,
  roll: (lo: number, hi: number) => number,
): number | null {
  if (t.isPlayer) return null;
  const hpPct = t.maxHp > 0 ? (t.hp / t.maxHp) * 100 : 0;
  if (!(hpPct < rule.hpLimitPct)) return null;
  if (rule.onlyWhenFleeing && !t.fleeing) return null;
  if (rule.levelCap <= 0 || rule.flatDamage <= 0) return null;
  if (t.level > rule.levelCap) return null;
  if (rule.chancePerMille < roll(1, 1000)) return null;
  return rule.flatDamage;
}

// Donor order: the finish is tried only after a successful crit roll, and it replaces the crit damage.
// Returns null when there is no crit (the caller keeps the normal hit), otherwise the damage to apply.
export function critOrFinish(
  critRollBelow: boolean,   // donor: roll < dexBonus
  rule: FinishRule,
  t: FinishTarget,
  roll: (lo: number, hi: number) => number,
  critDamage: () => number,
): number | null {
  if (!critRollBelow) return null;
  const finished = tryFinish(rule, t, roll);
  return finished !== null ? finished : critDamage();
}
export {};
