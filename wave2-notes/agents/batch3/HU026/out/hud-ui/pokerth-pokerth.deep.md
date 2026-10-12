# pokerth-pokerth (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/gametable/mytimeoutlabel.cpp` (Qt widget client) with its pair `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt6-qml/cpp/gamehandler.cpp` and `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt6-qml/components/PlayerTimeoutBar.qml` (QML client) | Licence: as read: GNU AGPL-3.0-or-later (file header: "either version 3 of the License, or (at your option) any later version"; COPYING is AGPL v3; the header also has an OpenSSL additional permission, not relevant here) | C++ (Qt widgets), C++ (Qt6 QML) and QML | symbol `MyTimeoutLabel::startTimeOutAnimation`

Checked: Symbol `MyTimeoutLabel::startTimeOutAnimation` at mytimeoutlabel.cpp:51; the whole file (1-151) was read, including `nextTimeOutAnimationFrame` (105-128) and `paintEvent` (130-151). Callers read: gametableimpl.cpp 2211-2226. The QML pair was read: gamehandler.cpp 1375-1460 (start and stop handlers, the cue timer) and PlayerTimeoutBar.qml (61 lines, all). The hint file (guiwrapper.cpp) is a wrapper of refresh calls and does not hold the timer. Confidence: high on the widget mechanism and on the QML cue point (both read line by line); medium on which client ships in a given build (not checked). Not read: the server message that sets `timeoutSec`, and the server-side timeout (not in this donor's client code). camera_scope: not applicable (HUD, not camera).

## 1. Mechanism

- What it is: a per-seat action clock. When the server says a seat is to act for N seconds, the client shows a slim bar on that seat; the bar holds full for a short grace, then drains linearly to empty at the deadline. One "your turn" cue plays for the local seat. The client never decides the outcome; the comment at mytimeoutlabel.cpp:124 says "no callback is called here. the server initiates any action required."
- Order of steps, widget client (read):
  (a) The caller (gametableimpl.cpp 2217 and 2219) passes the server's `timeoutSec`, with the beep flag true for seat 0 only.
  (b) Windows under 4 s are ignored (54). The track is 52 px (60) and the frame counter starts at 1 (59).
  (c) The redraw step is `(secs-3)*1000/52` ms (62), then the step is multiplied up until it is at least 100 ms (64, 67-75). For secs 6 to 9 an extra +5 ms is added on each pass (68-70), which the comment calls a fix for integer division.
  (d) The hold is `3000/step` frames (76), about 3 s. The real clock starts (79-80) and the redraw timer starts with the step (84).
  (e) Each tick (105-128): while the frame counter is at or below the hold, nothing moves. Once it passes the hold (109), the cue plays once (the `isBeepPlayed` guard, 111-113). The width is then recomputed from real elapsed time as `52 - (elapsed - 3000) * 52 / ((secs-3) * 1000)` (116-117). When the width drops below 0 the timer stops (no callback).
  (f) Paint (130-151): before the hold, the label text is drawn (134). After the hold the bar is drawn with a fixed red-yellow-green gradient over 0-47 px (137-149). Because the gradient is fixed to the track, the bar is green at full and shows red as the last part remains.
- Worked numbers, from the donor's constants (arithmetic, not measured): at secs = 10 the step is 7000/52 = 134 ms, which is already at least 100, so the loop does not run. The hold is 3000/134 = 22 frames, about 2948 ms. The bar then drains 52 px over 7000 ms.
- QML pair (read): `onStartTimeoutAnimation` (gamehandler.cpp 1375) opens the turn window (1386) and marks my turn for seat 0 (1403-1405) and schedules a single-shot cue at `(timeoutSec - 3) * 1000` ms (1416-1417). The cue is only for seat 0, only while still my turn, and only when `timeoutSec >= 4`. `PlayerTimeoutBar` drains a fill from 1.0 to 0.0 with a linear easing over the whole `GameTable.timeoutSec` (57-59). There is no hold. `onStopTimeoutAnimation` stops the cue (1426) and ends my turn.
- Tick: a QTimer per bar, not a per-frame game loop. The widget uses a real clock for the drain and a frame counter for the hold. The QML bar uses the Qt animation clock.

## 2. Key functions

- `MyTimeoutLabel::startTimeOutAnimation`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/gametable/mytimeoutlabel.cpp` 51-86. Sets the window, computes the step, the hold and the timer.
- `MyTimeoutLabel::nextTimeOutAnimationFrame`: same file, 105-128. Plays the cue once after the hold, recomputes the width from the clock, stops at width below 0.
- `MyTimeoutLabel::paintEvent`: same file, 130-151. Shows the label during the hold and the gradient bar after it.
- `gameTableImpl::startTimeoutAnimation`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt/gametable/gametableimpl.cpp` 2211-2220. Picks the beep for seat 0 only.
- `GameHandler::onStartTimeoutAnimation` and `GameHandler::onStopTimeoutAnimation`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt6-qml/cpp/gamehandler.cpp` 1375-1418 and 1420-1435. The QML cue timer and the turn window.
- `PlayerTimeoutBar`: `/mnt/frankendom-donors/pokerth-pokerth/src/gui/qt6-qml/components/PlayerTimeoutBar.qml` 42-59. The linear fill animation.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (line) |
|---|---|
| Hold a grace window, then drain linearly to the deadline | Hold 3000 ms (76); drain over (secs - 3) s (62, 117); QML drains over all of secs (58) |
| Redraw cadence capped at about 10 per second | Step floor 100 ms (67) |
| One cue, once, for the local seat only | Cue flag guard (111-113); seat 0 only (2219; QML 1416) |
| Track width | 52 px (60) |
| Client does not decide the end | No callback at expiry (124 comment) |
| Cue timing point | Widget: at the end of the hold, 3 s after start (109-113). QML: at timeoutSec - 3 s after start (1417). They agree only when timeoutSec = 6. |

Defects found, with the fix for each (keep the idea, fix the defect):
1. Integer-division fudge: `+5` ms per pass for secs 6-9 (68-70). Fix: no step arithmetic is needed when the position comes from the clock; the step only sets the redraw rate. The sketch drops the step entirely.
2. Two clients, two cue points (widget 3 s after start; QML secs - 3 s after start). The QML comment at gamehandler.cpp 1413 says "As in the widgets client", which is not true. Fix: one rule. The sketch uses the widget's point (start of the drain), once.
3. Hold counted in frames (76, 109) but the drain is on the clock (117), so the hold is quantised (2948 ms at secs = 10) and the drain assumes exactly 3000 ms. Fix: count the hold on the same clock. The sketch does.
4. `timeOutAnimationWidth` is not in the constructor's initialiser list (38), and `startTimeOutAnimationNow` (88-93) starts a fixed 83 ms redraw with no length; no caller in src uses it (searched). Fix: delete the dead entry and initialise state in the constructor. The sketch has no such state.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's shape (window under 4 s gets no bar, hold, linear drain to the deadline, one cue, clamp) but reads only the elapsed clock, so it omits the frame-step arithmetic, the 100 ms redraw floor, the +5 ms fudge, the widget's 52 px track and red-yellow-green gradient, the QML animation, the seat and turn-window gates, and the stop path. It moves the cue to the start of the drain (the widget's point), which the QML client does not use.

```ts
// Licence of donor: GNU AGPL-3.0-or-later. Clean-room sketch from the described mechanism, not a translation of the donor lines.
export class ActionTimer {
  private cued = false;

  constructor(
    private readonly timeoutS: number,   // window length supplied by the server
    private readonly graceS = 3,         // hold before the bar starts to move
    private readonly minTimeoutS = 4,    // shorter windows get no bar
  ) {}

  // elapsedMs: time since the window opened, measured on the client clock
  view(elapsedMs: number): { phase: "none" | "hold" | "drain" | "done"; fraction: number; playCue: boolean } {
    if (this.timeoutS < this.minTimeoutS) return { phase: "none", fraction: 0, playCue: false };
    const totalMs = this.timeoutS * 1000;
    const graceMs = this.graceS * 1000;
    if (elapsedMs >= totalMs) return { phase: "done", fraction: 0, playCue: false };
    if (elapsedMs < graceMs) return { phase: "hold", fraction: 1, playCue: false };
    const drained = (elapsedMs - graceMs) / (totalMs - graceMs);
    const fraction = Math.min(1, Math.max(0, 1 - drained)); // clamped: no overshoot past the track
    const playCue = !this.cued;                              // one cue, at the start of the drain
    this.cued = true;
    return { phase: "drain", fraction, playCue };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/pokerth-action-timer.ts`).

Best transferable idea: a server-opened decision window shown as a bar that holds for a short grace, drains linearly to the server deadline on the client clock, cues once at the start of the drain, and ends when the server says so, never when the client timer runs out.
Decision (proposed): adapt. The shape is right for a timed decision in a fast duel, but the 3 s hold is a poker-table choice and must be data (default small), and the donor's two cue points must become one rule.
Acceptance: in a server-opened window of N s, the local bar sits full for the grace, drains linearly to empty at the server deadline, plays one cue at the start of the drain, and disappears when the server closes the window; a unit test asserts that the fraction stays in 0..1 for any elapsed time and that the cue fires once.

Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape only)
Brief rule served: server-verified outcomes (the bar is cosmetic and the server closes the window); one engine (client-only HUD); timing loop found and described (QTimer per bar, clock-based drain)

## 5. Lands in

- TARGET `src/fight/hud-timer.ts` (new, client-only view model; the server owns the deadline and opens and closes the window). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: as above

## 6. Gaps and risks

- The server owns the deadline. The donor starts its clock when the message arrives (gametableimpl.cpp 2211-2220 carries no server timestamp), so network latency shifts the bar. Frankendom must send the deadline and let the client compute remaining time from it. How the donor estimates server time was not read (not in this code).
- The 3 s hold suits a poker table, where the player has time to look. In a fast duel the player sees nothing for 3 s. The grace must be data with a small default, set per window type.
- The local-only cue (seat 0 only, 2219 and 1416) is right for one local player. A many-on-one fight needs the cue for the focused target only, decided in the engine, not here.
- The bar is a HUD element, so it stays client-only. It must never gate an attack; the server still verifies every action.
- The width is 52 px and the gradient is fixed to the track. For 375-wide phones the bar must be sized against the target frame, which is not in this donor (not read).
- Also seen in the hud-ui topic, in this donor (not part of the timer mechanism):
  - Minimap, world map, health or target frames and lock-on: a search of src for minimap, radar, world map, lock-on, HP bar and target frame returned no file. Nothing to adopt.
  - Touch UX: `mobileinputhelper.cpp` (read in part, 15-150) scrolls a focused field into view with a 100 px margin so the Android soft keyboard does not cover it, and only under `#ifdef ANDROID`. Small and adoptable as a rule: a focused input must sit above the on-screen keyboard.
  - String table: `ts/pokerth_START_HERE.ts` (counted by grep, not read line by line): 1032 source messages in 41 contexts, one per dialog or class, each with a source-file location. Placeholders are positional (`%1` on 54 lines, `%2` on 14 lines, no `%n`). No Qt plural forms (`numerus`) are used; 5 lines fall back to a hedged "(s)" and 38 lines use an ellipsis. All 1032 template translations are empty (`type="unfinished"`); the German file in the same folder has no unfinished entries.
