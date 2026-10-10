# LostCityRS-Engine-TS (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/NetworkPlayer.ts` (intake budget), with `src/network/game/client/handler/MoveClickHandler.ts`, `src/network/game/client/codec/MoveClickDecoder.ts`, `src/network/game/client/ClientGameProtCategory.ts`, `src/engine/entity/PathingEntity.ts`, `src/engine/World.ts` | Licence: MIT (as read: `/mnt/frankendom-donors/LostCityRS-Engine-TS/LICENSE`, "MIT License", Copyright (c) 2023-2026 Lost City; code may be adapted) | TypeScript | symbol `NetworkPlayer.decodeIn` / `MoveClickHandler.handle`

Checked: The hint file `src/engine/entity/Player.ts` is not the intake mechanism. The parts read are the target checks (`validateTarget`, 1233-1245; `isValid`, 2293-2303) and the movement entry (`updateMovement`, 674-699); the rest of the file was not read. The real mechanism is spread over five files, all read for the parts named: `NetworkPlayer.ts` 55-153 (intake loop and budgets; 155 onward not read), `ClientGameProtCategory.ts` 1-15 (all), `MoveClickHandler.ts` 1-58 (all), `MoveClickDecoder.ts` 1-30 (all), `PathingEntity.ts` 118-345 and 633-679 (movement, step, teleport, displacement; the rest of the file not read), `World.ts` 318-340, 601-632, 690-737 and 490-516 (tick loop and intake order; the telemetry block not read), `Obj.ts` 48-62 and `Entity.ts` 28-34 (target validity). Config read: `WorldConfig.ts` 103 and 242 (grep). Also grepped `src` for `RESTRICTED_EVENT` (only `NetworkPlayer.ts` and `ClientGameProtCategory.ts` mention it) and for `userLimit|clientLimit` (only `NetworkPlayer.ts`). Not read: `CollisionFlag` and `canTravel` in the routefinder (so what blocks a step is not checked); the walk triggers in `Player.ts`; the login rate limits and ban code (`LoginServer.ts` 184-238, 324; `WorldConfig.ts` 108-109; `LoginClient.ts` 133); `ClientCheatHandler.ts` (only the staff gates at 53, 57, 189, 550 read). Confidence: high on the budget counting and the move click bounds (the code is short and read in full); high on the step order; medium on the tick timing (the scheduler is read, the OS timer jitter is not). This is not a camera cell, so no `camera_scope`.

## 1. Mechanism

- Intake per tick (World.ts 601-632 calls `decodeIn` once per connected player inside `processClientsIn`). `decodeIn` (NetworkPlayer.ts 55-80) zeroes the three counters (64-66), then reads packets while every counter is under its budget (69). Each `read()` (84-153) reads one opcode and its payload, decodes it, and runs the handler. A success in USER_EVENT counts toward the user budget (141-142). Every other outcome, including a failed user event, counts toward the client budget (146). RESTRICTED_EVENT counts toward its own budget (143-144), but no packet class in `src` uses it, so that budget never fills.
- Budgets (ClientGameProtCategory.ts 5-8): CLIENT_EVENT 20, USER_EVENT 5, RESTRICTED_EVENT 2 per tick. The comment (10-11) says that when a budget is hit, decoding ends and "picks up where it left off on the next tick": unread bytes stay in the socket buffer. Nothing is dropped by the budget itself.
- Packet hygiene inside `read()`: an opcode with no entry closes the connection (100-103); a variable length above 1600 closes the connection (119-122).
- Move click (the only movement input read in full): the decoder (MoveClickDecoder.ts 11-29) reads a control byte, a start x and z, and up to 24 waypoints as signed byte offsets from the start (21-25). The handler (MoveClickHandler.ts 11-57):
  1. If the player is delayed, reject and clear the map flag (12-15).
  2. Reject if the control flag is not 0 or 1, or if the start is more than 104 tiles from the player (`distanceToSW`, Chebyshev) (20-24). A rejection also sets `userPath` to empty (22).
  3. Clear pending interaction, except for op-click moves (30-32).
  4. Ctrl-run is run only if run energy is 100 or more; otherwise walk (35-39).
  5. If `clientRoutefinder` is on (default true, WorldConfig.ts 103), the client's path is copied into `userPath` and queued (42-48). If it is off, the server computes its own path to the last point with `findPath` (51-54).
