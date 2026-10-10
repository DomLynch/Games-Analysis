# gawric-Unity-Client-for-L2J (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Move/MoveAllCharacters.cs` | Licence: Apache-2.0 (repo root LICENSE: "Apache License, Version 2.0, January 2004") | C# (Unity client) | symbol `MoveAllCharacters.FixedUpdate` / `MoveToPoint`, with the pawn chase set up in `EntityActionMove.StartMoveToPawn`

Checked: This is the player's own pursuit of a target the server names (MoveToPawn), not an enemy AI. The client has no monster brain: the only enemy-side flag, `Aggressive` (`Assets/Scripts/Combat/Status/NpcStatus.cs:9` and `Interlude/NpcStatusInterlude.cs:11`), is declared and never read (grep over Assets/Scripts). The hint file `Assets/Editor/L2MonsterPrefabBuilder.cs` is an animator/prefab wiring tool; it has no AI. Files opened: EntityActionMove.cs (60-141, the pawn chase set-up), L2PawnRange.cs (all, 120 lines), MovementTarget.cs (all), MoveAllCharacters.cs (100-215, the per-step loop), MovementData.cs (228-252, arrival; plus grep), EntityActionMachine.cs (298-322 and 640-672, logging/diagnostic), UserWorldApply.cs (40-100, stop-message handling), root LICENSE (header). NOT read: MovementData.Move, GetSpeed and SyncUserGait (speed and gait), GroundSnapHelper, MonsterWorldApply.cs (server-driven monster moves; grep only), TargetManager.cs. Confidence: high on the per-step pursuit loop (read in order); medium on the stop-message rules (read, but the server side that sends them is not in this donor). Depth: thin, because the speed source and the server side are not in this client. Camera: not applicable (ai-aggro cell).

Best transferable idea: a chaser re-reads the live target every fixed step, walks toward it until it is inside the server-sent stop distance, and finishes in place when a step makes no progress.

Decision (proposed): adapt - take the live re-read, the stop distance as data, and the blocked-finish; reject the client-side patches that ignore late stop messages, because one engine means the server state wins and the client must not replay a stop it no longer agrees with.

Acceptance: a server test: a hero is sent a chase on a creature that moves 5 units during the chase. It asserts the hero ends within the server-sent stop distance (plus one step) of the creature's final position, and that the chase ends at the first step where the hero does not move (blocked by a wall), not on a stored point.

## 1. Mechanism

- Driver: Unity `FixedUpdate` in `MoveAllCharacters` (MoveAllCharacters.cs 116). It runs once per physics step over every active `MovementData` in `_moveDict` (120-141). A step is fixed-time, not per frame.
- Start (`EntityActionMove.StartMoveToPawn`, EntityActionMove.cs 79-140):
  1. Stop distance = the server's `dto.Distance`; if it is 0.01 or less, 0.1 is used (98).
  2. If the mover is already within the stop distance (2D), no move is started; the action is marked arrived (103-110).
  3. Otherwise the target is `MovementTarget(pawn, stopDistance)` (136). That target's `GetTarget()` returns the pawn's live `transform.position` (MovementTarget.cs 15-19, 42-47), so the chase tracks the pawn, not a stored point.
  4. A "destination hint" is also written: the point on the stop-distance ring between the mover and the pawn (EntityActionMove.cs 121; formula at L2PawnRange.cs 32-41). This hint is NOT used by the movement loop. It is read by the stop-message check (UserWorldApply.cs 58, `toDest`) and printed by the chase dump (EntityActionMachine.cs 646-657, diagnostic).
- Per step (MoveAllCharacters.cs 116-208), for each active mover:
  1. `target = _movementTarget.GetTarget()` (128): the live pawn position.
  2. `stopDistance = data.GetDistance()` (153); `distance = Distance2D(before, target)` (172).
  3. If `distance >= stopDistance` (175): direction = normalised XZ vector from the mover to the target (point y is zeroed, 177-181); `data.Move(direction, speed)` (185).
  4. No-progress finish (188-192): if speed > 0.001 and the position after the move equals the last stored position, `OnFinish(target)` runs and the entry is removed. This is the "blocked by a wall" case.
  5. Else branch (199-203): inside the stop distance, `OnFinish(target)` runs and the entry is removed.
  6. Last position is stored every step (206).
- Finish (`MovementData.OnFinish`, MovementData.cs 242-246): for an actor target the mover stays where it is; it does not snap to the pawn origin ("that ran UserEntity into the monster center", comment at 244-245), then it snaps to ground.
- Stop messages from the server (`UserWorldApply.OnStopMove`, 40-96): a late stop is ignored while the mover is still chasing and farther than the stop distance plus 0.12 (67: `skipKeepChase`); a stop is also skipped (70-73) when the action is a move, the pawn is not an NPC, the mover is within 0.35 of the stop point, and either it is over 0.5 from its destination or it is inside range. Anything else is applied.

## 2. Key functions

