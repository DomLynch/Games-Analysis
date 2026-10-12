# electronicarts-CnC_Remastered_Collection (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/RADAR.CPP` | Licence: GPL-3.0-or-later per the RADAR.CPP header (line 7), plus Electronic Arts "ADDITIONAL TERMS per GNU GPL Section 7" in `LICENSE.md` line 601 (no trademark or publicity rights; no claim of affiliation; modified versions must be marked). Class: copyleft. Clean-room, shape only. | C++ | symbol `RadarClass::TacticalClass::Action`

Checked: Hint file `TIBERIANDAWN/MENUS.CPP` is the main menu (`Do_Menu`, `Main_Menu`), not the HUD, so it was not used. Read in full: `RADAR.CPP` input and cursor path (`TacticalClass::Action` 1361-1529, `Click_In_Radar` 909-937, `Click_Cell_Calc` 957-968, `Zoom_Mode` 665-736, `AI` 1295-1341, `Radar_Activate` 212-306, `Radar_Cursor` 1115-1231 with the first part of its body). Read in part: `Set_Radar_Position` 1576-1640 (live branch to the blit); `RADAR.H` 113-139. Opened for callers and dead code: `DISPLAY.CPP` (967), `SIDEBAR.CPP` (grep only). String table: 785 distinct `TXT_*` IDs are `#define`d in the TIBERIANDAWN headers (`CONQUER.H` line 16 is the first); the English text bodies are not in this donor and were not located (not read). Not read: the live pixel draw path (`Draw_It` is inside `#if (0)`, lines 331-479, see section 6), `Confine_Rect`, `Set_Tactical_Position`, `Draw_Names`, `What_Action`, the caller and rate of `RadarClass::AI`. Confidence: high on the click, cursor and zoom mechanism; medium on what the on-screen radar looks like. Camera scope: not a camera cell (hud-ui). Depth: full for the input mechanism, thin for the radar drawing.

## 1. Mechanism

- The radar is a whole-zone overview in a fixed frame in the HUD. The player clicks it to move the main view. The same handler also turns a click into a unit order when a unit is selected.
- Hit test (`Click_In_Radar`, 909-937). A pointer goes through three outcomes: outside the frame returns 0 and falls through to the normal map (`Click_Cell_Calc` line 967); inside the frame but off the drawn map returns -1 and the handler sets the cursor to normal and does nothing else (1524-1525); on the drawn map returns 1 and the cell is the window origin plus the offset divided by `ZoomFactor` (926).
- Order for a left press with no unit selected (1492-1511):
  1. `Click_Cell_Calc` gives the cell (1496).
  2. The view's top-left is set to the cell minus half the view width and height (1500, 1502). The low edge is clamped to the map origin with `MAX` (1501, 1503). The high edge is not clamped here.
  3. `Set_Tactical_Position` moves the view (1506). The donor code shows no easing here (the function body was not read).
  4. The bracket pulse is set: `SpecialRadarFrame = 4` (1511).
- Pulse. `Radar_Cursor` draws the view rectangle as four corner brackets and outsets them by `SpecialRadarFrame` pixels (1176-1179). `AI` decrements the pulse once per call while it is non-zero (1300-1301). So the bracket starts 4 px outside the view rectangle and closes to 0 over 4 calls. The field is a 3-bit bit field (`RADAR.H` 139), so the maximum is 7.
- Zoom. A right press with no unit selected calls `Zoom_Mode(cell)` (1519). Unzoomed: `ZoomFactor` is the smaller of frame over map cells (681-683, integer division). Zoomed: `ZoomFactor` is 6 (687); visible cells are frame width over the zoom (688), clamped to 62 (695). The unused remainder is split in half to centre the map area (709-710). `Set_Radar_Position` picks the window: the live branch puts the window's top-left at the view cell (1587) and then keeps it on the map with `Confine_Rect` (1595). The centring formula (1584) is disabled by `#if(FALSE)` (1583).
- Unit selected (1427-1462). The click becomes an order: `What_Action` on the object or on the cell (1429, 1431). Only `ACTION_MOVE`, `ACTION_NOMOVE`, `ATTACK`, `ENTER`, `CAPTURE`, `SABOTAGE` are kept (1439-1443); anything else is cleared (1448). A left press then calls `Mouse_Left_Release` (1487). A right press calls `Mouse_Right_Press` (1470), not the zoom toggle.
- Power-up and power-down. `Radar_Activate` (212-306) sets state and starts an animation frame. `AI` steps the frame once per call (1312, 1321, 1331). First activation runs 0 to 22 (22 steps), then sets `DoesRadarExist` (1317). Re-activation runs 41 down to 22 (19 steps). Deactivation runs 22 up to 41 (19 steps). The constants are `RADAR_ACTIVATED_FRAME=22` (`RADAR.H` 113) and `MAX_RADAR_FRAMES = 41` (114). A comment says "Check goes here to see if there is enough power" (1308), but no check follows; nothing gates activation in this path.
- Tick: the frame and pulse steps run in `RadarClass::AI`. Its caller and tick rate were not read, so "one step per call" is the only timing claim made here.

