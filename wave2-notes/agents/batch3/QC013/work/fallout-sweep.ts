// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the shape only, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }

const LEASH_X = 480;   // donor leash box, horizontal (donor units: screen px)
const LEASH_Y = 400;   // donor leash box, vertical
const MAX_PATH = 200;  // donor path capacity
const PAN_GAP_MS = 33; // donor pan throttle

// Leash rule: a focus that moves farther from the hero on either axis is refused once it is
// at or beyond the box. Moving back toward the hero is always allowed.
function leashAllows(hero: Pt, cur: Pt, next: Pt): boolean {
  const dxNext = Math.abs(hero.x - next.x);
  const dyNext = Math.abs(hero.y - next.y);
  const dxCur = Math.abs(hero.x - cur.x);
  const dyCur = Math.abs(hero.y - cur.y);
  const farther = dxNext > dxCur || dyNext > dyCur;
  if (!farther) return true;
  return !(dxNext >= LEASH_X || dyNext >= LEASH_Y);
}

// Sample points along the straight line from `from` (exclusive) to `to` (inclusive), capped.
function lineSamples(from: Pt, to: Pt, cap: number): Pt[] {
  const steps = Math.min(cap, Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)));
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: Math.round(from.x + (to.x - from.x) * t), y: Math.round(from.y + (to.y - from.y) * t) });
  }
  return out;
}

// Donor tile_scroll_to shape: step from the current focus toward the target one sample at a time,
// stop before the first sample that is blocked or leashed. If allOrNothing and the target was not
// reached, return the start (donor flag 0x01 revert).
export function sweepFocus(start: Pt, target: Pt, hero: Pt, blocked: (p: Pt) => boolean, allOrNothing: boolean): Pt {
  let cur = start;
  const samples = lineSamples(start, target, MAX_PATH);
  for (const p of samples) {
    if (blocked(p) || !leashAllows(hero, cur, p)) break;
    cur = p;
  }
  const reached = cur.x === target.x && cur.y === target.y;
  return allOrNothing && !reached ? start : cur;
}

// Donor pan throttle: a pan step is allowed only when at least PAN_GAP_MS have passed.
export function panAllowed(nowMs: number, lastMs: number): boolean {
  return nowMs - lastMs >= PAN_GAP_MS;
}

export {};
