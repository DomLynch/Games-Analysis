# CleverRaven-Cataclysm-DDA (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` (`game::draw_panels`, lines 3407-3481) with `src/panels.cpp` and `src/panels.h` (the list hint `src/panels.h` is the declarations only; the mechanism is in panels.cpp and game.cpp) | Licence: CC BY-SA 3.0 Unported (`/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/LICENSE.txt` line 1 read; copyleft, clean-room, shape only) | C++ (terminal UI, ncurses-style windows) | symbol `game::draw_panels`

Checked: Read in full: `game::draw_panels` (game.cpp lines 3380-3490, the surrounding draw entry and the whole sidebar loop), `panels.h` (161 lines), panels.cpp 57-125 (window_panel constructors and height), 151-170 (layout accessors), 326-412 (decorate, draw_messages, draw_mminimap, default layouts), 424-491 (layout selection, sidebar lookup, width, init, offsets). Read in part: the JSON sidebar definitions (grep and lines 7, 175, 181 region only). Not read: panels.cpp 171-225 (overmap minimap draw), 492-887 (save, load, the layout manager UI), widget.cpp custom draw (health body graph), the pixel-minimap renderer in cata_tiles (only the hand-off in panels.cpp 354-365 was read), any targeting or lock-on code (grep found no player lock-on UI; `turret.cpp` 820 is turret AI, not read). Callers of `draw_panels`: one call site (game.cpp 3396, passes `true`), grep over `src`. Confidence: high on the draw order, the log fill, and the give-back rule; high on the dead per-turn gate (single caller); medium on overflow behaviour (reasoned from the code, the off-screen window clipping in the curses layer was not read). camera_scope: not a camera cell.

## 1. Mechanism

