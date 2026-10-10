// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Threshold values are inputs (designer data), not the donor's numbers.
// clean-room
interface Progress {
  xp: number;             // stored total XP
  level: number;          // starts at 1
  maxHp: number;
  levelUpPending: boolean;
  levelsGained: number;
}

interface ProgressRules {
  maxLevel: number;
  xpToNext: readonly number[]; // index = current level; xpToNext[level] = total XP that reaches level + 1 (index 0 unused)
  swiftRanks: number;          // perk ranks that bonus incoming XP
  swiftPct: number;            // percent bonus per rank
}

interface Hero {
  endurance: number;
  lifegiverRanks: number;
}

// Order: perk bonus on the incoming XP, add to the stored total, clamp at 0, then climb levels in a loop.
function addXp(p: Progress, incoming: number, hero: Hero, rules: ProgressRules): void {
  const bonus = Math.floor((rules.swiftRanks * rules.swiftPct * incoming) / 100);
  p.xp = Math.max(0, p.xp + incoming + bonus);
  while (p.level < rules.maxLevel && p.xp >= rules.xpToNext[p.level]) {
    p.level += 1;
    p.levelsGained += 1;
    p.levelUpPending = true;
    p.maxHp += Math.floor(hero.endurance / 2) + 2 + hero.lifegiverRanks * 4;
  }
}

// One fight's pending XP. Kills by the player's side add here; nothing is paid until the fight settles.
interface Fight {
  pendingXp: number;
}

function onKill(f: Fight, victimXp: number, killerIsPlayerSide: boolean, victimScriptOverrides: boolean): void {
  if (!killerIsPlayerSide || victimScriptOverrides) return;
  f.pendingXp += victimXp;
}

// Pays once at the end. If the player quit or died, the pending XP is dropped (the donor does this too).
function settleFight(f: Fight, p: Progress, hero: Hero, rules: ProgressRules, quitting: boolean): void {
  if (!quitting && f.pendingXp > 0) addXp(p, f.pendingXp, hero, rules);
  f.pendingXp = 0;
}

export {}
