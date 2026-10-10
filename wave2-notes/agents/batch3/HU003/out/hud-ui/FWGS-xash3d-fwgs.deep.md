# FWGS-xash3d-fwgs (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/input/in_touch.c` | Licence: GPL-3.0-or-later per the file header (lines 5-7: "either version 3 of the License, or (at your option) any later version"); no LICENSE file at the donor root or in engine/ | C | symbols `Touch_ButtonPress` (1735), `Touch_Motion` (1630), `IN_TouchEvent` (2036), `Touch_DrawButtons` (1351)

Checked: Confidence high for the touch press, motion, release and fade paths, which I read in full: `Touch_ButtonPress` (1735-1951), `Touch_Motion` (1630-1733), `Touch_ControlsEvent` (2019-2034), `IN_TouchEvent` (2036-2162), `Touch_GetMove` (2164-2171), `Touch_DrawButtons` (starts 1351; fade lines 1363-1371 read), `Touch_IsVisible` (1191-1215), `IN_TouchCheckCoords` (starts 1243; clamp and snap bodies read), `Touch_AddButton` (801-834), `Touch_AspectRatio` (186-199), and the CVAR block (145-166). Not read: `Touch_Draw` (1459-1561), the editor functions `Touch_EditMove` (1577) and `Touch_ButtonEdit` (1953-2018), `Touch_InitConfig` and the profile loader (1162-1190), the default button list (850-912), the nonlinear look curve lines (1703-1718, read but not receipted). The client DLL side of `pfnTouchEvent` is not in this donor. Candidates opened first: `engine/client/input/in_touch.c` (the real touch system), `engine/client/titles.c` (the HUD text-message parser), `engine/client/vgui_draw.c` (the hint file: a VGUI draw helper, opened at its header and includes only, so it is not the HUD mechanism). Camera: not a camera cell; the look-curve note in section 6 is for the camera owner.

## 1. Mechanism

- Order for one touch event. `IN_TouchEvent` (2036) first swaps axes for rotated displays, then handles cinematics, the console and menu mouse simulation, and VGUI. Then it scales y by height / width / aspect (2156), so the buttons stay square on a phone. Then it offers the event to the client DLL (`pfnTouchEvent`, 2158); if the DLL does not take it, `Touch_ControlsEvent` (2019) runs.
- `Touch_ControlsEvent` (2019-2034) gives the event to `Touch_ButtonPress` (2029). A motion event goes to `Touch_Motion` only when no button took it. `Touch_ButtonPress` returns false for anything other than touch down and touch up (1740).
- Touch down (1735-1950): the button list is walked from the front-most button to the back (1743). Invisible buttons are skipped (Touch_IsVisible). A button is hit when the point is inside its rectangle (1752). The finger id is stored on the button (1755). Then by type:
  - command: runs the command text now; a `+` command is later paired with a `-` command on release (1903-1910). Unprivileged buttons use the filtered command buffer (1763-1765).
  - wheel: records the wheel finger and the up, down and end commands (1780 area).
  - move, joy, dpad: if a move finger already exists, the new button is given that finger id and skipped (1803-1807). Otherwise the move finger is set. A floating move starts at the first touch point (1837). A joy or dpad starts at the button centre (1843-1844), and its forward and side are computed at touch down (1847-1848), with dpad rounding them to -1, 0 or 1 (1853).
  - look: the look finger is taken (1888). If a look finger already exists, the new button is given that finger id and skipped (1861-1866). If the touch's finger already holds move, both move and look are cleared and the touch takes no look (recovery branch starting at 1871, read). A move button pressed by the look finger clears both as well (recovery branch starting at 1813, read).
