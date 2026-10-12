# xoreos-xoreos (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotor/gui/ingame/minimap.cpp` | Licence: GPL-3.0-or-later (COPYING is GPL version 3; minimap.cpp header: "either version 3 ... or (at your option) any later version") | C++ | symbol `Minimap::setPosition`

Checked: The hint file (`src/engines/dragonage/waypoint.cpp`, 117 lines, read in full) loads designer map-note markers with an icon looked up by type (`gda.getString(_type, "Icon")`); that is a landmark marker, not the minimap. The minimap was found with grep -rln for minimap/mapnote/landmark across `src/`. Read in full: `kotor/gui/ingame/minimap.cpp` (85 lines) and `.h`; `kotor/gui/ingame/hud.cpp` 199-252; `kotorbase/module.cpp` 654-683, 806-810, 1162-1166; `kotorbase/area.cpp` 216-217, 342-352. Set aside after reading: `engines/sonic/areaminimap.cpp` (a pre-rendered image, no mapping). Also read, not written up: `aurora/lytfile.cpp` and `aurora/visfile.cpp` (room layout and room visibility; a second note could cover the room-visibility rule). Confidence: high on the mapping algebra (checked by hand: the two calibration points map back onto the two map points). Medium on the update-trigger claims, because the `IngameGUI::setRotation` wrapper was not read.

## 1. Mechanism

- Each area carries its own two-point calibration in the ARE file, in a `Map` struct: two points on the map image (`MapPt1X/Y`, `MapPt2X/Y`), the same two places in world units (`WorldPt1X/Y`, `WorldPt2X/Y`), and a `NorthAxis` value (area.cpp 343-352).
- The minimap is a 512 x 256 map image (minimap.cpp 40) drawn in a 120 x 120 orthographic view (minimap.cpp 46).
- Mapping a world point to the map is a per-axis linear fit through the two pairs. For north 0: the Y scale is map span over world span (57), then `relY = (y - worldPt1Y) * scaleY + mapPt1Y` (60); X is the same with X (scaleX at 58, relX at 59).
- Centring: the map is translated so the party's map point lands at the view centre: `glm::vec3(-(relX * 435) + 60, -(256 - relY * 256) + 60, 0)` (61). The constants 435, 256 and 60 are not explained in the file.
- North 3 swaps the axes: world Y drives map X and world X drives map Y (65-68).
- Any other north value hits `default`, warns, and falls through to set the matrix (72-76). The matrix set is the one declared at line 52 and never assigned on that path.
- Who calls it, in order (per refresh): `Module::updateMinimap` (module.cpp 677-683) pushes the party-leader position (681) and the camera yaw (682) to `IngameGUI` (wrapper not read). The wrapper is assumed to forward to `HUD::setPosition`, which forwards to the Minimap when it exists (hud.cpp 239-241), and to `HUD::setRotation`, which sets the arrow angle to the yaw on north 0 and yaw minus 90 on north 3 (hud.cpp 244-250).
- Refresh trigger: `updateMinimap` has two callers in `module.cpp` in the code read, `movedPartyLeader` (809) and `notifyPartyLeaderChanged` (1165). Nothing per-frame was found in the callers read. Whether a camera turn reaches `movedPartyLeader` is (not read).

## 2. Key functions

