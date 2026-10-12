// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICKS_PER_SEC = 1000;                  // donor lib/gamelib/gtime.h: GAME_TICKS_PER_SEC
const HIT_FLASH_TICKS = 2 * TICKS_PER_SEC;   // donor src/radar.cpp: HIT_NOTIFICATION
const BLINK_PERIOD_TICKS = TICKS_PER_SEC;    // donor src/radar.cpp: BLINK_INTERVAL
const DIM_ALPHA = 0.5;                       // donor src/radar.cpp: OVERLAY_OPACITY
const RADAR_BOX_PX = 128;                    // donor src/display3ddef.h: RADWIDTH
const MAX_VIEW_DISTANCE = 5000;              // donor src/display.h: MAXDISTANCE

export interface Blip {
  tileX: number;
  tileY: number;
  relation: 'me' | 'ally' | 'enemy';
  visibleToMe: boolean;   // in view, or shared vision from an ally
  selected: boolean;
  lastHitTick: number;    // game tick of the last hit on this unit
}

export interface DotLook {
  drawn: boolean;
  flashing: boolean;      // own unit hit recently: draw the flash colour
  alpha: number;          // 1 = full, DIM_ALPHA = dimmed
}

// Dim for the first half of each period, full for the second half. A pure function of the game tick.
export function blinkDim(nowTick: number): boolean {
  return (nowTick % BLINK_PERIOD_TICKS) < BLINK_PERIOD_TICKS / 2;
}

export function dotLook(b: Blip, nowTick: number): DotLook {
  if (!b.visibleToMe) return { drawn: false, flashing: false, alpha: 0 };
  const flashing =
    b.relation === 'me' && nowTick > HIT_FLASH_TICKS && nowTick - b.lastHitTick < HIT_FLASH_TICKS;
  const dim = b.selected && blinkDim(nowTick);
  return { drawn: true, flashing, alpha: dim ? DIM_ALPHA : 1 };
}

// Pixels per tile. The map is fitted to the box only when the minimap rotates with the player (donor resizeRadar).
export function pixelsPerTile(zoomLevel: number, rotate: boolean, mapW: number, mapH: number): number {
  const multiplier = rotate ? RADAR_BOX_PX / Math.max(mapW, mapH, 1) : 1;
  return (zoomLevel * multiplier) / 16;
}

// Pixel inside the minimap box to a tile, clamped to the scroll window (donor CalcRadarPosition, unrotated case).
export function minimapToTile(
  px: number,
  py: number,
  boxLeft: number,
  boxTop: number,
  pxPerTile: number,
  scroll: { minX: number; minY: number; maxX: number; maxY: number },
): { x: number; y: number } {
  const x = Math.trunc((px - boxLeft) / pxPerTile) + scroll.minX;
  const y = Math.trunc((py - boxTop) / pxPerTile) + scroll.minY;
  return {
    x: Math.min(Math.max(x, scroll.minX), scroll.maxX - 1),
    y: Math.min(Math.max(y, scroll.minY), scroll.maxY - 1),
  };
}

// Donor getDistanceAdjust, kept as float (donor divides integers).
export function distanceAdjust(viewDistance: number): number {
  return Math.max(MAX_VIEW_DISTANCE - viewDistance, 0) / 100;
}

// Donor getLengthAdjust: pitch term clamped to the look range (1..88 in donor display.h), then halved.
export function pitchAdjust(pitchTerm: number): number {
  const lookingFar = 1;
  const lookingDown = 88;
  const dif = Math.min(Math.max(pitchTerm - lookingFar, 0), lookingDown - lookingFar);
  return dif / 2;
}

// Camera footprint: four points, wide at the far (top) edge and narrow at the near edge, rotated by yaw.
// Donor setViewingWindow with RotateVector2D. visTilesX/Y = tiles on screen (donor visibleTiles).
export function viewWedge(
  cx: number,
  cy: number,
  visTilesX: number,
  visTilesY: number,
  distanceTerm: number,
  pitchTerm: number,
  yawRad: number,
  pxPerTile: number,
): Array<[number, number]> {
  const shortX = (visTilesX / 4 - distanceTerm / 6) * pxPerTile;
  const longX = (visTilesX / 2 - distanceTerm / 4) * pxPerTile;
  const edgeY = (visTilesY / 2 - pitchTerm / 3) * pxPerTile;
  const pts: Array<[number, number]> = [
    [longX, -edgeY],
    [-longX, -edgeY],
    [shortX, edgeY],
    [-shortX, edgeY],
  ];
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return pts.map(([x, y]): [number, number] => [x * c + y * s + cx, y * c - x * s + cy]);
}
export {};
