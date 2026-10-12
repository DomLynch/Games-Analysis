// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Death debt ("vitae"): each death lowers a multiplier on max vitals; earned XP refills it in 1 percent steps.

const PENALTY_PER_DEATH = 0.05;   // data: per-death step
const PENALTY_MAX = 0.40;         // data: deepest penalty allowed (global floor)
const LEVEL_STEP_PCT = 3;         // data: penalty allowed per level, in percent

interface VitaeState {
  vitae: number;     // 1.0 = no penalty, 0.60 = deepest
  poolXp: number;    // XP earned toward the next 1 percent
  deathLevel: number;
}

// Level floor: at most 3 percent per level below 1, capped by the global maximum.
function minVitae(level: number): number {
  const globalFloor = 1 - PENALTY_MAX;
  const globalMaxPct = 100 - Math.round(globalFloor * 100);
  let maxPct = Math.max((level - 1) * LEVEL_STEP_PCT, 1);
  if (maxPct > globalMaxPct) maxPct = globalMaxPct;
  return Math.max((100 - maxPct) / 100, globalFloor);
}

// One death. PK-lite deaths reset the pool but add no penalty.
function onDeath(s: VitaeState, level: number, pkLite: boolean): void {
  s.deathLevel = level;
  s.poolXp = 0;
  if (pkLite) return;
  s.vitae = Math.max(s.vitae - PENALTY_PER_DEATH, minVitae(level));
}

// XP needed to move from vitae to vitae + 0.01 (donor formula, kept as is; see simplified line).
function poolThreshold(vitae: number, deathLevel: number): number {
  return (Math.pow(deathLevel, 2.5) * 2.5 + 20) * Math.pow(vitae, 5) + 0.5;
}

// Earned XP fills the pool; each full pool lifts the penalty by 0.01, capped at 1.0.
function earnXp(s: VitaeState, xp: number): void {
  let pool = s.poolXp + xp;
  let need = poolThreshold(s.vitae, s.deathLevel);
  while (pool >= need && s.vitae < 1) {
    pool -= need;
    s.vitae = Math.min(1, s.vitae + 0.01);
    need = poolThreshold(s.vitae, s.deathLevel);
  }
  s.poolXp = pool;
}

// Max vital after vitae scaling (applied after enchantment multipliers, before additives).
function scaledMaxVital(base: number, vitae: number): number {
  return Math.max(5, Math.round(base * vitae));
}

export {};
