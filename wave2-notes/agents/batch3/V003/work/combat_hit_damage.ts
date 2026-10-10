// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (hit ladder, evade contest, damage multipliers, armour piercing), not a translation.
// clean-room
const TO_HIT_SCALE = 50;     // accuracy-minus-defense points per roll unit (engine constant)
const TO_HIT_BASE = 75;      // % to hit at parity
const TO_HIT_STEP = 25;      // % per ladder step
const TO_HIT_STEP_MAX = TO_HIT_BASE / TO_HIT_STEP; // 3 ladder steps
const TO_HIT_MIN = 0;
const TO_HIT_MAX = 100;
const DEFENSE_CAP = 125;     // defense hard cap (read at the defense modifier)

// Piecewise ladder from the donor: near parity the chance moves 25 per roll unit;
// each further unit (up to 3) costs less, and the result is clamped to 0..100.
export function hitChancePct(accuracy: number, defense: number): number {
  let roll = (accuracy - Math.min(defense, DEFENSE_CAP)) / TO_HIT_SCALE;
  const sign = Math.sign(roll);
  let toHit = TO_HIT_BASE;
  for (let i = 1; i <= TO_HIT_STEP_MAX; i++) {
    if (roll * sign > i) {
      toHit += sign * TO_HIT_STEP;
      roll -= sign * i;
    } else {
      toHit += (roll / i) * TO_HIT_STEP;
      break;
    }
  }
  return Math.min(TO_HIT_MAX, Math.max(TO_HIT_MIN, toHit));
}

// Hit if the roll (0..100 from the caller's RNG) is at or below the chance.
export function isHit(accuracy: number, defense: number, roll0to100: number): boolean {
  return roll0to100 <= hitChancePct(accuracy, defense);
}

// Second contest, only after a hit: the defender's evade total against the attacker's accuracy
// plus a 1..500 attack roll, versus the evade total plus a 1..200 defend roll.
export function evadeWins(accuracy: number, evadeTotal: number, attackRoll1to500: number, defendRoll1to200: number): boolean {
  return accuracy + attackRoll1to500 <= evadeTotal + defendRoll1to200;
}

// Damage: base roll, then the donor's multiplier chain, then the 1-point floor.
export function damageRoll(min: number, max: number, rand: (n: number) => number): number {
  const range = Math.max(0, Math.floor(max - min));   // assumption: rand(n) returns 0..n-1
  return min + (range > 0 ? rand(range) : 0);
}

export function damageAfterMultipliers(
  base: number,
  attackerIsPlayer: boolean,
  isMelee: boolean,
  targetKnockedDown: boolean,
  bothPlayers: boolean,
  toughnessPct: number,
): number {
  let d = base;
  if (attackerIsPlayer) d *= 1.5;
  if (isMelee) d *= 1.25;
  if (targetKnockedDown) d *= 1.5;
  d *= 1 - toughnessPct / 100;
  if (bothPlayers) d *= 0.25;
  return Math.max(1, d);
}

// Armour piercing against a rating: above the rating, x1.25 per point; below it, x0.5 per point.
export function armourPierce(ap: number, rating: number): number {
  return ap > rating ? Math.pow(1.25, ap - rating) : Math.pow(0.5, rating - ap);
}

export function armourReduce(dmg: number, ap: number, rating: number, reductionPct: number): number {
  let d = dmg * armourPierce(ap, rating);
  if (reductionPct > 0) d *= 1 - reductionPct / 100;
  return d;
}

// Pool choice when the attack says RANDOM: 60 health, 35 action, 5 mind.
export function pickPool(roll0to100: number): "health" | "action" | "mind" {
  if (roll0to100 <= 60) return "health";
  if (roll0to100 <= 95) return "action";
  return "mind";
}

// Worked values (hand-checked against the donor's ladder): 75, 100, 50, 37.5.
const a = hitChancePct(0, 0);
const b = hitChancePct(50, 0);
const c = hitChancePct(0, 50);
const d = hitChancePct(0, 100);
const pierceOver = armourPierce(3, 1);   // 1.5625
const pierceUnder = armourPierce(1, 3);  // 0.25
void a; void b; void c; void d; void pierceOver; void pierceUnder; void evadeWins; void pickPool;
export {};
