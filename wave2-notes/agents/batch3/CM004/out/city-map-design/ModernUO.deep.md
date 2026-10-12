# ModernUO (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` | Licence: GNU GPL v3 (LICENSE file line 3; MapItemPackets.cs header says v3 or later) | C# | symbol `MapItem.ConvertToMap`

Checked: Read `MapItem.cs` in full (297 lines: SetDisplay 66-91, DisplayTo 106-122, pin commands 127-185, Validate 200-225, ConvertToWorld/ConvertToMap 228-238, AddWorldPin/RemovePin 240-256). Read `CityMap.cs`, `WorldMap.cs`, `LocalMap.cs` in full, the treasure window code in `TreasureMap.cs` 70-108, `PresetMap.cs` class and table head, `TownRegion.cs` in full, and `MapItemPackets.cs` 1-60 (command switch 1-3). Callers of `AddWorldPin` other than `TreasureMap` (Weather.cs:406, Witch Apprentice Objectives.cs:175) were seen only in grep, not read. Confidence high on the projection, pin rules and skill zoom. A grep for town, landmark and signpost found no town or hub layout generator: towns are hand-cut regions (TownRegion.cs, `Entrance` property) and were not read further. camera_scope: not a camera topic.

## 1. Mechanism

- A map item shows a rectangle of the world (`Bounds`, in tiles) as a fixed image of `Width` x `Height` pixels. The mapping is linear with integer math: image px = (world - window origin) x image size / window size (`ConvertToMap`, 234-238), and the reverse for `ConvertToWorld` (228-232).
- Pins are stored in image pixels, not world tiles. Pins are capped at 50 user pins (`MaxUserPins`, line 13). Add and insert refuse when the cap is reached (134, 171).
- Input is clamped to the image (`Validate(ref x, ref y)`, 200-204, to `Width - 1` and `Height - 1`), so a pin cannot leave the picture from the client side.
- Editing is gated (`Validate(Mobile)`, 208-225): the viewer must see the item, be on its map and alive, not be in a secure trade, and then either be a GM or have the item movable, not protected, and be within 2 tiles (line 220). The item cannot be held by a different mobile.
- The window is chosen at craft time from the cartographer's skill (`CraftInit`). CityMap centres on the crafter: half-width `max(64 + skill x 4, 200)` tiles, image `clamp(32 + skill x 2, 200, 400)` px. LocalMap: half-width `64 + skill x 2`, fixed 200 px image. WorldMap keeps a fixed box (1344..1472 by 1600..1728) and widens it by `skill x 20` on each side, image `clamp(25 + skill x 6.6, 200, 400)` px. So more skill gives a wider area and a larger picture.
- `SetDisplay` (66-91) clamps the corners to the world size (5119 x 4095) and stores the bounds. The image size is not changed by the clamp, so a window that hits the world edge is squeezed and its scale changes.
- Order of steps when a player opens a map: double-click within 2 tiles (`OnDoubleClick`, 94-101), then `DisplayTo` (106-122) sends the details, the display window, each pin, and the editable flag. Pin edits arrive as packets (`MapItemPackets.OnMapCommand`, command 1 add, 2 insert, 3 change, 4 remove) and each one runs the same gate.
- Treasure maps (`TreasureMap.cs` 70-108) use a 600 x 600 tile window. The window's origin is the chest minus a random offset of 150..450 tiles, so the chest lands at a random quarter-to-three-quarter point before the edge clamp. The window is then pushed back inside the world, the item is marked protected, and the chest is added as a world pin (`AddWorldPin`, 108).
- No tick. Everything is synchronous, on double-click or on a pin packet.

## 2. Key functions

