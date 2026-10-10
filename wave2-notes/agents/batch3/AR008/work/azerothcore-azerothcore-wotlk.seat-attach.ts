// Licence: GPL-2.0 (donor LICENSE). Clean-room sketch written from the described mechanism (local offset rotated by the base yaw, plus base position and height), not a translation of the donor lines.

interface Pose {
  x: number;
  y: number;
  z: number;
  o: number; // yaw in radians
}

interface Attachment {
  offset: { x: number; y: number; z: number }; // local offset from the base (seat or socket data)
  orientationOffset: number;                   // radians added to the base yaw for the rider or prop (0 = none)
}

// Keep yaw in [0, 2*pi).
function normalizeYaw(o: number): number {
  const twoPi = 2 * Math.PI;
  let r = o % twoPi;
  if (r < 0) r += twoPi;
  return r;
}

// Local attachment point to world pose. Rotate the planar offset by the base yaw, add the base position,
// add the height offset unchanged. No pitch or roll: the base is assumed level.
function attachmentToWorld(base: Pose, a: Attachment): Pose {
  const c = Math.cos(base.o);
  const s = Math.sin(base.o);
  const { x: lx, y: ly, z: lz } = a.offset;
  return {
    x: base.x + lx * c - ly * s,
    y: base.y + ly * c + lx * s,
    z: base.z + lz,
    o: normalizeYaw(base.o + a.orientationOffset),
  };
}

// World position to local offset, using the transpose of the same rotation. Yaw is returned relative to the base.
function worldToAttachment(base: Pose, world: Pose): { x: number; y: number; z: number; o: number } {
  const c = Math.cos(base.o);
  const s = Math.sin(base.o);
  const dx = world.x - base.x;
  const dy = world.y - base.y;
  return {
    x: c * dx + s * dy,
    y: -s * dx + c * dy,
    z: world.z - base.z,
    o: normalizeYaw(world.o - base.o),
  };
}

// Relocate every rider whenever the base moves or turns. Callers pass the riders' stored local attachments.
function relocateRiders(base: Pose, riders: Array<{ id: number; attach: Attachment }>): Array<{ id: number; pose: Pose }> {
  return riders.map((r) => ({ id: r.id, pose: attachmentToWorld(base, r.attach) }));
}
export {};
