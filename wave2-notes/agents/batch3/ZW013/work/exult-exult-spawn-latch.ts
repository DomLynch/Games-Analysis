// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tile { x: number; y: number; }

interface SpawnPoint {
  at: Tile;
  chance: number;        // 1..100, zone data
  countMax: number;      // spawn count is 1..countMax (0..63 in the donor's 6-bit field), zone data
  radius: number;        // trigger square half-width in tiles, zone data
  autoReset: boolean;    // re-arm on re-entry from outside the trigger, zone data
  latched: boolean;      // set after the first roll, cleared only by re-arm
}

const SEARCH_RADIUS = 5;    // engine constant: spawn search radius in tiles
const WINDOW_CHUNKS = 2;    // engine constant: chunks kept armed around the player

function inTrigger(sp: SpawnPoint, t: Tile): boolean {
  return Math.abs(t.x - sp.at.x) <= sp.radius && Math.abs(t.y - sp.at.y) <= sp.radius;
}

// Called once per player step with the tile stepped from and the tile stepped onto.
// Entry-based rule only (the donor's avatar_near case); the donor's cached_in and avatar_far cases are not reproduced.
function shouldRoll(sp: SpawnPoint, from: Tile, to: Tile): boolean {
  if (sp.latched && !sp.autoReset) return false;
  return inTrigger(sp, to) && !inTrigger(sp, from);
}

// One roll per latch. The latch is set whether or not the roll hits.
// Returns the number of monsters to place.
function rollSpawn(sp: SpawnPoint, rnd: () => number): number {
  const roll = 1 + Math.floor(rnd() * 100);            // 1..100
  let count = 0;
  if (roll <= sp.chance) {
    count = sp.countMax > 1 ? 1 + Math.floor(rnd() * sp.countMax) : sp.countMax;
  }
  sp.latched = true;
  return count;
}

// Tiles at Chebyshev distance d from origin, clockwise from the top-left corner (simplified order).
function perimeter(origin: Tile, d: number): Tile[] {
  const out: Tile[] = [];
  for (let x = -d; x <= d; x++) out.push({ x: origin.x + x, y: origin.y - d });
  for (let y = -d + 1; y <= d; y++) out.push({ x: origin.x + d, y: origin.y + y });
  for (let x = d - 1; x >= -d; x--) out.push({ x: origin.x + x, y: origin.y + d });
  for (let y = d - 1; y >= -d + 1; y--) out.push({ x: origin.x - d, y: origin.y + y });
  return out;
}

// Ring search: the origin first, then rings d = 1..SEARCH_RADIUS. Each walk starts at a random direction.
// Returns null when nothing is free; the caller must count the shortfall, not drop it silently.
function findSpot(origin: Tile, free: (t: Tile) => boolean, rnd: () => number): Tile | null {
  if (free(origin)) return origin;
  const dir = Math.floor(rnd() * 8);
  for (let d = 1; d <= SEARCH_RADIUS; d++) {
    const ring = perimeter(origin, d);
    const n = ring.length;                               // 8 * d
    const pref = ((dir + 1) % 8) * d;
    let index = (pref - Math.floor(d / 2) + n) % n;
    for (let k = 0; k < n; k++) {
      const p = ring[index];
      if (free(p)) return p;
      index = (index + 1) % n;
    }
  }
  return null;
}

// Re-arm: a spawn point more than WINDOW_CHUNKS chunks from the player's chunk loses its latch.
// Simplified: the donor walks the old 5x5 window; this checks distance from the new chunk only.
function rearmIfOutsideWindow(sp: SpawnPoint, playerChunk: Tile, tilesPerChunk: number): void {
  const dx = Math.abs(Math.floor(sp.at.x / tilesPerChunk) - playerChunk.x);
  const dy = Math.abs(Math.floor(sp.at.y / tilesPerChunk) - playerChunk.y);
  if (dx > WINDOW_CHUNKS || dy > WINDOW_CHUNKS) sp.latched = false;
}
export {};
