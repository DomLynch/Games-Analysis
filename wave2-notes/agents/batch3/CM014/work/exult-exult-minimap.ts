// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TILES_PER_BLOCK = 16;      // donor: c_tiles_per_chunk (exult_constants.h:31)
const BLOCKS_PER_SIDE = 192;     // donor: c_num_chunks = 12 * 16 (exult_constants.h:34); zone data in Frankendom
const PALETTE_SEARCH_END = 224;  // donor: find_color default last = 0xe0 (palette.h:111)
export const WORLD_TILES = TILES_PER_BLOCK * BLOCKS_PER_SIDE;

type Rgb = [number, number, number];

// Step 1: one palette index per block type = nearest palette entry to the mean colour of its pixels.
export function bakeTypeIndex(pixels: Rgb[], palette: Rgb[]): number {
  if (pixels.length === 0) throw new Error("block type has no pixels");
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [pr, pg, pb] of pixels) { r += pr; g += pg; b += pb; }
  const n = pixels.length;
  const mr = Math.floor(r / n);
  const mg = Math.floor(g / n);
  const mb = Math.floor(b / n);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_SEARCH_END && i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const d = (mr - pr) ** 2 + (mg - pg) ** 2 + (mb - pb) ** 2;
    if (d < bestDist) { best = i; bestDist = d; }
  }
  return best;
}

// Step 2: one byte per block of one zone, from the block-type grid (flat, row-major, BLOCKS_PER_SIDE squared).
export function bakeZoneGrid(typeGrid: number[], typeIndex: number[]): Uint8Array {
  const out = new Uint8Array(BLOCKS_PER_SIDE * BLOCKS_PER_SIDE);
  for (let i = 0; i < out.length; i++) out[i] = typeIndex[typeGrid[i]];
  return out;
}

// Step 3 (fixed): one scale for paint and marker, no border offset.
// Donor: marker scaled by (w - 4) and offset by 2 px while the grid is painted at its own origin (cheat.cc:1275, 1282-1286).
export function tileToPixel(tile: number, mapPx: number): number {
  const t = ((tile % WORLD_TILES) + WORLD_TILES) % WORLD_TILES;
  return Math.floor((t * mapPx) / WORLD_TILES);
}

// Inverse for click-to-travel: pixel centre back to a wrapped tile. The server must still verify the destination.
export function pixelToTile(px: number, mapPx: number): number {
  const t = Math.floor(((px + 0.5) * WORLD_TILES) / mapPx);
  return ((t % WORLD_TILES) + WORLD_TILES) % WORLD_TILES;
}

export {};
