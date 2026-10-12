// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type NorthAxis = 0 | 3;

interface Pt { x: number; y: number; }

// Per-area calibration: two map points and the same two places in world units, plus the north layout.
interface MinimapCalib {
  northAxis: NorthAxis;
  mapPt1: Pt; mapPt2: Pt;
  worldPt1: Pt; worldPt2: Pt;
}

// Tunable view constants. Donor values in comments; these are data fields, not hard-coded.
interface MinimapView {
  mapScaleX: number;  // 435 in donor
  mapScaleY: number;  // 256 in donor
  centre: number;     // 60 in donor
}

// Linear fit through the two pairs along one axis.
// Returns null for a zero world span, instead of dividing by zero.
function lane(v: number, w1: number, w2: number, m1: number, m2: number): number | null {
  const span = w1 - w2;
  if (Math.abs(span) < 1e-9) return null;
  return (v - w1) * ((m1 - m2) / span) + m1;
}

// World point to normalised map point. North 3 swaps the axes: world Y drives map X, world X drives map Y.
function worldToMap(c: MinimapCalib, x: number, y: number): Pt | null {
  const swap = c.northAxis === 3;
  const relX = swap
    ? lane(y, c.worldPt1.y, c.worldPt2.y, c.mapPt1.x, c.mapPt2.x)
    : lane(x, c.worldPt1.x, c.worldPt2.x, c.mapPt1.x, c.mapPt2.x);
  const relY = swap
    ? lane(x, c.worldPt1.x, c.worldPt2.x, c.mapPt1.y, c.mapPt2.y)
    : lane(y, c.worldPt1.y, c.worldPt2.y, c.mapPt1.y, c.mapPt2.y);
  if (relX === null || relY === null) return null;
  return { x: relX, y: relY };
}

// Offset that puts the party's map point at the centre of the minimap view (donor translate form).
function minimapOffset(p: Pt, v: MinimapView): Pt {
  return {
    x: v.centre - p.x * v.mapScaleX,
    y: v.centre + (p.y - 1) * v.mapScaleY,
  };
}

// Arrow angle in degrees: the camera yaw, minus 90 on the north-3 layout.
function arrowAngle(northAxis: NorthAxis, yawDeg: number): number {
  return northAxis === 3 ? yawDeg - 90 : yawDeg;
}

export {};