## 2. Key functions

- `RadarClass::TacticalClass::Action`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/RADAR.CPP` 1361-1528. The input handler. Order: radar off returns false (1378); hit test (1406); no-selection branch with the tap-to-jump, pulse and zoom (1492-1519); selection branch with the order (1427-1487).
- `RadarClass::Click_In_Radar`: `RADAR.CPP` 909-937. Frame test (921), clickable map test (925), offset to cell (926).
- `RadarClass::Click_Cell_Calc`: `RADAR.CPP` 957-968. Wrapper: result 1 gives the cell, -1 gives -1, 0 falls to `DisplayClass::Click_Cell_Calc` (967).
- `RadarClass::Zoom_Mode`: `RADAR.CPP` 665-736. Unzoomed fit (681-683), zoomed 6 px per cell (687-689), clamp to 62 (695), centring (702-710), window (1 call to `Set_Radar_Position`, 1576).
- `RadarClass::AI`: `RADAR.CPP` 1295-1341. Pulse decrement (1300-1301) then activation step (1307-1333).
- `RadarClass::Radar_Activate`: `RADAR.CPP` 212-306. State switch for on, off and the two animation starts (244, 263).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Pointer to cell: window origin plus offset over zoom (integer division) | Unzoomed: min of frame over map cells (681-683, the map size is not read); zoomed: 6 (687, not receipted: the line has tabs) |
| Centre the view on the tapped cell: cell minus half the view, low edge clamped | Half of view size (1500, 1502); low clamp at the map origin (1501, 1503) |
| Visible cells capped | 62 cells (695) |
| Bracket pulse on a jump: starts at 4 px, closes 1 px per call | 4 (1511); decrement 1 per call (1301); bit field of 3 bits (`RADAR.H` 139) |
| Power-up / power-down animation | 22 open frame and 41 closed frame (`RADAR.H` 113-114); steps 22, 19, 19 (1312-1333) |
| Radar frame size in the low-resolution layout | 72 x 69 px (143-144); 128 x 128 px when the resolution factor is set (138-139) |

Constants come from the donor (theirs), with the receipts in `receipts.tsv`. The 6 is not receipted (the line has tabs); it is read from line 687 directly.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: hit test first (with both bounds checked), then centre on the clicked cell (both edges clamped), then the pulse, then one step of the animation per tick. It omits: the unit-selection branch (`What_Action` and the action filter), the right-press zoom toggle and most of `Zoom_Mode` (only the 62-cell cap is shown), the window placement in `Set_Radar_Position`, the cursor drawing, the mouse-shape override, `Radar_Activate`'s state machine and the `DoesRadarExist` flag, all radar drawing (the live path was not read), and `Draw_Names`. The sketch does not say what the caller does with `absorb` (the caller was not read).

```ts
// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const PULSE_START_PX = 4;        // donor: Map.SpecialRadarFrame = 4 (RADAR.CPP line 1511)
const ZOOMED_PX_PER_CELL = 6;    // donor: ZoomFactor = 6 (RADAR.CPP line 687)
const ZOOM_MAX_CELLS = 62;       // donor clamp on visible cells (RADAR.CPP line 695)
const ACTIVE_FRAME = 22;         // donor RADAR_ACTIVATED_FRAME (RADAR.H line 113)
const CLOSED_FRAME = 41;         // donor MAX_RADAR_FRAMES (RADAR.H line 114)

interface Cell { cx: number; cy: number; }

interface Minimap {
  frameW: number; frameH: number;        // minimap frame in px (donor RadIWidth, RadIHeight)
  insetX: number; insetY: number;        // map inset inside the frame, px (donor BaseX, BaseY)
  mapPxW: number; mapPxH: number;        // drawn map area, px (donor RadarWidth, RadarHeight)
  zoomPx: number;                        // px per map cell (donor ZoomFactor)
  windowX: number; windowY: number;      // top-left cell of the drawn window (donor RadarX, RadarY)
  mapW: number; mapH: number;            // whole zone, in cells
  viewW: number; viewH: number;          // tactical view, in cells
  viewX: number; viewY: number;          // tactical view top-left, in cells
  pulse: number;                         // bracket outset, px; counts down once per logic tick
  frame: number;                         // power animation frame, steps once per logic tick
}

type Hit = { kind: "miss" } | { kind: "absorb" } | { kind: "cell"; cell: Cell };

// Pointer px, relative to the frame's top-left -> hit.
// Donor: Click_In_Radar (RADAR.CPP lines 909-937). Fix: the donor tests only the upper bound on the
// frame (x < RadIWidth), so a point left of or above the frame passes that test; here both bounds are checked.
function hitTest(m: Minimap, px: number, py: number): Hit {
  if (px < 0 || py < 0 || px >= m.frameW || py >= m.frameH) return { kind: "miss" };
  const x = px - m.insetX;
  const y = py - m.insetY;
  // Inside the frame but off the drawn map: swallowed (donor returns -1, RADAR.CPP line 934).
  if (x < 0 || y < 0 || x >= m.mapPxW || y >= m.mapPxH) return { kind: "absorb" };
  return {
    kind: "cell",
    cell: { cx: m.windowX + Math.floor(x / m.zoomPx), cy: m.windowY + Math.floor(y / m.zoomPx) },
  };
}

