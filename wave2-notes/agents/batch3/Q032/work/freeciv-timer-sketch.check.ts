// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the mechanism, not a translation of the donor code.
export const MAX_TIMEOUT_SEC = 8_639_999; // engine constant: longest allowed turn timeout

export interface Escalation {
  timeoutSec: number;    // current turn timeout in seconds; 0 means no timer
  incSec: number;        // added to timeoutSec each time the schedule fires
  incMult: number;       // incSec is multiplied by this after each firing
  everyTurns: number;    // fire every N turns; 0 disables the schedule
  everyTurnsInc: number; // after each firing, everyTurns grows by this
  counter: number;       // turns since the last firing; 1 right after a change
}

// Called once at the end of each turn. Returns the timeout for the next turn.
export function updateTimeout(e: Escalation): number {
  if (e.timeoutSec < 1 || e.everyTurns === 0) return e.timeoutSec;
  if (e.counter >= e.everyTurns) {
    e.timeoutSec += e.incSec;
    e.incSec *= e.incMult;
    e.counter = 1;
    e.everyTurns += e.everyTurnsInc;
    if (e.timeoutSec > MAX_TIMEOUT_SEC) {
      e.timeoutSec = MAX_TIMEOUT_SEC;
      e.everyTurns = 0;
      e.incSec = 0;
    } else if (e.timeoutSec < 0) {
      e.timeoutSec = 0;
    }
  } else {
    e.counter++;
  }
  return e.timeoutSec;
}

// The phase deadline is an absolute time (seconds since phase start). It only moves later.
export interface PhaseClock {
  elapsedSec: number;  // wall seconds since the phase started (the caller advances it)
  deadlineSec: number; // phase ends when elapsedSec passes this
}

// An enemy in sight moved: the deadline becomes at least `minSec` from now (never earlier).
export function onEnemyMoveSeen(p: PhaseClock, turnTimeoutSec: number, minSec: number): void {
  if (turnTimeoutSec <= 0 || minSec <= 0) return;
  const want = p.elapsedSec + minSec;
  if (want > p.deadlineSec) p.deadlineSec = want;
}

// The caller checks this on each idle second and after each batch of input.
export function phaseExpired(turnTimeoutSec: number, p: PhaseClock): boolean {
  return turnTimeoutSec > 0 && p.deadlineSec > 0 && p.elapsedSec > p.deadlineSec;
}

export {};
