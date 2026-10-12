// Health orb fill and tap-to-pin tooltip (client HUD only).
// The server never reads any of this; hp comes from the snapshot.
export const ORB_HEIGHT_PX = 80; // donor globeHeight = 80
export const ORB_WIDTH_PX = 80;  // donor globeWidth = 80

export interface OrbState {
  value: number; // live hp (read every frame)
  max: number;   // live max hp
  pinned: boolean;
}

export interface FillRect { x: number; y: number; w: number; h: number; }

// Fill is anchored to the bottom: the visible band is the last h rows.
// Fixes vs donor: ratio is clamped to [0, 1]; max <= 0 gives an empty orb;
// a positive hp always shows at least one row (donor uses int() = floor).
export function orbFillRect(value: number, max: number): FillRect {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const h = ratio > 0 ? Math.ceil(ratio * ORB_HEIGHT_PX) : 0;
  return { x: 0, y: ORB_HEIGHT_PX - h, w: ORB_WIDTH_PX, h };
}

// Hover shows the tooltip unless it is pinned.
export function onHoverStart(s: OrbState, show: (v: boolean) => void): void {
  if (!s.pinned) show(true);
}

// Hover end hides the tooltip unless it is pinned.
export function onHoverEnd(s: OrbState, show: (v: boolean) => void): void {
  if (!s.pinned) show(false);
}

// Tap or click toggles the pin. Touch has no hover, so the tap is the only way to read the number.
export function onActivate(s: OrbState, show: (v: boolean) => void): void {
  s.pinned = !s.pinned;
  show(s.pinned);
}

// Text is re-built every frame from the live values, as the donor does in Advance.
export function advance(s: OrbState, label: (value: number, max: number) => string, setText: (t: string) => void): void {
  setText(label(s.value, s.max));
}

export {};
