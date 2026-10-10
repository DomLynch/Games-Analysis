// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Vec3 = { x: number; y: number; z: number };

// Seconds of unspent movement credit. Real time drains it; each accepted move adds its cost.
class MovePool {
  private pool: number;
  private max: number;
  constructor(max: number) { this.max = max; this.pool = max; }
  setMax(max: number): void { this.max = max; if (this.pool > max) this.pool = max; }
  drain(dt: number): void { this.pool = Math.max(0, this.pool - dt); }
  grab(cost: number): boolean {
    if (cost <= 0) return true;
    if (this.pool + cost > this.max) return false;
    this.pool += cost;
    return true;
  }
  refill(): void { this.pool = this.max; }
}

interface MoveCaps {
  walk: number; crouch: number; fast: number; // units/s, already scaled by the per-player override
  fastPriv: boolean;
  jump: number; climb: number;                // units/s
  overrideH: number; overrideV: number;       // temporary extra speed, 0 when none
}

interface MoveState {
  pool: MovePool;
  lastGood: Vec3;
  sinceTeleport: number; // s
  lagMax: number;        // s, grace before a rejected move is flagged
  tolerance: number;     // >= 1
  enabled: boolean;
}

interface MoveResult { pos: Vec3; accepted: boolean; flagged: boolean; }

// Once per server step, before any packets are checked.
function tick(s: MoveState, dt: number): void {
  s.pool.drain(dt);
  s.sinceTeleport += dt;
}

// Server-side placement (teleport, respawn): resets the grace and refills the pool.
function teleport(s: MoveState, to: Vec3): void {
  s.lastGood = to;
  s.pool.refill();
  s.sinceTeleport = 0;
}

// One client position claim.
function checkMove(s: MoveState, claimed: Vec3, caps: MoveCaps): MoveResult {
  if (!s.enabled) { s.lastGood = claimed; return { pos: claimed, accepted: true, flagged: false }; }

  const dH = Math.hypot(claimed.x - s.lastGood.x, claimed.z - s.lastGood.z);
  const dV = claimed.y - s.lastGood.y;

  let maxWalk = caps.fastPriv ? Math.max(caps.walk, caps.crouch, caps.fast) : Math.max(caps.walk, caps.crouch);
  maxWalk = Math.max(maxWalk, caps.overrideH, 0.0001);
  const maxJump = Math.max(caps.jump * 2, caps.climb, caps.overrideV, 0.0001);

  let cost = dH / maxWalk;                                            // seconds at top walk speed
  if (dV > 0) cost = Math.max(cost, dV / Math.max(maxJump, maxWalk)); // downward moves are not checked
  cost /= Math.max(s.tolerance, 1);

  if (s.pool.grab(cost)) {
    s.lastGood = claimed;
    return { pos: claimed, accepted: true, flagged: false };
  }
  // Rewind to the last accepted point. Flag only outside the teleport grace window.
  return { pos: s.lastGood, accepted: false, flagged: s.sinceTeleport > s.lagMax };
}

export {}
