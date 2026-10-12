// Licence: LGPL-3.0 (donor OpenEnroth, LICENSE file). clean-room sketch written from the described mechanism; no donor lines or tables copied.
// clean-room
export {};

// Step table: a stat maps to a bonus through thresholds sorted high to low; the first threshold the stat meets wins.
// Shape only. Placeholder thresholds, not the donor's values.
export interface Step { atLeast: number; bonus: number; }
export function stepBonus(stat: number, table: Step[], floorBonus: number): number {
  for (const s of table) {
    if (stat >= s.atLeast) return s.bonus;
  }
  return floorBonus;
}
const placeholderSteps: Step[] = [
  { atLeast: 100, bonus: 10 }, { atLeast: 50, bonus: 5 }, { atLeast: 20, bonus: 2 }, { atLeast: 0, bonus: 0 },
];

// Mastery ladder: a skill's multiplier depends on its mastery tier (novice to grandmaster).
export type Mastery = 0 | 1 | 2 | 3 | 4; // 0 = none (level must be 0), 1 = novice, 2 = expert, 3 = master, 4 = grandmaster
export interface Tiers { novice: number; expert: number; master: number; grandmaster: number; }
export function tierMultiplier(mastery: Mastery, t: Tiers): number {
  switch (mastery) {
    case 1: return t.novice;
    case 2: return t.expert;
    case 3: return t.master;
    case 4: return t.grandmaster;
    default: return 0;
  }
}
export function skillBonus(level: number, mastery: Mastery, t: Tiers): number {
  return tierMultiplier(mastery, t) * level;
}

// Melee-style contest: a skill-and-stat term must beat a defence term that grows with distance.
// Shape: positive = skillMod + rand(armour + 2 x attack + k1); negative = armour + k2 (close), larger at range.
export interface Contest { skillMod: number; armour: number; attack: number; range: "close" | "medium" | "far"; }
export function contestHit(c: Contest, rand: (n: number) => number): boolean {
  const k1 = 30; // placeholder for a tuning constant
  const k2 = 15; // placeholder for a tuning constant
  const positive = c.skillMod + rand(c.armour + 2 * c.attack + k1);
  let negative: number;
  if (c.range === "medium") negative = Math.trunc((c.armour + k2) / 2) + c.armour + k2;
  else if (c.range === "far") negative = 2 * c.armour + k1;
  else negative = c.armour + k2;
  return positive > negative;
}

// Resist by halving: each successful check halves the damage, up to four checks.
// A check succeeds with probability (bonus + resist) / (bonus + resist + 30) and stops at the first failure.
// simplified: uses one tuning constant (30) for the check size; no clean-up of the integer halving (1 damage can become 0).
export function resistHalving(damage: number, luckBonus: number, resist: number, rand: (n: number) => number): number {
  const divider = luckBonus + resist + 30;
  if (luckBonus + resist <= 0) return damage;
  let d = damage;
  for (let i = 0; i < 4; i++) {
    if (rand(divider) >= 30) d = Math.trunc(d / 2);
    else break;
  }
  return d;
}

// Attack recovery: base weapon + armour + shield, minus reductions, never below the minimum.
export interface RecoveryInput { weaponBase: number; armourBase: number; shieldBase: number; reductions: number; minimum: number; }
export function attackRecovery(r: RecoveryInput): number {
  const total = r.weaponBase + r.armourBase + r.shieldBase - r.reductions;
  return Math.max(total, r.minimum);
}

// Health pool: class base + per-level x (level + endurance step) + per-level x bodybuilding + items; floored at 0.
export function maxHealth(classBase: number, perLevel: number, level: number, enduranceStep: number, bodybuilding: number, items: number): number {
  const total = classBase + perLevel * (level + enduranceStep) + perLevel * bodybuilding + items;
  return Math.max(0, total);
}

// Death buffer: health below 1 is unconscious while health + endurance is still at least 1; otherwise dead.
// simplified: omits preservation buff, the armour-break at -10 and the wake-up on regen.
export type Outcome = "alive" | "unconscious" | "dead";
export function receiveDamage(health: number, endurance: number, damage: number): { health: number; outcome: Outcome } {
  const h = health - damage;
  if (h >= 1) return { health: h, outcome: "alive" };
  if (h + endurance >= 1) return { health: h, outcome: "unconscious" };
  return { health: h, outcome: "dead" };
}

// Regen per whole 5-minute game interval: a pool grows by the rate times the number of intervals crossed, capped at the max.
// keepOverflow: a pool that is already above the max is not reduced by regen.
export function regenPool(current: number, max: number, perInterval: number, intervals: number, keepOverflow: boolean): number {
  const result = Math.min(max, current + perInterval * intervals);
  return keepOverflow ? Math.max(current, result) : result;
}

// Demo values (not donor data).
const rng = (n: number): number => Math.floor(n / 2);
const tiers: Tiers = { novice: 1, expert: 2, master: 3, grandmaster: 5 };
const sb = stepBonus(60, placeholderSteps, -1);
const sk = skillBonus(20, 2, tiers);
const hitOk = contestHit({ skillMod: 40, armour: 30, attack: 25, range: "medium" }, rng);
const halved = resistHalving(40, 5, 10, rng);
const rec = attackRecovery({ weaponBase: 90, armourBase: 30, shieldBase: 0, reductions: 12, minimum: 30 });
const mh = maxHealth(40, 5, 10, 2, 3, 0);
const dead = receiveDamage(5, 20, 30);
const alive = receiveDamage(5, 20, 22);
const reg = regenPool(40, 100, 2, 3, true);
void [sb, sk, hitOk, halved, rec, mh, dead.outcome, alive.outcome, reg];
