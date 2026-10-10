// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ZoneId = string;

interface EntityRecord {
  id: number;
  kind: string;
  inUse: boolean;
  fields: Record<string, number | string | boolean>;
}

interface ZoneSnapshot { zone: ZoneId; savedAt: number; entities: EntityRecord[]; }

// Donor: the settle run on re-entry is 100 game frames at FRAMETIME 0.1 s (about 10 s).
const SETTLE_FRAMES = 100;

const snapshots = new Map<ZoneId, ZoneSnapshot>();

function copyEntity(e: EntityRecord): EntityRecord {
  return { ...e, fields: { ...e.fields } };
}

// Exit: player entities are marked not-in-use while the zone is written, so they are not saved
// as bodies; the flags are then restored (donor: sv_ccmds.c 516-530).
function saveZoneOnExit(zone: ZoneId, world: EntityRecord[], playerIds: ReadonlySet<number>, now: number): void {
  const flags = new Map<number, boolean>();
  for (const e of world) {
    if (playerIds.has(e.id)) { flags.set(e.id, e.inUse); e.inUse = false; }
  }
  const entities = world.filter((e) => e.inUse).map(copyEntity);
  for (const e of world) {
    const f = flags.get(e.id);
    if (f !== undefined) e.inUse = f;
  }
  snapshots.set(zone, { zone, savedAt: now, entities });
}

// Entry: the zone is first built from its own baseline, then the saved state replaces it
// (donor: SpawnEntities at sv_init.c 260, then the restore check at 274). Deathmatch-style
// zones skip the restore (sv_init.c 126-127).
function enterZone(
  zone: ZoneId,
  baseline: () => EntityRecord[],
  deathmatch: boolean,
): { world: EntityRecord[]; settleFrames: number } {
  const snap = snapshots.get(zone);
  if (deathmatch || !snap) return { world: baseline(), settleFrames: 0 };
  return { world: snap.entities.map(copyEntity), settleFrames: SETTLE_FRAMES };
}

// A map name starting with '*' begins a new unit: every saved zone is dropped (donor: sv_ccmds.c 507-511).
function startMap(name: string): void {
  if (name.startsWith("*")) snapshots.clear();
}

export {};