- Step (PathingEntity.ts): once per tick `processMovement` calls `validateAndAdvanceStep`: at 142 for crawl, at 146 for walk or the first run step, and at 148 for the second run step, which runs only if the first step moved (147). `validateAndAdvanceStep` (206-252) takes the step from `takeStep` (221), moves, refreshes collision and zone presence (231), dequeues the waypoint if reached (234-238), and counts a step only if the position changed (241-248).
- `takeStep` (633-679): direction toward the current waypoint; try the diagonal (only when width is 1) (664), then E/W (669), then N/S (674), each with `canTravel`; if none is allowed, the step is `[0, 0]` and the waypoint stays (678).
- Displacement: `World.processPlayers` (687; the loop starts at 690) calls `validateDistanceWalked` for each player whose movement mask lacks `EXACT_MOVE` (724-725). `validateDistanceWalked` (324-335) sets `jump = true` if the tile distance from `lastTickX/Z` is over 2 (the comment at 322 states the threshold). It does not reject the move.
- Teleport (287-319): the level is clamped to 0-3 (291); a target zone that is not allocated is refused for any player below staff level 3 (293), with the message "Invalid teleport!" (295). A teleport sets the position, the facing and a `tele` flag (303-313); a change of level also sets `INSTANT` and `jump` (315-318).
- Target validity: `Player.validateTarget` (1233-1245) requires the same level (1235), that an NPC or loc has not changed type (1240-1241), and `target.isValid(hash64)` (1244). `Obj.isValid` (52-62) refuses an object when `reveal` is set (above -1) and the caller's hash differs from `receiver64` (53-55), or when its count is below 1 (57-58).
- Tick driver: `World.cycle` schedules the next cycle with `setTimeout` from a fixed `nextTick` (504 `nextTick += tickRate`; 508 `setTimeout(...)` with the remaining time minus drift; 343 drift is measured against `nextTick`). `TICKRATE` is 600 ms (120). Order within `World.cycle`: intake `processClientsIn` (355), then NPCs (367), then `processPlayers` (378), then logouts and logins, zones and info, and client output `processClientsOut` (408).

## 2. Key functions

- `NetworkPlayer.decodeIn`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/NetworkPlayer.ts` 55-80. Resets the counters and runs the read loop under budget.
- `NetworkPlayer.read`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/NetworkPlayer.ts` 84-153. One packet: opcode, length, close rules, decode, handle, count by category.
- `MoveClickHandler.handle`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/game/client/handler/MoveClickHandler.ts` 11-57. Bounds check, run energy gate, client or server path.
- `PathingEntity.validateAndAdvanceStep` and `takeStep`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/PathingEntity.ts` 206-252 and 633-679. One collision-checked step per call.
- `PathingEntity.teleport` and `validateDistanceWalked`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/PathingEntity.ts` 287-319 and 324-335.
- `Player.validateTarget` and `Obj.isValid`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1233-1245 and `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Obj.ts` 52-62.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Per-tick decode budget by category; leftover waits in the buffer | CLIENT 20, USER 5, RESTRICTED 2 (ClientGameProtCategory.ts 5-8) |
| Reject oversize packets and unknown ids by closing the socket | 1600 bytes (NetworkPlayer.ts 119); no entry closes (100-103) |
| Click waypoints bounded | 24 waypoints plus the start, so 25 points (MoveClickDecoder.ts 21) |
| Start point range from the player | 104 tiles, Chebyshev (MoveClickHandler.ts 20) |
| Control flag range | 0 or 1 (MoveClickHandler.ts 20) |
| Run needs energy | 100 (MoveClickHandler.ts 35) |
| Steps per tick | walk 1; run 2 if the first step moved (PathingEntity.ts 142-148) |
| Displacement that becomes a jump | more than 2 tiles since last tick (PathingEntity.ts 322-333) |
| Teleport zone and level bounds | level 0-3 (PathingEntity.ts 291); unallocated zone refused below staff level 3 (293) |
| Tick length and schedule | 600 ms fixed step (World.ts 120, 504, 508) |

## 4. TypeScript sketch

simplified: keeps the per-tick intake budget by category (leftover messages wait in the queue; a rejected user message counts against the client budget, as the donor does), the move-click bounds (control flag, 104-tile start range, 25-point cap), the run-energy gate, and the one-or-two steps per tick with the diagonal, E/W, N/S fallback under a collision predicate. It omits: the packet length cap and unknown-opcode close, the byte decoder (offsets from the start), the client route option (the donor's default accepts the client path; the sketch always takes a server-given path, which is our proposal), the width > 1 case, the displacement "jump" flag (kept as a pure function, not wired), the walk triggers, the target-validity checks and the tick scheduler. Direction is the sign of the delta, not the donor's face direction. The donor stores waypoints reversed; the sketch keeps them in order.

```ts
// Licence: MIT (donor, LICENSE: "MIT License", Copyright (c) 2023-2026 Lost City). Code may be adapted; this sketch is written from the described mechanism, not copied line by line.
// simplified: keeps the per-tick intake budget by category (leftover messages wait in the queue), the bounds check on a move click (control flag, start range, 25-point cap), the run-energy gate, and the one-or-two-steps-per-tick walk with collision-checked diagonal, E/W, N/S fallback. Omits: the packet length cap and unknown-opcode close, the byte decoder (waypoints as signed offsets from the start), the client-side route option (the donor's clientRoutefinder default accepts the client path; this sketch always takes a server-given path), the width > 1 case, the displacement "jump" check, the walk triggers and the target-validity checks. Direction is the sign of the delta, not the donor's face direction. The donor stores waypoints reversed; this sketch keeps them in order.

