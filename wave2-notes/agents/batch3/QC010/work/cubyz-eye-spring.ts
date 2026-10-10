// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Spring { pos: number; vel: number; k: number; lambda: number; }

// Exact closed-form step of x'' + lambda*x' + k*x = 0 over dt. Three real cases are written out.
function stepSpring(s: Spring, dt: number): void {
  const a = s.lambda / 2;
  const disc = a * a - s.k;            // negative when underdamped
  const x0 = s.pos, v0 = s.vel;
  if (disc < -1e-12) {                 // underdamped: decaying oscillation
    const w = Math.sqrt(-disc);
    const e = Math.exp(-a * dt), c = Math.cos(w * dt), sn = Math.sin(w * dt);
    const B = (v0 + a * x0) / w;
    s.pos = e * (x0 * c + B * sn);
    s.vel = e * (v0 * c - (a * B + w * x0) * sn);
  } else if (disc > 1e-12) {           // overdamped: two real roots
    const q = Math.sqrt(disc);
    const r1 = -a + q, r2 = -a - q;
    const C1 = (v0 - r2 * x0) / (r1 - r2), C2 = x0 - C1;
    const e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
    s.pos = C1 * e1 + C2 * e2;
    s.vel = C1 * r1 * e1 + C2 * r2 * e2;
  } else {                             // critically damped
    const e = Math.exp(-a * dt), B = v0 + a * x0;
    s.pos = e * (x0 + B * dt);
    s.vel = e * (v0 - a * B * dt);
  }
}

// Stiffness from the eye box extent: k = 400 / (max - min), damping lambda = 30 (per axis).
function eyeSpring(extent: number): Spring {
  return { pos: 0, vel: 0, k: 400 / extent, lambda: 30 };
}

// One client frame, in the donor order: springs integrate first, then a step-up drops the eye and kicks it.
function eyeFrame(eye: Spring[], dt: number, stepUp: number, bodySpeed: number): void {
  for (const s of eye) stepSpring(s, dt);
  if (stepUp > 0) {
    eye[2].vel = Math.max(1.5 * bodySpeed, eye[2].vel, 4);
    eye[2].pos -= stepUp;
  }
}

// Crouch blend: the percentage moves at 10 per second while on the ground, then smoothstep.
function crouchPercStep(perc: number, crouching: boolean, onGround: boolean, dt: number): number {
  if (!onGround) return perc;
  const next = perc + (crouching ? dt * 10 : -dt * 10);
  return Math.min(1, Math.max(0, next));
}
function crouchSmooth(perc: number): number {
  const t = Math.min(1, Math.max(0, perc));
  return t * t * (3 - 2 * t);
}
export {}
