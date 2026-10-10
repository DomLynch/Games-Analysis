// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number;

interface SpawnTuning {
  baseCap: number;           // zone data: donor 3 + depth % 5 on regular levels
  capRange: number;          // engine constant: donor adds Random.Int(3), i.e. 0..2 extra, re-rolled on every check
  cooldownTurns: number;     // engine constant: donor TIME_TO_RESPAWN = 50
  darkFactor: number;        // engine constant: donor uses 2/3 of the cooldown when the zone feeling is DARK
  minPathDist: number;       // engine constant: donor spawnMob(12), walk steps from the hero
  tries: number;             // engine constant: donor 30 cell draws
  retryTurns: number;        // engine constant: donor TICK = 1 after a failed placement
}

interface ZoneSpawner {
  rotation: string[];                  // remaining species of the current refill
  refill: () => string[];              // zone data: the species table for this depth, shuffled
  liveWeight: () => number;            // sum of spawn weights of living enemies, minibosses excluded
  randomCell: () => number;            // any walkable cell, or -1
  pathDist: (cell: number) => number;  // walk steps from the nearest player
  inView: (cell: number) => boolean;   // visible to any player
  place: (species: string, cell: number) => void;
}

function findFarCell(z: ZoneSpawner, t: SpawnTuning): number {
  for (let i = 0; i < t.tries; i++) {
    const c = z.randomCell();
    if (c >= 0 && !z.inView(c) && z.pathDist(c) >= t.minPathDist) return c;
  }
  return -1;
}

// One act of the spawner. Returns the delay in turns until the next act.
function spawnerAct(z: ZoneSpawner, t: SpawnTuning, rng: Rng, dark: boolean): number {
  const cooldown = dark ? t.cooldownTurns * t.darkFactor : t.cooldownTurns;
  const cap = t.baseCap + Math.floor(rng() * t.capRange); // re-rolled on every check
  if (z.liveWeight() >= cap) return cooldown;              // at the cap: wait a full cycle
  if (z.rotation.length === 0) z.rotation = z.refill();
  const species = z.rotation.shift();                       // consumed before placement, as in the donor
  if (species === undefined) return cooldown;
  const cell = findFarCell(z, t);
  if (cell < 0) return t.retryTurns;                        // species is lost on this path, as in the donor
  z.place(species, cell);
  return cooldown;
}
