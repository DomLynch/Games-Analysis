// Licence: GPL-3.0-or-later with id Software additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type V3 = { x: number; y: number; z: number };
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: V3): number => Math.sqrt(dot(a, a));
const unit = (a: V3): V3 => { const l = len(a); return l > 0 ? mul(a, 1 / l) : { x: 0, y: 0, z: 0 }; };

// Two-bone solve. Returns the middle joint. Out of reach: the joint sits halfway, ok = false.
export function solveTwoBones(start: V3, end: V3, bend: V3, l0: number, l1: number): { joint: V3; ok: boolean } {
  const v = sub(end, start);
  const d = len(v);
  if (d === 0 || d > l0 + l1 || d < Math.abs(l0 - l1)) return { joint: add(start, mul(v, 0.5)), ok: false };
  const axis = mul(v, 1 / d);
  const side = unit(sub(bend, mul(axis, dot(bend, axis))));  // bend direction made perpendicular to the chain
  const x = (d * d + l0 * l0 - l1 * l1) / (2 * d);            // distance along the chain to the middle joint
  const y = Math.sqrt(Math.max(0, l0 * l0 - x * x));          // distance off the chain, toward the bend
  return { joint: add(add(start, mul(axis, x)), mul(side, y)), ok: true };
}

export interface Leg {
  upper: number;        // thigh length, measured at rest
  lower: number;        // shin length, measured at rest
  bend: V3;             // knee bend direction, world space
  hip: V3;              // animated hip, world space, before the waist drop
  ankle: V3;            // animated ankle, world space, before IK
  floorHeight: number;  // floor height along `up` under this foot (from a short down-probe)
}
export interface RigState { valid: boolean; oldAnkle: number[]; oldWaist: number; }
export interface Tuning { ankleSmoothing: number; waistSmoothing: number; footShift: number; waistShift: number; }

// One fixed tick. Order follows the donor: floor shift, ankle smoothing, waist drop and smoothing, first-tick return, leg solve.
export function ikTick(legs: Leg[], origin: V3, pelvis: V3, up: V3, grounded: boolean, onPlatform: boolean,
                       st: RigState, t: Tuning): { ankles: V3[]; knees: V3[] } | null {
  const h = (p: V3): number => dot(p, up);
  const originH = h(origin);
  // raw floor shift, only while grounded
  const raw = legs.map(l => (grounded ? l.floorHeight - originH + t.footShift : 0));
  const lowest = raw.length > 0 ? Math.min(...raw) : 0;

  // ankle smoothing: close a fraction of the gap to the target each tick, except on a moving platform
  const ankleH: number[] = [];
  const shift: number[] = [];
  legs.forEach((l, i) => {
    let s = raw[i];
    const ah = h(l.ankle);
    if (st.valid && !onPlatform) {
      const target = ah + raw[i];
      s = raw[i] - t.ankleSmoothing * (target - st.oldAnkle[i]);
    }
    shift.push(s);
    ankleH.push(ah + s);
  });

  // waist: drops by the lowest needed shift, then is smoothed against its last height
  let off = lowest + t.waistShift;
  const ph = h(pelvis);
  if (st.valid) {
    off -= t.waistSmoothing * (ph + off - st.oldWaist);
  }
  st.oldWaist = ph + off;
  st.oldAnkle = ankleH;
  if (!st.valid) { st.valid = true; return null; }  // first tick: state stored, no solve

  const ankles: V3[] = [];
  const knees: V3[] = [];
  legs.forEach((l, i) => {
    const ankle = add(l.ankle, mul(up, shift[i]));   // ankle target after the IK shift
    const hip = add(l.hip, mul(up, off));            // hip follows the waist drop
    ankles.push(ankle);
    knees.push(solveTwoBones(hip, ankle, l.bend, l.upper, l.lower).joint);
  });
  return { ankles, knees };
}

export {};
