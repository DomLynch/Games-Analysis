// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = string;
type Rng = () => number; // returns a number in [0, 1)

interface Mob {
  kind: Kind;
  cell: number;
  weight: number;   // donor: spawningWeight(); 1 by default, 0.5 for Ghoul, 0 for Mimic
  miniboss: boolean;
  wandering: boolean;
}

interface Zone {
  depth: number;
  large: boolean;            // donor: feeling LARGE raises the cap x1.33 (ceil)
  dark: boolean;             // donor: feeling DARK shortens the respawn to 2/3
  baseRespawnTicks: number;  // donor: TIME_TO_RESPAWN = 50 turns
  timeMultiplier: number;    // donor: sundial multiplier (1 when none); cooldown is divided by it
  mobs: Mob[];
  queue: Kind[];             // spawn rotation, consumed one kind per attempt
}

interface Grid {
  cellCount: number;
  passable: (cell: number) => boolean;
  inHeroView: (cell: number) => boolean;
  occupied: (cell: number) => boolean;
  pathFromHero: (cell: number) => number;
}

interface World {
  zone: Zone;
  grid: Grid;
  rotation: (depth: number) => Kind[];        // data: standard list for this depth
  altFor: (kind: Kind) => Kind | undefined;   // data: rare alt for a kind
  altChance: number;                          // data: per-entry alt roll at refill time
  weightOf: (kind: Kind) => number;
  miniboss: (kind: Kind) => boolean;
  rng: Rng;
}

// Cap is re-rolled every time it is read (donor: mobLimit() includes Random.Int(3) and is called on each act).
function cap(z: Zone, rng: Rng): number {
  if (z.depth <= 1) return 0; // before the amulet, floor 1 gets no respawns
  let n = 3 + (z.depth % 5) + Math.floor(rng() * 3);
  if (z.large) n = Math.ceil(n * 1.33);
  return n;
}

function weightedCount(z: Zone): number {
  let total = 0;
  for (const m of z.mobs) {
    if (!m.miniboss) total += m.weight;
  }
  return Math.round(total);
}

function respawnTicks(z: Zone): number {
  const base = z.dark ? (2 * z.baseRespawnTicks) / 3 : z.baseRespawnTicks;
  return base / z.timeMultiplier;
}

// Refill builds a shuffled rotation; each entry may swap to its alt at refill time (donor: swapMobAlts).
function refill(w: World): void {
  const rot = w.rotation(w.zone.depth).slice();
  for (let i = 0; i < rot.length; i++) {
    const alt = w.altFor(rot[i]);
    if (alt !== undefined && w.rng() < w.altChance) rot[i] = alt;
  }
  for (let i = rot.length - 1; i > 0; i--) {
    const j = Math.floor(w.rng() * (i + 1));
    const tmp = rot[i];
    rot[i] = rot[j];
    rot[j] = tmp;
  }
  w.zone.queue = rot;
}

// The kind is consumed here, before placement, so a failed placement still uses up the entry.
function nextKind(w: World): Kind {
  if (w.zone.queue.length === 0) refill(w);
  return w.zone.queue.shift() as Kind;
}

// Donor randomRespawnCell: up to 30 random cells, skipping cells in hero view, walls and occupied cells.
function randomCell(w: World): number {
  for (let t = 0; t < 30; t++) {
    const c = Math.floor(w.rng() * w.grid.cellCount);
    if (!w.grid.inHeroView(c) && w.grid.passable(c) && !w.grid.occupied(c)) return c;
  }
  return -1;
}

// Donor spawnMob: up to 30 placement tries, each needing a path distance >= minDist from the hero.
function spawnMob(w: World, minDist: number): boolean {
  const kind = nextKind(w);
  for (let t = 0; t < 30; t++) {
    const c = randomCell(w);
    if (c !== -1 && w.grid.pathFromHero(c) >= minDist) {
      w.zone.mobs.push({
        kind,
        cell: c,
        weight: w.weightOf(kind),
        miniboss: w.miniboss(kind),
        wandering: true,
      });
      return true;
    }
  }
  return false;
}

// One director step (donor MobSpawner.act). Returns the tick of the next step.
function directorStep(w: World, now: number, minDist: number): number {
  if (weightedCount(w.zone) < cap(w.zone, w.rng)) {
    if (spawnMob(w, minDist)) return now + respawnTicks(w.zone);
    return now + 1; // donor TICK: try again next turn
  }
  return now + respawnTicks(w.zone);
}

export {};
