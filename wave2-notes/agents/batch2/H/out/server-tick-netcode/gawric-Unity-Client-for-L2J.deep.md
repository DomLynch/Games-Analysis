# gawric-Unity-Client-for-L2J (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/Validate/PositionValidationController.cs` | Licence: Apache-2.0 (root LICENSE, line 1 "Apache License"; header text read only to line 5) | C# (Unity client for an L2J/aCis server) | symbol `PositionValidationController.Update`

Checked: This repo is a CLIENT. There is no server tick loop in it, so the "server tick: fixed step, input intake, per-tick NPC budget" sub-line is only covered from the client side (fixed-step movers, thread hand-off intake, periodic position reports, snapshot reconcile). Read in full: `PositionValidationController` (272 lines), `PlayerPositionSender`, `PeriodicTimer`, `L2PlayerMoveGait`, `MoveAllCharacters`, `MovementData`, `EventProcessor`, `PacketApplyQueue`, `NetworkDispatcher`, `NetworkTransformReceive`, `IncomingGameQueue.Run`. Read in part: `PlayerController` (FixedUpdate 114-160, MoveToPoint 284-290, StopMove 298-304), `EntityActionMove` (40-72, 120-142). Not read: the server (aCis/L2J Java, not in this repo), `GameServerPacketHandler`, how `ValidateLocationDto` is parsed, and `PlayerMovementSpeedCalculator`. Confidence: high on what the client does; nothing is known here about server tick rate. Depth is thin for the tick topic.

Best transferable idea: reconcile with a two-band rule on the server's reported position (ignore a small error, walk to the server point for a medium error, teleport for a large one), and have the client report its position on a coarse timer count instead of every frame.

## 1. Mechanism

- Intake: a socket worker (`IncomingGameQueue.Run`, started with `Task.Run`, 124) takes raw packets from a blocking queue (139) and parses them (158). The parsed model goes through `NetworkDispatcher.Dispatch`, which wraps the handler in `QueueApply` (20); that pushes it onto a `ConcurrentQueue` (`EventProcessor`, 39). Every Unity `Update`, `EventProcessor` dequeues and runs ALL queued actions in one loop (45), with an exception catch per action. If the handler is already running on the apply path (`_applyDepth > 0`), a nested queue call runs inline instead of re-queueing (`PacketApplyQueue` 17-19). So packet handling is unbounded per frame: no per-tick budget.
- Server sync (inbound): the server sends `ValidateLocation` packets; the incoming handler just adds the DTO to a list (`ValidateLocationIncoming` 8, `AddValidateLocation` 221). `PositionValidationController.Update` (47) walks that list each frame: it looks up the entity; if it is missing or dead the entry is dropped (67-105). Otherwise `d` = 2D distance between the entity and the server position. If `0.15 < d < 3.743` (74, trigger 26) it calls `StartWalk` (83): for a monster or NPC it sets the entity's action to Move toward the server position unless it is already moving (200-211); for `UserEntity` it only logs "NO_HANDLER" (216); `PlayerEntity` has no branch, so nothing happens (I infer `PlayerEntity` is the local player and `UserEntity` a remote player; the class definitions were not read). If `d > 3.743` (85) it calls `Jump` (96): monster or NPC position is set to the ground-snapped server position (170, 164); for `PlayerEntity` the position is set the same way (via `PlayerController`), and the walk/run animation is restarted if the player was heading to a destination (134-143, 177-185). `d` between 0 and 0.15, or exactly 3.743, does nothing. `UserEntity` in the Jump chain also only logs NO_HANDLER (154-158). Entries are removed after one pass (99, 111). The code comment says 197 units = 3.743 m (comment at 25, Russian text partly read). Only the Jump/StartWalk branches for monster, NPC and player were read; other entity types fall through silently.
- Position reports (outbound): when the local player moves, `PlayerController.FixedUpdate` (every physics step) updates a `PeriodicTimer` that increments a counter once its interval elapses (`PeriodicTimer` 23-26). The interval is set to 1 second on move start (`PlayerController` 289), and `PlayerPositionSender` sends a `ValidatePositionCommand` only when the counter changed (`PlayerPositionSender` 9, 27). On arrival it sends once more (`PlayerController` 303). The sender method is misleadingly named "Every1ms".
- Gait: the same counter at 0.1 s drives walk -> run: walk while the count is <= 3 (`L2PlayerMoveGait` 6, 12), i.e. about the first 0.3 to 0.4 s of a move. A new move packet for a moving unit inherits the previous gait clock (`MoveAllCharacters` 90).
- Remote movers: a move packet creates a `MovementData` with a target and stop distance (`EntityActionMove` 57-72; moves shorter than 0.12 are treated as already arrived). `MoveAllCharacters.FixedUpdate` (116) advances every active mover per fixed step along the straight 2D direction at the unit's walk/run speed via `CharacterController.Move(direction * speed * deltaTime)` (`MovementData` 209), finishes when within the stop distance (175) or when the position did not change after a move (188), then snaps non-player units to the destination (272). The server never sends positions per tick here; it sends a destination and the client simulates the walk.
- Legacy desync lerp: `NetworkTransformReceive` measured client vs server position and lerped back if the gap exceeded 3 grid nodes (60-77), but all four spawners disable it (`DisableLegacyPositionSync`, e.g. `NpcSpawner` 46; its own comment says SetNewPosition is never called, `EntitySpawnShared` 209). So it is dead code.
- Tick: Unity fixed step stored in `ProjectSettings/TimeManager.asset` as `m_Count: 1411199` over a numerator of `141120000` (about 0.01 s, my reading of the asset format; not confirmed in an editor). Movers and the local-player move run in `FixedUpdate`; the packet drain and the validation controller run in `Update` (variable step, not a fixed accumulator written by this project).

