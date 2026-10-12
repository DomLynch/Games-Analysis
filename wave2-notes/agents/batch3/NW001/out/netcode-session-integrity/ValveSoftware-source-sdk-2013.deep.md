# ValveSoftware-source-sdk-2013 (netcode-session-integrity, cell 3)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/player_lagcompensation.cpp` (`CLagCompensationManager`: history 245-303, `StartLagCompensation` 345-436, `BacktrackPlayer` 440-570; restore 599-629 partly read; `FinishLagCompensation` 768-777 partly read) with companion `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/player.cpp` (usercmd tick budget, PhysicsSimulate 3384-3420) | Licence: Source 1 SDK LICENSE (`/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/LICENSE`, 22 lines, read in full: free use and modification to develop a modified Valve game on Source 1; redistribution must be free of charge and carry the LICENSE and thirdpartylegalnotices.txt; no reuse-as-code grant; warranty and liability disclaimers) | C++ | symbol `CLagCompensationManager::StartLagCompensation`

Checked: Read in full: history update per frame (player_lagcompensation.cpp 245-303), `StartLagCompensation` (345-436), `BacktrackPlayer` (440-570, the walk, the teleport guard, the interpolation, and the start of the place-the-player step). Read in part: restore of the moved player (599-629, the angle and size branches), `FinishLagCompensation` (767-777, the no-restore early exit and the loop head). Not read: the rest of the restore loop and the restore of animation records (630-766 and 778-875), `WantsLagCompensationOnEntity` (defined elsewhere), `sv_unlag_fixstuck` recursion beyond the first call (567). Companion read: player.cpp 3384-3420 (usercmd budget) and player_command.cpp 322-333 (the drop warning). Candidate files opened: 4 (player_lagcompensation.cpp, player.cpp, player_command.cpp, LICENSE). Camera: not a camera cell. Confidence: high on the server-side rewind and its numbers (read every line of the start path and the walk). Medium on the restore path (read only the head). Not measured: the cost of the rewind per shot.

## 1. Mechanism

The server keeps a short history of every player's position, once per frame, and rewinds the other players to the time the shooter was seeing when the shot is evaluated.

History (once per frame, after all entities think; 245-303):
- Compute the dead time `now - sv_maxunlag` (258, default 1.0 s). Drop tail records older than that (286). Donor defect: the variable is declared `int flDeadtime` (258), so the cutoff is truncated to whole seconds and records actually live between 1.0 and about 2.0 s. It is benign for hit results (the target time is clamped to sv_maxunlag, 399) but history memory and walk length are larger than the cvar says. A port must use a float (the sketch does).
- For each connected player, add a new record only if the player's simulation time has moved past the head record (300). A record holds the simulation time (313), alive flag (308), origin, angles, collision box, animation layers and pose parameters (not walked through here).
- The teleport threshold is stored squared per frame from `sv_lagcompensation_teleport_dist` (default 64 units, 253; 28).
- The whole history is off with one player or when `sv_unlag` is off (247).

Target time (per shot, `StartLagCompensation`, 345-436):
1. Opt-outs: the shooter must want compensation, the server must have more than one client, `sv_unlag` must be on, and the shooter must not be a bot or an observer (364-368).
2. Correction (the time the server thinks the shot is delayed by): the engine's outgoing latency (`nci->GetLatency(FLOW_OUTGOING)`, 384, 389), plus the interpolation delay `lerpTicks = TIME_TO_TICKS(m_fLerpTime)` converted to time (393, 396). Clamp to `[0, sv_maxunlag]` (399).
3. Claimed target tick: `cmd->tick_count - lerpTicks` (402). Discrepancy: `correct - TICKS_TO_TIME(tickcount - targettick)` (405). If the absolute discrepancy exceeds 0.2 s (407), replace the claim with the server estimate `tickcount - TIME_TO_TICKS(correct)` (411).
4. For each other player (the shooter is skipped at 425; `WantsLagCompensationOnEntity` filters at 432), call `BacktrackPlayer(pPlayer, TICKS_TO_TIME(targettick))` (436). Every other player is rewound, not only the struck one.

