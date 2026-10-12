# supertuxkart-stk-code (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/track.cpp` (minimap load, mapping and scale), `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/graph.cpp` (`Graph::makeMiniMap`, `Graph::mapPoint2MiniMap`), `/mnt/frankendom-donors/supertuxkart-stk-code/src/states_screens/race_gui.cpp` (minimap size, kart and flag markers) | Licence: GPL-3.0-or-later (`/mnt/frankendom-donors/supertuxkart-stk-code/COPYING` is GPL v3; `track.cpp` header: "either version 3 of the License, or (at your option) any later version"). The data files are under mixed licences and were not used. | C++ (SuperTuxKart) | symbol `Graph::makeMiniMap` (graph.cpp 425), `Track::mapPoint2MiniMap` (track.cpp 838), `Track::loadMinimap` (track.cpp 1228)

Checked: Read `Graph::makeMiniMap` at graph.cpp 425-470 and 500-581 (the bounds, fit and camera; 470-500 and 581 not read in full). Read `Graph::mapPoint2MiniMap` at graph.cpp 590-594. Read the bounds updates at graph.cpp 650-651. Read `Track::mapPoint2MiniMap` at track.cpp 838-851, `Track::loadMinimap` and `Track::updateMiniMapScale` at track.cpp 1228-1272, and the bake calls at track.cpp 768-775 and 828-834. Read `RaceGUI::calculateMinimapSize` at race_gui.cpp 171-222 and the kart loop at race_gui.cpp 664-690, and the flag markers at race_gui.cpp 596-640. Confidence: high on the mapping and the order of the bake and the per-frame markers (read end to end). Moderate on exact pixel alignment of the blit into the HUD rectangle, which I did not read. camera_scope: not applicable (the bake uses a temporary top-down camera; this is a HUD map, not a play camera).
Not read: the body of `Graph::createMesh` and `createMeshSP` (graph.cpp 138-400, 290-420; only their call sites at 449 were read); the lines between 476 and 500 of `makeMiniMap`; the soccer condition that sets `m_minimap_invert_x_z` (track.cpp 746-757, only line 757 read); the code that draws the render target into the HUD rectangle; `draw2DImage` clipping. The default for the user setting `m_minimap_size` (user_config.hpp 1281) was not read.

## 1. Mechanism

- The minimap is a picture, not a live render. It is baked once per track load. `Track::loadArenaGraph` (track.cpp 768-775) and `Track::loadDriveGraph` (track.cpp 828-834) both end with `loadMinimap()` (773, 832).
- `Track::loadMinimap` (track.cpp 1228-1242) asks the race GUI for its minimap size (1235), requests a render target of twice that size (1237-1238; the comment says the double size reduces aliasing), and calls `updateMiniMapScale` (1247-1272). That function sets the ratio between the HUD size and the texture size, for x and y separately (1259, 1264).
- The bake is `Graph::makeMiniMap` (graph.cpp 425-581), in this order: (a) turn fog off for the track (439); (b) create the render target at the requested size (441); (c) build the track mesh flat, in the track colour (449, `createMeshSP` on GLSL, otherwise `createMesh` with flatten; the bodies were not read); (d) for capture-the-flag, grow the bounds to include the flags, each scaled by 1.1 about the world origin first (468, then the min and max at 470-473); (e) the fit: `dz` and `dx` are the bounds' extents (512 for `dz`). If `dz > dx` the centre moves in x by `(dz-dx)*0.5` and `m_scaling = dimension.Width / dz` (531-534). Otherwise the same in z with `m_scaling = dimension.Width / dx` (538-539); (f) a square orthographic camera of side `range` (the longer side) is built (545), placed above the centre, with the up vector along +z so it looks straight down (560), and the frame is rendered once (566); (g) fog is turned back on and the camera removed.
- Bounds come from the road quads: `createQuad` takes the min and max of each quad's four corners (650-651). So the box is the road graph, not the scenery.
- Mapping a point: `Track::mapPoint2MiniMap` (track.cpp 838-851) negates x and z first if `m_minimap_invert_x_z` is set (soccer, 757), then calls `Graph::mapPoint2MiniMap` (graph.cpp 590-593): `px = (x - bb_min.x) * m_scaling` and `py = (z - bb_min.z) * m_scaling`. Then it multiplies by the HUD-to-texture ratio (track.cpp 849-850).
- Per frame, the race GUI places markers through that one function. Each visible kart (not eliminated) is mapped from its smoothed transform (race_gui.cpp 667-680). Flags: the home marker of a flag is drawn only while the flag is away from its base, at alpha 128 (race_gui.cpp 600-601). The flag or its carrier is drawn solid at its current position, using the carrier's smoothed position when the flag is held (race_gui.cpp 612-613).
- The HUD square: the side is the user setting `m_minimap_size` times a split-screen factor (race_gui.cpp 196), times `min(frame width, height) / 480` (195, 221-222). Width and height are set from the same value, so the map is square.

