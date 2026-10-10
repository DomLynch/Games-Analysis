// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PhaseSpec { min: number; max: number; }            // ms; min == max means fixed

interface ClipSpec {
  phases: PhaseSpec[];
  loopCount: number;          // 0 = wrap forever; n > 0 = play n cycles then hold last; n < 0 = ping-pong
  async: boolean;             // false = synchronized: may resync from the shared clock on a long stall
  startPhase: number;         // -1 = random start phase
}

interface PlayState {
  phase: number;
  direction: number;          // ping-pong direction: 1 or -1
  loop: number;               // cycles already repeated
  duration: number;           // ms left in the current phase
  last: number;               // ms timestamp of the last tick
  complete: boolean;          // held on the last phase
}

type Rand = () => number;     // uniform in [0, 1)

// One random duration per phase use. min == max returns min.
function durationOf(clip: ClipSpec, phase: number, rand: Rand): number {
  const { min, max } = clip.phases[phase];
  return min === max ? min : min + Math.floor(rand() * (max - min + 1));
}

function start(clip: ClipSpec, now: number, rand: Rand): PlayState {
  const n = clip.phases.length;
  const phase = clip.startPhase > -1 ? clip.startPhase : Math.floor(rand() * n);
  return { phase, direction: 1, loop: 0, duration: durationOf(clip, phase, rand), last: now, complete: false };
}

// Next phase for the loop policy. Ping-pong is chosen by the sign of loopCount.
function nextPhase(s: PlayState, clip: ClipSpec): number {
  const n = clip.phases.length;
  if (clip.loopCount < 0) {
    let step = s.direction;
    if (s.phase + step < 0 || s.phase + step >= n) {
      s.direction = -s.direction;
      step = -step;
    }
    return s.phase + step;
  }
  if (s.phase + 1 < n) return s.phase + 1;
  if (clip.loopCount === 0) return 0;
  if (s.loop < clip.loopCount - 1) {
    s.loop += 1;
    return 0;
  }
  return s.phase;             // hold on the last phase: complete
}

// Synchronized resync: pick the phase from the shared clock. One draw per phase per resync (see simplified line).
function resyncFromClock(s: PlayState, clip: ClipSpec, now: number, rand: Rand): void {
  const durations = clip.phases.map((_, i) => durationOf(clip, i, rand));
  const total = durations.reduce((a, b) => a + b, 0);
  if (total <= 0) return;
  let t = now % total;
  for (let i = 0; i < durations.length; i++) {
    if (t < durations[i]) {
      s.phase = i;
      s.duration = durations[i] - t;
      s.last = now;
      return;
    }
    t -= durations[i];
  }
}

// One tick. The overrun past a phase end is carried into the next phase's duration.
function tick(s: PlayState, clip: ClipSpec, now: number, rand: Rand): number {
  if (now === s.last || s.complete) return s.phase;
  const elapsed = now - s.last;
  if (elapsed >= s.duration) {
    const next = nextPhase(s, clip);
    if (next !== s.phase) {
      const d = durationOf(clip, next, rand) - (elapsed - s.duration);
      if (d < 0 && !clip.async) {
        resyncFromClock(s, clip, now, rand);
      } else {
        s.phase = next;
        s.duration = Math.max(0, d);
      }
    } else {
      s.complete = true;
    }
  } else {
    s.duration -= elapsed;
  }
  s.last = now;
  return s.phase;
}

// Timer path: a phase from elapsed time alone, using each phase's max duration divided by a speed factor.
// No loop count, no random draw. Past the end it reports restart, and the caller restarts its timer.
function phaseAtTimer(clip: ClipSpec, elapsedMs: number, speed: number): { phase: number; restart: boolean } {
  let total = 0;
  for (let i = 0; i < clip.phases.length; i++) {
    total += clip.phases[i].max / speed;
    if (elapsedMs < total) return { phase: i, restart: false };
  }
  return { phase: clip.phases.length - 1, restart: true };
}

export {};
