# hedgewars-hw (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uTouch.pas` | Licence: GNU General Public License, "version 2 of the License" (uTouch.pas header line 7; no or-later clause; COPYING is the GPL v2 text) | Pascal (game engine) | symbol `onTouchDown` / `onTouchUp` / `onTouchClick`

Checked: The list hint `project_files/HedgewarsMobile/Classes/MainMenuViewController.h` (26 lines, opened) is an iOS main-menu controller header, not the HUD, so it was not used. The real touch UX is `hedgewars/uTouch.pas` (676 lines, read in full). Also read: `hedgewars/uLocale.pas` 61-147 (locale loader and event-string pick), `share/hedgewars/Data/Locale/en.txt` (structure and counts by grep; the file was not read line by line), `hedgewars/uConsts.pas` 152, `hedgewars/uVariables.pas` 2750-2762 and 2932, `hedgewars/hwengine.pas` 340-362 (clock source, replay loop only), `hedgewars/uWorld.pas` 1155-1156 (two grep lines only, read as text). Confidence: high on the button and tap model (every branch of onTouchDown, onTouchUp, onTouchClick and onTouchLongClick read); medium on the aim arithmetic (the launch formula is read in two lines, not in the shot code); RealTicks is a replay clock in the path read, so its unit (taken as ms) is unverified. Not read: the widget geometry (`fireButton` and others, defined elsewhere), `ParseTeamCommand` (uCommands), the HUD health drawing in `hedgewars/uStats.pas` (667 lines, not read). Camera scope: not a camera cell.

## 1. Mechanism

A touch-button model where the finger owns the press, plus a tap versus long-press split on release.

- Touch down (`uTouch.pas` 89-206). Each finger is stored (`addFinger`, 369-400). Position is converted to cursor units (`convertToCursorX/Y`, 568-576). The order is: crosshair first (101-107: a touch in the 96-unit square around the crosshair starts aiming); then, in turn, fire (109-115), left and right (116-129), up and down (130-145; these also set the aim flags), pause (147-153), utility (155-169) and utility2 (171-189). A widget hit records itself on the finger (`pressedWidget`) and sends a press command (for example `+attack`, line 111). A utility or bounce press is handled in its own branch (157-188). If no widget was hit, `buttonsDown` goes back to zero and the cursor may move (191-205): one finger allows the cursor move (194-197, targeting only with a targetable ammo); two fingers stop the cursor and record the pinch baseline (199-202).
- Touch up (`onTouchUp`, 258-324). The finger's position is updated with zero delta (267). Then, in the donor's order: if the finger has not moved (272), a release within 200 ms (`clickTime`, 65, 274) runs `onTouchClick` (275), otherwise `onTouchLongClick` (277). Then the release uses the widget this finger pressed (288), not the widget under it now, and sends the matching release command (for example `-attack` at 306). Then the finger is removed.
- Moved test (`fingerHasMoved`, 611-614): the distance from the touch-down point must be greater than 30 for the finger to count as moved.
- Click (`onTouchClick`, 340-367): if the ammo menu is open, a tap inside its rectangle moves the cursor to the finger and sends `put` (345-349); a tap outside closes the menu (352). Otherwise a tap on the current hedgehog or on the ammo widget opens the menu (356-358); a tap on the jump widget sends `hjump` (362-364).
- Long click (`onTouchLongClick`, 331-338): a long press on the jump widget sends `ljump` (333-335). Any other long press does nothing.
- Pinch (`onTouchMotion`, 244-254): with two fingers and no widget held, the zoom follows the change in finger distance from the baseline taken at the second touch-down (201-202, 247-249), clamped to the zoomed-in and zoomed-out limits (250-253).
- Tick: event-driven. `ProcessTouch` (459-530) is a per-frame step (see section 6).

## 2. Key functions

