# Anuken-Mindustry (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ui/fragments/MinimapFragment.java` (with `core/src/mindustry/ui/Minimap.java` and `core/src/mindustry/graphics/MinimapRenderer.java`) | Licence: GPL-3.0 (LICENSE header read: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; copyleft, clean-room, shape only) | Java | symbol `MinimapFragment`

Checked: Read in full: MinimapFragment.java (183 lines) and ui/Minimap.java (122 lines). Read in part: MinimapRenderer.java (lines 25-125 and the listed grep hits; `drawEntities` from line 124 onward was not read in full). Callers of `toggle()` checked by grep over core/src: Minimap.java line 108 (corner map tap) and DesktopInput.java line 450 (keyboard binding); not a repo-wide search outside core/src. String table: `core/assets/bundles/bundle.properties` counted by grep only (not read line by line); 36 files in `core/assets/bundles`. Not read: the world map (PlanetDialog), MobileInput.java and HudFragment.java. Confidence high on the full-map pan and zoom and the corner minimap; medium on the renderer's zoom model (only the clamp and the reset). camera_scope: not a camera cell.

## 1. Mechanism

Two map views share one texture from `MinimapRenderer`.

(a) The corner minimap (`ui/Minimap.java`): a 140 px square (scaled) with a 5 px margin. Mouse wheel calls `renderer.minimap.zoomBy` (line 71). A right-click pans the camera to the clicked point (listener from line 26; body read). A tap inside an 11 px tap square calls `ui.minimapfrag.toggle()` (line 108).

(b) The full-screen map (`MinimapFragment.java`). `toggle()` (line 172) first computes a pan that centres the view on the player (or on the camera when the player is dead; lines 176-177), then flips `shown` (line 181). Zoom comes from three inputs: the wheel (line 124: each tick changes zoom by 10 percent of the current zoom), a two-finger pinch (line 84: zoom = clamp of finger distance over the distance at the pinch start, times `lastZoom`), and clamping to 0.25..10 for both. One-finger drag adds the drag in screen pixels divided by zoom to `panx`/`pany` (line 90), so one finger movement covers the same map distance at any zoom. Right-click or right-button touch-down calls `panTo` (lines 93, 101), which sends the camera to the point, clamped to the map plus half a tile (line 156). Double tap on mobile sends a ping (lines 108-110). The keyboard ping key sends one; with Ctrl it asks for a text first (line 133). On desktop the minimap binding also toggles the full map (DesktopInput.java line 450).

Order of operations per frame. The overlay's `update` (lines 62-72) sets bounds to the screen, takes focus, and closes the map on the menu key (line 70). The draw (lines 44-52) fills black, then draws the map texture centred at `w/2 + panx*zoom`, `h/2 + pany*zoom` (line 52) with size `baseSize * zoom * worldWidth`, then draws entities in the same rectangle.

Renderer side (`MinimapRenderer.java`): `baseSize = 16` and `updateInterval = 2` (line 24). Tile colour changes are queued in `updates` and applied in one batch when a time accumulator reaches the interval; the modulo keeps the remainder (lines 73-74). The zoom starts at 4 (line 31) and `reset()` sets it to 4 again (line 118). Units are not drawn when they are in fog for the player's team or their type opts out (line 158).

## 2. Key functions

