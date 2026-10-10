// Licence: GPL v2 or later (donor, Dungeon Crawl Stone Soup). Clean-room sketch of the shape only; not a translation.
interface Pos { x: number; z: number; }
interface Cell { kind: "floor" | "wall"; occupant?: string; }

const W = 80;                 // map width (donor GXM)
const H = 70;                 // map height (donor GYM)
const CENTRE: Pos = { x: 40, z: 35 };
const HALF_WINDOW = 10;       // kept square is 21 x 21 around the player (donor: LOS radius 8 + 2)
const SHIFT_DISTANCE = 22;    // Chebyshev distance from centre that triggers a shift

// The world is a pure function of world coordinates, so a regenerated cell matches what was there before.
function worldCell(wx: number, wz: number, seed: number): Cell {
  let h = Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return { kind: (h & 1) === 1 ? "floor" : "wall" };
}

// Chebyshev distance from the centre; a shift only fires past the trigger distance.
function needsShift(player: Pos): boolean {
  return Math.max(Math.abs(player.x - CENTRE.x), Math.abs(player.z - CENTRE.z)) > SHIFT_DISTANCE;
}

// Re-anchor the window: keep the block around the player, move it so the player lands on the centre,
// wipe everything else, then regenerate the vacated cells from world coordinates.
function shift(
  cells: Map<string, Cell>,   // local grid, keyed "x,z"
  origin: Pos,                // world coordinate of local (0,0)
  player: Pos,
  seed: number,
  depth: number,
  rnd: () => number,
): { origin: Pos; player: Pos; cells: Map<string, Cell>; lost: string[]; topUp: number } {
  const dx = player.x - CENTRE.x;
  const dz = player.z - CENTRE.z;
  const next = new Map<string, Cell>();
  const lost: string[] = [];

  for (const [key, cell] of cells) {
    const [x, z] = key.split(",").map(Number);
    const inWindow = Math.abs(x - player.x) <= HALF_WINDOW && Math.abs(z - player.z) <= HALF_WINDOW;
    if (inWindow) {
      next.set(`${x - dx},${z - dz}`, cell);
    } else if (cell.occupant !== undefined) {
      lost.push(cell.occupant); // donor destroys these; the sketch returns them so the caller can ledger them
    }
  }

  const newOrigin: Pos = { x: origin.x + dx, z: origin.z + dz };
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < H; z++) {
      const key = `${x},${z}`;
      if (!next.has(key)) next.set(key, worldCell(x + newOrigin.x, z + newOrigin.z, seed));
    }
  }

  const topUp = 15 + depth * (1 + Math.floor(rnd() * 2)); // donor: 15 + depth * (1 + coinflip())
  return { origin: newOrigin, player: { x: CENTRE.x, z: CENTRE.z }, cells: next, lost, topUp };
}

export {};
