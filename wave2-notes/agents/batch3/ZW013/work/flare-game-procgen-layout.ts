// Licence: GPL-3.0-or-later (engine code) and CC-BY-SA 3.0 (game data). clean-room sketch written from the described mechanism, not a translation of either.
// clean-room
type Kind = "empty" | "normal" | "start" | "end" | "door" | "key";

interface Cell {
  kind: Kind;
  doorLevel: number;
  links: (Cell | null)[];   // N, S, W, E
  x: number;
  y: number;
}

interface Rules {
  mainMin: number;           // zone data
  mainMax: number;           // zone data
  mainAttemptsMax: number;   // zone data
  doorsMax: number;          // zone data
  doorSpacingMin: number;    // zone data, chunks
  branchesPerLevelMax: number; // zone data
  branchMin: number;         // zone data
  branchMax: number;         // zone data
}

const DX = [0, 0, -1, 1];
const DY = [-1, 1, 0, 0];
const OPP = [1, 0, 3, 2];

function makeGrid(w: number, h: number): Cell[][] {
  const g: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < w; x++) {
      row.push({ kind: "empty", doorLevel: 0, links: [null, null, null, null], x, y });
    }
    g.push(row);
  }
  return g;
}

function linkCount(c: Cell): number {
  return c.links.filter((l) => l !== null).length;
}

function isStraight(c: Cell): boolean {
  const ns = c.links[0] !== null && c.links[1] !== null && c.links[2] === null && c.links[3] === null;
  const we = c.links[0] === null && c.links[1] === null && c.links[2] !== null && c.links[3] !== null;
  return ns || we;
}

// One step from `from` in direction d. Returns the cell to move to, or `from` if the step is refused.
function walkStep(g: Cell[][], from: Cell, d: number, isMain: boolean, rnd: () => number): Cell {
  const nx = from.x + DX[d];
  const ny = from.y + DY[d];
  if (ny < 0 || ny >= g.length || nx < 0 || nx >= g[0].length) return from;
  const next = g[ny][nx];
  if (next.kind === "start" || next.kind === "end" || next.kind === "door") return from;
  if (isMain && next.kind !== "empty") return from;    // main path never overlaps
  const n = linkCount(next);
  // A branch may join an existing cell: it succeeds with chance 1/n when n links exist, and only on the same door level.
  if (n > 0 && (next.doorLevel !== from.doorLevel || Math.floor(rnd() * n) > 0)) return from;
  return next;
}

interface PathResult { length: number; doors: number; roots: Cell[]; }

function walkPath(g: Cell[][], start: Cell, steps: number, isMain: boolean, rules: Rules, rnd: () => number): PathResult {
  let cur = start;
  let length = 1;
  let doors = 0;
  let doorChance = 0;
  let doorDist = 0;
  let branchChance = 50;
  let branchCount = 0;
  const roots: Cell[] = [];
  const doorMinDist = rules.doorSpacingMin > 0
    ? Math.max(2, rules.doorSpacingMin)
    : rules.doorsMax > 0 ? Math.max(2, Math.floor(steps / rules.doorsMax)) : 0;

  for (let s = steps; s >= 0; s--) {
    const prev = cur;
    // Random link, then rotate to a free one (at most four tries).
    let d = Math.floor(rnd() * 4);
    const rot = rnd() < 0.5 ? 1 : -1;
    for (let k = 0; k < 4 && prev.links[d] !== null; k++) d = (d + rot + 4) % 4;

    const next = walkStep(g, prev, d, isMain, rnd);
    if (next !== prev) {
      prev.links[d] = next;
      next.links[OPP[d]] = prev;
      next.kind = "normal";
      cur = next;
      doorDist++;
      length++;

      if (isMain) {
        // A door may replace the cell just left, if that cell is a straight run and the ramp chance hits.
        if (prev.kind !== "start" && isStraight(prev) && doors < rules.doorsMax && Math.floor(rnd() * 100) < doorChance) {
          prev.kind = "door";
          prev.doorLevel++;
          next.doorLevel++;
          doorChance = 0;
          doors++;
          doorDist = 0;
          branchCount = 0;
        }
        if (doorDist > doorMinDist) {
          doorChance = doors === 0 ? 100 : doorChance + 5;   // ramp: first door forced once past the minimum distance
        }
        if (cur.kind === "normal" && branchCount < rules.branchesPerLevelMax && Math.floor(rnd() * 100) < branchChance) {
          roots.push(cur);
          branchChance = 50;
          branchCount++;
        }
        branchChance += 5;   // ramp: after about ten steps without a branch the chance is 100
      }
      next.doorLevel = prev.doorLevel;
    }
  }
  if (isMain) cur.kind = "end";
  return { length, doors, roots };
}

export function generate(w: number, h: number, rules: Rules, rnd: () => number): { grid: Cell[][]; mainLength: number; doors: number } {
  const minLen = Math.max(3, rules.mainMin);
  const maxLen = Math.max(minLen, rules.mainMax);
  const desired = minLen + Math.floor(rnd() * (maxLen - minLen + 1));   // drawn once, as the donor does

  let grid = makeGrid(w, h);
  let main: PathResult = { length: 0, doors: 0, roots: [] };
  for (let attempt = 0; attempt < rules.mainAttemptsMax; attempt++) {
    grid = makeGrid(w, h);
    const start = grid[Math.floor(rnd() * h)][Math.floor(rnd() * w)];
    start.kind = "start";
    main = walkPath(grid, start, desired, true, rules, rnd);
    const lengthOk = main.length >= minLen && main.length <= maxLen;
    const doorsOk = main.doors > 0 || rules.doorsMax === 0;
    if (lengthOk && doorsOk) break;
  }

  for (const root of main.roots) {
    // Intended range. The donor draws only branch_min here (Map.cpp 1340).
    const len = rules.branchMin + Math.floor(rnd() * (rules.branchMax - rules.branchMin + 1));
    walkPath(grid, root, len, false, rules, rnd);
  }

  // One key per door, on a normal cell of the door level before that door.
  for (let i = 0; i < main.doors; i++) {
    const pool: Cell[] = [];
    for (const row of grid) {
      for (const c of row) {
        if (c.kind === "normal" && c.doorLevel === i) pool.push(c);
      }
    }
    if (pool.length === 0) continue;
    pool[Math.floor(rnd() * pool.length)].kind = "key";
  }

  return { grid, mainLength: main.length, doors: main.doors };
}
export {};
