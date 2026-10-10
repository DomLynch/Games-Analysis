// Licence: GPL v3 with Electronic Arts additional terms (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const TICKS_PER_SECOND = 15; // game ticks per second (value read at DEFINES.H 2146; not receipted)

type Flagged = 'none' | 'win' | 'lose';
type Persist = 'volatile' | 'semi' | 'persistent';

// One side's pending outcome. A flag is set once. Blockers (objectives that must be finished before a win)
// hold a win back. Two countdowns: the outcome countdown is set only by the flag; the blocker countdown
// starts when the last blocker goes and is never restarted by a later removal.
interface Side {
  flagged: Flagged;
  blockers: number;
  graceLeft: number;        // ticks left before the flagged outcome may apply
  blockerGraceLeft: number; // ticks left after the last blocker is gone
  decided: boolean;
}

function flagWin(side: Side, graceSeconds: number): void {
  if (side.flagged !== 'none') return;   // already flagged: the countdown is not restarted
  side.flagged = 'win';
  side.graceLeft = graceSeconds * TICKS_PER_SECOND;
}

function flagLose(side: Side, graceSeconds: number): void {
  if (side.flagged === 'lose') return;   // lose replaces a pending win and starts its own countdown
  side.flagged = 'lose';
  side.graceLeft = graceSeconds * TICKS_PER_SECOND;
}

// A blocker is removed. Only the removal that empties the count starts the blocker countdown.
function blockerRemoved(side: Side, blockerGraceSeconds: number): void {
  if (side.blockers <= 0) return;
  side.blockers--;
  if (side.blockers === 0 && side.blockerGraceLeft === 0) {
    side.blockerGraceLeft = blockerGraceSeconds * TICKS_PER_SECOND;
  }
}

// Once per game tick. Returns the applied outcome at most once.
function tickOutcome(side: Side): 'win' | 'lose' | null {
  if (side.decided || side.flagged === 'none') return null;
  if (side.graceLeft > 0) side.graceLeft--;             // reaches zero (assumed; the donor's countdown class was not read)
  if (side.blockerGraceLeft > 0) side.blockerGraceLeft--;
  if (side.graceLeft > 0) return null;
  if (side.flagged === 'win' && (side.blockers > 0 || side.blockerGraceLeft > 0)) return null;
  side.decided = true;
  return side.flagged;                                  // lose ignores blockers, as in the donor
}

// Trigger persistence: a semi-persistent trigger springs only when its last holder lets go.
interface Attach {
  persist: Persist;
  holders: number;
  live: boolean;
}

function releaseHolder(t: Attach): boolean {
  if (t.persist === 'semi') {
    t.holders--;
    if (t.holders > 0) return false;
    t.persist = 'volatile';
  }
  return true;
}

// Example: a win is flagged with a 1 s grace; two blockers go. The blocker countdown starts when the
// second one goes (4 s = 60 ticks) and is not restarted by anything else. The win applies after 60 ticks.
const side: Side = { flagged: 'none', blockers: 2, graceLeft: 0, blockerGraceLeft: 0, decided: false };
flagWin(side, 1);
blockerRemoved(side, 4);
blockerRemoved(side, 4);
let result: 'win' | 'lose' | null = null;
for (let tick = 0; tick < 100 && result === null; tick++) {
  result = tickOutcome(side);
}
const hold: Attach = { persist: 'semi', holders: 2, live: true };
releaseHolder(hold);
