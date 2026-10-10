// Licence: GPL-3.0 (donor repo LICENSE; no per-file header in BaseSpawner.cs). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Entry {
  name: string;
  probability: number;   // weight in the pick (donor: SpawnedProbability, default 100)
  maxCount: number;      // per-entry cap (donor: SpawnedMaxCount, default 1)
  disabled: boolean;
  live: number;
}

interface Zone {
  count: number;         // zone cap: live spawns across all entries (donor: _count, default 1)
  minDelayMs: number;    // donor DefaultMinDelay: 5 min
  maxDelayMs: number;    // donor DefaultMaxDelay: 10 min
  group: boolean;        // group mode: refill only after every spawn is gone
  entries: Entry[];
  live: number;
  dueMs: number | null;  // null = timer not armed
}

const full = (z: Zone): boolean => z.live >= z.count;

// Fresh random delay in [min, max] every time the timer is armed (donor DoTimer, RandomMinMax).
function arm(z: Zone, now: number): void {
  z.dueMs = now + z.minDelayMs + Math.floor(Math.random() * (z.maxDelayMs - z.minDelayMs + 1));
}

// Weighted pick over enabled, non-full entries; full entries drop out of the sum (donor Spawn()).
function pickEntry(z: Zone): Entry | null {
  const open = z.entries.filter(e => !e.disabled && e.live < e.maxCount);
  const sum = open.reduce((a, e) => a + e.probability, 0);
  if (sum <= 0) return null;
  let r = 1 + Math.floor(Math.random() * sum);
  for (const e of open) {
    if (r <= e.probability) return e;
    r -= e.probability;
  }
  return null;
}

// One spawn, only when the zone is not full. Creating the mobile is the caller's job.
function spawnOne(z: Zone): void {
  if (full(z)) return;
  const e = pickEntry(z);
  if (!e) return;
  e.live++;
  z.live++;
}

// Timer fired (donor OnTick): group mode refills only when nothing is left, and a survivor
// leaves the timer off; after a refill the timer is armed if the zone is still not full. Non-group
// spawns one and re-arms only if not full. (The donor arms twice on a refill; one arm is enough.)
function onFire(z: Zone, now: number): void {
  z.dueMs = null;
  if (z.group) {
    if (z.live > 0) return;
    for (let i = 0; i < z.count; i++) spawnOne(z);
    if (!full(z)) arm(z, now);
    return;
  }
  spawnOne(z);
  if (!full(z)) arm(z, now);
}

// A spawn was removed (donor Remove): re-arm only if not full and the timer is not already running.
function onRemoved(z: Zone, now: number, entry: Entry): void {
  entry.live = Math.max(0, entry.live - 1);
  z.live = Math.max(0, z.live - 1);
  if (z.dueMs === null && !full(z)) arm(z, now);
}

export {};
