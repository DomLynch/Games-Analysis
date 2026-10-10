// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Member =
  | { kind: "player"; level: number }
  | { kind: "pet"; level: number; faction: boolean };

interface PartyLevel {
  level: number;            // rounded party level used for encounter difficulty
  factionPetLevel: number;  // integer total; truncated at each add, as the donor stores it as int
}

// Party level: the highest player counts in full; every other player and every pet adds one fifth of its level.
function partyLevel(members: Member[]): PartyLevel {
  let highest = 0;
  let total = 0;      // float accumulator
  let faction = 0;    // int accumulator
  for (const m of members) {
    if (m.kind === "pet") {
      if (m.faction) faction = Math.trunc(faction + m.level / 5);
      total += m.level / 5;
    } else if (m.level > highest) {
      total += m.level - highest + highest / 5;
      highest = m.level;
    } else {
      total += m.level / 5;
    }
  }
  return { level: Math.round(total), factionPetLevel: faction };
}

// Group level as the API returns it: optionally without the faction pet part.
function groupLevelFor(p: PartyLevel, includeFactionPets: boolean): number {
  return includeFactionPets ? p.level : p.level - p.factionPetLevel;
}

// Level used to pick an encounter: a grouped player uses the party level, a solo player uses their own.
function encounterLevel(group: Member[] | null, soloLevel: number): number {
  return group !== null && group.length > 0 ? partyLevel(group).level : soloLevel;
}

// Lair building level from the player-to-lair level ratio (thresholds 0.25, 0.5, 0.75, 1.0; default 5).
function lairBuildingLevel(playerLevel: number, lairLevel: number): number {
  const ratio = playerLevel / lairLevel;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  if (ratio < 1) return 4;
  return 5;
}

export {};
