// Licence: GPL-2.0-or-later (donor COPYING.txt). Clean-room sketch of the mechanism, not a translation of the donor lines.
const FUTURE_WINDOW_MS = 200;   // donor: game/g_active.c:771-772 (claimed time may lead the server clock by 200 ms)
const PAST_WINDOW_MS = 1000;    // donor: game/g_active.c:775-776 (claimed time may trail by 1000 ms)
const CATCHUP_MAX_MS = 1000;    // donor: game/bg_pmove.c:2034-2035 (a larger gap is skipped, not replayed)
const STEP_MAX_MS = 66;         // donor: game/bg_pmove.c:2053-2054 (non-fixed sub-step cap)

interface SimClock {
  commandTime: number;          // simulated time this player has consumed, in ms
}

// Clamp a client's claimed time into the server window, then advance the simulation in capped sub-steps.
// Returns the sub-step lengths (ms) the caller must run, in order.
// simplified: follows the donor order (window clamp, then the "less than 1 ms: do nothing" gate, then fixed-step rounding,
// then catch-up, then sub-steps). It omits the spectator-follow exception, the pmove_msec cvar bounds (8..33), the
// 200 ms msec cap at g_active.c:786-787 (it caps the timer credit passed to ClientTimerActions; see section 6), the event and
// prediction bookkeeping, and the movement step itself. It clamps out-of-window times instead of rejecting them, as the donor does.
function admit(serverNow: number, sim: SimClock, claimedMs: number, fixedStepMs: number | null): number[] {
  let t = Math.min(serverNow + FUTURE_WINDOW_MS, Math.max(serverNow - PAST_WINDOW_MS, claimedMs));
  if (t - sim.commandTime < 1) return [];                  // nothing new to run; commandTime unchanged
  if (fixedStepMs !== null) {
    t = Math.ceil(t / fixedStepMs) * fixedStepMs;          // donor: rounds up to a multiple of pmove_msec (g_active.c:800)
  }
  if (t > sim.commandTime + CATCHUP_MAX_MS) {
    sim.commandTime = t - CATCHUP_MAX_MS;                  // donor: skip the excess instead of replaying it (bg_pmove.c:2034-2035)
  }
  const cap = fixedStepMs !== null ? fixedStepMs : STEP_MAX_MS;
  const steps: number[] = [];
  while (sim.commandTime < t) {
    const dt = Math.min(cap, t - sim.commandTime);
    steps.push(dt);
    sim.commandTime += dt;                                 // donor: commandTime follows the claim (bg_pmove.c:1900, 2057)
  }
  return steps;
}

export {};
