// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const FP = 65536;          // accelerations are in 1/65536 units per tick
const GRAVITY = 5041;      // subtracted from the vertical acceleration every tick
const DRAG = 256;          // each acceleration loses 1/256 of itself per tick, per axis
const BURST_CAP = 7;       // at most 7 chips per burst

interface Chip {
  x: number; y: number; z: number;     // world units
  ax: number; ay: number; az: number;  // per-tick displacement, in 1/65536 units
  ttl: number;                         // ticks left before the chip is removed
}

interface Ground {
  landZ(x: number, y: number): number;   // ground height under a point
  waterZ(x: number, y: number): number;  // water surface, 0 when there is none
  onWaterSplash(x: number, y: number, z: number): void;
}

// rand() returns an integer in [0, 65535].
function toInt16(v: number): number {
  return ((v & 0xffff) << 16) >> 16;
}

function launchChip(x: number, y: number, z: number, rand: () => number): Chip {
  return {
    x, y, z,
    ax: toInt16(rand()) * 4,                 // sideways, about -2..+2 units per tick
    ay: toInt16(rand()) * 4,
    az: (rand() & 0xffff) * 4 + 0x10000,     // upward kick, about 1..5 units per tick
    ttl: (rand() & 0x7f) + 140,              // 140..267 ticks
  };
}

// Burst size: the caller passes the hit's count; the cap keeps it bounded.
function emitBurst(count: number, x: number, y: number, z: number, rand: () => number): Chip[] {
  const n = Math.min(count, BURST_CAP);
  const out: Chip[] = [];
  for (let i = 0; i < n; i++) out.push(launchChip(x, y, z, rand));
  return out;
}

// One tick for one chip. Returns false when the chip is gone.
function tickChip(c: Chip, ground: Ground): boolean {
  c.ttl -= 1;
  if (c.ttl === 0) return false;

  c.az -= GRAVITY;
  c.ax -= Math.trunc(c.ax / DRAG);
  c.ay -= Math.trunc(c.ay / DRAG);
  c.az -= Math.trunc(c.az / DRAG);

  const nx = c.x + c.ax / FP;
  const ny = c.y + c.ay / FP;
  let nz = c.z + c.az / FP;

  const water = ground.waterZ(nx, ny);
  if (water !== 0 && c.z >= water && nz <= water) {
    ground.onWaterSplash(c.x, c.y, water);
    return false;
  }

  const land = ground.landZ(nx, ny);
  if (c.z >= land && nz <= land) {
    c.az = -c.az;      // bounce: reverse the vertical speed, no extra loss
    nz = land;
  }

  c.x = nx; c.y = ny; c.z = nz;
  return true;
}

export {};
