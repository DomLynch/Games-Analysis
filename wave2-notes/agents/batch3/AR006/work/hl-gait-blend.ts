// Licence: Valve, Half-Life 1 SDK LICENSE (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CROSSFADE_S = 0.2;        // donor: 0.2 s window between sequences (StudioSetupBones)
const REVERSE_LIMIT_DEG = 120;  // donor: maxyaw = 120.0 (StudioProcessGait)

interface Gait {
  moveYaw: number;     // degrees, direction of travel (donor: gaityaw)
  cycle: number;       // gait frame within the cycle (donor: gaitframe)
  blendByte: number;   // 0..255 strafe selector (donor: blending[0])
}

function wrap180(d: number): number {
  let x = ((d % 360) + 360) % 360;
  if (x > 180) x -= 360;
  return x;
}

// One tick of the gait. facing and velocity are the entity's; dt is the tick length in seconds.
// cycleLen is the distance per gait cycle (> 0); numFrames is the cycle length in frames.
function updateGait(g: Gait, facing: number, vx: number, vy: number,
                    dt: number, cycleLen: number, numFrames: number): void {
  let move = Math.hypot(vx, vy) * dt;

  if (vx === 0 && vy === 0) {
    // Stationary: ease the travel yaw toward the facing yaw. Factor 4*dt below 0.25 s, else dt.
    let diff = wrap180(facing - g.moveYaw);
    diff *= dt < 0.25 ? dt * 4 : dt;
    g.moveYaw = wrap180(g.moveYaw + diff);
    move = 0;
  } else {
    g.moveYaw = Math.atan2(vy, vx) * 180 / Math.PI;
  }

  let flYaw = wrap180(facing - g.moveYaw);
  // Facing far from travel (over 120 degrees): play the cycle backwards and turn the travel yaw round.
  if (flYaw > REVERSE_LIMIT_DEG) { g.moveYaw -= 180; move = -move; flYaw -= 180; }
  else if (flYaw < -REVERSE_LIMIT_DEG) { g.moveYaw += 180; move = -move; flYaw += 180; }

  // Map -90..+90 degrees onto 0..255 (127 is straight ahead), then invert.
  let b = (flYaw / 90) * 128 + 127;
  b = Math.max(0, Math.min(255, b));
  g.blendByte = Math.trunc(255 - b);

  // Distance-driven cycle: feet advance with ground covered, not with time.
  g.cycle += (move / cycleLen) * numFrames;
  g.cycle -= Math.trunc(g.cycle / numFrames) * numFrames;
  if (g.cycle < 0) g.cycle += numFrames;
}

type Pose = number[];

function lerpPose(a: Pose, b: Pose, s: number): Pose {
  return a.map((v, i) => v + (b[i] - v) * s);
}

// Pick the strafe pose from three stored blocks (left, middle, right) by the blend byte.
// Donor does not clamp s; its maximum is 256/255, a slight extrapolation at byte 255.
function blendPose(byte: number, left: Pose, mid: Pose, right: Pose): Pose {
  if (byte <= 127) return lerpPose(left, mid, (byte * 2) / 255);
  return lerpPose(mid, right, (2 * (byte - 127)) / 255);
}

// Cross-fade weight on the previous clip: 1 at the switch, 0 after 0.2 s.
function prevClipWeight(now: number, switchedAt: number): number {
  return now - switchedAt < CROSSFADE_S ? 1 - (now - switchedAt) / CROSSFADE_S : 0;
}

// Demo: walk forward, then turn to face sideways and run a tick.
const g: Gait = { moveYaw: 0, cycle: 0, blendByte: 0 };
updateGait(g, 0, 4, 0, 0.02, 16, 64);
updateGait(g, 90, 4, 0, 0.02, 16, 64);
const pose = blendPose(g.blendByte, [0, 0], [1, 1], [2, 2]);
const w = prevClipWeight(0.1, 0);

export {};
