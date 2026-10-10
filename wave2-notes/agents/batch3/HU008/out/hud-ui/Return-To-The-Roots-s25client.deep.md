# Return-To-The-Roots-s25client (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/IngameMinimap.cpp` (with `Minimap.cpp`, `controls/ctrlMinimap.cpp`, `controls/ctrlIngameMinimap.cpp`, `ingameWindows/iwMinimap.cpp`, `world/GameWorldViewer.cpp`, `desktops/dskGameInterface.cpp`) | Licence: GPL-2.0-or-later (SPDX header `IngameMinimap.cpp` line 3 and `Minimap.cpp` line 3; the checkout's LICENSE file is GPL v2, line 2 "Version 2, June 1991") | C++ | symbol `IngameMinimap::CalcPixelColor` (and `IngameMinimap::BeforeDrawing`, `GameWorldViewer::GetYoungestFOWNode`)

Checked: read in full: `IngameMinimap.cpp` (283 lines), `IngameMinimap.h` (69), `Minimap.cpp` (66), `Minimap.h` (43), `ingameWindows/iwMinimap.cpp` (98), `controls/ctrlIngameMinimap.cpp` (108), `controls/ctrlMinimap.cpp` (93 lines, read in full), `gameData/MinimapConsts.h` (22). Read the lookup function `GameWorldViewer::GetYoungestFOWNode` (318-349). `FoWNode.h` line 49 read by grep only. `dskGameInterface.cpp` (1426 lines) read by grep and in the minimap lines only (246-256, 279-280, 342, 917-918, 1312-1337); not read in full. Callers: `GetYoungestFOWNode` has 4 call sites by grep (IngameMinimap.cpp 50 read; GameWorldViewer.cpp 170 and 313 and GameWorldView.cpp 550 not read). `UpdateNode` is called from `GI_UpdateMinimap` (dskGameInterface.cpp 1312-1315); the callers of `GI_UpdateMinimap` were not read. Confidence: high on the per-cell colour chain, the dirty-node flush and the toggles; high on the minimap window and click-to-pan; medium on how often the game raises `GI_UpdateMinimap` (not read). No camera topic, so no `camera_scope`.

## 1. Mechanism

- The minimap is a texture with two columns per map node, one per terrain triangle (`Minimap.cpp` 16: width `mapSize.x * 2`; the column is `(x*2 + t + (y&1)) % width`, line 24). Odd rows are shifted by one column, which lays the hex-style grid out as a picture.
- Each column gets a colour from `CalcPixelColor`, which is one if-else chain in this order (`IngameMinimap.cpp` 26-124):
  (a) If the viewer cannot see the node, paint opaque black and tag it `Invisible` (28-32).
  (b) Else pick the source: the live node when the node is in view, or the youngest remembered record when it is in fog of war (37-54).
  (c) Trees and granite come first, with a brightness variation; they take the owner's tint (averaged with the player colour) only when territory is on (57-81).
  (d) Otherwise, if the node has an owner: building if one stands there (89-91), else road if a road leaves the node (93-94), else owned territory (97). A building or road shows its own colour only when its layer is on; when off, the node falls back to terrain, tinted by the owner when territory is on (99-110).
  (e) Otherwise plain terrain: the triangle's terrain colour from the world description, shaded by the node's shadow value (`CalcTerrainColor` 132-157; shade = channel + shadow - 0x40, clamped).
  (f) Fog of war halves each colour channel (120-121). The node's layer tag is stored last (123).
