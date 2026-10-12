// Licence: GPL-3.0 (donor COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Movement = "fixed" | "wander" | "follow_avatar" | "attack_avatar";

type Role =
  | "talker" | "beggar" | "guard" | "companion"
  | "vendor_weapons" | "vendor_armor" | "vendor_food" | "vendor_tavern"
  | "vendor_reagents" | "vendor_healer" | "vendor_inn" | "vendor_guild" | "vendor_stable"
  | "lord_british" | "hawkwind";

// One authored slot in a town's roster (zone data).
interface NpcTemplate {
  slot: number;           // 1-based slot in the roster
  tile: string;           // tile name from the town's tileset
  x: number;
  y: number;              // authored start tile
  movement: Movement;
  talkId: number | null;  // dialogue index into the town's text file
  role: Role;
  companionId?: string;   // set only on companion slots; matched against party membership by id
}

type PlacedNpc = NpcTemplate;

// Load-time checks. The donor has no check on role slot ids or on start tiles.
function validateRoster(
  roster: NpcTemplate[],
  maxNpcs: number,
  passable: (x: number, y: number) => boolean,
): string[] {
  const errors: string[] = [];
  const seen = new Set<number>();
  for (const n of roster) {
    if (n.slot < 1 || n.slot > maxNpcs) errors.push(`slot ${n.slot} out of range`);
    if (seen.has(n.slot)) errors.push(`duplicate slot ${n.slot}`);
    seen.add(n.slot);
    if (!passable(n.x, n.y)) errors.push(`slot ${n.slot} starts on a blocked tile`);
  }
  return errors;
}

// One town entry: fresh copies of the authored roster, joined companions skipped, each placed at its own start tile in order.
function populateTown(roster: NpcTemplate[], joinedCompanionIds: ReadonlySet<string>): PlacedNpc[] {
  const placed: PlacedNpc[] = [];
  for (const t of roster) {
    if (t.role === "companion" && t.companionId !== undefined && joinedCompanionIds.has(t.companionId)) continue;
    placed.push({ ...t }); // a copy: anything changed during the last visit is not kept
  }
  return placed;
}

export {};
