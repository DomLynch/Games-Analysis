// Licence: GPL-3.0 (donor, LICENSE file). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  skill: number;            // attack skill as attacker, defend skill as defender
  str: number;
  anatomy: number;
  tactics: number;
  accuracyPct: number;      // attacker accuracy bonus, percentage points
  defendPct: number;        // defender defence bonus, percentage points
  weaponDamagePct: number;  // attacker weapon damage bonus, percentage points
}

export interface Split { phys: number; fire: number; cold: number; pois: number; nrgy: number; }  // percent, sums to 100
export interface Resist { phys: number; fire: number; cold: number; pois: number; nrgy: number; } // percent

const SKILL_OFFSET = 20;   // added to both skills in the hit ratio
const BONUS_CAP = 45;      // accuracy and defence bonus cap, percentage points
const HIT_FLOOR = 0.02;    // minimum hit chance
const DAMAGE_PCT_CAP = 300;

function bonus(value: number, scalar: number, threshold: number, offset: number): number {
  let b = value * scalar;
  if (value >= threshold) b += offset;
  return b / 100;
}

// Hit chance: attacker side over twice the defender side. Equal fighters give 0.5.
export function hitChance(atk: Fighter, def: Fighter): number {
  const ours = (atk.skill + SKILL_OFFSET) * (100 + Math.min(atk.accuracyPct, BONUS_CAP));
  const theirs = (def.skill + SKILL_OFFSET) * (100 + Math.min(def.defendPct, BONUS_CAP));
  return Math.max(HIT_FLOOR, ours / (theirs * 2));
}

// Certain miss below 0, certain hit at 1 or more, otherwise one roll against the chance.
export function rollHit(chance: number, rand: () => number): boolean {
  if (chance < 0) return false;
  if (chance >= 1) return true;
  return chance >= rand();
}

// Attacker strength, anatomy and tactics add a percentage of the base damage.
export function scaleDamage(base: number, atk: Fighter): number {
  const total =
    bonus(atk.str, 0.3, 100, 5) +
    bonus(atk.anatomy, 0.5, 100, 5) +
    bonus(atk.tactics, 0.625, 100, 6.25) +
    Math.min(atk.weaponDamagePct, 100) / 100;
  return Math.trunc(base + base * total);
}

// Named percentage sources (ability, slayer, honour, malus...) are summed, capped at 300, then applied.
export function applyPercentSources(damage: number, sourcesPct: number[]): number {
  let pct = 0;
  for (const s of sourcesPct) pct += s;
  pct = Math.min(pct, DAMAGE_PCT_CAP);
  return Math.trunc((damage * (100 + pct)) / 100);
}

// Each element hits at its share times (100 minus the target's resist); divide by 10000; at least 1 unless armour is ignored.
export function resistedDamage(damage: number, split: Split, res: Resist, ignoreArmour = false): number {
  if (damage <= 0) return 0;
  if (ignoreArmour) return damage;
  const sum =
    damage * split.phys * (100 - res.phys) +
    damage * split.fire * (100 - res.fire) +
    damage * split.cold * (100 - res.cold) +
    damage * split.pois * (100 - res.pois) +
    damage * split.nrgy * (100 - res.nrgy);
  return Math.max(1, Math.trunc(sum / 10000));
}

// One swing: roll the hit, then scale base damage, apply percent sources, then resists. Returns 0 on a miss.
export function resolveSwing(
  atk: Fighter, def: Fighter, base: number, sourcesPct: number[],
  split: Split, res: Resist, rand: () => number
): number {
  if (!rollHit(hitChance(atk, def), rand)) return 0;
  const scaled = scaleDamage(base, atk);
  const withSources = applyPercentSources(scaled, sourcesPct);
  return resistedDamage(withSources, split, res);
}
