// Licence: GPL-3.0-or-later (donor, per LICENSE.txt and file headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec2 { x: number; y: number; }

// One resolved hit. The engine supplies damage after armour and multipliers, as the donor does.
export interface HitFx {
  damage: number;   // post-armour, post-multiplier damage actually applied
  maxHp: number;    // defender MAX HP (the donor divides by max HP, not current HP)
  from: Vec2;       // attacker centre
  to: Vec2;         // defender centre (blood is emitted here)
}

// Tunable values. Donor values shown in the comments.
export interface HitFxTune {
  bloodCap: number;     // donor 9
  spreadRad: number;    // donor pi/2 (full cone width)
  flashSec: number;     // donor 0.05
  woundSec: number;     // donor 1
}

export const DONOR_TUNE: HitFxTune = { bloodCap: 9, spreadRad: Math.PI / 2, flashSec: 0.05, woundSec: 1 };

export interface Spark { x: number; y: number; vx: number; vy: number; life: number; lifeMax: number; size: number; }

// Particle count grows with the square root of the damage share and is capped.
export function bloodCount(damage: number, maxHp: number, t: HitFxTune): number {
  if (damage <= 0 || maxHp <= 0) return 0;
  return Math.floor(Math.min(t.bloodCap * Math.sqrt(damage / maxHp), t.bloodCap));
}

// Spray away from the attacker: direction attacker -> defender, cone centred on it.
export function spawnBlood(fx: HitFx, t: HitFxTune, rand: () => number = Math.random): Spark[] {
  const n = bloodCount(fx.damage, fx.maxHp, t);
  const dir = Math.atan2(fx.to.y - fx.from.y, fx.to.x - fx.from.x);
  const out: Spark[] = [];
  for (let i = 0; i < n; i++) {
    const a = dir + (rand() - 0.5) * t.spreadRad;
    const speed = 40 + rand() * 40;
    const life = 0.5 + rand() * 0.5;
    out.push({ x: fx.to.x, y: fx.to.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
               life, lifeMax: life, size: 4 });
  }
  return out;
}

// Per-frame step: gravity-like pull on y, size shrinks with remaining life. Returns false when spent.
export function stepSpark(s: Spark, dt: number): boolean {
  s.life -= dt;
  if (s.life <= 0) return false;
  s.vy += 100 * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.size = 4 * (s.life / s.lifeMax);
  return true;
}

// Wound decal: alpha = sqrt(p) and horizontal stretch 1 + p, where p falls from 1 to 0 over woundSec.
export function woundFrame(ageSec: number, t: HitFxTune): { alpha: number; scaleX: number } | null {
  const left = t.woundSec - ageSec;
  if (left <= 0) return null;
  const p = left / t.woundSec;
  return { alpha: Math.sqrt(p), scaleX: 1 + p };
}

// Hit flash on the defender: white tint for flashSec, counted down per frame.
export function stepFlash(flashLeft: number, dt: number): number {
  return flashLeft > 0 ? Math.max(0, flashLeft - dt) : 0;
}
export {};