export type Category = "client" | "user" | "restricted";

// Per-tick decode budget per category (donor: CLIENT_EVENT 20, USER_EVENT 5, RESTRICTED_EVENT 2).
export const BUDGET: Record<Category, number> = { client: 20, user: 5, restricted: 2 };

export interface Pending<T> {
  category: Category;
  msg: T;
}

// Drain at most the budget this tick. Messages past the budget stay queued for the next tick; none are dropped here.
// A rejected user message counts against the shared client budget, as in the donor (NetworkPlayer.ts 141-147).
export function intakeTick<T>(queue: Pending<T>[], handle: (msg: T) => boolean): number {
  const used: Record<Category, number> = { client: 0, user: 0, restricted: 0 };
  let applied = 0;
  while (
    queue.length > 0 &&
    used.client < BUDGET.client &&
    used.user < BUDGET.user &&
    used.restricted < BUDGET.restricted
  ) {
    const p = queue.shift();
    if (p === undefined) break;
    const ok = handle(p.msg);
    if (ok && p.category === "user") {
      used.user++;
    } else if (p.category === "restricted") {
      used.restricted++;
    } else {
      used.client++;
    }
    if (ok) applied++;
  }
  return applied;
}

export interface Pt {
  x: number;
  z: number;
}

export interface MoveClick {
  ctrlHeld: number;
  path: Pt[];
}

export const MAX_POINTS = 25;         // start point plus 24 waypoints (donor decoder: index < 25)
export const MAX_START_RANGE = 104;   // tiles, Chebyshev distance from the player (donor: distanceToSW > 104)

export type Verdict = { ok: false } | { ok: true; path: Pt[]; run: boolean };

// Bounds check on a click before any path is queued. A rejection leaves the player's queued path empty.
export function validateMoveClick(player: Pt, energy: number, click: MoveClick): Verdict {
  if (click.ctrlHeld !== 0 && click.ctrlHeld !== 1) return { ok: false };
  const start = click.path[0];
  if (start === undefined) return { ok: false };
  const range = Math.max(Math.abs(player.x - start.x), Math.abs(player.z - start.z));
  if (range > MAX_START_RANGE) return { ok: false };
  // Ctrl-run is downgraded to walk when run energy is below 100 (donor MoveClickHandler.ts 35-39).
  const run = click.ctrlHeld === 1 && energy >= 100;
  return { ok: true, path: click.path.slice(0, MAX_POINTS), run };
}

export type CanTravel = (x: number, z: number, dx: number, dz: number) => boolean;

// Direction to take this step: diagonal, then E/W, then N/S, else stay. Every step is checked against collision.
export function nextStep(x: number, z: number, target: Pt, canTravel: CanTravel): [number, number] {
  const dx = Math.sign(target.x - x);
  const dz = Math.sign(target.z - z);
  if (dx !== 0 && dz !== 0 && canTravel(x, z, dx, dz)) return [dx, dz];
  if (dx !== 0 && canTravel(x, z, dx, 0)) return [dx, 0];
  if (dz !== 0 && canTravel(x, z, 0, dz)) return [0, dz];
  return [0, 0];
}

