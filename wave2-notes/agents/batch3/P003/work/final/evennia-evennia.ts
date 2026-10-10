// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Fresh sketch from the described mechanism.
type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

interface Hero {
  level: number;
  xp: number;            // cumulative XP, never reset on level-up
  hpMax: number;
  abilities: Record<AbilityKey, number>;
}

const XP_PER_LEVEL = 1000;  // zone data in Frankendom, not a constant
const ABILITY_CAP = 10;

// Adds XP and reports whether the hero has reached the next level threshold.
// Threshold is cumulative: level L needs xp >= L * XP_PER_LEVEL.
function addXp(h: Hero, gained: number): boolean {
  h.xp += gained;
  return h.xp >= h.level * XP_PER_LEVEL;
}

// Spends one level: level +1, up to three distinct abilities +1 each (cap 10), HP max re-rolled.
function levelUp(h: Hero, picks: AbilityKey[], roll: (dice: number, sides: number) => number): void {
  h.level += 1;
  for (const a of new Set(picks.slice(0, 3))) {
    h.abilities[a] = Math.min(ABILITY_CAP, h.abilities[a] + 1);
  }
  const rolled = roll(h.level, 8);             // NdM with N = new level, d8
  h.hpMax = Math.max(h.hpMax + 1, rolled);     // always at least +1 over the old max
}

// Drains a whole XP gain: the donor's addXp reports one level at most per call, so the caller loops.
function awardXp(h: Hero, gained: number, pickFor: (h: Hero) => AbilityKey[], roll: (d: number, s: number) => number): number {
  let levels = 0;
  if (!addXp(h, gained)) return 0;
  while (h.xp >= h.level * XP_PER_LEVEL) {
    levelUp(h, pickFor(h), roll);
    levels += 1;
  }
  return levels;
}
export {};
