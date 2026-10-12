# ihhub-fheroes2 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/gui/interface_radar.cpp` | Licence: GPL-2.0-or-later (interface_radar.cpp header: "either version 2 of the License, or (at your option) any later version"; the tree's LICENSE file is the GPL v2 text) | C++ | symbol `Interface::Radar::RedrawObjects`

Checked: The radar class in `interface_radar.cpp` (lines 26-534) and `interface_radar.h` (read in full). Read in full: `Build`, `SetZoom`, `SetRedraw`, `_redraw`, `RedrawForViewWorld`, `redrawForEditor`, `RedrawObjects` (283-420), `RedrawCursor` (422-460), `QueueEventProcessing` (462-495), `QueueEventProcessingForWorldView` (end of file). Constants: `radarWidthPx` (ui_constants.h 29). The fog test `isFog` (maps_tiles.h 301, declaration only). Touch: `src/engine/localevent.cpp` 1335-1470 (`onTouchFingerEvent`, read in full), the long-press constant (74) and the long-press helpers (1852-1872, read in part); the touch help text (`game_mainmenu.cpp` 270-278, read). Language: `files/lang/de.po` (grep counts and lines 1-30 and 6150-6152, 5920-5946, read; the rest of the catalogue not read). Callers of `RedrawObjects`, `Build` and `SetRenderArea` were not read (they live in the adventure map code), so when the partial-region path runs is not confirmed. The `Rect` operator `^` is used as a clip (the viewport against the world); its definition was not read. The donor's interface_radar.cpp calls the reveal flags from `ViewWorldMode` (`OnlyVisible`, `ViewAll`, `ViewMines`, `ViewHeroes`, `ViewTowns`, `ViewArtifacts`, `ViewResources`, as the code names them; the enum itself was not read). Searched in src: minimap (the radar), touch (the two-finger gesture below), lock-on (grep for lock-on, autolock, auto-aim, autoaim: no hits). The input buffer was not searched in fheroes2. Camera scope: not applicable (2D minimap). Confidence: high on the radar's colour order, the fog and reveal logic, the zoom maths and the viewport cursor; medium on the touch gesture's left-press timing (not confirmed beyond the code order in 1378-1431).

Best transferable idea: A minimap that is a per-tile colour raster, painted over fog of war with category reveal filters, scaled by an integer-friendly zoom, with a viewport box and click-to-centre, so the player always sees the known world and nothing hidden.
Decision (proposed): adapt - keep the raster, the fog gate, the category filters and the click-to-centre, but the reveal must come from the server (the client only gets the tiles and categories the player may see) and the zone size comes from zone data; the donor's assert-only zoom check is replaced by a load-time clamp.
Acceptance: On a 375 px phone the zone minimap is a square at the top corner; unexplored tiles are black; a hero or a shrine appears only after its tile is known or when its category filter is on; a tap on the minimap re-centres the view on that tile; a 36-tile zone draws each tile as a 4 by 4 block; the viewport box shrinks as the zone grows; a 200-tile zone fails at load with a clear message instead of drawing past the image.

## 1. Mechanism

- A radar is a second, small rendering of the whole world. The image is a square of 144 px (ui_constants.h 29; `radarWidthPx`) and holds one palette index per pixel. Each world tile paints a block of pixels, so the image is a raster of the map, not a list of sprites.
- Build (178-182): `SetZoom` sets `_zoom = area.width / worldWidth` (191). With a 144 px radar, a 36-tile map gives zoom 4 and a 144-tile map gives zoom 1. The assert keeps zoom between 1 and 4 (194); the comment states the supported range as 36 to 144 tiles. The region to repaint (`_roi`) starts as the whole world.
- Redraw entry (`_redraw`, 215): in "hide interface" mode the radar shows a logo instead (ICN HEROLOGO or HEROLOGE for the evil interface). Otherwise it optionally repaints the object layer (`RedrawObjects` with the friend colours and only-visible mode), copies the image to the screen at the radar's rectangle, and draws the viewport cursor on top.
- RedrawObjects (283-420), per tile in the repaint region:
  1. The region is cleared to black only when it is the whole world (297). A partial region repaints only its tiles (the dirty-region path).
  2. Reveal flags come from the filter mode (301-307): all, mines, heroes, towns, artifacts, resources, or only visible.
  3. `visibleTile = revealAll || !tile.isFog(playerColor)` (324). Fog hides the tile unless a reveal flag is set.
  4. Object branch by main object type (328 onward): a hero paints its owner's colour when the tile is visible or heroes are revealed, and is skipped if no hero is found. Mines, sawmills, alchemist labs and lighthouses paint the owner's colour of the captured object (the non-action variants find the main tile of a multi-tile object first, 350-360). Artifacts and resources paint grey when visible or revealed (364 and the resource case).
  5. Default branch (the ground and towns): on a visible tile, a castle or town paints its owner's colour first (378-379), then a road (381), then the ground colour, with the next shade for mountains and trees (384-388). On a fogged tile, towns paint only when towns are revealed (392); otherwise the tile stays black.
  6. Paint: at zoom above 1, each tile fills its block row by row, with `radarXStep = floor((x+1)*zoom) - floor(x*zoom)` (405); at zoom 1 it writes one pixel.
  7. After the pass the region resets to the whole world (417-418), so the next partial redraw starts clean.
