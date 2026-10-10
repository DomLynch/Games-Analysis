// Licence of donor: Sustainable Use License 1.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Pos { x: number; y: number; }
interface Tile { solid: boolean; seen: boolean; occupied: boolean; region: number; }
interface Grid { tile(x: number, y: number): Tile | undefined; }
interface Rng { int(n: number): number; } // uniform integer in [0, n)

const SEED_TRIES = 10;          // seed attempts per group
const MEMBER_TRIES = 100;       // failed member tiles allowed per seed attempt
const SEED_SEARCH = 1000;       // added bound: the donor loops until it finds a free seed tile
const INTERIOR_MIN = 16;        // seeds are drawn from [16, 96) on each axis
const INTERIOR_SPAN = 80;
const STEPS: readonly Pos[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

function canPlace(g: Grid, p: Pos): boolean {
  const t = g.tile(p.x, p.y);
  return t !== undefined && !t.solid && !t.seen && !t.occupied;
}

function setOccupied(g: Grid, p: Pos, on: boolean): void {
  const t = g.tile(p.x, p.y);
  if (t !== undefined) t.occupied = on;
}

// Population target: one member per `perUnit` open tiles, plus half again in multiplayer,
// never taking the total past `cap`.
function populationTarget(openTiles: number, perUnit: number, cap: number, placed: number, multiplayer: boolean): number {
  let want = Math.floor(openTiles / perUnit);
  if (multiplayer) want += Math.floor(want / 2);
  return placed + Math.min(want, Math.max(0, cap - placed));
}

// Group size by level: level 1 is always 1; otherwise a coin flip gives 1; else 2 to 3 on level 2 or
// crypt-like levels, and 3 to 5 elsewhere.
function pickGroupSize(level: number, cryptLike: boolean, rng: Rng, flip: () => boolean): number {
  if (level === 1 || flip()) return 1;
  if (level === 2 || cryptLike) return 2 + rng.int(2);
  return 3 + rng.int(3);
}

function findFreeSeed(g: Grid, rng: Rng): Pos | undefined {
  for (let i = 0; i < SEED_SEARCH; i++) {
    const p: Pos = { x: INTERIOR_MIN + rng.int(INTERIOR_SPAN), y: INTERIOR_MIN + rng.int(INTERIOR_SPAN) };
    if (canPlace(g, p)) return p;
  }
  return undefined;
}

// Place one group of up to `size` members around a seed. `roster` holds all live spawns and
// `total` is the population target; a group never takes the roster past `total`.
function placeGroup(g: Grid, rng: Rng, roster: Pos[], size: number, total: number): number {
  const group: Pos[] = [];
  for (let seedTry = 0; seedTry < SEED_TRIES; seedTry++) {
    // A failed seed attempt is rolled back before the next one starts.
    while (group.length > 0) {
      const p = group.pop();
      if (p !== undefined) {
        roster.pop();
        setOccupied(g, p, false);
      }
    }
    const seed = findFreeSeed(g, rng);
    if (seed === undefined) continue;
    const seedRegion = g.tile(seed.x, seed.y)?.region;
    const need = Math.min(size, total - roster.length);
    let cur: Pos = seed;
    let fails = 0;
    while (group.length < need && fails < MEMBER_TRIES) {
      const t = g.tile(cur.x, cur.y);
      if (t !== undefined && t.region === seedRegion && canPlace(g, cur)) {
        setOccupied(g, cur, true);
        group.push(cur);
        roster.push(cur);
      } else {
        fails++;
      }
      // One random direction per step. The donor's y step reads the x delta (its BUGFIX comment
      // at monster.cpp 341); this sketch steps both axes from the same direction.
      const s = STEPS[rng.int(STEPS.length)];
      cur = { x: cur.x + s.x, y: cur.y + s.y };
    }
    if (group.length >= need) break;
  }
  return group.length;
}

// Level population: place groups until the target is met. The donor's loop has no bound;
// the sketch stops after 10000 rounds.
function populateLevel(
  g: Grid, rng: Rng, roster: Pos[], openTiles: number, cap: number, multiplayer: boolean,
  level: number, cryptLike: boolean, flip: () => boolean,
): number {
  const total = populationTarget(openTiles, 30, cap, roster.length, multiplayer);
  let rounds = 0;
  while (roster.length < total && rounds < 10000) {
    rounds++;
    placeGroup(g, rng, roster, pickGroupSize(level, cryptLike, rng, flip), total);
  }
  return roster.length;
}
