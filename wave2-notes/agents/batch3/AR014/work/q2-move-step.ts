// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const FRAME_S = 0.1; // seconds per animation step (donor define, server time)

export interface Step {
  act?: (self: Mon, dist: number) => void; // per-frame motion/AI hook; dist is the authored root-motion distance, scaled
  dist: number;                             // authored distance for this frame
  onFrame?: (self: Mon) => void;            // per-frame event, e.g. the attack that fires on this frame
}

export interface Move {
  first: number;
  last: number;
  steps: Step[];                  // one entry per frame from first to last
  end?: (self: Mon) => void;      // runs when the last frame is reached; may switch the move
}

export interface Mon {
  frame: number;
  move: Move;
  queued: number;   // requested frame inside the current move; 0 = none
  hold: boolean;    // hold the current frame (no advance, no motion)
  scale: number;    // per-monster scale on the distances
  dead: boolean;
}

// One animation step at server time `now`. Returns the time of the next step.
export function stepMove(m: Mon, now: number): number {
  const next = now + FRAME_S;
  let move = m.move;
  if (m.queued !== 0 && m.queued >= move.first && m.queued <= move.last) {
    m.frame = m.queued;
    m.queued = 0;
  } else {
    if (m.frame === move.last && move.end) {
      move.end(m);
      move = m.move;            // the end hook may have switched the move
      if (m.dead) return next;
    }
    if (m.frame < move.first || m.frame > move.last) {
      m.hold = false;
      m.frame = move.first;
    } else if (!m.hold) {
      m.frame++;
      if (m.frame > move.last) m.frame = move.first;
    }
  }
  const step = move.steps[m.frame - move.first];
  if (step.act) step.act(m, m.hold ? 0 : step.dist * m.scale);
  if (step.onFrame) step.onFrame(m);
  return next;
}

export {};
