// Licence: GPL-2.0-or-later (gplheader.txt; the repo LICENSE file is the GPL version 3 text). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Faction standing: each faction keeps one aggro number per player (-100..100, starting at the faction base).
// A player kill moves the killer's aggro with the dead member's friend factions up and its enemy factions down.

export type Standing = "friendly" | "neutral" | "hostile" | "aggressive";

export interface FactionNode {
  id: number;
  base: number;        // starting aggro for a player with no record (data)
  friends: number[];   // includes the faction itself
  enemies: number[];
}

const MIN_AGGRO = -100;
const MAX_AGGRO = 100;

// Donor GetStandingToFaction: strict thresholds on the aggro value.
export function standingOf(aggro: number): Standing {
  if (aggro > 75) return "aggressive";
  if (aggro > 50) return "hostile";
  if (aggro > 25) return "neutral";
  return "friendly";
}

export class FactionBook {
  private aggro = new Map<string, number>();

  constructor(
    private nodes: Map<number, FactionNode>,
    private notify: (msg: string) => void,      // player message channel
  ) {}

  value(factionId: number, playerId: string): number {
    const stored = this.aggro.get(`${factionId}:${playerId}`);
    if (stored !== undefined) return stored;
    return this.nodes.get(factionId)?.base ?? 0;
  }

  standing(factionId: number, playerId: string): Standing {
    return standingOf(this.value(factionId, playerId));
  }

  // Donor OnMemberKilled: each friend faction moves +1 against the killer, each enemy faction -1.
  onMemberKilled(factionId: number, playerId: string): void {
    const node = this.nodes.get(factionId);
    if (!node) return;
    for (const f of node.friends) this.bump(f, playerId, +1);
    for (const f of node.enemies) this.bump(f, playerId, -1);
  }

  // Donor ChangeAggroLevel, with two changes: the donor's 20% roll is dropped so every kill moves the value,
  // and the message follows the value (the donor sends it even when the roll fails or the value is clamped).
  private bump(factionId: number, playerId: string, delta: number): void {
    if (!this.nodes.has(factionId)) return;
    const before = this.value(factionId, playerId);
    const after = Math.min(MAX_AGGRO, Math.max(MIN_AGGRO, before + delta));
    if (after === before) return;
    this.aggro.set(`${factionId}:${playerId}`, after);
    this.notify(`Your relationship with ${factionId} has ${delta > 0 ? "decreased" : "increased"}`);
  }
}

export {};
