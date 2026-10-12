# vcmi-vcmi (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/client/gui/FramerateManager.cpp` (with `client/GameEngine.cpp` mainLoop) | Licence: GPL v2.0 or later (FramerateManager.h line 6: "License: GNU General Public License v2.0 or later"; license.txt is GPL version 2, June 1991) | C++ | symbol `GameEngine::mainLoop` + `FramerateManager::framerateDelay`

Checked: Read in full: client/gui/FramerateManager.h (1-48) and FramerateManager.cpp (1-70); client/GameEngine.cpp 66-140 (mainLoop, handleEvents) and GameEngine.h 55-70; callers of framerateDelay, consumeElapsedMilliseconds, getElapsedMilliseconds and getFramerate (grep: GameEngine.cpp 96 and 134, CursorHandler.cpp 249, GameEngine.cpp 237); GameInstance.cpp 127-143 (wantsFrameRendered); mapHandler.cpp 28-35 (CMapHandler::hasOngoingAnimations); MapViewController.cpp 620-625; MapAudioPlayer.cpp 26-29; CursorHandler.cpp 245-256; config/schemas/settings.json 294-297 (targetfps default 60). The hint file `clientsdl2/render/CBitmapFont.cpp` was NOT read; it is a font renderer and the pacing and skip logic is elsewhere. Confidence high on the frame pacer and the redraw-skip gate. Not read: the vsync default (settings.json 298-300), the mobile path under android/, and the observer registration that puts MapViewController into CMapHandler's observer list (the call site was not read).

Best transferable idea: Redraw only when the state says something can change (and at least every 100 ms), clamp any gap to 100 ms, and carry the leftover milliseconds so timers never drift.
Decision (proposed): adapt - keep the delta clamp, the capped redraw skip and the remainder-carrying timer; drop the sleep-to-target loop because the browser's requestAnimationFrame already paces frames; and narrow the skip gate so a live duel can never skip.
Acceptance: A duel never skips a drawn frame (a client test asserts the redraw gate is open in every duel state); an idle screen redraws at most every 100 ms (about 10 frames a second), and no single frame advances timers by more than 100 ms.

## 1. Mechanism

- The main loop (GameEngine.cpp 112-136) runs one pass per iteration: fetch input (116); read the clock (120); if the engine user does not want a frame and less than 100 ms has passed since the last drawn frame, sleep 1 ms and loop again (122-128); otherwise record the draw time (131), update the frame under the interface lock (132, 138-140), present (133), then pace (134).
- Gate (GameInstance.cpp 127-143, `wantsFrameRendered`), in order: a battle on screen always draws (131-132); if the adventure map is not the top window, always draw (134-135); if the hero is walking, skip only when the map reports no ongoing animations (139-140); otherwise always draw (142). So the skip happens in one state only: the adventure map is on top, no battle is up, and a hero is between steps with nothing animating. The donor comment (137-138) gives the reason: rendering in that gap only delays the netpacks that start the next step.
- The map check (`CMapHandler::hasOngoingAnimations`, mapHandler.cpp 28-35) returns true if any observer reports an animation. `MapViewController` reports `animationWait.isBusy()` (MapViewController.cpp 624). `MapAudioPlayer` returns false (MapAudioPlayer.cpp 28).
- Pacing (`FramerateManager::framerateDelay`, FramerateManager.cpp 26-47), in order: busy = now minus the last pacing time (28). If vsync is off and busy is under one target frame (1 s / target fps, line 17), sleep for the rest (30-33). Measure the time from the last pacing time to now, after any sleep (38-39). Clamp it to 100 ms (40-41). Set the pacing time to now (43), write the value into a 60-entry ring (44-45) and add it to the unconsumed total (46).
- Timers: each event pass takes whole milliseconds from the unconsumed total and keeps the remainder (GameEngine.cpp 96; FramerateManager.cpp 54-59).
- Idle frames: the gate's 100 ms cap forces a draw at least every 100 ms even when skipping (GameEngine.cpp 122, the fall-through when the cap is reached). Each forced draw calls `framerateDelay`, so the pacing time moves at least every 100 ms, and the clamp (40-41) is the most a single frame can advance timers across an idle stretch.
- Readout: `getFramerate` averages the ring and rounds (61-69). The cursor animation advances by the last frame's elapsed time, 100 ms per cursor frame (CursorHandler.cpp 247-249).
- Settings: target fps from `settings["video"]["targetfps"]` at engine start (GameEngine.cpp 72), default 60 (settings.json 296). The ring starts full of the target frame time (FramerateManager.cpp 23).

Order of operations per pass: input, the skip gate (may sleep 1 ms and loop), draw, present, pace (sleep to target unless vsync), measure and clamp, feed timers.

## 2. Key functions