- Changes do not repaint at once. `UpdateNode` marks a node dirty once (`nodes_updated` flag, 186-193). `BeforeDrawing` runs at draw time (`Minimap::Draw` calls it first, `Minimap.cpp` 35): if the dirty list is at least half of all nodes (line 206, integer division by 2), it rebuilds the whole texture (209-210); otherwise it repaints only the dirty nodes, two columns each (213-225). The list is then cleared (228).
- Layer toggles: `ToggleTerritory`, `ToggleHouses`, `ToggleRoads` flip a flag and call `UpdateAll(tag)` (267-283). `UpdateAll(tag)` repaints the nodes whose stored tag matches; for the territory toggle it also repaints building and road nodes whose own layer is off (252-256).
- The window (`iwMinimap`): a 170 px small window or a 370 px extended window, chosen by a saved setting (`iwMinimap.cpp` 15-17, 47, 92). Three toggle buttons (ids 1-3, 85-87) and one size button (id 4, 88-95). The map is box-fitted with an aspect ratio: width is scaled by 1.1547 (`MINIMAP_SCALE_X`, `ctrlMinimap.cpp` 57), then the smaller of the two scale factors is used (62-70).
- Viewer marker and click-to-pan (`ctrlIngameMinimap.cpp`): the marker sits at the midpoint of the first and last visible map points (27), clipped at the edges (39-64). A held left button over the map converts the mouse position to a map point (83-84) and calls `MoveToMapPt` (86). Dragging is the same call repeated while the button is held (77).
- Fog of war memory (`GameWorldViewer.cpp` 318-349): start from the viewer's own record for the node (321-322). If team view is on (325), each ally who is in fog of war (331, 335) with a later `last_update_time` (338) replaces the best record (341-343). Return the best (349).
- Hotkeys and buttons: key `l` toggles the window (917-918); a toolbar button toggles it too (342). Toggling fog of war recomputes visibility and calls `minimap.UpdateAll()` (246-256).

## 2. Key functions

- `IngameMinimap::CalcPixelColor`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/IngameMinimap.cpp` 22-127. The priority chain for one column.
- `IngameMinimap::BeforeDrawing` and `UpdateNode`: IngameMinimap.cpp 186-193 and 198-230. Dirty flags, half-map full-rebuild rule, per-pixel partial repaint.
- `IngameMinimap::UpdateAll(DrawnObject)` and the toggles: IngameMinimap.cpp 244-283.
- `GameWorldViewer::GetYoungestFOWNode`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/world/GameWorldViewer.cpp` 318-349.
- `iwMinimap` constructor, `Resize`, `Msg_ButtonClick`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/ingameWindows/iwMinimap.cpp` 28-98.
- `ctrlMinimap::SetMapSize` (box fit): `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/controls/ctrlMinimap.cpp` 45-72. `ctrlIngameMinimap::Draw_` and `Msg_MouseMove`: `controls/ctrlIngameMinimap.cpp` 22-68 and 75-93.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One colour per cell from a fixed priority chain (hidden, cover, owner layers, terrain) | Chain order (theirs, IngameMinimap.cpp 28-116) |
| Dirty set, repaint only changed cells, full rebuild at one half of cells | Denominator 2 (theirs, IngameMinimap.cpp 201, 206) |
| Fog cell: remembered record, darkened | Halve each channel (theirs, IngameMinimap.cpp 121); team view takes the youngest allied fog record (GameWorldViewer.cpp 325-343) |
| Shade by a per-cell value with a bias | Shade bias 0x40 (theirs, IngameMinimap.cpp 139) |
| Owner tint, equal mix | Average of cell and player colour, weight 1:1 (theirs, IngameMinimap.cpp 182-183) |
| Tree and granite colour with random brightness | Tree 0xFF003c14 with variation 20; granite 0xFFA2A2A2 with variation 20; building 0xFFFFFFFF; road 0xFFAAAAAA (theirs, gameData/MinimapConsts.h 8-18) |
| Minimap sizes | Small 170, large 370 (theirs, iwMinimap.cpp 15, 17) |
| Hex-grid width fix in the box fit | Scale 1.1547 (theirs, gameData/MinimapConsts.h 22) |

## 4. TypeScript sketch

simplified: the sketch keeps the layer chain (hidden, tree or granite, owner building, road, owner territory, terrain), the fog halving, the youngest-record lookup with team view, the dirty-cell flush with the half-map rule, and the toggle repaint. It omits: the random brightness variation of trees and granite (replaced by a fixed colour, which is also the fix for the defect in section 6), the live-versus-remembered distinction for 'seen' cells (the sketch reads the local record for both), the box fit and the window, the click-to-pan, and the viewer marker. It reorders nothing in the chain, but the donor's `dos` tag is replaced by a per-cell `layer` field set on every paint.

```ts
// clean-room sketch of a layered minimap: dirty-cell set with a one-half full-rebuild rule, per-cell layer tag, fog memory from the youngest record (shape only, GPL-2.0-or-later donor)
type Vis = "hidden" | "fog" | "seen";
type Obj = "none" | "tree" | "granite" | "building" | "road";
type Layer = "hidden" | "terrain" | "player" | "building" | "road";
type Toggle = "territory" | "houses" | "roads";

