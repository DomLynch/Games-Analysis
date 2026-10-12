// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Mana cost per circle, index 0 (first circle) to 7 (eighth). Data, not an engine rule.
export const MANA_BY_CIRCLE: readonly number[] = [4, 6, 9, 11, 14, 20, 40, 50];

// Cast delay in seconds. Base is (3 + circle) quarter-seconds; each fast-cast point after the cap removes 0.25 s;
// a protection effect costs 2 points first; the floor is 0.25 s.
export function castDelaySec(circle: number, fastCastRaw: number, fastCastCap: number, protectionOn: boolean): number {
  let fc = Math.min(fastCastRaw, fastCastCap);
  if (protectionOn) fc -= 2;
  const base = (3 + circle) * 0.25;
  return Math.max(base - fc * 0.25, 0.25);
}

// Recovery after a finished cast: 6 units of 0.25 s less one unit per fast-recovery point, floor 0.
export function castRecoverySec(fastRecovery: number): number {
  const units = Math.max(6 - fastRecovery, 0);
  return units / 4;
}

// Recovery after an interrupt: 1 - sqrt(elapsed / delay), floor 0.2 s. An early interrupt waits longest.
// The delay is passed in by the caller (the cast-start value), not recomputed.
export function disturbRecoverySec(elapsedSec: number, delaySec: number): number {
  return Math.max(1 - Math.sqrt(elapsedSec / delaySec), 0.2);
}

// Mana after lower-mana-cost (capped at 40 percent). Truncates like the donor's integer cast.
export function scaledMana(base: number, lowerManaCostPercent: number): number {
  const lmc = Math.min(lowerManaCostPercent, 40);
  return Math.floor(base * (1 - lmc / 100));
}

export type CommitResult = "no-reagents" | "no-mana" | "fizzle" | "ok";

// Order: reagents present, then mana present, then the skill roll. Nothing is spent here;
// the caller spends reagents on "ok" and "fizzle" and mana on "ok" only.
// This is the fix to the donor order, which spent reagents before the mana check.
export function commitCast(mana: number, cost: number, hasReagents: boolean, fizzleRoll: () => boolean): CommitResult {
  if (!hasReagents) return "no-reagents";
  if (mana < cost) return "no-mana";
  if (fizzleRoll()) return "fizzle";
  return "ok";
}

// Chance (0..1) that the target resists a circle spell. Halved; rises with the target's magic resist and
// falls with the caster's cast skill and the spell circle.
export function resistChance(targetMagicResist: number, casterCastSkill: number, circle: number): number {
  const first = targetMagicResist / 5;
  const second = targetMagicResist - ((casterCastSkill - 20) / 5 + (1 + circle) * 5);
  const percent = Math.max(first, second) / 2;
  return Math.min(Math.max(percent / 100, 0), 1);
}

// Resisted when the chance is at least the roll; certain at 1 and never at 0 (no roll is needed at the ends).
export function isResisted(chance: number, roll: number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return chance >= roll;
}

export {};
