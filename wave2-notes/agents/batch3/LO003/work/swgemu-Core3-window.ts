// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// All times are epoch seconds on ONE clock: `now` is passed in, so the countdown and the scheduler read the same value.

export interface WindowSpec {
  periodSec: number;    // time from one window start to the next (zone data)
  durationSec: number;  // how long a window stays open (zone data)
}

export interface WindowState {
  lastStart: number;    // start of the most recent window
  nextStart: number;    // start of the next window, always after `now`
  end: number;          // end of the open window, or of the next one if none is open
  open: boolean;
}

// Restart / catch-up: move the stored start forward by whole periods until the next
// start lies in the future, then derive the open flag and the end time.
export function catchUp(spec: WindowSpec, storedStart: number, now: number): WindowState {
  if (spec.periodSec <= 0) throw new Error("periodSec must be > 0");  // guard: a zero period would loop forever
  let start = storedStart;
  while (start + spec.periodSec <= now) {
    start += spec.periodSec;
  }
  const nextStart = start + spec.periodSec;
  const open = start + spec.durationSec > now;
  const end = open ? start + spec.durationSec : nextStart + spec.durationSec;
  return { lastStart: start, nextStart, end, open };
}

// Delay for a timer that fires at an absolute epoch second. A target already in the past fires at once.
export function delayMs(targetSec: number, now: number): number {
  return Math.max(0, (targetSec - now) * 1000);
}

// Countdown as the player reads it: whole days and hours, minutes rounded up.
export function countdownParts(nextStart: number, now: number): { days: number; hours: number; minutes: number } {
  let dif = Math.max(0, nextStart - now);
  const days = Math.floor(dif / 86400);
  dif -= days * 86400;
  const hours = Math.floor(dif / 3600);
  dif -= hours * 3600;
  const minutes = Math.ceil(dif / 60);
  return { days, hours, minutes };
}

// Retry delay when the server is not yet online: 60 + 0..29 seconds (random01 in [0, 1)).
export function offlineRetryMs(random01: number): number {
  return (60 + Math.floor(random01 * 30)) * 1000;
}

export {};
