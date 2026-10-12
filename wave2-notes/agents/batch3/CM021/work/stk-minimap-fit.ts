// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bounds { minX: number; minZ: number; maxX: number; maxZ: number; }
interface MapFit { scale: number; originX: number; originZ: number; }
interface Pt { x: number; z: number; }

// Fit the longer side of the bounds to the square map, centre the shorter side.
// The margin is a fraction of the box size, so it is the same for every zone.
function fitSquareMap(b: Bounds, mapPx: number, marginFrac: number): MapFit {
  const dx = b.maxX - b.minX;
  const dz = b.maxZ - b.minZ;
  const span = Math.max(dx, dz);
  if (span <= 0) throw new Error("degenerate bounds");
  const pad = span * marginFrac;
  const range = span + 2 * pad;
  return {
    scale: mapPx / range,
    originX: b.minX - (range - dx) / 2 - pad,
    originZ: b.minZ - (range - dz) / 2 - pad,
  };
}

// World point to map pixels. y is measured up from the bottom edge; the HUD flips it.
function toMap(p: Pt, f: MapFit): { x: number; y: number } {
  return { x: (p.x - f.originX) * f.scale, y: (p.z - f.originZ) * f.scale };
}

interface Landmark { home: Pt; current: Pt; away: boolean; }

// The home marker is ghosted (alpha 0.5) only while the object is away; the current marker is solid.
function landmarkMarks(l: Landmark): { at: Pt; alpha: number }[] {
  const marks: { at: Pt; alpha: number }[] = [];
  if (l.away) marks.push({ at: l.home, alpha: 0.5 });
  marks.push({ at: l.current, alpha: 1 });
  return marks;
}

const fit = fitSquareMap({ minX: -400, minZ: 0, maxX: 400, maxZ: 100 }, 256, 0.05);
console.log(toMap({ x: 400, z: 100 }, fit), landmarkMarks({ home: { x: 0, z: 0 }, current: { x: 10, z: 0 }, away: true }).length);
