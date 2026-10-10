// Licence: Valve Half-Life 1 SDK (root LICENSE; pm_shared.c header: "All other use, distribution, or modification is prohibited"). Clean-room sketch of the mechanism only.
interface InputCmd {
  msec: number;                  // duration of this input in ms (donor: usercmd_s.msec)
  forward: number;               // requested velocities (donor: forwardmove, sidemove, upmove)
  side: number;
  up: number;
  seed: number;                  // per-input random seed (donor: CmdStart random_seed)
}

interface MoveState {
  maxSpeed: number;
  frozen: boolean;               // frozen, on a train or dead: input is zeroed
  stepSoundMs: number;
  duckMs: number;
  pos: number;                   // 1-D stand-in for the 3-D position
  vel: number;
}

// Shared random: a pure function of the seed, so client prediction and server agree on the result.
function sharedRandom(seed: number, low: number, high: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  const offset = (h & 0xffff) / 65536;
  return low + offset * (high - low);
}

// One input, applied in the donor's order: speed-ratio clamp, frozen zeroing, timers run down by the
// input's own msec, then the move over the same msec.
function applyInput(st: MoveState, cmd: InputCmd): void {
  let f = cmd.forward;
  let s = cmd.side;
  let u = cmd.up;
  const spd = Math.sqrt(f * f + s * s + u * u);
  if (spd !== 0 && spd > st.maxSpeed) {
    const ratio = st.maxSpeed / spd;
    f *= ratio; s *= ratio; u *= ratio;
  }
  if (st.frozen) { f = 0; s = 0; u = 0; }

  const dtS = cmd.msec * 0.001;
  st.stepSoundMs = Math.max(0, st.stepSoundMs - cmd.msec);
  st.duckMs = Math.max(0, st.duckMs - cmd.msec);

  st.vel = f;
  st.pos += st.vel * dtS;
}

export {}