- RedrawCursor (422-460): the viewport is a rectangle outline on the radar. It is hidden when the view covers the whole world in both directions (436-441). Otherwise the view is clipped to the world (`^`), and its size is the visible tiles scaled to the radar, `(w x radar px) / world tiles` (448-449), drawn with the radar colour and skip factor 6 (454). Its position is the radar origin plus the scaled top-left tile.
- Input (QueueEventProcessing, 462-495): a left click, or a held left button, inside the radar sets the game-area centre to the tile under the pointer, `(pointer - origin) x world size / radar size` (488). If the visible region changed, the cursor and the game area are redrawn. A right click shows the "World Map" help text (497). On the world view (QueueEventProcessingForWorldView) the same click moves the view and the wheel zooms.
- Touch (localevent.cpp 1335-1470): the first finger moves the cursor. When no two-finger gesture is running, it presses the left button on down (1400-1403) and releases it on up (1407). A second finger down presses the right button (1420-1423) and starts the two-finger gesture (1431); while the gesture runs the first finger no longer simulates the left button (comment at 1397-1398). A third finger is ignored (1351). Releasing the second finger releases the right button (1433), and the gesture ends when both fingers are up (1461). A long-press delay of 850 ms (74) is re-armed on each finger down (1403, 1423). What the right press opens is decided by the screen code, which was not read.

## 2. Key functions

- `Interface::Radar::Build` / `SetZoom`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/gui/interface_radar.cpp` 178-195. Zoom from map size. Receipts: 178, 191, 194.
- `Interface::Radar::RedrawObjects`: same file, 283-420. The tile raster: reveal flags, fog, object branch, ground, paint, region reset. Receipts: 283, 301, 324, 328, 364, 378, 381, 384, 387, 392, 405, 417.
- `Interface::Radar::RedrawCursor`: same file, 422-460. Viewport cursor. Receipts: 436, 448, 454.
- `Interface::Radar::QueueEventProcessing`: same file, 462-495. Click to centre; help text. Receipts: 488, 497.
- `LocalEvent::onTouchFingerEvent`: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/localevent.cpp` 1335-1470. Two-finger gesture. Receipts: 74, 1351, 1398, 1403, 1431, 1461.
- Constants: `radarWidthPx` 144 (`/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/gui/ui_constants.h` 29).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A per-tile raster painted over fog, with a per-player fog test | Fog test per player colour (maps_tiles.h 301) |
| Category reveal filters that un-fog one kind of object at a time | Seven filter modes (ViewWorldMode as named in the code: 301-307) |
| Integer zoom: radar pixels per world tile, one block per tile | `zoom = 144 / tiles`, assert 1 to 4 (191, 194). Supported map range 36 to 144 tiles (comment just above the assert) |
| Viewport box: visible tiles, clipped to the world, scaled to the radar | Hidden when the view covers the world (436). Cursor skip factor 6 (454) |
| Click to centre: pointer to tile by proportion | Integer proportion `(pointer - origin) x world / radar` (488) |
| Repaint only the changed region, then reset to whole world | Region reset (417-418) |
| Colour by owner and ground from fixed palette indices | Ground indices (enum near lines 30-55; read); owner indices with white for neutral (`GetPaletteIndexFromColor`, default white, read); mountain and tree shade +3 (387) |
| Long press on touch | 850 ms (localevent.cpp 74) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one tile (object first, then the fog and reveal test, then town, road and ground), the integer zoom and tile span, the viewport cursor (hidden when the whole map is in view, otherwise clipped and scaled with integer division) and the click-to-tile proportion. It omits the palette indices (colours are symbolic), the hero lookup (an owner is passed in), the non-action object variants (the caller resolves the main tile), the dirty-region bookkeeping and the region reset, the write into the image, the hide-interface logo, the world-view zoom and the two-finger gesture. Fixes in the sketch: the zoom range is a thrown error at load instead of an assert that is off in release builds; the fog test is a plain input (the server supplies the known-tiles mask).

