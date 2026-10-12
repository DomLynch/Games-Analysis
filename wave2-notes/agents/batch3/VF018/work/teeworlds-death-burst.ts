// Licence: zlib-style (donor license.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Vec2 = { x: number; y: number };

interface Particle {
  live: boolean;
  pos: Vec2;
  vel: Vec2;
  life: number;
  lifeSpan: number;
  startSize: number;
  endSize: number;
  gravity: number;
  friction: number;
  elasticity: number;      // drawn once per particle (fix: the donor redraws it on every update)
  rgb: [number, number, number];
  alpha0: number;          // 0.75 in the donor
  rot: number;
  rotSpeed: number;
}

const FRICTION_STEP = 0.05; // seconds: the donor applies friction in these fixed steps

class ParticlePool {
  private slots: Particle[];
  private frictionClock = 0; // carried remainder of the friction clock, as in the donor

  constructor(capacity: number, private isSolid: (x: number, y: number) => boolean) {
    this.slots = Array.from({ length: capacity }, () => ({ live: false } as Particle));
  }

  // Returns false when the pool is full: the donor drops the particle without a record.
  add(p: Omit<Particle, "live" | "life">): boolean {
    const slot = this.slots.find((s) => !s.live);
    if (!slot) return false;
    Object.assign(slot, p, { live: true, life: 0 });
    return true;
  }

  update(dt: number): void {
    this.frictionClock += dt;
    let steps = 0;
    while (this.frictionClock > FRICTION_STEP) {
      steps++;
      this.frictionClock -= FRICTION_STEP;
    }
    for (const p of this.slots) {
      if (!p.live) continue;
      p.vel.y += p.gravity * dt;                         // gravity uses the real frame time (donor)
      for (let k = 0; k < steps; k++) {                  // friction once per fixed step (donor)
        p.vel.x *= p.friction;
        p.vel.y *= p.friction;
      }
      this.move(p, p.vel.x * dt, p.vel.y * dt);
      p.life += dt;
      p.rot += p.rotSpeed * dt;
      if (p.life > p.lifeSpan) p.live = false;
    }
  }

  // Donor MovePoint: if the destination is solid, flip the blocked axis (both axes if neither alone is blocked); position holds.
  private move(p: Particle, dx: number, dy: number): void {
    if (!this.isSolid(p.pos.x + dx, p.pos.y + dy)) {
      p.pos.x += dx;
      p.pos.y += dy;
      return;
    }
    const hitX = this.isSolid(p.pos.x + dx, p.pos.y);
    const hitY = this.isSolid(p.pos.x, p.pos.y + dy);
    if (hitX) p.vel.x *= -p.elasticity;
    if (hitY) p.vel.y *= -p.elasticity;
    if (!hitX && !hitY) {
      p.vel.x *= -p.elasticity;
      p.vel.y *= -p.elasticity;
    }
  }

  // Size lerps start to end by life fraction (donor). Alpha fades with life (fix: the donor keeps alpha constant).
  renderState(p: Particle): { size: number; alpha: number } {
    const a = p.life / p.lifeSpan;
    return { size: p.startSize + (p.endSize - p.startSize) * a, alpha: p.alpha0 * (1 - a) };
  }
}

// One death -> one burst of 64 (donor count). Angle is uniform here (fix of the donor's square sample).
function deathBurst(pool: ParticlePool, at: Vec2, victimRgb: [number, number, number], rand: () => number): void {
  for (let i = 0; i < 64; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = (rand() + 0.1) * 900;
    const shade = 0.75 + rand() * 0.25;
    pool.add({
      pos: { x: at.x, y: at.y },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      lifeSpan: 0.3 + rand() * 0.3,
      startSize: 24 + rand() * 16,
      endSize: 0,
      gravity: 800,
      friction: 0.8,
      elasticity: 0.1 + 0.9 * rand(),
      rgb: [victimRgb[0] * shade, victimRgb[1] * shade, victimRgb[2] * shade],
      alpha0: 0.75,
      rot: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * Math.PI,
    });
  }
}
