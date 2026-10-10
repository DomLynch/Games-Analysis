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
const special6: Cost = { amount: 6, mode: "mpThenHp" };
const a: Caster = { mp: 5, mpMax: 10, hp: 7, seal: 0, sealUntil: 0 };
console.log("mp5 hp7 cost6 ->", paySpecial(a, special6, 0), "mp", a.mp, "hp", a.hp);
const b: Caster = { mp: 5, mpMax: 10, hp: 6, seal: 0, sealUntil: 0 };
console.log("mp5 hp6 cost6 ->", paySpecial(b, special6, 0), "mp", b.mp, "hp", b.hp);
const s: Caster = { mp: 10, mpMax: 10, hp: 10, seal: 4, sealUntil: 100 };
console.log("sealed at 4, cost6 at t50 ->", paySpecial(s, special6, 50), "after expiry t150 ->", paySpecial(s, special6, 150));
const r: Regen = { rate: 2, cap: 10, nextTick: 0 };
const m: Caster = { mp: 0, mpMax: 10, hp: 10, seal: 0, sealUntil: 0 };
for (const t of [0, 100, 200, 400]) regenMp(m, r, t);
console.log("regen after t=0,100,200,400 -> mp", m.mp, "nextTick", r.nextTick);
const blk: Caster = { mp: 3, mpMax: 10, hp: 10, seal: 0, sealUntil: 0 };
console.log("mpFirst force 5 with mp 3 -> rest", applyBlockedHit(blk, 5, "mpFirst", true), "mp", blk.mp, "hp", blk.hp);
const blk2: Caster = { mp: 3, mpMax: 10, hp: 10, seal: 0, sealUntil: 0 };
console.log("both force 5 with mp 3 -> rest", applyBlockedHit(blk2, 5, "both", true), "mp", blk2.mp, "hp", blk2.hp);
