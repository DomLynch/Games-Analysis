# ioquake-ioq3 (netcode-session-integrity, cell 2)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_active.c` (server clamp and msec gate, `ClientThink_real` 754-1018) with `/mnt/frankendom-donors/ioquake-ioq3/code/game/bg_pmove.c` (`PmoveSingle` 1894-1900, `Pmove` 2025-2057) and `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_predict.c` (client replay and error, `CG_PredictPlayerState` 412-600) | Licence: GPL-2.0-or-later (each source header: "either version 2 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/ioquake-ioq3/COPYING.txt` is GPL version 2, June 1991) | C | symbol `ClientThink_real`

Checked: Read in full: server clamp, msec gate, pmove_msec bounds and fixed-step rounding (g_active.c 754-800), usercmd hand-off (g_active.c 905-906), `Pmove` sub-step loop (bg_pmove.c 2025-2057), `PmoveSingle` msec and commandTime (bg_pmove.c 1894-1900), client replay and error decay (cg_predict.c 412-600), view error offset (cg_view.c 655-685), client clock sync `CL_AdjustTimeDelta` (cl_cgame.c 803-870). Read in part: `SV_UserMove` (sv_client.c 1677-1782, whole reader), `SV_ClientCommand` flood gate (sv_client.c 1601-1660, the gate only), `SV_ClientThink` (sv_client.c 1665-1670), `CL_CreateNewCommands` (cl_input.c, the serverTime line only, 565), spawn (g_client.c 1232). Candidate files opened: 11 (g_active.c, bg_pmove.c, cg_predict.c, cg_view.c, cg_main.c, sv_client.c, cl_cgame.c, cl_input.c, g_client.c, COPYING.txt, ChangeLog); the three candidates before any decision were g_active.c, bg_pmove.c and cg_predict.c. Camera: not a camera cell (camera_scope not applicable). The error offset in cg_view.c is client-only. Confidence: high on the server window, the msec path and the commandTime invariant (checked every assignment of commandTime with grep: g_client.c 1232, bg_pmove.c 1900 and 2035). High on the replay loop. Not read: the body of `CL_CreateNewCommands`, the spectator follow path, `CG_InterpolatePlayerState`, snapshot delta encoding, and the VM syscall layer.

## 1. Mechanism

Server side (authority). The client stamps every usercmd with its own clock (`cmd->serverTime = cl.serverTime`, cl_input.c 565). The server does not trust that value as is.

- `SV_UserMove` (sv_client.c 1687-1782) reads the batch, skips any command at or before the last executed serverTime (1776), and runs the rest through `SV_ClientThink` (1779). `SV_ClientThink` stores `cl->lastUsercmd` (1666) and calls the game module's ClientThink.
- `ClientThink_real` (g_active.c 754) clamps the command time into a window around the server clock: at most `level.time + 200` (771-772), at least `level.time - 1000` (775-776).
- It computes `msec = serverTime - ps.commandTime` (780). If `msec < 1` it returns with no move (783-784) unless the player is following a spectator target. It then caps a local `msec` at 200 (786-787). That capped local is read again at the end of the function: `ClientTimerActions( ent, msec )` (about 1017) adds it to `timeResidual` for the once-a-second regen and decay actions (line 410), so the cap is live: it limits how much timer credit one command can earn. The movement caps are below. Dead players return before that call (about 1005-1013), so timer credit is only earned by live players.
- It clamps `pmove_msec` into 8..33 (790-797). With `pmove_fixed` it rounds serverTime up to a multiple of `pmove_msec` (799-800), which runs after the window clamp.
- It copies the command into `pm.cmd` (906) and calls `Pmove` (939).
- `Pmove` (bg_pmove.c 2025-2057): if the final time is before commandTime, return (2030). If the final time is more than 1000 ms past commandTime, jump commandTime to `finalTime - 1000` (2034-2035), so a stalled client skips time instead of replaying it. Then loop: step = final time minus commandTime, capped at `pmove_msec` when fixed (2045-2049) or at 66 ms otherwise (2053-2054); set `cmd.serverTime = commandTime + step` (2057) and run `PmoveSingle`.
- `PmoveSingle` (bg_pmove.c 1894-1900): `pml.msec = serverTime - commandTime`, clamped to [1, 200] (1894-1898), then `ps.commandTime = serverTime` (1900). So commandTime follows the full claimed time, not the capped msec.

