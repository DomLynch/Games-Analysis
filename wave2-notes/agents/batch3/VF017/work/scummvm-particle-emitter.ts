// Licence: GPL-3.0-or-later (ScummVM file header: GNU GPL version 3 or later; file says based on WME Lite, Copyright 2011 Jan Nedoma). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vec { x: number; y: number; }

type PState = "fadein" | "normal" | "fadeout" | "dead";

interface Particle {
  pos: Vec;
  vel: Vec;
  state: PState;
  age: number;        // ms alive in the normal state
  life: number;       // ms
  fadeT: number;      // ms into the current fade
  fadeFrom: number;   // alpha when fade-out started (0..1)
  alpha: number;      // 0..1
  scale: number;      // percent
  growth: number;     // percent per second
}

interface Force { kind: "global" | "point"; pos: Vec; dir: Vec; }

interface EmitterCfg {
  maxParticles: number;      // live cap (donor default 100)
  genIntervalMs: number;     // batch interval (donor default 0)
  genAmount: number;         // particles per batch (donor default 1)
  maxBatches: number;        // 0 = unlimited
  lifeMs: [number, number];
  speed: [number, number];   // px per second
  angleDeg: [number, number];
  scale: [number, number];   // percent
  fadeInMs: number;
  fadeOutMs: number;
}

const POINT_FORCE_K = 100;     // donor part_particle.cpp 161: dist = 100 / dist
const MIN_FORCE_DIST = 1;      // FIX: lower bound on distance (donor has none)
const PREROLL_STEP_MS = 500;   // donor part_emitter.cpp 352

class Emitter {
  origin: Vec = { x: 0, y: 0 };
  forces: Force[] = [];
  onBatch: (() => void) | null = null;   // donor: emit event, not during pre-roll
  private particles: Particle[] = [];
  private lastGenMs = 0;
  private batches = 0;
  private running = false;

  constructor(private cfg: EmitterCfg, private rnd: () => number = Math.random) {}

  private range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.rnd();
  }

  start(nowMs: number, prerollMs: number): void {
    for (const p of this.particles) p.state = "dead";
    this.running = true;
    this.batches = 0;
    // FIX: pre-roll in 500 ms steps but keep the remainder (donor integer division drops it)
    let t = nowMs - prerollMs;
    let left = prerollMs;
    while (left > 0) {
      const dt = Math.min(PREROLL_STEP_MS, left);
      this.step(t + dt, dt, true);
      t += dt;
      left -= dt;
    }
  }

  update(nowMs: number, dtMs: number): void {
    if (this.running) this.step(nowMs, dtMs, false);
  }

  liveCount(): number {
    return this.particles.filter(p => p.state !== "dead").length;
  }

  private step(nowMs: number, dtMs: number, preroll: boolean): void {
    for (const p of this.particles) this.advance(p, dtMs);
    const live = this.liveCount();              // fading particles count as live (donor)
    if (live >= this.cfg.maxParticles) return;  // no batch is timed while at the cap (donor)
    if (nowMs - this.lastGenMs <= this.cfg.genIntervalMs) return;
    this.lastGenMs = nowMs;
    this.batches++;
    if (this.cfg.maxBatches > 0 && this.batches > this.cfg.maxBatches) return;

    let toGen = Math.min(this.cfg.genAmount, this.cfg.maxParticles - live);
    while (toGen > 0) {
      this.spawn();
      toGen--;
    }
    if (!preroll && this.onBatch) this.onBatch();
  }

  private spawn(): void {
    let p = this.particles.find(q => q.state === "dead");   // reuse a dead slot first
    if (!p) {
      p = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, state: "dead", age: 0, life: 0,
            fadeT: 0, fadeFrom: 0, alpha: 0, scale: 100, growth: 0 };
      this.particles.push(p);
    }
    const ang = this.range(this.cfg.angleDeg[0], this.cfg.angleDeg[1]) * Math.PI / 180;
    const spd = this.range(this.cfg.speed[0], this.cfg.speed[1]);
    p.pos = { x: this.origin.x, y: this.origin.y };
    p.vel = { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
    p.life = this.range(this.cfg.lifeMs[0], this.cfg.lifeMs[1]);
    p.scale = this.range(this.cfg.scale[0], this.cfg.scale[1]);
    p.growth = 0;
    p.age = 0;
    p.fadeT = 0;
    p.alpha = 0;
    p.state = "fadein";
  }

  // One particle, one step. Fading particles do not move (donor behaviour; see note).
  private advance(p: Particle, dtMs: number): void {
    const sec = dtMs / 1000;
    if (p.state === "dead") return;
    if (p.state === "fadein") {
      p.fadeT += dtMs;
      p.alpha = Math.min(1, p.fadeT / this.cfg.fadeInMs);
      if (p.fadeT >= this.cfg.fadeInMs) { p.state = "normal"; p.alpha = 1; }
      return;
    }
    if (p.state === "fadeout") {
      p.fadeT += dtMs;
      p.alpha = p.fadeFrom * Math.max(0, 1 - p.fadeT / this.cfg.fadeOutMs);
      if (p.fadeT >= this.cfg.fadeOutMs) p.state = "dead";
      return;
    }
    p.age += dtMs;
    if (p.age >= p.life) {
      if (this.cfg.fadeOutMs > 0) { p.state = "fadeout"; p.fadeT = 0; p.fadeFrom = p.alpha; }
      else p.state = "dead";
      return;
    }
    for (const f of this.forces) {
      if (f.kind === "global") {
        p.vel.x += f.dir.x * sec;
        p.vel.y += f.dir.y * sec;
      } else {
        const dx = f.pos.x - p.pos.x;
        const dy = f.pos.y - p.pos.y;
        const d = Math.max(MIN_FORCE_DIST, Math.hypot(dx, dy));
        const k = POINT_FORCE_K / d;
        p.vel.x += f.dir.x * k * sec;
        p.vel.y += f.dir.y * k * sec;
      }
    }
    p.pos.x += p.vel.x * sec;
    p.pos.y += p.vel.y * sec;
    p.scale += p.growth * sec;
    if (p.scale <= 0) p.state = "dead";
  }
}

export {};