```ts
// Licence: GPL-2.0-or-later (donor headers: "either version 2 of the License, or (at your option) any later version"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Filter = 'visibleOnly' | 'all' | 'mines' | 'heroes' | 'towns' | 'artifacts' | 'resources';
type Owner = 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple' | 'neutral';
type Ground = 'desert' | 'snow' | 'swamp' | 'wasteland' | 'beach' | 'lava' | 'dirt' | 'grass' | 'water' | 'none';
type Paint =
  | { kind: 'owner'; owner: Owner }
  | { kind: 'grey' }
  | { kind: 'road' }
  | { kind: 'ground'; ground: Ground; shade: boolean };

type ObjKind = 'none' | 'hero' | 'mine' | 'artifact' | 'resource' | 'other';
interface TileView {
  fogged: boolean;        // the player has not seen this tile (a server-supplied known-tiles mask)
  kind: ObjKind;
  owner?: Owner;          // owner of the hero or mine on this tile
  castleOwner?: Owner;    // owner of a town or castle covering this tile
  road: boolean;
  ground: Ground;
  shade: boolean;         // mountain or tree: drawn with the ground's next shade
}

// One tile to paint, or null for black (not drawn). Same order as the donor: object first, then town, road, ground.
function paintFor(t: TileView, f: Filter): Paint | null {
  const all = f === 'all';
  const visible = all || !t.fogged;
  switch (t.kind) {
    case 'hero':
      if (visible || f === 'heroes') return t.owner === undefined ? null : { kind: 'owner', owner: t.owner };
      return null;
    case 'mine':
      if (visible || all || f === 'mines') return { kind: 'owner', owner: t.owner ?? 'neutral' };
      return null;
    case 'artifact':
      if (visible || all || f === 'artifacts') return { kind: 'grey' };
      return null;
    case 'resource':
      if (visible || all || f === 'resources') return { kind: 'grey' };
      return null;
    default:
      if (visible) {
        if (t.castleOwner !== undefined) return { kind: 'owner', owner: t.castleOwner };
        if (t.road) return { kind: 'road' };
        return { kind: 'ground', ground: t.ground, shade: t.shade };
      }
      if (all || f === 'towns') return t.castleOwner === undefined ? null : { kind: 'owner', owner: t.castleOwner };
      return null;
  }
}

// Radar scale: radar pixels per world tile. The donor supports 36 to 144 tiles on a 144 px radar (zoom 1 to 4).
function zoomFor(radarPx: number, worldTiles: number): number {
  const z = radarPx / worldTiles;
  if (z < 1 || z > 4) throw new Error('radar supports maps of 36 to 144 tiles');
  return z;
}

// Pixel span of tile x on the radar. Each tile is painted over its span, so spans never overlap or leave gaps.
function tileSpan(x: number, zoom: number): { from: number; to: number } {
  return { from: Math.floor(x * zoom), to: Math.floor((x + 1) * zoom) };
}

interface Rect { x: number; y: number; w: number; h: number; }

// Viewport cursor: the visible tiles, clipped to the world, scaled to the radar. Hidden when the whole map is in view.
function viewportCursor(view: Rect, world: { w: number; h: number }, radar: Rect): Rect | null {
  if (view.w > world.w && view.h > world.h) return null;
  const x0 = Math.max(0, view.x);
  const y0 = Math.max(0, view.y);
  const w = Math.min(view.x + view.w, world.w) - x0;
  const h = Math.min(view.y + view.h, world.h) - y0;
  return {
    x: radar.x + Math.floor((x0 * radar.w) / world.w),
    y: radar.y + Math.floor((y0 * radar.h) / world.h),
    w: Math.floor((w * radar.w) / world.w),
    h: Math.floor((h * radar.h) / world.h),
  };
}

// Click on the radar: the tile under the click, scaled from radar pixels to world tiles.
function clickToTile(px: number, py: number, radar: Rect, world: { w: number; h: number }): { x: number; y: number } {
  return {
    x: Math.floor(((px - radar.x) * world.w) / radar.w),
    y: Math.floor(((py - radar.y) * world.h) / radar.h),
  };
}
```