- Touch up (1895-1950): only the finger that owns a button releases it. A `+` command runs its `-` partner (1903-1910). A move release zeroes forward and side and clears the move finger (1940-1941). A look release clears the look finger (1946).
- Motion (1630-1733): wheel travel accumulates, and each 0.1 of normalised travel is one wheel step (1635-1637). For the move finger: a floating move gives forward = (start y - y) / forward zone and side = (x - start x) / side zone (1669-1670), clamped to -1..1. A joy gives the offset from the centre over the half size, times the joy radius (1680). A dpad gives the same offset times the dpad radius, rounded (1686). For the look finger: deltas are scaled by the precision factor when a precision button is held (1700), optionally passed through a nonlinear curve (1703-1718, read), then yaw -= dx x yaw sensitivity and pitch += dy x pitch sensitivity (1730-1731).
- Game side: `Touch_GetMove` (2164) adds move values and look deltas into the game's inputs, then clears yaw and pitch (2170).
- Drawing (1351): each visible button's alpha is its colour alpha times its fade. The fade advances by frame time (1363) and is clamped to 0..1 (1364); it stops at its end value (1368-1371). Pressed non-client buttons are tinted by the highlight CVARs (the tint block sits just before the alpha line at 1383; read, not receipted). `Touch_IsVisible` (1191) hides a button by flag (hidden, multiplayer-only in single player, singleplayer-only in multiplayer, client-only), but everything is shown in edit state (1196).
- Layout (1243): each side is at least two grid cells (1246-1247). A box that goes past an edge is pushed back inside by translation, keeping its size (x edge 1252-1254; y edge from 1264, read). Then it is snapped to the grid when `touch_grid_enable` is on. The grid is `max(touch_grid_count, 1)` cells (1229), 50 by default (154).
- Profiles: buttons live in a profile file named by `touch_config_file`, default `touch.cfg` (156). Buttons added from scripts are client-only and unprivileged (819).

## 2. Key functions

- `IN_TouchEvent` (`in_touch.c` 2036-2162): the order of checks, aspect scale at 2156, DLL hook at 2158, then `Touch_ControlsEvent`.
- `Touch_ControlsEvent` (`in_touch.c` 2019-2034): edit state, then the button press, then motion.
- `Touch_ButtonPress` (`in_touch.c` 1735-1951): ownership and the per-type start and release rules; the loop at 1743 has no break (checked by reading the whole range).
- `Touch_Motion` (`in_touch.c` 1630-1733): the wheel step, move and look maths.
- `Touch_GetMove` (`in_touch.c` 2164-2171): the once-per-frame handoff.
- `Touch_DrawButtons` (`in_touch.c` from 1351): the fade (1363-1371) and the tint.
- `IN_TouchCheckCoords` (`in_touch.c` from 1243): minimum size, push-in, grid snap.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Joy offset from button centre over half size | (centre - touch) / half size (1847 start; motion at the joy branch 1678-1680) |
| Joy radius | 1.0 default (163) |
| Dpad rounding to -1, 0, 1 | round() of offset x dpad radius (1686, 1853); dpad radius 1.0 (162) |
| Floating move zones | forward 0.06 (146), side 0.06 (147); written to 0.5 and 0.3 when zero (1663, 1666) |
| Wheel step | 0.1 normalised travel (1637) |
| Look sensitivity | yaw 120 (149), pitch 90 (148) |
| Precision look | factor 0.5 (157) |
| Fade speed | per-button, times frame time (1363), clamped to 0..1 (1364) |
| Grid | count 50 (154), at least 1 (1229), minimum button size 2 cells (1246) |
| Aspect | y scaled by height / width / aspect (2156) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's ownership rules: the front-most hit wins, a joy or dpad starts at touch down from its centre offset, a second move finger is refused without changing the owner, only the owner releases, and look deltas are accumulated and taken once per frame. It changes three things on purpose: the search stops at the first hit (the donor walks the whole list), the zone sizes are one shared unit (the donor scales y by aspect and x not), and a refused second finger leaves the owner unchanged (the donor writes the first finger id onto the refused button). It omits the command and wheel behaviour (the sketch returns the button and the caller runs the command), precision mode, the nonlinear look curve, the editor, grid snapping, aspect scaling (input is assumed to be in one unit), visibility flags, the fade, and the `+`/`-` command pairing.

