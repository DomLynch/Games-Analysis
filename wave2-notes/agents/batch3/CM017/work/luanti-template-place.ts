// Licence: clean-room. Written from the described mechanism of an LGPL-2.1-or-later donor (node-by-node template
// placement with a per-node chance, a per-layer chance, a force bit and quarter-turn rotation), not a translation.
export const ALWAYS = 127;   // full chance; 0 = never
export const AIR = 0;
export const LEAVE = -1;     // template cell that means "keep what is there"
export type Roll = (lo: number, hi: number) => number;   // inclusive on both ends

export interface Cell { kind: number; chance: number; force: boolean; facing: number; }
export interface Template {
  sx: number; sy: number; sz: number;   // size in cells
  cells: Cell[];                        // index = (y * sz + z) * sx + x
  layerChance: number[];                // one chance per y layer
}
export interface Voxels {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  get(x: number, y: number, z: number): number;
  set(x: number, y: number, z: number, kind: number, facing: number): void;
}

// chance c passes with probability c / ALWAYS (a roll of 1..ALWAYS must be <= c)
function passes(chance: number, roll: Roll): boolean {
  if (chance >= ALWAYS) return true;
  if (chance <= 0) return false;
  return roll(1, ALWAYS) <= chance;
}

// quarter turn about +Y: returns the turned template coordinates of cell (x, z)
function turned(x: number, z: number, sx: number, sz: number, rot: number): { x: number; z: number } {
  switch (rot & 3) {
    case 1: return { x: z, z: sx - 1 - x };
    case 2: return { x: sx - 1 - x, z: sz - 1 - z };
    case 3: return { x: sz - 1 - z, z: x };
    default: return { x, z };
  }
}

// simplified: keeps the donor order (layer roll, then each node: never, leave-as-is, occupied, node roll, write, turn
// its facing). Two fixes: (1) the world y advances on EVERY layer, placed or skipped; the donor's skipped layer does
// not advance its world-y counter, so higher layers land one level low and the top layers are lost. (2) passes()
// places with chance/127; the donor's `<=` test places with (chance-1)/127, so chance 1 never places. Omitted: the
// index-stride maths (replaced by turned()), the CONTENT_IGNORE check (LEAVE is used instead), the centre flags,
// the Lua and serialised forms, and the decoration spawn-by and place-on tests.
export function placeTemplate(
  vox: Voxels,
  origin: { x: number; y: number; z: number },
  t: Template,
  rot: number,
  force: boolean,
  roll: Roll,
): boolean {
  const w = (rot & 1) === 1 ? t.sz : t.sx;
  const d = (rot & 1) === 1 ? t.sx : t.sz;
  const fits =
    origin.x >= vox.minX && origin.x + w - 1 <= vox.maxX &&
    origin.y >= vox.minY && origin.y + t.sy - 1 <= vox.maxY &&
    origin.z >= vox.minZ && origin.z + d - 1 <= vox.maxZ;

  for (let y = 0; y < t.sy; y++) {
    const worldY = origin.y + y;                       // FIX: advanced for every layer
    if (!passes(t.layerChance[y], roll)) continue;
    for (let z = 0; z < t.sz; z++) {
      for (let x = 0; x < t.sx; x++) {
        const cell = t.cells[(y * t.sz + z) * t.sx + x];
        if (cell.kind === LEAVE || cell.chance <= 0) continue;
        const p = turned(x, z, t.sx, t.sz, rot);
        const wx = origin.x + p.x;
        const wz = origin.z + p.z;
        if (wx < vox.minX || wx > vox.maxX || wz < vox.minZ || wz > vox.maxZ) continue;
        if (worldY < vox.minY || worldY > vox.maxY) continue;
        if (!force && !cell.force && vox.get(wx, worldY, wz) !== AIR) continue;
        if (!passes(cell.chance, roll)) continue;
        vox.set(wx, worldY, wz, cell.kind, (cell.facing + rot) & 3);
      }
    }
  }
  return fits;
}

export {};