- `Minimap::setPosition`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotor/gui/ingame/minimap.cpp` 51-77. Switch on north axis, linear fit, translate, set matrix.
- `Minimap::Minimap`: same file, 37-49. Builds the map quad (40) and the 120 ortho projection (46).
- `HUD::setMinimap`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotor/gui/ingame/hud.cpp` 221-235. If `LBL_MAPVIEW` is missing it returns early (225-229), leaving `_minimap` as it was; otherwise it builds the Minimap (233) and attaches it to the view (234).
- `HUD::setPosition`: same file, 239-242 (guarded by `if (_minimap)`, 240). `HUD::setRotation`: 244-252 (no guard).
- `Module::initMinimap`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/module.cpp` 654-675 (reads the area's calibration and calls `_ingame->setMinimap`, 672). `Module::updateMinimap`: 677-683.
- Area data: `Area::loadARE` minimap block, `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/area.cpp` 342-352.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-point linear fit per axis: `scale = mapSpan / worldSpan`, `map = (world - w1) * scale + m1` | None |
| Axis swap for the alternate north layout (world Y drives map X) | North value 3 (from the ARE `NorthAxis` field, 352) |
| Centre the party's map point: `translate = centre - rel * mapScale` | 435 and 256 (map scale, meaning not in the file), 60 (centre) |
| Map image and view size | 512 x 256 map quad (40); 120 x 120 view (46) |
| Arrow angle = camera yaw; minus 90 on north 3 | 90 degrees (hud.cpp 250). Arrow uses camera yaw (module.cpp 682), not the party's facing |

The 435 map scale does not match the 512-pixel quad, and the file does not say why (the map image itself was not read). The fit is exact at both calibration points, by algebra: at world point 2 it returns map point 2.

## 4. TypeScript sketch

simplified: keeps the donor's two-point fit, the north-3 axis swap, the centring form with the donor's 435/256/60 as fields, and the 90-degree arrow offset. Omits the glm matrices, the 512x256 quad and its texture, the label lookup, the HUD null checks, the update triggers, and the `export {}` line used only for the typecheck. One donor behaviour changed: a zero world span returns null where the donor divides by zero. The unknown-north path does not exist, because the type allows only 0 or 3.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type NorthAxis = 0 | 3;

interface Pt { x: number; y: number; }

// Per-area calibration: two map points and the same two places in world units, plus the north layout.
interface MinimapCalib {
  northAxis: NorthAxis;
  mapPt1: Pt; mapPt2: Pt;
  worldPt1: Pt; worldPt2: Pt;
}

// Tunable view constants. Donor values in comments; these are data fields, not hard-coded.
interface MinimapView {
  mapScaleX: number;  // 435 in donor
  mapScaleY: number;  // 256 in donor
  centre: number;     // 60 in donor
}

// Linear fit through the two pairs along one axis.
// Returns null for a zero world span, instead of dividing by zero.
function lane(v: number, w1: number, w2: number, m1: number, m2: number): number | null {
  const span = w1 - w2;
  if (Math.abs(span) < 1e-9) return null;
  return (v - w1) * ((m1 - m2) / span) + m1;
}

// World point to normalised map point. North 3 swaps the axes: world Y drives map X, world X drives map Y.
function worldToMap(c: MinimapCalib, x: number, y: number): Pt | null {
  const swap = c.northAxis === 3;
  const relX = swap
    ? lane(y, c.worldPt1.y, c.worldPt2.y, c.mapPt1.x, c.mapPt2.x)
    : lane(x, c.worldPt1.x, c.worldPt2.x, c.mapPt1.x, c.mapPt2.x);
  const relY = swap
    ? lane(x, c.worldPt1.x, c.worldPt2.x, c.mapPt1.y, c.mapPt2.y)
    : lane(y, c.worldPt1.y, c.worldPt2.y, c.mapPt1.y, c.mapPt2.y);
  if (relX === null || relY === null) return null;
  return { x: relX, y: relY };
}

// Offset that puts the party's map point at the centre of the minimap view (donor translate form).
function minimapOffset(p: Pt, v: MinimapView): Pt {
  return {
    x: v.centre - p.x * v.mapScaleX,
    y: v.centre + (p.y - 1) * v.mapScaleY,
  };
}

// Arrow angle in degrees: the camera yaw, minus 90 on the north-3 layout.
function arrowAngle(northAxis: NorthAxis, yawDeg: number): number {
  return northAxis === 3 ? yawDeg - 90 : yawDeg;
}
```

## 5. Lands in

- TARGET `origins/zones/<zone>.ts` (proposed path; not checked against the Frankendom repo): a `minimap` block on each zone's data (the two map points, the two world points, the north flag, the map image id). The 435/256/60 constants become view constants in the client HUD, not zone fields.
- Client HUD: `src/hud/minimap.ts` (proposed; the HUD is client-only, so it does not belong in `src/fight`).
- Parity row 14 (HUD). The batch hint was row 23 (zone population); this mechanism spawns, caps and despawns nothing, so row 23 does not fit.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (calibration is per-zone data); the HUD is client-only; no engine constant for map art.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not a translation.
- Two points fit an axis-aligned map only: no rotation, skew or perspective. A rotated minimap needs more data or another model; whether xoreos has one was not read.
- Defect 1, zero world span. The donor divides by `(_worldPt1X - _worldPt2X)` and the Y equivalent (57, 58, 65, 66) without a check; two world points sharing an X or Y give infinity or NaN. Fix: `lane` returns null and the zone is rejected at load (sketch).
- Defect 2, unknown north value. It warns (73) and still sets a matrix that is never assigned on that path (76). Whether that matrix is the identity depends on glm's default constructor (not read). Fix: the type allows only 0 or 3; reject other values at load.
- Defect 3, unguarded HUD path. `HUD::setRotation` dereferences `_minimap` (245) and `_minimapPointer` (247) with no check; `setPosition` guards `_minimap` (240). `setMinimap` returns early when `LBL_MAPVIEW` is missing (226-228). `reset()` nulls the pointer (200) but leaves `_minimap` alone. Whether a `setRotation` call can run in that window through the `IngameGUI` wrapper (not read) is unknown. Fix: null-guard both in the client.
- Defect 4, stale arrow. If a camera turn does not call `movedPartyLeader`, the arrow lags while the party stands still. Not confirmed (camera controller not read). Fix: refresh the arrow on yaw change, not only on party move. This is a client rule and costs nothing on the server.
- Frankendom rulings: the minimap is client-only and reads zone data. The server must not read it, and no kill or loot ledger depends on it.
- The 435 and 256 constants are not explained. A Frankendom zone must calibrate from its own map art and must not copy them.
- The ARE values for any real area were not opened, so no calibration number here is verified.

Best transferable idea: Store each zone's minimap as two map points and the same two world points, fit a linear map per axis, and centre the party's point, so no zone needs hand-tuned offsets.
Decision (proposed): adapt — the per-zone two-point calibration is the right shape for zones as data; take it, fix the zero-span division and the unguarded HUD path, and do not copy the 435/256 numbers.
Acceptance: A zone whose two world points share an X or Y is rejected at load with a logged error, and at 375 wide the minimap dot stays on the party while walking and the arrow turns with the camera while the party stands still (unit test on `worldToMap` for north 0 and 3, plus a visual check).
