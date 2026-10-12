interface BleedState { secondsLeft: number; nextTickAt: number; }

interface Victim {
  hp: number;
  alive: boolean;
  bleed: BleedState | null; // at most one wound at a time
}

interface BleedConfig {
  rollSize: number;                                                    // donor: roll is 0..399
  durationTable: ReadonlyArray<{ minRoll: number; seconds: number }>;  // checked top-down
  tickDamage: number;                                                  // donor: 5
  tickMs: number;                                                      // donor: 1000
  floorHp: number | null;                                              // donor: 1 (bleed cannot kill); null = can kill
}

const DONOR_BLEED: BleedConfig = {
  rollSize: 400,
  durationTable: [
    { minRoll: 335, seconds: 8 },
    { minRoll: 210, seconds: 6 },
    { minRoll: 80, seconds: 4 },
    { minRoll: 0, seconds: 1 },
  ],
  tickDamage: 5,
  tickMs: 1000,
  floorHp: 1,
};

function rollSeconds(cfg: BleedConfig, roll: number): number {
  for (const row of cfg.durationTable) {
    if (roll >= row.minRoll) return row.seconds;
  }
  return cfg.durationTable[cfg.durationTable.length - 1].seconds;
}

// Wound from one landed hit. Returns false when already bleeding: no stacking, no refresh.
function applyWound(v: Victim, cfg: BleedConfig, roll: number, nowMs: number): boolean {
  if (v.bleed !== null) return false;
  v.bleed = { secondsLeft: rollSeconds(cfg, roll), nextTickAt: nowMs }; // first tick is due at once
  return true;
}

// Called once per server tick. Emits at most one tick per call; no catch-up for late calls.
function stepBleed(v: Victim, cfg: BleedConfig, nowMs: number): number {
  const b = v.bleed;
  if (b === null) return 0;
  if (!v.alive) { v.bleed = null; return 0; }
  if (nowMs < b.nextTickAt) return 0;
  const dmg = cfg.floorHp === null
    ? cfg.tickDamage
    : Math.max(0, Math.min(cfg.tickDamage, v.hp - cfg.floorHp));
  v.hp -= dmg;
  b.secondsLeft -= 1;
  b.nextTickAt += cfg.tickMs;
  if (b.secondsLeft <= 0) v.bleed = null;
  return dmg;
}

export {};
