// Licence: BSD-2-Clause (donor, permissive). Written from the described mechanism, not a line-by-line translation.
// clean-room
type Kind = 'land' | 'mobile' | 'static';
interface Obj { z: number; kind: Kind; roof: boolean; surface: boolean; transparent: boolean; foliage: boolean; translucent: boolean; }
type Cell = Obj[];                                   // one cell's stack, in the order the scene walks it
interface Column { cell(x: number, y: number): Cell | undefined; }   // undefined = not loaded

const NO_CAP = 127;      // donor sentinel for "no ceiling" (GameSceneDrawingSorting.cs:74-76)
const CEIL_LO = 14;      // donor pz14 = playerZ + 14 (line 87)
const CEIL_HI = 16;      // donor pz16 = playerZ + 16 (line 88)
const ROOF_LINK_Z = 6;   // donor roof link window (Map.cs:192)
const ALPHA_STEP = 25;   // donor fade step (GameSceneDrawingSorting.cs:416, 427)
const ALPHA_TICK_MS = 20;// donor ALPHA_TIME (Constants.cs:42)

// Flood fill over connected roof statics, starting from a roof at height z. Returns the lowest height found.
function nearZ(col: Column, def: number, x: number, y: number, z: number, seen: Set<string>): number {
  const key = x + ',' + y;
  if (seen.has(key)) return def;
  seen.add(key);
  const cell = col.cell(x, y);
  if (cell === undefined) return def;                 // unloaded: the fill stops here, as the donor does
  const roof = cell.find(o => o.kind === 'static' && o.roof && Math.abs(z - o.z) <= ROOF_LINK_Z);
  if (roof === undefined) return def;
  if (roof.z < def) def = roof.z;
  def = nearZ(col, def, x - 1, y, roof.z, seen);
  def = nearZ(col, def, x + 1, y, roof.z, seen);
  def = nearZ(col, def, x, y - 1, roof.z, seen);
  def = nearZ(col, def, x, y + 1, roof.z, seen);
  return def;
}

interface CutResult { drawCap: number; roofsHidden: boolean; }

// Ceiling cut for one player position. Three phases, in donor order:
// 1) the player's own cell, 2) the cell one step +x,+y (roof scan + flood fill), 3) raise to player z + 16.
function cutCeiling(col: Column, px: number, py: number, pz: number, drawRoofs: boolean): CutResult {
  const pz14 = pz + CEIL_LO;
  const pz16 = pz + CEIL_HI;
  let cap = NO_CAP;
  let roofsHidden = !drawRoofs;

  // Phase 1: own cell. A land tile at or above pz16 caps the draw and stops the scan.
  for (const o of col.cell(px, py) ?? []) {
    if (o.kind === 'land') {
      if (pz16 <= o.z) { cap = pz16; break; }
      continue;
    }
    if (o.kind === 'mobile') continue;
    if (o.z > pz14 && cap > o.z && !(o.foliage || o.transparent) && (!o.roof || o.surface)) {
      cap = o.z;
      roofsHidden = true;
    }
  }

  let ground = cap;                                   // donor: _maxGroundZ = _maxZ
  // Phase 2: the cell one step +x,+y. Only non-land, non-mobile roof tiles that are not transparent or surface count.
  const dx = px + 1;
  const dy = py + 1;
  for (const o of col.cell(dx, dy) ?? []) {
    if (o.kind !== 'static') continue;
    if (o.z > pz14 && cap > o.z && !(o.transparent || o.surface) && o.roof) {
      cap = o.z;
      ground = nearZ(col, o.z, dx, dy, o.z, new Set<string>());
      roofsHidden = true;
    }
  }

  // Phase 3: the draw cap is the ground value, but never below pz16.
  let drawCap = ground;
  if (ground < pz16) drawCap = pz16;
  return { drawCap, roofsHidden };
}

// Per-object target alpha: above the cap or a hidden roof fades to 0, translucent fades to 178, the rest to 255.
// Returns null when the object keeps its current alpha (foliage).
function targetAlpha(o: Obj, drawCap: number, roofsHidden: boolean): number | null {
  if (o.z >= drawCap) return 0;
  if (roofsHidden && o.roof) return 0;
  if (o.translucent) return 178;
  if (o.foliage) return null;
  return 255;
}

// One fade step toward the target, applied once per ALPHA_TICK_MS.
function stepAlpha(current: number, target: number): number {
  if (current > target) return Math.max(target, current - ALPHA_STEP);
  if (current < target) return Math.min(target, current + ALPHA_STEP);
  return current;
}

export {};
