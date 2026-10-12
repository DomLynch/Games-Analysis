// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Chances are in tenths of a percent (0..1000), as in the donor: a roll of 1..1000 succeeds when roll <= chance.
type Roll = () => number; // returns an integer 1..1000; the engine supplies a seeded stream (not Math.random)

interface Chances { orange: number; yellow: number; green: number; grey: number; } // percent, per data row
interface SkillRow { value: number; max: number; step: number; }

// Gather band: thresholds are relative to the node's required level (red).
// mult is the donor Multiplicator (1 normally, 2 for elite skinning); the result is chance x mult.
function gatherChance(skill: number, red: number, c: Chances, mult = 1): number {
  if (skill >= red + 100) return c.grey * 10 * mult;
  if (skill >= red + 50) return c.green * 10 * mult;
  if (skill >= red + 25) return c.yellow * 10 * mult;
  return c.orange * 10 * mult;
}

// Craft band: linear from orange at the yellow threshold to grey at the grey threshold.
function craftChance(skill: number, grey: number, yellow: number, c: Chances): number {
  const orange = c.orange * 10;
  const greyC = c.grey * 10;
  if (grey <= yellow) return skill < grey ? orange : greyC; // malformed row: no interpolation
  if (skill <= yellow) return orange;
  if (skill >= grey) return greyC;
  return greyC + Math.trunc(((grey - skill) * (orange - greyC)) / (grey - yellow));
}

// Fishing: probability 100 / d percent per click, d from fixed bands (donor truncates to whole percent, then x10).
const FISH_BOUNDS = [115, 135, 160, 190, 215, 295, 315, 355, 425, 450];
const FISH_DENS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 1];
function fishingChance(skill: number): number {
  if (skill === 0) return 0;
  let i = FISH_BOUNDS.findIndex((b) => skill <= b);
  if (i < 0) i = FISH_BOUNDS.length;
  return Math.trunc(100 / FISH_DENS[i]) * 10;
}

// Combat skill-up (weapon or defence) chance in percent, from the donor's UpdateCombatSkills arithmetic.
function combatSkillChance(playerLevel: number, skill: number, mobLevel: number, greyLevel: number, intellect: number, defence: boolean): number {
  const max = 5 * playerLevel;
  const diff = max - skill;
  if (diff <= 0) return 0;
  const mob = Math.min(mobLevel, playerLevel + 5);
  const lvldif = Math.max(mob - greyLevel, 3);
  let chance = (3 * lvldif * diff) / playerLevel;
  if (!defence) chance += chance * 0.02 * intellect;
  return Math.max(chance, 1);
}

const BONUS_LEVELS = [75, 150, 225, 300, 375, 450];

// One use-based attempt. Returns the new row and the first rewarded band crossed (donor learns only the first).
function trySkillUp(s: SkillRow, chanceTenths: number, roll: Roll): { row: SkillRow; raised: boolean; crossedBand: number | null } {
  if (chanceTenths <= 0 || s.value === 0 || s.max === 0 || s.value >= s.max) {
    return { row: s, raised: false, crossedBand: null };
  }
  if (roll() > chanceTenths) return { row: s, raised: false, crossedBand: null };
  const next = Math.min(s.value + s.step, s.max);
  const crossedBand = BONUS_LEVELS.find((b) => s.value < b && next >= b) ?? null;
  return { row: { ...s, value: next }, raised: true, crossedBand };
}

// Crowd control ladder, one per target and group, any source. States 0..3 = full, half, quarter, immune.
const CC_MULT = [1, 0.5, 0.25, 0];
const CC_RESET_MS = 15000;
interface CcLadder { hits: number; lastMs: number; }
function applyCc(ladder: CcLadder | undefined, baseMs: number, pvpLimitMs: number | null, nowMs: number): { durationMs: number; next: CcLadder } {
  const stale = ladder !== undefined && nowMs - ladder.lastMs > CC_RESET_MS;
  const state = ladder === undefined || stale ? 0 : Math.min(ladder.hits, 3);
  let dur = pvpLimitMs !== null && baseMs > pvpLimitMs ? pvpLimitMs : baseMs;
  dur = Math.trunc(dur * CC_MULT[state]);
  return { durationMs: dur, next: { hits: Math.min(state + 1, 3), lastMs: nowMs } };
}

export {};
