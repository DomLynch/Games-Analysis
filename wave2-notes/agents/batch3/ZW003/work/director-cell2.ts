// Licence: BSD 3-clause (donor, OpenBOR LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Entry = { at: number } & (
  | { kind: "spawn"; minPlayers: number; make: () => boolean } // make() false = failed to place
  | { kind: "group"; min: number; max: number }
  | { kind: "wait" });

interface Director {
  entries: Entry[];       // in file order; sketch assumes ascending `at`
  next: number;           // index of the next entry to consume
  groupMin: number;       // refill starts below this many live enemies (donor default 100)
  groupMax: number;       // refill stops at this many (donor default 100)
  waiting: boolean;       // arena lock: scroll frozen until no enemy is left
  clock: number;          // scroll clock that entries are keyed to (donor level->pos)
  players: number;        // live player count
  enemies: () => number;  // live enemies, not counting corpses
}

// One director step. Spawn entries obey the band (refill only below groupMin, up to groupMax).
// Wait and group entries are applied as soon as they are due, whatever the band.
// A due spawn that cannot be placed stays at the head of the queue for the next step.
function directorStep(d: Director): void {
  const belowMin = d.enemies() < d.groupMin;
  while (d.next < d.entries.length && d.clock >= d.entries[d.next].at) {
    const e = d.entries[d.next];
    if (e.kind === "spawn") {
      if (!belowMin || d.enemies() >= d.groupMax) break; // band: wait for the count to fall below min, fill to max
      if (e.minPlayers <= d.players) {
        if (!e.make()) break; // not placed: keep the entry due (donor consumes it)
      } // else: entry is for a bigger party; skipped and consumed, as in the donor
    } else if (e.kind === "wait") {
      d.waiting = true;
    } else {
      d.groupMin = e.min;
      d.groupMax = e.max;
    }
    d.next++;
  }
}

interface Scroll { x: number; width: number; screen: number; speed: number; minX: number; maxX: number; }

// Camera target from the players' x positions: midpoint, or hold when the spread is wider than the screen.
function cameraTarget(xs: number[], x: number, screen: number, offset: number): number {
  if (xs.length === 0) return x;
  const spread = Math.max(...xs) - Math.min(...xs);
  if (spread > screen) return x;
  return (Math.max(...xs) + Math.min(...xs)) / 2 - screen / 2 + offset;
}

// Moves toward the target, clamped to bounds and limited to `speed` per step. Returns true when pinned at the far end.
function scrollStep(s: Scroll, target: number, allowBack: boolean): boolean {
  let to = Math.min(Math.max(target, s.minX), s.maxX);
  if (to > s.x) {
    if (to > s.x + s.speed) to = s.x + s.speed;
    s.x = to;
  } else if (allowBack && to < s.x) {
    if (to < s.x - s.speed) to = s.x - s.speed;
    s.x = to;
  }
  if (s.x < 0) s.x = 0;
  if (s.x >= s.width - s.screen) {
    s.x = s.width - s.screen;
    return true;
  }
  return false;
}

// One update step, in donor order: director, then the arena-lock release, then the scroll.
// The scroll clock follows the camera; while pinned at the end it still advances one unit per step, so due entries still release.
function tick(d: Director, s: Scroll, xs: number[], offset: number): void {
  directorStep(d);
  if (d.waiting && d.enemies() === 0) d.waiting = false; // donor: lock ends when no enemy is left
  if (d.waiting) return; // arena lock freezes the scroll and the clock
  const pinned = scrollStep(s, cameraTarget(xs, s.x, s.screen, offset), false);
  d.clock = pinned ? d.clock + 1 : Math.floor(s.x);
}

export {};
