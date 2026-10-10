// Licence: MIT (donor LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Idle-clip director for creature actors. Client-side cosmetic only; the engine never reads it.

interface IdleCreature {
  dueAt: number;          // ms (monotonic clock): when the next idle roll is due
  lastClipAt: number;     // ms: when this creature last started an idle clip
  minIdleMs: number;      // zone data
  maxIdleMs: number;      // zone data
  idleClipCount: number;  // zone data: how many idle clips this creature set has
  inActiveZone: boolean;  // zone chunk is loaded and live
  dead: boolean;
  inFight: boolean;
  moving: boolean;
  actionsBlocked: boolean;
}

const TICK_MS = 1000;            // engine constant: scheduler period
const MIN_CLIP_GAP_MS = 6000;    // engine constant: minimum gap between two idle clips

function canIdle(c: IdleCreature): boolean {
  return c.inActiveZone && !c.dead && !c.inFight && !c.moving && !c.actionsBlocked;
}

// Inclusive integer roll between min and max.
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// One director tick. Every creature whose roll is due is handled once.
// The next roll is always scheduled, even when the gate says no.
function idleTick(creatures: IdleCreature[], now: number, playClip: (clipIndex: number, c: IdleCreature) => void): void {
  for (const c of creatures) {
    if (now < c.dueAt) continue;
    if (canIdle(c) && now - c.lastClipAt > MIN_CLIP_GAP_MS) {
      c.lastClipAt = now;
      playClip(randInt(0, c.idleClipCount - 1), c);
    }
    c.dueAt = now + randInt(c.minIdleMs, c.maxIdleMs);
  }
}

// Enrol a creature when its zone goes live (donor: add on region activation).
function enrol(c: IdleCreature, now: number): void {
  c.dueAt = now + randInt(c.minIdleMs, c.maxIdleMs);
}
export {};