The sidebar is a column of panels (`window_panel`), each with a fixed height in rows, or the special heights `-1` (map, aspect-based) and `-2` (log, fills what is left). A layout is a named list of panels in order (classic, labels, structured; the panel order and toggles are saved to the player's options file). Each panel has a toggle, a render predicate (default always true), and a draw function that returns a height delta.

`game::draw_panels(force_draw)` (game.cpp 3407) runs in two passes.

Pass 1 (lines 3418-3430): total the rows of every panel that is toggled on and renders, except the log. Each counts its height plus one spacer row when `SIDEBAR_SPACERS` is on (line 3424-3426 use `p_height + spacer`). Then `log_height = max(TERMY - total, 3)` (line 3429): the log gets the screen rows left, never fewer than 3.

Pass 2 (lines 3431-3478): draw top to bottom. For each panel that renders: `h = min(panel height, TERMY - y)` (line 3434); the log uses `log_height` instead (line 3437). Add the spacer (3439). If the panel is toggled and renders and `h > 0`, and `always_draw || draw_this_turn` holds (3441), create a window of `h` rows at the column position and call the panel's draw (3444). The draw returns a delta `tmp_h`, which is zero or negative when the panel skipped lines. `h += tmp_h`. If `tmp_h < 0`, the panel gave rows back: `y += h`, `log_height -= tmp_h` (3449), and the loop continues. Because the log's height is read when the log is drawn, rows given back reach the log only if the log is drawn after the panel that gave them back. The default column puts the log last (panels.cpp 389), so in the default it works.

The map panel (`draw_mminimap`, height -1, always draw) has a height of `PIXEL_MINIMAP_HEIGHT` if that option is above 0, else `width / 2` (panels.cpp 106-110). It is always drawn (393) and only exists in TILES builds.

The per-turn gate: `draw_this_turn` is true when the turn advanced or `force_draw` is set (3411). The only caller passes `true` (3396), so in this build every panel is drawn every time (see section 6).

Layout width: `initialize_default_custom_panels` clamps each sidebar width to at least 16 (panels.cpp 379). The sidebar's total width sets the screen offset for the main map (`update_offsets`, panels.cpp 486-490).

Layout selection: `get_current_layout()` returns the named layout; if the name is unknown it sets `legacy_classic_sidebar` and calls itself again (panels.cpp 424-432).

## 2. Key functions

- `game::draw_panels(bool force_draw)`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/game.cpp` 3407-3481 (pass 1 total and log size; pass 2 draw loop, give-back, log reclaim).
- `window_panel` constructors and `get_height()`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/panels.cpp` 57-79 and 104-120 (draw function wrapper returns 0 for plain draws; height -1 map case at 106-110).
- `initialize_default_custom_panels`: same file, 374-397 (min width 16 at 379; Log at 389-390; Map at 393).
- `initialize_default_panel_layouts` and `panel_manager::get_current_layout`: same file, 399-411 and 424-433.
- Data: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/data/json/ui/sidebar-legacy-classic.json` line 175 (layout id), `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/data/json/ui/structured/sidebar-structured.json` line 7 (description: small screens).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed panels take their rows first; the log takes the remainder | Log minimum 3 rows (game.cpp 3429) |
| Each panel is clamped to the rows left on screen | Clamp to `TERMY - y` (game.cpp 3434) |
| Spacer row between panels, toggled by an option | 1 row when `SIDEBAR_SPACERS` is on (game.cpp 3424-3426 use the spacer variable) |
| Minimum column width | 16 columns (panels.cpp 379) |
| Map panel height from the aspect of the map | `PIXEL_MINIMAP_HEIGHT` if above 0, else `width / 2` (panels.cpp 108-110) |
| Panel reports rows it did not use (negative delta), which go back to the log | Delta is whatever the draw returns (game.cpp 3444-3449) |
| Per-turn redraw gate | Dead in this build (game.cpp 3396, 3411) |

Layout ids: `legacy_classic_sidebar` (sidebar-legacy-classic.json 175, the fallback at panels.cpp 431), `legacy_labels_sidebar` (sidebar-legacy-labels.json), `structured_sidebar` (sidebar-structured.json). The structured layout's description says it is compact, with body graphs for HP, encumbrance, status and temperature, and is meant for a large font or a small screen (sidebar-structured.json line 7). That is the donor's own health frame for small screens.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's two passes (fixed rows first, then the log gets the rest with a 3-row minimum, then draw top to bottom), the give-back rule (a negative delta goes to the log, which only helps if the log is drawn later), the spacer, the per-panel clamp and the 16-column minimum. It omits the window creation, the layout selection and save/load, the layout-label overlay used by the layout editor, the widget row heights (the donor computes them from the widget tree), the always-draw flag, the per-turn gate (dead in the donor, dropped here), and the recursion fallback. It does not fix the overflow case (fixed panels above the screen): the log still gets 3 rows there, as in the donor, so a Frankendom version must add its own cut.

```ts
// Licence: CC-BY-SA 3.0 (donor). clean-room sketch of the shape of a stacked HUD panel column, written from the described mechanism, not a translation.
// clean-room
const LOG = -2; // fills the rows left over after the fixed panels (donor panels.cpp line 390)
const MAP = -1; // height from the map aspect, 0 when the option is off (donor panels.cpp lines 106-108, 393)
const MIN_WIDTH = 16; // donor panels.cpp line 379

interface Panel {
  id: string;
  height: number;                   // rows, or LOG, or MAP
  on: boolean;                      // player toggle
  render: () => boolean;            // predicate (donor default is always true)
  draw: (rows: number) => number;   // draws into rows, returns a height delta (<= 0; negative = rows given back)
}

function minWidth(w: number): number {
  return Math.max(w, MIN_WIDTH);
}

// Two passes, as in the donor: first total the fixed panels, then give the log the rest (never less than 3 rows).
// Then draw top to bottom. A panel that gives rows back adds them to the log, but only if the log is drawn after it.
function layoutColumn(
  panels: Panel[], screenRows: number, spacer: number, mapRows: number,
): { id: string; rows: number }[] {
  const live = panels.filter(p => p.on && p.render());
  let fixed = 0;
  for (const p of live) {
    if (p.height === LOG) continue;
    fixed += (p.height === MAP ? mapRows : p.height) + spacer;
  }
  let logRows = Math.max(screenRows - fixed, 3);

  const out: { id: string; rows: number }[] = [];
  let y = 0;
  for (const p of live) {
    let h = p.height === LOG ? logRows : Math.min(p.height === MAP ? mapRows : p.height, screenRows - y);
    h += spacer;
    if (h <= 0) continue;
    const delta = p.draw(h);
    h += delta;
    if (delta < 0) {
      logRows -= delta;
    }
    out.push({ id: p.id, rows: h });
    y += h;
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/CleverRaven-Cataclysm-DDA-panels.ts`: exit 0.

## 5. Lands in

- TARGET `origins/client/hud/panel-stack.ts` (new client module). The HUD column is client-only by ruling. It reads the health and target values from the engine and lays them out; it does not change them.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (CC BY-SA 3.0; clean-room only)
- Brief rule served: 2 (HUD is a client view over engine state); rule 1 n/a

## 6. Gaps and risks

- CC BY-SA 3.0: clean-room, shape only. The sketch is written from the described mechanism.
- Defect 1, dead per-turn gate: `draw_this_turn` is only false when `force_draw` is false, and the one caller passes true (game.cpp 3396, 3411). The gate never skips a redraw. Fix: remove the gate, or wire it to real redraw events (state changes), and keep no dead code.
- Defect 2, overflow: pass 1 gives the log at least 3 rows (game.cpp 3429), and the log's height is not clamped to the rows left (3437 uses `log_height` directly; only the other panels get the clamp at 3434). When the fixed panels fill the screen, the log is placed at a `y` at or past the screen bottom, and the curses layer's clipping for off-screen windows was not read. Fix: cut the lowest fixed panels first, and never place the log past the screen.
- Defect 3, give-back order: rows given back by a panel reach the log only if the log is drawn after it (log_height is read at the log's draw, 3437). The default column is safe because the log is last (panels.cpp 389). A custom column that puts the log first loses those rows. Fix: a measuring pass, or a rule that the log is always last.
- Defect 4, recursion: an unknown layout name sets the fallback id and calls `get_current_layout()` again (panels.cpp 431-432). If the fallback layout file is missing, this recurses without end. The file is in this box (sidebar-legacy-classic.json 175). Fix: return a default constant instead of calling again.
- Frankendom point: the map panel and the pixel minimap are TILES-only; the Frankendom HUD is one client, so the rule "map height from the aspect, option or width/2" is a data field, not a platform switch.
- Readability at 375 wide: the donor's structured layout is explicitly for small screens, with compact body graphs (sidebar-structured.json line 7). The donor does not measure readability; a 375 px check is needed on our side.
- Localisation (checked for this cell): `lang/po` in this box holds only `_DO_NOT_EDIT_FILES_IN_THIS_DIR_BY_HAND` and `placeholder.po` (no translations). The source strings are inline `_( "..." )` calls in the C++ (for example activity_actor.cpp line 6397, grep) and strings in the JSON data, pulled out by `lang/extract_json_strings.py` (file name seen; contents not read). Entry count: not counted. Grammar: plain English sentences in `_()` calls; placeholders and markup were not checked in this pass.
- No lock-on or input-buffer UI was found by grep (`lock on` matches are in unrelated messages; `turret.cpp` 820 `auto_find_hostile_target` is turret AI, not read). Lock-on and the input buffer for Frankendom remain unsourced from this donor. `input_wait.h` line 14 (idle-wait comment, grep only) is a possible lead, not read.
- Not read: the overmap minimap (panels.cpp 171-225), the layout editor (492-887), the health body graph (widget.cpp), the pixel minimap renderer.

Best transferable idea: a HUD column in which the event log fills whatever rows the fixed panels leave, and every panel returns the rows it did not use, so they go back to the log.
Decision (proposed): adapt - the fill-and-give-back column fits a phone HUD, but the donor has a dead redraw gate, a log that can sit off the screen when the fixed panels overflow, a give-back that depends on draw order and a recursion fallback; Frankendom keeps the two-pass column with the log always last, a clamp on the log and a cut of the lowest panels first.
Acceptance: on a 375 x 667 phone the column shows the health panel and the target panel, with the event log filling the rest; turning three panels off grows the log by their rows; a test asserts the column never exceeds the screen rows and that the log keeps at least 3 rows.
