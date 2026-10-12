# OpenRA-OpenRA (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Game.cs` (with `OpenRA.Game/Network/TickTime.cs`, `OpenRA.Game/Network/OrderManager.cs`, `OpenRA.Game/Widgets/Widget.cs`, `OpenRA.Game/Network/Session.cs`) | Licence: GPL-3.0 (COPYING: GNU GPL v3; each file header says "either version 3 of the License, or (at your option) any later version", so GPL-3.0-or-later) | C# | symbol `Game.Loop`

Checked: `Loop` (Game.cs 771-897) read in full; `InnerLogicTick` (625-674), `LogicTick` (676-689) and the start of `RenderTick` (701-722) read; `TickTime.cs` read in full (1-51); `SuggestedTimestep` (204-222) and `TryTick` (300-328) read; `Session.cs` 221-222 and `Widget.cs` 24-30 read. Callers: `Loop` has one caller, `Run` (Game.cs 909); `LogicTick` and `RenderTick` are each called only from `Loop` (856, 877). Not read: the GameSpeed yaml that sets the world step (the default is not checked), `WorldRenderer` and `Move` (whether positions are interpolated between logic ticks), the platform sleep granularity, and the thread that calls `ReceiveTickScale`. Confidence high on the loop order (read line by line); not run, typecheck only. Camera: not a camera cell (no camera_scope).

## 1. Mechanism

- One loop, two due-times. Each pass reads the clock once (`now`). `nextLogic` is when the next world step is due and `nextRender` when the next frame is due (Game.cs 811-847). If `now` is more than 250 ms past `nextLogic`, `nextLogic` is reset to `now` (843-844): the backlog is dropped, not replayed. The pass waits until `min(nextLogic, nextRender)` (847) and sleeps the difference when nothing is due (894-895).
- Order inside a due pass: (a) the logic step runs if it is due and no frame is pending (852-856). Its clock advances by one interval (854), not to `now`, so a late step is caught up over the next passes. (b) In gameplay a logic step arms `renderBeforeNextTick` (859-860). (c) A frame runs if the pending flag is set, or the floor timer has passed (850, 865), or a frame is due and the logic clock still has time left (864-865). (d) After a frame: next render = now + render interval (867); floor timer = now + max(100 ms, render interval) (874-875); pending flag cleared (878).
- Render interval: the logic step when `CapFramerateToGameFps` is set (826); otherwise 1000 / the user's max frame rate (827-830).
- Net effect in gameplay: every logic step is followed by one frame (not while the window is suspended, 882-892), and the next logic step waits for that frame (852 checks the pending flag). Between steps, frames run at the render interval when logic has time left. Under load the loop runs one logic step per pass, so a late frame does not stack several steps before a draw.
- World step gate: `InnerLogicTick` checks its own clock, `orderManager.LastTickTime` (638), and advances that clock (645) before it asks `orderManager.TryTick()` (658); `world.Tick()` runs only if `TryTick` returns true, so the clock moves on even when the network holds the step. `TryTick` (300-328) only advances `LocalFrameNumber` when the network has the frame's orders (324-325). So the world step is paced by the network frame, and the loop only asks for it. Net frames fall on every 3rd local frame (`NetFrameInterval = 3`, Session.cs 222; the donor comment at 221 says 120 ms for a 40 ms local tick).
- Clock catch-up (`TickTime`, TickTime.cs 28-49): due when the delta is at least the step (36). When advancing, the donor takes the delta as a whole number of steps (`tickDelta / step * step`, 45). If that is at least 250 ms (`TimestepJankThreshold`, Game.cs 37) the clock jumps by it (46); otherwise it adds one step (48). So a short lag is caught up one step per pass, and a long lag jumps.
- Load path: `GC.Collect()` runs before and after `LoadComplete` (227-234). After `StartGame` the donor sets the large object heap compaction to `CompactOnce` and collects again (253-254), with a comment that a loading screen is visible and that this avoids GC pauses during play (246-252, 251).
- Tick is driven by its own loop, not by a render callback. The loop runs for the life of the game (`while (state == RunStatus.Running)`, 816).

