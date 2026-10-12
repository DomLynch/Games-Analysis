# freeciv-freeciv (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` | Licence: GPL-2.0-or-later (`COPYING` is GPL version 2, June 1991; the `overview_common.c` header says "either version 2, or (at your option) any later version"; both read) | C | symbol `redraw_overview` (with `overview_tile_color`, `overview_update_tile`, `calculate_overview_dimensions`)

Checked: The hint file `client/gui-sdl3/diplodlg.c` was not opened; by name it is a diplomacy dialog, so it is not the minimap. The minimap is `client/overview_common.c` (read in full, 530 lines), with its callers in `client/mapview_common.c` 3136-3170 (the tile-update flush), `client/mapctrl_common.c` 695-722 (the hover line on the overview) and `client/gui-sdl3/mapctrl.c` 1258-1290 (the minimap click). Not read: the `OVERVIEW_TILE_WIDTH` and `OVERVIEW_TILE_HEIGHT` macros, `get_overview_area_dimensions`, the fog sprite, `find_visible_unit`, the `#if 0` defaults block (lines 34-43, inactive), and the other GUI backends (gtk, qt). Confidence: high on the minimap pipeline and the scale rule (the code was read, and the rounding-up is in the source's own comment); the defaults for the layers are not known. Camera scope: not a camera cell. String table (`translations/core/en_GB.po`) was checked for counts and grammar, see section 6.

Best transferable idea: A minimap is a backing store of one colour per cell, repainted only for cells that changed and redrawn only when dirty, with one fixed priority list for what a cell shows (own, allied, enemy, then terrain).
Decision (proposed): adapt - keep the cell priority list, the per-cell update with one dirty flush, and the view-rectangle overlay; fix the scale to round down so the map never overflows its panel; write it fresh (GPL, clean-room).
Acceptance: At 375 wide, a zone map of 40 cells fits its panel at a whole-pixel scale; an enemy standing in a cell shows the enemy colour over the terrain colour; a changed cell shows in the next frame, and the view rectangle moves with what is on screen.

## 1. Mechanism

- Two canvases. The backing store (`gui_options.overview.map`) holds one coloured block per map tile at a scale of `OVERVIEW_TILE_SIZE` pixels per tile. The window (`gui_options.overview.window`) is what is shown. A redraw copies the store into the window in four pieces, shifted by the wrap offset (overview_common.c 212-220), draws the view rectangle, and clears the dirty flag (221-247).
- The view rectangle: the four corners of the main map's pixel rectangle are projected to overview pixels (223-231) and joined by four lines (233-243). It is redrawn on every redraw, so it costs no store writes.
- The colour of one cell is the first match of a priority list (overview_tile_color, 118-178): a city (own, allied or enemy colour, 120-133); a visible unit (own, allied or enemy, 135-148); the owner's border colour (150-159); relief (161-164); background: frozen, ocean or land (165-175); otherwise the unknown colour (178). Each layer is switched on or off by a flag (120, 135, 150, 161, 165).
- Fog: if the fog option is on and the tile is known but not currently visible (`TILE_KNOWN_UNSEEN`), a fog sprite is drawn over the colour (put_overview_tile_area, 401-405).
- Incremental update: `overview_update_tile` paints one tile's block into the store and marks the overview dirty (411-443). The tile-update pass calls it once per changed tile (mapview_common.c 3145). The source has a comment that these per-tile updates were most of the pass's run time and should be batched (3142-3144). The dirty flush then runs once at the end of the pass when the view is on screen (3163-3165), and `flush_dirty_overview` redraws only if the flag is set (265-267). A centring call and a full refresh redraw unconditionally (314, 385).
- Scale fit: `calculate_overview_dimensions` (450-506) sets `OVERVIEW_TILE_SIZE` to the smaller of two values: (panel width - 1) divided by (map width times 2 on iso maps), plus 1, and (panel height - 1) divided by map height, plus 1 (473-474). The result is at least 1 (475). Integer arithmetic makes the first term equal to ceil(panel width / cells), so the scale rounds up (source comment 471). The overview size is then the tile width times the map width, minus one scale step on iso maps without x-wrap (458, 481).
- Coordinates: a view centre maps to the overview centre (287-319, with `map_x0` set from the centre minus half the map on wrap maps, 299-302). A map tile maps to overview pixels by subtracting the offset, wrapping, and multiplying by the scale (map_to_overview_pos, 324-352; the forward path is 93-94 in gui_to_overview_pos). The reverse (overview_to_map_pos, 358-372) divides by the scale and adds the offset, with the iso half-tile correction (364-367).
- Click: a right-button press inside the minimap rectangle (gui-sdl3 mapctrl.c 1268-1270) converts the pointer to a map tile (1273) and centres the main map on it (1274). Hover over the overview draws the goto or patrol line to the tile under the pointer (mapctrl_common.c 704-712).

Order of operations for one tile change: find the tile's block in the store, paint it, mark dirty; at the end of the pass, if on screen: copy the store with the wrap offset, draw the view rectangle, clear dirty.

Numbers: scale is a whole number of pixels per map cell (at least 1, 475); iso maps are drawn at twice the width (xfact, 453) and clip half a tile on each side without x-wrap (458). Tile block size: macros not read.

## 2. Key functions

- `redraw_overview`: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` 201-248. Store copy with wrap, view rectangle, clear dirty. Callers in the same file: `flush_dirty_overview` (266), `center_tile_overviewcanvas` (314), `refresh_overview_canvas` (385). The function is static, so these are all its callers in this file.
- `overview_tile_color`: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` 118-179. Priority list. Only caller: `put_overview_tile_area` (399), read.
- `overview_update_tile`: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` 411-445. One cell into the store, sets dirty. Caller read: mapview_common.c 3145 (inside the tile-update pass).
- `calculate_overview_dimensions`: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` 450-506. Scale fit and size.
- `overview_to_map_pos` and `map_to_overview_pos`: `/mnt/frankendom-donors/freeciv-freeciv/client/overview_common.c` 324-372. The two coordinate directions.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One colour per cell, first match of a fixed priority list | Priority: city, unit, border, relief, background, unknown (overview_common.c 120-178); colour names are theme keys (not read) |
| Backing store; per-cell update; one dirty flush per pass | Flush once per pass when on screen (mapview_common.c 3163-3165) |
| Scale = largest whole pixels per cell that fits the panel, at least 1 | Rounds up (473-474, comment 471); iso uses 2 (453) |
| View rectangle drawn from the main view's corners on every redraw | Line colour from theme (not read) |
| Fog overlay for known but unseen cells | Fog flag (401-405); sprite not read |

## 4. TypeScript sketch

simplified: follows the donor order: priority colour for each cell (first match wins), fog overlay, then the store update per changed cell with a dirty mark, then one flush that repaints only when dirty and adds the view rectangle. It omits the four-piece copy and the wrap offset of the window (the sketch repaints the whole store), the iso half-tile clip (the sketch assumes square cells), the gui coordinate transform, the window and scrollbar sizes, the hover line, and the click. It fixes one defect on purpose: the scale rounds down (`Math.floor`) where the donor rounds up, so the map never overflows its panel. The sketch's `wrap` is a plain modulo that also handles negative inputs, where the donor loops with while statements.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
type Owner = 'mine' | 'ally' | 'enemy';

interface TileView {
  city?: Owner;          // a city on the tile, by owner
  unit?: Owner;          // a unit visible on the tile, by owner
  borderOwner?: string;  // territory owner colour key
  relief?: string;       // terrain colour key when relief is on
  background: 'land' | 'ocean' | 'frozen' | 'unknown';
  knownUnseen: boolean;  // explored but not currently visible
}

interface Layers { cities: boolean; units: boolean; borders: boolean; relief: boolean; fog: boolean; }

// First match wins: city, unit, border, relief, background, unknown.
function cellColour(t: TileView, l: Layers): string {
  if (l.cities && t.city) return `city:${t.city}`;
  if (l.units && t.unit) return `unit:${t.unit}`;
  if (l.borders && t.borderOwner) return `border:${t.borderOwner}`;
  if (l.relief && t.relief) return `relief:${t.relief}`;
  if (t.background !== 'unknown') return `bg:${t.background}`;
  return 'unknown';
}

// Scale: the largest whole pixels-per-cell that fits, at least 1. Floors (donor rounds up).
function fitScale(panelW: number, panelH: number, mapW: number, mapH: number, iso: boolean): number {
  const k = iso ? 2 : 1;
  const s = Math.min(Math.floor(panelW / (mapW * k)), Math.floor(panelH / mapH));
  return Math.max(1, s);
}

// Wrap that also works for negative values (the donor loops; this is the same result).
function wrap(v: number, n: number): number {
  return ((v % n) + n) % n;
}

class Minimap {
  private store: string[][];     // backing store: one colour key per map cell
  private dirty = false;

  constructor(private w: number, private h: number, private layers: Layers) {
    this.store = Array.from({ length: h }, () => new Array<string>(w).fill('unknown'));
  }

  // Called once per changed cell. Cheap: no drawing here.
  update(x: number, y: number, t: TileView): void {
    this.store[y][x] = t.knownUnseen && this.layers.fog ? `fog:${cellColour(t, this.layers)}` : cellColour(t, this.layers);
    this.dirty = true;
  }

  // Called once per pass. Repaints only if something changed, then draws the view rectangle.
  flush(viewRect: { x0: number; y0: number; w: number; h: number }, wrapX: boolean, wrapY: boolean): string[] | null {
    if (!this.dirty) return null;
    this.dirty = false;
    const out: string[] = [];
    for (let y = 0; y < this.h; y++) {
      out.push(this.store[y].join(','));
    }
    const corners = [
      [viewRect.x0, viewRect.y0], [viewRect.x0 + viewRect.w, viewRect.y0],
      [viewRect.x0 + viewRect.w, viewRect.y0 + viewRect.h], [viewRect.x0, viewRect.y0 + viewRect.h],
    ].map(([x, y]) => [wrapX ? wrap(x, this.w) : x, wrapY ? wrap(y, this.h) : y]);
    out.push(`viewrect:${JSON.stringify(corners)}`);
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/HU017-freeciv-minimap.ts`).

## 5. Lands in

- TARGET `origins/zones/minimap.ts` (new client-side module: the zone minimap; the zone's cell data is read, the engine does not read the minimap). Parity-checklist row 14 (HUD). The Pit has no minimap, so this is a world-zone item only.
- today: no zone minimap in Frankendom was read (not checked against the repo).
- Reuse tag: adapt-from-idea (GPL-2.0-or-later: clean-room, shape only)
- Brief rule served: 1 (one runtime for zones: the minimap reads zone data, not a second map); section 5 HUD stays client-only

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch was written from the mechanism.
- Defect, scale rounds up: `(w - 1) / k + 1` is a ceiling (473-474), and the source says it "may need tweaking" (471). A zone whose width does not divide the panel overflows the panel by up to one step. Fix: floor (sketch `fitScale`).
- Defect in the update path: the per-tile overview update is not batched (3142-3144 says it should be), so a burst of changes repaints many blocks. Frankendom: batch the per-cell writes per tick, then flush once.
- Iso and wrap handling is complex in the donor (half-tile clips, the wrap offset, four canvas copies). Frankendom zones are grids in data; do not copy the iso clip. Use one coordinate transform for all zones.
- Frankendom's rule that the engine owns the fight does not change here: the minimap is client-only and reads zone data. It must not feed the server kill or spawn logic.
- Unit visibility: the donor draws a visible unit with its owner colour on the cell (136-147). Frankendom: show only enemies that the client may know about (server-sent visibility), since the minimap otherwise reveals hidden entities. Not read: how the donor decides visibility (`find_visible_unit`).
- String table (`translations/core/en_GB.po`, counted with grep, no quotes): 8706 message entries plus one header, 242 with plural forms (two plural forms, singular when n = 1), 1956 flagged fuzzy, about 2297 message ids use a printf-style placeholder, no message contexts, and 1522 lines carrying translator hints. The file's header says it translates every string, including identical ones, and lists British spellings as rules. There are 39 `.po` catalogues in `translations/core`. `translations/Strings.txt` (43 lines) holds strings that are not in source, such as version tags. The source-side strings are C `_()` calls (339 translator hint lines in `client/*.c`). Frankendom: plural forms per language and fuzzy-flag review are the two things to copy; about 2500 entries open with an empty msgstr line, which may be untranslated or multi-line; the two were not separated (msgfmt is not on the box), so no untranslated figure is claimed.

Reuse tag: adapt-from-idea (GPL-2.0-or-later, clean-room)
Brief rule served: 1 (one runtime for zones); HUD client-only; string table notes are section 6 only
