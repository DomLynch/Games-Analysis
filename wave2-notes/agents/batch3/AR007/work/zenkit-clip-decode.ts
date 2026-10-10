// Licence: MIT (ZenKit license.md). Re-typed from the donor's decode shape; numbers as in the donor.
export interface Quat { x: number; y: number; z: number; w: number; }
export interface Vec3 { x: number; y: number; z: number; }

// One stored sample: three 16-bit rotation fields, then three 16-bit position fields (12 bytes).
export interface PackedSample {
  rot: [number, number, number];
  pos: [number, number, number];
}

// Per-clip values read from the clip header (asset data, not engine constants).
export interface ClipHeader {
  positionMin: number;
  positionScale: number;
}

const ROT_RANGE = 65535;                 // (1 << 16) - 1
const ROT_SCALE = (1 / ROT_RANGE) * 2.1; // stored xyz cover about +/-1.05
const ROT_MID = 32767;                   // (1 << 15) - 1

// Rebuild a unit quaternion from its xyz fields; w is always stored as non-negative.
export function decodeRotation(u: [number, number, number]): Quat {
  const x = (u[0] - ROT_MID) * ROT_SCALE;
  const y = (u[1] - ROT_MID) * ROT_SCALE;
  const z = (u[2] - ROT_MID) * ROT_SCALE;
  const lenSq = x * x + y * y + z * z;
  if (lenSq > 1) {
    // Rounding pushed xyz past unit length: normalise xyz and set w to 0.
    const l = 1 / Math.sqrt(lenSq);
    return { x: x * l, y: y * l, z: z * l, w: 0 };
  }
  return { x, y, z, w: Math.sqrt(1 - lenSq) };
}

export function decodePosition(u: [number, number, number], h: ClipHeader): Vec3 {
  return {
    x: u[0] * h.positionScale + h.positionMin,
    y: u[1] * h.positionScale + h.positionMin,
    z: u[2] * h.positionScale + h.positionMin,
  };
}

// Samples are decoded in file order: rotation first, then position, one pair per stored sample.
export function decodeSamples(samples: PackedSample[], h: ClipHeader): { rot: Quat; pos: Vec3 }[] {
  return samples.map((s) => ({ rot: decodeRotation(s.rot), pos: decodePosition(s.pos, h) }));
}

export {};
