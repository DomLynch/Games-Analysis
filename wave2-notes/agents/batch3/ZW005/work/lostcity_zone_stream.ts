// Licence: MIT (donor LICENSE, Copyright (c) 2023-2026 Lost City). Adapted shape, re-expressed; not a line-by-line copy.
// Zones are 8x8 tiles. A client holds a 13x13-zone window around an origin, and the server re-centres that window only
// after the player walks out of an inner reload box. Inside the window, a 7x7 active set follows the player's zone.
export interface Pos { x: number; z: number } // tiles
export type ZoneKey = string;                 // "zx,zz" (donor packs ints)

const ZONE_TILES = 8;      // donor CoordGrid.ts 18 (pos >> 3)
const ACTIVE_RADIUS = 3;   // 7x7 active zones (donor BuildArea.ts 46-47)
const WINDOW_RADIUS = 6;   // 13x13 window around origin (donor BuildArea.ts 41-44, 72-75)
const RELOAD_LOW = 4;      // rebuild when player is 4 zones past origin to the west/south (BuildArea.ts 61, 64)
const RELOAD_HIGH = 5;     // ... or 5 zones to the east/north (BuildArea.ts 62, 63)

const zoneOf = (tile: number): number => tile >> 3;
const key = (zx: number, zz: number): ZoneKey => `${zx},${zz}`;

export interface StreamState {
  origin: Pos;           // tile position the window was last built around (donor BuildArea.originX/Z)
  loaded: Set<ZoneKey>;  // zones the client has full state for (donor loadedZones)
  active: Set<ZoneKey>;  // zones in range now (donor activeZones)
}

export function newState(p: Pos): StreamState {
  return { origin: { x: p.x, z: p.z }, loaded: new Set(), active: new Set() };
}

// Only called when the player's zone changes (donor NetworkPlayer.ts 266-267).
export function rebuildActive(s: StreamState, p: Pos): void {
  s.active.clear();
  const cx = zoneOf(p.x), cz = zoneOf(p.z);
  const ox = zoneOf(s.origin.x), oz = zoneOf(s.origin.z);
  for (let zx = cx - ACTIVE_RADIUS; zx <= cx + ACTIVE_RADIUS; zx++) {
    for (let zz = cz - ACTIVE_RADIUS; zz <= cz + ACTIVE_RADIUS; zz++) {
      if (zx < ox - WINDOW_RADIUS || zx > ox + WINDOW_RADIUS || zz < oz - WINDOW_RADIUS || zz > oz + WINDOW_RADIUS) continue;
      s.active.add(key(zx, zz));
    }
  }
}

// Hysteresis: the window is rebuilt only when the player leaves the inner box (donor BuildArea.ts 61-67).
export function needsWindowRebuild(s: StreamState, p: Pos): boolean {
  const ox = zoneOf(s.origin.x), oz = zoneOf(s.origin.z);
  return p.x < (ox - RELOAD_LOW) * ZONE_TILES || p.z < (oz - RELOAD_LOW) * ZONE_TILES
      || p.x > (ox + RELOAD_HIGH) * ZONE_TILES - 1 || p.z > (oz + RELOAD_HIGH) * ZONE_TILES - 1;
}

export function rebuildWindow(s: StreamState, p: Pos): void {
  s.origin = { x: p.x, z: p.z };  // donor stores the tile position as origin (BuildArea.ts 88-89)
  s.loaded.clear();               // next sync sends full state again (BuildArea.ts 90)
}

export interface TickOut { full: ZoneKey[]; shared: ZoneKey[]; follows: ZoneKey[] }

// One tick per client, after rebuildActive. sharedCount / followsCount: queued events per zone this tick.
export function syncTick(s: StreamState, sharedCount: Map<ZoneKey, number>, followsCount: Map<ZoneKey, number>): TickOut {
  for (const z of [...s.loaded]) if (!s.active.has(z)) s.loaded.delete(z);  // unload zones that left range (NetworkPlayer.ts 299-301)
  const out: TickOut = { full: [], shared: [], follows: [] };
  for (const z of s.active) {
    if (!s.loaded.has(z)) out.full.push(z);                          // full state first (NetworkPlayer.ts 308-309)
    if ((sharedCount.get(z) ?? 0) > 0) out.shared.push(z);           // one shared buffer for everyone (Zone.ts 101-121)
    if ((followsCount.get(z) ?? 0) > 0) out.follows.push(z);         // per-player events, filtered by receiver (Zone.ts 208-218)
    s.loaded.add(z);
  }
  return out;
}

export {};
