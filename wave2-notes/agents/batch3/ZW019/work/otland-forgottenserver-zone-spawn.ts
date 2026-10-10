// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SpawnType { name: string; chance: number; }      // percent; sorted highest chance first

interface SpawnPoint {
  id: number;
  x: number; y: number; z: number;
  types: SpawnType[];
  intervalMs: number;     // spawntime
  lastSpawnMs: number;    // set on a successful spawn and on a failed attempt
  liveId: number | null;  // the one monster this point may hold
}

interface World {
  playerInWindow(x: number, y: number, z: number): boolean; // presence gate
  place(name: string, x: number, y: number, z: number): number | null; // monster id, or null
  isAlive(id: number): boolean;
  roll(): number;         // integer 1..100
}

interface Zone {
  points: SpawnPoint[];
  rateSpawn: number;      // spawns allowed per check
}

// Wake-up cadence of the zone: the smallest spawntime among its points.
function zoneCadenceMs(z: Zone): number {
  return Math.min(...z.points.map(p => p.intervalMs));
}

function placeType(p: SpawnPoint, t: SpawnType, now: number, w: World): boolean {
  const id = w.place(t.name, p.x, p.y, p.z);
  if (id === null) return false;
  p.liveId = id;
  p.lastSpawnMs = now;
  return true;
}

// One spawn attempt at a point: presence gate, chance pass, then an unconditional fallback.
function attempt(p: SpawnPoint, now: number, w: World): boolean {
  const open = w.playerInWindow(p.x, p.y, p.z) ? [] : p.types;
  if (open.length === 0) return false;
  if (open.length > 1) {
    for (const t of open) {
      if (w.roll() <= t.chance && placeType(p, t, now, w)) return true;
    }
  }
  return placeType(p, open[0], now, w);
}

// One zone check, run by a scheduler event. Returns the next check time, or null when every point is full.
function checkZone(z: Zone, now: number, w: World): { nextCheckMs: number | null; spawned: number } {
  let spawned = 0;
  for (const p of z.points) {
    if (p.liveId !== null && w.isAlive(p.liveId)) continue;   // occupied: no respawn while alive
    p.liveId = null;
    if (now < p.lastSpawnMs + p.intervalMs) continue;          // not due yet
    if (!attempt(p, now, w)) { p.lastSpawnMs = now; continue; } // failed: wait a full spawntime
    if (++spawned >= z.rateSpawn) break;                       // per-check cap
  }
  const anyEmpty = z.points.some(p => p.liveId === null || !w.isAlive(p.liveId));
  return { nextCheckMs: anyEmpty ? now + zoneCadenceMs(z) : null, spawned };
}

interface Leash { radius: number; zRange: number; overspawn: boolean; removeOnDespawn: boolean; }
interface Pos { x: number; y: number; z: number; }
type LeashAction = 'stay' | 'detach-and-recheck' | 'remove' | 'home';

function inLeash(home: Pos, at: Pos, cfg: Leash): boolean {
  if (cfg.radius === 0) return true;
  if (Math.abs(at.x - home.x) > cfg.radius || Math.abs(at.y - home.y) > cfg.radius) return false;
  if (cfg.zRange === 0) return true;
  return Math.abs(at.z - home.z) <= cfg.zRange;
}

// Called once per monster think (1000 ms). Outside the leash, the monster is detached or removed, or sent home.
function leashStep(home: Pos, at: Pos, cfg: Leash): LeashAction {
  if (inLeash(home, at, cfg)) return 'stay';
  if (cfg.overspawn) return 'detach-and-recheck';
  return cfg.removeOnDespawn ? 'remove' : 'home';
}

export {};
