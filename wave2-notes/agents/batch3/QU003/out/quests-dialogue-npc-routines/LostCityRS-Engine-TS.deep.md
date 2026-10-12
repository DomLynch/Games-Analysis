# LostCityRS-Engine-TS (quests-dialogue-npc-routines, cell 1)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` | Licence: MIT License, Copyright (c) 2023-2026 Lost City (LICENSE line 1, as read) | TypeScript | symbols `Npc.turn`, `Npc.processMovementInteraction`, `Npc.wanderMode`, `Npc.patrolMode`, `Npc.processQueue`

Checked: Routine code read end to end: `patrolMode` 741-782, `wanderMode` and `wander` 705-739, `processMovementInteraction` 585-612, `processQueue` 561-584, `clearPatrol` 389-393, the `enqueueScript` call 251, `turn()` 109-145 and 170-182 (lines 146-169 not read), `NpcType.ts` defaults 98-125 and decode 150-156, 221-243, `NPC_SETMODE` 205-225, `NPC_QUEUE` 159-165, `World.processNpcs` 665-675, `PathingEntity.teleport` 287-312 (not read: the body of `CoordGrid.face` and `focus`). Each private routine has one caller in the class (`wanderMode` and `patrolMode` are called only from 601 and 604; grep run). Confidence high on the routine mechanism (wander, patrol, dwell, leash, queue). Quests and dialogue trees are NOT in this box: the `LostCityRS/Content` repo (the `.rs2` scripts) is absent, `data/` holds only `data/raw/wordenc` and keys, and grep for `quest`, `quests`, `journal`, `objective`, `dialogue` as whole words in `src`, `data`, `tools`, `view`, `prisma` returns no schema (one comment about an input dialogue in Player.ts:774). So this note covers routines; quests and dialogue are reported as absent, not read. camera_scope: not a camera cell.

## 1. Mechanism

- Idle NPC behaviour runs in the NPC's own turn, once per world cycle: `World.processNpcs` calls `npc.turn()` for every NPC (World.ts 665-675, call at 367). Inside `turn()` the order is: resume a delayed script and lifecycle events (respawn, revert, despawn; 111-145), then (lines 146-169 not read), hunt target (`consumeHuntTarget`), regen, timers, queued NPC scripts (`processQueue`, Npc.ts 179), movement-interactions (`processMovementInteraction`, 181), then reorientation. Only the last three are routine-relevant; hunt can set a target before the mode runs.
- The NPC's mode is `targetOp`, set from the type's `defaultmode` (Npc.ts 99; `NpcType.ts` 110 defaults it to WANDER). Three modes are targetless and run before any target check: NONE (`noMode`, handled first, ~597), WANDER (600-601) and PATROL (603-604). `processMovementInteraction` returns early for them, so a patrolling NPC does not need a target.
- WANDER (`wanderMode`, 720-739): each tick, with chance 0.125 (724), and only if the type is not NOMOVE, pick a tile: spawn tile plus `dx` and `dz`, each drawn from `Math.round(Math.random() * (range * 2) - range)` (706-708), where `range` is `wanderrange` (default 5, `NpcType.ts` 101). If the tile differs from the current tile, queue one waypoint (710-712, read). Then `updateMovement`. Leash: a counter `stuckCounter` goes up every wander tick and is reset to 0 whenever the NPC actually moved (377). When the old value is above 500 (733) and the NPC is not on its spawn, it teleports to spawn (735) and the counter resets (737). The comment at 732 says "501 ticks"; the test fires on the 502nd idle tick.
- PATROL (`patrolMode`, 741-782): the route is a list of packed coordinates `patrolCoord` with a per-point dwell `patrolDelay` in ticks (`NpcType.ts` 114-115, decode 233-241). The NPC walks to `patrolPoints[nextPatrolPoint]` (750). It increments `stuckCounter` every tick (757) and teleports to the point when the counter reaches 32 or the floor differs (760-762). On reaching the point, the dwell is loaded once (767-769); when the countdown `patrolDelayTicksRemaining--` reaches 0 or below (772), the index advances modulo the point count (773), the countdown resets to -1 (774) and a waypoint to the new point is queued (775-776).
- Dwell arithmetic (derived from the code order, not measured): a point with dwell d loads d on arrival, the first check decrements it, and the NPC leaves on the tick d after arrival. Dwell 0 leaves the same tick.
- Mode switching: `NPC_SETMODE` accepts WANDER, PATROL and NONE as targetless modes (`NpcOps.ts` 209), clears the interaction and, for PATROL, calls `clearPatrol` (212-213; Npc.ts 389-393 resets the index, the stuck counter and the countdown).
- Delayed steps: `NPC_QUEUE` (`NpcOps.ts` 159-164) calls `enqueueScript(AI_QUEUE<n>, delay, arg)`, which appends a request with a delay (Npc.ts 251). `processQueue` (561-584) decrements the delay only while the NPC is not delayed (569) and runs the queue's script when the delay is 0 or below (572). This is the only timer a script gets for "say this later". What the script says is in the content repo (not read).
- Speech and text: `NPC_SAY` calls `say` (`NpcOps.ts` 185-187). `MES` writes a game message to the active player (`PlayerOps.ts` 343-347). `PUSH_VARP` writes a player varp (`CoreOps.ts` 25). A varp is the only quest-flag hook the engine exposes; there is no quest table in the engine.
- No time-of-day schedule: the engine has no clock-based location table for NPCs (grep for daytime, time of day, schedule, hour, clock in `src/engine` and `NpcType.ts` finds only tick clocks for timers and hunts). A patrol is a fixed loop of points, not a day plan.

