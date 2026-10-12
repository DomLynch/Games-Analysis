// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism shape only; not a translation of the donor lines.
// Units: seconds (dt), stamina points. Rates are data (class/zone), not donor constants.
interface StaminaState {
  value: number;   // current stamina, 0..max
  max: number;     // pool cap (class data in donor: InitStamina)
  locked: boolean; // true after exhaustion until the refill threshold is reached (not in donor)
}

interface StaminaConfig {
  runDrainPerSec: number;  // sprint drain per second (donor: StaminaRunDrain / 5 per tick)
  regenPerSec: number;     // regen per second when not sprinting (donor: same rate as drain)
  relockRatio: number;     // fraction of max needed before sprint is allowed again (fix: donor has none)
}

interface TickResult {
  sprint: boolean; // true if this frame moves at sprint speed
}

// One frame. dt is the elapsed time of this frame (variable step, as the donor).
export function staminaTick(
  s: StaminaState,
  cfg: StaminaConfig,
  dt: number,
  wantsSprint: boolean,
  moving: boolean,
): TickResult {
  if (wantsSprint && moving && !s.locked) {
    s.value -= cfg.runDrainPerSec * dt;
    if (s.value <= 0) {
      s.value = 0;
      s.locked = true; // donor keeps the run flag set and only drops speed; here the lock is explicit
      return { sprint: false };
    }
    return { sprint: true };
  }

  // not sprinting: refill up to the cap
  s.value = Math.min(s.max, s.value + cfg.regenPerSec * dt);
  if (s.locked && s.value >= s.max * cfg.relockRatio) {
    s.locked = false;
  }
  return { sprint: false };
}

export {};