- `MapItem.SetDisplay`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` 66-91 (edge clamp to 5119 x 4095, bounds from corners).
- `MapItem.ConvertToWorld` / `ConvertToMap`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` 228-238. Y in `ConvertToMap` uses `Width` (line 237), a latent defect; see section 6.
- `MapItem.AddWorldPin` / `AddPin`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` 240-249. No bounds check on the converted point.
- `MapItem.RemovePin`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` 251-256 (`index > 0` at 253).
- `MapItem.Validate(Mobile)`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/MapItem.cs` 208-225 (edit gate, range 2 at 220).
- `CityMap.CraftInit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/CityMap.cs` 17-24 (skill zoom, lines 20-23).
- `WorldMap.CraftInit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/WorldMap.cs` 17-26 (lines 22-25).
- `LocalMap.CraftInit`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/LocalMap.cs` 16-22 (lines 18-21).
- Treasure window and chest pin: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Maps/TreasureMap.cs` 70-108.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| World rectangle to picture pixels, linear, integer, and back | World size 5119 x 4095 tiles (theirs, MapItem.cs 66-91 clamp, values at WorldMap.cs 12 and CityMap.cs 12) |
| Pins stored in picture pixels, clamped on input | Pin cap 50 (theirs, MapItem.cs 13) |
| Edit range for a map pin | 2 tiles (theirs, MapItem.cs 220) |
| Zoom by skill: wider window and bigger picture as skill grows | CityMap: `max(64 + 4 x skill, 200)` tiles and `clamp(32 + 2 x skill, 200, 400)` px (theirs, CityMap.cs 20-21). LocalMap: `64 + 2 x skill` tiles, 200 px (theirs, LocalMap.cs 19). WorldMap: `20 x skill` widening, `clamp(25 + 6.6 x skill, 200, 400)` px (theirs, WorldMap.cs 22-23) |
| Hint window: target at a random quarter to three-quarter point | Window 600 tiles, offset 150..450 tiles (theirs, TreasureMap.cs 73, 76) |
| Pre-drawn windows for named regions | 28 preset entries, each a 200 x 200 px picture with hand-cut bounds (theirs, PresetMap.cs 60 onward) |

## 4. TypeScript sketch

simplified: the sketch keeps the projection, the pin cap, the input clamp via `imageToWorld`, and the CityMap zoom. It omits the donor's SetDisplay edge clamp to the world size, the edit gate (range, protected, GM bypass, trade check), serialization, the WorldMap and LocalMap variants, the preset table, the treasure window, and the packet layer. It also differs from the donor in three places, all marked as fixes: Y uses `imgH` (donor uses `Width`), `addWorldPin` refuses off-map points (donor adds them), and `removePin` allows index 0 (donor does not).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface WorldRect { x: number; y: number; w: number; h: number }

interface MinimapView {
  window: WorldRect;             // world area shown, in tiles
  imgW: number;                  // image size in px
  imgH: number;
  pins: { x: number; y: number }[]; // pins stored in image px
}

const MAX_USER_PINS = 50;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// world tile -> image px (linear; Y uses imgH, the donor's line uses Width there)
function worldToImage(v: MinimapView, wx: number, wy: number): { x: number; y: number; onMap: boolean } {
  const x = Math.floor(((wx - v.window.x) * v.imgW) / v.window.w);
  const y = Math.floor(((wy - v.window.y) * v.imgH) / v.window.h);
  return { x, y, onMap: x >= 0 && y >= 0 && x < v.imgW && y < v.imgH };
}

// image px -> world tile (input clamped to the image first, as the donor's Validate does)
function imageToWorld(v: MinimapView, ix: number, iy: number): { x: number; y: number } {
  const cx = clamp(ix, 0, v.imgW - 1);
  const cy = clamp(iy, 0, v.imgH - 1);
  return {
    x: Math.floor((v.window.w * cx) / v.imgW) + v.window.x,
    y: Math.floor((v.window.h * cy) / v.imgH) + v.window.y,
  };
}

// World-space pin. The donor adds it with no bounds check; here an off-map point is refused.
function addWorldPin(v: MinimapView, wx: number, wy: number): boolean {
  if (v.pins.length >= MAX_USER_PINS) return false;
  const p = worldToImage(v, wx, wy);
  if (!p.onMap) return false;
  v.pins.push({ x: p.x, y: p.y });
  return true;
}

// The donor's RemovePin tests index > 0, so pin 0 cannot be removed. Fixed to >= 0.
function removePin(v: MinimapView, index: number): void {
  if (index >= 0 && index < v.pins.length) v.pins.splice(index, 1);
}

// Cartography-style zoom: the window half-width and image size grow with skill (CityMap rule).
function cityMapView(centreX: number, centreY: number, skill: number): MinimapView {
  const dist = Math.max(64 + Math.floor(skill * 4), 200);
  const size = clamp(32 + Math.floor(skill * 2), 200, 400);
  return {
    window: { x: centreX - dist, y: centreY - dist, w: dist * 2, h: dist * 2 },
    imgW: size,
    imgH: size,
    pins: [],
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file copied to /tmp/modernuo-minimap.ts).

## 5. Lands in

- TARGET `origins/client/minimap.ts` (new, client-only HUD view). This is not `src/fight/`: the rulings place the HUD and minimap on the client, so the engine never reads the view. The projection and zoom are client code; no server check depends on them.
- Parity row 14 (HUD). The category hint row 23 (zone population) does not apply: this donor has no town or spawn layout, only the map view. Pins and the zoom sit in the HUD row.
- today: nothing in Frankendom yet for a minimap (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape and formula only)
- Brief rule served: 14 (HUD: minimap and world map, a fold-in from the coverage review); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not copied.
- Latent defect, idea kept: `ConvertToMap` takes Y from `Width` (MapItem.cs 237). Every window the donor sets is square (200, 300, 400 px), so the bug never shows. Fix: use `Height` (done in the sketch).
- Latent defect: `RemovePin` uses `index > 0` (line 253), so pin 0 can never be removed. Fix: `index >= 0` (done in the sketch).
- Latent defect: `AddWorldPin` converts with no bounds check (242-243). A world point outside the window lands at negative or oversized pixels. Fix: refuse the pin or draw an edge marker (the sketch refuses it).
- Scale change at the world edge: `SetDisplay` (66-91) squeezes the window at the edge but keeps the picture size, so the px-per-tile scale changes near the map border. Fix: shift the window back inside the world instead of shrinking it (as TreasureMap.cs 102-103 does), so the scale is fixed.
- Pin editing by players is a UO habit (range 2 and "not in trade" gate). Frankendom should not add player-editable pins. The useful part is the server-issued marker, not the edit gate. Reject the edit gate.
- Frankendom ruling check: the minimap is client-only, so kills stay server-verified and the one ledger is untouched. Zone size (the world rectangle) is zone data; the pin cap and zoom constants are client tuning.
- Not read: the packet layer beyond command 1-3 (MapItemPackets.cs 61-129), and the map drawing itself (that is in the client, not in this donor).
- Town and hub layout (the cell's hint topic) is not in this donor. The only town code is the hand-cut `TownRegion` class (TownRegion.cs 1-22), with an `Entrance` point. A grep for signpost, landmark, town layout found no generator.

Best transferable idea: Draw a fixed-scale minimap window of the world with pins stored in picture pixels, and for a hint place the target at a random quarter-to-three-quarter point of the window so it is findable but not exact.

Decision (proposed): adapt — keep the world-rect-to-minimap projection, the pin cap and the skill-sized view as client data; fix the Y axis, refuse off-map pins and allow pin 0 removal; reject the UO pin edit gate because players do not edit map pins in Frankendom.

Acceptance: At 375 px wide the minimap shows the hero at its centre, a client test asserts `imageToWorld(worldToImage(p))` lands within 1 tile of `p` on a non-square window, and a pin placed outside the window is refused.
