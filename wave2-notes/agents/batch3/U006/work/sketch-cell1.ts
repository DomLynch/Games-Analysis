// Licence: BSD-2-Clause (donor). Shape only, written from the described mechanism.
// Times are ms on one monotonic clock per frame (donor: Time.Ticks).

const BASE_FRAME_MS = 80;   // donor CHARACTER_ANIMATION_DELAY (data: clip timing default)
const STEP_MS_WALK = 400;   // donor STEP_DELAY_WALK
const STEP_MS_RUN = 200;    // donor STEP_DELAY_RUN

interface Clip {
  frames: number;       // frames in the clip (0 = nothing to play)
  frame: number;        // current frame index
  frameMs: number;      // ms per frame; server-driven clips use BASE * (interval + 2)
  nextAt: number;       // ms when the next frame is due
  repeatLeft: number;   // 0 = loop forever
  restartAfter: boolean;// donor _animationRepeat: reload the count once, then loop forever
  done: boolean;        // clip ended; the caller returns to its idle group
}

// One frame at most per call, and only when due: no catch-up after a long gap (donor behaviour).
function tickClip(c: Clip, now: number): void {
  if (c.done || c.frames === 0 || now < c.nextAt) return;
  c.frame += 1;
  if (c.frame >= c.frames) {
    c.frame = 0;                         // wrap; the count is spent once per wrap
    if (c.repeatLeft !== 0) {
      c.repeatLeft -= 1;
      if (c.repeatLeft === 0) {
        if (c.restartAfter) c.restartAfter = false; // donor: loops forever from here
        else c.done = true;                          // donor: SetAnimation(0xFF)
      }
    }
  }
  c.nextAt = now + c.frameMs;
}

function serverClipFrameMs(interval: number): number {
  return BASE_FRAME_MS * (interval + 2);   // donor: delay += delay * (interval + 1)
}

// Step progress: the offset is linear in the elapsed share of the step; the step is removed at maxMs.
function stepProgress(elapsedMs: number, run: boolean): { t: number; finished: boolean } {
  const maxMs = run ? STEP_MS_RUN : STEP_MS_WALK;
  return { t: Math.min(elapsedMs / maxMs, 1), finished: elapsedMs >= maxMs };
}

// Pixel offset along one axis for this step; pxPerTile is 22 or 44 per the donor's direction table.
function stepOffsetPx(t: number, pxPerTile: number): number {
  return t * pxPerTile;
}

// On removal the next step's clock starts at the removal time, not at its scheduled time (donor LastStepTime).
function finishStep(now: number): number {
  return now;
}
export {}