// One server tick of walking: one step, or two when running. A blocked step keeps the waypoint for the next tick.
export function walkTick(start: Pt, path: Pt[], run: boolean, canTravel: CanTravel): { pos: Pt; reached: number } {
  let pos: Pt = { x: start.x, z: start.z };
  let idx = 0;
  const steps = run ? 2 : 1;
  for (let i = 0; i < steps && idx < path.length; i++) {
    const target = path[idx];
    const [dx, dz] = nextStep(pos.x, pos.z, target, canTravel);
    if (dx === 0 && dz === 0) break;
    pos = { x: pos.x + dx, z: pos.z + dz };
    if (pos.x === target.x && pos.z === target.z) idx++;
  }
  return { pos, reached: idx };
}

// Displacement since the last tick above 2 tiles is sent as a jump, not a walk (donor validateDistanceWalked; not rejected).
export function isJump(lastTick: Pt, now: Pt): boolean {
  return Math.max(Math.abs(now.x - lastTick.x), Math.abs(now.z - lastTick.z)) > 2;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/lostcity-intake-budget.ts`): exit 0, no output.

## 5. Lands in

- TARGET `origins/server/intake.ts` (new; proposed): the server's per-tick client intake (budget, bounds, path acceptance) and the per-step walk check. It sits in the server tick next to the engine, not in `src/fight/`; the fight rules stay in `src/fight/`.
- Parity-checklist row 5 (controls/input, intake). The per-tick budget is the server-tick sub-line of row 18 ("server tick: fixed step, input intake, per-tick NPC budget"); the tick timing (600 ms fixed step) belongs there too. Row 5 is the closest single row; no row is written for anticheat.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, this sketch is a rewrite of the mechanism)
- Brief rule served: server-verified intake (the server decides where the hero can go, one step at a time, and never trusts a client position as truth) and one ledger (the intake counters are per tick on the one player record)

Best transferable idea: a per-tick decode budget per input category, where messages past the budget wait in the queue for the next tick instead of being dropped, with each step checked against the server's own collision before the hero moves.

Decision (proposed): adapt — take the per-category budget, the leftover-waits rule, the bounds on a move click and the collision-checked single step per tick; reject the donor's default of trusting the client's route (`clientRoutefinder: true`, WorldConfig.ts 103), because our server computes the path from the destination so a client cannot queue a path it chose.
Acceptance: A server test sends 30 valid move clicks in one tick and asserts exactly 5 are applied that tick, the other 25 are applied on the next ticks in order, and none are dropped; a move click whose start is 105 tiles away is rejected and the hero does not move on that tick.

## 6. Gaps and risks

- Failed user events count against the 20-message client budget, not the 5-message user budget (NetworkPlayer.ts 141-146). A flood of rejected clicks is therefore allowed 20 per tick, and only accepted clicks use the 5. Whether that was intended is not stated in the code. Frankendom should decide on purpose (the sketch keeps the donor behaviour).
- RESTRICTED_EVENT is defined (ClientGameProtCategory.ts 8) and read in the loop (NetworkPlayer.ts 69, 143), but no packet class uses it (grep of `src`). It is dead budget in this copy.
- Rejecting a move click clears `userPath` (MoveClickHandler.ts 22) and returns before `queueWaypoints`, so waypoints queued earlier are not cleared by this handler. Frankendom must not assume a rejected click cancels the walk; cancel explicitly.
- The client route is accepted by default (WorldConfig.ts 103). A client can make the server walk any path that passes its collision checks, and the server only sees the tiles one step at a time. For Frankendom's authoritative duel and zone rules this is the wrong default; the donor's own server-path branch (MoveClickHandler.ts 51-54) is the one to keep.
- Displacement is a presentation fix, not a check: a move of more than 2 tiles in one tick sets `jump` (PathingEntity.ts 333) and is not rejected. Frankendom needs a real rejection or a clamp, and a per-player rate limit on flags.
- Packet hygiene is coarse: 1600 bytes is the only size limit, and an unknown opcode closes the connection (NetworkPlayer.ts 100-103, 119-122). There is no per-player rate of rejected messages and no flag ledger in this path. Login rate limits (`rateLimitAddressLogin` 30, `rateLimitDeviceLogin` 5; WorldConfig.ts 108-109) and the player ban record (LoginServer.ts 238) are separate mechanisms, not read in full here.
- Teleport refusal (PathingEntity.ts 293-295) is the only place a refused action tells the player why. Staff bypass is at level 3 (293), while the cheat handler gates staff at 2 and 4 (ClientCheatHandler.ts 53, 57). Frankendom should keep one staff level table.
- The collision predicate (`canTravel`, `CollisionFlag`) was not read, so what a step is blocked by is not described here beyond the call sites.