- `MoveAllCharacters.FixedUpdate` and `MoveToPoint`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/Manager/MonsterManager/Move/MoveAllCharacters.cs` 116-146 and 148-208. The pursuit loop.
- `EntityActionMove.StartMoveToPawn`: `.../Controller/EntityAction/EntityActionMove.cs` 79-140. Stop distance, already-in-range check, the live-pawn MovementTarget.
- `MovementTarget(Entity, float)` and `GetTarget`: `.../Controller/PlayerMove/v2/MovementTarget.cs` 15-20 and 42-54. The live transform target.
- `L2PawnRange.StopPointOnDistRing`, `HasReachedPawnDist`: `.../Controller/EntityAction/L2PawnRange.cs` 32-42, 59-68. Ring hint and reached test (used by the stop-message rules; not by the loop).
- `UserWorldApply.OnStopMove`: `.../Game/WorldApply/UserWorldApply.cs` 40-96. The keep-chase rule for late stops.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Re-read the live target every fixed step; walk toward it; stop at a distance | Stop distance from the server packet; default 0.1 when absent or 0.01 or less (theirs, EntityActionMove.cs 98) |
| Inside the stop distance: finish in place | Threshold is the stop distance itself (theirs, MoveAllCharacters.cs 175, 199-203) |
| Blocked step (no movement) finishes the chase | Speed must be above 0.001 for the check (theirs, MoveAllCharacters.cs 188) |
| Reached test with tolerance | Stop distance + 0.12 (theirs, L2PawnRange.cs 67; UserWorldApply.cs 67) |
| Collision with the target is ignored when this close | 0.15 (theirs, L2PawnRange.cs 50) |
| Snap-skip for position corrections | 200 L2 units (theirs, L2PawnRange.cs 10) |
| Stop message near the stop point | 0.35 window, 0.5 destination (theirs, UserWorldApply.cs 72-73) |
| Movement target tolerance (move to a point) | 0.1 (theirs, EntityActionMove.cs 70) |

## 4. TypeScript sketch

simplified: keeps the donor's per-step order (re-read target, stop check, direction, move, blocked check, finish in place) and the default 0.1 stop distance. It omits the speed and gait source (GetSpeed, Move, SyncUserGait, not read), the gravity and vertical velocity, ground snapping, the removal list, the stop-message keep-chase rules, the ring-point hint, and the collision ignore. The sketch treats the 2D distance as XZ (VectorUtils.Distance2D was not read).

```ts
// Licence of donor: Apache-2.0 (root LICENSE). Clean-room sketch of the mechanism (shape only; not a line-by-line port).
// clean-room
interface Pos { x: number; z: number; }
interface Pursuit { targetId: string; stopDistance: number; done: boolean; }

function dist2(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// One fixed step. The target is re-read every step (live), not taken from a stored point.
// move() may be blocked (returns the same position); a step that does not move ends the chase.
function pursueStep(
  p: Pursuit,
  me: Pos,
  getTarget: (id: string) => Pos | null,
  move: (from: Pos, dir: Pos) => Pos,
): Pos {
  if (p.done) return me;
  const t = getTarget(p.targetId);
  if (t === null || dist2(me, t) < p.stopDistance) {
    p.done = true;           // arrived (or target gone): stop where we are
    return me;
  }
  const len = Math.hypot(t.x - me.x, t.z - me.z);
  if (len < 1e-9) {
    p.done = true;
    return me;
  }
  const after = move(me, { x: (t.x - me.x) / len, z: (t.z - me.z) / len });
  if (after.x === me.x && after.z === me.z) {
    p.done = true;           // no progress this step: blocked
  }
  return after;
}

// Default stop distance when the server sends none (donor: 0.1).
function stopDistanceFrom(serverDistance: number | undefined): number {
  return serverDistance !== undefined && serverDistance > 0.01 ? serverDistance : 0.1;
}
export {};
```

Typecheck: `/tmp/gawric-chase-pursuit.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/gawric-chase-pursuit.ts` printed TSC_OK.

## 5. Lands in

- TARGET `src/fight/chase.ts` (new module; the pursuit step for an engaged creature or hero approach). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- today: not checked in this pass (the Frankendom repo was not read).
- Reuse tag: rewrite-from-idea (Apache-2.0; permissive, but written clean-room from the mechanism)
- Brief rule served: one engine (the chase state belongs to the server; the client only presents it); engage is a state change, so the chase is started by the server, not by the client's stop replay

## 6. Gaps and risks

- This is the player's chase, not enemy AI. The donor has no monster target choice, aggro, threat or flee logic. Frankendom's enemy AI rules (row 2) and aggro cannot be read from this donor.
- The chase destination hint goes stale while the pawn moves. The donor's own diagnostic counts this as a mismatch ("SNAP_ON_MOVE" in ChaseDump, EntityActionMachine.cs 662). The movement loop does not use the hint, so the stale value only matters to the stop-message rules. Frankendom must not make a second stored target.
- The keep-chase rules (0.12, 0.35, 0.5) are client patches around server stop messages that can arrive late. Under one engine, the server should send one authoritative chase end; replaying a stop locally would reintroduce the mismatch. Reject these rules, keep the live re-read.
- Speed and gait are the unread part (MovementData.GetSpeed, Move, SyncUserGait). Speed per step is therefore not described; the sketch's move callback stands for it.
- Unity fixed step, not a server tick. The server tick and per-tick NPC budget (row 18 sub-line) are not in this client; the sketch does not model them.
- Blocked detection compares the position after the move with the last stored position. It finishes a chase when a wall stops the mover, which is right for a duel, but a fight that is blocked by another creature will also end the chase. Frankendom needs an explicit rule for that.
- Apache-2.0 allows adaptation with notice; the note is clean-room, so no notice text is copied.
