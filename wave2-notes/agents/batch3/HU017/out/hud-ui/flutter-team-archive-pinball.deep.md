# flutter-team-archive-pinball (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/pinball_game.dart` | Licence: MIT (root `LICENSE`: "MIT License", Copyright (c) 2021 Very Good Ventures; read in full) | Dart (Flutter + Flame) | symbol `PinballGame.onTapDown`

Checked: The hint file `packages/pinball_ui/lib/pinball_ui.dart` is a 9-line export barrel with no logic (read in full). The real touch path is `lib/game/pinball_game.dart` 152-213 (read in full), and the gate that arms the inputs is `lib/game/components/game_bloc_status_listener.dart` (read in full). The plunger and flipper behaviours were read in full. Flame's `MultiTouchTapDetector` and Forge2D are not in the donor box (not read), so the event delivery and physics step are assumed, not checked. Confidence: high on the donor's touch path and the three defects (each defect was checked by reading the gate code and by grep of `lib/` for `focusedBoardSide` and for `remove`); not run on a device. Hint row 14 (HUD) does not match the mechanism: the score panel and the string table were read too and are in section 6. Not a camera cell.

Best transferable idea: Track each finger's side in an owner map, drop a side's guard only when its last finger lifts, and gate all touch intake on one engine-state flag.
Decision (proposed): adapt - keep the owner map, the last-finger-drops-the-hold rule and the state gate; drop the screen-half flipper mapping, because the Frankendom touch layout was not read here and the fight uses its own controls.
Acceptance: On a 375-wide phone, a second finger on the left half keeps the guard up after the first finger lifts, and lifting both drops it; a server test asserts that touch intake changes no guard state while the fight is not live.

## 1. Mechanism

- Touch input is split by screen half and tracked per finger. `onTapDown` (pinball_game.dart 155) accepts a touch only when the pointer kind is touch and the bloc status is playing (156-157). If the touch falls inside the rocket rectangle (world-space hit test, 162-163), it calls `PlungerCubit.autoPulled` (164-168). Otherwise it compares the touch x with half the canvas width (170), stores the side under the pointer id (171), and calls `moveUp` on every flipper on that side (173-181).
- Release is per pointer. `onTapUp` (189-192) and `onTapCancel` (195-198) both call `_moveFlippersDown(pointerId)` (200-212). That reads the stored side and calls `moveDown` on every flipper on that side. Nothing removes the pointer entry.
- Tap-to-charge with no hold: the plunger has an `autoPulling` state, and `isPulling` is true for both `pulling` and `autoPulling` (plunger_state.dart 13). The pull behaviour sets the plunger's linear velocity on every update (plunger_pulling_behavior.dart 25-26). The auto-pull behaviour releases the plunger once the prismatic joint's translation is at or below its lower limit (43, 46-47). So one tap drives the plunger to its bottom and lets it go. The player does not hold.
- Release spring: when the state changes to releasing, the plunger's velocity is set to (initial y minus current y) times the release gain (plunger_releasing_behavior.dart 22-28).
- Arming: the input behaviours are added when the status becomes playing (game_bloc_status_listener.dart 22-32). They are meant to be removed on game over (47, 51). The keyboard flipper behaviour raises a flipper on key down and drops it on key up (flipper_key_controlling_behavior.dart 41-44).

Order of operations for one touch on a flipper side: touch-only and playing gate, then rocket test, then side from x, then pointer recorded, then `moveUp` on that side's flippers. Release: look up the pointer's side, then `moveDown` on that side's flippers. The pointer entry is never deleted.

## 2. Key functions

- `PinballGame.onTapDown`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/pinball_game.dart` 155-186. Gate, rocket test, side split, flipper raise.
- `PinballGame._moveFlippersDown`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/pinball_game.dart` 200-212. Release by the stored side. Callers read: `onTapUp` (190) and `onTapCancel` (196) are the only two in `lib/`.
- `GameBlocStatusListener.onNewState`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/components/game_bloc_status_listener.dart` 18-54. Adds the input behaviours on playing and tries to remove them on game over.
- `PlungerPullingBehavior.update` and `PlungerAutoPullingBehavior.update`: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/plunger/behaviors/plunger_pulling_behavior.dart` 23-28 and 41-50.
- `PlungerReleasingBehavior.onNewState`: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/plunger/behaviors/plunger_releasing_behavior.dart` 22-30.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-pointer owner map; a side's hold is kept while any pointer holds it | Split at half the canvas width (`canvasSize.x / 2`, pinball_game.dart 170) |
| Tap-to-charge: a charge runs to a limit and releases itself | Pull velocity 7 (game_bloc_status_listener.dart 81); release gain 11 (plunger.dart 27); limit is the joint's lower limit (pulling 46) |
| Input armed only in the live state | Armed on playing (game_bloc_status_listener.dart 22-32); the touch path also checks `isPlaying` (pinball_game.dart 157) |
| Touch targets | Pad box 180 (mobile_dpad.dart 18); buttons 60 wide and 60 high (pinball_dpad_button.dart 62-63) |

The rule "release only when the pointer's own entry is cleared" is missing in the donor (section 6). The donor's numbers are a pinball table's; none of them is a fight value.

## 4. TypeScript sketch

simplified: follows the donor order: touch-only and armed gate first, then the rocket test, then the side split and hold, then release by pointer. It omits the Flame hit-test (the rocket rectangle is a callback), the mouse path, the keyboard map, the plunger physics and the flipper motion (the auto-charge is a callback). It changes three things on purpose, each fixing a donor defect: release deletes the pointer entry (the donor never deletes it); a side drops only when its last finger lifts (the donor drops every flipper on the side on any lift); closing the gate releases every hold (the donor's removal does not reach the attached behaviours, see section 6).

```ts
// Licence: MIT (donor, Very Good Ventures 2021). Written from the mechanism; the donor's defects are fixed here.
type Side = 'left' | 'right';

