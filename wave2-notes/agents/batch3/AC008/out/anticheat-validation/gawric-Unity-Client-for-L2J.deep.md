# gawric-Unity-Client-for-L2J (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/Validate/PositionValidationController.cs` | Licence: Apache License 2.0 (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/LICENSE`, line 2 "Version 2.0, January 2004"; adaptation permitted, sketch is clean-room anyway) | C# (Unity) | symbol `PositionValidationController.Update`

Checked: Read in full: `PositionValidationController.cs` (272 lines), `GroundSnapHelper.cs` (127 lines), `ValidateLocationDto.cs`, `ValidateLocationIncoming.cs`. Read only the helpers: `VectorUtils.To2D` and `Distance2D` (VectorUtils.cs 218-224). Callers of `AddValidateLocation`: only `ValidateLocationIncoming.Apply` (read). `AddInitPosition` has no caller in this donor (grep -rn). Not read: `EntityActionMachine.Set`, `Hide/ShowObject`, `GetEntityNoLockSync`, `MoveAllCharacters.IsMoving`, `PlayerController.Instance` vs `PlayerEntity.Instance` (whether they are the same object). Confidence: high on the order of operations and the numbers. Medium on the topic fit: this is the client half of a server position correction. No server-side validator was found in the donor (grep for anticheat, speed, teleport and cheat in .cs files hit only unrelated files; the repo root holds two Unity project folders, Docs, a patch file and CI config), so this is not a server validator and it must not be read as one. Runs in `MonoBehaviour.Update` (line 47), so it is per rendered frame (variable step), not a server tick.

Best transferable idea: When the server corrects a position, classify the error by size (ignore a tiny one, glide to the server point for a small one, snap for a large one) and keep the server as the only validator.

Decision (proposed): adapt - Frankendom's rulings say kills and hits are server-verified, so the client band must never decide a hit or a kill. It fits the world client's remote creatures and NPCs as a display rule only: small drift glides, a large miss snaps, and the server stays the only source of truth.

Acceptance: A remote creature 0.15 to 3.74 m from its server point slides to it over frames, and one farther away appears at the server point with no slide; a server test asserts that stored positions and kill results never read the client actor's transform.

## 1. Mechanism

- Input: a server packet `ValidateLocation` (opcode 0x61, incoming folder) carrying an object id, a position (converted to Unity space) and a heading. The client does not check the sender and does not check its own movement speed. The packet is the authority.
- Queueing: `AddValidateLocation` (221-227) appends the packet unless an equal one (same id, position and heading, via the `Equals` override in ValidateLocationDto.cs) is already queued.
- Order of steps in `Update` (47-120), run every rendered frame:
  (a) `ValidInitNpsPosition()` runs first (see section 6; dead path in this donor). (b) return if the queue is empty (54). (c) For each queued packet: take the world (`GameWorld`); if it is null, `continue` and keep the packet for the next frame (62-64). (d) Look up the entity by object id; if it is missing or dead, drop the packet (101-105). (e) Otherwise take the 2D distance from the entity's current position to the server position (`Distance2D` ignores height, 71). (f) If `0.15 < d < 3.743`: `StartWalk` (74-84). If `d > 3.743`: `Jump` (85-97). If `d <= 0.15`, or `d` equals 3.743 exactly, nothing happens. (g) Packet goes to the remove list (99). (h) After the loop, the processed packets are removed (111-113).
- `StartWalk` (195-220): for a monster or NPC, if its action is already `Move` it returns and the new target is dropped (200-201, 208-209); otherwise it sets a `Move` action to the server point. A `UserEntity` only logs (213-217). A `PlayerEntity` has no branch in `StartWalk`, so nothing happens.
- `Jump` (123-160): for a monster or NPC, hide the object, snap its position to the ground at the server point, show it, then re-start its move visual if it is still moving (`ReplayMoveIfNeeded`, 125-132, 145-152). For a `PlayerEntity` it hides the entity, snaps `Player` (the `PlayerController.Instance`, not the addressed entity), shows the entity, restores float animation values and restarts the player's state machine if `RunningToDestination` (134-143, 177-185). A `UserEntity` only logs (154-159).
- Ground snap (`GroundSnapHelper.SnapToGroundOrKeep`, GroundSnapHelper.cs 64-73): first a ray down from `position.y + 50`, max 350 (startAbove 50 + maxDistance 300), accepting hits whose height difference from the given y is between -15 and +1.25, nearest by absolute difference (1st pass 54, hit window 109). If none, a ray from y 750 down 1000 (56). If none, the same from y 750 with a 0.4 sphere (58). If none, the input position is returned unchanged (70-72). On a hit, the output keeps the x and z of the input but takes the hit's y (124). The server's height is therefore discarded whenever terrain is found.

## 2. Key functions

