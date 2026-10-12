// Licence: GPL-3.0 (donor LICENSE). clean-room: written from the described rule, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }

// Distance bands in blocks. Checked from the farthest band inwards; the first band
// whose distance the target is beyond sets how many server ticks pass between sends.
const BANDS: ReadonlyArray<{ beyond: number; everyTicks: number }> = [
  { beyond: 500, everyTicks: 32 },
  { beyond: 300, everyTicks: 16 },
  { beyond: 200, everyTicks: 8 },
  { beyond: 120, everyTicks: 6 },
  { beyond: 64, everyTicks: 3 },
  { beyond: 24, everyTicks: 2 },
];

export function sendPeriodTicks(distance: number): number {
  const d2 = distance * distance;
  for (const band of BANDS) {
    if (d2 > band.beyond * band.beyond) return band.everyTicks;
  }
  return 1; // within 24 blocks: every tick
}

// Each entity has its own phase (its id added to the tick counter), so the sends for
// many entities spread across the period instead of all landing on the same tick.
export function sendThisTick(
  tick: number,
  entityId: number,
  client: Vec3,
  target: Vec3,
  alwaysSend: boolean, // e.g. voxel-collider objects, or the client's own body
): boolean {
  if (alwaysSend) return true;
  const dx = client.x - target.x;
  const dy = client.y - target.y;
  const dz = client.z - target.z;
  const period = sendPeriodTicks(Math.sqrt(dx * dx + dy * dy + dz * dz));
  return (tick + entityId) % period === 0;
}
