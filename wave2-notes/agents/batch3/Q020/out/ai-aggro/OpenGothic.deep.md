# OpenGothic (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` (with `common/world/worldobjects.cpp`, `common/game/gamesession.cpp`) | Licence: MIT (`LICENSE` line 1 "MIT License", copyright 2019 Try) | C++ | symbol `Npc::updateNearestEnemy` (with `Npc::perceptionProcess`, `Npc::canSenseNpc`, `Npc::implAiFlee`)

Checked: Read in full: `npc.cpp` 2155-2185 (updateNearestEnemy), 4119-4126 (isEnemy), 4186-4262 (perceptionProcess, both overloads, hasPerc), 4646-4705 (canRayHitPoint and canSenseNpc), 1941-1985 (implAiFlee), 3062-3080 (setTarget, target, clearNearestEnemy); `worldobjects.cpp` 218-262 (NPC-near list and perception loop), 488-500 (detectNpcNear); `gamesession.cpp` 300-316 (tick) and 355-360 (time multiplier); `world.cpp` 384-388 and `gamescript.cpp` 1466-1470 (tickCount wrappers). Grep-only: `npc.cpp` 202 (default perception period), `gamescript.cpp` 2242 (script sets the period), `gothic.cpp` 608 (call site of the tick; delta units not read). Candidates opened: npc.cpp, worldobjects.cpp, gamesession.cpp, world.cpp, gamescript.cpp, `game/fightalgo.cpp` (the fight move queue and range tests: not the aggro logic), plus the list hint `common/world/aiqueue.cpp` (a script action queue with save/load; not aggro). Not read: the start of `WorldObjects::tick` (152-217), the Daedalus perception handlers (where a target is actually chosen and `setTarget` is called from script), `personAttitude` (the hostility table), the `percRanges` values, `angleDir` (the sign convention of the cone test), the waypoint `useCounter` semantics, and the dt unit at `gothic.cpp` 608. Confidence: high on the target pick, sensing and the perception clock (read end to end); medium on the flee search; the decision to attack is in scripts and was not read. Camera: not applicable.

## 1. Mechanism

- Scheduling, once per world tick (`WorldObjects::tick`, `worldobjects.cpp` 152; the near list is rebuilt at 221): NPCs within 3000 units of the player (radius constant 223, squared distance test 230) are added to `npcNear` and set to the normal AI policy (231). NPCs within 6000 units (constant 224, test 235) get the far policy, the rest the farthest policy. Only `npcNear` members are given perception; the player and dead NPCs are skipped (251). An NPC is processed only when its perception clock is due (255-256).
- Perception clock: after each perception, `perceptionNextTime = tickCount + max(perceptionTime, 1)` (4229, 4168). The default period is 5000 (`npc.cpp` 202) and scripts set it as seconds times 1000 (`gamescript.cpp` 2242). Ticks come from the frame delta scaled by the time multiplier (`gamesession.cpp` 309-313, 358). Tick units are taken as milliseconds: the script converts seconds with `*1000`, and the delta's unit at the call site was not read.
- `perceptionProcess(player)` (4188), in order: non-normal policy only resets the clock (4198-4201). Player perception if a handler exists and the player is sensed with the view cone (4204). Enemy perception: `updateNearestEnemy` (4210), then if an enemy was found, `perceptionProcess(enemy, PERC_ASSESSENEMY)`; if that returns false, the enemy is dropped (4216). Body perception (4220-4223). Then the clock is reset (4229).
- Enemy pick (`updateNearestEnemy`, 2161):
  (a) The current nearest enemy is kept as the starting best, with its distance, while it is alive and sensed with free line of sight (2167-2170). The hostility test is not repeated for it.
  (b) For each NPC in `npcNear` (2173) that is hostile (`isEnemy` = script attitude is ATT_HOSTILE, 4124), alive, and not this NPC (2174): it replaces the best only if strictly nearer (squared distance) and sensed with free line of sight (2178).
  (c) The result is stored (2183).
