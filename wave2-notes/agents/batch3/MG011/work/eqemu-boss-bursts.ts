// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface AbilityRow { id: number; level: number; params: number[] } // params: up to 9

// Donor row format: "id,level,p0,p1,...^id,level,...". Non-numeric fields are skipped.
export function parseAbilityRows(text: string): Map<number, AbilityRow> {
  const out = new Map<number, AbilityRow>();
  const isNum = (x: string): boolean => /^\d+$/.test(x);
  for (const part of text.split("^")) {
    const f = part.split(",");
    if (f.length < 2 || !isNum(f[0]) || !isNum(f[1])) continue;
    const params = f.slice(2, 2 + 9).map((x) => (isNum(x) ? Number(x) : 0));
    out.set(Number(f[0]), { id: Number(f[0]), level: Number(f[1]), params });
  }
  return out;
}

// Burst (donor: enrage). One timer: the burst length first, then the rest period.
export interface BurstSpec { enabled: boolean; hpFractionStart: number; durationMs: number; restMs: number; }
export interface BurstState { active: boolean; endAtMs: number; nowMs: number; }

// Starts a burst when the HP gate passes and the rest period is over.
export function tryStartBurst(s: BurstState, spec: BurstSpec, hpFraction: number): boolean {
  if (!spec.enabled || s.active) return false;
  if (hpFraction > spec.hpFractionStart) return false;
  if (s.nowMs < s.endAtMs) return false;   // still resting
  s.active = true;
  s.endAtMs = s.nowMs + spec.durationMs;
  return true;
}

// Called at the poll rate (donor: 1 s). The window ends at the poll, as in the donor.
// Fix: the rest period is counted from the scheduled end, not from the poll time (no drift).
export function pollBurst(s: BurstState, spec: BurstSpec): void {
  if (s.active && s.nowMs >= s.endAtMs) {
    s.active = false;
    s.endAtMs = s.endAtMs + spec.restMs;
  }
}

// While a burst is active, a frontal melee hit is ripostes (no damage).
export function ripostesFrontal(s: BurstState, inFront: boolean): boolean {
  return s.active && inFront;
}

// Pull (donor: summon). Pulls the hate-top target toward the caster when out of melee range.
// Fix: the cooldown is only spent when a target exists.
export interface PullSpec { enabled: boolean; hpFractionMax: number; cooldownMs: number; }
export interface PullState { nextAtMs: number; nowMs: number; }

export function tryPull(s: PullState, spec: PullSpec, hpFraction: number, outOfMelee: boolean, hateTop: number | null): number | null {
  if (!spec.enabled || !outOfMelee) return null;
  if (hpFraction > spec.hpFractionMax) return null;
  if (s.nowMs < s.nextAtMs) return null;
  if (hateTop === null) return null;
  s.nextAtMs = s.nowMs + spec.cooldownMs;
  return hateTop;
}
export {};
