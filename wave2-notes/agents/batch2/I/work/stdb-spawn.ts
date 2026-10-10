// Licence: BSL-1.1 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneSpawnData {
  cap: number;               // target population (donor: 600 food)
  intervalMs: number;        // how often the director wakes (donor: 500)
  worldSize: number;         // square arena side
  massMin: number;           // spawn size range, min inclusive
  massMax: number;           // max exclusive in the Rust twin
}
interface Spawned { id: number; x: number; y: number; mass: number }
interface ZoneState { population: Spawned[]; playersPresent: number; nextId: number }

const radius = (mass: number): number => Math.sqrt(mass); // placeholder; donor has its own MassToRadius (not read)

// One wake of the spawn director. Pure top-up: no per-type timers, no respawn queue.
function spawnTick(z: ZoneState, d: ZoneSpawnData, rng: () => number): Spawned[] {
  if (z.playersPresent === 0) return [];               // idle zone: do nothing
  const made: Spawned[] = [];
  while (z.population.length < d.cap) {                // fill to the cap in one wake
    const mass = d.massMin + Math.floor(rng() * (d.massMax - d.massMin));
    const r = radius(mass);
    const s: Spawned = {
      id: z.nextId++,
      x: r + rng() * (d.worldSize - 2 * r),           // keep the whole body inside the arena
      y: r + rng() * (d.worldSize - 2 * r),
      mass,
    };
    z.population.push(s);
    made.push(s);
  }
  return made;
}

// Death and consumption just delete rows; the next wake refills. That is the whole respawn rule.
function remove(z: ZoneState, id: number): void {
  z.population = z.population.filter(p => p.id !== id);
}
export { spawnTick, remove };
