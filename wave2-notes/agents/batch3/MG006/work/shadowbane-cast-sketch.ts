// Licence: MIT (donor). Clean-room sketch of the same casting mechanism; the donor's shape is followed, lines are not translated.
interface PowerDef {
  id: number;
  castTimeS: number;            // base cast time, seconds
  castRamp: number;             // per-rank ramp on cast time
  recycleS: number;             // base recycle (cooldown) time, seconds
  recycleRamp: number;          // per-rank ramp on recycle
  rampAdd: boolean;             // true: base + ramp*rank; false: base * (1 + ramp*rank)
  cost: number;                 // base cost, resource chosen by costKind
  costRamp: number;             // per-rank ramp on cost
  costRampAdd: boolean;         // true: base + ramp*rank; false: base * (1 + ramp*rank)
  costKind: "mana" | "stamina" | "health";
  maxRank: number;
  canCastWhileMoving: boolean;
  cancelOnTakeDamage: boolean;
  cancelOnSpell: boolean;
}

interface Caster {
  alive: boolean;
  liveCounter: number;          // increments on death or respawn
  rank: number;                 // trains the player has in this power
  mana: number;
  stamina: number;
  health: number;
  stunned: boolean;
  canCastBlocked: boolean;      // CannotCast or BlockedPowerType bonus
  costPct: number;              // PowerCost bonus, e.g. 0.1 = +10%
  airborne: boolean;
  speed: number;                // units per second
  moving: boolean;
  remainingMoveDist: number;    // distance left on the current path
  pending: { def: PowerDef; doneAtMs: number; liveCounter: number } | null;
  recycleUntilMs: Map<number, number>;   // power id -> time the recycle lock ends
}

function rampValue(base: number, ramp: number, rank: number, add: boolean): number {
  return add ? base + ramp * rank : base * (1 + ramp * rank);
}

// Cast time and recycle, in ms. Recycle includes the cast time, so the lock runs from cast start.
function castMs(def: PowerDef, rank: number): number {
  return Math.trunc(rampValue(def.castTimeS, def.castRamp, rank, def.rampAdd) * 1000);
}
function recycleMs(def: PowerDef, rank: number): number {
  return Math.trunc(rampValue(def.recycleS, def.recycleRamp, rank, def.rampAdd) * 1000) + castMs(def, rank);
}

// Cost is ramped by rank, multiplied by bonus, and x1.5 while airborne. Creative (free) casts are not modelled.
function castCost(def: PowerDef, c: Caster): number {
  let cost = rampValue(def.cost, def.costRamp, c.rank, def.costRampAdd);
  cost *= 1 + c.costPct;
  if (c.airborne) cost *= 1.5;
  return cost;
}

// Start a cast. Returns a reason string on refusal, or "ok" after paying the cost and scheduling the finish.
function startCast(c: Caster, def: PowerDef, nowMs: number): string {
  if (!c.alive) return "dead";
  if (c.pending !== null) return "already casting";                       // one pending power at a time
  if ((c.recycleUntilMs.get(def.id) ?? 0) > nowMs) return "recycling";
  if (c.stunned || c.canCastBlocked) return "blocked";
  if (!def.canCastWhileMoving && c.moving && c.remainingMoveDist > c.speed) return "moving";
  if (c.rank > def.maxRank) c.rank = def.maxRank;

  const cost = castCost(def, c);
  if (def.costKind === "mana") { if (c.mana < cost) return "no mana"; c.mana -= cost; }
  else if (def.costKind === "stamina") { if (c.stamina < cost) return "no stamina"; c.stamina -= cost; }
  else { if (c.health <= cost) return "no health"; c.health -= cost; }

  c.recycleUntilMs.set(def.id, nowMs + recycleMs(def, c.rank));
  const cast = castMs(def, c.rank);
  if (cast < 1) { finishCast(c, def, nowMs, c.liveCounter); return "ok"; }
  c.pending = { def, doneAtMs: nowMs + cast, liveCounter: c.liveCounter };
  return "ok";
}

// Cancel rules. Each one only applies to the pending power, and a sit always cancels.
function onMove(c: Caster): void {
  if (c.pending && !c.pending.def.canCastWhileMoving) c.pending = null;
}
function onTakeDamage(c: Caster): void {
  if (c.pending && c.pending.def.cancelOnTakeDamage) c.pending = null;
}
function onSit(c: Caster): void { c.pending = null; }

// Called on the server tick; completes the pending cast when its time has come.
function tick(c: Caster, nowMs: number, apply: (def: PowerDef) => void): void {
  const p = c.pending;
  if (!p || nowMs < p.doneAtMs) return;
  c.pending = null;
  finishCast(c, p.def, nowMs, p.liveCounter, apply);
}

// Finish: a dead caster or a changed live counter cancels the cast and releases the recycle lock.
// A stunned caster drops the cast silently; the recycle lock still runs out on its own timer.
function finishCast(c: Caster, def: PowerDef, nowMs: number, startLive: number, apply?: (d: PowerDef) => void): void {
  if (!c.alive || c.liveCounter !== startLive) { c.recycleUntilMs.delete(def.id); return; }
  if (c.stunned) return;
  if (apply) apply(def);
}

// Hit roll. atr is the attack rating of the skill; defense is the target's rating.
// Returns true when the attack is avoided (miss, or a dodge passive fired).
function avoided(atr: number, defense: number, roll: number, dodgeFired: boolean): boolean {
  let chance: number;
  if (atr > defense || defense === 0) chance = 94;
  else {
    const dif = atr / defense;
    chance = dif <= 0.8 ? 4 : Math.trunc(450 * (dif - 0.8) + 4);
  }
  if (roll < chance) return dodgeFired;
  return true;
}

// Mobile-fight note: the donor's AoE lead is target speed * cast seconds; kept as a helper.
function aoeLeadUnits(targetSpeed: number, castMsValue: number): number {
  return targetSpeed * (castMsValue * 0.001);
}

export {};
