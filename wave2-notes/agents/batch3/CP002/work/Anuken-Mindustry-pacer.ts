// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface PacerState {
  nextFrameMs: number;    // schedule anchor on a monotonic clock, in ms
  lastTargetFps: number;  // -1 = not set yet
}

function newPacer(nowMs: number): PacerState {
  return { nextFrameMs: nowMs, lastTargetFps: -1 };
}

// Start of frame. A target of 0 or above 240 means uncapped. A changed target re-anchors the schedule to now.
function beginFrame(s: PacerState, nowMs: number, targetFps: number): void {
  const limit = targetFps > 0 && targetFps <= 240;
  const changed = s.lastTargetFps !== targetFps && s.lastTargetFps !== -1;
  s.lastTargetFps = targetFps;
  if (limit && !changed) {
    s.nextFrameMs += 1000 / targetFps;   // advance the schedule by one period
  } else {
    s.nextFrameMs = nowMs;               // uncapped or just changed: no catch-up
  }
}

// End of frame. Returns ms to wait before the next frame (0 = run now).
// Fix over the donor: if a long frame left the schedule more than one period behind, re-anchor to now,
// so the next frames are not all run back to back without a wait.
function endFrameWaitMs(s: PacerState, nowMs: number, targetFps: number): number {
  const limit = targetFps > 0 && targetFps <= 240;
  if (!limit) return 0;
  const period = 1000 / targetFps;
  if (s.nextFrameMs < nowMs - period) s.nextFrameMs = nowMs;   // fix: clamp the catch-up
  return Math.max(0, s.nextFrameMs - nowMs);
}

// Time-sliced loading: run queued load steps until the slice (50 ms, i.e. 1000 / 20, per loading frame) is used.
// Each step returns true when that item is finished. Returns true when the queue is empty.
function loadSlice(queue: Array<() => boolean>, sliceMs: number, nowMs: () => number): boolean {
  const end = nowMs() + sliceMs;
  while (queue.length > 0 && nowMs() < end) {
    const step = queue[0];
    if (step()) queue.shift();
  }
  return queue.length === 0;
}

// Usage sketch (not part of the donor): frame = beginFrame; work; wait = endFrameWaitMs; schedule the next frame after wait ms.
const pacer = newPacer(0);
beginFrame(pacer, 0, 30);
const waitMs = endFrameWaitMs(pacer, 5, 30);
const done = loadSlice([() => true], 50, () => 0);
console.log(waitMs, done);

export {};
