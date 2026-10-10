# NodeL2-NodeL2 (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Npc/Npc.js` (`enterCombatState` 45-111, `meleeHit` 127-153), with `src/GameServer/Automation.js` 81-105 and `src/GameServer/Actor/Generics/UpdateEnvironment.js` | Licence: Apache-2.0 (repo-root `LICENSE`, "Apache License / Version 2.0, January 2004") | JavaScript (Node) | symbol `enterCombatState`

Checked: The list hint `src/GameServer/Network/Request/CharSelected.js` is the WRONG file: it reads a character-slot packet and calls `consume` (lines 5-11). The server timing is per-NPC and per-action timers, not a server tick loop. Grep for `setTimeout|setInterval|tick|sleep` over all of `src` found only per-entity timers (Npc.js 57, 64, 108, 110, 137, 149; Automation.js 53, 73; Timer.js 8, reached through `Timer.start` at Automation.js 99 and 137) and per-action timers on the Actor side. There is NO shared fixed-step loop, so this note describes the NPC chase-and-strike timing and its resolution step. Files opened: `Npc/Npc.js` (full), `Automation.js` (full), `Timer.js` (full), `SpeckMath.js` (full), `Formulas.js` (combat functions 132-151), `Actor/Generics/UpdateEnvironment.js` (full), `Actor/Generics/UpdatePosition.js` (grep of its Generics calls, lines 4-27), `Actor/Generics/index.js` (line 1-3 and 29), `Global.js` (101, path mapping), `Npc/Generics/ReceivedHit.js` (full), `Actor/Generics/AttackExec.js` (full), `Actor/Generics/EnterCombatState.js` (full), `NodeL2.js` (full), `LICENSE` (line 2). Callers checked: `scheduleAction` (Npc.js 91; AttackExec.js 5 and 15; SkillExec.js 6); NPC `enterCombatState` (`Npc/Generics/ReceivedHit.js` 11; `UpdateEnvironment.js` 25); `updateEnvironment` (`UpdatePosition.js` 11; `TeleportTo.js` 17). Confidence: high on the NPC combat timer and arrival formula (read end to end). Not read: the player-side hit receiver (`Actor/Generics/ReceivedHit.js`), the player's own melee (`Actor/Attack.js`), `utils.oneFromSpan`, `Session.dataSendToMeAndOthers`, the NPC death path, and the NPC stat model. The 100 ms poll (Npc.js 108) and the 1000 ms start delay (Npc.js 110) and the 3000 ms replenish (Automation.js 73) are on lines too short to quote, so they are stated from reading only. Camera: not applicable. Category: server-tick-netcode.

Best transferable idea: Compute each approach's arrival time on the server from (distance minus target radius) over speed, then resolve the strike at a fixed fraction of the attack time with a re-check before damage.

Decision (proposed): adapt - keep the arrival-time rule and the strike-time re-check, but drop the per-NPC 100 ms setInterval loops, because Frankendom's server tick needs one fixed step and a per-tick NPC budget (row 18 sub-line), not one timer per NPC.
Acceptance: a server test runs one fixed-step duel where the defender steps out of reach after the swing starts; the hit must NOT land at the hit tick if the range check fails there (the donor would still land it), and the arrival tick for a 3-unit approach matches the ETA formula.

## 1. Mechanism

- Trigger: a hostile NPC enters combat when an actor is within 500 units (2D) of it (`UpdateEnvironment.js` 22-26). `enterCombatState` (Npc.js 45-111) sets run and attack flags, sends walk and auto-attack start to nearby clients (54-55), then after a 1000 ms delay (110) starts a per-NPC `setInterval` at 100 ms (64, 108).
- Each poll, in this order (Npc.js 64-108):
  (a) Leash: if the 2D distance to the actor is 1500 or more, abort combat and return (65-68).
  (b) If the NPC is blocked, skip this poll (70-72).
  (c) If the NPC is in motion, do not schedule again; if the actor's position changed, snap the NPC part way along to a midpoint (ratio `fetchDistanceRatio() * 1.3`, flagged as a hack at 80) and abort the action (78-84).
  (d) Otherwise remember the actor's position (87-89) and call `scheduleAction` with the actor's radius as the stop distance (91).
