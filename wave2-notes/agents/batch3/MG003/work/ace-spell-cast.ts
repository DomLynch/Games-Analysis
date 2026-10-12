// Donor licence: AGPL-3.0 (ACEmulator-ACE). Clean-room sketch from the described mechanism, not a translation of the donor lines.
type Pos = { x: number; y: number };

interface Caster { magicSkill: number; manaConv: number; mana: number; pos: Pos; }
interface SpellDef { power: number; baseMana: number; rangeConst: number; rangeMod: number; }
interface Target { magicDefense: number; pos: Pos; invincible: boolean; }
type Outcome = 'hit' | 'resisted' | 'fizzle' | 'disrupted' | 'out-of-range' | 'no-mana';
interface Pending { ok: boolean; cost: number; startPos: Pos; spell: SpellDef; }

const FIZZLE_WINDOW = 50;   // a caster this far below the spell power cannot roll at all
const CAST_FACTOR = 0.07;   // steeper curve for the cast roll
const SKILL_FACTOR = 0.03;  // gentler curve for the resist roll and the mana roll
const FAIL_MANA = 5;        // flat cost of a fizzle (the donor marks this value as todo)
const MOVE_CAP = 6.0;       // units moved since cast start that disrupt the cast
const RANGE_CAP = 75;       // outdoor cap on spell range

function chance(skill: number, diff: number, factor: number): number {
  const c = 1 - 1 / (1 + Math.exp(factor * (skill - diff)));
  return Math.min(1, Math.max(0, c));
}

function dist(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Fizzle roll, once, at cast start.
function precheck(c: Caster, spell: SpellDef, rng: () => number): boolean {
  if (c.magicSkill <= 0 || c.magicSkill < spell.power - FIZZLE_WINDOW) return false;
  return chance(c.magicSkill, spell.power, CAST_FACTOR) > rng();
}

// Mana cost: a fizzle pays the flat fee; a success gets one discount roll at half difficulty.
function castCost(c: Caster, spell: SpellDef, ok: boolean, rng: () => number): number {
  if (!ok) return FAIL_MANA;
  const p = chance(c.manaConv, spell.power / 2, SKILL_FACTOR);
  if (rng() < p) return Math.max(1, Math.round(spell.baseMana * (1 - p)));
  return spell.baseMana;
}

// Step 1, at cast start: roll the fizzle, price the cast, refuse if the caster cannot pay. Nothing is charged here.
function startCast(c: Caster, spell: SpellDef, rng: () => number): Pending | 'no-mana' {
  const ok = precheck(c, spell, rng);
  const cost = castCost(c, spell, ok, rng);
  if (c.mana < cost) return 'no-mana';
  return { ok, cost, startPos: { ...c.pos }, spell };
}

// Step 2, after the windup: range, then movement (fixed: checked before any charge), then charge, then resist.
function finishCast(c: Caster, p: Pending, target: Target, self: boolean, rng: () => number): Outcome {
  const maxRange = Math.min(p.spell.rangeConst + c.magicSkill * p.spell.rangeMod, RANGE_CAP);
  if (dist(c.pos, target.pos) > maxRange) return 'out-of-range';
  if (dist(p.startPos, c.pos) > MOVE_CAP) return 'disrupted';
  if (c.mana < p.cost) return 'no-mana';
  c.mana -= p.cost;
  if (!p.ok) return 'fizzle';
  if (self) return 'hit';
  if (target.invincible) return 'resisted';
  const resistChance = 1 - chance(c.magicSkill, target.magicDefense, SKILL_FACTOR);
  return rng() < resistChance ? 'resisted' : 'hit';
}

export {};
