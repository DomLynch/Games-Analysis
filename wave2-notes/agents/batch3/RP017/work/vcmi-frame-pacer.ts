// Licence: GPL-2.0-or-later (donor, per file headers and license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Frame pacer for a browser loop: skip redraws only while the state says nothing animates, cap the skip, clamp the gap, carry leftover ms into timers.
const MAX_DELTA_MS = 100; // any gap longer than this (stall, breakpoint, idle) counts as this much
const MAX_SKIP_MS = 100;  // never skip drawing for longer than this, even when idle

interface PacerState {
  lastRenderMs: number;  // time of the last drawn frame
  carryMs: number;       // fractional ms not yet handed to timers
}

interface StepResult { render: boolean; deltaMs: number; timerMs: number; }

function pacerStep(s: PacerState, nowMs: number, wantsFrame: boolean): StepResult {
  const sinceDraw = nowMs - s.lastRenderMs;
  if (!wantsFrame && sinceDraw < MAX_SKIP_MS) {
    return { render: false, deltaMs: 0, timerMs: 0 };
  }

  const delta = Math.min(sinceDraw, MAX_DELTA_MS);
  s.lastRenderMs = nowMs;
  s.carryMs += delta;
  const whole = Math.floor(s.carryMs);
  s.carryMs -= whole;
  return { render: true, deltaMs: delta, timerMs: whole };
}

console.log(pacerStep({ lastRenderMs: 0, carryMs: 0 }, 16, true).timerMs);
