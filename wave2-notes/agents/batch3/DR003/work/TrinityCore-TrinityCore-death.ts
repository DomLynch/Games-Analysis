// Licence: GPL-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// A rolling death window sets how long a released ghost must wait before reclaiming its corpse.
export interface DeathTiers {
  stepMs: number;    // window step, donor 5 minutes
  waitsS: number[];  // reclaim wait per tier in seconds, donor [30, 60, 120]
}

export interface DeathWindow {
  expireAt: number;  // ms epoch, per character
}

// Tier read from the window at time now. Donor: (expire - 1 - now) / step, 0 when the window is closed.
export function tierAt(w: DeathWindow, now: number, t: DeathTiers): number {
  if (now >= w.expireAt - 1) return 0;
  const tier = Math.floor((w.expireAt - 1 - now) / t.stepMs);
  return Math.min(tier, t.waitsS.length - 1);
}

// Called on each death. A death inside an open window stretches it by one more step, up to the cap.
export function onDeath(w: DeathWindow, now: number, t: DeathTiers): void {
  const max = t.waitsS.length;
  if (now < w.expireAt) {
    const count = Math.floor((w.expireAt - now) / t.stepMs) + 1;
    w.expireAt = count < max ? now + (count + 1) * t.stepMs : now + max * t.stepMs;
  } else {
    w.expireAt = now + t.stepMs;
  }
}

export interface Corpse {
  ghostAtMs: number;  // release time
  waitMs: number;     // stored wait, see release()
  pvp: boolean;
}

// Fix: the wait is fixed on the corpse at release. The donor re-reads the tier at reclaim time instead.
export function release(w: DeathWindow, now: number, pvp: boolean, t: DeathTiers): Corpse {
  return { ghostAtMs: now, waitMs: t.waitsS[tierAt(w, now, t)] * 1000, pvp };
}

// Server-side reclaim gate: the wait has passed and the ghost is within radius of the corpse.
export function canReclaim(c: Corpse, now: number, distUnits: number, radiusUnits: number): boolean {
  return now >= c.ghostAtMs + c.waitMs && distUnits <= radiusUnits;
}

export {};
