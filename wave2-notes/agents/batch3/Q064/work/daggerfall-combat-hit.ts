// Licence: MIT (donor). Shape taken from the donor's hit roll, damage roll and knockback steps; written fresh, not a line-by-line translation.
export const HIT_MIN = 3;                 // donor clamp, FormulaHelper.cs 825
export const HIT_MAX = 97;
export const MONSTER_TARGET_BONUS = 40;   // donor 1244, monster targets only
export const FINAL_OFFSET = -50;          // donor 1248
export const KNOCK_MIN = 15;              // classic units, WeaponManager.cs 590 / EnemyAttack.cs 348
export const KNOCK_CAP = 40;              // classic units, EnemyMotor.cs 277
export const KNOCK_MOTION_CAP = 25;       // classic units, EnemyMotor.cs 290
export const KNOCK_DECAY = 5;             // classic units per classic update, EnemyMotor.cs 303
export const KNOCK_HURT = 5;              // EnemyMotor.cs 272-282

export interface HitInput {
  weaponSkill: number;        // attacker's live skill for the weapon
  weaponMaterialMod: number;  // weapon material modifier, counts x10 to the to-hit
  armourOnPart: number;       // armour value on the struck body part
  luckDiff: number;           // attacker luck minus target luck
  agilityDiff: number;        // attacker agility minus target agility
  targetDodging: number;      // target's dodging skill (divided by 4)
  critSkill: number;          // attacker's CriticalStrike skill
  critRolled: boolean;        // result of the crit roll against critSkill
  targetIsPlayer: boolean;
  targetIsMonster: boolean;
  biographyAvoid: number;     // subtracted when the target is the player
}

// Sum the named terms, clamp to 3..97, then the caller rolls once against the result.
// C# integer division truncates toward zero; Math.trunc matches it for integers.
export function hitChance(h: HitInput): number {
  let c = h.weaponSkill + h.weaponMaterialMod * 10 + h.armourOnPart;
  c += Math.trunc(h.luckDiff / 10) + Math.trunc(h.agilityDiff / 10);
  c -= Math.trunc(h.targetDodging / 4);
  if (h.critRolled) c += Math.trunc(h.critSkill / 10);
  if (h.targetIsPlayer) c -= h.biographyAvoid;
  if (!h.targetIsPlayer && h.targetIsMonster) c += MONSTER_TARGET_BONUS;
  c += FINAL_OFFSET;
  return Math.min(HIT_MAX, Math.max(HIT_MIN, c));
}

// Dice100.SuccessRoll: roll is an integer 0..99; the hit lands when roll < chance.
export function hits(chance: number, roll: number): boolean {
  return roll < chance;
}

// Base damage is a uniform integer in [min, max]; then strength and material are added; a result below 1 becomes 0.
export function damageRoll(min: number, max: number, unit01: number, strength: number, materialMod: number): number {
  let d = min + Math.floor(unit01 * (max - min + 1));
  d += Math.floor((strength - 50) / 5);
  d += materialMod;
  return d < 1 ? 0 : d;
}

// Backstab: only when the backstab level is above 1 and its roll succeeds, damage is tripled.
export function backstab(damage: number, level: number, roll: number): number {
  return level > 1 && roll < level ? damage * 3 : damage;
}

// Knockback speed in classic units. Closed form of the donor's two-step expression (see note section 1).
// Caller passes damage > 0 and weight > 0, which the donor's gates ensure.
export function knockbackSpeedClassic(damage: number, weight: number): number {
  const speed = (40 * damage * damage) / (weight + 10 * damage);
  return Math.max(KNOCK_MIN, speed);
}

// Applied on a hit. The gate is the EnemyAttack.cs grouping: a push only replaces a near-stopped one, and only for EnemyClass or weighted targets.
export function applyKnockback(current: number, damage: number, weight: number, isEnemyClass: boolean): number {
  if (damage <= 0) return current;
  if (!(current <= KNOCK_HURT && (isEnemyClass || weight > 0))) return current;
  return knockbackSpeedClassic(damage, weight);
}

// Each fixed step: the stored speed is capped, then the motion is capped separately.
export function knockbackStep(speed: number): { speed: number; motion: number } {
  const s = Math.min(speed, KNOCK_CAP);
  return { speed: s, motion: Math.min(s, KNOCK_MOTION_CAP) };
}

// Each classic update: the speed falls by KNOCK_DECAY.
export function knockbackClassicUpdate(speed: number): number {
  return speed - KNOCK_DECAY;
}

// Number of classic updates until the push ends (speed no longer above 0).
export function classicUpdatesToRest(speed: number): number {
  let s = Math.min(speed, KNOCK_CAP);
  let n = 0;
  while (s > 0) {
    s = knockbackClassicUpdate(s);
    n++;
  }
  return n;
}
export {};