- `MinimapFragment.toggle()`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ui/fragments/MinimapFragment.java` 172-181 (open: recentre on player or camera, then flip shown).
- `MinimapFragment` zoom and pan listeners: same file, lines 79-84 (pinch zoom), 88-95 (drag pan), 100-102 (right-button pan), 106-111 (double-tap ping), 115-117 (`lastZoom` set on touch-up), 123-125 (wheel zoom).
- `Minimap` (corner map): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ui/Minimap.java` 24 (size), 26 (right-click pan), 71 (wheel zoom), 78 (tap square), 99-103 (mobile vertical drag sets zoom), 107-109 (tap opens full map).
- `MinimapRenderer.zoomBy` and `setZoom`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/graphics/MinimapRenderer.java` 99-106 (add then clamp to 1 .. smaller map side / 16 / 2).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wheel zoom as a fraction of the current zoom, clamped | 10 percent per tick (`amountY / 10f * zoom`, line 124); clamp 0.25..10 (lines 84 and 124) |
| Pinch zoom as ratio of finger distance times zoom at gesture start | Clamp 0.25..10 (line 84) |
| Drag pan in screen pixels divided by zoom (same map distance at any zoom) | None (line 90) |
| Open view: centre on a target point (fraction of map) | Target is player, or camera when dead (lines 176-177) |
| Pan target clamp to map plus half a tile | Half tile margin (line 156) |
| Map draw centre = screen centre + pan times zoom | None (line 52) |
| Double tap = ping, only on mobile | Tap count 2 (line 108) |
| Corner map size and tap slop | 140 scaled (Minimap.java line 24); tap square 11 scaled (line 78) |
| Renderer zoom: start 4, clamp 1 .. smaller side / 16 / 2 | Start 4 (MinimapRenderer line 31), base 16 (line 24) |
| Batch texture updates on an accumulator, keep the remainder | Interval 2 (line 24; line 73-74) |

Two different zoom models exist in the same donor. The full map uses clamp 0.25..10 with base size `Scl.scl(5f)` (MinimapFragment line 26). The renderer and corner map use clamp 1 .. smaller side / 32 with base 16 (MinimapRenderer 24, 105; Minimap.java 101 hard-codes 16). This is the main defect (section 6).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's formulas for wheel zoom, pinch zoom, drag pan, centring and the pan clamp, and it uses one shared zoom clamp. It omits the Scl UI scaling, the separate corner-map zoom model (1 .. smaller side / 32), the entity drawing, the ping and text prompt, the right-click camera move, and the `lastZoom` bookkeeping on touch-up. The pinch function takes the start zoom from the caller, which fixes the stale-value defect described in section 6. The zoom term in `centreOn` cancels algebraically (size contains zoom, and the pan divides by zoom); the sketch keeps the donor's form so it reads the same.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch of the shape of a zoom-and-pan map view, written from the described mechanism, not a translation.
// clean-room
interface MapView { zoom: number; panX: number; panY: number; }

const ZOOM_MIN = 0.25; // full-map clamp (donor MinimapFragment.java lines 84, 124)
const ZOOM_MAX = 10;   // full-map clamp (donor MinimapFragment.java lines 84, 124)

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

// Mouse wheel: each tick changes zoom by 10 percent of the current zoom (donor line 124: amountY / 10 * zoom).
function wheelZoom(v: MapView, wheelTicks: number): void {
  v.zoom = clampZoom(v.zoom - (wheelTicks / 10) * v.zoom);
}

// Pinch: zoom = the zoom captured when the pinch began, times finger distance now over distance at start.
// The caller passes startZoom captured at gesture start, so a wheel zoom in between cannot leave a stale value (donor defect, see note section 6).
function pinchZoom(v: MapView, startZoom: number, startDist: number, dist: number): void {
  v.zoom = clampZoom((dist / startDist) * startZoom);
}

// Drag: screen pixels divided by zoom, so one finger move covers the same map distance at any zoom (donor line 90).
function dragPan(v: MapView, dxPx: number, dyPx: number): void {
  v.panX += dxPx / v.zoom;
  v.panY += dyPx / v.zoom;
}

// Open the map centred on a point given as fractions 0..1 of the map (donor lines 176-177 use the player, or the camera when dead).
// baseSize is px per tile at zoom 1; mapTilesW is map width in tiles; ratio is height over width.
// Donor form: size = baseSize * zoom * W, panX = (size/2 - fracX * size) / zoom. The zoom term cancels algebraically.
function centreOn(v: MapView, fracX: number, fracY: number, baseSize: number, mapTilesW: number, ratio: number): void {
  const size = baseSize * v.zoom * mapTilesW;
  v.panX = (size / 2 - fracX * size) / v.zoom;
  v.panY = (size * ratio / 2 - fracY * size * ratio) / v.zoom;
}

// Draw centre of the map on screen (donor line 52 uses w/2 + panx * zoom).
function mapCentreOnScreen(v: MapView, screenW: number, screenH: number): { x: number; y: number } {
  return { x: screenW / 2 + v.panX * v.zoom, y: screenH / 2 + v.panY * v.zoom };
}

// Pan target clamp: the point is kept inside the map plus half a tile on each side (donor line 156).
function clampTarget(x: number, y: number, worldW: number, worldH: number, tile: number): { x: number; y: number } {
  return {
    x: Math.min(worldW + tile / 2, Math.max(-tile / 2, x)),
    y: Math.min(worldH + tile / 2, Math.max(-tile / 2, y)),
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/Anuken-Mindustry-minimap.ts`: exit 0.

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (new client module). The HUD is client-only by ruling, so it does not live in `src/fight`. The fight engine only sends the positions and the ping, it does not own zoom or pan.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 2 (the HUD is a client view over engine state); rule 1 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism and is not a line-by-line translation.
- Defect 1, two zoom models: the full map clamps to 0.25..10 with base 5 scaled (MinimapFragment 26, 84, 124), while the corner map and renderer clamp to 1 .. smaller side / 32 with base 16 (MinimapRenderer 24, 105; Minimap.java 101). Fix: one zoom model and one clamp, held as client data.
- Defect 2, stale start zoom: `lastZoom` is set only on the first pinch call (80-81) and on touch-up (115-117). A wheel zoom with no touch leaves `lastZoom` at the old value, so the next pinch can jump back to it. Fix: capture the zoom at the start of each gesture (the sketch's `pinchZoom` takes `startZoom` from the caller).
- Defect 3, absolute mobile drag on the corner map: the vertical finger position sets zoom directly (Minimap.java 100-102), so the first move can jump the zoom to wherever the finger is. Fix: apply the finger's vertical movement as a delta.
- Ping is a network call (`Call.pingLocation`, lines 110 and 135). For Frankendom it would be a server message. Who receives it, and whether it is rate-limited, was not read.
- Localisation (checked for this cell): `core/assets/bundles/bundle.properties` has about 3,496 non-comment `key = value` lines (grep count, not a parser), and 36 bundle files in `core/assets/bundles`. Grammar: plain English values; `{0}` placeholders (229 lines by grep); colour tags such as `[accent]` and `[sky]` (238 lines by grep); `\n` escapes in long prompts; keys are dot-separated (`ping.text`, line 1559). Code refers to strings with an `@` prefix (`"@back"` line 151, `"@ping.text"` line 133, `"@minimap"` line 147, grep-checked). Frankendom can reuse the `@key` shape for HUD text, not the file.
- Not read: the body of `MinimapRenderer.drawEntities` (from line 124), the world map `PlanetDialog`, `MobileInput.java`, `HudFragment.java`. No camera code is in this cell.
- Scl (UI scale helper) and `Time.delta` units were not read; the sketch treats the sizes as px and the interval as ticks.

Best transferable idea: one map view with wheel and pinch zoom on a single clamp, opened centred on the player, panning by screen pixels divided by zoom so one finger move covers the same map distance at any zoom.
Decision (proposed): adapt - the zoom-and-pan shape fits a client HUD, but the donor has two zoom models, a stale pinch start value and an absolute mobile drag; Frankendom keeps one clamp as client data and captures the start zoom per gesture.
Acceptance: on a 375 px phone the full map opens centred on the player's hero, pinch and wheel zoom keep the point under the fingers, and a test asserts the corner map and full map read the same zoom clamp field.
