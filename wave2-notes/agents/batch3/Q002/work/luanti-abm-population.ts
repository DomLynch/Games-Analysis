// clean-room sketch from the described mechanism; not a translation of the donor
interface Pos { x: number; y: number; }

interface Zone {
  id: string;
  center: Pos;
  coverageRadius: number; // zone is live only while a player is this close
  chance: number;         // one roll in `chance` per zone pass that is due
  cap: number;            // designer cap on live creatures (donor has none; it passes counts)
  live: number;           // creatures currently alive in this zone
  timer: number;          // accumulator in seconds, kept between passes
}

interface Budget {
  intervalS: number;      // pass cadence, seconds
  budgetRatio: number;    // share of the interval a pass may spend
}

// Presence gate: only zones with a player inside their coverage are considered.
function liveZones(zones: Zone[], players: Pos[]): Zone[] {
  return zones.filter(z =>
    players.some(p => Math.hypot(p.x - z.center.x, p.y - z.center.y) <= z.coverageRadius));
}

// Accumulator: returns true when the zone is due, and keeps the remainder.
function isDue(z: Zone, dtS: number, intervalS: number): boolean {
  z.timer += dtS;
  if (z.timer < intervalS) return false;
  z.timer -= intervalS;
  return true;
}

// One population pass: shuffle, roll per due zone, respect the cap, stop when over budget.
function populationPass(
  zones: Zone[],
  players: Pos[],
  dtS: number,
  b: Budget,
  rand: () => number,           // server-side random number in [0, 1)
  now: () => number,            // milliseconds
  spawn: (z: Zone) => void,
): void {
  const start = now();
  const budgetMs = b.intervalS * 1000 * b.budgetRatio;
  const order = liveZones(zones, players).sort(() => rand() - 0.5); // fairness shuffle
  for (const z of order) {
    if (now() - start > budgetMs) break; // stop the pass; the rest waits for the next one
    if (!isDue(z, dtS, b.intervalS)) continue;
    if (z.live >= z.cap) continue;
    if (rand() >= 1 / z.chance) continue; // one roll in `chance`
    spawn(z);
  }
}
export {}
