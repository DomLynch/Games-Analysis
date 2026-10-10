# azerothcore-azerothcore-wotlk (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/MovementHandler.cpp` | Licence: GPL-2.0 (LICENSE file: "Version 2, June 1991"; MovementHandler.cpp header lines 5-6: "either version 2 of the License, or") | C++ | symbol `WorldSession::VerifyMovementInfo`

Checked: read `VerifyMovementInfo` (MovementHandler.cpp 531-612), `ProcessMovementInfo` (614-676), `HandleMovementOpcodes` (362-414), `SynchronizeMovement` (416-428), `HandleMoverRelocation` (430-530), `HandleMoveTimeSkippedOpcode` (894-925); the hook declarations (PlayerScript.h 795-806), the hook dispatch (PlayerScript.cpp 912-926), the hook macros (ScriptMgrMacros.h 76-88), the snap-back condition (MovementHandler.cpp 620-622), and the SIZE_OF_GRIDS define (MapDefines.h 26, by grep). Warden.cpp read only at 31, 98-131 and 199-246 (the rest not read). Candidates opened: MovementHandler.cpp, PlayerScript.h, PlayerScript.cpp, ScriptMgrMacros.h, Warden.cpp, and the modules/ folder listing (no anticheat module present: only CMakeLists.txt, create_module.sh, how_to_make_a_module.md and the loader files). Grep over the whole donor for the hook names found only the default, the dispatch and the call sites in MovementHandler.cpp. Not read: `Position::IsPositionValid` (declared Position.h 159, body not read), `ReadMovementInfo`, `HandleTimeSyncResp` (926-958), `ComputeNewClockDelta` (960), `RequestChecks` and the Warden check payloads (not described on purpose). Confidence: high on the gate order and on the empty default (read in code and confirmed by grep); medium on the snap-back and time sync (the calls were read; the helpers were not). camera_scope: n/a.

