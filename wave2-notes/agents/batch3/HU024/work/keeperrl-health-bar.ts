// clean-room: written from the described mechanism (hide-at-full overhead bar, two-clamp
// colour ramp, proportional fill, capture bar reusing the same bar, body-part health fallback).
// Donor licence GPL-2.0-or-later; no line is translated.

interface Rgb { r: number; g: number; b: number; }
interface Rect { x0: number; y0: number; x1: number; y1: number; }
interface Tile { x: number; y: number; w: number; h: number; }

// Layout as ratios of the tile (donor values, kept as data).
const LAYOUT = {
  left: 0.1,       // track starts at 10% of tile width (donor: (1 - barLength) / 2)
  length: 0.8,     // track width as a share of tile width (donor: barLength)
  raise: 0.2,      // bar sits 20% of tile height above the tile (donor: size.y * 0.2)
  thickness: 0.12, // bar thickness as a share of tile height (donor: barWidth)
};

// Two linear clamps: red at 0, yellow at 0.5, green at 1. Spirit damage swaps green and blue.
export function healthColour(health: number, spirit: boolean): Rgb {
  const h = Math.min(1, Math.max(0, health));
  const red = Math.min(1, 2 - h * 2);
  const green = Math.min(1, h * 2);
  let rgb: Rgb = { r: Math.round(255 * red), g: Math.round(255 * green), b: 0 };
  if (spirit) rgb = { r: rgb.r, g: Math.min(255, rgb.b + 100), b: rgb.g };
  return rgb;
}

// Hide-at-full: the bar is drawn when it carries damage; a capture bar is always drawn.
export function barVisible(health: number, hasBarFlag: boolean, capture: boolean): boolean {
  if (capture) return true;
  if (!hasBarFlag) return false;
  return health !== 1;
}

// Track and fill. fix: the fill ends at left + length x health. The donor ends it at
// 0.9 x health from the tile edge, which is short below full and inverted below about 0.11.
export function barRects(tile: Tile, health: number): { track: Rect; fill: Rect | null } {
  const left = tile.x + tile.w * LAYOUT.left;
  const right = left + tile.w * LAYOUT.length;
  const top = tile.y - tile.h * LAYOUT.raise;
  const bottom = top + tile.h * LAYOUT.thickness;
  const track: Rect = { x0: left, y0: top, x1: right, y1: bottom };
  const h = Math.min(1, Math.max(0, health));
  const fill: Rect | null = h > 0
    ? { x0: left, y0: top, x1: left + tile.w * LAYOUT.length * h, y1: bottom }
    : null;
  return { track, fill };
}

interface PartState { injured: number; lost: number; present: number; }

// Health from body parts when the body has no health pool. Both sides are capped at 20 (donor).
export function bodyPartHealth(parts: PartState[], cap: number = 20): number {
  let gone = 0;
  let total = 0;
  for (const p of parts) {
    gone += p.injured + p.lost;
    total += p.present + p.lost;
  }
  const denom = Math.min(cap, total);
  if (denom === 0) return 1;                // fix: donor divides 0 / 0 when there are no parts (policy: healthy)
  return 1 - Math.min(cap, gone) / denom;
}

export {};
