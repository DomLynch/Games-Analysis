// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Decision =
  | { kind: 'fight' }
  | { kind: 'flee' }
  | { kind: 'joinFree' }
  | { kind: 'joinGold'; price: number };

export interface EncounterInput {
  heroValue: number;        // hero strength for this check (attack and defence scaled)
  groupValue: number;       // monster group strength (sum of stack powers)
  diplomacy: number;        // hero disposition bonus, uncapped
  similarUnits: number;     // hero units of the same kind or an adjacent upgrade tier
  heroUnits: number;        // all hero units
  aggression: number;       // per-group threshold, -4 .. 10
  neverFlees: boolean;
  joinAllowed: boolean;     // joining switched on for this group and the call allows it
  freeJoinAllowed: boolean; // setting or compliant group, and not gold-only
  groupCount: number;       // size of the first stack, used for the gold price
  recruitCostPerUnit: number;
}

const DIPLOMACY_CAP = 3;

export function powerFactor(ratio: number): number {
  if (ratio >= 7) return 11;
  if (ratio >= 1) return Math.trunc(2 * (ratio - 1));
  if (ratio >= 0.5) return -1;
  if (ratio >= 0.333) return -2;
  return -3;
}

export function decideEncounter(e: EncounterInput): Decision {
  const ratio = e.heroValue / e.groupValue;
  let sympathy = 0;
  if (e.similarUnits > 0) sympathy++;
  if (e.similarUnits * 2 > e.heroUnits) sympathy++;
  const diplomacy = Math.min(e.diplomacy, DIPLOMACY_CAP);
  const charisma = powerFactor(ratio) + diplomacy + sympathy;

  if (charisma < e.aggression) return { kind: 'fight' };

  if (e.joinAllowed) {
    if (e.freeJoinAllowed && diplomacy + sympathy + 1 >= e.aggression) return { kind: 'joinFree' };
    if (diplomacy * 2 + sympathy + 1 >= e.aggression) {
      return { kind: 'joinGold', price: e.recruitCostPerUnit * e.groupCount };
    }
  }

  if (charisma > e.aggression && !e.neverFlees) return { kind: 'flee' };
  return { kind: 'fight' };
}

export {};