Backtrack (`BacktrackPlayer`, 440-570):
- Start with the newest record and the player's current origin as the previous origin (462-466). Walk older records.
- If a record is not alive, stop without moving the player (473-476).
- If the origin changed from the previous origin by more than the teleport distance in 2D, stop without moving (480-483). This is the guard against rewinding across a teleport.
- The first record whose simulation time is at or before the target time ends the walk (487-488).
- If that record has a newer neighbour and is strictly older than the target, interpolate: `frac = (target - record.t) / (prev.t - record.t)` (520) and lerp the origin, angles and boxes (526 and others). Otherwise copy the record (534).
- Then the player is placed at that position for the shot; the restore data is saved (599-621) and restored at `FinishLagCompensation` (767+).
- With `sv_unlag_fixstuck` on (default 0, line 38; check at 541), the donor traces the placement and, if the spot is solid, backtracks the blocking player first (545-567).

Companion (usercmd budget, player.cpp 3384-3420): the server limits how many client ticks of commands it will simulate per frame. `sv_maxusrcmdprocessticks` defaults to 24 (103; read at 3392). If the remaining movement ticks exceed that limit (3395), the server replays a copy of the last command instead, and caps the remaining budget at the limit (3414). Commands that cannot fit are dropped with a warning (player_command.cpp 330).

## 2. Key functions

- `CLagCompensationManager::FrameUpdatePostEntityThink`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/player_lagcompensation.cpp` 245-303.
- `CLagCompensationManager::StartLagCompensation`: same file, 345-436 (correction 384-411; per-player loop 425-436).
- `CLagCompensationManager::BacktrackPlayer`: same file, 440-570 (walk 462-488; interpolation 520-534; placement 541-567).
- `CLagCompensationManager::FinishLagCompensation`: same file, 767-777 (partly read).
- Usercmd budget: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/player.cpp` 3384-3420; drop warning `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/player_command.cpp` 322-333.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Rewind window: how far back a shot may look | `sv_maxunlag` = 1.0 s, clamped 0..1 (player_lagcompensation.cpp 34, 399) |
| Correction = outgoing latency + interpolation delay | Lerp delay in ticks from `m_fLerpTime` (393, 396); no extra constant |
| Plausibility window for the client's claimed time | 0.2 s (407) |
| Teleport guard for a rewind | `sv_lagcompensation_teleport_dist` = 64 units, compared squared in 2D (28, 253, 480) |
| Epsilon for an angle or origin change worth restoring | 0.1 units, squared (29; used at 610) |
| History retention | Intended: same as the rewind window, 1.0 s (258); actual: between 1.0 and 2.0 s because `flDeadtime` is an int |
| Usercmd budget per frame (companion) | `sv_maxusrcmdprocessticks` = 24 ticks (103, 3392) |
| Stuck-fix default | off (38) |

## 4. TypeScript sketch

simplified: the sketch keeps the order (history update, then target time, then the per-target walk and interpolation). It keeps position and the alive flag only. It omits the restore of angles and bounding boxes, the animation and pose records, the `WantsLagCompensationOnEntity` filter, the fixstuck recursion, and the apply-and-restore step itself (the caller moves the target for the shot and puts it back, as the donor does in 599-767). Ticks are converted to seconds; the donor works in ticks and converts.

