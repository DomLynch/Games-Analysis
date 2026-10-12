# Warzone2100-warzone2100 (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` (hint `src/display3d.cpp` was the wrong file: it renders the 3D scene; the minimap is in `radar.cpp`) | Licence: GNU GPL v2, "either version 2 of the License, or (at your option) any later version" (radar.cpp 6-9; `COPYING` is GPL-2.0) | C++ | symbol `setViewingWindow` (with `drawRadar`, `RotateVector2D`, `RadarWidget::mouseDragged`, `RadarWidget::released`)

Checked: `radar.cpp` read 1-158 (globals and colours), 208-402 (size, init, world-to-minimap position, driver), 682-800 (rotation, viewing window, extras), 801-818 (`CoordInRadar`), 831-986 (widget: drag, click, release). Constants read: `display.h` 234-238, `display.cpp` 1561-1562, `display3d.cpp` 255, 2516-2530, `display3ddef.h` 29-35, `radar.h` 38-39. Callers checked by grep: `setViewingWindow` is called only from `drawRadar` (radar.cpp:374); `drawRadar` only from `RadarWidget::display` (radar.cpp:891); `CalcRadarPosition` also from `keybind.cpp:2623` (grep only). Not read: `radar.cpp` 159-207 (blend helpers), 403-681 (north arrow, tile colours, `DrawRadarTiles`, `DrawRadarObjects`, overlay, so blip and hit-flash detail is not described), `pie_SetViewingWindow` and `pie_DrawViewingWindow` (lib/ivis_opengl), the pitch tracker at `display.cpp` 1561 (only its last two lines were read), and `setViewPos`. Confidence: high on the window geometry and its order of operations; high on the constants; medium on what `playerPos.p` is relative to the camera (not read). Strings: `po/` counted with grep (section 1). Not a camera cell (hud-ui), but the window reads the camera's distance and pitch, so section 6 says what transfers to a third-person camera.

## 1. Mechanism

