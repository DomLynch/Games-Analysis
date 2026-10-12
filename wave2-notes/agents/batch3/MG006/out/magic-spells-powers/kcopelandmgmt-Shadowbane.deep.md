# kcopelandmgmt-Shadowbane (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/PowersManager.java` | Licence: MIT (as read: LICENSE line 9 "MIT License", line 11 grants use, copy, modify, merge, publish, distribute) | Java | symbol `PowersManager.usePowerA`

Checked: Read in full: `usePowerA` (199-560, the player cast gate, cost, recycle lock, cast timer), `cancelOnMove`, `cancelOnSit`, `cancelOnTakeDamage`, `cancelOnSpell`, `cancelOnStun` (2497-2568), `cancelPower` (2612-2643), `finishRecycleTime` (2156-2184), `testAttack` player version (2231-2292). Read in part: `finishUsePower` (701-790 only: liveCounter check, stun return, AoE lead; the effect application 790-1008 NOT read), `PowersBase` cost, cast and recycle formulas (236-243, 353-365, 544-549), `ActionsBase.blocked` (248, the stun immunity line only). Only lines read, not the body: the mob cast path (`useMobPowerA` 590 and 677, `testAttack` mob version 2306-2319). NOT read: `CharmPowerAction.java` and `CreateMobPowerAction.java` (charm and minion creation), `NPCManager` necro pet code, `EffectsBase.java` durations and stacking (779 lines). Power values are loaded from a database row (`PowersBase(ResultSet rs)`, line 122); no SQL file is in the box, so no per-spell number from the game is in this donor. Receipts: the constants 1.5 (line 452), 94 (2252) and 4 (2256) sit on lines too short for a 15-character quote, so they are cited by line number and read directly, with no receipt row. Confidence: high on the player cast sequence (cost, lock, cast timer, cancel, completion guard); medium on the hit roll (one function read, the mob version read by line only). Camera: not applicable.

