// Licence: MIT (donor, Levy Street 2026). Shape adapted; written fresh for Frankendom, not a line copy.
type Vec2 = { x: number; z: number };

const TICK_RATE = 20;                 // sim ticks per second (donor types.ts:32)
const SLOT_COUNT = 24;                // claim slots per zone (donor data.ts:1094); zone data in Frankendom
const FOOTPRINT_HALF_W = 120;         // claim footprint x half-width (donor dungeons.ts:241); zone data here
const FOOTPRINT_HALF_D = 250;         // claim footprint z half-depth (donor dungeons.ts:253); zone data here
const EMPTY_TIMEOUT_S = 300;          // empty claim frees after 5 min (donor types.ts:258)
const CLEARED_EMPTY_TIMEOUT_S = 900;  // empty claim whose boss is dead idles 15 min (donor dungeons.ts:104)
const DOOR_RADIUS = 2.0;              // walk-in radius for doors and exits (donor dungeons.ts:81)

interface Claim {
  zone: string;
  slot: number;
  origin: Vec2;
  key: string | null;       // owner: 'party:<id>' or 'solo:char:<durableId>'
  cleared: boolean;         // final boss dead: longer idle grace
  emptyFor: number;         // whole seconds with nobody inside the footprint
  mobIds: number[];
  exitId: number | null;
}

interface Player { id: number; key: string; pos: Vec2; }

type EnterResult = { ok: true; claim: Claim; fresh: boolean } | { ok: false; reason: 'busy' };

function makePool(zones: string[]): Claim[] {
  const pool: Claim[] = [];
  zones.forEach((zone, zoneIndex) => {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      pool.push({
        zone,
        slot,
        origin: { x: zoneIndex * 600, z: -1250 + slot * 500 },
        key: null,
        cleared: false,
        emptyFor: 0,
        mobIds: [],
        exitId: null,
      });
    }
  });
  return pool;
}

// Footprint test: the claim is 'occupied' only while someone stands inside its box.
function inFootprint(c: Claim, pos: Vec2): boolean {
  return Math.abs(pos.x - c.origin.x) < FOOTPRINT_HALF_W && Math.abs(pos.z - c.origin.z) < FOOTPRINT_HALF_D;
}

// Entry: an existing claim for this key always wins (rejoin, even when the pool is full).
// Otherwise take the first unowned slot in the zone; if none, the zone is busy.
function enterZone(pool: Claim[], zone: string, key: string, spawn: (c: Claim) => void): EnterResult {
  let claim = pool.find((c) => c.zone === zone && c.key === key);
  let fresh = false;
  if (!claim) {
    const free = pool.find((c) => c.zone === zone && c.key === null);
    if (!free) return { ok: false, reason: 'busy' };
    free.key = key;
    free.cleared = false;
    free.mobIds = [];
    free.exitId = null;
    spawn(free); // creates the claim's mobs and its exit portal
    claim = free;
    fresh = true;
  }
  claim.emptyFor = 0;
  return { ok: true, claim, fresh };
}

// Reaper: does work once a second (every TICK_RATE ticks); call it from the sim tick.
function reapEmpty(
  pool: Claim[],
  players: Player[],
  tick: number,
  free: (c: Claim) => void,
): void {
  if (tick % TICK_RATE !== 0) return;
  for (const c of pool) {
    if (c.key === null) continue;
    if (players.some((p) => inFootprint(c, p.pos))) {
      c.emptyFor = 0;
      continue;
    }
    c.emptyFor += 1;
    const limit = c.cleared ? CLEARED_EMPTY_TIMEOUT_S : EMPTY_TIMEOUT_S;
    if (c.emptyFor >= limit) free(c);
  }
}

// Free: despawn everything the claim owns, then return the slot to the pool.
function freeClaim(c: Claim, despawn: (id: number) => void): void {
  for (const id of c.mobIds) despawn(id);
  if (c.exitId !== null) despawn(c.exitId);
  c.key = null;
  c.cleared = false;
  c.emptyFor = 0;
  c.mobIds = [];
  c.exitId = null;
}

// Door walk-in: within DOOR_RADIUS of the door, enter the zone under the player's key.
function doorWalkIn(pool: Claim[], zone: string, door: Vec2, p: Player, spawn: (c: Claim) => void): EnterResult | null {
  if (Math.hypot(p.pos.x - door.x, p.pos.z - door.z) >= DOOR_RADIUS) return null;
  return enterZone(pool, zone, p.key, spawn);
}

export {};