// Per-finger ownership of a side. A side's guard stays up while any finger still holds it.
class TouchGuardInput {
  private owner = new Map<number, Side>();          // pointerId -> side this finger holds
  private holders: Record<Side, number> = { left: 0, right: 0 };
  private armed = false;                            // true only while the fight is live

  constructor(
    private canvasWidth: () => number,
    private setGuard: (side: Side, up: boolean) => void,
    private isRocketHit: (x: number, y: number) => boolean,
    private onRocketTap: () => void,                // stands in for the plunger auto-pull
  ) {}

  // Engine state drives the gate. Closing it drops every hold.
  setArmed(on: boolean): void {
    this.armed = on;
    if (!on) for (const id of [...this.owner.keys()]) this.up(id);
  }

  down(pointerId: number, x: number, y: number, isTouch: boolean): void {
    if (!isTouch || !this.armed) return;
    if (this.isRocketHit(x, y)) { this.onRocketTap(); return; }
    if (this.owner.has(pointerId)) return;
    const side: Side = x < this.canvasWidth() / 2 ? 'left' : 'right';
    this.owner.set(pointerId, side);
    this.holders[side] += 1;
    if (this.holders[side] === 1) this.setGuard(side, true);   // first finger raises the guard
  }

  up(pointerId: number): void {
    const side = this.owner.get(pointerId);
    if (side === undefined) return;                 // unknown or already released: nothing to do
    this.owner.delete(pointerId);                   // the pointer entry is removed on release
    this.holders[side] -= 1;
    if (this.holders[side] === 0) this.setGuard(side, false);  // only the last finger drops it
  }

  cancel(pointerId: number): void {
    this.up(pointerId);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/HU017-flutter-touch-guard.ts`).

## 5. Lands in

- TARGET `src/fight/input.ts` (new module: touch intake for the fight; the client sends intents, the engine validates them). Parity-checklist row 5 (controls/input). The hint row 14 (HUD) is not the mechanism here.
- today: no equivalent read in Frankendom (Frankendom's current touch code was not read).
- Reuse tag: adapt-from-idea (MIT: code may be adapted; the sketch is written fresh)
- Brief rule served: 1 (one engine: the arm and disarm gate follows engine state, not a client flag); 5 (controls intake); rules 7-9 n/a

## 6. Gaps and risks

- MIT: adaptation is allowed. The sketch was written from the mechanism anyway.
- Defect 1, stale pointer map: `focusedBoardSide` is set (pinball_game.dart 171), read (201, and 204 inside `_moveFlippersDown`), and never removed anywhere in `lib/` (grep). A reused pointer id can release a flipper that another finger is holding. Fix: delete the entry on release (sketch `up`).
- Defect 2, one finger drops the whole side: `_moveFlippersDown` calls `moveDown` on every flipper of the side (209) with no count of holders. Two fingers on the left, one lifts, and the left guard drops. Fix: count holders per side (sketch `holders`).
- Defect 3, the input gate does not close on game over: `_addFlipperBehaviors` adds the key behaviour to the cubit provider child (game_bloc_status_listener.dart 100-101), but `_removeFlipperBehaviors` scans `flipper.children` (103-104). The plunger is the same: behaviours go to the provider child (78-79), removal scans `plunger.children` (88-89). As read, the keyboard behaviours stay attached after game over and are added again on replay. Replay sends `GameStarted` to the existing bloc (replay_button_overlay.dart 22; `GameState.initial` with status playing, game_bloc.dart 22), and the only `PinballGame(` constructions in `lib/` are in pinball_game_page.dart 34 and 43, so the game object is not rebuilt by replay (grep). Touch is still gated by `isPlaying` (pinball_game.dart 157), so the keyboard and touch paths disagree after game over. Not run on a device. Fix: keep references to the behaviours added and remove those (sketch `setArmed`).
- The pull speed is a velocity set on every update with no dt (plunger_pulling_behavior.dart 26). Frankendom must drive any charge from a fixed-step timer, not a per-frame velocity. The physics step itself was not read.
- The screen-half split works because a pinball board has two flippers. A fight needs its own mapping; do not copy the half split.
- HUD (hint row 14), read in full, minor: the score panel height is 9 percent of screen height clamped to 60-90 px (game_hud.dart 60-63), and its width comes from the sprite aspect ratio 3.4722 plus 16 px (game_hud.dart 25, 37). A bonus animation replaces the score in the same slot for a short time when the bonus list grows (game_hud.dart 38-53); game over swaps the score for a text line (score_view.dart 25-27). Score shown is round score plus total score (game_state.dart 83). For Frankendom, the only idea to take is a takeover of one slot, not a second panel.
- String table (`lib/l10n/arb/app_en.arb`, read in full, quoted nothing): 109 JSON entries = 1 locale tag + 54 messages + 54 `@` description entries. One message has a placeholder (the score). One description entry is orphaned: its name does not match any message. Keys are camelCase. Labels mix title case, sentence case and upper case for controls. Some sentences are built from pieces in code (the initials prompt pieces are read in initials_input_display.dart 311, 345 and 379), which breaks translation. Frankendom: keep each message whole, one description per message, and lint for orphan descriptions.

Reuse tag: adapt-from-idea (MIT, adapt; written fresh)
Brief rule served: 1 (one engine: the gate follows engine state); 5 (controls intake); section 6 HUD and string-table notes are not new mechanisms