## 2. Key functions

- `PositionValidationController.Update`, `Jump`, `StartWalk`, `AddValidateLocation`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/Validate/PositionValidationController.cs` 47-120, 123-160, 195-220, 221-227. Callers: the only caller of `AddValidateLocation` found is `ValidateLocationIncoming.cs` line 8 (grep over the Scripts folder, not exhaustive over the project).
- `PlayerPositionSender` (30 lines): `.../Controller/PlayerMove/v2/PlayerPositionSender.cs`.
- `PeriodicTimer.GetTriggerCount`: `.../Controller/PlayerMove/v2/CalcSpeed/PeriodicTimer.cs` 19-29.
- `MoveAllCharacters.FixedUpdate`/`MoveToPoint`: `.../Game/Manager/MonsterManager/Move/MoveAllCharacters.cs` 116-146, 148-208.
- `EventProcessor.Update`, `PacketApplyQueue`, `NetworkDispatcher.Dispatch`: `.../Networking/EventProcessor.cs` 42-58, `PacketApplyQueue.cs` 15-44, `Protocol/NetworkDispatcher.cs` 12-25.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-band reconcile: ignore / walk toward server point / snap | 0.15 and 3.743 world units (theirs, `PositionValidationController` 26, 74; the 3.743 equals 197 L2 units per their comment) |
| Report position on a coarse count, not every step; also once on arrival | Interval 1 s (theirs, `PlayerController` 289) |
| Walk-then-run gait by timer count | 0.1 s ticks, walk while count <= 3 (theirs, `PeriodicTimer` 7, `L2PlayerMoveGait` 6) |
| Server sends intent (destination), client simulates the walk and snaps on arrival | Stop distance 0.1, skip if closer than 0.12 (theirs, `EntityActionMove` 57, 70) |
| Worker thread to main thread hand-off, drained fully each frame | None |

## 4. TypeScript sketch

simplified: shows only the reconcile classification, the counted position reporter, the main-thread queue and the gait choice. It omits the entity lookup and dead-entity drop, the per-type Jump and StartWalk branches (monster, NPC, player), animation restarts, ground snapping, and the fact that `UserEntity` has no walk or snap handler and `PlayerEntity` has no walk handler. The bands are parameters; the donor's values are 0.15 and 3.743.

```ts
// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; if code is ever adapted, keep the Apache notice and state changes.
interface Vec2 { x: number; z: number }
const dist2d = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