Best transferable idea: Validate every client input against the server's own state in a fixed order, drop inputs while the fighter is in a locked state (keeping the server state), and kick only when a registered rule fails.
Decision (proposed): adapt - the ordered gate, the reject-vs-kick split and the locked-state snap are worth taking for input intake; the donor's trust in client-written positions and its empty rule default are not.
Acceptance: A server test: while a fighter is in a locked state (Frankendom's own name for it, for example hitstop or stagger), a client input is dropped, the fighter's server state is unchanged and a rejection counter increments; an input that fails a registered rule closes the session; an empty rule list fails the build's own test (no silent pass-all).

## 1. Mechanism

- Entry. `HandleMovementOpcodes` (362) drops a packet while the mover is being teleported (read, no receipt), drops it if the guid is not the mover's (384), then reads the movement block and calls `ProcessMovementInfo` (401). If that returns false the packet is dropped.
- Gate, in `VerifyMovementInfo` (531), in this order, first failure wins:
  1. Position not valid: reject, no kick (533-541). On this failure the passive hook `AnticheatUpdateMovementInfo` is called; it is a no-op by default.
  2. Spline not finished: reject (543-548), except a boarding spline on the root or unroot acks.
  3. Disable-move flag set and the packet claims movement: reject, no kick (550-557).
  4. Jump packets: `AnticheatHandleDoubleJump` (567); a failure kicks the session (568-569).
  5. Every packet: `AnticheatCheckMovementInfo` (575); a failure kicks the session (576-578).
  6. Packets with the transport flag: a position more than SIZE_OF_GRIDS (533.3333) from the mover is dropped as stale, with a comment saying it skips packets from before a teleport (583-594); map coordinates outside the valid range are rejected (`Acore::IsValidMapCoord` check, line 594).
  7. Rooted mover: reject unless the packet carries the root flag and no moving flags (608; the unroot ack is exempt, line 607).
- After the gate, `ProcessMovementInfo` (614) does three things relevant here. (a) If the mover has DISABLE_MOVE, or is an immobilised creature, the packet's position is replaced by the server's position (620-626). (b) Fall and water handling and the `OnPlayerMove` hook run. (c) `HandleMoverRelocation` (430) runs: `SynchronizeMovement` (416-424) sets the packet time from the client time plus the clock delta, and falls back to server time when the delta is 0 or the result is out of range; then `mover->UpdatePosition(movementInfo.pos)` (434) writes the position. The void check and transport boarding are in the same function.
- The default. `PlayerScript.h` 799-800 declares both gate hooks with `{ return true; }`. The macro (ScriptMgrMacros.h 77-79) returns true when no script is registered for the hook, and false when any registered script returns invalid. The caller negates that, so a failed hook kicks. In this tree no script overrides either hook.
- Time skip. `HandleMoveTimeSkippedOpcode` (894) reads a client-sent `timeSkipped` and adds it to the stored movement time (918) and then broadcasts it. No bound on the value was read in this handler (read, no receipt for the absence).

## 2. Key functions

- `WorldSession::VerifyMovementInfo`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/MovementHandler.cpp` 531-612. The whole gate, section 1 steps 1-7.
- `WorldSession::ProcessMovementInfo`: same file, 614-676. Runs the gate, then the snap-back (620-626), then the side effects and `HandleMoverRelocation`.
- `WorldSession::SynchronizeMovement`: same file, 416-424. Re-bases the client time; server-time fallback at 419-422.
- `WorldSession::HandleMoverRelocation`: same file, 430-530. Writes the position (434), then transport and void handling.
- `ScriptMgr::AnticheatCheckMovementInfo`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Scripting/ScriptDefines/PlayerScript.cpp` 921-924, dispatch through `CALL_ENABLED_BOOLEAN_HOOKS` (ScriptMgrMacros.h 76-80).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Reject first, kick only on a rule failure | Kick sites: MovementHandler.cpp 569 and 577; all other gate failures return false with no kick (533-610) |
| Locked state: keep the server's state, drop the client's move | Snap-back condition at 620 (DISABLE_MOVE or immobilised creature); the rule is "keep server position", not a timer |
| Stale-packet cut for a transport-flagged move | 533.3333 yards: `SIZE_OF_GRIDS` (MapDefines.h 26); the number is the grid size, reused as a cut |
| Empty rule list passes everything | Hook defaults `{ return true; }` (PlayerScript.h 799-800); macro returns true with no script (ScriptMgrMacros.h 77-78) |
| Client time is trusted when it fits a range | Clock-delta rebase (418) and server-time fallback when the delta is 0 or the result is out of range (419-422); the range limits are 0 and 0xFFFFFFFF (419) |

No per-tick speed limit, distance-per-second limit or input-rate limit was found in the core handlers. Values for the Warden response delay and ban duration come from config (`CONFIG_WARDEN_CLIENT_RESPONSE_DELAY` read at Warden.cpp 107, `CONFIG_WARDEN_CLIENT_BAN_DURATION` at 237); the config values were not read.

## 4. TypeScript sketch

simplified: the sketch follows the donor's gate order (valid position, spline finished, disable-move, rules with kick, transport distance, root) and its reject-vs-kick split, and keeps the server position for a disable-move mover. It folds the separate double-jump hook into the rule list. It omits the boarding-spline exception and the unroot-ack exception on the root gate, the immobilised-creature branch of the snap, the time sync, the fall and water handling, the void check, the transport and vehicle relocation, the passive update hooks, and the time-skip handler. The sketch uses a plain `isValid` callback in place of the donor's `IsPositionValid` (body not read). It is clean-room, written from the described order, not a line-by-line translation.

```ts
// Licence: donor is GPL-2.0 (LICENSE file). clean-room sketch of the gate order, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number; }
interface Move { pos: Pos; moving: boolean; rootFlag: boolean; onTransport: boolean; jump: boolean; }
interface Mob { pos: Pos; rooted: boolean; disableMove: boolean; splineDone: boolean; }

// A rule returns true when the move passes. No rules registered means every move passes.
type Rule = (mob: Mob, m: Move) => boolean;

type Verify = { ok: true } | { ok: false; kick: boolean };

const MAP_LIMIT = 533.3333; // donor SIZE_OF_GRIDS: a transport-flagged packet farther than this from the mover is dropped as stale (donor comment: packets from before a teleport)

function dist2d(a: Pos, b: Pos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Gate order follows the donor: position validity, spline finished, disable-move, jump rule, move rules (kick),
// transport distance, root. Any failure rejects the packet; only a failed rule kicks.
function verifyMove(mob: Mob, m: Move, rules: Rule[], isValid: (p: Pos) => boolean): Verify {
  if (!isValid(m.pos)) return { ok: false, kick: false };
  if (!mob.splineDone) return { ok: false, kick: false };
  if (mob.disableMove && m.moving) return { ok: false, kick: false };
  if (rules.some(r => !r(mob, m))) return { ok: false, kick: true };
  if (m.onTransport && dist2d(m.pos, mob.pos) > MAP_LIMIT) return { ok: false, kick: false };
  if (mob.rooted && (!m.rootFlag || m.moving)) return { ok: false, kick: false };
  return { ok: true };
}

// Accepted packets write the position. An immobile or disable-move mover keeps the server position.
function processMove(
  mob: Mob, m: Move, rules: Rule[], isValid: (p: Pos) => boolean
): { applied: Pos; accepted: boolean; kicked: boolean } {
  const v = verifyMove(mob, m, rules, isValid);
  if (!v.ok) return { applied: mob.pos, accepted: false, kicked: v.kick };
  const applied = mob.disableMove ? mob.pos : m.pos;
  return { applied, accepted: true, kicked: false };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (proposed new module): validates each client input against the fighter's server state before it reaches the duel step. Parity-checklist row 5 (controls/input intake). The server tick sub-line (row 18 / post-K item 3: fixed step, input intake, per-tick NPC budget) is the clock this runs on; not separately named here.
- today: (not read) - I did not open the Frankendom tree for this note.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: ruling "server-verified kills" (the server decides what an input does; the client only sends intents) and ruling "one engine" (the gate sits in the one fight step, not in a client)

## 6. Gaps and risks

- The donor ships the gate with no rules. Every hook returns true by default (PlayerScript.h 799-800) and nothing in this tree overrides them, so the gate does nothing as shipped. Frankendom must write concrete rules per input type, and a test must fail when a rule list is empty.
- The core trusts the position the client wrote once it passes the checks (MovementHandler.cpp 434). Frankendom's client sends intents and the server computes positions, so the position check does not transfer. The locked-state drop (620-626) does.
- Client time is trusted when it fits a range (418-422). Frankendom's fixed-step server tick is the authority; do not copy client-time rebasing into the fight.
- The time-skip handler adds a client-sent value to stored time and broadcasts it, with no bound in that handler (918). Do not copy it. Any time skip in Frankendom must be bounded and recorded.
- Rejections are mostly silent: most gate failures return false with no kick and no log (533-610). Frankendom should count each rejection per fighter and write the count to the fight record (row 19), so repeated bad inputs are visible; a silent drop hides them.
- Warden (read in outline only; Warden.cpp 98-131 and 199-246, not written as a note). It is a client-integrity module. A browser client cannot run it, so the check payloads do not transfer and are not described here. The transferable shape is a response watchdog (110-115) and a per-check action ladder of log, kick or ban for a configured duration (227-240). Decision: reject for now; revisit only if Frankendom ever needs a client-state penalty ladder.
- Licence GPL-2.0. The sketch copies no donor lines; it is written from the described order.
