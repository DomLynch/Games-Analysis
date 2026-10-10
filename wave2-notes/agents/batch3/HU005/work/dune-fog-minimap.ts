// Licence: GPL-2.0 (OpenDUNE COPYING, version 2). Clean-room sketch from the described mechanism; no donor line is translated.
// clean-room
const W = 64;            // map is 64 x 64 tiles, index = y * 64 + x
const VIEW_W = 15;       // the minimap viewport outline is 15 x 10 tiles
const VIEW_H = 10;

interface Cell {
  unveiled: boolean;           // fog: revealed tiles only
  terrainColour: number | null; // null: a structure tile, drawn in its house colour
  houseColour: number;         // owner colour for structure or unit tiles
  ownStructure: boolean;       // structure belonging to the viewing player
  unitColour?: number;         // a unit on the tile, if any
}

// Distance in whole tiles: longer axis plus half the shorter one (integer), as the donor's Tile_GetDistance.
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx > dy ? dx + Math.floor(dy / 2) : dy + Math.floor(dx / 2);
}

// Dirty tiles: a bit array is the truth, a capped list is the fast path. Overflowed tiles are kept in the bits.
class DirtyQueue {
  private bits = new Uint8Array(W * W);
  private list: number[] = [];

  constructor(private cap: number) {}

  mark(idx: number): void {
    this.bits[idx] = 1;
    if (this.list.length < this.cap) this.list.push(idx);
  }

  // Returns this frame's tiles to redraw. If the list was full, the next list is rebuilt from the bits,
  // so overflowed tiles are redrawn one frame later instead of being lost.
  drain(): number[] {
    const out = this.list;
    for (const idx of out) this.bits[idx] = 0;
    this.list = [];
    if (out.length === this.cap) {
      for (let i = 0; i < this.bits.length && this.list.length < this.cap; i++) {
        if (this.bits[i] === 1) this.list.push(i);
      }
    }
    return out;
  }
}

// Reveal every tile within radius of the point (the radius comes from unit or structure data).
function revealRadius(cells: Cell[], cx: number, cy: number, radius: number, dirty: DirtyQueue): void {
  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      const x = cx + i;
      const y = cy + j;
      if (x < 0 || x >= W || y < 0 || y >= W) continue;
      if (dist(cx, cy, x, y) > radius) continue;
      const idx = y * W + x;
      if (!cells[idx].unveiled) {
        cells[idx].unveiled = true;
        dirty.mark(idx);
      }
    }
  }
}

// Radar: on when the outpost exists and production covers usage. Both directions use the same test.
function radarOn(hasOutpost: boolean, powerProduction: number, powerUsage: number): boolean {
  return hasOutpost && powerProduction >= powerUsage;
}

// Colour of one minimap pixel (one tile per pixel at the smallest scale).
function minimapColour(c: Cell, radar: boolean, blankColour: number): number {
  if (c.unveiled && radar) {
    if (c.unitColour !== undefined) return c.unitColour;
    return c.terrainColour ?? c.houseColour;
  }
  if (c.ownStructure) return c.houseColour;   // own buildings are shown even when the radar is off
  return blankColour;
}

// The 15 x 10 viewport outline as tile indices (46 cells: top and bottom rows, plus the two sides between).
function viewportBorder(topLeft: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      if (x === 0 || x === VIEW_W - 1 || y === 0 || y === VIEW_H - 1) out.push(topLeft + y * W + x);
    }
  }
  return out;
}

export {};
