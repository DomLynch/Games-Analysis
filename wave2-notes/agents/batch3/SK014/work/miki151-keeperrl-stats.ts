// Licence: GPL-2.0-or-later (donor header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/stats.ts (proposed). Parity row 21 (catalogue fields).

export {};

// 1) Damage curve: strength / defence -> fraction of the victim's health taken.
// Donor getDamage: 0 up to 0.3, linear to 0.12 at ratio 1, linear to 1.0 at 2.2, then 1.0.
const MIN_RATIO = 0.3;
const MAX_RATIO = 2.2;
const DAMAGE_AT_ONE = 0.12;

function damageFraction(ratio: number): number {
  if (ratio <= MIN_RATIO) {
    return 0;
  }
  if (ratio <= 1) {
    return DAMAGE_AT_ONE * (ratio - MIN_RATIO) / (1 - MIN_RATIO);
  }
  if (ratio <= MAX_RATIO) {
    return DAMAGE_AT_ONE + (1 - DAMAGE_AT_ONE) * (ratio - 1) / (MAX_RATIO - 1);
  }
  return 1;
}

// 2) Flanking: the defence multiplier falls 7 percent per point of deficit below zero.
// cnt starts at 1 + PARRY; each adjacent enemy that moves takes one away, each adjacent non-enemy adds one.
function flankMod(parry: number, adjacentMovingEnemies: number, adjacentNonEnemies: number): number {
  const cnt = 1 + parry - adjacentMovingEnemies + adjacentNonEnemies;
  return Math.pow(1.07, Math.min(0, cnt));
}

// 3) Body: damage bleeds the health pool first; a random allowed part is checked against a per-part strength.
type Part = "WING" | "ARM" | "LEG" | "HEAD" | "TORSO";

const PART_STRENGTH: Record<Part, number> = { WING: 0.3, ARM: 0.6, LEG: 0.8, HEAD: 0.8, TORSO: 1.5 };

interface Body {
  health: number;          // 1 = full, 0 = dead (health pool model)
  hasPool: boolean;        // false = the part-only model (no pool)
  losesParts: boolean;     // material can lose body parts
  losingHeadsMeansDeath: boolean;
  partsLeft: Partial<Record<Part, number>>;
  bleeding: number;        // ticks of bleeding after an injury (donor: 50 visible turns)
}

type Outcome = "KILLED" | "HURT" | "NOT_HURT";

// Donor getBodyPart: legs, arms and wings are always allowed; the head is allowed below 40 percent health or
// when the material does not die from losing its head; the torso is allowed below 40 percent health.
// Fix: the donor's "allowed.empty()" test can never fire (legs, arms and wings are always pushed); the sketch drops it.
// The donor then falls back to any part that is left; this sketch does the same.
function pickPart(b: Body, rng: () => number): Part | null {
  const allowed: Part[] = ["LEG", "ARM", "WING"];
  if (b.health < 0.4 || !b.losingHeadsMeansDeath) {
    allowed.push("HEAD");
  }
  if (b.health < 0.4) {
    allowed.push("TORSO");
  }
  let pool = allowed.filter((p) => (b.partsLeft[p] ?? 0) > 0);
  if (pool.length === 0) {
    pool = (["LEG", "ARM", "WING", "HEAD", "TORSO"] as Part[]).filter((p) => (b.partsLeft[p] ?? 0) > 0);
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(rng() * pool.length)];
}

function partInjured(part: Part, damage: number, b: Body, rng: () => number): boolean {
  const strength = PART_STRENGTH[part];
  if (!b.hasPool) {
    return rng() < damage / strength;
  }
  return b.losesParts ? damage >= strength : false;
}

// One hit that has already been reduced to a fraction of health.
// An injury never kills by itself: health is lifted to 0.1 (donor body.cpp 796).
function bodyTakeDamage(b: Body, damage: number, rng: () => number): Outcome {
  b.health -= damage;                                       // bleed first (donor)
  const part = pickPart(b, rng);
  if (part !== null && partInjured(part, damage, b, rng)) {
    b.partsLeft[part] = (b.partsLeft[part] ?? 1) - 1;
    b.bleeding = 50;
    if (b.health <= 0) {
      b.health = 0.1;
    }
    return "HURT";
  }
  if (b.health <= 0) {
    return "KILLED";
  }
  return "HURT";                                            // below 0.5 is critical (a message in the donor), not a state change here
}