## 5. Lands in

- TARGET `origins/client/hud-minimap.ts` (new client module: the raster, the fog gate, the filters and the viewport cursor; it reads the known-tiles mask and the category data the server sends). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 8 (sections 5 and 6 against the rulings: client-only HUD, zones as data, server-verified knowledge)

## 6. Gaps and risks

- The fog test reads the world state directly (`tile.isFog(playerColor)`, maps_tiles.h 301). In Frankendom the known-tiles mask and any category positions must come from the server. A client that gets the whole zone can draw everything, so a hidden loot or enemy position would leak into the minimap. Send only what the player may see.
- The category reveal filters (ViewAll, ViewMines, ViewHeroes and the rest) are a player action in the donor. In a fight-based game, a "reveal enemies" filter is a cheat if the client has the data. Keep the reveal as a zone or server rule, and test that a fogged enemy is absent from the payload.
- Zoom is checked with `assert` only (194). With asserts off, a map outside 36 to 144 tiles would give a zoom outside 1 to 4, and the row index `y * _zoom` (317) would then leave the 144 px image (inferred from the loop bounds; not tested). Fix: a load-time check that rejects or reports the zone (clamp-and-report). The sketch throws at load.
- Lighthouses are filed with the mines and alchemist labs (`case MP2::OBJ_NON_ACTION_LIGHTHOUSE:` 350). The donor's own TODO says the logic is unverified (344, 354). Do not copy the grouping; decide the lighthouse category for Frankendom on its own.
- The partial-region repaint (`_roi`) and its reset (417-418) save work when only a few tiles change. A browser canvas can repaint fully at this size; keep the idea only if the minimap shows up in a profile.
- Touch (localevent.cpp 1335-1470): the donor's two-finger gesture is a right-button press from the second finger while the first finger keeps the cursor. The help text tells the player to hold one finger, then touch elsewhere (game_mainmenu.cpp 274-276). Frankendom's phone version would be a long-press (850 ms here, row 5 intake) plus a second-finger info peek on a creature or hero, UI only. Decision for that part: adapt. The first finger presses the left button before the second finger lands; whether that fires a left click in practice was not tested (not verified).
- Coverage fold-ins (hud-ui), from this donor. Minimap and world map: this note. Touch UX: the two-finger peek above. Input buffer: not searched in fheroes2. Lock-on: none found by grep. Accessibility: not searched. Health and target frames: the radar has no health bar; the status and control-panel files (interface_status.cpp, statusbar.cpp, interface_cpanel.cpp in src/fheroes2/gui) exist but were not read.
- String tables and localisation. The translation layer is gettext: `_( "..." )` is a macro for `Translation::gettext` (translations.h 60), and the English text is the msgid in the code. `files/lang/` holds 23 `.po` catalogues (one per language) and a Makefile (not read). `de.po` has 3242 msgid entries (the header entry is the first msgid, so 3243 `msgid` lines), 30 plural entries (`msgid_plural`), no `msgctxt`, and about 700 singular entries with an empty msgstr (untranslated, the count includes the header line; read by grep). The header sets `nplurals=2; plural=(n != 1);` (de.po 17). A missing translation falls back to English (translations.h 46). Grammar: a standard PO file; one short phrase per entry. The German map-button strings share the prefix "Weltkarte" and add a direction word ("Weltkarte links" at 5924; other directions at 5927-5945).
- Where seen: the radar is static and redrawn on events, with no idle animation. The "World Map" help text is the only in-game explanation of the radar. Readability at 375: the radar is sized in pixels from the 144 px constant (`radarWidthPx`), and this file does not scale it (how the screen scales the window was not read).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 8 (sections 5 and 6 against the rulings)
