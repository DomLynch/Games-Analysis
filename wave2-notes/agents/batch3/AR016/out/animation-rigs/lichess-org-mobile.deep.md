# lichess-org-mobile (animation-rigs, cell 2)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/view/puzzle/storm_clock.dart` (with `lib/src/model/puzzle/storm_controller.dart` for the event source) | Licence: GPL-3.0 (LICENSE lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | Dart | symbol `_ClockState` (storm_clock.dart 16-169; `_subscribeToStream` 61-77)

Checked: `storm_clock.dart` 1-169 read in full (widget, controller, bonus popup, counter roll). `storm_controller.dart` 86-100 (award on a correct move), 339-453 (bonus table, `bonus()`, the `StormClock` stream, tick and reset) read; `percent()` and `nextLevel()` not read in full. `storm_screen.dart` 618-640 (ladder display) read. Hint file `lib/src/widgets/board_thumbnail.dart` is the WRONG file: it is a board preview whose only motion is a tap scale of 0.98 (75) and 1.00 (80), and `animationDuration` is a parameter passed through (64). Candidates for the topic, grep-seen only (not read): `shimmer.dart` (loading shimmer, AnimationController.unbounded), `expanded_section.dart` (expand with Curves.fastOutSlowIn), `bottom_bar.dart` (2 s controller), `puzzle_screen.dart` 641 (a Tween). Caveat: the donor copy is not valid Dart as stored (line 11 `class const StormClockWidget(...)` and line 16 `class _ClockState() extends`), so it looks altered; read as stored. Confidence: high on the popup and counter mechanism as read; medium on fit (a feedback popup, not a skeleton, rig or body reaction). camera_scope: not applicable.

## 1. Mechanism

- Event source, on a correct move: `storm_controller.dart` 92-96 checks `move == expected`, asks `combo.bonus(getNext: true)` (93) and calls `state.clock.addTime(bonus)` (95) when there is one. The award is decided in the client.
- `bonus()` (379-387) returns the level's seconds only when `percent(...).floor() == 0` and the level is above zero (380-383). The table is `levelsAndBonus` (343-348): level 5 gives 3 s, 12 gives 5 s, 20 gives 7 s, 30 gives 10 s.
- The clock (`StormClock`, 390-453) publishes every change on a broadcast stream of (time, signed seconds). `addTime` adds and emits the positive amount (402-405). `subtractTime` subtracts, clamps at zero (409-411), and emits the negative amount (412). The 1 s tick emits (time, null) (420-423). `reset()` (435-444) cancels the timer and emits the start time.
- Widget subscription (`_subscribeToStream`, 61-77): each event sets `time` and `isActive`; when the event has a bonus, it stores `currentBonusSeconds` and calls `_controller.forward(from: 0.0)` (74).
- Controller (39): `AnimationController` of 1500 ms. Its status listener (40-46) clears `currentBonusSeconds` when it completes (43). So the popup lasts one controller run, and each new event restarts it.
- Popup (111-130), shown while `currentBonusSeconds != null`: a `FadeTransition` with opacity from 1.0 to 0.0 on `CurvedAnimation(..., Curves.easeOut)` (18-21, 114); inside it a `SlideTransition` whose offset goes from (0.7, 0.0) to (0.7, -1.0) with the same curve (22-25, 116). The text is `+N` when N is positive and `-N` otherwise (118), coloured error when N < 0 and good otherwise (120-122), 20 px bold (124).
- Counter roll (131-152), shown in the same condition: a `TweenAnimationBuilder` of `Duration` from `time - bonus` to `time` over 500 ms (133-137). It shows mm:ss at 26 px (9, 139-147) in the same colour rule.
- Otherwise (153-163): plain mm:ss in the active or inactive clock colour.

## 2. Key functions

- `_ClockState` build: `storm_clock.dart` 87-168; the popup 111-130 and the roll 131-152 are inside it.
- `_subscribeToStream`: `storm_clock.dart` 61-77 (store the bonus, restart the controller at 74).
- Controller and status listener: `storm_clock.dart` 39-46.
- Award and bonus lookup: `storm_controller.dart` 92-96 and 379-387. The clock stream: 390-453 (`addTime` 402-405, `subtractTime` 407-413, tick 420-425, `reset` 435-444).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| A value event restarts a fixed-length popup (no queue) | 1500 ms (39); restart at 74; a second event replaces the first number (72, 74) |
| Popup fades and rises with an ease-out curve | opacity 1.0 -> 0.0 (18-21); offset (0.7, 0.0) -> (0.7, -1.0) (23-24); `Curves.easeOut` (21, 25) |
| Counter rolls from the old value to the new one, in a shorter time | 500 ms (137); begin = time - bonus (134). Curve not given, so the Flutter default applies (not read in the donor) |
| Sign and colour from the amount | "+" when > 0 (118); error when < 0, good otherwise (120-122) |
| Event amounts | +3, +5, +7, +10 s per level (343-348, awarded at 383). A subtract is emitted as the negative of the requested amount (412) |
| Clock floor | Clamped at zero on subtract (409-411) |
| Tick | 1 s periodic (420) |

Quirk, from reading the numbers: a subtract that the clamp cuts short gives a roll that starts above the old value. Example (arithmetic, not run): clock at 2 s, subtract 5 s: the clamp sets time to 0 (410), the event is (0, -5) (412), and the roll begins at 0 - (-5) = 5 s (134) and ends at 0. The popup says "-5" although 2 s were lost.

## 4. TypeScript sketch