- Perception range (`perceptionProcess(enemy, perc)`, 4239-4242): the range comes from a script table indexed by perception type, defaulting to the NPC's senses range; it is squared and compared with the squared distance. Out of range returns false, which drops the enemy in step (4216).
- Sensing (`canSenseNpc`, 4691-4705): a range check on the squared distance (senses range plus extra range). Smell is always included. Hearing only for noisy events, and the enemy check passes `isNoisy = false` (4686 in the overload that takes an NPC). Sight needs the SEE bit and `canRayHitPoint` (4703). `canRayHitPoint` (4646-4680): `freeLos` sets angle 180, which means a ray only with no cone (4647, 4666-4668); otherwise the cone is about +-100 degrees (`ref` at 4664) with a ray (4674-4678). The sign convention of the cone test (4675) depends on `angleDir`, which was not read.
- Flee (`implAiFlee`, 1941; called from state AI_Flee): the waypoint search is within 5 m (1951); a waypoint with `useCounter > 0` is skipped (1954), as are underwater ones and any without a clear ray upward 10 units (1955-1958, not individually receipted). The waypoint farthest from the threat is kept (1960). If there is none, or the threat is nearer the waypoint than the NPC (1970), the NPC turns directly away from the threat; otherwise it turns toward the waypoint. Then `go2.setFlee()` (1982).
- Target storage: `setTarget` (3064) stores `currentTarget` and clears the walk order unless the NPC is the player (3065-3068). The C++ does not copy `nearestEnemy` into `currentTarget`; the scripts do that, and were not read.
- Tick: none of this is a per-frame physics loop; it is a tick-gated scheduler. Each NPC evaluates targets only on its own clock.

## 2. Key functions

- `Npc::updateNearestEnemy`: `/mnt/frankendom-donors/OpenGothic/common/world/objects/npc.cpp` 2161-2184. Sticky best, then the strictly-nearer scan over `npcNear`.
- `Npc::perceptionProcess(Npc&)`: `npc.cpp` 4188-4230. The clock, the enemy call and the drop.
- `Npc::perceptionProcess(Npc&, Npc*, float, PercType)`: `npc.cpp` 4233-4256. Range check and handler call.
- `Npc::canSenseNpc` and `Npc::canRayHitPoint`: `npc.cpp` 4646-4705. Free line of sight versus view cone.
- `WorldObjects::tick` near list and perception loop: `/mnt/frankendom-donors/OpenGothic/common/world/worldobjects.cpp` 218-262.
- `Npc::implAiFlee`: `npc.cpp` 1941-1985.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the current target while it is alive and sensed; replace only by a strictly nearer hostile | None (the rule) (theirs, npc.cpp 2168, 2178) |
| Target search only over NPCs near the player (presence gate) | Near radius 3000 units (theirs, worldobjects.cpp 223); far radius 6000 (224) |
| Per-NPC perception clock: run when due, then wait a period | Default period 5000 ms (theirs, npc.cpp 202); script sets seconds x 1000 (gamescript.cpp 2242); minimum 1 (4168) |
| Enemy dropped when outside its perception range (squared) | Range from script table (theirs, npc.cpp 4239); squared (4240) |
| Sight = range, then optional view cone, then ray | View half-angle 100 degrees (theirs, npc.cpp 4664); free sight uses angle 180 (4647) |
| Flee: waypoint within 5 m, not in use, farthest from threat; else turn away | Radius 500 units (theirs, npc.cpp 1951); ray lift 10 (1955-1958, not receipted) |

## 4. TypeScript sketch