- `scheduleAction` (Automation.js 87-105): sends a move to the pawn, sets the towards state, computes the arrival delay with `ticksToMove` (94-96), and starts an arrival timer (99).
- Arrival delay (Automation.js 81-85): distance = 3D distance from source to destination minus the stop radius (82); duration in ticks = 1 + (ticksPerSecond x distance) / speed (83); milliseconds = (1000 / ticksPerSecond) x duration (84). With ticksPerSecond = 10 this is 100 ms + 1000 x distance / speed ms.
- On arrival (Npc.js 91-106): the NPC sets its position to the remembered coords, and if its 2D distance to the actor is at most the NPC attack radius (94), it sends a stop-move and calls `meleeHit` (104). If not in range, nothing happens and the next poll reschedules.
- `meleeHit` (127-153): attack time = 500000 / attack speed in ms (`Formulas.js` 133). The hit is decided at the start (`calcHitChance`, Npc.js 133; 90 percent, Formulas.js 150, marked "faked for now" at 149). An attack packet (hit or miss) goes out at once (134). At 0.644 x attack time the donor re-checks participants (138; death only, see Section 6) and, if the hit was landed, applies damage `77 x pAtk / pDef` (Formulas.js 142; `Npc.js` 144 passes random spread 0). At full attack time the hit flag clears (147-152).
- Death in either side aborts combat (`checkParticipants`, 155-161; 156-157).
- Hit received (`Npc/Generics/ReceivedHit.js` 1-12): HP is clamped at 0 (2), the replenish timer starts (10), and the NPC enters combat (11). Replenish is a 3000 ms interval that adds regen and stops at full (`Automation.js` 47-74).

## 2. Key functions

- `enterCombatState` (NPC): `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Npc/Npc.js` 45-111. Starts the per-NPC 100 ms loop; the whole chase-and-strike cycle.
- `abortCombatState`: `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Npc/Npc.js` 113-125. Clears the interval, the destination and the automation actions, and sends stop messages.
- `meleeHit` (NPC): `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Npc/Npc.js` 127-153. Attack time, hit decision, damage at 0.644, flag clear.
- `scheduleAction` and `ticksToMove`: `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Automation.js` 81-105. The arrival ETA and the arrival timer.
- `Timer.start`: `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Timer.js` 6-9. Clears any existing timer on the handle, then sets a `setTimeout`.
- `updateEnvironment` (aggro scan and refresh): `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/UpdateEnvironment.js` 5-27. See Section 6 for the `this` binding defect.
- `Formulas.calcMeleeAtkTime`, `calcMeleeHit`, `calcHitChance`: `/mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Formulas.js` 132-150.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Leash: abort if the target is farther than a fixed 2D distance | 1500 units (Npc.js 65) |
| Aggro: hostile within a 2D radius enters combat; 5000 circle pre-filter | 500 units (UpdateEnvironment.js 22); pre-filter 5000 (6) |
| Per-entity poll for chase | 100 ms (Npc.js 108, too short to quote); start delay 1000 ms (110) |
| Arrival ETA = base + (distance - stop radius) / speed | ticksPerSecond = 10 (Automation.js 17) gives 100 ms base; 1000 x distance / speed ms |
| Strike resolves at a fraction of attack time, flag clears at full time | 0.644 (Npc.js 147); attack time = 500000 / attack speed ms (Formulas.js 133) |
| Hit chance check at attack start | 90 percent, a placeholder (Formulas.js 150) |
| Damage = 77 x attacker P.Atk / defender P.Def | 77 (Formulas.js 142) |
| Regen interval | 3000 ms (Automation.js 73, too short to quote) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's distance rules (2D for leash, 3D for arrival with the target radius subtracted), the arrival formula, the 0.644 strike fraction, the attack-time formula, and the death-only re-check at resolution. It omits the 100 ms poll and the 1000 ms start delay (no timers here; Frankendom ticks), the in-motion midpoint hack, the timer handle bookkeeping, the aggro scan, the attack packets to clients, the replenish, and the hit-chance roll (passed in as a boolean). The 77 multiplier is the donor's `calcMeleeHit` with its random spread set to 0, since `utils.oneFromSpan` was not read. The donor's `speed` name is the attack duration, not a speed; the sketch uses `atkSpd` for the attack speed input.

