// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
interface SpawnProfile {
  probability: number;   // cumulative threshold for the roll; -1 means it fires on every select (zone data)
  initCount: number;     // objects queued when selected; -1 counts as one (zone data)
  maxCount: number;      // per-profile cap; -1 is unlimited (zone data)
  respawnS: number;      // cooldown after one of its objects is removed, seconds (zone data)
  spawned: Set<string>;  // live object ids
  queue: number[];       // due times in ms for pending spawns
  availableAt: number;   // cooldown end in ms
}
interface ZoneSpawner {
  maxCount: number;      // spawner-wide cap across profiles (zone data)
  profiles: SpawnProfile[];
}

const count = (p: SpawnProfile): number => p.spawned.size + p.queue.length;
const isMaxed = (p: SpawnProfile): boolean => p.maxCount !== -1 && count(p) >= p.maxCount;
const isAvailable = (p: SpawnProfile, now: number): boolean => now > p.availableAt;

// Total probability of the profiles that can still spawn right now; any eligible -1 profile makes it 1.
function totalChance(z: ZoneSpawner, now: number): number {
  let total = 0;
  let last = 0;
  for (const p of z.profiles) {
    if (p.probability === -1) {
      if (!isMaxed(p) && isAvailable(p, now)) return 1;
      continue;
    }
    if (!isMaxed(p) && isAvailable(p, now)) {
      if (last > p.probability) last = 0;
      total += p.probability - last;
    }
    last = p.probability;
  }
  return total;
}

// Objects to queue for one selection: init count, capped by the spawner slots and the profile slots.
function spawnCount(z: ZoneSpawner, p: SpawnProfile): number {
  let n = p.initCount === -1 || p.maxCount === -1 ? 1 : p.initCount;
  const zoneUsed = z.profiles.reduce((s, q) => s + count(q), 0);
  n = Math.min(n, z.maxCount - zoneUsed);
  if (p.maxCount !== -1) n = Math.min(n, p.maxCount - count(p));
  return Math.max(0, n);
}

function enqueue(p: SpawnProfile, n: number, now: number): void {
  for (let k = 0; k < n; k++) p.queue.push(now);
}

// One regeneration: one roll over the eligible profiles' cumulative chances; the first profile the roll lands in is queued.
// A -1 profile is queued on every selection and does not end the roll.
function selectProfile(z: ZoneSpawner, now: number, rand: () => number): void {
  const roll = rand() * totalChance(z, now);
  let cum = 0;
  let last = 0;
  for (const p of z.profiles) {
    const eligible = !isMaxed(p) && isAvailable(p, now);
    if (p.probability === -1) {
      if (eligible) enqueue(p, spawnCount(z, p), now);
      continue;
    }
    if (eligible) {
      if (last > p.probability) last = 0;
      cum += p.probability - last;
      if (roll < cum) {
        enqueue(p, spawnCount(z, p), now);
        return;
      }
    }
    last = p.probability;
  }
}

// Heartbeat: spawn due entries while under the profile cap; every due entry is consumed, spawned or not.
function processQueue(p: SpawnProfile, now: number, spawnOne: () => string | null): void {
  let i = 0;
  while (i < p.queue.length) {
    if (p.queue[i] > now) { i++; continue; }
    if (p.maxCount === -1 || p.spawned.size < p.maxCount) {
      const id = spawnOne();
      if (id !== null) p.spawned.add(id);
    }
    p.queue.splice(i, 1);
  }
}

// Removal (kill or destroy) frees the slot and starts the profile's respawn cooldown.
function onRemoved(p: SpawnProfile, id: string, now: number): void {
  if (!p.spawned.delete(id)) return;
  p.availableAt = now + p.respawnS * 1000;
}

export {};
