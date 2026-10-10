// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// One step = a fixed run of presentation ticks. The same phase drives the gait frame, the
// drawn offset, the footstep cues, and (for on-screen steps) the commit of the logical tile.

interface Step {
  phase: number;      // ticks elapsed in this step
  mid: number;        // on-screen only: tick where the logical tile is committed
  end: number;        // tick where the step finishes
  onScreen: boolean;  // off-screen steps skip the animation
  committed: boolean; // logical tile already at destination
}

const TICK_MS = 30;   // donor default for the step interval (player and alien), tunable data

function startStep(diagonal: boolean, onScreen: boolean): Step {
  const d = diagonal ? 2 : 1;                            // diagonal = double-length step
  if (!onScreen) return { phase: 0, mid: 0, end: 2, onScreen, committed: true }; // jump, 2 ticks
  return { phase: 0, mid: 4 * d, end: 8 * d, onScreen, committed: false };
}

// One presentation tick. Returns the gait frame (0..7) and whether a footstep cue fires.
function tickStep(s: Step): { done: boolean; frame: number; footstep: boolean } {
  s.phase += 1;
  if (!s.committed && s.phase === s.mid) s.committed = true;
  const frame = s.phase % 8;
  const footstep = s.onScreen && (frame === 3 || frame === 7);
  return { done: s.phase >= s.end, frame, footstep };
}

// Drawn offset in the donor's own units (2 per phase): zero at start, switches reference tile at mid.
function drawOffset(s: Step): number {
  return s.phase < s.mid ? s.phase * 2 : (s.phase - s.end) * 2;
}
export {};
