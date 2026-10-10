// Licence: Sustainable Use License 1.0
// Licence: Sustainable Use License 1.0 (donor, non-commercial limits). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pt { x: number; y: number; }            // screen px (the donor works in tiles; this uses screen px)
interface Leash { boxX: number; boxY: number; }   // 480 and 400 px in the donor

const SCROLL_MIN_MS = 33;  // one pan step at most every 33 ms (wall clock)

// Pan throttle: returns the new last-step time if a step is allowed now, otherwise null.
function panAllowed(nowMs: number, lastMs: number): number | null {
  return nowMs - lastMs < SCROLL_MIN_MS ? null : nowMs;
}

// One camera step. Refused if it pans farther from the player on an axis and reaches the leash box,
// or if the step lands on a scroll blocker.
function canStep(next: Pt, cur: Pt, dude: Pt, leash: Leash, blocked: (p: Pt) => boolean): boolean {
  const dx = Math.abs(dude.x - next.x), dy = Math.abs(dude.y - next.y);
  const curDx = Math.abs(dude.x - cur.x), curDy = Math.abs(dude.y - cur.y);
  if ((dx > curDx || dy > curDy) && (dx >= leash.boxX || dy >= leash.boxY)) return false;
  return !blocked(next);
}

// Walk the camera centre along a precomputed path, one point per step; stop at the first refused step.
// revertOnFail = the donor's all-or-nothing flag: a partial walk returns to the start.
function scrollAlong(path: Pt[], dude: Pt, leash: Leash, blocked: (p: Pt) => boolean, revertOnFail: boolean): Pt {
  const start = path[0];
  let cur = start;
  for (let i = 1; i < path.length; i++) {
    if (!canStep(path[i], cur, dude, leash, blocked)) return revertOnFail ? start : cur;
    cur = path[i];
  }
  return cur;
}
export {};
