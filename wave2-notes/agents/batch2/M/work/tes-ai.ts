type Mode = 'idle' | 'chase' | 'attack';
interface Brain {
  mode: Mode;
  windup: number;       // seconds until the next swing starts
  swinging: boolean;
  swingT: number;       // seconds into the swing
  hitDone: boolean;     // this swing already tried its hit
}
interface BrainData {
  detectIn: number; detectOut: number;   // radius to wake / radius to give up (detectOut > detectIn)
  reachIn: number; reachOut: number;     // radius to start / stop attacking (reachOut > reachIn)
  speed: number; windupMax: number; swingLen: number; hitAt: number;
}
interface Out { vx: number; vy: number; dealHit: boolean }

// dx,dy = vector from enemy to target (the engine picks the target; see section 6).
function brainStep(b: Brain, d: BrainData, dx: number, dy: number, dt: number, rand: () => number): Out {
  const dist = Math.hypot(dx, dy);
  const out: Out = { vx: 0, vy: 0, dealHit: false };
  if (b.mode === 'idle') {
    if (dist <= d.detectIn) b.mode = 'chase';
    return out;
  }
  if (b.mode === 'chase') {
    if (dist > d.detectOut) { b.mode = 'idle'; return out; }
    if (dist > d.reachIn) {
      out.vx = (dx / dist) * d.speed; out.vy = (dy / dist) * d.speed;
      return out;
    }
    b.mode = 'attack'; b.windup = rand() * d.windupMax; b.swinging = false;
    return out;
  }
  // attack
  if (!b.swinging) {
    if (dist > d.reachOut) { b.mode = 'chase'; b.windup = 0; return out; }
    b.windup -= dt;
    if (b.windup > 0) return out;
    b.windup = 0; b.swinging = true; b.swingT = 0; b.hitDone = false;
    return out;
  }
  b.swingT += dt;
  if (!b.hitDone && b.swingT >= d.swingLen * d.hitAt) {
    b.hitDone = true;
    out.dealHit = dist <= d.reachOut;
  }
  if (b.swingT < d.swingLen) return out;
  b.swinging = false;
  if (dist > d.reachOut) { b.mode = 'chase'; return out; }
  b.windup = rand() * d.windupMax;
  return out;
}
export {}
