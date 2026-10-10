# ioquake-ioq3 (server-tick-netcode, cell 2)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` | Licence: GPL-2.0-or-later (sv_main.c header: "either version 2 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/ioquake-ioq3/COPYING.txt` is GPL version 2, June 1991) | C | symbol `SV_Frame`

Checked: Read in full: `SV_FrameMsec` (sv_main.c 1030-1041) and `SV_Frame` (1055-1164, including the step loop at 1143-1146). Read `Com_ModifyMsec` (common.c 3013-3053) and the `Com_Frame` loop head and sleep loop (common.c 3081-3193, the `SV_FrameMsec` sleep target at 3121 and the `SV_Frame( msec )` call at 3192). Read `SV_CheckPaused` (sv_main.c 992-1020). Not read: bodies of `SV_CalcPings` (894) and `SV_CheckTimeouts` (called at 1157), `SV_SendClientMessages` (1160), `SV_BotFrame`, the game VM's `GAME_RUN_FRAME`. Callers: `SV_Frame` has two call sites, `common.c:3192` (main frame path, read) and `client/cl_main.c:1737` (`SV_Frame( 0 )` in the connect path that kills a local server; read as the call site only). `SV_FrameMsec` has one caller, `common.c:3121` (grep). Confidence high on the order of operations and the numbers of the server frame. Not a camera cell (no camera_scope).

## 1. Mechanism

- The server frame length is `1000 / sv_fps` ms, where `sv_fps` is a runtime cvar with default 20 (sv_init.c:667), so one simulated frame is 50 ms (sv_main.c:1087, integer division, times `com_timescale`).
- Each pass of the main frame, `Com_Frame` computes the real elapsed `msec`, then `Com_ModifyMsec` multiplies it by timescale and clamps it (common.c 3183, then the clamp at 3039-3052). The clamp is 5000 ms on a dedicated server (3039), 5000 ms for a remote-only client (3044), and 200 ms for a local listen server (3049). The donor comment above the dedicated clamp says the long limit is kept so that client views of server time are not skewed.
- `SV_Frame(msec)` (sv_main.c 1055): first the early returns (kill, no map, pause, time wrap, map restart). Pause is `SV_CheckPaused`, which returns true only when `cl_paused` is set and no more than one connected non-bot client exists (sv_main.c 1004-1012; `count > 1` means no pause). When paused, `SV_Frame` returns at 1078-1079 before the time is banked. Otherwise `sv.timeResidual += msec` (1095).
- Then `SV_CalcPings()` runs once (1138), before any steps, and then the step loop (1143-1146): while the residual covers a whole frame, subtract one frame from the residual, advance `svs.time` and `sv.time` by one frame, and call `GAME_RUN_FRAME` once. After the loop: `SV_CheckTimeouts()` (1157), then `SV_SendClientMessages()` (1160), then the master heartbeat.
- Timeouts are in simulated server time: the cutoff is `svs.time - 1000 * sv_timeout` (sv_main.c 960), and `svs.time` only moves inside the step loop (1145), so a paused or stalled server does not time out clients on the wall clock (inferred from 960 and 1145; the other increments in sv_init.c 503 and 560 are init code, not read in full).
- Scheduling: when the server is dedicated, `Com_Frame` sleeps until `SV_FrameMsec()` says the next frame is due (common.c 3121). `SV_FrameMsec` returns `frameMsec - sv.timeResidual`, or 0 if the residual is already past a frame (sv_main.c 1030-1041).
- Catch-up is bounded only by the clamp: at 20 steps per second a dedicated server can run at most about 100 steps in one pass (5000 ms / 50 ms, plus a residual of under one frame).

## 2. Key functions

- `SV_Frame`: `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` 1055-1162. Pause check, residual banking, ping, step loop, timeouts, send.
- `SV_FrameMsec`: `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` 1030-1041. Time until the next step.
- `SV_CheckPaused`: `/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_main.c` 995-1020. Pause only for a single human.
- `Com_ModifyMsec`: `/mnt/frankendom-donors/ioquake-ioq3/code/qcommon/common.c` 3013-3053. Timescale and per-mode hitch clamps.
- `Com_Frame` (sleep and call order): `/mnt/frankendom-donors/ioquake-ioq3/code/qcommon/common.c` 3081-3193.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Residual accumulator: bank elapsed time, run whole steps while the residual covers one | Frame length 1000 / rate ms; rate 20 (sv_init.c 667) |
| Hitch clamp on one pass | 5000 ms dedicated (common.c 3039); 200 ms local listen (3049) |
| Pause does not bank time | Pause only when one human is connected (sv_main.c 1012) |
| Sleep until the next step is due | `frameMsec - residual` (sv_main.c 1036-1041) |
| Timeouts measured in simulated time | `svs.time - 1000 * sv_timeout` (960), timeout value not read |

