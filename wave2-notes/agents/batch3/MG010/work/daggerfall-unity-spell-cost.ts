// Licence: MIT (donor: Daggerfall Unity, LICENSE copyright 2009-2023 Daggerfall Workshop). Shape adapted; numbers from donor FormulaHelper.cs.
type Target = 'self' | 'touch' | 'singleRange' | 'areaSelf' | 'areaRange';

// Fixed per effect type. Donor: EffectCosts { OffsetGold, CostA, CostB }.
interface CostCurve { offsetGold: number; costA: number; costB: number; }

// One supported component (duration, chance or magnitude) with this spell's settings.
// For magnitude the caller passes start = (min + max) / 2 and plus = (plusMin + plusMax) / 2, as the donor does.
interface Component { curve: CostCurve; start: number; plus: number; perLevel: number; }

interface EffectEntry {
  skill: number;          // caster's live skill for this effect's school
  duration?: Component;
  chance?: Component;
  magnitude?: Component;
}

const TARGET_MULT: Record<Target, number> = { self: 1, touch: 1, singleRange: 1.5, areaSelf: 2, areaRange: 2.5 };
const SP_FLOOR = 5;
const FUDGE_CURVE: CostCurve = { offsetGold: 160, costA: 60, costB: 100 };

function componentGold(c: Component): number {
  // Donor: trunc(OffsetGold + CostA * start + CostB * trunc(plus / perLevel)), no guard on perLevel.
  // Fix: perLevel clamped to at least 1 so a zero in data cannot divide by zero.
  const perLevel = Math.max(1, c.perLevel);
  return Math.trunc(c.curve.offsetGold + c.curve.costA * c.start + c.curve.costB * Math.trunc(c.plus / perLevel));
}

function effectCost(e: EffectEntry): { gold: number; sp: number } {
  let gold = 0;
  let hasComponent = false;
  for (const c of [e.duration, e.chance, e.magnitude]) {
    if (c) { hasComponent = true; gold += componentGold(c); }
  }
  // Donor: an effect with no supported component gets a fixed fudge (start 1, plus 1, perLevel 1).
  if (!hasComponent) gold += componentGold({ curve: FUDGE_CURVE, start: 1, plus: 1, perLevel: 1 });
  // Donor: gold * (110 - skill) / 400 with integer division. Fix: skill clamped to 0..100 (donor does not clamp).
  const skill = Math.min(100, Math.max(0, e.skill));
  const sp = Math.trunc((gold * (110 - skill)) / 400);
  return { gold, sp };
}

export function spellCost(effects: EffectEntry[], target: Target): { gold: number; sp: number } {
  // Donor: an empty spell costs 0 and skips the floor (early return before the floor check).
  if (effects.length === 0) return { gold: 0, sp: 0 };
  let gold = 0;
  let sp = 0;
  for (const e of effects) {
    const r = effectCost(e);
    gold += r.gold;
    sp += r.sp; // spell points are summed per effect, each with its own school skill
  }
  const m = TARGET_MULT[target];
  gold = Math.trunc(gold * m);
  sp = Math.trunc(sp * m);
  if (sp < SP_FLOOR) sp = SP_FLOOR;
  return { gold, sp };
}

// Donor SpellBookWindow: buy-list price = spell points * 4; halved on Witches Festival, minimum 1.
export function shopListPrice(sp: number, witchesFestival: boolean): number {
  let price = sp * 4;
  if (witchesFestival) {
    price = Math.trunc(price / 2);
    if (price === 0) price = 1;
  }
  return price;
}

// Donor EntityEffectManager (SetReadySpell, 337): refuse the ready when magicka is below the cost. Donor exempts god mode and enemies.
export function canReadySpell(magicka: number, sp: number, godMode: boolean): boolean {
  return godMode || magicka >= sp;
}

export {};
