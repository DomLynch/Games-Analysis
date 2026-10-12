// Licence: MIT (donor). Shape only, re-expressed here; no donor lines copied.
type RungKey = 'vfx' | 'lighting' | 'grass' | 'resolution';

interface Rung {
  key: RungKey;
  floor: number;       // lowest level this rung may reach
  baseline: number;    // level the tier starts at and recovers toward
  step: number;        // drop step on a normal over-budget frame
  urgentStep: number;  // drop step on an urgent frame
  raiseStep: number;   // raise step on recovery
}

interface Budget {
  dropMs: number;         // smoothed frame above this = over budget
  urgentMs: number;       // one frame at or above this = urgent
  recoverMs: number;      // smoothed and single frame below this = headroom
  recoverStableS: number; // seconds of headroom needed before one raise
  cooldownS: number;      // pause after any step
}

interface Governor {
  ema: number;
  stableS: number;
  cooldownS: number;
  levels: Record<RungKey, number>;
}

// Time constant for the frame average. 0.2 s equals the donor's 0.08 per frame at 60 fps.
const EMA_TAU_S = 0.2;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export type GovernorVerdict = 'degraded' | 'raised' | 'held' | 'floored';

export function governorStep(
  g: Governor,
  rungs: readonly Rung[],
  b: Budget,
  frameMs: number,
  dtS: number,
): GovernorVerdict {
  const alpha = 1 - Math.exp(-dtS / EMA_TAU_S);
  g.ema += (frameMs - g.ema) * alpha;
  g.cooldownS = Math.max(0, g.cooldownS - dtS);
  const urgent = frameMs >= b.urgentMs;

  if (g.ema >= b.dropMs) {
    g.stableS = 0;
    if (g.cooldownS > 0) return 'held';
    let moved = false;
    for (const r of rungs) {
      const cur = g.levels[r.key];
      if (cur <= r.floor + 0.001) continue;
      const s = urgent ? r.urgentStep : r.step;
      g.levels[r.key] = Math.max(r.floor, round2(cur - s));
      moved = true;
    }
    if (!moved) return 'floored';
    g.cooldownS = b.cooldownS * (urgent ? 0.55 : 1);
    return 'degraded';
  }

  if (g.ema > b.recoverMs || frameMs > b.recoverMs) {
    g.stableS = 0;
    return 'held';
  }
  g.stableS += dtS;
  if (g.stableS < b.recoverStableS || g.cooldownS > 0) return 'held';

  for (const r of rungs) {
    const cur = g.levels[r.key];
    if (cur >= r.baseline - 0.001) continue;
    g.levels[r.key] = Math.min(r.baseline, round2(cur + r.raiseStep));
    g.stableS = 0;
    g.cooldownS = b.cooldownS * 1.5;
    return 'raised';
  }
  return 'held';
}
