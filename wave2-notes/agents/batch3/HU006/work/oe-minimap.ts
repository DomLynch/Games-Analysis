// Radar minimap rules (client HUD only). Pure functions: no draw calls, no engine state.
// Units: world units (65536 per map side, party at the centre), zoom = screen px per 65536 world units.

export interface Vec2 { x: number; y: number; }
export interface Size { w: number; h: number; }

// Donor: Rect.center() = {x + w/2, y + h/2}; the minimap rect is 137 x 117 at (488, 16).
export function rectCentre(x: number, y: number, w: number, h: number): Vec2 {
  return { x: x + Math.trunc(w / 2), y: y + Math.trunc(h / 2) };
}

// Donor: pPoint = centre + delta * zoom / 65536 (float, then truncated to int). Screen y is flipped.
export function worldToMinimapPx(dx: number, dy: number, zoom: number, centre: Vec2): Vec2 {
  return {
    x: Math.trunc(centre.x + (dx * zoom) / 65536),
    y: Math.trunc(centre.y - (dy * zoom) / 65536),
  };
}

// Outdoor terrain crop: the image is imgW px square and covers 65536 world units; the party is at its centre.
// Nearest-neighbour sampling; one screen px steps imgW / zoom image px (donor: 16.16 fixed point).
export function outdoorSourcePixel(partyX: number, partyY: number, dstX: number, dstY: number,
                                   rect: Size, zoom: number, imgW: number): Vec2 {
  const step = imgW / zoom;
  const partyPx = { x: ((partyX + 32768) / 65536) * imgW, y: ((32768 - partyY) / 65536) * imgW };
  return {
    x: Math.floor(partyPx.x - (rect.w / 2) * step + dstX * step),
    y: Math.floor(partyPx.y - (rect.h / 2) * step + dstY * step),
  };
}

// Marker size grows with zoom. Donor: actors 5 px cross above zoom 1024, else 2 px; objects and decorations above 512.
export function actorMarkerPx(zoom: number): number { return zoom > 1024 ? 5 : 2; }
export function objectMarkerPx(zoom: number): number { return zoom > 512 ? 5 : 2; }

export interface ActorFlags { removed: boolean; disabled: boolean; dead: boolean; nearby: boolean; }

// Donor: actors are drawn only while the wizard-eye reveal is on, and only if not removed/disabled
// and (dead or nearby). The nearby flag is set by the AI loop (see Checked line; not a radius here).
export function showActorBlip(eyeOn: boolean, a: ActorFlags): boolean {
  if (!eyeOn) return false;
  if (a.removed || a.disabled) return false;
  return a.dead || a.nearby;
}

// Donor: objects need the reveal AND a mastery level at or above EXPERT; the caller passes the numeric threshold.
export function showObjectBlip(eyeOn: boolean, mastery: number, expertLevel: number): boolean {
  return eyeOn && mastery >= expertLevel;
}

// Arrow sector, 8 sprites over 2048 yaw units (donor TrigLut mask 2047). Boundaries as the donor draws them:
// sector 0 = [128, 384], 1 = [385, 639], ..., 6 = [1664, 1920], 7 = wrap (< 128 or > 1920).
const SECTOR_UPPER = [384, 639, 896, 1151, 1408, 1663, 1920];
export function arrowSector(yaw: number): number {
  const r = yaw & 2047;
  if (r < 128 || r > 1920) return 7;
  for (let k = 0; k < SECTOR_UPPER.length; k++) {
    if (r <= SECTOR_UPPER[k]) return k;
  }
  return 7; // not reached for r in [0, 2047]
}

// Compass strip: 240 px per full turn (0.1171875 = 240 / 2048), offset 285, drawn through a 26 px clip.
export function compassX(yaw: number): number {
  return Math.floor(yaw * 0.1171875 + 0.5) + 285;
}

export {};
