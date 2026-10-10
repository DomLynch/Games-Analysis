// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One rig joint (a head, an arm, a turret barrel) that turns toward a target at a capped rate, inside an arc.
// Units here are seconds and degrees; the donor counts frames.

interface AimJoint {
  yawDeg: number;             // current yaw of the joint, relative to its parent (degrees)
  turnRateDegPerSec: number;  // base turn speed, from creature or weapon data (degrees per second)
  turnMultiplier: number;     // 1 + creature-wide bonus, plus this joint's own bonus (ratio)
  minArcDeg: number;          // lower limit, relative to the parent
  maxArcDeg: number;          // upper limit, relative to the parent
  omnidirectional: boolean;   // true = no limits (a free-spinning mount)
}

interface Candidate {
  angleDeg: number;           // signed angle from the current yaw to the aim point
  inArc: boolean;             // true if the aim point lies inside the joint's arc
  rendezvousSec: number;      // time for a shot to reach the aim point (seconds)
}

// Degrees the joint may turn in one step of dt seconds.
function maxTurnDeg(j: AimJoint, dt: number): number {
  return j.turnRateDegPerSec * j.turnMultiplier * dt;
}

// Move the joint toward a target yaw, at most its turn rate per step, never past its arc.
// Snaps exactly onto the clamped target when it is within reach.
function stepAim(j: AimJoint, targetDeg: number, dt: number): number {
  const goal = j.omnidirectional
    ? targetDeg
    : Math.min(j.maxArcDeg, Math.max(j.minArcDeg, targetDeg));
  const delta = goal - j.yawDeg;
  const limit = maxTurnDeg(j, dt);
  j.yawDeg += Math.max(-limit, Math.min(limit, delta));
  return j.yawDeg;
}

// Choose the aim point. Score = time to turn + weighted time to hit. A target outside the
// arc gets a penalty of 2 shot lifetimes. The 180-degree weight converts turn time into hit time.
function pickTarget(j: AimJoint, cands: Candidate[], lifetimeSec: number): Candidate | undefined {
  const rate = maxTurnDeg(j, 1); // degrees per second
  if (rate <= 0) return undefined;
  let best: Candidate | undefined;
  let bestScore = Infinity;
  for (const c of cands) {
    let rendezvous = Math.max(0, c.rendezvousSec - lifetimeSec);
    if (!c.inArc) rendezvous += 2 * lifetimeSec;
    const turnTime = Math.abs(c.angleDeg) / rate;
    const score = turnTime + (180 / rate) * rendezvous;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