```ts
// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Unit {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  radius: number;
}

const TICKS_PER_SECOND = 10;   // donor Automation.ticksPerSecond, passed here as data
const LEASH_2D = 1500;         // donor Npc.js disengage distance, passed here as data
const MELEE_HIT_FRACTION = 0.644;

export function dist3(a: Unit, b: Unit): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function leashBroken(npc: Unit, target: Unit): boolean {
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  return Math.sqrt(dx * dx + dy * dy) >= LEASH_2D;
}

// Arrival delay in ms: stop at the target's radius, then 100 ms per tick of travel time.
export function arrivalMs(src: Unit, dst: Unit, speed: number): number {
  const distance = dist3(src, dst) - dst.radius;
  const duration = 1 + (TICKS_PER_SECOND * distance) / speed;
  return (1000 / TICKS_PER_SECOND) * duration;
}

// Attack time in ms from attack speed (donor: 500000 / atkSpd).
export function meleeAttackMs(atkSpd: number): number {
  return 500000 / atkSpd;
}

export function meleeTimes(attackMs: number): { hitAt: number; flagClearAt: number } {
  return { hitAt: attackMs * MELEE_HIT_FRACTION, flagClearAt: attackMs };
}

// Resolution re-check: the donor checks that both sides are alive, not that they are still in range.
export function resolveMelee(attacker: Unit, target: Unit, hitLanded: boolean, pAtk: number, pDef: number): number {
  if (!attacker.alive || !target.alive) return 0;
  if (!hitLanded) return 0;
  return (77 * pAtk) / pDef;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/schedule.ts` (new module: arrival ETA and strike resolution, driven by the server's fixed step, not per-entity timers). Parity-checklist row 18 (server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget"). This donor covers the strike-time re-check and the ETA rule only.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, but this sketch is clean-room in shape)
- Brief rule served: 1 (one engine, server-verified kills: the strike is resolved on the server with a re-check); rules 7-9 n/a

## 6. Gaps and risks

- The resolution step re-checks death only (Npc.js 138 calls `checkParticipants`, and 156 checks `fetchDead`), not range. A defender who steps out of reach after the swing starts still takes the hit at 0.644. Frankendom needs a decision at the hit tick (range and guard state, rule 3).
- No fixed step: each NPC runs its own 100 ms `setInterval` (Npc.js 64). Frankendom's row 18 needs one fixed tick and a per-tick NPC budget. Reject the per-entity loop.
- The refresh gate in `UpdateEnvironment.js` 9 reads `this.previousXY`, but line 18 writes `actor.previousXY`. The caller is `Generics.updateEnvironment(session, actor)` (`UpdatePosition.js` 11), and `Generics` is `invoke(path.actor)` (`UpdatePosition.js` 4; `Global.js` 101), which is the Generics index module (`index.js` 29). So `this` is that module, `this.previousXY` is always undefined, the comparison is always against (0, 0), and the refresh (10-16) runs on every position update once the actor is 1000 or more units from the origin. This is read statically; not run. Do not copy the pattern; key the refresh to the actor's own last position.
- Aggro has no cap: every hostile NPC within 500 units enters combat (`UpdateEnvironment.js` 22-26). Frankendom's MAX_ATTACKERS = 3 must be enforced in the engine, not left to the zone's spawn density.
- The hit chance is a placeholder with a TODO (Formulas.js 149-150). Do not port the 90 percent figure as a balance number.
- The in-motion midpoint snap is a hack with a TODO (Npc.js 80, ratio 1.3 at 80). Do not port it; use a server-side correction rule instead.
- Distance rules differ: arrival uses 3D (Automation.js 82; SpeckMath.js 101-108) while leash and aggro use 2D (Npc.js 65; UpdateEnvironment.js 22). Frankendom must pick one per rule. The code does not show whether the mix is intended.
- The numbers 1500, 500, 100, 1000, 0.644 and 77 are donor values for a 2004-era chronicle. Frankendom's must be zone data fields, not constants.
- Not read: the player-side receiver of the hit (`Actor/Generics/ReceivedHit.js`), the player's own melee path (`Actor/Attack.js`), `utils.oneFromSpan`, and the session send path.


## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None. Verified: enterCombatState 45-111 (1000 ms start 110, 100 ms interval 108, leash 1500 at 65, blocked skip 70-72, in-motion midpoint hack 78-84 with 1.3 ratio at 80, scheduleAction with actor radius 91, arrival check vs atk radius 94, meleeHit 104), meleeHit 127-153 (hit rolled at 133, packet 134, 0.644 at 147, flag clear 149-152, checkParticipants death-only 155-161), Automation ticksToMove 81-85 (ticksPerSecond 10 at 17), scheduleAction 87-105, replenish 3000 ms at 73, Formulas 132-151 (500000/atkSpd, 77*pAtk*mul/pDef, 90% at 150), UpdateEnvironment `this.previousXY` vs `actor.previousXY` defect (9 vs 18) and 500 aggro/5000 prefilter (6, 22), Timer.start 6-9, Circle inherits 2D Point.distance, Point3D.distance 3D, Npc/Generics/ReceivedHit 1-12, Apache-2.0. Global.js is at src/Global.js (note gives no dir).

**Missed:** ReceivedHit 5-8: a lethal hit calls npc die and returns before replenish/enterCombat; note only lists the non-lethal path.