```ts
// Licence: Valve Source 1 SDK LICENSE (restricted). Clean-room sketch of the mechanism, not a translation of the donor lines.
const MAX_UNLAG_S = 1.0;       // donor: player_lagcompensation.cpp:34 (sv_maxunlag "1.0", clamped 0..1)
const TELEPORT_DIST = 64;      // donor: player_lagcompensation.cpp:28 (sv_lagcompensation_teleport_dist "64")
const MISMATCH_S = 0.2;        // donor: player_lagcompensation.cpp:407 (fabs(deltaTime) > 0.2f)

interface Rec { t: number; x: number; y: number; alive: boolean }  // t = simulation time in seconds; index 0 is the newest
type Track = Rec[];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Once per frame, after all players have thought (donor: :245-303): drop records older than now - MAX_UNLAG_S,
// then add a new record only if the simulation time has moved on.
function frameUpdate(track: Track, now: number, simT: number, cur: Rec): void {
  const deadtime = now - MAX_UNLAG_S;
  while (track.length > 0 && track[track.length - 1].t < deadtime) track.pop();
  if (track.length > 0 && track[0].t >= simT) return;
  track.unshift(cur);
}

// The server's target time for a shot (donor: :345-411). Latency plus interpolation delay, clamped to the window.
// The client's own claim is used unless it disagrees with the server estimate by more than 0.2 s.
function targetTime(now: number, claimedT: number, outLatencyS: number, lerpS: number): number {
  const correct = clamp(outLatencyS + lerpS, 0, MAX_UNLAG_S);
  const claimed = claimedT - lerpS;
  const delta = correct - (now - claimed);
  return Math.abs(delta) > MISMATCH_S ? now - correct : claimed;
}

// Position of one target at time T (donor: :440-540). Walk from the newest record; stop at a dead record or a
// teleport (no backtrack, returns null); stop at the first record at or before T; then interpolate between the
// two records that bracket T, or copy the record found when no bracket exists.
// simplified: the donor also restores angles and bounding boxes, applies the sv_unlag_fixstuck recursion,
// and stores animation and pose records. This sketch keeps position and alive only, and it does not apply the
// position (the caller would move the target and restore it after the shot, as donor :599-770 does).
function sampleAt(track: Track, cur: { x: number; y: number }, T: number): { x: number; y: number } | null {
  let rec: Rec | undefined;
  let prev: Rec | undefined;
  let prevPos = cur;
  for (let i = 0; i < track.length; i++) {
    prev = rec;
    rec = track[i];
    if (!rec.alive) return null;
    const dx = rec.x - prevPos.x;
    const dy = rec.y - prevPos.y;
    if (dx * dx + dy * dy > TELEPORT_DIST * TELEPORT_DIST) return null;
    if (rec.t <= T) break;
    prevPos = { x: rec.x, y: rec.y };
  }
  if (rec === undefined) return null;
  if (prev !== undefined && rec.t < T && rec.t < prev.t) {
    const f = (T - rec.t) / (prev.t - rec.t);
    return { x: rec.x + (prev.x - rec.x) * f, y: rec.y + (prev.y - rec.y) * f };
  }
  return { x: rec.x, y: rec.y };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/nw001-valve-lag-compensation.ts) exit 0, no output.

## 5. Lands in

- TARGET `src/fight/lag-rewind.ts` (new engine module: per-target position history, target time for a strike, and the rewind used only by the strike's hit test). Strikes only: engage is a state change and is not rewound (Frankendom ruling).
- Parity-checklist row 1 (duel step / sim): the rewound position feeds the duel step's hit test.
- Reuse tag: rewrite-from-idea (restricted licence; clean-room, shape only; no code is adapted)
- Brief rule served: server-verified kills (the server decides the hit against its own history, not the client's); one ledger (one place decides the target time).

## 6. Gaps and risks

- Restricted licence: clean-room, shape only. Nothing here is copied; the constants are cited.
- It rewinds every other player, not only the struck one (player_lagcompensation.cpp 425-436). Cost per shot grows with players times records (cost not measured here). Frankendom's fights cap attackers at MAX_ATTACKERS = 3, so the rewind should be limited to the struck target. Ruling 3.
- The rewind window is one second (34). In a fast duel a one-second rewind lets a shot land on a target who has already moved on, and the target sees it as a hit they could have dodged. Ruling 1 proposes a shorter cap; the 1.0 s figure is the donor's and is not a recommendation.
- The client's claim is trusted within 0.2 s (407). A cheater can claim up to 0.2 s of extra lag without triggering the override. The override is the donor's plausibility check, not a proof.
- Teleport guard uses 64 units in 2D (28, 480). Frankendom's world units differ; the threshold has to be a data field in the engine's units, and the guard only tests a jump in position between two records, not a teleport in the same frame.
- Dead record stops the rewind (473-476), so a target who died in the window is not rewound at all and is tested at its current position. That is the right direction for a kill, but it means a shot can miss a dead-then-revived target. Frankendom's respawn rule must say which position is tested.
- Records are kept per frame, not per tick. Frankendom's tick rate must match the frame used here or the interpolation fraction uses the wrong spacing.
- The companion usercmd budget (player.cpp 3384-3420) is a second rate limit. It replays the last command when the client is over budget (3395-3414), which lets a lagging client keep moving without its own input. Frankendom's server tick intake (row 5) needs the same budget as a counter, or a flood of inputs fills the slot ring. The donor's own assert at 3411 ("security failure, airstuck!") is commented out, so a null command that does not simulate was a known hole.
- Donor defect, int truncation of the history cutoff (258): see section 1. Fix: float cutoff, as in the sketch.
- Idle client: when a client sends no usercmd for longer than `sv_player_usercommand_timeout`, the server runs a null command so think and game state continue (player.cpp 3385-3390). Frankendom's input intake needs the same rule: a silent client is simulated as idle, not frozen.
- Restore path partly read (599-629, 767-777). The rest of the restore and the animation records were not read; the note does not claim them.

As-data shape:
- Donor data: no table. Four cvars carry the numbers: `sv_unlag` (1, dev-only, line 33), `sv_maxunlag` (1.0, clamped 0..1, line 34), `sv_lagcompensation_teleport_dist` (64, line 28, dev-only and cheat-flagged), `sv_unlag_fixstuck` (0, line 38). The budget is one more cvar, `sv_maxusrcmdprocessticks` (24, player.cpp 103).
- Row fields: name (string), default (number), bounds (min, max), flags (development-only, cheat). Example row: `sv_maxunlag` default "1.0", bounds 0..1.
- A new X is one row: no. The history record fields and the walk are fixed code. Only the cvar-like numbers would be rows in Frankendom, as JSON data fields.

Provenance per claim:
- Donor repo: ValveSoftware-source-sdk-2013 on the VPS at /mnt/frankendom-donors/ValveSoftware-source-sdk-2013. Every claim in this note has a receipt in receipts.tsv (49 rows for this donor, all verified).
- Licence: Source 1 SDK LICENSE (read in full). Restricted: clean-room, shape only.

What they patched later:
- No history available: no changelog or git log is on the box, and this note read no commit messages.
- In-code markers read: the comment at player_lagcompensation.cpp 350 ("IF YOU'RE HITTING THIS THEN IT MEANS THERES A CODE BUG"); the stuck-fix cvar `sv_unlag_fixstuck` (38) is a development-only switch and defaults off, so the placement fix is not on by default; the teleport guard was tied to a dev-only cvar (28); the usercmd budget comment at player.cpp 3411 ("security failure, airstuck!") is an assert that is commented out.

Rulings for Dom:
1. Rewind cap for strikes: the donor allows 1.0 s. Recommendation: propose 250 ms for duels and test it on a 150 ms phone link before any change. (250 ms is a proposal here, not a donor value.)
2. Client claim override: keep the donor's rule that a claim more than 200 ms from the server estimate is replaced by the estimate? Recommendation: yes; it is the cheapest cheat guard in this file.
3. Rewind only the struck target (not every player, as the donor does)? Recommendation: yes; it bounds the cost to one target per strike.

Reuse tag: rewrite-from-idea (restricted licence; clean-room, shape only)
Brief rule served: server-verified kills (the server rewinds its own history to decide the hit); one ledger (one place decides the target time)

Best transferable idea: Rewind the struck target, not everyone, to a server-estimated time (latency plus interpolation delay, clamped to a short window), accept the client's claimed time only when it agrees within 0.2 s, and refuse to rewind across dead or teleported records.
Decision (proposed): adapt — keep the strike-only rewind, the server-estimated target time, the 0.2 s override, and the dead and teleport refusals, but rewind only the struck target, use a shorter cap (ruling 1), and count the overrides per client.
Acceptance: a server test moves a target 4 units per tick and lands a strike claimed 150 ms in the past on the interpolated position for 150 ms ago; a claim 500 ms in the past is capped to the window (250 ms once ruling 1 is decided); a target that jumps more than the teleport distance between two records is hit at its current position, not a rewound one.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- History retention mis-stated: the cutoff is `int flDeadtime` (player_lagcompensation.cpp:258), so records live 1.0 to about 2.0 s, not 1.0 s (confirmed in the donor). Real donor defect, benign because the target time is clamped.
- Missed: RunNullCommand path for clients silent past sv_player_usercommand_timeout (player.cpp 3385-3390) (confirmed). Restore only if m_bNeedToRestore: fine.

Fixed 2026-10-12: retention text (section 1, section 3 row), added the int-truncation defect and the null-command rule to the gaps. Sketch already uses a float cutoff, so unchanged.