## 2. Key functions

- `Npc.turn` (order of the NPC turn): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` 109-181.
- `Npc.processMovementInteraction` (mode dispatch): Npc.ts 585-612.
- `Npc.wanderMode` and `Npc.wander` (leash and random tile): Npc.ts 705-739.
- `Npc.patrolMode` (route, dwell, stuck snap): Npc.ts 741-782.
- `Npc.processQueue` (delayed scripts): Npc.ts 561-584.
- `NpcType` route and mode fields: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/config/NpcType.ts` 101-115 (defaults), 153-154 (code 26), 221-230 (codes 206, 210), 233-241 (code 212, the route).
- Opcodes: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/NpcOps.ts` 159-164 (NPC_QUEUE), 185-187 (NPC_SAY), 209-213 (NPC_SETMODE).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Idle wander: random tile in a box around spawn, 1/8 chance per tick, leash home after a long idle | wanderrange 5 default, decoded from code 26 (`NpcType.ts` 101, 153-154); chance 0.125 (Npc.ts 724); leash test "> 500" on the old counter (733); comment says 501 (732) |
| Patrol route: ordered points, each with dwell ticks; snap to the point after a stuck count | route count is one byte; each point a signed 4-byte packed coord and a 1-byte dwell (`NpcType.ts` 236, 240-241); stuck snap at 32 (Npc.ts 760) |
| Move restriction and default mode as type fields | moverestrict default NORMAL (`NpcType.ts` 107, decode 221-222); defaultmode default WANDER (110, decode 229-230) |
| Delayed per-NPC script step | delay counts down one per tick while not delayed (Npc.ts 569); fires at 0 or below (572) |
| Spawn tile as home for every idle rule | startX, startZ set in the constructor (Npc.ts 83) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for each tick (wander roll, then leash; patrol arrival, dwell, advance) and the dwell arithmetic (leave on arrival tick + d). It omits: the floor-change check (the donor teleports on a level change), the NOMOVE/PASSTHRU collision rules, path-finding (the caller walks one tile per tick toward the returned target), the onSpawn check (the sketch always snaps home), the delayed-script queue, fight modes and the spawn/despawn lifecycle. Changes against the donor: (1) the patrol stuck counter counts only walking ticks (the donor also counts dwell ticks); (2) the wander offset is an integer uniform draw (the donor's `Math.round` gives the two end offsets half weight); (3) the random source is a seeded per-NPC stream instead of `Math.random`. The caller must reset `idleTicks` and `walkTicks` when `pos` changes, as the donor does at Npc.ts 377.

```ts
// Licence: MIT (donor LostCityRS-Engine-TS, Copyright (c) 2023-2026 Lost City). Clean-room sketch written from the mechanism.
// Target (proposed): src/fight/ai-idle.ts. One call per NPC per fixed server tick.

export {};

type Rand = () => number; // seeded per-NPC stream, values in [0, 1)

interface Tile { x: number; z: number; }
interface PatrolPoint extends Tile { dwellTicks: number; }

interface RoutineDef {          // one NPC type row (zone data)
  mode: "wander" | "patrol";    // default idle mode
  moveRestrict: boolean;        // true = never leaves its tile
  wanderRange: number;          // tiles either side of home
  patrol: PatrolPoint[];        // ordered points, each with a dwell time
}

