# Warzone2100-warzone2100 (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` | Licence: GPL-2.0-or-later (src/radar.cpp header lines 8-9: "either version 2 of the License, or ... any later version"; COPYING is GPL v2) | C++ | symbol `setViewingWindow` (minimap; `DrawRadarObjects` and `CalcRadarPosition` are the other key functions)

Checked: Minimap only. The donor has no town, road, building, landmark or signage grammar. Greps for landmark, town, city, village, settlement, signage, road, street, building and hub across lib/wzmaplib, src, lib and the map scripts under data/mp/multiplay/maps found no settlement code (the lib/wzmaplib hits were false matches, for example "capacity" contains "city"). The map scripts contain maze and terrain generation (2c-DustyMaze, 6c-Entropy); only grep hits were read there, not whole scripts. Read in full: radarSize (208-232), resizeRadar (258-285), CalcRadarPixelSize (324-328), CalcRadarPosition (331-363), drawRadar (365-401), DrawRadarObjects (530-657), applyMinimapOverlay (659-679), RotateVector2D (682-705), getDistanceAdjust (707-712), getLengthAdjust (714-729), setViewingWindow (732-792), RadarWidget clicked and released (900-974). Not read: the drag path in RadarWidget::mouseDragged (about 851-886), appliedRadarColour (408-497), DrawRadarTiles body beyond its loop, visibleForLocalDisplay(), getViewDistance(), where visibleTiles is set, Vector2f_Rotate2f, war_GetRadarJump, pie_SetViewingWindow and pie_DrawViewingWindow, drawRadarBlips (src/intdisplay.cpp). camera_scope: n/a (this is a HUD minimap, not a camera cell; the viewing window reads the camera's view distance and pitch). Confidence: high on the draw, blink and click logic; medium on the viewing-window geometry (every formula read, but not the source of visibleTiles or the draw call).

Best transferable idea: Draw the minimap as one pixel per tile fitted to a fixed box, show only what the player can see, flash the player's own unit for two seconds after a hit, and draw the camera footprint as a trapezoid turned by yaw.
Decision (proposed): adapt - keep the footprint, the fixed box and the hit flash; move the visibility filter onto the server snapshot (per-player view) and drive blink from the game tick, not a draw-pass timer (the donor's defect, fixed in the sketch).
Acceptance: In a zone fight a player sees a 128 px minimap with dots for enemies inside aggro range, their own dot flashes for 2 s after a hit, a selected ally dot dims for half of each 1 s cycle, and the trapezoid turns with the camera; a server test asserts the snapshot sent to a player holds no entity outside that player's view range.

## 1. Mechanism

- Scale. Zoom in pixels per tile is `ZoomLevel * RadarZoomMultiplier / 16` (radarSize, 210). When the minimap rotates with the player, the multiplier is `max(RADWIDTH, RADHEIGHT) / max(radarTexWidth, radarTexHeight, 1)` (resizeRadar, 270-275), where the texture size is the scroll-window size, not the full map, so at zoom level 16 the whole map fits the 128 px box (RADWIDTH = 128, `src/display3ddef.h` line 34; no receipt, the line has tab separators). Unrotated, the multiplier is 1.
- Redraw cadence. drawRadar calls setViewingWindow every frame (before the gate). It rebuilds the tile, object and overlay texture only when `frameSkip <= 0` (377), then sets `frameSkip = RADAR_FRAME_SKIP` (383), where `RADAR_FRAME_SKIP` is 10 (line 63). So the texture is rebuilt about every tenth frame.
- Pass 1, tiles: DrawRadarTiles writes one pixel per tile. Border tiles are black; other tiles take `appliedRadarColour` (not read).
- Pass 2, objects: DrawRadarObjects clears the overlay buffer and computes `blinkState = (gameTime - lastBlink) / BLINK_HALF_INTERVAL` (536). The division is integer, so the bool is false for the first 500 ticks of a period and true after. For each player clan, a droid is drawn only if `visibleForLocalDisplay()` or allied shared vision applies (571). Colour is own (`colRadarMe`), ally or enemy when `bEnemyAllyRadarColor` is set, otherwise the 8-colour clan palette. A droid of the selected player hit within `HIT_NOTIFICATION` (2000 ticks, line 62) is drawn in the flash colour (580). A selected droid is drawn at alpha 0.5 while `blinkState` is false (582). Structures follow the same rule per tile, with one structure per tile (gate at 634, colour writes at 640-647).
- Blink timer. After the object pass, `if (gameTime - lastBlink >= BLINK_INTERVAL) lastBlink = gameTime;` (655-656). The timer is reset only on frames where the object pass runs, so the blink period follows the redraw cadence and the frame timing, not the game clock.
- Overlay blend. applyMinimapOverlay (659-680) mixes each non-zero overlay pixel over the tile colour.
- Viewing window. setViewingWindow (732-792) builds the camera footprint as four points. Two widths come from `visibleTiles.x` and the view-distance adjust (`shortX` at 744, `longX` similarly). One height comes from `visibleTiles.y` and the pitch adjust. The points are rotated by the player's yaw with RotateVector2D (764), a fixed-point cos and sin rotation (700-701). The distance adjust is `MAXDISTANCE` (5000, `src/display.h` line 238) minus the view distance, floored at 0, divided by 100 (getDistanceAdjust, 707). The pitch adjust clamps the pitch term to a range set by `MAX_PLAYER_X_ANGLE` (-1, display.h line 234) and `MIN_PLAYER_X_ANGLE` (-88, display.h line 235), then halves it (getLengthAdjust, 714-729).
- Input. A select click on the minimap goes to CalcRadarPosition (331-363): it subtracts the radar centre (`radarCenterX/Y`), undoes the yaw when rotating, adds half the radar width/height, divides by the pixel size, adds the scroll minimum, and clamps to the scroll window. Then, if `war_GetRadarJump()` is set, the view jumps (`setViewPos`, 962), otherwise it pans (`requestRadarTrack`, 967). The order click (`WKEY_ORDER`; the mouse button was not checked) sends selected droids to the tile centre, with a queued order when the ctrl and shift keys are held (941-942).

## 2. Key functions

- `DrawRadarObjects`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` 530-657. Visibility gate, colour choice, hit flash, selected dim, blink timer reset.
- `drawRadar`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` 365-401 (frame gate at 377, reset at 383).
- `setViewingWindow`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` 732-792. Camera footprint.
- `getDistanceAdjust` 707 and `getLengthAdjust` 714, `RotateVector2D` 682: the footprint adjusts and rotation.
- `CalcRadarPosition`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` 331. Click to tile.
- `RadarWidget::released`: `/mnt/frankendom-donors/Warzone2100-warzone2100/src/radar.cpp` 922-974. Order and pan or jump.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fit the map to a fixed box: pixels per tile = zoom x (box / larger side) / 16 | Box 128 (RADWIDTH, display3ddef.h:34); divisor 16 (radar.cpp:210) |
| Blink: dim for the first half of each period, full for the second | Period 1000 ticks (`GAME_TICKS_PER_SEC` 1000, lib/gamelib/gtime.h:37; BLINK_INTERVAL, radar.cpp:154); half is 500 (155) |
| Dimmed overlay alpha | 0.5 (OVERLAY_OPACITY, radar.cpp:156) |
| Own unit flashes after a hit | 2000 ticks (HIT_NOTIFICATION, radar.cpp:62) |
| Minimap texture rebuilt on a counter, footprint every frame | Counter 10 (RADAR_FRAME_SKIP, radar.cpp:63) |
| Footprint width shrinks with view distance | MAXDISTANCE 5000 (display.h:238), divided by 100 (getDistanceAdjust) |
| Footprint height from pitch, clamped to a look range | Look range -1 to -88 (display.h:234-235); pitch term 360 minus r.x / DEG_1 (radar.cpp:716) |
| Click maps to tile with clamp to scroll window | Clamp to max minus 1 (CalcRadarPosition, 331-363) |

## 4. TypeScript sketch

simplified: the sketch keeps the four-point footprint, the fit-to-box zoom, the click mapping (unrotated), the dot visibility rule, the hit flash and the selected dim. It omits the pitch derivation from `playerPos.r.x` (the DEG_1 unit was not read), the yaw rotation of the click point (Vector2f_Rotate2f not read), the whole-minimap rotation, the per-tile colour pass, the overlay blend, the structure dots, the ally and enemy colour choice and the clan palette. It fixes two donor defects: the blink phase comes from the game tick rather than a timer reset inside the draw pass, and the adjusts are floats rather than integer divisions. The footprint vertices use the donor's order; how pie_SetViewingWindow draws them was not read.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICKS_PER_SEC = 1000;                  // donor lib/gamelib/gtime.h: GAME_TICKS_PER_SEC
const HIT_FLASH_TICKS = 2 * TICKS_PER_SEC;   // donor src/radar.cpp: HIT_NOTIFICATION
const BLINK_PERIOD_TICKS = TICKS_PER_SEC;    // donor src/radar.cpp: BLINK_INTERVAL
const DIM_ALPHA = 0.5;                       // donor src/radar.cpp: OVERLAY_OPACITY
const RADAR_BOX_PX = 128;                    // donor src/display3ddef.h: RADWIDTH
const MAX_VIEW_DISTANCE = 5000;              // donor src/display.h: MAXDISTANCE

export interface Blip {
  tileX: number;
  tileY: number;
  relation: 'me' | 'ally' | 'enemy';
  visibleToMe: boolean;   // in view, or shared vision from an ally
  selected: boolean;
  lastHitTick: number;    // game tick of the last hit on this unit
}

export interface DotLook {
  drawn: boolean;
  flashing: boolean;      // own unit hit recently: draw the flash colour
  alpha: number;          // 1 = full, DIM_ALPHA = dimmed
}

// Dim for the first half of each period, full for the second half. A pure function of the game tick.
export function blinkDim(nowTick: number): boolean {
  return (nowTick % BLINK_PERIOD_TICKS) < BLINK_PERIOD_TICKS / 2;
}

export function dotLook(b: Blip, nowTick: number): DotLook {
  if (!b.visibleToMe) return { drawn: false, flashing: false, alpha: 0 };
  const flashing =
    b.relation === 'me' && nowTick > HIT_FLASH_TICKS && nowTick - b.lastHitTick < HIT_FLASH_TICKS;
  const dim = b.selected && blinkDim(nowTick);
  return { drawn: true, flashing, alpha: dim ? DIM_ALPHA : 1 };
}

// Pixels per tile. The map is fitted to the box only when the minimap rotates with the player (donor resizeRadar).
export function pixelsPerTile(zoomLevel: number, rotate: boolean, mapW: number, mapH: number): number {
  const multiplier = rotate ? RADAR_BOX_PX / Math.max(mapW, mapH, 1) : 1;
  return (zoomLevel * multiplier) / 16;
}

// Pixel inside the minimap box to a tile, clamped to the scroll window (donor CalcRadarPosition, unrotated case; the donor measures from the radar centre plus half the radar size, which equals boxLeft/boxTop here).
export function minimapToTile(
  px: number,
  py: number,
  boxLeft: number,
  boxTop: number,
  pxPerTile: number,
  scroll: { minX: number; minY: number; maxX: number; maxY: number },
): { x: number; y: number } {
  const x = Math.trunc((px - boxLeft) / pxPerTile) + scroll.minX;
  const y = Math.trunc((py - boxTop) / pxPerTile) + scroll.minY;
  return {
    x: Math.min(Math.max(x, scroll.minX), scroll.maxX - 1),
    y: Math.min(Math.max(y, scroll.minY), scroll.maxY - 1),
  };
}

// Donor getDistanceAdjust, kept as float (donor divides integers).
export function distanceAdjust(viewDistance: number): number {
  return Math.max(MAX_VIEW_DISTANCE - viewDistance, 0) / 100;
}

// Donor getLengthAdjust: pitch term clamped to the look range (1..88 in donor display.h), then halved.
export function pitchAdjust(pitchTerm: number): number {
  const lookingFar = 1;
  const lookingDown = 88;
  const dif = Math.min(Math.max(pitchTerm - lookingFar, 0), lookingDown - lookingFar);
  return dif / 2;
}

// Camera footprint: four points, wide at the far (top) edge and narrow at the near edge, rotated by yaw.
// Donor setViewingWindow with RotateVector2D. visTilesX/Y = tiles on screen (donor visibleTiles).
export function viewWedge(
  cx: number,
  cy: number,
  visTilesX: number,
  visTilesY: number,
  distanceTerm: number,
  pitchTerm: number,
  yawRad: number,
  pxPerTile: number,
): Array<[number, number]> {
  const shortX = (visTilesX / 4 - distanceTerm / 6) * pxPerTile;
  const longX = (visTilesX / 2 - distanceTerm / 4) * pxPerTile;
  const edgeY = (visTilesY / 2 - pitchTerm / 3) * pxPerTile;
  const pts: Array<[number, number]> = [
    [longX, -edgeY],
    [-longX, -edgeY],
    [shortX, edgeY],
    [-shortX, edgeY],
  ];
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return pts.map(([x, y]): [number, number] => [x * c + y * s + cx, y * c - x * s + cy]);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 warzone-minimap.ts` on the VPS (/tmp/cm008/), exit 0.

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path, not checked against the Frankendom repo; client-only). The dot list it draws must come from the server's per-player snapshot, so the filter also needs a line in the server snapshot builder (path not checked).
- Parity row 14 (HUD). The batch hint named row 23; row 23 is zone population (spawn caps, respawn, despawn), and this donor's minimap draws what the player can see, not zone population. Row 14 is the honest row for the minimap itself; the zone-population dots are a row 23 question (see section 6).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, two clients: the minimap reads engine state and changes none); rules 7-9 n/a

## 6. Gaps and risks

- Visibility is the server's job. The donor filters with `visibleForLocalDisplay()` and allied shared vision on the client, and that call was not read. Frankendom's kill and state rulings are server-verified, so the client must never receive an entity it may not show. The filter belongs in the snapshot, not in the HUD.
- Many-on-one. The donor draws every droid that passes the gate, with no cap. Frankendom's MAX_ATTACKERS = 3 means the minimap should flag at most three attackers and draw the rest as plain dots (row 14 for the HUD; row 23 if the dots show zone population).
- Redraw cadence. The donor redraws its texture about every tenth frame (RADAR_FRAME_SKIP 10). A hit flash or blink on a cadence of about six hertz looks choppy in a fast duel. The sketch drives dots and blink per frame from the game tick.
- Defect, blink timer (kept idea, fix applied). `lastBlink` is reset only inside the object pass (655-656), which runs only on redraw frames. The blink period is therefore tied to the redraw counter and frame timing. Fix: derive the phase from the game tick (`blinkDim` in the sketch).
- Defect, integer division in the footprint adjusts (`dif / 100`, `dif / 6`, `dif / 4`, `dif / 3`, `dif / 2`). Fix: floats (`distanceAdjust`, `pitchAdjust`, `viewWedge`). The donor's integer steps made the footprint jump in whole tiles.
- Naming swap, no behaviour change. CalcRadarPixelSize (326-327) names the height ratio "H" and the width ratio "V", and setViewingWindow uses `pixSizeH` for x. Both ratios come from the same zoom value, so the numbers agree. The sketch uses one `pixelsPerTile`.
- Camera footprint. The wedge reads the camera's view distance and pitch, both client-side. The donor's look range (-1 to -88, display.h) and distance cap (5000) are fixed constants; for Frankendom they should be camera data, so the owner's world camera can tune them without touching the minimap.
- Not read (see Checked): the terrain colour function, the drag path, the render calls, the source of visibleTiles, the click-point rotation, and the frame's draw of drawRadarBlips. Nothing in this note depends on them except the exact footprint geometry on screen, which is marked medium confidence.
- GPL-2.0-or-later: clean-room only. The sketch is written from the described mechanism.

Missed mechanism (added by fixer): setViewingWindow (770-785) colours the camera footprint by campaign number (campaign 1-2 white alpha 0x3f, 3 greenish, otherwise black alpha 0x3f). A hit-flash droid that is also selected is dimmed as well.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- resizeRadar multiplier is max(RADWIDTH,RADHEIGHT)/max(texW,texH,1), not RADWIDTH/max(map w,h) (radar.cpp 270-275).
- CalcRadarPosition (331-363) subtracts radarCenterX/Y and adds radarWidth/2, not the box origin.
- Missed: footprint colour by campaign (770-785); hit-flash droid that is selected is dimmed too.

Fixed 2026-10-12: corrected the zoom multiplier and the click-to-tile description in the prose, clarified the sketch comment (sketch code unchanged), added the campaign-colour and dim-while-flashing line.