simplified: keeps the sticky nearest-enemy pick (current enemy kept without a hostility re-check and replaced only by a strictly nearer sensed hostile), the free-sight versus cone sensing (the cone is a plain geometric test, not the donor's sign convention), the per-NPC perception clock, and the range drop. It omits the player and body perception, the non-normal policy branch, the script handlers that would set a target, the flee search, the near and far radii (the caller supplies `near`), and the waypoint use counts. The order is kept: the kept enemy is the starting best, distance is compared before sight, and the drop check comes after the pick.

```ts
// Licence: MIT (donor, LICENSE line 1). Clean-room sketch written from the described rules; MIT would also allow adapting the code.
// clean-room

export interface P2 { x: number; z: number; }
export interface Npc { id: string; pos: P2; down: boolean; hostile: boolean; facing: number; }

const VIEW_HALF_ANGLE = (100 * Math.PI) / 180; // +-100 degree view (donor code comment: spec requires +-100)

function d2(a: P2, b: P2): number { const dx = a.x - b.x; const dz = a.z - b.z; return dx * dx + dz * dz; }

// freeLos: ray only, no view cone. Otherwise the target must lie inside a cone around facing.
export function canSense(me: Npc, other: Npc, freeLos: boolean, rangeUnits: number, rayClear: (a: Npc, b: Npc) => boolean): boolean {
  if (d2(me.pos, other.pos) > rangeUnits * rangeUnits) return false;
  if (!freeLos) {
    let da = Math.abs(Math.atan2(other.pos.z - me.pos.z, other.pos.x - me.pos.x) - me.facing);
    if (da > Math.PI) da = 2 * Math.PI - da;
    if (da > VIEW_HALF_ANGLE) return false;
  }
  return rayClear(me, other);
}

// Nearest hostile that can be sensed. The current enemy is kept while it is alive and sensed (not re-checked for hostility),
// and is replaced only by a strictly nearer hostile.
export function updateNearestEnemy(me: Npc, prev: Npc | null, near: Npc[], senseFree: (o: Npc) => boolean): Npc | null {
  let best: Npc | null = null;
  let bestD = Infinity;
  if (prev !== null && !prev.down && senseFree(prev)) { best = prev; bestD = d2(me.pos, prev.pos); }
  for (const o of near) {
    if (!o.hostile || o.down || o === me) continue;
    const d = d2(me.pos, o.pos);
    if (d < bestD && senseFree(o)) { best = o; bestD = d; }
  }
  return best;
}

export interface PerceptionClock { nextAt: number; periodMs: number; }

// Runs only when due; a current enemy outside the perception range is dropped; the clock is then reset.
export function perceive(me: Npc, prev: Npc | null, near: Npc[], senseFree: (o: Npc) => boolean,
                         rangeUnits: number, nowMs: number, clock: PerceptionClock): Npc | null {
  if (clock.nextAt > nowMs) return prev;
  const found = updateNearestEnemy(me, prev, near, senseFree);
  const kept = found !== null && d2(me.pos, found.pos) <= rangeUnits * rangeUnits ? found : null;
  clock.nextAt = nowMs + Math.max(clock.periodMs, 1);
  return kept;
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new: the sticky target pick and the per-NPC perception clock for an NPC's enemy). Parity-checklist row 4 (fight loop: aggro, chase, leash). The near-radius gate (only NPCs within 3000 units of the player get any perception) is the per-tick NPC budget that the server tick sub-line names (row 18 / post-K item 3); it is not in this row's target and is noted in section 6.
- today: no target stickiness or perception clock in `src/fight/`; the fight move queue is row 2 (AI brain) and the range tests are row 1 (duel step).
- Reuse tag: adapt-allowed (MIT, `LICENSE` line 1; sketch written from the rules, not copied)
- Brief rule served: 1 (one engine: the target pick and the perception clock live in src/fight, not in a client); many-on-one target selection lives in the engine; MAX_ATTACKERS = 3 still applies (the sticky pick keeps the three slots from flickering).
Best transferable idea: An NPC keeps its current target while it stays alive and sensed, switches only to a strictly nearer hostile, and re-runs that pick on its own timer rather than every tick.
Decision (proposed): adapt — take the sticky target rule and the per-NPC pick timer for the MAX_ATTACKERS = 3 slots, so a crowd does not flicker between targets and the pick cost is bounded per NPC; reject the flee waypoint search for now, because the duel has guard and stagger (row 3) and no flee rule in our rulings.
Acceptance: A server test asserts that an NPC keeps its target while the target is alive and in free sight, switches only to a hostile strictly nearer than the target, drops the target when it leaves the NPC's perception range, and re-runs the pick only after its perception period (default 5000 ms, set per NPC).

## 6. Gaps and risks

- Licence: MIT. Adaptation is allowed; this note still gives only the rules and a clean-room sketch.
- The donor's decision to attack (the script handler and `setTarget`) was not read. The C++ keeps `nearestEnemy`; whether a monster attacks it is decided in scripts.
- Sticky target has a cost: a kept enemy is not re-checked for hostility (2167-2170). Frankendom must re-check attitude on each pick, or keep the rule only for targets already engaged.
- The search is limited to NPCs in the near list (within 3000 units of the player). An NPC far from the player is never a candidate, so a duel outside that radius would see no target. This is the donor's presence gate, and it matches the per-tick NPC budget sub-line rather than the target rule.
- Tick units: the delta at `gothic.cpp` 608 was not read; the millisecond reading rests on the script's `sec*1000` conversion (`gamescript.cpp` 2242). Frankendom's server tick has to fix its own clock before the 5000 ms default means anything.
- The cone sign convention (4675) depends on `angleDir` (not read); the sketch uses a plain geometric cone. Do not port the cone test without reading that function.
- Not read: the start of `WorldObjects::tick` (152-217), `personAttitude`, the `percRanges` values, waypoint `useCounter` semantics.