```ts
// Licence of donor: GPL-3.0-or-later (in_touch.c header). Clean-room: sketch written from the described mechanism, not a translation.
// Client input only: the output is a forward/side move vector and look deltas for the game to send as intent.

type Kind = "floatMove" | "joy" | "dpad" | "look" | "command";

interface Rect { x1: number; y1: number; x2: number; y2: number; }

interface Button {
  name: string;
  kind: Kind;
  rect: Rect;          // normalised screen units (0..1), already grid-snapped by the layout tool
  finger: number;      // id of the finger holding this button, -1 when free
}

interface Pad {
  buttons: Button[];   // list order: the last entry is the front-most
  moveFinger: number;
  moveButton: Button | null;
  moveStart: { x: number; y: number };
  lookFinger: number;
  forward: number;     // -1..1
  side: number;        // -1..1
  yaw: number;         // accumulated look deltas, taken once per frame
  pitch: number;
}

// Data: one shared unit for both floating-zone sizes, joy and dpad radii, look sensitivities.
interface PadData {
  zoneForward: number;
  zoneSide: number;
  joyRadius: number;
  dpadRadius: number;
  yawSens: number;
  pitchSens: number;
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

// C-style round: halves go away from zero.
const roundAway = (v: number): number => (v < 0 ? -Math.round(-v) : Math.round(v));

function hit(b: Button, x: number, y: number): boolean {
  return x >= b.rect.x1 && x <= b.rect.x2 && y >= b.rect.y1 && y <= b.rect.y2;
}

// Joy and dpad: the offset from the button centre, normalised by its half size.
function applyJoyOrDpad(p: Pad, b: Button, x: number, y: number, d: PadData): void {
  const hw = (b.rect.x2 - b.rect.x1) / 2;
  const hh = (b.rect.y2 - b.rect.y1) / 2;
  const cx = (b.rect.x1 + b.rect.x2) / 2;
  const cy = (b.rect.y1 + b.rect.y2) / 2;
  let f = (cy - y) / hh;
  let s = (x - cx) / hw;
  if (b.kind === "joy") {
    f *= d.joyRadius;
    s *= d.joyRadius;
  } else {
    f = roundAway(f * d.dpadRadius);
    s = roundAway(s * d.dpadRadius);
  }
  p.forward = clamp1(f);
  p.side = clamp1(s);
}

// Floating move: offset from where the thumb first touched the zone.
function applyFloat(p: Pad, x: number, y: number, d: PadData): void {
  p.forward = clamp1((p.moveStart.y - y) / d.zoneForward);
  p.side = clamp1((x - p.moveStart.x) / d.zoneSide);
}

// Touch down: the front-most hit wins and the search stops there.
// Returns the button that took the touch, or null.
function touchDown(p: Pad, finger: number, x: number, y: number, d: PadData): Button | null {
  for (let i = p.buttons.length - 1; i >= 0; i--) {
    const b = p.buttons[i];
    if (!hit(b, x, y)) continue;

    if (b.kind === "floatMove" || b.kind === "joy" || b.kind === "dpad") {
      // A second move finger is refused; the first finger keeps the move and no owner changes.
      if (p.moveFinger !== -1) return null;
      b.finger = finger;
      p.moveFinger = finger;
      p.moveButton = b;
      if (b.kind === "floatMove") {
        p.moveStart = { x, y };
        p.forward = 0;
        p.side = 0;
      } else {
        p.moveStart = { x: (b.rect.x1 + b.rect.x2) / 2, y: (b.rect.y1 + b.rect.y2) / 2 };
        applyJoyOrDpad(p, b, x, y, d);   // the move starts at touch down, not on the first motion
      }
      return b;
    }

    if (b.kind === "look") {
      if (p.lookFinger !== -1) return null;
      b.finger = finger;
      p.lookFinger = finger;
      return b;
    }

    // command: the caller runs its command; the pad only records the owner.
    b.finger = finger;
    return b;
  }
  return null;
}

// Motion: move from the owning move finger, look from the owning look finger.
function touchMotion(p: Pad, finger: number, x: number, y: number, dx: number, dy: number, d: PadData): void {
  if (finger === p.moveFinger && p.moveButton) {
    if (p.moveButton.kind === "floatMove") applyFloat(p, x, y, d);
    else applyJoyOrDpad(p, p.moveButton, x, y, d);
  }
  if (finger === p.lookFinger) {
    p.yaw -= dx * d.yawSens;
    p.pitch += dy * d.pitchSens;
  }
}

// Touch up: only the owning finger releases a button.
function touchUp(p: Pad, finger: number): void {
  for (const b of p.buttons) {
    if (b.finger !== finger) continue;
    b.finger = -1;
    if (b.kind === "look") p.lookFinger = -1;
    if (b === p.moveButton) {
      p.moveFinger = -1;
      p.moveButton = null;
      p.forward = 0;
      p.side = 0;
    }
  }
}

// Once per frame: take the look deltas and clear them.
function takeLook(p: Pad): { yaw: number; pitch: number } {
  const out = { yaw: p.yaw, pitch: p.pitch };
  p.yaw = 0;
  p.pitch = 0;
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hu003-fwgs-touch-pad.ts`).

