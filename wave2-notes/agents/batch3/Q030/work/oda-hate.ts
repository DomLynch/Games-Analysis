// Licence: GPL-3.0 (donor, README.md and LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface HateConfig {
  falloffStart: number;      // 250 units: below this, effective aggro equals base
  fullFalloff: number;       // 1500 units: effective aggro is one third of base here
  ignoreBeyond: number;      // 6000 units: entries stay in the table but are not candidates
  protectRange: number;      // 1000 units
  protectPerLevel: number;   // 0.1 of the aggro per protect level
  petOwnerTag: number;       // 0.3 of a pet's damage also tagged to its owner
  losPlayersPerTick: number; // 5
  losNpcsPerTick: number;    // 3
}

export const DONOR_HATE: HateConfig = {
  falloffStart: 250, fullFalloff: 1500, ignoreBeyond: 6000, protectRange: 1000,
  protectPerLevel: 0.1, petOwnerTag: 0.3, losPlayersPerTick: 5, losNpcsPerTick: 3,
};

// Effective aggro: base, then decays exponentially past falloffStart, rounded up.
export function effectiveAggro(base: number, dist: number, cfg: HateConfig): number {
  const over = dist - cfg.falloffStart;
  if (over <= 0) return base;
  const k = Math.log(1 / 3) / (cfg.fullFalloff - cfg.falloffStart);
  return Math.ceil(base * Math.exp(k * over));
}

// Adding aggro: a new entry starts at least at 1; an existing entry never drops below 0.
export function addAggro(table: Map<number, number>, id: number, amount: number): void {
  const cur = table.get(id);
  if (cur !== undefined) table.set(id, Math.max(0, cur + amount));
  else table.set(id, Math.max(1, amount));
}

// Pick: highest effective aggro wins; the current target is kept while it is at least as high (no flapping).
export function selectTarget(cands: { id: number; eff: number }[], current: number | null): number | null {
  let best: number | null = null;
  let bestEff = -1;
  let currentEff = -1;
  for (const c of cands) {
    if (c.id === current) currentEff = c.eff;
    if (c.eff > bestEff) { bestEff = c.eff; best = c.id; }
  }
  const keepCurrent = current !== null && currentEff > -1 && current !== best && currentEff >= bestEff;
  return keepCurrent ? current : best;
}

// Protect: a protector near the target takes a share of new aggro, 10% per protect level.
export function protectShare(amount: number, level: number, distToProtector: number, cfg: HateConfig): number {
  if (distToProtector > cfg.protectRange) return 0;
  return Math.floor(level * cfg.protectPerLevel * amount);
}

// Rotating scan under a per-call check budget. Every candidate looked at advances the index,
// whether or not a check was sent (donor: processed count), so the same ones are not checked every time.
export function scanRotating<T>(items: T[], state: { index: number }, maxChecks: number, wantsCheck: (t: T) => boolean): number {
  const n = items.length;
  if (n === 0) return 0;
  let processed = 0;
  let checks = 0;
  while (processed < n && checks < maxChecks) {
    const item = items[(state.index + processed) % n];
    processed++;
    if (wantsCheck(item)) checks++;
  }
  state.index = (state.index + processed) % n;
  return checks;
}

export {};
