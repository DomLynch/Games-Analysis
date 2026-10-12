// Licence: GPL-3.0 (donor, cookgreen OpenMB; _RESTRICTED-NOTE.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Constants as in the donor (not copied verbatim): turn cap 500 deg/s, run speed 17 units/s,
// turn damping 0.2 while airborne. The donor's values are read from CharacterController.cs 22-23 and 441.
const TURN_SPEED_DEG = 500;
const RUN_SPEED = 17;
const AIR_TURN_FACTOR = 0.2;

// Wrap a heading into (-180, 180].
export function wrapDeg(a: number): number {
  let x = ((a % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

// One frame of heading: turn toward the goal heading by at most the cap, never past it.
export function stepHeading(headingDeg: number, goalDeg: number, dt: number, airborne: boolean): number {
  const toGoal = wrapDeg(goalDeg - headingDeg);
  if (toGoal === 0) return headingDeg;
  const cap = TURN_SPEED_DEG * dt * (airborne ? AIR_TURN_FACTOR : 1);
  const turn = Math.sign(toGoal) * Math.min(Math.abs(toGoal), cap);
  return wrapDeg(headingDeg + turn);
}

// Move along the (already turned) heading. Convention chosen here: heading 0 points along +z.
export function moveStep(x: number, z: number, headingDeg: number, dt: number): { x: number; z: number } {
  const r = (headingDeg * Math.PI) / 180;
  return { x: x + Math.sin(r) * RUN_SPEED * dt, z: z + Math.cos(r) * RUN_SPEED * dt };
}

// Fix for the donor's per-key overwrite (CharacterController.cs 302-331): derive the axis from the
// set of held keys each frame, so releasing one key does not zero a key that is still held.
// Opposite keys cancel. Mapping as in the donor: W = -z, S = +z, A = -x, D = +x.
export function axisFromHeld(held: Set<string>): { x: number; z: number } {
  const x = (held.has("D") ? 1 : 0) - (held.has("A") ? 1 : 0);
  const z = (held.has("S") ? 1 : 0) - (held.has("W") ? 1 : 0);
  return { x, z };
}

export {};
