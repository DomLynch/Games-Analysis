// Licence: MIT (donor). Adaptable; this sketch is written fresh from the described mechanism.
const BLOCK = 64;                        // tiles per side of one memory block
const FLAG_SEEN = 1;
const FLAG_NOT_PATHABLE = 2;
const FLAG_NOT_WALKABLE = 4;

// One remembered record per tile. speed is stored in units of 10 (ceil of ground speed / 10).
interface TileRecord { flags: number; color: number; speed: number; }
const EMPTY: TileRecord = { flags: 0, color: 255, speed: 10 };

interface LiveTile { colour: number; walkable: boolean; pathable: boolean; groundSpeed: number; }

export function recordFromLive(t: LiveTile | null): TileRecord {
  if (t === null) {
    // a tile that is not there is remembered as blocked, with no colour and not seen
    return { flags: FLAG_NOT_WALKABLE | FLAG_NOT_PATHABLE, color: 255, speed: 10 };
  }
  let flags = FLAG_SEEN;
  if (!t.walkable) flags |= FLAG_NOT_WALKABLE;
  if (!t.pathable) flags |= FLAG_NOT_PATHABLE;
  const speed = Math.min(255, Math.ceil(t.groundSpeed / 10));
  return { flags, color: t.colour, speed };
}

export class MemoryBlock {
  private tiles: TileRecord[] = Array.from({ length: BLOCK * BLOCK }, () => ({ ...EMPTY }));
  dirty = true; // the picture needs a rebuild only when a colour changed

  set(x: number, y: number, r: TileRecord): void {
    const i = (y % BLOCK) * BLOCK + (x % BLOCK);
    if (this.tiles[i].color !== r.color) this.dirty = true; // flags and speed do not change the picture
    this.tiles[i] = r;
  }

  get(x: number, y: number): TileRecord {
    return this.tiles[(y % BLOCK) * BLOCK + (x % BLOCK)];
  }
}

// Path step cost from a remembered record. Ground speed (x10) times a direction weight, over 100.
export function stepCost(parentCost: number, rec: TileRecord, diagonal: boolean): number {
  const speed = rec.speed * 10;          // donor getSpeed()
  const walkFactor = diagonal ? 3 : 1;
  return parentCost + (speed * walkFactor) / 100;
}

// Zoom in or out by powers of two. zoom 0 is scale 1.
export function zoomScale(zoom: number): number {
  return zoom < 0 ? 1 / (1 << Math.abs(zoom)) : (1 << Math.abs(zoom));
}

// Blocks are drawn only when one block is at least a pixel wide.
export function blockDrawable(scale: number): boolean {
  return BLOCK * scale > 1;
}

export {};
