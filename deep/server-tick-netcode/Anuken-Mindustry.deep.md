# Anuken-Mindustry (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` | Licence: GPL-3 | Java | symbol `NetServer::clientSnapshot`

Checked: `@Remote` annotation at 754, `clientSnapshot` declared at 755, closing brace at 903 (all read).

## 1. Mechanism

- The client sends its own state (position, velocity, rotation, pointer, shooting, boosting, chat, build plans, view rectangle) as an unreliable snapshot, many times a second. The server accepts it, applies the parts it trusts, and writes the client's claimed position into the unit's sync buffer.
- Intake (`clientSnapshot`, 755-903): a snapshot with a missing connection or an id older than `lastReceivedClientSnapshot` is dropped (770). Eight floats (x, y, velocity, pointer, rotation, base rotation) are checked for NaN or infinity via `invalid` (712) and reset to zero (773-780). Position verification is on only when the admin policy is strict AND the process is headless (782). The first snapshot seeds `lastReceivedClientTime` to now minus 16 ms (784). Flags are gated: shooting is disabled for a mech that is flying; boosting is disabled for flying or non-boosting unit types.
- Build plans (only if the player is a builder, 810-839) are checked one by one: tile exists, plan is well formed, not already done, not in `con.rejectedRequests`, and allowed by `admins.allowAction`. A plan that fails the policy is removed on the client with `Call.removeQueueBlock` and added to the rejected list (832-833). The rejected list is cleared after each snapshot (841), so a rejection only suppresses repeats within the same snapshot.
- Dead player: only `player.x/y` is set to the claimed values (897-898); no movement, aim or weapon update. Alive: weapons and aim are set from the claim (844-846). The position is ignored if the client says it is dead or the unit id does not match (854). Velocity is clamped to the unit's max speed (858).
- Movement: elapsed time since the last snapshot is capped at 1.5 s; the allowed step is elapsed x 60 x unit speed x 1.1. The unit moves toward the claimed position by at most that step (`move` for ground units, `trns` for flying, 860-868). If strict verification is off, the unit is put back to its old position and the claimed position is used for the sync. If strict verification is on and the claimed position is more than 14 tiles from where the server put the unit, the server sends a position correction to the client (877-878). The final position is written into a small float buffer and read back with `readSyncManual` for interpolation (883-895). `lastReceivedClientSnapshot` and `lastReceivedClientTime` are updated last (901-902).
- Tick: the snapshot is handled when it arrives (event-driven), not on a server tick. The unit's state is then read by the server's normal update.

## 2. Key functions

- `NetServer.clientSnapshot`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` 754-903 (the handler, `@Remote` at 754). Sequence guard, NaN guard, flags, build-plan validation, movement clamp, sync buffer, correction.
- `clientPlanSnapshot`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` 741-746 (the build-plan variant, read in full). Forwards preview plans to `player.handlePreviewPlans`.
- `correctDist` constant: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/NetServer.java` 53 (`tilesize * 14`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sequence guard: drop a message older than the last accepted one | None (the rule) |
| Movement clamp: max step = elapsed time (capped) x speed x margin | Elapsed cap 1500 ms (theirs, 848); margin 1.1 (theirs, 851); 60 units per second scale (theirs, 851) |
| Correction when the claim is too far from the server's value | Distance 14 tiles (theirs, `correctDist`) |
| NaN and infinity reset to zero | Zero (mechanism; `invalid` at 712) |
| Reject and remember a rejected build request | Rejected request list (theirs) |

## 4. TypeScript sketch

simplified: omits the dead-player branch, the `ignorePosition` case (client says dead or unit id mismatch), the velocity clamp, the flag gating, the build-plan loop, and the first-snapshot time seeding. The sequence id is stored before the checks here; the donor stores it at the very end (901). Non-strict servers keep the claimed position.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Snap { id: number; x: number; y: number; }
interface Conn { lastId: number; lastTimeMs: number; }
interface Unit { x: number; y: number; speed: number; }

// Accept or reject one client position claim; returns the position the server keeps.
function acceptSnapshot(c: Conn, u: Unit, s: Snap, nowMs: number,
                        strict: boolean, correctDist: number): { x: number; y: number; correct: boolean } {
  if (s.id < c.lastId) return { x: u.x, y: u.y, correct: false };      // stale
  c.lastId = s.id;
  const x = Number.isFinite(s.x) ? s.x : 0;
  const y = Number.isFinite(s.y) ? s.y : 0;
  const elapsed = Math.min(nowMs - c.lastTimeMs, 1500);
  c.lastTimeMs = nowMs;
  const maxStep = (elapsed / 1000) * 60 * u.speed * 1.1;               // bounded travel
  const dx = x - u.x, dy = y - u.y;
  const len = Math.hypot(dx, dy);
  const k = len > maxStep && len > 0 ? maxStep / len : 1;
  const nx = u.x + dx * k, ny = u.y + dy * k;
  if (!strict) return { x, y, correct: false };                        // trusts the claim
  const far = Math.hypot(x - nx, y - ny) > correctDist;
  return { x: nx, y: ny, correct: far };                               // server keeps its value
}
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module, fight engine): the sequence guard, the NaN guard and the bounded step for any client intent that carries a position or a time. Parity-checklist row 5 (controls / input intake), plus row 18 for the server-side acceptance rule.
- today: client input is built in `src/input.ts`; the only server-side intake is `src/net/verify-duel.ts`, which replays both pages' uploaded records and trusts no claimed position. There is no sequence or bounded-step guard module; the verifier makes the position question moot for the Pit client, but zone movement would need one. (read in worktree `frankendom-combat-p3`, commit 6adcab27e)
- Reuse tag: rewrite-from-idea (the trust model is the opposite of Frankendom's)
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Trust model conflict. By default the server trusts the client's claimed position and only clamps the step size; the position check is on only in strict mode on a headless server. Frankendom's ruling is that kills are server-verified and the client never decides a hit. The sequence, NaN and bounded-step guards transfer; the trust-the-claim default must not.
- The snapshot carries shooting, boosting and build intent from the client. In Frankendom, an attack or an engage is a state change the server decides; a client flag that fires a shot is the wrong shape.
- The 1.5 s elapsed cap and the 1.1 margin are tuned for a movement game. Frankendom has no free movement in the duel; do not copy the numbers.
- The build-plan validation against an action policy is useful for one-ledger rules (the server owns what can be built or taken), but Frankendom's inventory checks belong to the server inventory, not this function.
- The rest of `NetServer.java` outside 741-903 and 712-714 was not read.
- The plan-rejection list only lasts one snapshot, so it is not a persistent anti-spam rule; Frankendom's one ledger must hold rejections server-side if it wants them to stick.
