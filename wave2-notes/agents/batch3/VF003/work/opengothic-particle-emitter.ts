// Licence: MIT (donor, OpenGothic). Shape adapted from the described mechanism; this sketch is written from that description, not a line-by-line port.
const VIEW_RANGE = 4000;            // units: emitters further than this from the viewer make no new particles
const MS_PER_S = 1000;

interface EffectSpec {
  ppsValue: number;                  // particles per second at scale 1
  ppsScaleKeys: number[];            // rate curve over the emitter's life
  ppsFps: number;                    // curve keys per second
  ppsSmooth: boolean;
  loop: boolean;
  prefferedTimeMs: number;           // non-looping effects stop emitting after this
  lifeAvgMs: number;
  lifeVarMs: number;
  velAvg: number;                    // units per ms
  velVar: number;
  gravity: [number, number, number]; // units per ms per ms
}

interface Particle {
  life: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

interface Emitter { x: number; y: number; z: number; timeMs: number; active: boolean; }

// Rate curve at time tMs. Same arithmetic as the donor: index = fps * t / 1000, linear or step, loop or clamp.
function scaleAt(spec: EffectSpec, tMs: number): number {
  const keys = spec.ppsScaleKeys;
  if (keys.length === 0) return 1;
  const scaled = spec.ppsFps * tMs;
  const at = Math.floor(scaled / MS_PER_S);
  const alpha = (scaled % MS_PER_S) / MS_PER_S;
  const a = spec.loop ? at % keys.length : Math.min(at, keys.length - 1);
  const b = spec.loop ? (at + 1) % keys.length : Math.min(at + 1, keys.length - 1);
  const k0 = keys[a], k1 = keys[b];
  return spec.ppsSmooth ? k0 + alpha * (k1 - k0) : (alpha < 0.5 ? k0 : k1);
}

// Emission count between t0 and t1 (ms). Both ends are absolute-time floors, so a steady rate loses no fraction.
function emitCount(spec: EffectSpec, t0: number, t1: number): number {
  if (t1 <= t0) return 0;
  let a = t0, b = t1;
  if (!spec.loop) { a = Math.min(spec.prefferedTimeMs, a); b = Math.min(spec.prefferedTimeMs, b); }
  const rate = spec.ppsValue * Math.max(0, scaleAt(spec, b)); // rate read at the window end
  return Math.floor(rate * b / MS_PER_S) - Math.floor(rate * a / MS_PER_S);
}

// Pool size from Little's law: live particles ~= rate * life.
function poolSize(spec: EffectSpec, maxScale: number): number {
  const maxLife = spec.lifeAvgMs + spec.lifeVarMs;
  const maxRate = spec.ppsValue * maxScale;
  return Math.max(1, Math.ceil((maxLife * maxRate) / MS_PER_S));
}

class ParticlePool {
  private readonly slots: Array<Particle | undefined>;
  private cursor = 0;
  dropped = 0;

  constructor(size: number) { this.slots = new Array(size); }

  // Places up to `count` particles in free slots. The rest are counted as dropped, never overwritten.
  emit(count: number, make: () => Particle): number {
    let left = count;
    const n = this.slots.length;
    for (let step = 0; step < n && left > 0; step++) {
      const i = (this.cursor + step) % n;
      if (this.slots[i] !== undefined) continue;
      this.slots[i] = make();
      this.cursor = (i + 1) % n;
      left--;
    }
    this.dropped += left;
    return count - left;
  }

  // Semi-implicit step: position moves with the old velocity, then velocity takes gravity.
  tick(dtMs: number, g: [number, number, number]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const p = this.slots[i];
      if (p === undefined) continue;
      if (p.life <= dtMs) { this.slots[i] = undefined; continue; }
      p.life -= dtMs;
      p.x += p.vx * dtMs; p.y += p.vy * dtMs; p.z += p.vz * dtMs;
      p.vx += g[0] * dtMs; p.vy += g[1] * dtMs; p.vz += g[2] * dtMs;
    }
  }
}

// Random direction on the unit sphere, speed rolled from avg +/- var.
function newParticle(e: Emitter, spec: EffectSpec, rnd: () => number): Particle {
  const life = (2 * rnd() - 1) * spec.lifeVarMs + spec.lifeAvgMs;
  const dy = 1 - 2 * rnd();
  const sn = Math.sqrt(1 - dy * dy);
  const th = 2 * Math.PI * rnd();
  const dx = sn * Math.cos(th), dz = sn * Math.sin(th);
  const speed = (2 * rnd() - 1) * spec.velVar + spec.velAvg;
  return { life, x: e.x, y: e.y, z: e.z, vx: dx * speed, vy: dy * speed, vz: dz * speed };
}

// One emitter step. The emitter's clock always advances; new particles are made only while it is near the viewer.
function stepEmitter(e: Emitter, spec: EffectSpec, pool: ParticlePool, dtMs: number, viewerDist2: number, rnd: () => number): void {
  const t0 = e.timeMs;
  const t1 = t0 + dtMs;
  if (e.active && viewerDist2 < VIEW_RANGE * VIEW_RANGE) {
    pool.emit(emitCount(spec, t0, t1), () => newParticle(e, spec, rnd));
  }
  e.timeMs = t1;
}