The invariant this gives: commandTime is only ever assigned from the window (g_client.c 1232 sets level.time - 100 at spawn; bg_pmove.c 1900 and 2035 assign values at or below the claimed time). So a player's simulated time cannot run more than 200 ms ahead of the server clock, plus at most `pmove_msec - 1` (at most 32 ms) from fixed-step rounding.

Client side (prediction and reconciliation). `CG_PredictPlayerState` (cg_predict.c 412) replays the last `CMD_BACKUP` (64) commands from the newest snapshot forward.
- If the oldest backed-up command is newer than the snapshot's commandTime and older than `cg.time` (467), the function returns without moving (472): the prediction freezes at the last good position. (The `cg.time` bound is the donor's map-restart special case.)
- Otherwise it starts from the next snapshot's state (or the current one) and runs `Pmove` once per backed-up command newer than the predicted commandTime (504-513, 584).
- Prediction error is measured only when the predicted commandTime did not move this frame (527). If the replayed origin differs from the old prediction by more than 0.1 units (550), the old error is scaled by the remaining decay fraction `f = (cg_errorDecay - t) / cg_errorDecay`, where t is the time since the last error (558-566), and the new difference is added (570). The error is time-stamped at 571.
- `cg_view.c` 664-675 applies the stored error to the view origin: `VectorMA(vieworg, f, predictedError, vieworg)` while `0 < f < 1` (671). The decay runs over `cg_errorDecay`, default 100 ms (cg_main.c 254). The simulation is not corrected; only the displayed position is eased.

Client clock. `CL_AdjustTimeDelta` (cl_cgame.c 823-870) keeps the client's serverTime near the server's. A jump above 500 ms resets it (837); a jump between 100 and 500 ms moves the delta halfway (844-849); smaller drift is nudged by one ms per snapshot, or back by two when a snapshot had to be extrapolated (859, 862). This decides the serverTime the client stamps on its commands, which the server then clamps.

## 2. Key functions

- `ClientThink_real` (server authority): `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_active.c` 754-1018; window clamp 771-776; msec gate 780-787; pmove_msec clamp and fixed rounding 790-800; `pm.cmd = *ucmd` at 906; `Pmove` call at 939.
- `Pmove` (sub-steps and catch-up skip): `/mnt/frankendom-donors/ioquake-ioq3/code/game/bg_pmove.c` 2025-2057.
- `PmoveSingle` (msec clamp and commandTime advance): `/mnt/frankendom-donors/ioquake-ioq3/code/game/bg_pmove.c` 1894-1900.
- `SV_UserMove` (batch reader, dedupe): `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_client.c` 1687-1782; `SV_ClientThink` 1665-1670.
- `CG_PredictPlayerState` (replay and error): `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_predict.c` 412-600.
- View error offset: `/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_view.c` 664-675.
- Client clock: `/mnt/frankendom-donors/ioquake-ioq3/code/client/cl_cgame.c` 823-870.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Claimed time clamped into a window: may lead the server clock by 200 ms | `level.time + 200` (g_active.c 772) |
| Claimed time may trail the server clock by 1000 ms | `level.time - 1000` (g_active.c 776) |
| A gap over 1000 ms is skipped (catch-up cap), not replayed | `finalTime - 1000` (bg_pmove.c 2035) |
| Sub-step cap, non-fixed mode | 66 ms (bg_pmove.c 2054) |
| Sub-step cap, fixed mode | `pmove_msec`, bounded 8..33 (g_active.c 790-797; bg_pmove.c 2049) |
| Per-command msec cap in the engine step | 200 ms (bg_pmove.c 1898); a second 200 at g_active.c 787 caps the timer credit passed to ClientTimerActions (live) |
| Replay window of past commands | `CMD_BACKUP` = 64 (cg_predict.c 465; cgame/cg_public.h 25) |
| Prediction error threshold | 0.1 units (cg_predict.c 550) |
| Error decay time | `cg_errorDecay` = 100 ms (cg_main.c 254; cg_view.c 669) |
| Client clock reset threshold | 500 ms (cl_cgame.c 821, 837) |
| Client clock fast-adjust threshold | 100 ms (cl_cgame.c 844) |
| Client clock slow nudge | +1 ms per snapshot, -2 when extrapolated (cl_cgame.c 859, 862) |
| Spawn commandTime | level.time - 100 (g_client.c 1232) |

