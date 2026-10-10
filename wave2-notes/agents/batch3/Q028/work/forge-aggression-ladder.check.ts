// Licence: GPL-3.0 (donor, LICENSE "Version 3, 29 June 2007"). Clean-room sketch of the shape only: a group level from force and life ratios, a lethal check, and a per-unit gate by level. No donor line is translated.
export interface Unit { id: string; power: number; canBeBlocked: boolean; }

export type Level = 0 | 1 | 2 | 3 | 4 | 5;

export interface Ratios {
  enemyRatio: number;        // enemy life / player damage that can come back at us
  playerRatio: number;       // (player life - non-combat) / our unblocked damage
  outNumber: number;         // our attackers minus their counter-attackers
  attritionalKill: boolean;  // repeated all-in rounds would kill the player
  playerCanLoseLife: boolean;
}

// Ladder order as in the donor: 5, then 4, then 3, then 2, then 1, else 0.
export function groupLevel(r: Ratios, attackerCount: number, turnsUntilUnblockableKill: number): Level {
  const ratioDiff = r.enemyRatio - r.playerRatio;
  if (ratioDiff > 0 && r.attritionalKill) return 5;
  if (ratioDiff >= 1 && attackerCount > 1 && (r.playerRatio < 2 || r.outNumber > 0)) return 4;
  if (ratioDiff >= 0 && attackerCount > 1) return 3;
  if (ratioDiff + r.outNumber >= -1 || r.enemyRatio > 1 || -ratioDiff < turnsUntilUnblockableKill) return 2;
  if (r.playerCanLoseLife) return 1;
  return 0;
}

// Would an all-in attack kill the player if the blockers stop the biggest blockable attackers first?
export function assaultLethal(attackers: Unit[], blockers: number, playerLife: number, nonCombat: number): boolean {
  const unblockable = attackers.filter((a) => !a.canBeBlocked);
  const blockable = attackers.filter((a) => a.canBeBlocked).sort((a, b) => b.power - a.power);
  const through = blockable.slice(Math.min(blockers, blockable.length));
  const dmg = [...unblockable, ...through].reduce((s, a) => s + a.power, 0);
  return dmg + nonCombat >= playerLife;
}

export interface Gate { canKillAll: boolean; canBeKilledByOne: boolean; canBeBlocked: boolean; defPower: number; }

// One attacker's commit test at a given level (level 5 commits everything).
export function commits(level: Level, g: Gate): boolean {
  switch (level) {
    case 5: return true;
    case 4: return g.canKillAll || !g.canBeBlocked || g.defPower === 0;
    case 3: return (g.canKillAll && !g.canBeKilledByOne) || !g.canBeBlocked;
    case 2: return !g.canBeBlocked || (g.canKillAll && !g.canBeKilledByOne);
    case 1: return !g.canBeBlocked;
    default: return false;
  }
}

export {};
