// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }
export interface Gib { pos: Vec3; vel: Vec3; bounces: number; lastTrailMs: number; trailDelayMs: number; alive: boolean }
export interface Env {
  groundHeight(x: number, z: number): number; // terrain height under the piece
  isWater(x: number, z: number): boolean;
  inMap(x: number, z: number): boolean;
  emitBlood(p: Vec3): void;                   // display-only trail puff
}

export const GRAVITY = -800;          // units per second squared (donor GRAVITON_GRAVITY)
export const TRAIL_MIN_MS = 200;      // donor GRAVITON_BLOOD_DELAY = 200 + rand % 100
export const BOUNCE_MIN_SPEED = 16;   // donor: abs(vy) > 16 to bounce again
export const MAX_BOUNCES = 3;         // donor: specific <= 2 before the increment

const kill = (g: Gib): boolean => { g.alive = false; return false; };

// killVel: the velocity of the killing movement (donor: facing x speed x 0.9); the jitter is added to it, as in the donor.
export function initGib(origin: Vec3, killVel: Vec3, rnd: () => number, nowMs: number): Gib {
  const jitter = (): number => 50 - Math.floor(rnd() * 100); // donor: 50 - rand() % 100
  return {
    pos: { ...origin },
    vel: { x: killVel.x + jitter(), y: 12, z: killVel.z + jitter() },
    bounces: 0,
    lastTrailMs: nowMs,
    trailDelayMs: TRAIL_MIN_MS + Math.floor(rnd() * 100),
    alive: true,
  };
}

// One display step. Returns false when the piece is removed. Paused pieces do not move.
export function stepGib(g: Gib, dt: number, env: Env, nowMs: number, paused: boolean): boolean {
  if (!g.alive) return false;
  if (paused) return true;
  g.pos.x += g.vel.x * dt;
  g.pos.y += g.vel.y * dt;
  g.pos.z += g.vel.z * dt;
  if (!env.inMap(g.pos.x, g.pos.z)) return kill(g);
  const ground = env.groundHeight(g.pos.x, g.pos.z);
  if (g.pos.y < ground && g.vel.y > 0) return kill(g); // rising under the ground: remove
  if (g.pos.y > ground + 5 && nowMs - g.lastTrailMs > g.trailDelayMs) {
    g.lastTrailMs = nowMs;
    env.emitBlood({ ...g.pos });
  }
  g.vel.y += GRAVITY * dt;
  if (g.pos.y < ground) {
    if (env.isWater(g.pos.x, g.pos.z)) return kill(g);
    if (g.vel.y < 0) {
      if (Math.abs(g.vel.y) > BOUNCE_MIN_SPEED && g.bounces < MAX_BOUNCES) {
        g.bounces++;
        g.vel.y = -g.vel.y / 2; // half the vertical speed, flipped
        g.vel.x *= 0.5;
        g.vel.z *= 0.5;
        g.pos.y = ground;
      } else {
        return kill(g); // giblets are removed without an explosion
      }
    }
  }
  return true;
}
export {};
