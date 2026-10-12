// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface BeamSpec {
  buildupS: number;          // buildup duration before the beam appears
  recoverS: number;          // recovery after release or energy run-out
  sweepS: number;            // time for the far end to reach full range
  damagePerTick: number;     // damage per tick window per target
  tickRate: number;          // tick windows per second
  range: number;             // max reach, units
  halfAngleDeg: number;      // cone half-angle
  energyDrainPerS: number;   // 0 = no energy gate
  energyRegenPerHit: number; // energy returned per hit
}

export interface Target { id: number; along: number; lateral: number; } // distance along the axis, off-axis distance

export interface Hit { id: number; damage: number; precision: number; }

export interface BeamState {
  stage: "buildup" | "action" | "recover" | "done";
  timer: number;                 // seconds in the current stage
  elapsed: number;               // seconds since the beam began to sweep
  reach: number;                 // current far-end distance
  energy: number;
  tickAcc: number;               // seconds into the current tick window
  hitThisTick: Set<number>;      // targets hit in the open window
  ticksOn: Map<number, number>;  // closed windows each target has stayed in
}

export const PRECISION_FULL_S = 2.5;  // engine constant: time on target for full ramp
export const PRECISION_MAX = 0.25;    // engine constant: ramp cap

export function endRadius(spec: BeamSpec): number {
  return spec.range * Math.tan((spec.halfAngleDeg * Math.PI) / 180);
}

// Ramp: precision grows with time on target and is capped.
export function timePrecision(closedWindows: number, tickDur: number): number {
  const onS = closedWindows * tickDur;
  return PRECISION_MAX * Math.min(1, Math.max(0, onS / PRECISION_FULL_S));
}

// One frame. Returns the hits this frame.
export function stepBeam(s: BeamState, spec: BeamSpec, held: boolean, dt: number, targets: Target[]): Hit[] {
  const hits: Hit[] = [];
  const tickDur = 1 / spec.tickRate;
  s.timer += dt;

  if (s.stage === "buildup") {
    if (s.timer >= spec.buildupS) { s.stage = "action"; s.timer = 0; s.elapsed = 0; s.tickAcc = 0; }
    return hits;
  }

  if (s.stage === "action") {
    const canDrain = spec.energyDrainPerS <= 0 || s.energy > 0;
    if (!held || !canDrain) { s.stage = "recover"; s.timer = 0; return hits; }

    s.elapsed += dt;
    s.energy -= spec.energyDrainPerS * dt;

    // Tick window boundary: close the open window; only targets hit in it keep their count.
    s.tickAcc += dt;
    if (s.tickAcc >= tickDur) {
      s.tickAcc -= tickDur;
      const next = new Map<number, number>();
      for (const id of s.hitThisTick) next.set(id, (s.ticksOn.get(id) ?? 0) + 1);
      s.ticksOn = next;
      s.hitThisTick = new Set<number>();
    }

    s.reach = Math.min(spec.range, (spec.range * s.elapsed) / spec.sweepS);
    const radiusPerUnit = endRadius(spec) / spec.range;
    for (const t of targets) {
      if (s.hitThisTick.has(t.id)) continue;             // at most one hit per window
      if (t.along < 0 || t.along > s.reach) continue;    // inside the swept length
      if (t.lateral > radiusPerUnit * t.along) continue; // inside the cone
      s.hitThisTick.add(t.id);
      hits.push({ id: t.id, damage: spec.damagePerTick, precision: timePrecision(s.ticksOn.get(t.id) ?? 0, tickDur) });
      s.energy += spec.energyRegenPerHit;
    }
    return hits;
  }

  if (s.stage === "recover") {
    if (s.timer >= spec.recoverS) s.stage = "done";
  }
  return hits;
}
export {};
