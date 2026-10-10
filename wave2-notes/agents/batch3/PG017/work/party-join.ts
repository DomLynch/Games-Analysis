// Licence: GPL-3.0 (donor). Clean-room sketch of the join rule as described in this note, not a translation of party.cpp.

interface SaveRecord {
  name: string;
  klass: number;          // index into the party-wide virtue array
}

interface PartyState {
  records: SaveRecord[];  // fixed 8 slots; slot 0 is the leader (avatar)
  members: number;        // slots in use, leader included
  leaderHpMax: number;    // level = floor(leaderHpMax / 100)
  virtues: number[];      // one value per class, 0..99
}

type JoinEvent = { type: "member-joined"; slot: number };
type JoinResult = "joined" | "not-experienced" | "not-virtuous";

const SLOTS = 8;
const HP_PER_LEVEL = 100;

function joinByName(
  p: PartyState,
  name: string,
  emit: (ev: JoinEvent) => void,
): JoinResult {
  for (let i = p.members; i < SLOTS; i++) {
    const cand = p.records[i];
    if (cand.name !== name) continue;

    // Gate 1: party size after the join must not exceed the leader's level.
    const level = Math.floor(p.leaderHpMax / HP_PER_LEVEL);
    if (p.members + 1 > level) return "not-experienced";

    // Gate 2: a virtue value from 1 to 39 blocks the join; 0 and 40 to 99 pass.
    const v = p.virtues[cand.klass];
    if (v > 0 && v < 40) return "not-virtuous";

    // Only after both gates: move the candidate into the first free slot.
    const tmp = p.records[p.members];
    p.records[p.members] = p.records[i];
    p.records[i] = tmp;
    p.members += 1;
    emit({ type: "member-joined", slot: p.members - 1 });
    return "joined";
  }
  // Not found in a free slot: the donor returns the same code for this case.
  return "not-experienced";
}
export {};