## 2. Key functions

- `Loop`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Game.cs` 771-897. The whole frame pacing loop: due times, backlog drop, logic, forced render, sleep.
- `InnerLogicTick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Game.cs` 625-674. UI clock (631), world clock (638), network gate (658), world render tick (669).
- `TickTime.ShouldAdvance` and `AdvanceTickTime`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/TickTime.cs` 28-49. The step clock with the 250 ms jump rule.
- `SuggestedTimestep`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 204-222. The step comes from the game speed, from a server-set tick scale (217-218), or from replay data.
- `TryTick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 300-328. Advances the frame only when the network has the orders.
- Load-time collection: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Game.cs` 224-260 (enclosing function name not read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| The world advances on a fixed step, set by the speed setting | UI step 40 ms (theirs, Widget.cs 26, class `Ui`). The world step from the game speed is not read. |
| Backlog above a threshold is dropped and the clock restarts at now | 250 ms in the loop (Game.cs 803, 843-844) and the same 250 ms in `TickTime` (Game.cs 37, TickTime.cs 46). |
| Within the threshold the clock catches up one step per pass | `TickTime` adds one step below 250 ms (TickTime.cs 48). |
| Forced redraw floor | 10 fps (`MinReplayFps`, Game.cs 808): floor = 1000 / 10 = 100 ms (874). The comment at 805 says this is for replays; the code applies it in every mode (see Gaps). |
| Render cap | user setting `MaxFramerate` (Game.cs 829), default not read. |
| Net frame every 3 steps | `NetFrameInterval = 3` (Session.cs 222): 120 ms at 40 ms. |
| Memory: collect after load, compact the large object heap once | Two `GC.Collect()` calls around `LoadComplete` (227-234) and `CompactOnce` (253-254). No numbers. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's pass order (backlog check, logic step, render decision, floor timer) and uses one clock; it reads the step once per pass. It omits: the replay branch and the 1 ms step while a save is loading (Game.cs 833-838), the UI clock (631-636), the separate world clock in `TickTime` (its jump-or-step rule is not copied), the net-frame gate (`TryTick`), delayed actions, the connection-state check, the GC calls, and the pump of input while the window is hidden. The clock is injected, so the sketch can be run with a fake clock. Render interval is a number here, not a settings read.

```ts
// Licence: GPL-3.0-or-later (donor, COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface LoopHooks {
  now(): number;                     // monotonic milliseconds
  logic(): void;                     // one fixed logic tick (orders in, world step)
  render(): void;                    // one drawn frame
  sleep(ms: number): void;           // yield the thread for ms
  suspended(): boolean;              // window minimised: skip drawing, keep ticking
}

interface LoopConfig {
  logicIntervalMs(): number;         // read every pass; may change (network-chosen step)
  renderIntervalMs: number;          // 1000 / max fps, or the logic step when capping to game fps
  maxLogicBehindMs: number;          // beyond this lag, drop the backlog and restart the clock
  minRenderFps: number;              // forced redraw floor, in frames per second
  renderAfterEachLogic: boolean;     // gameplay: every logic tick is followed by one draw
}

interface LoopState {
  nextLogic: number;
  nextRender: number;
  forcedNextRender: number;
  renderPending: boolean;            // a logic tick has run and has not been drawn yet
}

// One pass of the loop. Logic and render are scheduled by timestamps, never by counting frames.
function pass(s: LoopState, h: LoopHooks, c: LoopConfig): void {
  const now = h.now();

  // If logic is far behind (stall, long GC, tab switch), forget the backlog instead of replaying it.
  if (now - s.nextLogic > c.maxLogicBehindMs) s.nextLogic = now;

  const nextUpdate = Math.min(s.nextLogic, s.nextRender);
  if (now < nextUpdate) {
    h.sleep(nextUpdate - now);       // spare time goes to sleep, not to busy work
    return;
  }

  const forceRender = s.renderPending || now >= s.forcedNextRender;

  // At most one logic tick per pass.
  if (now >= s.nextLogic && !s.renderPending) {
    s.nextLogic += c.logicIntervalMs();
    h.logic();
    if (c.renderAfterEachLogic) s.renderPending = true;
  }

  const timeLeftBeforeLogic = now < s.nextLogic;
  const renderDue = now >= s.nextRender;

  if (!h.suspended() && ((renderDue && timeLeftBeforeLogic) || forceRender)) {
    s.nextRender = now + c.renderIntervalMs;
    const floorMs = Math.max(1000 / c.minRenderFps, c.renderIntervalMs);
    s.forcedNextRender = now + floorMs;
    h.render();
    s.renderPending = false;
  } else if (h.suspended() && renderDue) {
    s.nextRender = now + c.renderIntervalMs;   // keep the render clock moving while hidden
    s.renderPending = false;
  }
}

function runLoop(h: LoopHooks, c: LoopConfig, running: () => boolean): void {
  const start = h.now();
  const s: LoopState = { nextLogic: start, nextRender: start, forcedNextRender: start, renderPending: false };
  while (running()) pass(s, h, c);
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): the engine's fixed-step clock for the client fight loop. The server does not run it. Parity-checklist row 18, sub-line "server tick: fixed step" (the fixed-step half). Input intake (row 5) is not covered by this sketch.
- today: the Frankendom client frame loop (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)

Best transferable idea: one clock decides when a fight step runs, every step is followed by exactly one drawn frame, and a stall over 250 ms is dropped instead of replayed.
Decision (proposed): adapt - take the pass order and the backlog drop for the client fight clock; Frankendom's kills are server-verified, so the client only draws and sends intake, and the lockstep network gate is not copied.
Acceptance: a duel stalled for 300 ms resumes at the current step with no fast-forward of the missed steps, and each fight step has exactly one drawn frame; a fake-clock test asserts both.

Brief rule served: 1 (one engine, two clients: the loop lives in the client and the engine step is the same); the server-verified kill rule (the client never decides a hit or a kill).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the pass order; no donor line is translated.
- Defect 1, the replay-only floor: the comment at Game.cs 805 says the 10 fps floor is for replays, but the code (874-875, with 850) applies it in every mode. fix: make the floor a config value and set it for replays only, or change the comment. The sketch takes it as `minRenderFps`, so the choice is data.
- Defect 2, two clocks: world steps are paced by the loop's `nextLogic` (843-854) and by `TickTime` (638, TickTime.cs 28-49). Each has its own catch-up rule (restart at 250 ms in the loop; jump or one step in `TickTime`), so the two can disagree. fix: one clock owns the cadence; the sketch has one clock.
- Defect 3, the step is read twice: `ShouldAdvance` reads it (TickTime.cs 30) and `AdvanceTickTime` reads it again (43). The value can change between the two reads if `ReceiveTickScale` writes the field (OrderManager.cs 172-174) from another thread (the caller thread is not traced; it is called from Connection.cs 318-319), because `SuggestedTimestep` reads it (217-218). A zero at the second read would divide by zero; only the first read is guarded (32). fix: read once and pass the value into the advance. The sketch reads the interval once per pass.
- Lockstep model: in the donor the world step waits for every client's orders (TryTick, OrderManager.cs 308-324). Frankendom's fight is server-authoritative, so this gate does not transfer; only the pass order and the backlog rule do.
- Interpolation: not read. If the donor draws positions between logic steps, the sketch would need an alpha value; It would matter for the fight camera (row 11). Check before adopting.
- Timer resolution: `Thread.Sleep((int)(nextUpdate - now))` (895) depends on platform timer granularity. Not measured here.
- Not run: the sketch is typechecked (`tsc --strict`, ES2020) only; the behaviour claims are from reading the donor.
