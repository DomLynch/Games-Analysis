// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Minimap raster rebuilt in slices: each update refreshes `rowsPerUpdate` rows, then wraps.
// colourAt returns a palette index for a tile, or null for an edge tile (left untouched, as in the donor).
class MinimapRaster {
  readonly size: number;
  readonly pixels: Uint8Array;
  private row = 0;

  constructor(size: number, private readonly rowsPerUpdate = 16) {
    this.size = size;
    this.pixels = new Uint8Array(size * size);
  }

  update(colourAt: (x: number, y: number) => number | null): void {
    for (let k = 0; k < this.rowsPerUpdate; k++) {
      for (let x = 0; x < this.size; x++) {
        const c = colourAt(x, this.row);
        if (c !== null) this.pixels[this.row * this.size + x] = c;
      }
      this.row = (this.row + 1) % this.size;
    }
  }
}

// Viewport frame drawn as eight short corner arms (3 px each), the same shape as the donor's brackets.
type Seg = [number, number, number, number];
function viewportBrackets(l: number, t: number, r: number, b: number, arm = 3): Seg[] {
  return [
    [l, t, l + arm, t], [r - arm, t, r, t],
    [l, t, l, t + arm], [l, b - arm, l, b],
    [l, b, l + arm, b], [r - arm, b, r, b],
    [r, t, r, t + arm], [r, b - arm, r, b],
  ];
}

// Click on the minimap -> world position, clamped to the map (no rotation, no isometric inverse here).
function minimapClickToWorld(px: number, py: number, mapTiles: number, unit: number): { x: number; y: number } {
  const max = mapTiles * unit - 1;
  return {
    x: Math.min(Math.max(px * unit, 0), max),
    y: Math.min(Math.max(py * unit, 0), max),
  };
}

// Entity dot: flash phase flips every 4 ticks; a highlighted dot in its flash phase grows one pixel to the left.
function dotRect(px: number, py: number, tick: number, highlighted: boolean): { x: number; y: number; w: number; h: number } {
  const flashOn = Math.floor(tick / 4) % 2 === 0;
  const grow = highlighted && flashOn ? 1 : 0;
  return { x: px - grow, y: py, w: 1 + grow, h: 1 };
}

export {};
