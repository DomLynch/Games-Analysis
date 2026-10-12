// Licence: GPL-2.0-or-later (donor; CMinimap.cpp header and license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rgb = readonly [number, number, number];
const BLACK: Rgb = [0, 0, 0];

interface TileFacts {
  visible: boolean;                 // false = under fog of war
  owner: number | 'neutral' | null; // owner of an owned blocking object on the tile
  blocked: boolean;                 // blocked and not visitable
  openRgb: Rgb;                     // terrain colour, open
  blockedRgb: Rgb;                  // terrain colour, blocked
}

// One colour per tile, in donor order: fog, then owned object, then terrain.
function tileColour(t: TileFacts, ownerRgb: (player: number) => Rgb, neutralRgb: Rgb): Rgb {
  if (!t.visible) return BLACK;
  if (t.owner === 'neutral') return neutralRgb;
  if (typeof t.owner === 'number') return ownerRgb(t.owner);
  return t.blocked ? t.blockedRgb : t.openRgb;
}

// Tile centre on the widget (the donor's tileToPixels form).
function tileToPixel(tile: number, widgetPx: number, mapTiles: number): number {
  return Math.floor((widgetPx / mapTiles) * (tile + 0.5));
}

// Click or drag back to a tile. Fix: floor, not round (see gaps).
function pixelToTile(px: number, widgetPx: number, mapTiles: number): number {
  return Math.floor((px * mapTiles) / widgetPx);
}

// Letterbox: fit the longer side, centre the shorter one.
function fitSize(mapW: number, mapH: number, boxW: number, boxH: number) {
  const resize = Math.max(mapW, mapH) / Math.max(boxW, boxH);
  const w = Math.trunc(mapW / resize);
  const h = Math.trunc(mapH / resize);
  const side = Math.max(w, h);
  return { w, h, offX: Math.trunc((side - w) / 2), offY: Math.trunc((side - h) / 2) };
}

// Viewport rectangle on the minimap (integer maths, one pixel smaller on the far edges).
function viewportRect(view: { x: number; y: number; w: number; h: number }, box: { w: number; h: number }, mapW: number, mapH: number) {
  return {
    x: Math.trunc((view.x * box.w) / mapW),
    y: Math.trunc((view.y * box.h) / mapH),
    w: Math.trunc((view.w * box.w) / mapW) - 1,
    h: Math.trunc((view.h * box.h) / mapH) - 1,
  };
}

// Cache of one colour per tile on the current level.
class MinimapCache {
  private cells: Rgb[] | null = null;
  private level = 0;
  constructor(
    private readonly mapW: number,
    private readonly mapH: number,
    private readonly colourAt: (x: number, y: number, level: number) => Rgb,
  ) {}

  rebuild(): void {                       // full pass: level change, or after the other side's turn
    const cells: Rgb[] = [];
    for (let y = 0; y < this.mapH; y++)
      for (let x = 0; x < this.mapW; x++) cells.push(this.colourAt(x, y, this.level));
    this.cells = cells;
  }

  setLevel(level: number): void {
    if (level === this.level && this.cells) return;
    this.level = level;
    this.rebuild();
  }

  patch(changed: Array<{ x: number; y: number; level: number }>): void {
    if (!this.cells) return;              // dropped during the other side's turn; rebuilt when it ends
    for (const t of changed) {
      if (t.level !== this.level) continue;
      this.cells[t.y * this.mapW + t.x] = this.colourAt(t.x, t.y, this.level);
    }
  }

  dropForOtherTurn(): void { this.cells = null; }
  endOtherTurn(): void { this.rebuild(); }

  pixel(x: number, y: number): Rgb | null { return this.cells ? this.cells[y * this.mapW + x] : null; }
}
export {};
