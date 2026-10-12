// Licence: GPL-3.0-or-later (engine donor, Map.cpp) and CC-BY-SA 3.0 (game data donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "empty" | "normal" | "start" | "end" | "key" | "door_ns" | "door_we";
// links index: 0 = north, 1 = south, 2 = west, 3 = east (donor enum order, Map.h:178-181)
export interface Cell { kind: Kind; doorLevel: number; links: [boolean, boolean, boolean, boolean] }
export interface Pt { x: number; y: number }

const STEP: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const OPP = [1, 0, 3, 2];

// Seeded PRNG (mulberry32). The donor calls the global rand(); a Frankendom grammar must be reproducible.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inclusive integer range. Swaps reversed bounds; the donor helper (UtilsMath.h:45-48) does not.
export function randBetween(rng: () => number, lo: number, hi: number): number {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return a + Math.floor(rng() * (b - a + 1));
}

export function newGrid(w: number, h: number): Cell[][] {
  const g: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < w; x++) row.push({ kind: "empty", doorLevel: 0, links: [false, false, false, false] });
    g.push(row);
  }
  return g;
}

function linkCount(c: Cell): number {
  return c.links.filter((v) => v).length;
}

// A straight chunk is north+south only or west+east only (Map.cpp:1644-1646).
function isStraight(c: Cell): boolean {
  const [n, s, w, e] = c.links;
  return (n && s && !w && !e) || (!n && !s && w && e);
}

// One walk step (donor procGenWalkSingle, Map.cpp:972-1015). Returns the next cell or null (stay).
// Main path: the target must be empty. Any target: start, end and door cells block; a target with k links
// is taken only at odds 1/k and only on the same door level.
function walkTarget(grid: Cell[][], cur: Pt, d: number, mainPath: boolean, rng: () => number): Pt | null {
  const nx = cur.x + STEP[d][0];
  const ny = cur.y + STEP[d][1];
  if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) return null;
  const next = grid[ny][nx];
  if (next.kind === "start" || next.kind === "end" || next.kind === "door_ns" || next.kind === "door_we") return null;
  if (mainPath && next.kind !== "empty") return null;
  const k = linkCount(next);
  const prev = grid[cur.y][cur.x];
  if (k > 0 && (next.doorLevel !== prev.doorLevel || rng() * k >= 1)) return null;
  return { x: nx, y: ny };
}

export interface PathRules { mainPath: boolean; doorsMax: number; doorMinDist: number; maxBranches: number }
export interface PathResult { end: Pt; length: number; doors: number; branchRoots: Pt[] }

// Grow a path of up to `steps` steps (donor procGenCreatePath, Map.cpp:1017-1198). Door chance ramps; a
// branch root is recorded on a normal cell under a chance that starts at 50 and rises by 5 per step.
export function growPath(grid: Cell[][], start: Pt, steps: number, rng: () => number, rules: PathRules): PathResult {
  let cur: Pt = { x: start.x, y: start.y };
  let length = 1;
  let doors = 0;
  let doorChance = 0;
  let doorDist = 0;
  let branchChance = 50;
  let branchCount = 0;
  const branchRoots: Pt[] = [];
  if (rules.mainPath) grid[cur.y][cur.x].kind = "start";

  for (let s = steps; s >= 0; s--) {
    let d = Math.floor(rng() * 4);
    const rotate = rng() < 0.5 ? 1 : -1;
    for (let tries = 0; tries < 4 && grid[cur.y][cur.x].links[d]; tries++) d = (d + rotate + 4) % 4;

    const prev: Pt = { x: cur.x, y: cur.y };
    const target = walkTarget(grid, cur, d, rules.mainPath, rng);
    if (!target) continue;

    const from = grid[prev.y][prev.x];
    const to = grid[target.y][target.x];
    from.links[d] = true;
    to.links[OPP[d]] = true;
    to.kind = "normal";
    cur = target;
    length++;
    doorDist++;

    if (rules.mainPath) {
      if (from.kind !== "start" && isStraight(from) && doors < rules.doorsMax && rng() * 100 < doorChance) {
        from.kind = from.links[0] && from.links[1] ? "door_ns" : "door_we";
        from.doorLevel++;
        to.doorLevel++;
        doorChance = 0;
        doors++;
        doorDist = 0;
        branchCount = 0;
      }
      if (doorDist > rules.doorMinDist) doorChance = doors === 0 ? 100 : doorChance + 5;
      if (to.kind === "normal" && branchCount < rules.maxBranches && rng() * 100 < branchChance) {
        branchRoots.push({ x: cur.x, y: cur.y });
        branchChance = 50;
        branchCount++;
      }
      branchChance += 5;
    }
    to.doorLevel = from.doorLevel;
  }
  if (rules.mainPath) grid[cur.y][cur.x].kind = "end";
  return { end: cur, length, doors, branchRoots };
}

// One key per door level, drawn without replacement (donor Map.cpp:1362-1375).
export function placeKeys(grid: Cell[][], doors: number, rng: () => number): void {
  const levels: Cell[][] = [];
  for (let i = 0; i < doors; i++) levels.push([]);
  for (const row of grid) for (const c of row) if (c.kind === "normal" && c.doorLevel < doors) levels[c.doorLevel].push(c);
  for (const pool of levels) {
    if (pool.length === 0) continue;
    const i = Math.floor(rng() * pool.length);
    pool[i].kind = "key";
    pool.splice(i, 1);
  }
}

// Once-per-campaign service rooms (donor procgen_unique_status, Map.cpp:1391 and 1421): a room whose
// status is already set is never offered again. Returns the chosen room name, or null.
export function pickUnique(pool: { name: string; status: string }[], campaign: Set<string>, rng: () => number): string | null {
  const open = pool.filter((r) => !campaign.has(r.status));
  if (open.length === 0) return null;
  const pick = open[Math.floor(rng() * open.length)];
  campaign.add(pick.status);
  return pick.name;
}

// Branch length, fixed bounds (donor call at Map.cpp:1340 caps the upper bound at the min; this sketch does not).
export function branchLength(rng: () => number, min: number, max: number): number {
  return randBetween(rng, min, max);
}

export {};