interface Rec { obj: Obj; owner: number; time: number } // what a viewer last saw on a cell
interface Ally { rec: Rec; inFog: boolean }
interface Cell {
  vis: Vis;            // local viewer visibility
  own: Rec;            // local viewer's record
  allies: Ally[];      // allied viewers' records, used only with team view
  roadAt: boolean;     // a visible road leaves this cell
  t1: number;          // terrain colour, triangle 0 (0xRRGGBB)
  t2: number;          // terrain colour, triangle 1 (0xRRGGBB)
  shade: number;       // offset added to each channel before the 0x40 bias
  layer: Layer;        // layer tag from the last paint
}
interface Ctx {
  teamView: boolean;
  toggles: Record<Toggle, boolean>;
  playerRgb: (owner: number) => number;
}

const TREE = 0x003c14;
const GRANITE = 0xa2a2a2;
const BUILDING = 0xffffff;
const ROAD = 0xaaaaaa;

// The local record, replaced by an allied fog record that is younger (mirrors the youngest-node lookup).
function youngest(c: Cell, ctx: Ctx): Rec {
  let best = c.own;
  if (ctx.teamView) {
    for (const a of c.allies) {
      if (a.inFog && a.rec.time > best.time) best = a.rec;
    }
  }
  return best;
}

function classify(c: Cell, rec: Rec): Layer {
  if (rec.obj === "tree" || rec.obj === "granite") return rec.owner ? "player" : "terrain";
  if (rec.owner) {
    if (rec.obj === "building") return "building";
    if (c.roadAt) return "road";
    return "player";
  }
  return "terrain";
}

function shade(rgb: number, s: number): number {
  const ch = (v: number): number => Math.min(255, Math.max(0, v + s - 0x40));
  return (ch((rgb >> 16) & 0xff) << 16) | (ch((rgb >> 8) & 0xff) << 8) | ch(rgb & 0xff);
}

function mix(a: number, b: number): number {
  const avg = (s: number): number => (((a >> s) & 0xff) + ((b >> s) & 0xff)) >> 1;
  return (avg(16) << 16) | (avg(8) << 8) | avg(0);
}

function halve(rgb: number): number {
  return (((rgb >> 16) & 0xff) >> 1) << 16 | ((((rgb >> 8) & 0xff) >> 1) << 8) | (((rgb & 0xff)) >> 1);
}

function rgbOf(c: Cell, rec: Rec, layer: Layer, ctx: Ctx, triangle: 0 | 1): number {
  if (layer === "building" && ctx.toggles.houses) return BUILDING;
  if (layer === "road" && ctx.toggles.roads) return ROAD;
  let rgb = rec.obj === "tree" ? TREE : rec.obj === "granite" ? GRANITE : shade(triangle === 0 ? c.t1 : c.t2, c.shade);
  if (rec.owner && ctx.toggles.territory) rgb = mix(rgb, ctx.playerRgb(rec.owner));
  return rgb;
}

function cellColour(c: Cell, ctx: Ctx, triangle: 0 | 1): { layer: Layer; rgb: number } {
  if (c.vis === "hidden") return { layer: "hidden", rgb: 0x000000 };
  const fog = c.vis === "fog";
  const rec = fog ? youngest(c, ctx) : c.own;
  const layer = classify(c, rec);
  const rgb = rgbOf(c, rec, layer, ctx, triangle);
  return { layer, rgb: fog ? halve(rgb) : rgb };
}

class MiniMap {
  private dirty = new Set<number>();
  constructor(
    private readonly w: number,
    private readonly cells: Cell[],
    private readonly out: Uint32Array, // 2 columns per cell
  ) {}

  markDirty(i: number): void {
    this.dirty.add(i);
  }

  // Two columns per cell; odd rows are shifted by one column.
  private px(i: number, t: 0 | 1): number {
    const x = i % this.w;
    const y = Math.floor(i / this.w);
    return y * (2 * this.w) + ((x * 2 + t + (y & 1)) % (2 * this.w));
  }

