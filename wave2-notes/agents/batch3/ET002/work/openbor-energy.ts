// Licence: BSD 3-clause style (donor LICENSE: "Redistribution and use in source and binary forms, with or without modification, are permitted"). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const GAME_SPEED = 200; // logical ticks per second (donor default)

interface Caster {
  mp: number;
  mpMax: number;
  hp: number;
  seal: number;       // 0 = no seal; otherwise the most a special may cost while sealed
  sealUntil: number;  // logical tick when the seal expires
}

type CostMode = "mpThenHp" | "mpOnly" | "hpOnly";
interface Cost { amount: number; mode: CostMode; }

// Which pool pays, or null when the special is refused.
// A seal refuses any cost above its ceiling. MP needs mp >= cost; HP needs hp > cost,
// so a special paid from HP can never take the caster to 0.
function payerFor(c: Caster, cost: Cost, now: number): "mp" | "hp" | null {
  const sealed = c.seal !== 0 && now < c.sealUntil;
  if (sealed && c.seal < cost.amount) return null;
  if (cost.mode !== "hpOnly" && c.mp >= cost.amount) return "mp";
  if (cost.mode !== "mpOnly" && c.hp > cost.amount) return "hp";
  return null;
}

// Gate and pay in one step: the same check decides the pool that is charged.
function paySpecial(c: Caster, cost: Cost, now: number): "mp" | "hp" | null {
  const pool = payerFor(c, cost, now);
  if (pool === "mp") c.mp -= cost.amount;
  else if (pool === "hp") c.hp -= cost.amount;
  return pool;
}

// MP recovery: one step per logical second; the timer advances by one second (no catch-up burst).
interface Regen { rate: number; cap: number; nextTick: number; }
function regenMp(c: Caster, r: Regen, now: number): void {
  if (now < r.nextTick) return;
  c.mp = Math.min(c.mpMax, c.mp + r.rate, r.cap);
  r.nextTick = Math.max(r.nextTick + GAME_SPEED, now);
}

type BlockMode = "hp" | "mpFirst" | "mpOnly" | "both";
// Blocked hit: the block mode decides how much of the force reaches HP; chip death can be disabled.
function applyBlockedHit(c: Caster, force: number, mode: BlockMode, noChipDeath: boolean): number {
  let rest = force;
  if (mode === "mpOnly") {
    c.mp = Math.max(0, c.mp - rest);
    rest = 0;
  } else if (mode === "mpFirst") {
    c.mp -= rest;
    if (c.mp < 0) { rest = -c.mp; c.mp = 0; } else { rest = 0; }
  } else if (mode === "both") {
    c.mp = Math.max(0, c.mp - rest); // MP is drained and the full force still reaches HP
  }
  if (rest < c.hp) c.hp -= rest;
  else if (noChipDeath) c.hp = 1;
  else c.hp = 0; // the donor calls its KO handler here (not modelled)
  return rest;
}
export {};
