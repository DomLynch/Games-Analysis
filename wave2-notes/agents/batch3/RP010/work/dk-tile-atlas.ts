// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TILE_DIM = 32;
export const ATLAS_W = 2048;
export const ATLAS_H = 1024;
export const COLS = ATLAS_W / TILE_DIM; // 64 tiles per row

// Tile id -> UV rectangle, inset half a texel so filtering never samples the neighbour tile.
export function tileUV(id: number): [number, number, number, number] {
  const col = id % COLS;
  const row = Math.floor(id / COLS);
  return [
    (col * TILE_DIM + 0.5) / ATLAS_W,
    (row * TILE_DIM + 0.5) / ATLAS_H,
    ((col + 1) * TILE_DIM - 0.5) / ATLAS_W,
    ((row + 1) * TILE_DIM - 0.5) / ATLAS_H,
  ];
}

// Animated tiles are slots. Each slot points at a static source tile id; a frame change re-points slots, it copies no pixels.
export interface AnimTiles {
  readonly animStart: number;  // first animated id (544)
  readonly animEnd: number;    // first id after the animated range (1000)
  readonly frames: number;     // 8 frames per cycle
  readonly table: Int32Array;  // [slot * frames + frame] -> source id; -1 = unset
  readonly source: Int32Array; // current source id per animated slot
  appliedFrame: number;        // -1 before the first apply
}

// Returns true only when the frame changed, so the caller uploads the changed band once.
export function applyAnimFrame(a: AnimTiles, frame: number): boolean {
  if (frame === a.appliedFrame) return false;
  const slots = a.source.length;
  for (let s = 0; s < slots; s++) {
    const j = a.table[s * a.frames + frame];
    const isStatic = (j >= 0 && j < a.animStart) || j >= a.animEnd;
    if (isStatic) a.source[s] = j; // an animated or unset source leaves the slot on its last frame
  }
  a.appliedFrame = frame;
  return true;
}

// Frame index from the game turn: one step every 2 turns, cycling through `frames`.
export function animFrame(gameTurn: number, frames: number, startFrame: number): number {
  return (Math.floor(gameTurn / 2) + frames - startFrame) % frames;
}

// Rows of the atlas that hold the animated range, as whole rows (the band uploaded per change).
export function animBand(animStart: number, animEnd: number): { yOffset: number; heightPx: number } {
  const firstRow = Math.floor(animStart / COLS);
  const lastRow = Math.floor((animEnd - 1) / COLS);
  return { yOffset: firstRow * TILE_DIM, heightPx: (lastRow - firstRow + 1) * TILE_DIM };
}

export {};
