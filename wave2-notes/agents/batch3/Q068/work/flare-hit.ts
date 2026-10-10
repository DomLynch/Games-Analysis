// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface CombatCfg {
  minResist: number; maxResist: number;        // resist clamp, percent
  minAbsorb: number; maxAbsorb: number;        // armour absorb, percent of the hit
  minBlock: number; maxBlock: number;          // absorb while blocking, percent of the hit
  minAvoidance: number; maxAvoidance: number;  // miss chance clamp, percent
  minCrit: number; maxCrit: number;            // crit damage, percent of the hit
  minOverhit: number; maxOverhit: number;      // overhit damage, percent of the hit
  minMiss: number; maxMiss: number;            // miss damage, percent of the hit
}

// Defaults as the donor's Combat::load() sets them in code before any mod file is read.
export const DEFAULT_CFG: CombatCfg = {
  minResist: 0, maxResist: 100, minAbsorb: 0, maxAbsorb: 100, minBlock: 0, maxBlock: 100,
  minAvoidance: 0, maxAvoidance: 100, minCrit: 200, maxCrit: 200, minOverhit: 100, maxOverhit: 100,
  minMiss: 0, maxMiss: 0,
};

export interface Strike {
  parts: { min: number; max: number }[];   // damage by type, before resist
  accuracy: number;                        // percent
  critChance: number;                      // percent
  perfectAccuracy: boolean;
  armourPenetration: boolean;
  ignoreZeroDamage: boolean;
}

export interface Target {
  avoidance: number;                       // percent
  resist: number[];                        // per damage type; negative = weakness
  absMin: number; absMax: number;          // armour range
  blocking: boolean;
}

export interface HitOutcome { damage: number; crit: boolean; missed: boolean; overhit: boolean; }

// roll() returns a uniform number in [0, 1). percentChance(p) is true when roll*100 < p.
function between(roll: () => number, min: number, max: number): number {
  return min === max ? min : min + roll() * (max - min);
}
function percentChance(roll: () => number, pct: number): boolean {
  return roll() * 100 < pct;
}

// Resist: clamp non-negative resist to the configured range; weakness is not clamped. Result is damage * (100 - resist) / 100.
function applyResist(dmg: number, resist: number, c: CombatCfg): number {
  let r = resist;
  if (r >= 0) r = Math.min(Math.max(r, c.minResist), c.maxResist);
  return (dmg * (100 - r)) / 100;
}

export function resolveHit(s: Strike, t: Target, c: CombatCfg, roll: () => number): HitOutcome {
  // Accuracy against avoidance. The overhit roll happens before the clamp, as in the donor.
  let trueAvoid = 100 - (s.accuracy - t.avoidance);
  const overhit = trueAvoid < 0 && !s.perfectAccuracy ? percentChance(roll, Math.abs(trueAvoid)) : false;
  trueAvoid = Math.min(Math.max(trueAvoid, c.minAvoidance), c.maxAvoidance);
  const missed = !s.perfectAccuracy && percentChance(roll, trueAvoid);

  // Base damage, then resist per type.
  let dmg = 0;
  s.parts.forEach((p, i) => {
    dmg += applyResist(between(roll, p.min, p.max), t.resist[i] ?? 0, c);
  });

  // Armour: absorb is clamped to a percent of the hit (block range while blocking); armour penetration skips it.
  if (!s.armourPenetration) {
    let absorb = between(roll, t.absMin, t.absMax);
    if (absorb > 0 && dmg > 0) {
      const pct = (absorb * 100) / dmg;
      const lo = t.blocking ? c.minBlock : c.minAbsorb;
      const hi = t.blocking ? c.maxBlock : c.maxAbsorb;
      if (pct < lo) absorb = (dmg * lo) / 100;
      if (pct > hi) absorb = (dmg * hi) / 100;
      if (absorb === 0) absorb = 1;
    }
    dmg -= absorb;
    if (dmg <= 0) {
      dmg = 0;
      if (!s.ignoreZeroDamage) {
        if (t.blocking && c.maxBlock < 100) dmg = 1;
        else if (!t.blocking && c.maxAbsorb < 100) dmg = 1;
      }
    }
  }

  // Crit beats overhit; a miss multiplies on top, after the crit or overhit step.
  const crit = percentChance(roll, s.critChance);
  if (crit) dmg = (dmg * between(roll, c.minCrit, c.maxCrit)) / 100;
  else if (overhit) dmg = (dmg * between(roll, c.minOverhit, c.maxOverhit)) / 100;
  if (missed) dmg = (dmg * between(roll, c.minMiss, c.maxMiss)) / 100;

  return { damage: Math.round(dmg), crit, missed, overhit };
}
export {}
