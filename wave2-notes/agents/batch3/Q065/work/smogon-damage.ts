// Licence: MIT (donor). Shape of the donor's damage order, re-expressed in our own code; no donor lines copied.
const tr = (x: number): number => x >>> 0;             // unsigned 32-bit truncation, as the donor's trunc()
const tr16 = (x: number): number => (x >>> 0) % 65536;  // 16-bit wrap on the final damage, as the donor's tr(x, 16)

// Fixed-point multiply: modifier in 1/4096 units, result rounded to nearest (donor modify()).
function modify(value: number, mult: number): number {
  const modifier = tr(mult * 4096);
  return tr((tr(value * modifier) + 2048 - 1) / 4096);
}

// Attack and defence stages -6..+6, applied to the raw stat before the damage formula.
const STAGE = [1, 1.5, 2, 2.5, 3, 3.5, 4];
function applyStage(stat: number, stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? Math.floor(stat * STAGE[s]) : Math.floor(stat / STAGE[-s]);
}

// Crit stage 1..4 means a 1-in-N chance, N = CRIT_DENOM[stage]; stage 4 always crits.
const CRIT_DENOM = [0, 24, 8, 2, 1];

interface Hit {
  level: number;
  basePower: number;
  attack: number;      // stage-adjusted attacking stat, from the caller
  defense: number;     // stage-adjusted defending stat, from the caller
  stab: boolean;       // attacker shares the move's type
  typeSteps: number;   // +n = n doublings (super effective), -n = n halvings (resisted), clamped by caller
  burnedPhysical: boolean;
}

interface Rolls {
  crit: boolean;       // already rolled by the caller with CRIT_DENOM
  randomStep: number;  // 0..15, damage is then 85..100 percent
}

function computeDamage(h: Hit, r: Rolls): number {
  if (h.basePower <= 0) return 0;
  // int(int(int(2 * L / 5 + 2) * P * A / D) / 50), then +2
  let dmg = tr(tr(tr(tr((2 * h.level) / 5 + 2) * h.basePower * h.attack) / h.defense) / 50);
  dmg += 2;
  if (r.crit) dmg = tr(dmg * 1.5);                       // crit multiplier (gen 6+ value)
  dmg = tr(tr(dmg * (100 - r.randomStep)) / 100);        // random factor, 85..100 percent
  if (h.stab) dmg = modify(dmg, 1.5);
  for (let i = 0; i < h.typeSteps; i++) dmg *= 2;
  for (let i = 0; i > h.typeSteps; i--) dmg = tr(dmg / 2);
  if (h.burnedPhysical) dmg = modify(dmg, 0.5);
  if (dmg === 0) return 1;                               // a landed attack does at least 1
  return tr16(dmg);
}

export {};
