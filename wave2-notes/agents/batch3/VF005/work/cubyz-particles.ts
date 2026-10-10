// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const BASE_GRAVITY = 30;            // engine constant (donor physics.zig:14)
export const AIR_TERMINAL_VELOCITY = 90;   // engine constant (donor physics.zig:15)
export const AIR_DENSITY = 0.001;          // engine constant (donor physics.zig:16)

export interface Vec3 { x: number; y: number; z: number; }

// One effect type. In Frankendom this is data (catalogue or zone), not code.
export interface EffectKind {
  density: number; // equal to AIR_DENSITY = no gravity; below it the mote rises
  drag: number;    // drag coefficient
}

export interface Mote {
  pos: Vec3;
  vel: Vec3;
  kind: EffectKind;
  left: number;      // seconds of life left
  collides: boolean;
}

export class MotePool {
  private readonly motes: Mote[] = [];
  constructor(private readonly capacity: number) {}

  get count(): number { return this.motes.length; }

  // Adds up to the free room. The rest of the burst is dropped; nothing is evicted.
  burst(n: number, make: (index: number) => Mote): number {
    const take = Math.min(n, Math.max(0, this.capacity - this.motes.length));
    for (let i = 0; i < take; i++) this.motes.push(make(i));
    return take;
  }

  // Variable step in seconds. blocked(p) is true when p is inside solid world.
  step(dt: number, blocked: (p: Vec3) => boolean): void {
    let i = 0;
    while (i < this.motes.length) {
      const m = this.motes[i];
      m.left -= dt;
      if (m.left < 0) {
        const last = this.motes.pop()!; // swap-remove
        if (i < this.motes.length) this.motes[i] = last;
        continue; // the mote moved into slot i is updated in this same pass
      }
      // Gravity scales with how far the density sits from air density.
      const g = BASE_GRAVITY * (m.kind.density - AIR_DENSITY) / m.kind.density;
      m.vel.z -= g * dt;
      // Exponential drag: the same result at any frame rate.
      const k = Math.exp(-(BASE_GRAVITY / AIR_TERMINAL_VELOCITY) * m.kind.drag * dt);
      m.vel.x *= k; m.vel.y *= k; m.vel.z *= k;
      this.move(m, dt, blocked);
      i++;
    }
  }

  private move(m: Mote, dt: number, blocked: (p: Vec3) => boolean): void {
    if (!m.collides) {
      m.pos.x += m.vel.x * dt; m.pos.y += m.vel.y * dt; m.pos.z += m.vel.z * dt;
      return;
    }
    // One axis at a time. A blocked axis is reverted to its last free value.
    for (const axis of ["x", "y", "z"] as const) {
      const old = m.pos[axis];
      m.pos[axis] = old + m.vel[axis] * dt;
      if (blocked(m.pos)) m.pos[axis] = old;
    }
  }
}

function unitDirection(rand: () => number): Vec3 {
  for (;;) {
    const x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
    const l2 = x * x + y * y + z * z;
    if (l2 > 0 && l2 <= 1) {
      const l = Math.sqrt(l2);
      return { x: x / l, y: y / l, z: z / l };
    }
  }
}

// Hit sparks: one outward burst from a point, random speed and life inside the given ranges.
export function hitSparks(
  pool: MotePool, at: Vec3, kind: EffectKind, rand: () => number,
  n: number, speedMin: number, speedMax: number, lifeMin: number, lifeMax: number,
): number {
  return pool.burst(n, () => {
    const d = unitDirection(rand);
    const s = speedMin + (speedMax - speedMin) * rand();
    return {
      pos: { x: at.x, y: at.y, z: at.z },
      vel: { x: d.x * s, y: d.y * s, z: d.z * s },
      kind,
      left: lifeMin + (lifeMax - lifeMin) * rand(),
      collides: true,
    };
  });
}