## 4. TypeScript sketch

simplified: follows the donor order (window clamp, then the "less than 1 ms: do nothing" gate, then fixed-step rounding, then the catch-up skip, then capped sub-steps). It omits the spectator-follow exception, the pmove_msec cvar bounds, the 200 ms timer-credit cap at g_active.c 786-787 (it feeds `ClientTimerActions`; the sketch has one movement cap, the step cap, and the caller should credit regen timers from the same step lengths), the event and prediction bookkeeping, and the movement step itself, which the caller runs for each returned length. It clamps out-of-window times instead of rejecting them, as the donor does. Times are integer ms.

```ts
// Licence: GPL-2.0-or-later (donor COPYING.txt). Clean-room sketch of the mechanism, not a translation of the donor lines.
const FUTURE_WINDOW_MS = 200;   // donor: game/g_active.c:771-772 (claimed time may lead the server clock by 200 ms)
const PAST_WINDOW_MS = 1000;    // donor: game/g_active.c:775-776 (claimed time may trail by 1000 ms)
const CATCHUP_MAX_MS = 1000;    // donor: game/bg_pmove.c:2034-2035 (a larger gap is skipped, not replayed)
const STEP_MAX_MS = 66;         // donor: game/bg_pmove.c:2053-2054 (non-fixed sub-step cap)

interface SimClock {
  commandTime: number;          // simulated time this player has consumed, in ms
}

// Clamp a client's claimed time into the server window, then advance the simulation in capped sub-steps.
// Returns the sub-step lengths (ms) the caller must run, in order.
// simplified: follows the donor order (window clamp, then the "less than 1 ms: do nothing" gate, then fixed-step rounding,
// then catch-up, then sub-steps). It omits the spectator-follow exception, the pmove_msec cvar bounds (8..33), the
// 200 ms msec cap at g_active.c:786-787 (it caps the timer credit passed to ClientTimerActions; see section 6), the event and
// prediction bookkeeping, and the movement step itself. It clamps out-of-window times instead of rejecting them, as the donor does.
function admit(serverNow: number, sim: SimClock, claimedMs: number, fixedStepMs: number | null): number[] {
  let t = Math.min(serverNow + FUTURE_WINDOW_MS, Math.max(serverNow - PAST_WINDOW_MS, claimedMs));
  if (t - sim.commandTime < 1) return [];                  // nothing new to run; commandTime unchanged
  if (fixedStepMs !== null) {
    t = Math.ceil(t / fixedStepMs) * fixedStepMs;          // donor: rounds up to a multiple of pmove_msec (g_active.c:800)
  }
  if (t > sim.commandTime + CATCHUP_MAX_MS) {
    sim.commandTime = t - CATCHUP_MAX_MS;                  // donor: skip the excess instead of replaying it (bg_pmove.c:2034-2035)
  }
  const cap = fixedStepMs !== null ? fixedStepMs : STEP_MAX_MS;
  const steps: number[] = [];
  while (sim.commandTime < t) {
    const dt = Math.min(cap, t - sim.commandTime);
    steps.push(dt);
    sim.commandTime += dt;                                 // donor: commandTime follows the claim (bg_pmove.c:1900, 2057)
  }
  return steps;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/nw001-ioquake-sim-clock.ts) exit 0, no output.

## 5. Lands in

- TARGET `src/fight/sim-clock.ts` (new engine module: per-player simulated time and the step list; the server calls it once per tick for each player, so the Pit and zones share one stepper).
- Parity-checklist row 18 (server tick), sub-line "server tick: fixed step, input intake, per-tick NPC budget". The window and the step list are the fixed-step part.
- Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only; no line of the donor is translated).
- Brief rule served: server-verified (the server clamps the time it is given and never trusts a client clock); one engine (one stepper for the Pit and for zones).

## 6. Gaps and risks

- Copyleft: shape only. The sketch is written from the described mechanism; the constants are cited, not copied as code.
- Timer-credit cap: `msec` is capped at 200 at g_active.c 786-787 and then passed to `ClientTimerActions` (about 1017), which adds it to `timeResidual` (410). The movement caps are PmoveSingle's 200 (bg_pmove.c 1898) and the 66 ms sub-step (2054). Frankendom keeps one movement cap, in the stepper (the sketch does this), and credits once-a-second timers from the capped step lengths so a long command cannot earn a burst of regen.
- Future bound is in one place only. The batch reader's own future check (sv_client.c 1771-1773, `svs.time + 3000`) is commented out. Only the game module clamps. Frankendom must keep the check in one place and test it.
- Rounding can overshoot the window. With `pmove_fixed`, the round-up (g_active.c 800) runs after the window clamp (771-772), so the simulated lead can reach 200 + (pmove_msec - 1) ms, at most 232 ms with the 33 ms maximum. The sketch rounds after the clamp too; Frankendom should either clamp after rounding or round inside the window.
- A cheater keeps a 200 ms movement lead. The window bounds how far simulated time can run ahead of the server, not how fast a player moves within that lead. For fast duels a 200 ms lead is a real budget. Ruling 3.
- Stall skips, it does not replay. A client more than 1 s behind loses the excess time (bg_pmove.c 2034-2035). For a duel that means a dropped swing or step; Frankendom must say what a skipped step does to an attack in flight.
- Prediction freezes when history is gone. If the oldest backed-up command is past the snapshot, the client freezes at its last good position (cg_predict.c 467-472) until the next snapshot. A many-on-one fight at 375 wide shows that freeze as a stutter; Frankendom needs a rule for it.
- Flood comments are stale. sv_client.c 1630 says a flooder stalls its whole packet, including the usercmd. The gate (1636-1640) only sets `clientOk = qfalse` for the text command, and the comment at 1638 says "let them keep playing". `SV_ClientCommand` returns qtrue after the gate (1651), so the usercmd still runs. The call site comment at 1988 says the packet stops "because of the flood protection", but that return only happens when `SV_ClientCommand` returns qfalse, which it does for lost reliable commands (1623). Do not port any of these comments; keep the code's behaviour (drop the text, run the usercmd) and fix the comments.
- Client clock nudges are not bounded on the client. The client moves its clock by +1 ms per snapshot (cl_cgame.c 862). Only the server's window bounds the claim, so a client that drifts forward hits the 200 ms edge and is then clamped, not corrected.
- Frankendom's time unit is the server tick, not ms. The sketch uses ms because the donor does. A tick-based port needs a fixed step equal to the server tick.

As-data shape:
- Donor data: no table. The values are code constants (g_active.c 771-776, 2034-2054 in bg_pmove.c) and four cvars: `pmove_msec` (bounded 8..33 at g_active.c 790-797), `pmove_fixed` (g_main.c 177), `cg_errorDecay` (cg_main.c 254, default 100), and the client's `cl_showTimeDelta` (diagnostic only).
- Row fields: none in a table. The cvar rows are name (string), default (number), bounds (min, max).
- A new X is one row: no. The window, catch-up and step caps are engine rules in code; in Frankendom they become named fields of an engine constants table (see JSON), not zone rows. Only the error decay and the replay length are tunable.

Provenance per claim:
- Donor repo: ioquake-ioq3, on the VPS at /mnt/frankendom-donors/ioquake-ioq3. Every claim has a receipt in receipts.tsv (65 rows for this donor; the file holds 132 rows, all verified by the gate verifier).
- Licence: GPL-2.0-or-later. COPYING.txt is GPL version 2; source headers read "either version 2 of the License, or (at your option) any later version" (sv_client.c 9-10; g_active.c 9-10). Shape only.

What they patched later:
- The donor's history is the ChangeLog (no git log was read). Relevant lines:
  - 2002 entry (ChangeLog 254-258): a rollback "leaving 1v1 force vote exploit, the fix was worse than the bug". The exploit was left open on purpose.
  - ChangeLog 313-317: failing a vote with one voter "fixes exploit on 2-player server where one player votes then disconnects".
  - ChangeLog 270-274: a vote and quit exploit was left unfixed because "too many changes" were needed.
  - ChangeLog 1392-1396: a server-side "Guard exploit" fix that forced an earlier release.
  - ChangeLog 56-58: sv_minRate, packetdelay and "Various security fixes" (no detail given).
  - ChangeLog 404-408: rcon buffer resized to avoid overflow.
- These are game-logic and command exploits. None of the ChangeLog entries describes the time-window clamp itself; the clamp is in the code without a dated fix note.

Rulings for Dom:
1. Out-of-window command time: clamp it into the window (donor) or reject the command? Recommendation: clamp, and count the clamps per client, so a player on a bad link is not punished for jitter.
2. Simulation step: one fixed step equal to the server tick for every simulation (zones, Pit, NPCs)? Recommendation: yes. It is what makes a fight replayable and what the determinism topic needs.
3. Future window: keep 200 ms as one engine constant for every mode, or a shorter window for duels? Recommendation: one engine constant for now (per-zone windows would be an exploit surface) and measure the lead a duel gives a cheater before any change.

Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: server-verified (the server clamps the time it is given); one engine (one stepper for the Pit and zones)

Best transferable idea: Clamp each client's claimed time into a window around the server clock (200 ms ahead, 1 s behind), and advance the simulation only in capped steps, so simulated time can never lead the server by more than the window.
Decision (proposed): adapt — keep the window and the one-stepper shape, but use Frankendom's server tick as the only step, keep one movement cap in the stepper and credit regen timers from the capped step lengths (the donor's separate 200 ms cap on timer credit is folded into that), and clamp after any rounding so the lead cannot exceed the window.
Acceptance: a server test gives one client a clock 5 s ahead; after 10 ticks its simulated time is at most server now + 200 ms (or the window after rounding), and a client 3 s behind resumes with the excess dropped (no more than 1000 ms replayed), with every step equal to one server tick.

Pattern tags for the sidecar: fixed-step, stale-state, new:time-window-clamp, new:catchup-skip, accumulator.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: the capped local msec at g_active.c 786-787 was called dead code ("never read again; no other use in 754-1000"). ClientThink_real runs to about line 1018 and line 1017 calls `ClientTimerActions( ent, msec )`, which adds it to `timeResidual` (confirmed). The cap is live and limits timer credit. ClientThink_real range corrected from 754-1018 to 754-1018.
- Missed: the +1/-2 clock nudge in CL_AdjustTimeDelta runs only when com_timescale is 0 or 1 (cl_cgame.c) (checker finding, not re-verified here).
- Missed: SV_UserMove also drops commands whose serverTime exceeds the last command's (map_restart guard, sv_client.c about 1766) (checker finding, not re-verified here).
- Missed: dead players return before ClientTimerActions, so timer credit is for live players only (confirmed; added).
Fixed 2026-10-12: Mechanism (dead-cap claim), function range, numbers table row, sketch comments (work/ioquake-sim-clock.ts matches), Gaps entry and Decision.
