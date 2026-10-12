// Licence: GPL v3 / LGPL v3 (donor Particle.cpp and Particle.h headers; root LICENSE is MIT). copyleft: clean-room, shape only.
export interface Droplet { x: number; y: number; vx: number; vy: number; size: number; alpha: number }

export interface SprayConfig {
  lifetimeS: number;   // mean life; each droplet dies with probability dt / lifetimeS per step
  rateHz: number;      // droplets per second while emitting
  speed: number;       // emission speed along the direction
  spread: number;      // random extra velocity, full width
  growth: number;      // size added per second
  cap: number;         // most droplets kept; the oldest goes first
}

export class Spray {
  readonly drops: Droplet[] = [];
  private now = 0;     // emitter clock, seconds
  private nextAt = 0;  // time the next droplet is due

  constructor(private readonly cfg: SprayConfig, private readonly rnd: () => number = Math.random) {}

  // dt in seconds. intensity 0..1 sets droplet brightness; at or below 0.01 nothing is emitted and no backlog builds.
  step(dt: number, intensity: number, ox: number, oy: number, dirX: number, dirY: number): void {
    // 1. age and move: each droplet may die, survivors move and grow
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (this.rnd() < dt / this.cfg.lifetimeS) { this.drops.splice(i, 1); continue; }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.size += this.cfg.growth * dt;
    }
    this.now += dt;

    // 2. emit: catch up on every droplet due since the last one
    if (intensity <= 0.01) { this.nextAt = this.now; return; }
    while (this.now > this.nextAt) {
      const back = this.now - this.nextAt;   // place the droplet where it would be by now
      this.spawn(ox, oy, dirX, dirY, back, intensity);
      this.nextAt += (1 / this.cfg.rateHz) * (0.5 + this.rnd());   // jitter 0.5x to 1.5x
    }
  }

  private spawn(ox: number, oy: number, dx: number, dy: number, back: number, alpha: number): void {
    const vx = dx * this.cfg.speed + (this.rnd() - 0.5) * this.cfg.spread;
    const vy = dy * this.cfg.speed + (this.rnd() - 0.5) * this.cfg.spread;
    this.drops.push({ x: ox + vx * back, y: oy + vy * back, vx, vy, size: 1, alpha });
    if (this.drops.length > this.cfg.cap) this.drops.shift();   // oldest first
  }
}

// Example: one second at 30 fps, emitting at full intensity with a fixed random source.
const cfg: SprayConfig = { lifetimeS: 0.5, rateHz: 40, speed: 2, spread: 1, growth: 0.5, cap: 300 };
const s = new Spray(cfg, () => 0.5);
for (let i = 0; i < 30; i++) s.step(1 / 30, 1, 0, 0, 1, 0);
export const dropCount = s.drops.length;
export const capHeld = s.drops.length <= cfg.cap;