- `Update`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/Validate/PositionValidationController.cs` 47-120. The per-frame loop: init queue, then the band decision per packet, then removal.
- Band decision inside `Update`: same file, 74-97 (`0.15f` floor, `_trigger` 3.743, walk on the middle band, jump above it).
- `StartWalk`: same file, 195-220 (monster/NPC move if not already moving; UserEntity log only; PlayerEntity no-op).
- `Jump`: same file, 123-160 (hide, ground-snap, show, per-type replay).
- `GroundSnapHelper.TrySnapToGround`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Controller/Validate/GroundSnapHelper.cs` 44-62 (three passes: high-start ray, high-start ray with 750 origin, sphere pass).
- `GroundSnapHelper.TryPickNearServerY`: same file, 83-126 (height window -15 to +1.25, nearest hit wins, x/z kept).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ignore a correction under a small floor (no move) | Floor 0.15 (theirs, Update line 74) |
| Glide to the server point for a middle-size error | Walk band upper edge `_trigger` 3.743, comment "197 unit | 3.743f metr" (theirs, line 25-26) |
| Snap for a large error, with a visual hide around the move | Above 3.743 (theirs, line 85) |
| Ground the snapped point: search down from above, nearest hit in a height window | Start 50 above (theirs, GroundSnapHelper.cs 10), max distance 300 (13), lift +1.25 (25), drop 15 (26) |
| Fallback to a high origin, then a wider sphere cast | Origin 750 (theirs, line 21), max 1000 (23), sphere radius 0.4 (58) |
| Keep the input point if nothing is found | None (the return, 70-72) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order for each packet: look up, drop if gone or dead, keep if the world is not ready, classify by the two bands, act, drop. It omits the per-type branches (monster/NPC walk and snap, the PlayerEntity no-op on walk, the UserEntity log-only paths), the "already moving" guard inside `StartWalk`, the hide/show around a snap, the ground snap itself, the replayed move visual, the init-position queue, and the try/catch around the whole loop. It also does not reproduce the donor's removal-list bookkeeping (the donor clears its remove list after the loop), since the sketch returns a new queue instead.

```ts
// Licence: Apache-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Vec2 = { x: number; z: number }; // ground plane only (donor: Distance2D drops height)
type Pending = { objectId: number; target: Vec2 };
type Live = { pos: Vec2; dead: boolean };
type Band = "none" | "walk" | "snap";

// Donor numbers: 0.15f walk floor, _trigger = 3.743f walk-vs-snap (donor comment pairs it with 197 units)
const WALK_FLOOR = 0.15;
const SNAP_AT = 3.743;

function classify(current: Vec2, target: Vec2): Band {
  const d = Math.hypot(target.x - current.x, target.z - current.z);
  if (d > WALK_FLOOR && d < SNAP_AT) return "walk";
  if (d > SNAP_AT) return "snap";
  return "none"; // inside the floor, or exactly on the trigger: the donor does nothing
}

interface Actions {
  walk(objectId: number, to: Vec2): void; // donor: StartWalk (move the actor over)
  snap(objectId: number, to: Vec2): void; // donor: Jump (hide, ground-snap, show)
}

// One pass per frame. lookup returns undefined while the world is not ready (keep the entry),
// null or dead (drop it), otherwise classify, act, and drop it.
function drainCorrections(
  queue: Pending[],
  lookup: (objectId: number) => Live | null | undefined,
  act: Actions,
): Pending[] {
  const kept: Pending[] = [];
  for (const p of queue) {
    const e = lookup(p.objectId);
    if (e === undefined) { kept.push(p); continue; }
    if (e === null || e.dead) continue;
    const band = classify(e.pos, p.target);
    if (band === "walk") act.walk(p.objectId, p.target);
    else if (band === "snap") act.snap(p.objectId, p.target);
  }
  return kept;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/actor-sync.ts` (new, client view only): applies server-authoritative positions to remote creatures and NPCs as a glide or a snap. It never writes health, hits or kills, and never reads its own transform for a server decision.
- Parity-checklist row: 7 (creature actor/clips). No row fits the anticheat topic: rows 18 and 19 are loot/XP and fight record, and row 23 is spawn logic. Row 7 is the nearest because the donor moves creature and NPC actors to server positions. This is a poor fit and is not a validation row.
- Reuse tag: rewrite-from-idea (Apache-2.0; adaptation permitted, sketch written clean-room)
- Brief rule served: Frankendom ruling that kills are server-verified (the client correction is display only); one engine (the band is not a second engine)

## 6. Gaps and risks

- This is not a validator. The client trusts the server and never checks its own movement, speed or teleports. Frankendom's server must do any such check; this donor gives no pattern for it, and a server test should assert that a client position never changes a hit.
- Height is discarded. `TryPickNearServerY` keeps the server's x and z and takes the terrain's y whenever a hit lands (GroundSnapHelper.cs 124). A Frankendom zone with bridges or stairs would be drawn at the terrain height, not the authoritative height. Do not copy the snap as the rule for where a fighter stands.
- Distance ignores height (`To2D` sets y to 0, VectorUtils.cs 219). A pure vertical error never reaches the glide band; only the snap moves height. Express the bands in metres with explicit height handling.
- A new move is dropped while a move is active (StartWalk 200-201, 208-209). A glide in Frankendom must retarget on each packet, not ignore it.
- Init-queue dead path: `AddInitPosition` has no caller in this donor (grep), and `ValidInitNpsPosition` clears its queue at line 264 even when the world was null (the `continue` at 246-247 only skips items). Do not port it.
- Exception path (inference from the code, not run): `Update` wraps the whole loop in one try. If an entry throws, the removal step and the clear at 111-113 never run for that frame, so processed entries stay queued and are re-run next frame, and a throwing entry stalls the batch. Frankendom's version needs a per-entry try and a removal step that always runs.
- Per-frame, variable step. Band decisions depend on the rendered frame rate, so a server test cannot see them. Keep the band decision in a function that takes time as an argument.
- Unit mismatch: 0.15 and 3.743 are Unity units. The donor comment ties 3.743 to 197 L2 units, but the conversion is not checked here (`ConvertPosToUnity` not read). Frankendom should express the values as metres in the zone data (or as one engine constant) with defaults.
- `PlayerEntity` snap moves `PlayerController.Instance` rather than the entity it was addressed to; whether these are the same object is not read. Do not port the singleton lookup.
- Apache-2.0: adaptation is allowed, but the sketch is written clean-room. If code is later copied, keep the Apache notice.
