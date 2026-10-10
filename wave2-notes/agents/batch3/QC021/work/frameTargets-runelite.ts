// Licence: BSD 2-Clause (donor LICENSE, "BSD 2-Clause License"). Clean-room sketch of the projection steps, not a line translation.
const ANGLE_FULL = 16384;  // donor: camera yaw and pitch use 14-bit tables (16384 units per turn)
const NEAR_Z = 50;         // donor: points with depth z1 below 50 get no screen point

const toRad = (a: number): number => (a * 2 * Math.PI) / ANGLE_FULL;

interface View { x: number; y: number; z: number; yaw: number; pitch: number; scale: number; viewW: number; viewH: number; }
interface Pt { x: number; y: number; z: number; }
interface Screen { x: number; y: number; }

// World point to screen point, or null when the point is at or behind the near plane (donor: z1 >= 50 test).
function project(v: View, p: Pt): Screen | null {
  const dx = p.x - v.x;
  const dy = p.y - v.y;
  const dz = p.z - v.z;
  const cy = Math.cos(toRad(v.yaw));
  const sy = Math.sin(toRad(v.yaw));
  const cp = Math.cos(toRad(v.pitch));
  const sp = Math.sin(toRad(v.pitch));
  const x1 = dx * cy + dy * sy;   // yaw
  const y1 = dy * cy - dx * sy;   // yaw
  const y2 = dz * cp - y1 * sp;   // pitch
  const z1 = y1 * cp + dz * sp;   // pitch: depth
  if (z1 < NEAR_Z) return null;
  return { x: v.viewW / 2 + (x1 * v.scale) / z1, y: v.viewH / 2 + (y2 * v.scale) / z1 };
}

interface Box { minX: number; minY: number; maxX: number; maxY: number; dropped: number; }

// ADDED (not in donor): screen box of the targets that are in front of the camera; counts the ones dropped.
function frameBox(v: View, targets: Pt[]): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, dropped = 0;
  for (const t of targets) {
    const s = project(v, t);
    if (s === null) { dropped++; continue; }
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, dropped };
}

// ADDED: factor to multiply the camera scale by so the box fits inside `safe` (0..1) of the view.
// Screen offsets from the view centre are linear in scale, so the half-extents scale by the same factor.
function fitFactor(box: Box, v: View, safe: number): number {
  const cx = v.viewW / 2;
  const cy = v.viewH / 2;
  const halfW = Math.max(Math.abs(box.minX - cx), Math.abs(box.maxX - cx));
  const halfH = Math.max(Math.abs(box.minY - cy), Math.abs(box.maxY - cy));
  const fx = halfW > 0 ? (safe * cx) / halfW : Infinity;
  const fy = halfH > 0 ? (safe * cy) / halfH : Infinity;
  return Math.min(fx, fy);
}

export {};