- `onTouchDown` 89-206: the widget ladder, crosshair, pinch baseline and cursor move gate.
- `onTouchUp` 258-324: the click decision, then the widget release.
- `onTouchClick` 340-367 and `onTouchLongClick` 331-338: quick tap and slow press handlers.
- `onTouchMotion` 208-256: cursor move and pinch zoom.
- `fingerHasMoved` 611-614: the 30-unit slop.
- `addFinger` 369-400, `deleteFinger` 419-449: finger array, packed to the left on removal.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Quick unmoved release is a tap; slow unmoved release is a long press | 200 (theirs, `uTouch.pas` 65) |
| Moved means travel of more than the slop from touch-down | 30 (theirs, `uTouch.pas` 613) |
| Release goes to the widget the finger pressed | None (rule) |
| Touch hit square around the crosshair and widgets | 96 (theirs, `uTouch.pas` 67), game-screen units; device scaling not read |
| Pinch zoom clamp, mobile build | zoomed-in limit 0.5 (`cMaxZoomLevel`), zoomed-out limit 3.5 (`cMinZoomLevel`) (theirs, `uVariables.pas` 2755-2756, under `{$IFDEF MOBILE}` at 2754); desktop 1.0 and 3.0 (2760-2761). Lower value = closer view |
| Zoom range delta | zoomed-in limit minus zoomed-out limit (theirs, `uVariables.pas` 2932) |
| Aim angle scale | 2048 maximum (theirs, `uConsts.pas` 152) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (click decision first, then the release of the pressed widget) and the finger-owned release. It omits the widget ladder's special cases (crosshair start, aim flags, utility and bounce branches, the cursor move and pinch gates), the ammo menu, the jump widget's secondary commands, the per-frame aim servo (`ProcessTouch`), the finger array and its packing, and the double-click stub (empty in the donor, so there is nothing to port). Widget hit tests stand in for `isOnWidget` (which also checks that the widget is shown). Times are passed in as milliseconds.

```ts
// Licence: GPL-2.0 (donor uTouch.pas header: "version 2 of the License"). Clean-room: written from the described mechanism, not a translation of the donor lines.
export interface Widget {
  id: string;
  hit: (x: number, y: number) => boolean;  // hit test in screen units
  down: () => void;                        // press command, e.g. "+attack"
  up: () => void;                          // release command, e.g. "-attack"
}

export interface Finger {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startMs: number;
  moved: boolean;
  pressed: Widget | null;                  // the widget THIS finger pressed
}

// Donor clickTime = 200 with RealTicks (unit of RealTicks not read; taken as ms here).
export const CLICK_MS = 200;
// Donor fingerHasMoved: distance from the touch-down point greater than 30.
export const SLOP_PX = 30;

export function touchDown(f: Finger, widgets: Widget[], x: number, y: number, nowMs: number): void {
  f.x = x; f.y = y;
  f.startX = x; f.startY = y; f.startMs = nowMs;
  f.moved = false;
  const w = widgets.find(item => item.hit(x, y)) ?? null;
  f.pressed = w;
  if (w) w.down();
}

export function touchMove(f: Finger, x: number, y: number): void {
  f.x = x; f.y = y;
  if (Math.hypot(x - f.startX, y - f.startY) > SLOP_PX) f.moved = true;
}

// Returns 'tap', 'long' or null. Click classification runs first (donor order), then the release.
// The release goes to the widget this finger pressed, even if the finger has slid off it.
export function touchUp(f: Finger, nowMs: number): 'tap' | 'long' | null {
  let result: 'tap' | 'long' | null = null;
  if (!f.moved) result = nowMs - f.startMs < CLICK_MS ? 'tap' : 'long';
  if (f.pressed) {
    f.pressed.up();
    f.pressed = null;
  }
  return result;
}
export {};
```

Sketch check: copied to the VPS as `/tmp/HU018-hedgewars-touch-buttons.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`; exit 0.

## 5. Lands in

- TARGET `src/fight/touch-buttons.ts` (new): the finger-owned press and release for fight buttons (fire, dodge, jump), with the tap and long-press split on release. The widget geometry and the hit test stay in the client; the commands it emits go to the engine.
- Parity row 5 (controls/input). The on-screen layout and crosshair square would sit under row 14 (HUD) and are noted only.
- today: Frankendom's current touch handling was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0, "version 2 of the License" only; clean-room only).
- Brief rule served: client-only input; the engine validates every command the buttons send.

## 6. Gaps and risks

Donor defects (idea kept, each fixed where noted):

