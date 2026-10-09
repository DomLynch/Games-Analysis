# miki151-keeperrl (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | Licence: GPL-2.0 (code; data files under separate terms) | C++ | symbol WindowView::rebuildGui / updateMinimap

## 1. Mechanism

- `WindowView::updateView` (window_view.cpp 512) runs each time a new game view arrives (it returns early if the view was not yet rendered and the caller is not the render thread, 514-515). Order: refresh game info, switch tile layout, `rebuildGui()` (lines 525-526 are too short to receipt), update map objects, `updateMinimap()`, then `playSounds()` (lines 517-533).
- `rebuildGui` (297-425) rebuilds the whole GUI tree on every call: it first calls `rebuildMinimapGui` and sets the map bounds, clears the temporary elements (308), adds a mouse wheel (unless disabled in options) and key handlers (movement, zoom, minimap toggle, escape), then chooses a right bar and a bottom bar by info type: player, band, spectator, or screenshot (no bars); after the bars and overlays (356-414) it adds the joystick handler (415-423) and sets its bounds to the map area.
- Overlays and the message box are placed with `getOverlayPosition` (427-457), a switch over ten alignments (minions, top-left, immigration, villains, bottom-left, left, messages, tutorial, map hint, centre) with a position formula each, mostly relative to the right-bar width and bottom-bar height. Preferred height is clipped to the space above the bottom bar (410).
- `rebuildMinimapGui` (285) builds the minimap window at a computed origin and width, with a row of icons under it.
- `updateMinimap` (504) sets the minimap bounds: a square of 40 cells around the player's map position, or the whole level when the enlarged minimap is on.
- Inputs: game info, options, map scroll position and square size, renderer size, level bounds. Output: a new GUI element tree with bounds. No tick and no sim write.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| WindowView::rebuildGui | /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | 297-425 | Rebuilds the whole GUI tree per update: keys, wheel, right and bottom bars by mode, overlays |
| WindowView::rebuildMinimapGui | /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | 285-295 | Builds the minimap window and its icon row at a computed origin |
| WindowView::updateMinimap | /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | 504-510 | Sets minimap bounds: 40-cell radius around the player, or whole level |
| WindowView::updateView | /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | 512-534 | Per-update order: game info, layout, rebuildGui, map objects, minimap, sounds |
| WindowView::getOverlayPosition | /mnt/frankendom-donors/miki151-keeperrl/window_view.cpp | 427-457 | Per-alignment overlay position from bar sizes and screen size |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Minimap window centred on the player with a fixed radius; full-level bounds in enlarged mode | Radius 40 cells (line 505) (theirs) |
| Side and bottom bars chosen by a mode switch; overlays placed in the free area | Margins 20, 20, 10, 0 (line 396) and 105, 10, 105, 0 (399); right bottom margin 30 (306); bottom offset 35 only for the left alignment (429, 446); top bar height 85 in band mode (386) (theirs) |
| Rebuild the GUI tree from scratch on each update | Rebuild on every view update (theirs, a design choice) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism in section 1, no lines translated (licence is GPL-2.0 for code).

simplified: the donor places overlays by ten alignments with a different formula each (the three alignments in the sketch are invented and only approximate two of them); the enlarged-minimap toggle, the donor's centre-of-screen computation from the map scroll position and square size, and the screenshot/spectator branches are omitted.

```ts
// Licence: GPL-2.0 (code; data files under separate terms) - clean-room sketch, no lines translated
// Minimap viewport around the player (or the whole level), and an overlay placed in the free area.

interface Cell { x: number; y: number; }
interface Rect { left: number; top: number; right: number; bottom: number; }

// A square of fixed radius around the player, or the full level when enlarged.
function minimapBounds(player: Cell, radiusCells: number, enlarged: boolean, level: Rect): Rect {
  if (enlarged) return { ...level };
  return {
    left: player.x - radiusCells,
    top: player.y - radiusCells,
    right: player.x + radiusCells,
    bottom: player.y + radiusCells,
  };
}

type Align = 'top-right' | 'bottom-right' | 'bottom-center';

// Overlay origin in the free area: right of the side bar, above the bottom bar.
function overlayOrigin(
  align: Align,
  screenW: number,
  screenH: number,
  sideBarW: number,
  bottomBarH: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const freeW = screenW - sideBarW;
  const freeH = screenH - bottomBarH;
  if (align === 'top-right') return { x: sideBarW, y: 0 };
  if (align === 'bottom-right') return { x: sideBarW, y: freeH - h };
  return { x: sideBarW + Math.floor((freeW - w) / 2), y: freeH - h };
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (overlay placement helper and a minimap viewport, only if a map view is ever added), today: `src/hud.ts` (moving).
- Parity checklist row 14 (HUD), low fit; no checklist row covers a minimap.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Keeper is a colony-management game with a whole-screen GUI. There is no fight camera, duel, HP bar or hit feedback here, so the checklist fit is weak.
- The donor rebuilds the whole GUI tree on every view update (`updateView` calls `rebuildGui`, line 526). That would likely be heavy for a 60 fps fight HUD (inference, not measured); Frankendom's HUD should update existing nodes in place.
- The minimap is a whole-level map feature. A single-arena duel does not need one. Zone maps, if they come (zones as data, brief rules 4, 6, 10), would be a separate design.
- Data files are under separate terms. Do not take icons, sprites, text or data files from this donor.
- The GUI is derived from full game info on each update. Under the server-verified kills ruling, Frankendom HUD values come from the server snapshot via the one fight state, not a client rebuild.
