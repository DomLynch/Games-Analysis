// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnEntry {
  groupId: string;
  interval: number;        // mean ticks between draws at multiplier 1 (zone data)
  canTrigger: () => boolean; // condition gate (zone data)
}

export interface ZoneCensus {
  allyStrength: number;    // strength of friendly groups already in the zone
  enemyStrength: number;   // strength of hostile groups already in the zone
}

// Chance per tick is 1 / max(floorTicks, interval / multiplier). The floor is a Frankendom
// choice: the donor has none, so a multiplier above the interval makes the draw always hit.
function due(e: SpawnEntry, multiplier: number, floorTicks: number, rand: () => number): boolean {
  if (multiplier <= 0) return false;
  const n = Math.max(floorTicks, Math.floor(e.interval / multiplier));
  return Math.floor(rand() * n) === 0;
}

// One engine tick: each due, allowed entry spawns one group, unless allies already outnumber
// enemies more than 2:1 (the guard applies only when an enemy is present).
export function tickSpawns(
  entries: SpawnEntry[],
  multiplier: number,
  zone: ZoneCensus,
  rand: () => number,
  spawn: (groupId: string) => void,
  floorTicks = 1,
): number {
  if (multiplier <= 0) return 0;
  let spawned = 0;
  for (const e of entries) {
    if (!due(e, multiplier, floorTicks, rand)) continue;
    if (!e.canTrigger()) continue;
    if (zone.enemyStrength > 0 && zone.allyStrength > 2 * zone.enemyStrength) continue;
    spawn(e.groupId);
    spawned++;
  }
  return spawned;
}

// On zone entry: a few simulated seconds of draws, each entry placed directly in the zone
// (no travel). No population guard is applied here, as in the donor.
export function prewarm(
  entries: SpawnEntry[],
  multiplier: number,
  rand: () => number,
  place: (groupId: string) => void,
  seconds = 5,
  ticksPerSecond = 60,
  floorTicks = 1,
): void {
  if (multiplier <= 0) return;
  for (let s = 0; s < seconds; s++) {
    for (const e of entries) {
      const n = Math.max(floorTicks, Math.floor(e.interval / multiplier));
      const hit = Math.floor(rand() * n) < ticksPerSecond;
      if (hit && e.canTrigger()) place(e.groupId);
    }
  }
}

export {};