## 5. Lands in

TARGET `src/fight/touch-input.ts` (new client input module: turns touch events into move and look intent; the fight step receives intent only). Parity-checklist row 5 (controls / input). The overlay layout and fade are a smaller HUD fold-in under row 14; the hint row 14 is covered by this note only for the overlay.

Best transferable idea: a touch pad where each button owns the finger that pressed it, the joy and dpad start moving at touch down from the button centre, and only the owning finger can release it.

Decision (proposed): adapt. The ownership and start-at-touch-down rules are what a phone fight needs; the client sends intent and the server still decides, so this does not touch the one ledger. Adapt the defects: first hit wins, zones in one unit, no CVAR writes on the event path, a refused second thumb changes no owner.

Acceptance: on a 375-px phone, a thumb on the dpad moves the hero in the same frame (no wait for the first motion), a second thumb on the move zone does nothing, and lifting the first thumb stops the move; a client test asserts that a refused move finger leaves the owner of the first move button unchanged, and that one touch fires only one button.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later donor; clean-room sketch from the mechanism)
Brief rule served: 5 (controls and input are a client view of the one engine); the addendum rule to keep the idea and fix the defect.

## 6. Gaps and risks

- Defect (overlap), fix: the press loop at 1743 has no break, so a touch on overlapping visible buttons fires every one of them (I read the whole range 1735-1950; no break). Fix: stop at the first hit unless a button is flagged to overlap (the sketch stops).
- Defect (refused finger), fix: a second move finger is refused but the donor writes the first finger id onto the refused button (1807). Fix: leave its owner alone (the sketch does).
- Defect (units), fix: y is scaled by aspect before dispatch (2156) and x is not, so the forward zone (in y units) and the side zone (in x units) are different physical distances on a non-square screen. Fix: one shared unit (the sketch assumes one).
- Defect (event-path writes), fix: a zero zone is rewritten through `Cvar_DirectSet` inside the move handler to 0.5 (1663) or 0.3 (1666), which do not match the declared defaults of 0.06 (146-147). Fix: validate zones at load, one default, no writes in the event path.
- Defect (inline constant), fix: the wheel step 0.1 (1637) is a constant in code. Fix: a data field.
- Seen, for the camera owner, not adopted here: the look path can pass deltas through an exponential and a power curve that keeps the direction and reshapes speed (1703-1718, read, not receipted), switched by `touch_nonlinear_look` (150). This is camera input, not HUD; it is relevant to the world camera ruling and should be judged there.
- Seen: `titles.c` parses a HUD message file of blocks. A message is the non-directive line before a `{` ... `}` block; the text is copied verbatim (165, 189). Directives (`$fadein`, `$fadeout`, `$holdtime`, `$effect`, `$fxtime`, `$position`, `$color`, `$color2`) set a single global defaults record (gMessageParms, declared at 20), and every message copies that record when its block closes (193). Nothing resets it, so a directive is sticky for every later message in the file (grep for gMessageParms in titles.c shows no reset). Fix: scope directives to one message. Units of `$holdtime` and the meaning of `$effect` are not stated here (the renderer was not read). The parser does not look up keys in other languages (read 114-216; no lookup).
- String table: no `titles.txt` or other locale file ships in this donor (grep of engine and game_launch for `titles.txt` found only code references). So there is no grammar to count in this donor; the message format above is the only string grammar here.
- Minimap and world map: a grep for minimap, radar and world map in the client code found no map UI. Hits in server and parse files were not read as HUD.
- Input buffer and lock-on forgiveness: none found in the touch path (the press is immediate, with no buffer and no snap to a target); not searched further.
- Accessibility: the highlight tint for pressed buttons is a CVAR (touch_highlight_r/g/b/a, 158-161, read, not receipted). No other accessibility option read.
- Gap against Frankendom: the donor's buttons run text commands directly. Frankendom must send intent into the fight step (engage is a state change; the server verifies). The `+`/`-` command pairing is the right shape for hold-to-guard, sent as intent on press and cancelled by the owning finger on release.
- Gap against Frankendom (MAX_ATTACKERS = 3): the donor's touch model has one move finger and one look finger. That is enough for one player, not for a three-attacker fight that needs target switching by touch; no target-select touch mechanism was found.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room sketch from the mechanism)
Brief rule served: 5 (controls, client-only input); idea kept, defects fixed in the sketch (addendum rule, 2026-10-10)