Best transferable idea: Start the recycle lock at cast press (lock = cast time + recycle time), let movement or damage cancel only the powers flagged for it, and void a cast whose caster has died or changed life counter, so a cooldown bar and a cast bar can never disagree with the server.
Decision (proposed): adapt. Take the lock-from-cast-start, the flag-driven cancels and the live-counter void; fix the two gaps listed in section 6 (no cost refund on cancel; a stunned caster's cast is dropped silently).
Acceptance: A server test casts a power with 1.2 s cast and 4 s recycle; the lock is active from cast press to 5.2 s; a second cast press during the 1.2 s is refused; moving during a power flagged as not castable while moving cancels the cast and releases the lock in the same tick.

## 1. Mechanism

- Power record: a row loads cost (`this.cost`, PowersBase.java:236), cast time (238) with its ramp (`initRamp`, 239), recycle time (241) with its ramp (242), and max trains (243). Each ramp has an add or multiply flag: cast uses `initRampAdd` (354) and recycle uses its own `recycleRampAdd` (361), each as `base + ramp * trains` when set, else `base * (1 + ramp * trains)` (353-364); cost works the same way (544-549). Trains = the caster's rank in that power; a player's trains are clamped to the power's max (PowersManager.java:277) and then forced to the player's total trains in that power (289-291; zero total trains refuses the cast).
- Gate order in `usePowerA` (player cast), as read: (a) a dead caster is sent a recycle message and the cast stops (220); (b) if the power's recycle lock is still running, the cast is refused (235); (c) an unknown power (no PowersBase) is refused (243); (d) if the caster already has a pending power, the new cast is refused (255: `getLastPower() != null` returns); (e) an unlearned power is refused unless CSR (262); (f) trains are clamped to the power's max (277) and set to the player's total (289-291); (g) the combat or non-combat mode must allow the power (read from ~300 on; exact lines not re-checked); (h) stun, CannotCast or a blocked power category refuses the cast (313); (i) a power that cannot be cast while moving is allowed only when the distance left on the path is at most one second of movement (320, 327); (j) range and target checks; (k) effect and equipment prerequisites; (l) the cost (443-474).
- Cost: `getCost(trains)` (443); a PowerCost bonus percent multiplies it (449); a caster in the air pays x1.5 (452); undead casters pay health; otherwise mana, stamina or health is taken with its own `modify*` call (the mana branch is at 474). The cost is taken at cast press, before the cast time runs.
- Recycle lock: `time = pb.getRecycleTime(trains)` (297). `getRecycleTime` is the recycle base (plus ramp) in ms plus `getCastTime(trains)` (362), so the lock covers the cast and the recycle together. The lock is a scheduled job `FinishRecycleTimeJob` stored in the caster's recycle map (494), and its job unlocks the power (`finishRecycleTime`, 2156-2184, sends the recycle message).
- Cast timer: `cancelOnCast()` (525); cast time `getCastTime(trains)` (532); if it is over 100 ms the caster is flagged as casting for regen (537-539); if it is under 1 ms the power finishes at once (547); otherwise a `UsePowerJob` is scheduled after the cast time (550) and stored as the caster's pending power (553).
- Completion guard, `finishUsePower` (701-790 read): it clears the casting flag and the pending power (719 onward). If the caster is dead or its live counter differs from the one saved at cast press (719), the lock is released with cancel = true and the power does not apply. If the caster is stunned, the function returns silently at 756; the lock still runs out on its own job. For an AoE with a main target, the donor computes a speed allowance `target speed * cast seconds` (777, the same line also at 808); what that allowance is compared against was not read.
- Cancel rules (`PowersManager.java` 2497-2568): `cancelOnMove` cancels the pending power if it cannot be cast while moving (2529), and cancels item use; `cancelOnTakeDamage` cancels only if the power has `cancelOnTakeDamage` (2550), and also cancels item use; `cancelOnSit` always cancels (2543); `cancelOnSpell` cancels if the power has `cancelOnCastSpell` (2512); `cancelOnStun` is empty (2564-2566), so a stun does not cancel a cast directly.
- `cancelPower` (2612-2643): cancels the scheduled cast job (`AbstractScheduleJob.cancelJob`, 2628), which calls `UsePowerJob._cancelJob` (UsePowerJob.java:42-45, 'cast stopped early, reset recycle timer') and so releases the recycle lock via `finishRecycleTime(..., true)`; clears the pending power, and for a take-damage cancel also tells every character in range to clear the cast bar (2633-2641). Nothing in `cancelPower` refunds the cost, but the recycle lock IS released on every cancel, so a cut cast can be re-pressed at once. `finishUsePower` also releases the lock when the caster has a BlockedPowerType bonus for the power category (760-762). Dead code: `cancelUseLastPower` (2185-2218, no callers) tests `getRecycleTimers().contains(token)`, which on a ConcurrentHashMap tests values not keys, so it never releases.
- Hit roll, `testAttack` player version (2231-2292): if the attacker's skill rating (ATR) is above the target's defense, or the defense is 0, the hit chance is 94 (2251-2252). Otherwise `dif = ATR / defense`; at or below 0.8 the chance is 4 (2255-2256); above it the chance is `(int)(450 * (dif - 0.8)) + 4` (2258). A roll of 0 to 99 (2262) under the chance is a hit (2265); a hit can then be dodged by the Dodge passive (2270). The function returns true when the attack is avoided.

## 2. Key functions

- `PowersManager.usePowerA`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/PowersManager.java` 199-560 (the player cast gate, cost, lock, cast timer).
- `PowersManager.finishUsePower`: same file, 701-790 (completion guard; the rest not read).
- `PowersManager.cancelOnMove`, `cancelOnTakeDamage`, `cancelOnSit`, `cancelOnSpell`, `cancelOnStun`: same file, 2497-2568.
- `PowersManager.cancelPower`: same file, 2612-2643.
- `PowersManager.finishRecycleTime`: same file, 2156-2184.
- `PowersManager.testAttack` (player): same file, 2231-2292.
- `PowersBase` ramp formulas: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/powers/PowersBase.java` 353-364 and 544-549.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cast time per rank: base plus ramp times rank, or base times (1 + ramp times rank) | Base and ramp read from DB columns `castTime` and `initRamp` (PowersBase.java:238-239); no values in the box |
| Recycle lock = recycle time (ramped) + cast time, started at cast press | Columns `recycleTime` and `recycleRamp` (241-242); lock starts at 494 |
| Cast cost: ramped by rank, times (1 + PowerCost bonus), times 1.5 in the air | Ramp in `costRamp` (546); 1.5 at PowersManager.java:452 |
| Visible cast threshold | 100 ms (537) |
| Movement grace: last second of movement lets a non-move-cast power through | One second of movement: remaining distance squared against speed squared (327) |
| Hit chance: 94 cap when attacker rating beats defense; 4 floor; slope 450 above a 0.8 ratio | Constants at 2252, 2256, 2258 |
| Death or life-counter change voids the cast and releases the lock | Live counter saved at cast press (`casterLiveCounter`, 719) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order for a player cast: dead, lock check, pending-cast refusal, stun and CannotCast, the move rule, rank clamp, cost, then the lock and the cast timer (zero cast time finishes at once). It treats the cost as a plain subtraction, and leaves out the altitude check's source, the undead health branch, the CSR free-cast case, the target, range, prerequisite and combat-mode checks, the item cancel, the AoE lead, the cast animation message, and the Dodge passive (only its effect on the roll result is kept). It replaces the Java job scheduler with explicit `nowMs` timestamps and a `tick` call. It also refunds nothing on cancel, which is the donor's behaviour; section 6 lists that as a gap.

```ts
// Licence: MIT (donor). Clean-room sketch of the same casting mechanism; the donor's shape is followed, lines are not translated.
interface PowerDef {
  id: number;
  castTimeS: number;            // base cast time, seconds
  castRamp: number;             // per-rank ramp on cast time
  recycleS: number;             // base recycle (cooldown) time, seconds
  recycleRamp: number;          // per-rank ramp on recycle
  castRampAdd: boolean;         // donor initRampAdd: true: base + ramp*rank; false: base * (1 + ramp*rank)
  recycleRampAdd: boolean;      // donor recycleRampAdd, a separate flag
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
  return Math.trunc(rampValue(def.castTimeS, def.castRamp, rank, def.castRampAdd) * 1000);
}
function recycleMs(def: PowerDef, rank: number): number {
  return Math.trunc(rampValue(def.recycleS, def.recycleRamp, rank, def.recycleRampAdd) * 1000) + castMs(def, rank);
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
  if ((c.recycleUntilMs.get(def.id) ?? 0) > nowMs) return "recycling";
  if (c.pending !== null) return "already casting";                       // one pending power at a time, checked after the lock
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
// A cancel also releases the recycle lock (donor: cancelJob -> UsePowerJob._cancelJob -> finishRecycleTime(cancel = true)).
function cancelPending(c: Caster): void {
  if (c.pending) c.recycleUntilMs.delete(c.pending.def.id);
  c.pending = null;
}
function onMove(c: Caster): void {
  if (c.pending && !c.pending.def.canCastWhileMoving) cancelPending(c);
}
function onTakeDamage(c: Caster): void {
  if (c.pending && c.pending.def.cancelOnTakeDamage) cancelPending(c);
}
function onSit(c: Caster): void { cancelPending(c); }

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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg006-shadowbane-cast-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (proposed new module; the current Frankendom file was not read in this pass). Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this note writes from the mechanism and adapts only the shape)
- Brief rule served: 1 (one engine: the cast and lock run in the engine, not the Pit client); rules 7-9 n/a

## 6. Gaps and risks

- MIT: adaptation is allowed, but the sketch is written from the described mechanism and no donor line is copied.
- Defect 1 (fix: refund on cancel). `cancelPower` (2612-2643) clears the cast but does not refund the cost, so a cast cut by a hit or a move costs the caster. Fix: one ledger entry that refunds the cost when a cast is cancelled before it lands.
- Defect 2 (fix: tell the caster). A stunned caster at completion returns silently (756); the caster sees nothing and loses the cast. Fix: send an explicit "cast failed: stunned" event and refund under defect 1.
- Gap 3: `cancelOnStun` is empty (2564-2566), so a stun does not cancel a cast until the completion check. Frankendom's stun is a state change (engage/stun rulings): the server should cancel a pending cast when the stun is applied, not at completion.
- Gap 4: the donor's timers are wall-clock jobs (`js.scheduleJob`, ms). Frankendom's server tick is fixed-step, so the cast completes on a tick, not at a timestamp. The sketch's `tick` shows the shape; the step size is not decided here.
- Gap 5: the donor's cast cost is paid at press, not at land. For a server-verified fight, the cost needs one ledger entry (defect 1).
- Not read, flagged for a later pass: `CharmPowerAction.java` (charm, mind control) and `CreateMobPowerAction.java` (minion creation) are both in `powers/poweractions`; the mob cast path body (`useMobPowerA`, 570-700) and the effect application in `finishUsePower` (790-1008); `EffectsBase.java` durations and stacking.
- Immunity ladder: `ActionsBase.blocked` (248-257) is a per-type boolean immunity (stun, snare, blind, power block, root), not a shared diminishing-returns ladder. The Proof 3 ladder must come from Frankendom's rulings.
- Hit roll: the player version is read; the mob version is read by line only (2306-2319). Confirm before reuse.
- Fast mobile fight: the donor's numbers are not in the box, so no cast or recycle values are proposed from the donor.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Gate order wrong: real order is dead (220), recycle (235), unknown power (243), pending lastPower (255), unlearned/cheat (262), trains clamp (277); the sketch had pending before recycle (confirmed against the code; section 1 and sketch fixed).
- usePowerA ends at 560, not 552 (confirmed; fixed).
- Trains are also forced to the player's total at 289-291 (confirmed; added).
- Sketch used one rampAdd flag; donor has separate initRampAdd (PowersBase 354) and recycleRampAdd (361) (confirmed; sketch split).
- MAIN MISSED, confirmed: cancel releases the recycle lock (cancelJob -> UsePowerJob._cancelJob -> finishRecycleTime(...,true)); the sketch's onMove/onTakeDamage/onSit left the lock set, contradicting the Acceptance. Sketch now releases it; Defect 1 (cost refund) still stands as the donor's real gap.
- Also missed, confirmed: finishUsePower releases the lock on BlockedPowerType (760-762); cancelUseLastPower (2185-2218) never releases (contains() on map values) and has no callers.
Fixed 2026-10-12: gate order, line range, trains clamp, split ramp flags, cancel-releases-lock in note and sketch (work/shadowbane-cast-sketch.ts), extra missed items as a short line in the cancelPower bullet.