- `GameEngine::mainLoop`: `/mnt/frankendom-donors/vcmi-vcmi/client/GameEngine.cpp` 112-136. The one loop: skip gate, draw, present, pace.
- `FramerateManager::framerateDelay`: `/mnt/frankendom-donors/vcmi-vcmi/client/gui/FramerateManager.cpp` 26-47. Sleep to target, measure, clamp, record.
- `FramerateManager::consumeElapsedMilliseconds`: `/mnt/frankendom-donors/vcmi-vcmi/client/gui/FramerateManager.cpp` 54-59. Whole ms out, remainder kept.
- `GameInstance::wantsFrameRendered`: `/mnt/frankendom-donors/vcmi-vcmi/client/GameInstance.cpp` 127-143. The only state gate that allows a skip.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sleep to a target frame time, skipped when vsync paces the frame | Target fps from settings, default 60 (settings.json 296; GameEngine.cpp 72). Vsync default not read. |
| Clamp any gap to a maximum delta | 100 ms (FramerateManager.cpp 40-41). |
| Redraw skip, capped | Cap 100 ms (GameEngine.h 64); idle sleep 1 ms (GameEngine.cpp 127). |
| Whole ms out, remainder carried | None (integer ms, FramerateManager.cpp 56-57). |
| Rolling fps readout | 60-frame ring (FramerateManager.h 20). |
| Cursor animation at 100 ms per frame | 0.1 s (CursorHandler.cpp 247). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (gate first, then the clamped gap, then the carry into timers). It drops the sleep-to-target governor, the vsync switch, the 60-frame readout, and the input and draw calls. It measures the gap from the last drawn frame, as the donor does, so it does not change the timing. The donor's gate is one state (a walking hero); the sketch takes the state as an input (`wantsFrame`), so the duel rule is the caller's job. The last line prints 16 (my arithmetic: a 16 ms gap, drawn, gives 16 ms to timers); the sketch was not run.

```ts
// Licence: GPL-2.0-or-later (donor, per file headers and license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Frame pacer for a browser loop: skip redraws only while the state says nothing animates, cap the skip, clamp the gap, carry leftover ms into timers.
const MAX_DELTA_MS = 100; // any gap longer than this (stall, breakpoint, idle) counts as this much
const MAX_SKIP_MS = 100;  // never skip drawing for longer than this, even when idle

interface PacerState {
  lastRenderMs: number;  // time of the last drawn frame
  carryMs: number;       // fractional ms not yet handed to timers
}

interface StepResult { render: boolean; deltaMs: number; timerMs: number; }

function pacerStep(s: PacerState, nowMs: number, wantsFrame: boolean): StepResult {
  const sinceDraw = nowMs - s.lastRenderMs;
  if (!wantsFrame && sinceDraw < MAX_SKIP_MS) {
    return { render: false, deltaMs: 0, timerMs: 0 };
  }

  const delta = Math.min(sinceDraw, MAX_DELTA_MS);
  s.lastRenderMs = nowMs;
  s.carryMs += delta;
  const whole = Math.floor(s.carryMs);
  s.carryMs -= whole;
  return { render: true, deltaMs: delta, timerMs: whole };
}

console.log(pacerStep({ lastRenderMs: 0, carryMs: 0 }, 16, true).timerMs);
```

## 5. Lands in

- TARGET `origins/client/render/frame-pacer.ts` (proposed new file; path not checked against the repo). Client-only: the engine never reads frame timing, so no src/fight change. A live duel always passes `wantsFrame = true`.
- Parity-checklist row 16 (colour grade / quality): the target fps and the redraw skip are device-quality settings. No row covers frame pacing; 16 is the nearest. Lead may want a new row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: camera/HUD client-only ruling; zones as data (the fps and caps are settings, not engine constants); rules 7-9 n/a

## 6. Gaps and risks

- No timing defect found. I checked the resume path: the gate's 100 ms cap forces a draw, which moves the pacing time, so the first frame back advances timers by at most 100 ms (FramerateManager.cpp 40-41). The 10 Hz idle draws are intentional (GameEngine.cpp 118-119 calls the cap a safety net for the network thread) and keep the cursor and UI timers ticking. Do not "fix" this by freezing idle time: the cursor would stop.
- Gate scope: the donor's only skip state is a walking hero with no animation (GameInstance.cpp 137-142). A real-time duel must never skip. Frankendom's rule (the fight is the whole fight) means the gate must be "not in a live fight and not waiting on a frame the server owes", and it must be tested per state, not assumed.
- Waiting on the server: the donor skips while the network thread needs the interface lock (GameEngine.cpp 118-119). In Frankendom the equivalent is a client state that waits for a server confirm. A skip there is safe only when no local animation runs.
- Sleep-to-target is redundant in a browser: requestAnimationFrame already paces to the display. Porting the sleep would add latency and nothing else.
- Timer ms are integers in the donor (FramerateManager.cpp 56); the sketch keeps a float carry. Both are fine; the float carry avoids a 1 ms slip at 60 Hz.
- Nothing here covers the duel rules, the server tick or the death and respawn presentation. The donor's rendering code does not touch them.
- Not read: the mobile path (android/), the vsync default, the observer registration, and the CBitmapFont.cpp hint file.
