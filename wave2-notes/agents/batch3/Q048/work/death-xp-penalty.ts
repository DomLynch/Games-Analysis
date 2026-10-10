// clean-room: shape of the rule only, written from the described mechanism, not a translation.
interface DeathRecord { expBeforeDeath: number; expLost: number; pending: boolean; }
interface Character { exp: number; level: number; death: DeathRecord | null; }

// table[i] = cumulative XP at which level i + 1 is reached.
function levelInterval(level: number, table: number[], maxLevel: number): number {
  if (level >= maxLevel) return Math.max(0, table[maxLevel - 1] - table[maxLevel - 2]);
  return Math.max(0, table[level] - table[level - 1]);
}

// Loss share falls as the level rises (6.5 - 0.07 * level, in percent); it is divided by 4 in clan war or festival.
function lossPercent(level: number, reduced: boolean): number {
  const p = Math.max(0, 6.5 - 0.07 * level);
  return reduced ? p / 4 : p;
}

// Exempt cases (arena, event, lucky, pvp zone with a player killer, siege) lose nothing.
function levelFor(exp: number, table: number[], cap: number): number {
  for (let level = cap; level >= 1; level--) if (exp >= table[level - 1]) return level;
  return 1;
}

function onDeath(c: Character, table: number[], maxLevel: number, cap: number,
                 exempt: boolean, reduced: boolean): Character {
  if (c.death?.pending) return c; // a second death before revival does not penalise again
  if (exempt) return { ...c, death: null };
  const lost = Math.round(levelInterval(c.level, table, maxLevel) * lossPercent(c.level, reduced) / 100);
  const after = Math.max(0, c.exp - lost);
  const expLost = c.exp - after;
  if (expLost <= 0) return { ...c, death: null };
  return {
    ...c,
    exp: after,
    level: levelFor(after, table, cap),
    death: { expBeforeDeath: c.exp, expLost, pending: true },
  };
}

// On resurrection a share of the lost XP comes back, never more than the pre-death total.
function onResurrect(c: Character, restorePercent: number, table: number[], cap: number): Character {
  if (!c.death?.pending) return c;
  const p = Math.max(0, Math.min(100, restorePercent));
  const back = Math.min(c.death.expLost, Math.round(c.death.expLost * p / 100));
  const total = Math.min(c.death.expBeforeDeath, c.exp + back);
  return { ...c, exp: total, level: levelFor(total, table, cap), death: { ...c.death, pending: false } };
}

export {};