  private paint(i: number, ctx: Ctx): void {
    const c = this.cells[i];
    for (const t of [0, 1] as const) {
      const { layer, rgb } = cellColour(c, ctx, t);
      c.layer = layer;
      this.out[this.px(i, t)] = rgb | 0xff000000;
    }
  }

  // Called once per draw: rebuild everything when the dirty set reaches half the map, else repaint dirty cells only.
  flush(ctx: Ctx): "none" | "partial" | "full" {
    if (this.dirty.size === 0) return "none";
    if (this.dirty.size >= Math.floor(this.cells.length / 2)) {
      for (let i = 0; i < this.cells.length; i++) this.paint(i, ctx);
      this.dirty.clear();
      return "full";
    }
    for (const i of this.dirty) this.paint(i, ctx);
    this.dirty.clear();
    return "partial";
  }

  // Flip one layer and repaint the cells it affects (and, for territory, buildings and roads that are switched off).
  toggle(which: Toggle, ctx: Ctx): void {
    ctx.toggles[which] = !ctx.toggles[which];
    const hit = (l: Layer): boolean => {
      if (which === "territory") {
        return l === "player" || (l === "building" && !ctx.toggles.houses) || (l === "road" && !ctx.toggles.roads);
      }
      return which === "houses" ? l === "building" : l === "road";
    };
    for (let i = 0; i < this.cells.length; i++) {
      if (hit(this.cells[i].layer)) this.paint(i, ctx);
    }
  }
}

export { MiniMap };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/rttr-layered-minimap.ts`).

## 5. Lands in

- TARGET `src/fight/hud-minimap.ts` (proposed new client module; the minimap is client-only and must not feed the engine). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, no code carried over)
- Brief rule served: 14 (HUD: readability and map at phone width); the client-only boundary (camera, HUD, sound are client-only).

Best transferable idea: Repaint a minimap only for the cells that changed, colour each cell from one fixed priority chain (hidden, cover, owner layers, terrain), and show fogged cells from the most recent remembered record, darkened, with each layer switchable without a full rebuild.
Decision (proposed): adapt — the dirty-cell flush and the layer chain fit a zone map on a 375-px phone; the donor's random brightness is replaced by a fixed per-cell value, and fog memory is client-side only (the server still decides what a player may know).
Acceptance: on a 375-px phone the zone minimap repaints only the cells named in the last server update (a client test counts repaints), and toggling the territory layer leaves every tree shade byte-identical before and after.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room, shape only. The sketch is written from the mechanism.
- Defect 1, random shade at paint time: `VaryBrightness` calls `rand()` (`Minimap.cpp` 47), and it runs each time a tree or granite cell is painted (`IngameMinimap.cpp` 59, 72). A toggle that repaints owned land (territory layer, line 270) therefore re-rolls the shade of every owned tree. fix: derive the variation from a stable hash of the cell (or drop it), so a repaint is idempotent. The sketch uses a fixed colour.
- Defect 2 (limit, not a bug as such): roads and buildings are drawn only on nodes that have an owner (`IngameMinimap.cpp` 86). A road or building on an unowned node shows as terrain. Fine for the donor's rules; state it as a rule if Frankendom uses the same layers.
- Touch UX: none. The only pointer behaviour is mouse down plus move (`ctrlIngameMinimap.cpp` 75-86). The Frankendom version can use the same pointer-move path for touch, but no touch code was found here.
- Input buffer, lock-on, accessibility: none in this donor's minimap. Not searched in the game's key handling beyond the hotkeys read.
- String table: gettext. About 1300 `_("...")` call sites under `libs/s25main` (grep count, .cpp and .h). The translation catalogues are not in this checkout (a search for `.po` and `.pot` to depth 5 under the repo root found none; the `tests/s25Main/locale` folder holds only test code). So the table cannot be counted or read here. Grammar: the English text is the key (for example `_("Outline map")`, iwMinimap.cpp 29); no further grammar is visible in code.
- Frankendom ruling: fog of war is a player's remembered view. In Frankendom it is client display only; the server decides what a player may see, and kills stay server-verified. The donor's team-view merge (GameWorldViewer.cpp 325-343) is a shared-knowledge rule that Frankendom should not copy without a server check.
- The full-rebuild rule (`IngameMinimap.cpp` 206) is tuned for an RTS map. For a zone with fewer cells, a full rebuild is cheap; use the threshold as a measured value, not a rule.
