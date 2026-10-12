// Licence: NetHack General Public License (donor dat/license). Restricted: clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpellDef {
  name: string;
  level: number;               // tier of the ability; list is in ascending level
  usable: (c: Caster) => boolean;
}

export interface Caster {
  level: number;               // monster level (m_lev)
  cooldown: number;            // ticks until the next cast
  confused: boolean;
}

// Pick: roll 0..level-1. If the roll is above the top tier, reroll below the top with high probability.
// Then take the highest usable spell whose tier is at or below the roll; fall back to the first spell.
export function pickSpell(c: Caster, list: SpellDef[], rand: (n: number) => number): SpellDef {
  const top = list[list.length - 1].level;
  let roll = rand(c.level);
  if (roll > top && rand(top) !== 0) roll = rand(top);
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].level <= roll && list[i].usable(c)) return list[i];
  }
  return list[0];
}

// Cooldown after a cast: 10 - level below level 8, otherwise 2 ticks.
export function cooldownAfterCast(level: number): number {
  return level < 8 ? 10 - level : 2;
}

// Fumble: the donor rolls rand(level x 10) < 20 (100 when confused), which always fumbles at level 1-2.
// Fix used here: the 20 is capped at level x 5, so levels 1-4 fumble half the time and levels 4+ keep the donor rate.
export function fumbles(c: Caster, rand: (n: number) => number): boolean {
  const threshold = c.confused ? 100 : Math.min(20, c.level * 5);
  return rand(c.level * 10) < threshold;
}

// Damage: (level / 2) + dice dice of sides sides, halved (rounded up) when the target resists halving.
export function castDamage(
  level: number,
  dice: number,
  sides: number,
  halved: boolean,
  rand: (n: number) => number,
): number {
  const count = Math.floor(level / 2) + dice;
  let dmg = 0;
  for (let i = 0; i < count; i++) dmg += rand(sides) + 1;
  return halved ? Math.floor((dmg + 1) / 2) : dmg;
}

// Breath: fires on 2 of 3 turns when lined up and off cooldown. After a breath at the hero the cooldown
// (8..25 ticks) is set only 1 time in 3; against any other target it is always set.
export function breathTurn(
  b: { cooldown: number },
  lined: boolean,
  targetIsHero: boolean,
  rand: (n: number) => number,
): boolean {
  if (b.cooldown > 0 || !lined) return false;
  if (rand(3) === 0) return false;
  if (!targetIsHero || rand(3) === 0) b.cooldown = 8 + rand(18);
  return true;
}

export {};
