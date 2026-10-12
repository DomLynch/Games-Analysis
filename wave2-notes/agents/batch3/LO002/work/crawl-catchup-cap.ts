// Licence: GPL-2.0-or-later (donor LICENSE; the files read carry no per-file licence header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Donor time units: 10 per normal turn (timed-effects.cc divides by 10 for a turn).
const TICKS_PER_TURN = 10;
// Donor cap on live simulation after a long absence.
const MAX_SIM_TURNS = 10;

interface CatchUp { simTurns: number; quickTurns: number; timerTicks: number; }

// Split an absence of `elapsed` ticks into a live part (capped) and a timers-only part.
// Fix to the donor: the simulated ticks are subtracted once, so quickTurns is the true remainder.
function splitCatchUp(elapsed: number): CatchUp {
  const simTurns = Math.min(MAX_SIM_TURNS, Math.floor(elapsed / TICKS_PER_TURN));
  const remainingTicks = elapsed - simTurns * TICKS_PER_TURN;
  const quickTurns = Math.floor(remainingTicks / TICKS_PER_TURN);
  // Timer event reports the whole turns that were covered (remainder below one turn is dropped, as in the donor).
  const timerTicks = (simTurns + quickTurns) * TICKS_PER_TURN;
  return { simTurns, quickTurns, timerTicks };
}

interface Listener { mask: number; alive: boolean; notify(ticks: number): void; }

class EventBus {
  private listeners: Listener[] = [];

  register(l: Listener): void {
    this.listeners.push(l);
  }

  // Dispatch over a copy, and skip a listener removed during the dispatch (donor: copy + registered check).
  fire(type: number, ticks: number): void {
    const copy = [...this.listeners];
    for (const l of copy) {
      if ((l.mask & type) !== 0 && l.alive) l.notify(ticks);
    }
  }
}

// Level re-entry: catch up the absence, then announce the elapsed turns on the bus.
function reenterLevel(elapsed: number, bus: EventBus, turnElapsed: number): CatchUp {
  const c = splitCatchUp(elapsed);
  bus.fire(turnElapsed, c.timerTicks);
  return c;
}
export {};
