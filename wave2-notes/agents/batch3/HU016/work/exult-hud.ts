// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const BAR_WIDTH_PX = 32;
const HIT_FLASH_MS = 200;
const HUNGRY_AT_OR_BELOW = 9;
const BADGE_STEP_PX = 6;
const BADGE_X0_PX = -8;

interface PartyFrame {
  health: number;
  maxHealth: number;      // donor: the "strength" property is the max HP
  mana: number;
  maxMana: number;        // donor: the "magic" property; the mana bar exists only when > 0
  hitUntilMs: number;     // outline flash ends at this time (ms, same clock as the game ticks)
  foodLevel: number;
  flags: {
    asleep: boolean; poisoned: boolean; charmed: boolean; protected: boolean;
    cursed: boolean; paralyzed: boolean; freezing: boolean;
  };
}

type Outline = "hit" | "charmed" | "paralyzed" | "protected" | "cursed" | "poisoned";

// Bar fill in whole pixels, truncating division as in the donor. A zero or negative fill draws nothing.
function barFillPx(value: number, max: number): number {
  const w = Math.trunc((value * BAR_WIDTH_PX) / (max > 0 ? max : 1));
  return Math.min(BAR_WIDTH_PX, w);
}

// First match wins. Donor order: hit, charmed, paralyzed, protected, cursed, poisoned.
function outlineFor(f: PartyFrame, nowMs: number): Outline | null {
  if (nowMs < f.hitUntilMs) return "hit";
  if (f.flags.charmed) return "charmed";
  if (f.flags.paralyzed) return "paralyzed";
  if (f.flags.protected) return "protected";
  if (f.flags.cursed) return "cursed";
  if (f.flags.poisoned) return "poisoned";
  return null;
}

// Badges in a row; the i-th badge sits at i * 6 - 8 px.
function badgesFor(f: PartyFrame, hungryEnabled: boolean): { name: string; x: number }[] {
  const names: string[] = [];
  if (f.flags.asleep) names.push("asleep");
  if (f.flags.poisoned) names.push("poisoned");
  if (f.flags.charmed) names.push("charmed");
  if (hungryEnabled && f.foodLevel <= HUNGRY_AT_OR_BELOW) names.push("hungry");
  if (f.flags.protected) names.push("protected");
  if (f.flags.cursed) names.push("cursed");
  if (f.flags.paralyzed) names.push("paralyzed");
  if (f.flags.freezing) names.push("freezing");
  return names.map((name, i) => ({ name, x: i * BADGE_STEP_PX + BADGE_X0_PX }));
}

// Donor queues one clear event per hit, so an earlier event can end a later hit's flash early.
// Here the flash always runs HIT_FLASH_MS past the latest hit.
function onHit(f: PartyFrame, nowMs: number): void {
  f.hitUntilMs = Math.max(f.hitUntilMs, nowMs + HIT_FLASH_MS);
}

// Main actor only: a big hit (delta >= max/3) or low HP (old HP < max/4) or lightning flashes the screen, not the outline.
function screenFlashFor(oldHp: number, delta: number, maxHp: number, lightning: boolean): boolean {
  return delta >= Math.trunc(maxHp / 3) || oldHp < Math.trunc(maxHp / 4) || lightning;
}

export {};
