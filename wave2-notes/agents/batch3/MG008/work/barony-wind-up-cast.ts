// Barony-derived shape (BSD-2-Clause, adaptable). Numbers below are the donor values, kept as named constants.
const TICKS_PER_CIRCLE = 20;  // donor HANDMAGIC_TICKS_PER_CIRCLE
const EXTRA_CIRCLES_CAP = 3;  // donor CASTING_EXTRA_TIMES_CAP
const BEGINNER_BELOW = 40;    // donor SPELLCASTING_BEGINNER
const BASIC_LEVEL = 20;       // donor SKILL_LEVEL_BASIC
const FUMBLE_BASE = 35;       // donor base fizzle chance, percent

interface Caster { mp: number; hp: number; canOverexpend: boolean; }

interface CastInput {
  costMp: number;          // base cost after caller discounts (tome, overcharge)
  castTimeCircles: number; // spell cast time in circles (1 circle = TICKS_PER_CIRCLE ticks)
  dex: number;
  ability: number;         // proficiency + INT, clamped 0..100
  fromBook: boolean;
  bookDifficulty: number;
  paralysed: boolean;
}

interface Wind { ticksLeft: number; mpLeft: number; dripPerTick: number; dripAcc: number; }

type Charge = { mpCharged: number; hpCharged: number };

// Donor: cast time = base - DEX term, floored at 0.5 (short spells) or 1.0 (long spells), in circles.
function windUpTicks(input: CastInput, rng: () => number): number {
  const floor = input.castTimeCircles < 1.01 ? 0.5 : 1.0;
  const circles = Math.max(floor, input.castTimeCircles - input.dex / 100);
  let ticks = Math.round(circles * TICKS_PER_CIRCLE);
  // Beginner: the roll and the size use one ability value here (donor mixes proficiency and proficiency+INT).
  if (input.ability < BEGINNER_BELOW && Math.floor(rng() * 100) >= input.ability) {
    const extra = Math.min(EXTRA_CIRCLES_CAP, Math.floor(rng() * 50) / Math.max(input.ability, 1));
    ticks += Math.floor(extra) * TICKS_PER_CIRCLE;
  }
  return ticks;
}

// Overdraw goes into HP only for casters allowed to overexpend (donor: vampire, or tome cast).
function spendMp(c: Caster, amount: number): Charge {
  const fromMp = Math.min(amount, c.mp);
  c.mp -= fromMp;
  const over = amount - fromMp;
  if (over > 0) {
    c.hp -= over;
  }
  return { mpCharged: fromMp, hpCharged: over };
}

// Start of cast: refuse before any MP is spent.
function beginCast(c: Caster, input: CastInput, rng: () => number): Wind | "refused" {
  if (input.paralysed) return "refused";
  if (input.costMp > c.mp && !c.canOverexpend) return "refused";
  const ticks = windUpTicks(input, rng);
  return { ticksLeft: ticks, mpLeft: input.costMp, dripPerTick: input.costMp / Math.max(1, ticks), dripAcc: 0 };
}

// Once per tick during the wind-up: MP drips out at an even rate (accumulator, not an integer interval).
function tickWind(c: Caster, w: Wind): void {
  w.ticksLeft -= 1;
  w.dripAcc += w.dripPerTick;
  while (w.dripAcc >= 1 && w.mpLeft > 0) {
    w.dripAcc -= 1;
    w.mpLeft -= 1;
    spendMp(c, 1);
  }
}

// Fumble ladder. Returns true when the spell fizzles.
function fizzles(input: CastInput, rng: () => number): boolean {
  if (Math.floor(rng() * 100) < input.ability) return false; // roll passed: no fumble candidate
  if (!input.fromBook && input.ability >= BASIC_LEVEL) return false;
  let chance = FUMBLE_BASE;
  if (input.fromBook) chance += Math.max(input.bookDifficulty - input.ability, 0) / 2;
  return Math.floor(rng() * 100) <= chance;
}

// Fire at the end of the wind-up: whatever MP is still owed is charged now.
function fire(c: Caster, w: Wind): Charge {
  const owed = w.mpLeft;
  w.mpLeft = 0;
  return spendMp(c, owed);
}

export {};