// Full hit: defence from the DEFENSE attribute x flank x buffs; ratio = strength / defence.
function resolveHit(strength: number, defence: number, flank: number, buffMults: number[],
                    b: Body, rng: () => number): Outcome {
  const d = defence * flank * buffMults.reduce((a, m) => a * m, 1);
  const frac = damageFraction(strength / d);                // d = 0 gives Infinity, which maps to 1
  if (frac <= 0) {
    return "NOT_HURT";
  }
  return bodyTakeDamage(b, frac, rng);
}

// 4) Combat experience: the gain depends on the attack difference with the victim (peak attack, donor 'highestAttackValueEver').
const MAX_LEVEL_GAIN = 3.0;
const MIN_LEVEL_GAIN = 0.02;
const EQUAL_LEVEL_GAIN = 0.5;
const MAX_LEVEL_DIFF = 10;

function combatXpGain(victimPeakAttack: number, selfPeakAttack: number): number {
  const attackDiff = victimPeakAttack - selfPeakAttack;
  const raw = (MAX_LEVEL_GAIN - EQUAL_LEVEL_GAIN) * attackDiff / MAX_LEVEL_DIFF + EQUAL_LEVEL_GAIN;
  return Math.max(MIN_LEVEL_GAIN, Math.min(MAX_LEVEL_GAIN, raw));
}

// Cap on counted combat XP: five times the max promotion count (donor creature.cpp 1240).
function combatXpCap(maxPromotion: number): number {
  return 5 * maxPromotion;
}

// 5) Training: use-based, per attribute. Per usage step at a training or study dummy; capped by the dummy and by the attribute max.
function trainStep(expLevel: number, attrMax: number, dummyMax: number | undefined,
                   efficiency: number, trainingSpeed: number): number {
  let inc = 0.012 * efficiency * trainingSpeed;
  if (dummyMax !== undefined) {
    inc = Math.min(inc, dummyMax - expLevel);
  }
  inc = Math.min(inc, attrMax - expLevel);
  return Math.max(0, inc);
}

// 6) Spell cooldown: start + (length - 1) x (100 - SPELL_SPEED) / 100, integer division as in the donor.
function spellCooldown(start: number, end: number, spellSpeed: number): number {
  const length = end - start;
  return start + Math.trunc((length - 1) * (100 - Math.min(100, spellSpeed)) / 100);
}

// 7) Spell gating: a spell is available when the school's exp level reaches its level; an upgrade hides its base.
interface SpellRow {
  name: string;
  school: string;
  level: number;
  upgrade?: string;        // the base spell this row upgrades
}

function availableSpells(rows: SpellRow[], expLevel: (school: string) => number): SpellRow[] {
  const reached = rows.filter((r) => r.level <= expLevel(r.school));
  const upgraded = new Set<string>();
  for (const r of reached) {
    if (r.upgrade !== undefined) {
      upgraded.add(r.upgrade);
    }
  }
  return reached.filter((r) => !upgraded.has(r.name));
}

// Usage check (not a test).
const rng = Math.random;
const body: Body = { health: 1, hasPool: true, losesParts: true, losingHeadsMeansDeath: true, partsLeft: { ARM: 2, LEG: 2 }, bleeding: 0 };
const outcome = resolveHit(120, 100, flankMod(0, 2, 0), [], body, rng);
void outcome;
void combatXpGain(40, 30);
void combatXpCap(2);
void trainStep(2, 3, 3, 1, 1);
void spellCooldown(10, 31, 50);
void availableSpells(
  [{ name: "healing", school: "healer", level: 1 }, { name: "advanced healing", school: "healer", level: 2, upgrade: "healing" }],
  () => 2,
);
