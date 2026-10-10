// Licence: BSD-2-Clause (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PI = Math.PI;
const TICKS_PER_SECOND = 50;   // donor: TICKS_PER_SECOND 50 (game.hpp)
const WINDUP_TICKS = 9;        // donor: ANIMATE_DURATION_WINDUP = 9 (monster.hpp)
const TWO_PI = 2 * PI;

interface Step { angle: number; reached: boolean; }

// One fixed tick of a joint tween. The caller passes a rate whose sign points from angle toward setpoint.
// Within one rate step of the target, snap onto it and report reached; otherwise advance by rate.
function stepJoint(angle: number, rate: number, setpoint: number, speedMult: number): Step {
  let a = angle % TWO_PI;
  if (a < 0) a += TWO_PI;
  const r = rate * speedMult;
  const near = r > 0
    ? (a <= setpoint + r && a >= setpoint - r)
    : (a >= setpoint + r && a <= setpoint - r);
  if (near) return { angle: setpoint, reached: true };
  return { angle: a + r, reached: false };
}

// Attack timer for one monster. pose 0 = idle; counts up only while pose is in 1..maxTickedPose.
interface Attack { pose: number; ticks: number; }

function tickAttackTimer(a: Attack, maxTickedPose: number): void {
  if (a.pose > 0 && a.pose <= maxTickedPose) a.ticks += 1;
  else if (a.pose === 0) a.ticks = 0;
  // any other value: hold the counter
}

// The strike is due when the counter reaches the windup length, scaled by the global speed multiplier (10 = 1.0x).
function strikeDue(a: Attack, windupTicks: number, speedMult10: number): boolean {
  return a.ticks >= windupTicks / (speedMult10 / 10);
}

// Walk cycle for one limb. dist is the monster's speed this tick; stride is radians per unit of distance.
interface Walk { pitch: number; phase: 0 | 1; }
const WALK_CLAMP = PI / 4;

function walkTick(w: Walk, dist: number, stride: number): void {
  if (dist > 0.1) {
    if (w.phase === 0) {
      w.pitch -= dist * stride;
      if (w.pitch < -WALK_CLAMP) { w.pitch = -WALK_CLAMP; w.phase = 1; }
    } else {
      w.pitch += dist * stride;
      if (w.pitch > WALK_CLAMP) { w.pitch = WALK_CLAMP; w.phase = 0; }
    }
  } else {
    const ease = 1 / Math.max(dist * 0.1, 10);
    if (w.pitch < 0) w.pitch = Math.min(0, w.pitch + ease);
    else if (w.pitch > 0) w.pitch = Math.max(0, w.pitch - ease);
  }
}

// Demo: a chop windup of 9 ticks at 50 ticks/s, then the strike.
const atk: Attack = { pose: 4, ticks: 0 };
let arm = { pitch: 0 };
let fired = false;
for (let t = 0; t < 20 && !fired; t++) {
  tickAttackTimer(atk, 15);
  const s = stepJoint(arm.pitch, -0.25, 5 * PI / 4, 1);
  arm.pitch = s.angle;
  if (strikeDue(atk, WINDUP_TICKS, 10)) fired = true;
}
const w: Walk = { pitch: 0, phase: 0 };
walkTick(w, 0.5, 0.13);

export {};
