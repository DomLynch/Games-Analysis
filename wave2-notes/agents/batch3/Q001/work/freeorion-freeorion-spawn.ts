// Licence: donor GPL v2 (source) and GPL v2 + CC-BY-SA-3.0 (content scripts). Clean-room sketch from the described mechanism, not a translation.
// clean-room
interface SpawnPoint {
  id: number;
  occupied: boolean; // donor: any planet or any fleet present (turn_events.py 47)
}

interface ZoneSpawnData {
  freq: number; // zone data: ratio from the frequency table (donor: 0.002 .. 0.999)
  cap: number;  // zone data: max live monsters of this kind (donor per-turn path has none)
  kind: string; // monster kind to place
}

interface SpawnRoll {
  spawned: boolean;
  pointId: number | null;
  kind: string | null;
}

const PER_POINT_SCALE = 0.01; // engine constant: donor turn_events.py 39 uses * 0.01

// One roll for one zone, called once per server tick. rand() returns a value in [0, 1).
export function spawnTick(points: SpawnPoint[], zone: ZoneSpawnData, live: number, rand: () => number): SpawnRoll {
  const none: SpawnRoll = { spawned: false, pointId: null, kind: null };
  if (zone.freq <= 0 || live >= zone.cap) return none;
  const chance = points.length * zone.freq * PER_POINT_SCALE;
  if (rand() >= chance) return none;
  const free = points.filter((p) => !p.occupied);
  if (free.length === 0) return none;
  const pick = free[Math.floor(rand() * free.length)];
  return { spawned: true, pointId: pick.id, kind: zone.kind };
}
export {};
