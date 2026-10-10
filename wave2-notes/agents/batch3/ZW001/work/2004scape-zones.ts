// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ZoneItem {
  id: string;
  receiver: number | null;   // null = visible to everyone; otherwise only this viewer id sees it
  dynamic: boolean;          // true for drops that the engine may evict (donor: DESPAWN lifecycle)
}

interface ZoneEvent {
  kind: "enclosed" | "follows"; // enclosed = shared with all viewers; follows = per receiver
  receiver: number | null;
  bytes: string;
}

interface Zone {
  id: number;
  items: ZoneItem[];        // list order = insertion order (donor: LinkList addTail, forward iteration from head)
  events: ZoneEvent[];      // cleared at the end of every tick
  shared: string | null;    // one buffer per tick, built from enclosed events
}

const OBJ_CAP = 129;        // donor Zone.OBJS = (8*8 << 1) + 1
const VIEW_RADIUS = 3;      // donor: 7x7 active zones around the player's zone
const BUILD_RADIUS = 6;     // donor: origin-relative build window, 13x13 zones

// Once per tick, for each zone touched this tick: one shared buffer from enclosed events.
function buildShared(z: Zone): void {
  const parts: string[] = [];
  for (const e of z.events) {
    if (e.kind === "enclosed") parts.push(e.bytes);
  }
  z.shared = parts.length === 0 ? null : parts.join("");
}

// Add an item. A dynamic item past the cap evicts the first dynamic item in list order (the oldest).
function addItem(z: Zone, item: ZoneItem): void {
  if (item.dynamic && z.items.length >= OBJ_CAP) {
    const i = z.items.findIndex((it) => it.dynamic);
    if (i >= 0) z.items.splice(i, 1);
  }
  z.items.push(item);
}

// Full snapshot for a viewer that has not loaded this zone yet: only items visible to that viewer.
function fullSnapshot(z: Zone, viewer: number): string[] {
  return z.items
    .filter((it) => it.receiver === null || it.receiver === viewer)
    .map((it) => `add:${it.id}`);
}

// What one viewer receives for one active zone this tick.
function zoneUpdatesFor(viewer: number, z: Zone, loaded: Set<number>): string[] {
  const out: string[] = [];
  if (!loaded.has(z.id)) {
    out.push(...fullSnapshot(z, viewer));
    loaded.add(z.id);
  }
  if (z.shared !== null) out.push(z.shared);
  for (const e of z.events) {
    if (e.kind === "follows" && (e.receiver === null || e.receiver === viewer)) out.push(e.bytes);
  }
  return out;
}

// Active zones around the player, clipped to the origin-relative build window (zone coordinates).
function activeZones(pzx: number, pzz: number, ozx: number, ozz: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let x = pzx - VIEW_RADIUS; x <= pzx + VIEW_RADIUS; x++) {
    for (let z = pzz - VIEW_RADIUS; z <= pzz + VIEW_RADIUS; z++) {
      if (x < ozx - BUILD_RADIUS || x > ozx + BUILD_RADIUS || z < ozz - BUILD_RADIUS || z > ozz + BUILD_RADIUS) continue;
      out.push([x, z]);
    }
  }
  return out;
}

// Respawn duration scaled by player count: 1.0x at 0 players, 0.5x at 2000 or more.
function scaledRespawnTicks(baseTicks: number, players: number): number {
  const p = Math.min(players, 2000);
  return Math.trunc(((4000 - p) * baseTicks) / 4000);
}