interface RoutineState {
  home: Tile;                   // spawn tile
  pos: Tile;                    // current tile; the caller updates it after a move
  nextPoint: number;            // patrol index
  dwellLeft: number;            // -1 = not dwelling
  idleTicks: number;            // wander leash counter; the caller resets it when pos changes
  walkTicks: number;            // patrol stuck counter; counts only while walking
}

type Cmd = { kind: "stand" } | { kind: "walk"; to: Tile } | { kind: "snap"; to: Tile };

const WANDER_CHANCE = 0.125;     // chance per tick to pick a new wander tile (engine constant)
const WANDER_LEASH_TICKS = 500;  // idle ticks before the snap home (engine constant)
const PATROL_STUCK_TICKS = 32;   // ticks walking without arriving before a snap (engine constant)

function randInt(rand: Rand, lo: number, hi: number): number { // inclusive, uniform
  return lo + Math.floor(rand() * (hi - lo + 1));
}

function wanderTick(def: RoutineDef, st: RoutineState, rand: Rand): Cmd {
  let cmd: Cmd = { kind: "stand" };
  if (!def.moveRestrict && rand() < WANDER_CHANCE) {
    const r = def.wanderRange;
    const to: Tile = { x: st.home.x + randInt(rand, -r, r), z: st.home.z + randInt(rand, -r, r) };
    if (to.x !== st.pos.x || to.z !== st.pos.z) cmd = { kind: "walk", to };
  }
  const old = st.idleTicks;
  st.idleTicks++;
  if (old > WANDER_LEASH_TICKS) {
    st.idleTicks = 0;
    const onHome = st.pos.x === st.home.x && st.pos.z === st.home.z;
    if (!onHome) return { kind: "snap", to: st.home };
  }
  return cmd;
}

function patrolTick(def: RoutineDef, st: RoutineState): Cmd {
  const n = def.patrol.length;
  if (n === 0) return { kind: "stand" };
  const p = def.patrol[st.nextPoint];
  const atPoint = st.pos.x === p.x && st.pos.z === p.z;
  if (!atPoint) {
    st.walkTicks++; // fix: counts walking only (the donor also counted dwell ticks)
    if (st.walkTicks >= PATROL_STUCK_TICKS) {
      st.walkTicks = 0;
      return { kind: "snap", to: p };
    }
    return { kind: "walk", to: p };
  }
  st.walkTicks = 0;
  if (st.dwellLeft < 0) st.dwellLeft = p.dwellTicks;
  if (st.dwellLeft === 0) {
    st.dwellLeft = -1;
    st.nextPoint = (st.nextPoint + 1) % n;
    return { kind: "walk", to: def.patrol[st.nextPoint] };
  }
  st.dwellLeft--;
  return { kind: "stand" };
}

export function routineTick(def: RoutineDef, st: RoutineState, rand: Rand): Cmd {
  return def.mode === "patrol" ? patrolTick(def, st) : wanderTick(def, st, rand);
}