## 2. Key functions

- `Graph::makeMiniMap`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/graph.cpp` 425-581 (read: 425-470, 500-581; the middle was not read).
- `Graph::mapPoint2MiniMap`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/graph.cpp` 590-594.
- `Track::mapPoint2MiniMap`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/track.cpp` 838-851 (invert, map, scale).
- `Track::loadMinimap` and `Track::updateMiniMapScale`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/tracks/track.cpp` 1228-1272.
- `RaceGUI::calculateMinimapSize`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/states_screens/race_gui.cpp` 171-222.
- Kart markers: `/mnt/frankendom-donors/supertuxkart-stk-code/src/states_screens/race_gui.cpp` 667-680.
- Flag markers: `/mnt/frankendom-donors/supertuxkart-stk-code/src/states_screens/race_gui.cpp` 600-613.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bake the zone once from straight above into a square texture | Texture at 2 x the HUD size (theirs, track.cpp 1237-1238) |
| One uniform scale: the longer side fills the map, the shorter side is centred | Scale = map width / longer extent (theirs, graph.cpp 534, 539). No margin in the fit itself. |
| World to map: subtract the bounds minimum, multiply by the scale | None (the subtraction and the multiply) |
| HUD size over texture size, separately per axis | Ratio computed at track.cpp 1259 and 1264 |
| Flag home marker ghosted while away | Alpha 128 (theirs, race_gui.cpp 600); drawn only while away (601) |
| Capture-the-flag bounds grow to include the flags | 1.1 multiplier about the world origin (theirs, graph.cpp 468). This is a defect (see section 6). |
| HUD square side | User setting `m_minimap_size` (user_config.hpp 1281), split-screen factor (race_gui.cpp 196), frame over 480 (race_gui.cpp 193, 195) |

## 4. TypeScript sketch

simplified: the sketch fits the bounds with a margin that is a fraction of the box size (the donor has no margin in the fit, and scales each flag position by 1.1 about the world origin). It adds a `landmarkMarks` function for the ghosted home marker. It omits the render-to-texture bake, the 2x supersample, the fog and mesh steps, the soccer axis invert, the HUD ratio, the icon sizes and the per-frame kart loop. Coordinates are plain x and z numbers; the donor's y flip (`lower_y - y`) is left to the HUD.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bounds { minX: number; minZ: number; maxX: number; maxZ: number; }
interface MapFit { scale: number; originX: number; originZ: number; }
interface Pt { x: number; z: number; }

// Fit the longer side of the bounds to the square map, centre the shorter side.
// The margin is a fraction of the box size, so it is the same for every zone.
function fitSquareMap(b: Bounds, mapPx: number, marginFrac: number): MapFit {
  const dx = b.maxX - b.minX;
  const dz = b.maxZ - b.minZ;
  const span = Math.max(dx, dz);
  if (span <= 0) throw new Error("degenerate bounds");
  const pad = span * marginFrac;
  const range = span + 2 * pad;
  return {
    scale: mapPx / range,
    originX: b.minX - (range - dx) / 2 - pad,
    originZ: b.minZ - (range - dz) / 2 - pad,
  };
}

// World point to map pixels. y is measured up from the bottom edge; the HUD flips it.
function toMap(p: Pt, f: MapFit): { x: number; y: number } {
  return { x: (p.x - f.originX) * f.scale, y: (p.z - f.originZ) * f.scale };
}

interface Landmark { home: Pt; current: Pt; away: boolean; }

// The home marker is ghosted (alpha 0.5) only while the object is away; the current marker is solid.
function landmarkMarks(l: Landmark): { at: Pt; alpha: number }[] {
  const marks: { at: Pt; alpha: number }[] = [];
  if (l.away) marks.push({ at: l.home, alpha: 0.5 });
  marks.push({ at: l.current, alpha: 1 });
  return marks;
}

const fit = fitSquareMap({ minX: -400, minZ: 0, maxX: 400, maxZ: 100 }, 256, 0.05);
console.log(toMap({ x: 400, z: 100 }, fit), landmarkMarks({ home: { x: 0, z: 0 }, current: { x: 10, z: 0 }, away: true }).length);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended, exit 0 (run on 2026-10-12).

## 5. Lands in

- TARGET `origins/zones/minimap.ts` (new module, proposed; no Frankendom file was read for this): the client-side projection of a zone's bounds to one square map, and the landmark marks. It reads zone data (bounds) and server-verified positions; the server never reads it.
- Parity-checklist row 14 (HUD): the minimap and world map are the HUD fold-in named in the addendum. The row 23 hint (zone population) does not fit this mechanism; it is a display projection.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (bounds and landmarks come from zone data); the camera, HUD and sound are client-only (the map never affects a hit or a kill); rules 7-9 n/a

Best transferable idea: fit a zone's bounding box to one square minimap with a single uniform scale (the longer side fills, the shorter side is centred), map every dot and landmark through that one function, and ghost a landmark's home marker while its owner is away.

Decision (proposed): adapt — keep the one-function projection, the square fit and the ghosted home marker; replace the render-to-texture bake with a direct draw of the zone's tile grid at load (the bake is a GPU trick, not the idea); fix the margin so it is a fraction of the box size, not of the coordinates.
Acceptance: on a zone at 375 wide the whole zone fits the square with the longer side touching both edges and the shorter side centred; a test maps a known world point to a known pixel within 1 px; a landmark's home marker shows ghosted while its owner is away and solid where it is now; no minimap value is sent to the server or used in a hit test.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism.
- Capture-the-flag margin (graph.cpp 468): the flag positions are multiplied by 1.1 about the world origin before the bounds grow. The extra margin therefore depends on how far the flag is from the origin, not on the size of the box: a flag at (5, 5) gets about 0.5 units of margin, and a flag at (400, 400) gets 40. Fix: pad the box by a fraction of its own size (as in the sketch), or add a fixed margin in metres.
- Division by zero (graph.cpp 534, 539): if the bounds have no extent in either axis, the scale is width / 0. Not run. Fix: validate zone bounds at load and throw (as the sketch does).
- The bounds come only from road quads (graph.cpp 650-651). Anything off the road graph, such as a building or a landmark on a verge, is outside the bounds and its dot lands outside the square. Whether the HUD clips it was not read. Fix: take the bounds from the zone's walkable grid plus a margin.
- The donor's map is always square (race_gui.cpp 221-222). The single scale is safe only because of that. A non-square HUD was not tested and would need a per-axis fit.
- The markers use smoothed transforms of the karts (race_gui.cpp 678-680). Frankendom dots must use server-verified positions, and the map must never be a source for a hit test or a kill.
- The donor bake depends on the rendering path (createMeshSP on GLSL, or createMesh with flatten), which was not read in full. Frankendom's zones are tile grids, so a canvas draw at load is enough.
- The soccer invert (track.cpp 757) changes the map orientation for one team. Its condition (746-757) was not read beyond line 757.