// Jump the tactical view to a clicked cell (donor: TacticalClass::Action, no unit selected, RADAR.CPP lines 1494-1511).
// Donor subtracts half the view and clamps only the low edge; here the high edge is clamped too (fix).
function jumpTo(m: Minimap, c: Cell): void {
  let vx = c.cx - Math.floor(m.viewW / 2);
  let vy = c.cy - Math.floor(m.viewH / 2);
  vx = Math.min(Math.max(vx, 0), m.mapW - m.viewW);
  vy = Math.min(Math.max(vy, 0), m.mapH - m.viewH);
  m.viewX = vx;
  m.viewY = vy;
  m.pulse = PULSE_START_PX;
}

// Zoom factor for the window (donor: Zoom_Mode, RADAR.CPP lines 665-716, simplified; the 62-cell clamp is shown).
function visibleCells(frameW: number, zoomPx: number): number {
  return Math.min(Math.floor(frameW / zoomPx), ZOOM_MAX_CELLS);
}

// One logic tick (donor: RadarClass::AI, RADAR.CPP lines 1300-1301 for the pulse and 1311-1333 for the power animation).
// The animation steps one frame per tick toward its target; the caller supplies the target (ACTIVE_FRAME or CLOSED_FRAME).
function tick(m: Minimap, animTarget: number): void {
  if (m.pulse > 0) m.pulse -= 1;
  if (m.frame < animTarget) m.frame += 1;
  else if (m.frame > animTarget) m.frame -= 1;
}

export {};
```

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path, not checked against the repo). Client only: the HUD is client-only by ruling; the engine never reads it. Parity-checklist row 14 (HUD). Tap-to-jump is also a touch input (row 5), but one row only is named here.
- today: no zone minimap in Frankendom was checked.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
- Brief rule served: client-only HUD (the camera, HUD and sound are client-only); map size comes from zone data

Best transferable idea: On a minimap tap, centre the main view on the tapped point (clamped at both zone edges) and show a 4-px bracket around the new view that closes over 4 frames.
Decision (proposed): adapt — take the tap-to-jump and the bracket pulse for the zone minimap; fix the bounds in the hit test and the height; do not port the unit-order branch, because a minimap order must go through the server, not the client map.
Acceptance: On a 375-px phone, tapping the zone minimap centres the view on the tapped point inside the zone; a bracket around the view starts 4 px larger and settles over 4 frames; a tap outside the minimap frame does nothing; a client test asserts a point left of the frame is a miss, not a cell.

## 6. Gaps and risks

- Defect 1, hit test has no lower bound (921). Fix: test both bounds before subtracting the inset (sketch `hitTest`). Caveat: I read the code, I did not run it. `DISPLAY.CPP` 967 calls `Click_Cell_Calc` virtually, so the donor's tactical-map click may use this path; the calling function was not read, so the runtime effect is unconfirmed.
- Defect 2, radar height uses the width (714: `RadarHeight = RadIWidth - rem_y`). In the low-resolution layout the frame is 72 wide and 69 high (143-144), so the clickable height is 3 px too tall. Fix: use `RadIHeight`.
- Defect 3, the zoomed window is not centred: the centring formula is behind `#if(FALSE)` (1583-1584). This looks like a regression. Fix: restore the centred formula and keep the `Confine_Rect` clamp (1595). Caveat: `Confine_Rect` was not read.
- Defect 4, frame counts (4, 22, 41) are ticks of the caller's rate, which was not read. Fix: store the pulse and the animation in milliseconds and advance by delta time, so the timing does not depend on frame rate.
- Dead code: `Draw_It` is inside `#if (0)` (331-479) and the comment says "Legacy radar rendering not used". The live pixel-draw path was not found in `RADAR.CPP`. Nothing to port for drawing.
- Gap, power: the donor has a comment for a power check (1308) and no check. Do not port the comment as a rule.
- Ruling conflict, unit orders: the selection branch (1427-1487) turns a minimap click into a move or attack order. Frankendom's rulings say kills are server-verified and engage is a state change. A minimap order must be a server command, never a local move on the map.
- Camera: a tap jumps the view at once (the donor sets the position immediately; `Set_Tactical_Position` was not read). Under the world camera's smoothing, the jump needs its own short lerp, or the view will cut. The owner's world camera is the one being improved, so do not let the minimap cut it.
- Readability at 375 wide: the donor frame is 72 by 69 px at low resolution. A phone tap target that small is not usable without scaling. Not checked for Frankendom.
- Accessibility: a tap that misses the map inside the frame does nothing (absorb). That is the right default for touch misses. The donor only resets the cursor shape, so the no-op is the whole behaviour.
- Not read: `Set_Tactical_Position`, `Confine_Rect`, `Draw_Names`, `What_Action`, `Mouse_Left_Release`, the live radar pixel draw path, the caller of `RadarClass::AI`.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
Brief rule served: client-only HUD; zones as data (map size per zone)
