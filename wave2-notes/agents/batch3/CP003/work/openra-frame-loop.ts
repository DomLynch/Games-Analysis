// Licence: GPL-3.0-or-later (donor, COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface LoopHooks {
  now(): number;                     // monotonic milliseconds
  logic(): void;                     // one fixed logic tick (orders in, world step)
  render(): void;                    // one drawn frame
  sleep(ms: number): void;           // yield the thread for ms
  suspended(): boolean;              // window minimised: skip drawing, keep ticking
}

interface LoopConfig {
  logicIntervalMs(): number;         // read every pass; may change (network-chosen step)
  renderIntervalMs: number;          // 1000 / max fps, or the logic step when capping to game fps
  maxLogicBehindMs: number;          // beyond this lag, drop the backlog and restart the clock
  minRenderFps: number;              // forced redraw floor, in frames per second
  renderAfterEachLogic: boolean;     // gameplay: every logic tick is followed by one draw
}

interface LoopState {
  nextLogic: number;
  nextRender: number;
  forcedNextRender: number;
  renderPending: boolean;            // a logic tick has run and has not been drawn yet
}

// One pass of the loop. Logic and render are scheduled by timestamps, never by counting frames.
function pass(s: LoopState, h: LoopHooks, c: LoopConfig): void {
  const now = h.now();

  // If logic is far behind (stall, long GC, tab switch), forget the backlog instead of replaying it.
  if (now - s.nextLogic > c.maxLogicBehindMs) s.nextLogic = now;

  const nextUpdate = Math.min(s.nextLogic, s.nextRender);
  if (now < nextUpdate) {
    h.sleep(nextUpdate - now);       // spare time goes to sleep, not to busy work
    return;
  }

  const forceRender = s.renderPending || now >= s.forcedNextRender;

  // At most one logic tick per pass.
  if (now >= s.nextLogic && !s.renderPending) {
    s.nextLogic += c.logicIntervalMs();
    h.logic();
    if (c.renderAfterEachLogic) s.renderPending = true;
  }

  const timeLeftBeforeLogic = now < s.nextLogic;
  const renderDue = now >= s.nextRender;

  if (!h.suspended() && ((renderDue && timeLeftBeforeLogic) || forceRender)) {
    s.nextRender = now + c.renderIntervalMs;
    const floorMs = Math.max(1000 / c.minRenderFps, c.renderIntervalMs);
    s.forcedNextRender = now + floorMs;
    h.render();
    s.renderPending = false;
  } else if (h.suspended() && renderDue) {
    s.nextRender = now + c.renderIntervalMs;   // keep the render clock moving while hidden
    s.renderPending = false;
  }
}

function runLoop(h: LoopHooks, c: LoopConfig, running: () => boolean): void {
  const start = h.now();
  const s: LoopState = { nextLogic: start, nextRender: start, forcedNextRender: start, renderPending: false };
  while (running()) pass(s, h, c);
}
