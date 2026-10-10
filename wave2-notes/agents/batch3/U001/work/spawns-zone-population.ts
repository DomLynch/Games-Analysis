// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnEntry {
  name: string;
  weight: number;      // relative chance this entry is picked
  maxAlive: number;    // per-entry cap
  alive: number;
  enabled: boolean;
}

export interface Zone {
  cap: number;         // zone-wide cap on live spawns
  minDelayMs: number;  // respawn delay range, one spawn per timer fire
  maxDelayMs: number;
  entries: SpawnEntry[];
  alive: number;
  nextAt: number | null; // null = timer stopped (full or not started)
}

export const isFull = (z: Zone): boolean => z.alive >= z.cap;

// Weighted pick among enabled entries that are below their own cap.
export function pickEntry(z: Zone, rand: () => number): SpawnEntry | null {
  const open = z.entries.filter((e) => e.enabled && e.alive < e.maxAlive && e.weight > 0);
  const total = open.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = 1 + Math.floor(rand() * total); // 1..total
  for (const e of open) {
    if (r <= e.weight) return e;
    r -= e.weight;
  }
  return null;
}

function armTimer(z: Zone, now: number, rand: () => number): void {
  const span = z.maxDelayMs - z.minDelayMs;
  const delay = z.minDelayMs + Math.floor(rand() * (span + 1));
  z.nextAt = isFull(z) ? null : now + delay;
}

// One timer fire: spawn at most one creature, then re-arm (or stop when full).
export function tick(z: Zone, now: number, rand: () => number, place: () => boolean): void {
  if (!isFull(z)) {
    const e = pickEntry(z, rand);
    if (e !== null && place()) {
      e.alive++;
      z.alive++;
    }
  }
  armTimer(z, now, rand);
}

// A spawn died and was deleted: free the slot, and restart the timer if it was stopped.
export function onSpawnGone(z: Zone, e: SpawnEntry, now: number, rand: () => number): void {
  e.alive = Math.max(0, e.alive - 1);
  z.alive = Math.max(0, z.alive - 1);
  if (z.nextAt === null && !isFull(z)) armTimer(z, now, rand);
}

// Player entering the trigger range of an empty zone whose timer is due: spawn now and re-arm.
export function onPlayerTrigger(z: Zone, now: number, rand: () => number, place: () => boolean): boolean {
  if (z.alive !== 0 || (z.nextAt ?? now) > now) return false;
  tick(z, now, rand, place);
  return true;
}

// Sector emptied while a creature is out of its home range: go home after a grace of 15 to 59 s.
// Returns the time to check, or null if the creature stays put.
export function goHomeAt(now: number, outOfHome: boolean, rand: () => number): number | null {
  if (!outOfHome) return null;
  return now + (15 + Math.floor(rand() * 45)) * 1000;
}

// Random spawn point inside bounds, up to 10 attempts; otherwise the zone's own point.
export function pickPosition(
  bounds: { x0: number; x1: number; y0: number; y1: number }, attempts: number,
  canSpawnAt: (x: number, y: number) => boolean, rand: () => number, fallback: { x: number; y: number }
): { x: number; y: number } {
  for (let i = 0; i < attempts; i++) {
    const x = bounds.x0 + Math.floor(rand() * (bounds.x1 - bounds.x0));
    const y = bounds.y0 + Math.floor(rand() * (bounds.y1 - bounds.y0));
    if (canSpawnAt(x, y)) return { x, y };
  }
  return fallback;
}