simplified: keeps the popup's timing (1500 ms popup, 500 ms roll, the fade and the rise to -1.0 with a fixed 0.7 side offset), the restart-on-event rule and the colour rule. It differs in these ways: (a) the caller passes the previous value explicitly, where the donor derives it as new time minus bonus, so the clamp quirk does not happen; (b) the easing is a quadratic ease-out, because Flutter's `Curves.easeOut` is not in the donor and is not reproduced; (c) the roll is linear, as the Flutter default is; (d) it returns a frame object, not a widget; (e) it omits the Riverpod and theme parts, the text style, the font sizes, `isActive` colours, the status listener and the `StormClock` stream.

```ts
// Licence: GPL-3.0 (lichess-org-mobile LICENSE, read). Clean-room sketch written from the described mechanism; not a translation of storm_clock.dart.
// clean-room
export {};

interface PopupTuning {
  popupMs: number; // donor 1500 (AnimationController duration)
  rollMs: number; // donor 500 (TweenAnimationBuilder duration; linear, no curve given)
  sideFraction: number; // donor 0.7 (SlideTransition x, as a fraction of the widget width)
  riseFraction: number; // donor -1.0 (SlideTransition y end, as a fraction of the widget height)
}

export interface PopupFrame {
  alpha: number; // donor opacity 1.0 -> 0.0
  dx: number; // constant side offset
  dy: number; // rises from 0 to riseFraction
  shown: number; // counter value in seconds, rolled from the previous value to the new one
  good: boolean; // colour: good when the signed amount is not below zero
}

// SIMPLIFIED: quadratic ease-out. The donor uses Flutter's Curves.easeOut, which is not in the donor and not reproduced here.
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class BonusPopup {
  private startedAt: number | null = null;
  private from = 0;
  private to = 0;
  private amount = 0;

  // A new event restarts the popup at once (donor: forward(from: 0.0)); events do not queue.
  push(previousValue: number, newValue: number, signedAmount: number, now: number): void {
    this.from = previousValue;
    this.to = newValue;
    this.amount = signedAmount;
    this.startedAt = now;
  }

  // Returns null when the popup is finished. The counter and the popup end together (donor: the bonus branch is removed at completion).
  frame(now: number, t: PopupTuning): PopupFrame | null {
    if (this.startedAt === null) return null;
    const elapsed = now - this.startedAt;
    if (elapsed >= t.popupMs) {
      this.startedAt = null;
      return null;
    }
    const k = easeOut(elapsed / t.popupMs);
    const rollT = Math.min(1, elapsed / t.rollMs); // linear roll
    return {
      alpha: 1 - k,
      dx: t.sideFraction,
      dy: t.riseFraction * k,
      shown: this.from + (this.to - this.from) * rollT,
      good: this.amount >= 0,
    };
  }
}
```

## 5. Lands in

- TARGET `src/fight/hit-numbers.ts` (new, client-only presentation). The number comes from the engine's server-confirmed hit event; the client only draws it. The engine never reads it.
- Parity-checklist row: 10 (hit impact/hitstop), the closest row. Row 14 (HUD) also claims floating numbers; say which one owns it when the module is written.
- today: none known to this reader; the Frankendom repo was not read.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine, the client draws only what the engine sends); licence rule 6 (GPL: clean-room, shape only)

Best transferable idea: A value event that restarts a short fade-and-rise popup, with the counter rolling from the old value to the new one in a shorter time, gives hit feedback that matches the number the engine sent.
Decision (proposed): adapt - take the popup shape (restart on each event, fade and rise, a counter roll that is shorter than the popup) for hit numbers. Change the source: the number comes from the server-confirmed hit, and the previous value is passed in, never derived in the client. Why: the donor decides the bonus in the client and mis-rolls a clamped subtract, which our one-ledger and server-verified rules forbid.
Acceptance: A server-confirmed hit of 18 shows "-18" rising and fading over 1.5 s above the target while the health number rolls from its old value to its new value over 0.5 s; a test asserts the number comes from the server event, and a loss clamped at zero shows the true loss, not the requested amount.

## 6. Gaps and risks

- The award is client-side (storm_controller.dart 92-96). Frankendom must not copy that: the popup takes the server's number as input. The sketch does this by taking the amount as a parameter.
- Clamp quirk (409-412 with 134): a subtract that is cut at zero makes the roll start above the old value, and the popup shows the requested amount, not the loss. The sketch passes the previous value explicitly; a Frankendom port must pass the true previous value too.
- A second event inside the 1500 ms popup replaces the first number (72, 74). Two hits in a row show only the last number. Whether to queue or replace is a designer choice; the donor does not decide it. (Not decided here.)
- Easing: the donor's `Curves.easeOut` and the `TweenAnimationBuilder` default curve are not in the donor; the sketch uses a quadratic ease-out and a linear roll. The TweenAnimationBuilder restart behaviour when `end` changes was not read.
- Not read: `percent()` and `nextLevel()` in full (`storm_controller.dart`); the Riverpod wiring; `ClockStyle` colours.
- Outside this topic, noticed while reading (for Lead, not verified in play): the ladder display uses a second list `StormCombo.levelBonus = [3, 5, 6, 10]` (storm_controller.dart 340; read by storm_screen.dart 625), while the award uses `levelsAndBonus` (343-348), where the third step is 7 s. The screen would show 6 where the code awards 7.
- Donor as stored is not valid Dart (lines 11 and 16 in storm_clock.dart). Treat it as altered until someone checks the upstream file.
