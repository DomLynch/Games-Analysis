// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
const ZERO_BAND = 10;   // no XP at a gap of +10 or more, or -10 or less (donor)
const STEP = 0.1;       // XP change per level of gap (donor)

// Group factor for the eligible players. Raid, then full party (team larger than three),
// then the count of eligible players; otherwise a solo share.
function groupFactor(eligibleCount: number, teamSize: number, isRaid: boolean): number {
  if (isRaid) return 0.33;
  if (teamSize > 3) return 0.66;
  if (eligibleCount === 2) return 0.9;
  if (eligibleCount === 3) return 0.875;
  return 1.0;
}

// Level-gap factor: 1 at equal level, falling 0.1 per level above the NPC, rising 0.1 per level below.
function levelFactor(playerLevel: number, npcLevel: number): number {
  const gap = playerLevel - npcLevel;
  if (gap >= ZERO_BAND || gap <= -ZERO_BAND) return 0;
  if (gap > 0) return 1 - STEP * gap;
  if (gap < 0) return 1 + STEP * -gap;
  return 1;
}

interface Contributor { id: number; level: number; }
interface Award { playerId: number; xp: number; }

// Kill XP for each eligible contributor: truncated product of the base kill XP, the group factor and the level factor.
function splitKillXp(killXp: number, npcLevel: number, contributors: Contributor[], teamSize: number, isRaid: boolean): Award[] {
  const group = groupFactor(contributors.length, teamSize, isRaid);
  return contributors.map((c) => ({
    playerId: c.id,
    xp: Math.trunc(killXp * group * levelFactor(c.level, npcLevel)),
  }));
}

export {};
