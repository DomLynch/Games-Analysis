// Licence: Sustainable Use License 1.0 (donor repo LICENSE.md; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_MS = 50;            // tick length (= 1000 / tick rate; 50 ms default)
const MAX_TICKS_PER_CALL = 3;  // ticks run per call of the loop, outside startup
const RESET_AFTER_TICKS = 10;  // a backlog longer than this is dropped when nobody else is connected

class TickClock {
  private last: number;        // due time of the next tick, ms

  constructor(now: number) {
    this.last = now;
  }

  // Run the ticks that are due in this call. Returns how many ran.
  run(now: number, playersConnected: number, onTick: () => boolean): number {
    let ran = 0;
    while (ran < MAX_TICKS_PER_CALL) {
      let elapsed = now - this.last;
      if (elapsed > RESET_AFTER_TICKS * TICK_MS && playersConnected <= 1) {
        this.last = now;      // alone: drop the backlog instead of bursting
        elapsed = 0;
      }
      if (elapsed < 0) break; // not due yet
      this.last += TICK_MS;   // the schedule moves by one step, not to 'now'
      ran++;
      if (!onTick()) break;   // a tick that cannot run (missing input) stops the call
    }
    return ran;
  }

  // 0..1 progress toward the next tick, used for render interpolation only.
  fraction(now: number): number {
    const missing = this.last - now;
    if (missing <= 0) return 1;
    return Math.min(1, Math.max(0, (TICK_MS - missing) / TICK_MS));
  }
}

export {};