## 4. TypeScript sketch

simplified: the sketch keeps the residual, the whole-step loop, the hitch clamp and the pause no-bank rule, and the sleep target. It omits the donor's float-to-int truncation of the frame length (it uses a float 1000 / rate), the timescale multiply and the 1 ms floor (these are in `Com_ModifyMsec`, outside `SV_Frame`), the early returns for kill, time wrap and map restart, the ping and send steps, the timeouts, and the bot frame. The pause flag is passed in; the donor computes it from `cl_paused` and the human count. The clamp is applied inside the pass here, while in the donor it is applied before `SV_Frame`.

```ts
// Licence: GPL-2.0-or-later (donor, per sv_main.c header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ServerWorld {
  step(): void;                  // one simulated frame
}

export interface FrameConfig {
  rate: number;                  // steps per second (donor cvar sv_fps, default 20)
  maxElapsedMs: number;          // hitch clamp applied to one pass (donor: 5000 on a dedicated server)
}

export class ResidualFrameLoop {
  private residualMs = 0;        // elapsed time not yet turned into steps
  private readonly frameMs: number;

  constructor(private readonly cfg: FrameConfig, private readonly world: ServerWorld) {
    this.frameMs = 1000 / cfg.rate;
  }

  // Milliseconds until the next step is due. The donor uses this as the sleep target.
  msUntilNextStep(): number {
    return Math.max(0, this.frameMs - this.residualMs);
  }

  // Returns the number of steps run. pauseActive is computed by the caller.
  pass(elapsedMs: number, pauseActive: boolean): number {
    if (pauseActive) return 0;   // paused time is not banked
    const clamped = Math.min(elapsedMs, this.cfg.maxElapsedMs);
    this.residualMs += clamped;
    let steps = 0;
    while (this.residualMs >= this.frameMs) {
      this.residualMs -= this.frameMs;
      this.world.step();
      steps++;
    }
    return steps;
  }
}
```

Typecheck: the same block with `export {}` appended, run with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS: exit 0.

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module, same module as cell 1): the server frame loop that owns the residual, the hitch clamp, and the pause rule. Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the server runs the step count for the one engine); server-verified kills follow from the step being server-side.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor's catch-up limit is 5000 ms on a dedicated server, which is about 100 steps at 20 Hz in one pass. For a fast duel that is far too large a burst of hit and AI steps. The clamp should be a data field with a small default, decided by Lead. Do not copy 5000.
- The donor clamp loses time: a clamped pass runs fewer steps than real time, so the server falls behind the wall clock. That is the trade-off the donor comment describes. Frankendom needs to choose it explicitly.
- Pause in the donor is only "one human connected". Frankendom has no pause ruling. If a pause exists in the Pit or zones, decide whether it is a server state or a client state before using the no-bank rule.
- Simulated-time timeouts are attractive (a stalled server does not drop clients), but they hold only if `svs.time` is the only clock the server uses for timeouts. Not ported without a ruling.
- Not read: `SV_CalcPings` body, `SV_CheckTimeouts` body, `SV_SendClientMessages`, the input intake for client commands (not read), the `GAME_RUN_FRAME` game VM. So the per-tick input intake and the NPC budget are not covered by this note.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine on the server); post-K item 3 (server tick, catch-up budget) for the clamp gap.

Best transferable idea: Bank elapsed time in a residual, run whole fixed steps while it covers one, clamp a single pass to a configured hitch limit, and do not bank time while paused.

Decision (proposed): adapt. Take the residual loop with a hitch clamp for the server tick (row 18), but set the clamp as a small data field decided by Lead instead of the donor's 5000 ms, and adopt the no-bank rule for any server pause; leave simulated-time timeouts as a separate ruling.
Acceptance: Server test: a 3 s hitch passed into one `pass` runs no more than the configured step cap, and a `pass` with the pause flag set runs zero steps and leaves the residual unchanged.
