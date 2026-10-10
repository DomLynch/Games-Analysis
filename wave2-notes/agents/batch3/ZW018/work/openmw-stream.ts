// Licence: GPL-3.0 (donor LICENSE, Version 3). Clean-room sketch of the mechanism, not a translation.
interface V3 { x: number; y: number; z: number }
interface Bounds { x0: number; y0: number; x1: number; y1: number }
interface Anchor { pos: V3; bounds: Bounds }
interface Centre { cx: number; cy: number }

const MERGE_DISTANCE = 128; // anchors closer than this (with equal bounds) count as one
const LOAD_THRESHOLD = 1024; // hysteresis added to half a cell before the grid recentres
const GRID_HALF = 1; // cells on each side of the centre cell

const len3 = (v: V3): number => Math.hypot(v.x, v.y, v.z);
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cellOf = (v: number, cellSize: number): number => Math.floor(v / cellSize);

// Centre cell -> preload bounds (half-open upper edge, like the donor's gridCenterToBounds).
export function gridBounds(c: Centre, half: number = GRID_HALF): Bounds {
  return { x0: c.cx - half, y0: c.cy - half, x1: c.cx + half + 1, y1: c.cy + half + 1 };
}

// Keep the current centre while the player stays within half a cell plus LOAD_THRESHOLD
// (Chebyshev, in x and y) of that centre's world position; otherwise recentre on the player's cell.
export function recentreGrid(player: V3, current: Centre, currentCentreWorld: { x: number; y: number }, cellSize: number): Centre {
  const dist = Math.max(Math.abs(currentCentreWorld.x - player.x), Math.abs(currentCentreWorld.y - player.y));
  if (dist <= Math.floor(cellSize / 2) + LOAD_THRESHOLD) return current;
  return { cx: cellOf(player.x, cellSize), cy: cellOf(player.y, cellSize) };
}

// Where the player will be, from last frame's movement, PREDICTION_TIME seconds ahead.
export function predictedPos(player: V3, last: V3, dt: number, predictionTime: number): V3 {
  if (dt <= 1e-6) return player;
  const moved = sub(player, last);
  const k = predictionTime / dt;
  return { x: player.x + moved.x * k, y: player.y + moved.y * k, z: player.z + moved.z * k };
}

// Preload targets: the primary position always; a detached (static) camera adds one anchor, snapped
// to a MERGE_DISTANCE lattice so a small orbit keeps the same anchor. Only when the camera is between
// MERGE_DISTANCE and one cell away from the player.
export function preloadAnchors(primary: V3, player: V3, camera: V3, cameraDetached: boolean, cellSize: number, bounds: Bounds): Anchor[] {
  const out: Anchor[] = [{ pos: primary, bounds }];
  if (!cameraDetached) return out;
  const d = len3(sub(camera, player));
  if (d >= MERGE_DISTANCE && d < cellSize) {
    const q = MERGE_DISTANCE;
    const snapped: V3 = {
      x: Math.floor(camera.x / q) * q,
      y: Math.floor(camera.y / q) * q,
      z: Math.floor(camera.z / q) * q,
    };
    out.push({ pos: snapped, bounds });
  }
  return out;
}

// Two anchors are the same preload when they are within MERGE_DISTANCE and cover the same cells.
export function sameAnchor(a: Anchor, b: Anchor): boolean {
  const d = sub(a.pos, b.pos);
  const sq = d.x * d.x + d.y * d.y + d.z * d.z;
  const same = a.bounds.x0 === b.bounds.x0 && a.bounds.y0 === b.bounds.y0 && a.bounds.x1 === b.bounds.x1 && a.bounds.y1 === b.bounds.y1;
  return sq < MERGE_DISTANCE * MERGE_DISTANCE && same;
}