type Correction = 'none' | 'walk' | 'snap';

// Server-snapshot reconcile: ignore tiny error, walk toward the server point for
// a medium error, teleport for a large one. Bands come from zone/game data.
function classify(local: Vec2, server: Vec2, ignoreBelow: number, snapAbove: number): Correction {
  const d = dist2d(local, server);
  if (d > ignoreBelow && d < snapAbove) return 'walk';
  if (d > snapAbove) return 'snap';
  return 'none';
}

// Periodic count trigger: the count only moves when an interval has elapsed.
class PeriodicCount {
  private last = 0;
  constructor(private readonly interval: number, start: number) { this.last = start; }
  tick(now: number, count: number): number {
    if (now - this.last >= this.interval) { this.last = now; return count + 1; }
    return count;
  }
}

// Position report: send only when the count changed (plus once on arrival).
class PositionReporter {
  private sentCount = 0;
  private readonly timer: PeriodicCount;
  private count = 0;
  constructor(now: number, intervalSec: number, private readonly send: (p: Vec2) => void) {
    this.timer = new PeriodicCount(intervalSec, now);
  }
  step(now: number, pos: Vec2): void {
    this.count = this.timer.tick(now, this.count);
    if (this.count !== this.sentCount) { this.sentCount = this.count; this.send(pos); }
  }
  arrived(pos: Vec2): void { this.send(pos); }
}

// Socket thread -> main thread hand-off: producers enqueue, the frame drains everything.
class MainQueue {
  private q: Array<() => void> = [];
  enqueue(fn: () => void): void { this.q.push(fn); }
  drain(): void { const batch = this.q; this.q = []; for (const fn of batch) fn(); }
}

// Walk starts slow, switches to run after N timer counts.
const gaitSpeed = (count: number, walk: number, run: number, walkMaxCount: number): number =>
  count <= walkMaxCount ? walk : run;
export { classify, PositionReporter, MainQueue, gaitSpeed }
```

## 5. Lands in

- TARGET `origins/server/world-tick.ts` (server tick: fixed step, input intake, per-tick NPC budget) for the intake and reporting shape, plus a client reconcile in `src/fight/netsync.ts` (new) for the two-band rule. Parity-checklist row 18 / post-K item 3 (server tick); position reports touch row 5 (controls/input intake).
- today: not checked in this pass.
- Reuse tag: adapt (Apache-2.0; idea reused, sketch written fresh)
- Brief rule served: kills are server-verified (reconcile always defers to the server position); one engine (client mirrors, never decides)

## 6. Gaps and risks

- This is a CLIENT-AUTHORITATIVE-WALK model: the local player walks first and the server only validates, with the client position trusted until a `ValidateLocation` says otherwise. Frankendom rules say kills are server-verified and the fight lives in one engine (src/fight); movement trust is not a fight rule, but the duel step must never take its positions from a client report.
- There is no server tick in this donor: no fixed step on the server, no per-tick NPC budget, no input sequence numbers, no rollback. Do not cite it as a tick design; cite it for reconcile and report cadence only.
- The packet drain is unbounded per frame (a burst of packets all run in one `Update`). A per-tick budget needs to be added; the donor does not have one.
- The reconcile is distance-only and has no timestamp, so a late packet can pull a unit backward; the donor accepts that. Frankendom fast duels need a sequence or tick number on the snapshot.
- Many-on-one: nothing in this donor touches hate lists or MAX_ATTACKERS = 3.
- Bands are in world metres tied to the L2 scale; they must become zone data fields, not constants (zones as data).
- Handler coverage is uneven: `StartWalk` handles only monster and NPC; `PlayerEntity` gets only the snap band; `UserEntity` gets neither (log only). Frankendom should apply one rule to every actor.