// Seeded stream that replaces Math.random: one stream per NPC so a replay gets the same choices.
// A 32-bit LCG is enough for the sketch; a real build would use a stronger seeded generator.
export function seededRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
```

Typecheck: copied to the VPS `/tmp/qu003-npc-routine.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020` on it: exit 0.

## 5. Lands in

- TARGET `src/fight/ai-idle.ts` (new, proposed): the idle step for NPCs not in a fight, run in the same engine tick as the fight AI. Parity row 2 (AI brain). Zone population caps and respawn stay with row 23 and are not part of this note.
- Route and leash numbers are NPC-type data (zone data), not constants in the function.
- Reuse tag: adapt (MIT; the shape is taken, the sketch is clean-room; keep the MIT notice if any line is copied).
- Brief rule served: 1 (one engine: the routine runs in the engine's NPC tick, not in a client); zones as data (routes are type rows).
- Best transferable idea: Give each NPC type a short data route (ordered points, each with a dwell in ticks) plus a leash to its spawn tile, and run both as one idle step per server tick.
- Decision (proposed): adapt — take the route-with-dwell and leash-to-spawn shape as NPC-type rows, with the donor's three defects fixed (dwell counted as stuck, unseeded random, half-weighted end offsets); reject the donor's snap-home as the only way back to spawn.
- Acceptance: a server test with a 3-point route and dwell 2 at point 2 shows the NPC standing on exactly 2 ticks (the arrival tick and the next) and walking on the third, with no snap during the dwell; a wander NPC never leaves the box of its wander range around spawn over 10,000 seeded ticks, and two runs with the same seed give the same tiles.

## 6. Gaps and risks

- Quests and dialogue trees: absent from this box (no `.rs2` scripts, no quest schema). The engine gives only opcodes: varp write (`CoreOps.ts` 25), `MES` (`PlayerOps.ts` 343), `NPC_SAY` (`NpcOps.ts` 185), delayed script steps (`NPC_QUEUE`). Frankendom gets no quest or dialogue schema from this donor; the content would have to be read from the Content repo, which is not here.
- Unseeded randomness: the wander roll uses `Math.random` (Npc.ts 706, 724). Frankendom's determinism and replay rules need one seeded stream per NPC; the donor cannot replay.
- Defect, patrol stuck counter (fix: count walking only): `stuckCounter++` runs every patrol tick (757) and is reset only by movement (377) or `clearPatrol` (390). A dwell longer than 32 ticks therefore triggers the 32-tick snap (760-762) to the NPC's own tile, and that teleport calls `focus()` with a facing computed from old to new tile (`PathingEntity.ts` 309). What facing a same-tile teleport produces was not read.
- Defect, wander end offsets (fix: integer uniform draw): `Math.round` on a continuous value (706) gives the two end offsets half the weight of the middle ones.
- Defect, comment and code disagree (fix: align the comment or the constant): comment says teleport "501 ticks" (732), the test is "> 500" on the old value (733), so the snap is on the 502nd idle tick.
- Visible jump: the leash snap is a state jump. In Frankendom it should be a server-verified walk back, or a short fade on the client; the server must not accept a position the route did not produce (one ledger).
- Frankendom rule conflict to watch: an idle NPC that starts a fight must leave the routine and enter the fight AI (row 4); the routine must never set kill, damage or loot state. MAX_ATTACKERS = 3 is not in this donor.
- Tick rate: dwell and leash are in ticks, so the Frankendom values must be written in the same tick unit the server uses (not read: the world cycle length).
- Provenance comments: NPC_SETMODE (`NpcOps.ts` 204-205) and enqueue (`Npc.ts` 256-257) cite Jagex developer posts on X as the basis for the behaviour. The posts were not read. History: no `.git` and no changelog in the repo root, so "no history available" for patches.

As-data shape (PASS2):
- Source table: the NPC type record, decoded by `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/cache/config/NpcType.ts`. The decoder reads a compiled record (`dat.g1`, `dat.g2`, `dat.g4s`); the text source is in the absent Content repo (not read).
- Row fields: `wanderrange: uint16` (code 26), `moverestrict: uint8` (code 206), `defaultmode: uint8` (code 210), `patrol: count uint8, then count x [coord: int32 packed, dwell: uint8]` (code 212).
- A new idle route is one row: yes (one NPC type record with a code 212 block, no code change). The authoring path is in the absent content repo.

Ruling for Dom:
1. Should zone NPCs wander within 5 tiles of spawn when no one is near? Recommend yes, so the world reads as alive at 375 wide; the 1/8 chance per tick keeps it quiet.
2. Should idle moves use a seeded stream per NPC? Recommend yes, so replays and server checks match (determinism row).
3. When an idle NPC leaves its leash, should it walk back or snap? Recommend walk back, server-verified, with no visible jump.

Reuse tag: adapt (MIT). Brief rule served: 1, zones as data.

Added 2026-10-12 (checker, verified in Npc.ts / PathingEntity.ts / NpcType.ts): `NpcType.maxrange` (default wanderrange + 2, NpcType.ts 102-124) exists but the wander roll ignores it (only `wanderrange` is used). `PathingEntity.teleport` (287-312) returns silently when the target zone is not allocated (`isZoneAllocated`), so a patrol or leash snap can fail while the stuck counter still resets: a possible stuck loop. Fix when porting: have teleport report failure and keep the counter.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- 'Two modes are targetless: WANDER and PATROL' was wrong: NONE (noMode) is also targetless and handled first.
- turn() order omitted hunt, regen and timers that run before processQueue.
- Missed: maxrange unused by wander; teleport silently fails on unallocated zones (possible stuck loop).

Fixed 2026-10-12: targetless-mode count, turn() order, added maxrange/teleport line.
