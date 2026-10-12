// Licence: GPL-3.0-or-later (donor; Cargo.toml line 34 and LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const CHUNK = 32;                 // blocks per chunk side (donor RECT_SIZE, 1 << 5)
const SKY: [number, number, number, number] = [0, 0, 0, 255];

type Rgba = [number, number, number, number];
interface Cell { colour: Rgba; solid: boolean }

// One chunk column: an overhead cell per z-slice (index 0 = zlo), plus the blocks just above and below the chunk.
interface Column {
  zlo: number;
  layers: Cell[][];               // layers[z - zlo][y * CHUNK + x]
  above: { colour: Rgba; solid: boolean };
  below: { colour: Rgba; solid: boolean };
}

// Ceiling above the player in one column: first solid cell at or above the player's z.
// Returns the dz offset; 1 if the top of the chunk is solid (roof goes on); Infinity for open sky.
function ceilingOffset(col: Column, x: number, y: number, playerZ: number): number {
  for (let dz = 0; dz < col.layers.length; dz++) {
    const cell = col.layers[playerZ - col.zlo + dz]?.[y * CHUNK + x];
    if (cell?.solid) return dz;
  }
  return col.above.solid ? 1 : Infinity;
}

// Colour of one minimap pixel: the overhead slice at the ceiling height, black when the ceiling is below this chunk.
function pixelFor(col: Column, x: number, y: number, playerZ: number, ceiling: number): Rgba {
  if (playerZ + ceiling < col.zlo) return SKY;   // keeps cave and dungeon interiors from showing the forest above
  const idx = Math.min(playerZ - col.zlo + ceiling, col.layers.length - 1);
  const cell = col.layers[idx]?.[y * CHUNK + x];
  if (cell) return cell.colour;
  return playerZ > col.zlo ? col.above.colour : col.below.colour;
}

// Place a world point on the square frame. Quest markers pin to the edge; others hide when off-frame.
function placeMarker(rel: { x: number; y: number }, frame: number, pinToEdge: boolean): { x: number; y: number } | null {
  const half = frame / 2;
  if (Math.abs(rel.x) <= half && Math.abs(rel.y) <= half) return rel;
  if (!pinToEdge) return null;
  const m = Math.max(Math.abs(rel.x), Math.abs(rel.y));
  return { x: (rel.x / m) * half, y: (rel.y / m) * half };
}

// Chunk streaming with hysteresis: load inside R chunks, keep until R + 1.
function shouldLoad(delta: number, R: number): boolean { return delta < R; }
function shouldKeep(delta: number, R: number): boolean { return delta < R + 1; }

// Recomposite only when the player's chunk, z or ceiling changed, or when new chunks arrived.
function shouldRecomposite(
  last: { cx: number; cy: number; z: number; ceil: number },
  now: { cx: number; cy: number; z: number; ceil: number },
  newChunks: boolean,
): boolean {
  return last.cx !== now.cx || last.cy !== now.cy || last.z !== now.z || last.ceil !== now.ceil || newChunks;
}

// Zoom in or out by a factor of 2, clamped to [1, maxZoom].
function zoomStep(zoom: number, direction: 'in' | 'out', maxZoom: number, factor = 2): number {
  return direction === 'in' ? Math.min(zoom * factor, maxZoom) : Math.max(zoom / factor, 1);
}

// Group member arrow by height difference, in blocks.
function memberArrow(dz: number): 'up' | 'down' | 'level' {
  if (dz >= 10) return 'up';
  if (dz <= -10) return 'down';
  return 'level';
}

export {};
