// Licence: GPL-2.0-or-later (donor headers: "either version 2 of the License, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Filter = 'visibleOnly' | 'all' | 'mines' | 'heroes' | 'towns' | 'artifacts' | 'resources';
type Owner = 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple' | 'neutral';
type Ground = 'desert' | 'snow' | 'swamp' | 'wasteland' | 'beach' | 'lava' | 'dirt' | 'grass' | 'water' | 'none';
type Paint =
  | { kind: 'owner'; owner: Owner }
  | { kind: 'grey' }
  | { kind: 'road' }
  | { kind: 'ground'; ground: Ground; shade: boolean };

type ObjKind = 'none' | 'hero' | 'mine' | 'artifact' | 'resource' | 'other';
interface TileView {
  fogged: boolean;        // the player has not seen this tile (a server-supplied known-tiles mask)
  kind: ObjKind;
  owner?: Owner;          // owner of the hero or mine on this tile
  castleOwner?: Owner;    // owner of a town or castle covering this tile
  road: boolean;
  ground: Ground;
  shade: boolean;         // mountain or tree: drawn with the ground's next shade
}

// One tile to paint, or null for black (not drawn). Same order as the donor: object first, then town, road, ground.
function paintFor(t: TileView, f: Filter): Paint | null {
  const all = f === 'all';
  const visible = all || !t.fogged;
  switch (t.kind) {
    case 'hero':
      if (visible || f === 'heroes') return t.owner === undefined ? null : { kind: 'owner', owner: t.owner };
      return null;
    case 'mine':
      if (visible || all || f === 'mines') return { kind: 'owner', owner: t.owner ?? 'neutral' };
      return null;
    case 'artifact':
      if (visible || all || f === 'artifacts') return { kind: 'grey' };
      return null;
    case 'resource':
      if (visible || all || f === 'resources') return { kind: 'grey' };
      return null;
    default:
      if (visible) {
        if (t.castleOwner !== undefined) return { kind: 'owner', owner: t.castleOwner };
        if (t.road) return { kind: 'road' };
        return { kind: 'ground', ground: t.ground, shade: t.shade };
      }
      if (all || f === 'towns') return t.castleOwner === undefined ? null : { kind: 'owner', owner: t.castleOwner };
      return null;
  }
}

// Radar scale: radar pixels per world tile. The donor supports 36 to 144 tiles on a 144 px radar (zoom 1 to 4).
function zoomFor(radarPx: number, worldTiles: number): number {
  const z = radarPx / worldTiles;
  if (z < 1 || z > 4) throw new Error('radar supports maps of 36 to 144 tiles');
  return z;
}

// Pixel span of tile x on the radar. Each tile is painted over its span, so spans never overlap or leave gaps.
function tileSpan(x: number, zoom: number): { from: number; to: number } {
  return { from: Math.floor(x * zoom), to: Math.floor((x + 1) * zoom) };
}

interface Rect { x: number; y: number; w: number; h: number; }

// Viewport cursor: the visible tiles, clipped to the world, scaled to the radar. Hidden when the whole map is in view.
function viewportCursor(view: Rect, world: { w: number; h: number }, radar: Rect): Rect | null {
  if (view.w > world.w && view.h > world.h) return null;
  const x0 = Math.max(0, view.x);
  const y0 = Math.max(0, view.y);
  const w = Math.min(view.x + view.w, world.w) - x0;
  const h = Math.min(view.y + view.h, world.h) - y0;
  return {
    x: radar.x + Math.floor((x0 * radar.w) / world.w),
    y: radar.y + Math.floor((y0 * radar.h) / world.h),
    w: Math.floor((w * radar.w) / world.w),
    h: Math.floor((h * radar.h) / world.h),
  };
}

// Click on the radar: the tile under the click, scaled from radar pixels to world tiles.
function clickToTile(px: number, py: number, radar: Rect, world: { w: number; h: number }): { x: number; y: number } {
  return {
    x: Math.floor(((px - radar.x) * world.w) / radar.w),
    y: Math.floor(((py - radar.y) * world.h) / radar.h),
  };
}

export {};