1. Aim servo release branch sets the down flag back to true (`uTouch.pas` 492, `aimingDown:= true;`) while its mirror at 501 clears it. This looks like a copy error: the release command is then re-sent every frame. Fix: clear the flag as the mirror does.
2. Aim angle mapping is not the inverse of the launch formula. `aim` sets `targetAngle` to 1024 times (1 + s), where s is the downward component of the normalised touch direction (`uTouch.pas` 557-560). The launch vector (`uWorld.pas` 1155-1156) has a horizontal share of sin(angle times pi over 2048) and a downward share of minus cos(angle times pi over 2048). With the donor's targetAngle, the downward share becomes sin(s times pi/2), where s = sin(phi) is the touch's downward component, so the launch elevation is (pi/2) times s. A touch 30 degrees below the horizon therefore launches about 45 degrees below (arithmetic from the read lines; the shot code was not read). Fix: use targetAngle = round(1024 times (1 + (2/pi) times asin(s))) with s clamped to -1..1; then the downward share is exactly s.
3. Aim dead band of plus or minus 5 index units (`uTouch.pas` 468). At the donor's scale this is about 0.44 degrees of launch angle (derived from the same two lines). Keep the idea (a dead band stops hold-key chatter); the value is data.
4. `onTouchDoubleClick` is an empty stub (`uTouch.pas` 326-329). Fix: remove it or implement it when Frankendom needs double tap.
5. A tap in the ammo fallback writes ammo ids to the console (`uTouch.pas` 317). An unknown finger id is written to the console on every move (415). Fix: gate both behind the debug flag.
6. The 200 ms tap window uses RealTicks, whose unit was not verified (the clock in the read path is the replay loop, `hwengine.pas` 340-362). Fix: state the unit in the data field and test it on a phone.

Per-frame step (`ProcessTouch`, 459-530): it compares the hedgehog's angle with `targetAngle` and holds or releases up and down commands; inside the dead band it releases both. The bounce "precise" mode is set on press (182-184) and released on the next processed frame, not on release (525-529). That is the only buffer-like behaviour here: a one-frame auto-release, not an input queue. Input buffer: none found in this path.

Rulings:

- The buttons only send commands (`+attack`, `ljump`, `hjump`, `put`) through `ParseTeamCommand` (not read). The engine must still decide the attack and any kill. The client never decides a kill.
- MAX_ATTACKERS = 3: nothing here chooses attackers. The crosshair is an aim device, not a lock-on.
- Zones as data: none in this path. The tap and slop numbers are device settings; the zoom limits are a mobile build switch, not zone data.
- Accessibility: nothing for reduced motion or large hit areas in this path (the hit square is fixed at 96).

Locale and string tables (fold-in), from `en.txt` and `uLocale.pas`:

- Entry grammar: `TT:II=text`, where TT is a two-digit table and II a two-digit id, with `=` at column six (`uLocale.pas` 88-101). Lines whose first character is not a digit are skipped (comments, blanks). Tables: 00 ammo names (62 lines), 01 messages (50), 02 event messages (991 lines over 18 event ids), 03 ammo captions (62), 04 ammo descriptions (62), 05 goals (23), 06 chat help (32).
- Counts of `en.txt` (grep): 1,342 lines in total; 1,282 entry lines; 36 comment lines (starting with `;`), 24 blank lines. The 1,282 entry lines hold 309 distinct keys; the 18 event keys (02:00 to 02:17) carry most of the lines (about 55 variants each).
- Placeholders: `%1` to `%7` (about 594 `%1` occurrences). Each placeholder is used once in order (`uLocale.pas` 146-147).
- Event variants: each event id holds a list of variant lines (`uLocale.pas` 117); one is picked at random when the event fires (139), with no weighting and no repeat check (not read; the code shows only the random index). An event with no variants shows a missing-translation text (137).
- Other locales: 119 entries in `Data/Locale` including `CMakeLists.txt` (`.txt`, `.lua`, and Qt `.ts` copies). Which file is loaded was not traced.
- Use the list in the donor's section comments: ammo descriptions use `|` as line breaks; chat lines use `%1` for the player and `%2` for the message.

Best transferable idea: Let a finger own its press, so a fight button stays held until that same finger lifts even after it slides off, and split a release into a tap (under 200 ms and 30 units of travel) or a long press that does the secondary action.

Decision (proposed): adapt — the finger-owned press and the tap or long-press split fit phone fight buttons (fire, dodge, jump); the crosshair aim servo has a copy error and an aim mapping that does not invert the launch formula, so it is not taken as written.
Acceptance: On a 375-wide phone, a finger that presses Attack keeps it held until that same finger lifts even if it slides off the button; a tap under 200 ms with under 30 px of travel targets an enemy, while a longer press on Jump does the long jump.

Reuse tag: rewrite-from-idea (GPL-2.0 "version 2 of the License" only; clean-room only).
Brief rule served: client-only input; the engine validates every command the buttons send.
