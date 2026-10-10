// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Variant {
  min: number;              // band floor, inclusive
  max: number;              // band ceiling, exclusive
  guardStacks: number;      // number of guard stacks
  guardPerStack: number;    // creatures per stack
  loot: { gold: number; ore: number };
}

interface ChestConfig { variants: Variant[]; resetDays: number; }   // resetDays 0 = never reset
interface ChestState { roll: number | null; }                       // one stored roll per chest instance

// Roll once per chest instance; the stored value is reused until a reset clears it.
function ensureRoll(state: ChestState, rand: (lo: number, hi: number) => number): number {
  if (state.roll === null) state.roll = rand(0, 99);                // 100 values, both ends inclusive
  return state.roll;
}

// The band that holds the roll. In the donor's cyclops bank the bands partition 0..99 (other banks not checked).
function pickVariant(cfg: ChestConfig, roll: number): Variant | null {
  for (const v of cfg.variants) {
    if (roll >= v.min && roll < v.max) return v;
  }
  return null;
}

function resetDue(day: number, resetDays: number): boolean {
  return resetDays !== 0 && day > 1 && (day - 1) % resetDays === 0;
}

// Guard fight result. Only an attacker win grants loot; leftover guards are removed on a win.
function onGuardFight(
  variant: Variant,
  winner: "attacker" | "defender",
  survivingGuards: number,
): { granted: Variant["loot"] | null; erasedGuards: number } {
  if (winner !== "attacker") return { granted: null, erasedGuards: 0 };
  return { granted: variant.loot, erasedGuards: survivingGuards };
}

export {};
