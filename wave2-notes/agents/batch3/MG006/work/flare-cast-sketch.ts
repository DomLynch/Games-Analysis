// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pool { cur: number; max: number; regenPerMin: number; }

interface PowerDef {
  id: number;
  cooldownMs: number;          // per-power cooldown after a use
  mpCost: number;
  hpCost: number;              // paid as damage to the caster
  sacrifice: boolean;          // allows hpCost to kill the caster
  preventInterrupt: boolean;   // hits cannot interrupt this cast
  summonLimit: { mode: "unlimited" | "fixed" | "stat"; count: number; statRatio: number };
}

interface Summon { powerId: number; alive: boolean; }

interface Caster {
  mp: Pool;
  hp: number;
  readyAt: Map<number, number>;  // power id -> ms timestamp when usable again
  summons: Summon[];
}

// Regen is a per-minute stat converted to a per-tick amount, capped at the pool max.
function regenTick(p: Pool, dtMs: number): void {
  p.cur = Math.min(p.max, Math.max(0, p.cur + (p.regenPerMin / 60000) * dtMs));
}

// Summon cap: fixed count, or count scaled by a primary stat; the floor is 1.
function summonCap(def: PowerDef, stat: number): number {
  const s = def.summonLimit;
  if (s.mode === "unlimited") return Infinity;
  const raw = s.mode === "fixed" ? s.count : Math.floor(s.count * (stat / s.statRatio));
  return Math.max(raw, 1);
}

function summonCapReached(c: Caster, def: PowerDef, stat: number): boolean {
  const alive = c.summons.filter(s => s.powerId === def.id && s.alive).length;
  return alive >= summonCap(def, stat);
}

// Cast gate. The donor checks cost, state and summon cap here; the cooldown gate is not in this function (not read).
function canCast(c: Caster, def: PowerDef, nowMs: number, stat: number): boolean {
  if (c.mp.cur < def.mpCost) return false;
  if (!def.sacrifice && c.hp < def.hpCost) return false;
  if ((c.readyAt.get(def.id) ?? 0) > nowMs) return false;
  if (summonCapReached(c, def, stat)) return false;
  return true;
}

// Pay on cast. Cooldown starts when the power is used.
function payCast(c: Caster, def: PowerDef, nowMs: number): void {
  c.mp.cur -= def.mpCost;
  c.hp -= def.hpCost;
  c.readyAt.set(def.id, nowMs + def.cooldownMs);
}

// A hit interrupts a cast only outside the hit-cooldown window, when not stunned or poised,
// and not if the power has preventInterrupt. A crit ignores poise.
function hitInterruptsCast(def: PowerDef, hitWindowOpen: boolean, stunned: boolean, poised: boolean, crit: boolean): boolean {
  return hitWindowOpen && !stunned && (!poised || crit) && !def.preventInterrupt;
}

// Summoner death removes all its summons (donor: removeSummons, called when hp == 0 in logic()).
function onSummonerDeath(c: Caster): void {
  if (c.hp > 0) return;
  for (const s of c.summons) s.alive = false;
  c.summons = [];
}

// Absorb: clamp the absorbed share to [minPct, maxPct] of the hit, at least 1 when a hit has absorb.
// Armour-penetrating hits skip absorb entirely.
function absorbDamage(dmg: number, rawAbsorb: number, minPct: number, maxPct: number, armourPen: boolean): number {
  if (armourPen || rawAbsorb <= 0 || dmg <= 0) return dmg;
  let abs = rawAbsorb;
  const pct = (abs * 100) / dmg;
  if (pct < minPct) abs = (dmg * minPct) / 100;
  if (pct > maxPct) abs = (dmg * maxPct) / 100;
  if (abs === 0) abs = 1;
  let out = dmg - abs;
  if (out <= 0) out = maxPct < 100 ? 1 : 0;
  return out;
}

// Resist per damage type: a clamped percentage; negative values (weakness) are not clamped.
function resistDamage(dmg: number, resistPct: number, minR: number, maxR: number): number {
  let r = resistPct;
  if (r >= 0) r = Math.min(Math.max(r, minR), maxR);
  return (dmg * (100 - r)) / 100;
}

// Non-stacking effect: an incoming copy is dropped only if it is shorter and has the same magnitude; otherwise it replaces the old one.
interface Eff { id: string; remainingMs: number; magnitude: number; }
function applyNonStacking(list: Eff[], incoming: Eff): Eff[] {
  const same = list.find(e => e.id === incoming.id);
  if (same && incoming.remainingMs < same.remainingMs && incoming.magnitude === same.magnitude) return list;
  return [...list.filter(e => e.id !== incoming.id), incoming];
}

export {};