- Driver, per call (`drawRadar`, 365-401): `setViewingWindow` runs first, every call (374), and caches `playerPos.p` (375). The tile layer, objects and overlay are rebuilt only when `frameSkip <= 0` (377-381); then `pie_DownLoadRadar` uploads the bitmap and `frameSkip` is set to `RADAR_FRAME_SKIP` (10, 63, 383). `frameSkip--` runs every call (385). So the static minimap layer refreshes every 10 calls, and the window moves every call.
- Rotation (386-398): when `rotateRadar` is on, the map is turned by the player's yaw (391). A zoom multiplier makes the larger map dimension fit the square widget (274). Zoom is clamped to 8-64 (radar.h 38-39; `SetRadarZoom`, 301-316).
- Window (`setViewingWindow`, 732-792), labelled "Myth/FF7 style viewing window" (731):
  1. `dif` = `getDistanceAdjust()` = `max(MAXDISTANCE - getViewDistance(), 0) / 100` (707-711; MAXDISTANCE 5000, display.h 238; the view distance is the stored `distance`, display3d.cpp 2516-2518). Integer division: steps of 100 units.
  2. `dif2` = `getLengthAdjust()`: `pitch = 360 - playerPos.r.x / DEG_1` (716), so the stored angle, clamped to 272-359 (display.cpp 1562), becomes 1-88 degrees below the horizon. `lookingDown` = 88 and `lookingFar` = 1 (719-720, from the pitch limits in display.h 234-235). `dif = clamp(pitch - 1, 0, 87)` (722-726), returned as `dif / 2` (728), so 0 to 43.
  3. Half-widths and reach in tiles, times the pixels per tile (744-747), with `visibleTiles` = 64 by 64 (display3d.cpp 255; display3ddef.h 29-30): near half-width `64/4 - dif/6`; far half-width `64/2 - dif/4`; vertical reach `64/2 - dif2/3` (used both up and down; the donor's `yDrop` and `yDropVar` are the same value).
  4. Four corners (749-759): far right and far left at the far reach above the centre, near right and near left at the same reach below it. Rotated about the centre by the player's yaw (764; `RotateVector2D`, 682-705: `x' = x*cos + y*sin`, `y' = y*cos - x*sin`, with fixed-point cos and sin).
  5. Colour by campaign (766-788): campaigns 1-2 white, 3 green-ish, others black, all at alpha 63 (0x3f). Handed to `pie_SetViewingWindow` (791) and drawn in `DrawRadarExtras` (794-797).
- What the numbers give: at a view distance of 5000 or more, the far half-width is 32 tiles (64 across) and the near half-width is 16 tiles (32 across). At a view distance of 1000 (`dif` = 40), the near half-width is `16 - 6` = 10 tiles and the far half-width is `32 - 10` = 22. At horizon pitch the vertical reach is 32 tiles each way; at 88 degrees it is 18 tiles each way (`64/2 - 14`). So the window is a shape, not a projection: it narrows with a closer camera and shortens with a steeper pitch, and its centre is the player's dot.
- Scroll: the centre is the player's position minus the scroll origin (761-762; `x` is `playerPos.p.x * pixSizeH / TILE_UNITS`, 741).
- Click and drag (widget, 846-974): a press becomes a drag only after moving more than 5 px (844, 862-863). While dragging, the pointer is converted to a tile (876) and the view is set to it (877); with Ctrl and Shift held the yaw is reset to zero (878-881). On release without a drag, the tile is taken from the press position (952-955); if `war_GetRadarJump()` is set the view jumps (959-962), otherwise it tracks there (967). Orders use the press position too (930-934); the select release also converts the press position (952-957).
- Strings (localisation): `po/` holds `warzone2100.pot` (the template) and 41 locale files, all gettext PO. The template has 3,939 non-empty `msgid` entries, 9 `msgid_plural` entries, 11 `msgctxt` entries, and 9 multi-line `msgid ""` blocks (one is the header). The template has one fuzzy flag; the 41 locale files have none. Plural rules are per language: `nplurals` is 1 (ja_JP), 2 (de, fr, bg, ca), 4 (cs, pl, ru) and 6 (ar_SA, with an expression that splits by n mod 100 bands). The plural expression sits in each file's `Plural-Forms` header (ar_SA line 13). Counts from grep; no string text quoted.

## 2. Key functions

- `setViewingWindow`: `radar.cpp` 732-792. The four corners, the colour, the handoff.
- `getDistanceAdjust`: 707-712. The distance term.
- `getLengthAdjust`: 714-729. The pitch term.
- `RotateVector2D`: 682-705. The rotation.
- `drawRadar`: 365-401. Order of the window, the frame-skipped layer, the rotation and the extras.
- `RadarWidget::mouseDragged`: 851-884. Drag threshold and pan.
- `RadarWidget::released`: 922-974. Press-position rule, jump or track.
- `CalcRadarPosition`: 331-363. Screen to tile, with rotation and clamp.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A footprint wedge drawn over the map from the camera's distance and pitch | Visible tiles 64 (theirs, display3ddef.h 29-30) |
| Distance term: shorter view distance narrows the wedge | Max distance 5000 (theirs, display.h 238); step 100 (theirs, radar.cpp 711) |
| Pitch term: steeper pitch shortens the reach | Pitch 1 to 88 degrees below the horizon (theirs, display.h 234-235; radar.cpp 716-728); divisor 3 (theirs, 746-747) |
| Static layer on a frame count, moving layer every call | 10 frames (theirs, radar.cpp 63) |
| Drag only past a small move | 5 px (theirs, radar.cpp 844) |
| Click acts on the press position | Rule (theirs, radar.cpp 930-934) |
| Zoom clamp | 8 to 64 (theirs, radar.h 38-39) |

## 4. TypeScript sketch

simplified: float maths, angles in radians, and the donor's fixed-point `iCos` and `iSin` replaced by `Math.cos` and `Math.sin` (the donor's `r.y` unit was not read). It omits the campaign colour, the scroll origin (the donor subtracts `scroll.minX`), the tile and blip drawing, the north arrow, the rotate-off branch, and the Ctrl-Shift yaw reset. It changes three things on purpose: float division instead of integer steps, a time-based refresh instead of a frame count (the donor's 10 frames run faster on a fast machine), and the 5 px threshold, which is kept as the mouse value and flagged in section 6 for touch.

```ts
// Minimap viewing window (the camera footprint on the map), shape only (clean-room, GPL-2.0-or-later).
// Returns the four corners in minimap pixels, centred on the player's dot and turned by the view yaw.
type Pt = { x: number; y: number };

const MAX_DISTANCE = 5000;   // theirs: display.h:238 (MAXDISTANCE)
const PITCH_NEAR = 1;        // theirs: display.h:234 (MAX_PLAYER_X_ANGLE -1): 1 degree below horizon
const PITCH_FAR = 88;        // theirs: display.h:235 (MIN_PLAYER_X_ANGLE -88): 88 degrees below horizon
const VISIBLE_TILES = 64;    // theirs: display3ddef.h:29-30

// theirs: radar.cpp:63 RADAR_FRAME_SKIP = 10 (frames, not seconds). Fixed here to a time step.
const REFRESH_S = 0.1;

export interface ViewInput {
  viewDistance: number;       // world units (theirs: getViewDistance, display3d.cpp:2516-2519)
  pitchBelowHorizon: number;  // degrees, 1..88 (theirs: 360 - r.x, radar.cpp:716; r.x clamped to 272..359, display.cpp:1562)
  yawRad: number;             // view yaw in radians (donor uses a fixed-point angle; RotateVector2D, radar.cpp:682-705)
  pixPerTile: number;         // minimap pixels per tile (theirs: CalcRadarPixelSize, radar.cpp:324-328)
  playerPx: Pt;               // the player's dot on the minimap, in pixels
}

// Float maths throughout. The donor divides by 100, 6, 4 and 3 with int math (radar.cpp:711, 744-747): fixed here.
export function viewingWindow(v: ViewInput): Pt[] {
  const distAdjust = Math.max(MAX_DISTANCE - v.viewDistance, 0) / 100;
  const lenAdjust = Math.min(Math.max(v.pitchBelowHorizon - PITCH_NEAR, 0), PITCH_FAR - PITCH_NEAR) / 2;

  const shortHalf = (VISIBLE_TILES / 4 - distAdjust / 6) * v.pixPerTile; // near edge half-width
  const longHalf = (VISIBLE_TILES / 2 - distAdjust / 4) * v.pixPerTile;  // far edge half-width
  const reach = (VISIBLE_TILES / 2 - lenAdjust / 3) * v.pixPerTile;      // up to the far edge, down to the near edge

  // Donor order: far right, far left, near left, near right (radar.cpp:749-759). Far edge is up (negative y).
  const local: Pt[] = [
    { x: longHalf, y: -reach },
    { x: -longHalf, y: -reach },
    { x: shortHalf, y: reach },
    { x: -shortHalf, y: reach },
  ];

  // Same rotation as RotateVector2D (radar.cpp:700-701): x' = x*c + y*s, y' = y*c - x*s.
  const c = Math.cos(v.yawRad);
  const s = Math.sin(v.yawRad);
  return local.map((p) => ({
    x: p.x * c + p.y * s + v.playerPx.x,
    y: p.y * c - p.x * s + v.playerPx.y,
  }));
}

// Refresh the static tile layer on a timer; the window itself is recomputed every frame.
export function shouldRefreshTiles(nowS: number, lastRefreshS: number): boolean {
  return nowS - lastRefreshS >= REFRESH_S;
}

// Touch and mouse: a press becomes a drag only after it moves more than 5 px (theirs: radar.cpp:844, 862-863).
// On release without a drag, the action uses the press position, not the release position (theirs: radar.cpp:930-934, 952-955).
export interface Press { startX: number; startY: number; dragging: boolean }

export function pointerMove(p: Press, x: number, y: number): "pan" | "wait" {
  if (!p.dragging && (Math.abs(x - p.startX) > 5 || Math.abs(y - p.startY) > 5)) {
    p.dragging = true;
  }
  return p.dragging ? "pan" : "wait";
}

export type Release = { action: "none" | "jump" | "pan-to"; x: number; y: number };

export function pointerUp(p: Press, jumpInstant: boolean): Release {
  if (p.dragging) return { action: "none", x: p.startX, y: p.startY };
  return { action: jumpInstant ? "jump" : "pan-to", x: p.startX, y: p.startY };
}

// Example: a 64-tile window at a 60 degree pitch, player at the centre of a 128 px map.
export function demo(): Pt[] {
  return viewingWindow({ viewDistance: 4000, pitchBelowHorizon: 60, yawRad: 0, pixPerTile: 2, playerPx: { x: 64, y: 64 } });
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud-minimap.ts` (proposed client module; not read in the repo), parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients). The window is a client view of the world the server already holds; it adds no rule and no server field.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. Take the shape (a wedge from distance and pitch, a two-speed refresh, a press-position rule); do not copy lines.
- Camera transfer (owner's concern, world camera): the window's centre is the player's dot, which is `playerPos.p` (radar.cpp 375). For an over-the-shoulder camera, the centre must be the camera's focus point on the ground, and the wedge should be read as "what the camera sees". The donor's wedge runs as far behind the centre as ahead of it (746-747 give the same reach for both edges). If the centre is the character rather than the camera's focus point, half of the wedge covers ground behind the character that the camera does not show. Fix: put the near edge at the focus point and let the wedge reach forward only. Not verified in the donor: whether `playerPos.p` is the camera focus or the eye.
- The distance and pitch terms use the camera's own values, so the wedge is a live readout of the camera. For Frankendom's world camera the same two inputs are needed (distance and pitch), and they must be the values the camera actually uses (the donor clamps pitch in three places: display.cpp 1562, keybind.cpp 1076-1082, warcam.cpp 878-880).
- Defects, each with its fix (the sketch has the first and third):
  1. Frame-counted refresh (radar.cpp 63, 377-385). The static tile layer updates every 10 frames, so it moves about 6 times a second at 60 fps and about 14 times at 144 fps. Fix: a timer (`REFRESH_S`).
  2. Integer division in the window (711, 728, 744-747). The distance term moves in 100-unit steps, and its two half-widths in 600- and 400-unit steps; the pitch term moves in 2-degree steps, and the reach in 6-degree steps. A view-distance change under 100 units does nothing. Fix: float maths.
  3. Naming trap (326-327): `SizeH` is the height ratio and is used for x. The two ratios are equal under uniform zoom (210-212 scale both sides by the same zoom), but truncation to `size_t` can make them differ by a pixel. Fix: one scale value, named for what it is.
  4. `yDropVar` and `yDrop` (746-747) hold the same value. Dead duplicate. No behaviour change.
  5. `pitch = 360 - r.x / DEG_1` (716) depends on the stored angle being in 272-359. Three clamps keep it there. If a fourth writer sets `r.x` outside the range, the pitch term clamps silently. Fix: assert the range in the camera code.
- Touch UX: the 5 px drag threshold (844) is a mouse value. On a phone at 375 wide a finger wanders more than that before a tap, so a tap would become a pan. Proposal (not donor): a larger threshold for touch, 10 px as a starting point, tuned on a device. The press-position rule (930-934, 952-955) is the part to keep: the order goes where the finger went down.
- Jump versus pan (959-967): the donor offers an instant jump (a setting) or a tracked pan. Frankendom should default to the pan, since an instant jump on a small screen loses the player's sense of place. Proposal, not donor.
- Not read: the blip and hit-flash drawing (`DrawRadarObjects`, 530-658, with `HIT_NOTIFICATION` at radar.cpp 62 and a blink interval of `GAME_TICKS_PER_SEC / 1` at 154-155); the tile colouring (408-497). Any claim about blips is not made here.
- Parity: the fight HUD (row 14) gets a wedge of "where the camera sees" on the zone map; the blip set and the hit flash are for a later read.

Best transferable idea: Draw the camera's footprint on the world map as a wedge whose width shrinks with a closer camera and whose reach shrinks with a steeper pitch, refreshed as a timed layer with the wedge redrawn every frame.

Decision (proposed): adapt - keep the wedge from distance and pitch and the two-speed refresh; fix the frame-count refresh, the integer steps, the symmetric reach, and use a larger touch drag threshold. Why: a zone world map that shows where the camera looks answers "where am I facing" without a rule change, but the donor's centre and symmetric reach fit a top-down RTS camera, not an over-the-shoulder one.

Acceptance: On the zone world map at 375 wide, a translucent wedge sits on the player's dot and shows the area the camera sees; it turns with the player's yaw, gets narrower when the camera is closer, and shortens when the camera pitches down; the tile layer redraws about ten times a second while the wedge moves every frame; a short finger press on the map moves the view to the press point and a press that moves past the touch threshold pans instead.
