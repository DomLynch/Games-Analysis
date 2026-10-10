// Licence: restricted (Clancey-wowrust: no LICENSE file; README says "Private project. Not for distribution."). Clean-room sketch of the mechanism; not a translation.
// clean-room
export {};

type Vec3 = { x: number; y: number; z: number };

export interface Orbit {
  target: Vec3;     // player feet position, set every frame
  distance: number; // 2..50, default 10
  yaw: number;      // radians
  pitch: number;    // radians, clamped to +/-80 degrees
}

const HEAD_HEIGHT = 1.8;
const MAX_PITCH = (80 * Math.PI) / 180;
const YAW_PER_UNIT = 0.002;   // radians per mouse unit while rotating
const SCROLL_STEP = 2.0;      // distance units per scroll unit
const MIN_DIST = 2.0;
const MAX_DIST = 50.0;

// The look point and the camera: a point on a sphere around the head, no offset to either side.
// The camera sits on the +yaw side of the head (head + (cos yaw, sin yaw) x distance) and looks back at it.
export function orbitPosition(o: Orbit): Vec3 {
  const hx = o.target.x, hy = o.target.y, hz = o.target.z + HEAD_HEIGHT;
  return {
    x: hx + Math.cos(o.yaw) * Math.cos(o.pitch) * o.distance,
    y: hy + Math.sin(o.yaw) * Math.cos(o.pitch) * o.distance,
    z: hz + Math.sin(o.pitch) * o.distance,
  };
}

// One frame of input. dt is accepted and not used; there is no smoothing or wall test.
export function updateOrbit(
  o: Orbit,
  input: { targetPos: Vec3; yawDelta: number; pitchDelta: number; scroll: number; rotating: boolean },
  _dt: number,
): void {
  if (input.rotating) {
    o.yaw += input.yawDelta * YAW_PER_UNIT;
    o.pitch += input.pitchDelta * YAW_PER_UNIT;
  }
  o.pitch = Math.min(Math.max(o.pitch, -MAX_PITCH), MAX_PITCH);
  o.distance = Math.min(Math.max(o.distance - input.scroll * SCROLL_STEP, MIN_DIST), MAX_DIST);
  o.target = input.targetPos;
}

// Camera-relative walk axes on the ground plane, from yaw alone.
// CAUTION (donor quirk, kept as is): the camera sits at head + (cos yaw, sin yaw) x distance and looks back at the head, so its
// view direction is the NEGATIVE of this forward. The donor's `forward` points from the head toward the camera; whether the
// input layer's forward sign compensates was not read. Do not reuse as "forward = where the camera looks" without flipping.
export function walkAxes(yaw: number): { forward: Vec3; right: Vec3 } {
  return {
    forward: { x: Math.cos(yaw), y: Math.sin(yaw), z: 0 },
    right: { x: -Math.sin(yaw), y: Math.cos(yaw), z: 0 },
  };
}
