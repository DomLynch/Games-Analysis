// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
const PULSE_MS = 1500; // donor AnimateDelay

interface CastState {
  casting: boolean;      // false once the cast ends or is disturbed
  activeCastId: number;  // the caster's current cast; a different id makes this cast stale
}

// Donor: count = ceil(castDelay / AnimateDelay); a count of 0 means no pulse timer.
function pulseCount(castMs: number): number {
  return Math.ceil(castMs / PULSE_MS);
}

// Times (ms after cast start) at which a pulse is attempted: the first at 0, then every PULSE_MS.
function pulseTimes(castMs: number): number[] {
  const n = pulseCount(castMs);
  const times: number[] = [];
  for (let i = 0; i < n; i++) times.push(i * PULSE_MS);
  return times;
}

// Donor OnTick guard: play only while this cast is still the caster's casting spell.
function pulseAllowed(state: CastState, castId: number): boolean {
  return state.casting && state.activeCastId === castId;
}

// Pulses that actually play: a disturbance at disturbMs stops the chain before later pulses.
function firedPulses(castMs: number, castId: number, state: CastState, disturbMs: number | null): number[] {
  const fired: number[] = [];
  for (const t of pulseTimes(castMs)) {
    if (disturbMs !== null && t >= disturbMs) break;
    if (!pulseAllowed(state, castId)) break;
    fired.push(t);
  }
  return fired;
}

export {};
