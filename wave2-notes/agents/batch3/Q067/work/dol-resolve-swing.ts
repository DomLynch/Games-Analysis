// Licence: GPL-2.0 (donor LICENSE, GNU GPL v2). Clean-room sketch of the shape only; not a translation.

type Result = "Evaded" | "Parried" | "Blocked" | "Missed" | "Hit";

interface Defender {
  evadeRaw: number;      // defence stat, raw units (scaled by 0.001 below); 0 when the defender lacks the ability or the attacker is outside the arc
  parryRaw: number;      // 0 when the defender has no Parry spec or buff, no weapon, or the attacker is outside the arc
  conLevel: number;      // the donor passes -GetConLevel(attacker) (3438); sign convention not read
  blockRaw: number;      // block stat times shield quality factor, raw units; 0 when no shield or the attacker is outside the arc
  shieldSize: number;    // 1 small, 2 medium, 3 large
  isPlayer: boolean;
}

interface Strike {
  melee: boolean;
  attackers: number;     // enemies currently attacking this defender
  attackerIsPlayer: boolean;
  toHitBonus: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// Defences are tried in order. Each returns a chance from 0 to 1; rng() decides.
function resolveSwing(d: Defender, s: Strike, rng: () => number, missReductionPerAttacker: number, blockCap: number): Result {
  const extra = Math.max(0, s.attackers - 1);

  // 1. Evade: many-attacker penalty is 0.03 in raw units, which is 0.00003 after scaling.
  // The donor applies scaling, con term, floor and cap only when the raw value is above zero (3770).
  if (d.evadeRaw > 0) {
    let evade = d.evadeRaw - extra * 0.03;
    evade = evade * 0.001 + 0.01 * d.conLevel;
    evade = clamp(evade, 0.01, 0.995);
    if (rng() < evade) return "Evaded";
  }

  // 2. Parry (melee only). Divisor is attackers / 2 in integer division, floor 1.
  if (s.melee && d.parryRaw > 0) {
    let parry = d.parryRaw;
    if (s.attackers > 1) parry /= Math.max(1, Math.trunc(s.attackers / 2));
    parry = parry * 0.001 + 0.05 * d.conLevel;
    parry = clamp(parry, 0.01, 0.995);
    if (rng() < parry) return "Parried";
  }

  // 3. Block (shield). Once attackers exceed shield size the factor is an integer 0, but the con term and the 0.01 floor still apply.
  if (d.blockRaw > 0) {
    let block = d.blockRaw;
    if (d.isPlayer && s.attackers > d.shieldSize) block *= Math.trunc(d.shieldSize / s.attackers);
    block = block * 0.001 + 0.05 * d.conLevel;
    block = clamp(block, 0.01, blockCap);
    if (rng() < block) return "Blocked";
  }

  // 4. Miss roll, percent. Starts at 20 (player attacker) or 25, reduced per extra attacker in PvE.
  let missPct = (s.attackerIsPlayer ? 20 : 25) - s.toHitBonus;
  if (!(d.isPlayer && s.attackerIsPlayer)) missPct -= extra * missReductionPerAttacker;
  if (rng() * 100 < missPct) return "Missed";

  return "Hit";
}

// Damage on a hit: weapon skill against armour factor, absorb capped at 0.85, a random band, then the cap.
// `cap` is UnstyledDamageCap times effectiveness in the donor (1802).
function hitDamage(raw: number, weaponSkill: number, armourFactor: number, absorb: number, bandLow: number, cap: number): number {
  let dmg = raw * (weaponSkill + 90.68) / (armourFactor + 20 * 4.67);
  dmg *= 1 - Math.min(0.85, absorb);
  dmg *= (bandLow + Math.floor(Math.random() * 51)) * 0.01;   // bandLow in percent; donor Util.Random(50) is 0..50 inclusive
  return Math.min(Math.trunc(dmg), Math.trunc(cap));
}
export { resolveSwing, hitDamage };
