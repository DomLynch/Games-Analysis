# OpenEnroth-OpenEnroth (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIGame.cpp` (minimap draw, `GameUI_DrawMinimap` 1287) with the discovery reveal in `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 541-556 | Licence: GNU LGPL v3 (LICENSE file, lines 2-3: "GNU LESSER GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007") | C++ | symbol `GameUI_DrawMinimap`

Checked: The hinted file `src/Engine/Data/MapData.h` was read in full (46 lines). It is a per-map metadata struct (name, file name, encounter monster names, respawn interval in days, encounter chances, treasure level, music). It is zone data shape, not a city layout, so it is cited only in section 6. Read in full: `GameUI_DrawMinimap` (UIGame.cpp 1287-1530, outdoor branch and object marks; the indoor branch 1361-1415 was not read in full), `GameUI_GetMinimapHintText` (645-672, zoom constant only), `Outdoor.cpp` `UpdateDiscoveredArea` and the two reveal queries (541-572), `OutdoorTerrain.h` `worldToGrid` (25-40), `Game.cpp` zoom setter and buttons (108-115, 1434-1448), `GameConfig.h` zoom settings (649-672). Read in part: `Outdoor.cpp` 185-200 (call site of the reveal) and 423-450 (minimap image load). Grep only: `Viewport.cpp` 129-135 (zoom defaults), `Engine.cpp` 207 (draw call), `MapBook.cpp` 196-197 and 330 (world map book reads the reveal). Not in the box: `mapstats.txt` (the table; `resources/` holds only CMakeLists.txt), so the per-map data values were not read. Grep for "landmark", "signpost", "signage" returned no hits. Candidates opened: MapData.h, MapTable.cpp (loader comment only, 19-22), UIGame.cpp, Outdoor.cpp, OutdoorTerrain.h, Game.cpp, GameConfig.h, MapBook.cpp (grep). Confidence high on the minimap (projection, zoom, marks) and the reveal mask; not read: `Actor::ActorNearby` (used at UIGame.cpp 1458), `TrigLUT` (1517), the town layout, roads, buildings, signage (none found). camera_scope: not a camera topic.

## 1. Mechanism

- Minimap source: the outdoor minimap is a pre-rendered picture of the whole location, loaded by the map file's name without its extension (`Outdoor.cpp` 446-449). The minimap is not drawn from geometry.
- Crop, every frame (the `partymoved` flag is always true, TODO at 1325, so the crop is rebuilt each draw):
  (a) the party's world position (x and y, each in -32768..32767) is converted to picture pixels as `(pos + 32768) * imageWidth / 65536`, with y flipped so north is up (1332-1333);
  (b) the screen rect's half size is scaled by zoom: left = centre - (rect.w / 2) * (imageWidth / zoom), and the same for the top (1336, 1343);
  (c) each screen pixel samples the picture at nearest neighbour: source index = left + x * imageWidth / zoom (1346-1348). There is no bounds check (see section 6).
- Zoom: the zoom value is a plain factor. World units per screen px = 65536 / zoom (the constant 0.000015258789 is 1/65536, at line 659). Outdoor zoom is clamped to 512..2048 and indoor to 256..4096 (Game.cpp 108, 111). The zoom buttons double and halve it (1439, 1446), then clamp. Defaults: outdoor 512 (GameConfig.h 652), indoor 1024 (649).
- Object marks, drawn after the crop (1416-1500), each as a dot at `centre + (world - party) * zoom / 65536` (1493 shows the decoration case):
  - the whole mark block (object sprites, actors and decorations) sits inside `if (bWizardEyeActive)` at Expert mastery or better (1417-1511), so with the wizard eye off no marks are drawn at all (1417-1418; the cartographer NPC or the debug flag also turn it on, 1311-1316);
  - actors only when dead or nearby (1458);
  - decorations only when flagged visible on the map (1492);
  - mark size steps up at zoom > 512 for objects and for decorations (1435, 1501) and at zoom > 1024 for actors (1471).
- Heading: an arrow sprite is chosen from yaw by a chain of eight comparisons (1517-1528), and a compass strip is offset by `floor(yaw * 0.1171875 + 0.5) + 285` px (1529).
- Discovery reveal, per drawn frame (`Outdoor.cpp` 195): the party's grid cell from `worldToGrid` (512 world units per cell, x = (wx >> 9) + 64, y = 63 - (wy >> 9); `OutdoorTerrain.h` 33-39). Around that cell, within a squared distance of 100 (radius 10) a cell is marked partly revealed, and within 49 (radius 7) fully revealed (541-551). The mask is 88 x 88 cells, one bit per cell (560-572). The world map book reads the fully-revealed bit (`MapBook.cpp` 196).

## 2. Key functions

- `GameUI_DrawMinimap`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIGame.cpp` 1287-1530. Crop 1321-1357; object marks 1416-1500; decorations 1492-1502; heading and compass 1517-1529.
- `GameUI_GetMinimapHintText`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIGame.cpp` 645-672 (inverse of the same zoom: world = party + (pixel - centre) / (zoom / 65536)).
- `OutdoorLocation::UpdateDiscoveredArea`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 541-556.
- `IsMapCellFullyRevealed` / `IsMapCellPartiallyRevealed`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 559-572.
- `worldToGrid`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/OutdoorTerrain.h` 33-40.
- Zoom clamp and steps: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Application/Game.cpp` 108-115 and 1439-1446; defaults `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Application/GameConfig.h` 649-672.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Party-centred crop of one location picture, nearest-neighbour sampling | Screen rect 137 x 117 px, asserted (theirs, UIGame.cpp 1340); placed at 488, 16 (theirs, Engine.cpp 207) |
| Zoom as a plain factor: world units per px = 65536 / zoom | Outdoor zoom 512..2048, default 512 (theirs, Game.cpp 111; GameConfig.h 652). Indoor 256..4096, default 1024 (theirs, Game.cpp 108; GameConfig.h 649). Derived: at outdoor 512 the 137 px rect spans about 17,500 world units (137 x 128) |
| Zoom in and out by doubling and halving, then clamp | x2 and /2 (theirs, Game.cpp 1439, 1446) |
| Mark size steps with zoom | Object and decoration marks above 512, actor marks above 1024 (theirs, UIGame.cpp 1435, 1501, 1471) |
| Discovery: two rings of cells, full inside radius 7 and partly known inside radius 10 | 7 and 10 cells (theirs, Outdoor.cpp 547, 550: squared 100 and 49). Derived: 7 cells = 3,584 world units, 10 cells = 5,120 |
| Grid window: 88 cells inside a 128-cell world grid, 512 units per cell | 88 (theirs, Outdoor.cpp 560); 512 units (theirs, OutdoorTerrain.h 38, shift 9); offset 64 and 20 (theirs, 38 and 543) |
| Expert mastery gate on object marks | Expert (theirs, UIGame.cpp 1418) |

## 4. TypeScript sketch

simplified: the sketch keeps the party-centred crop with its scale, the zoom factor and clamps, the zoom steps, the world-to-screen formula, the mark-size steps, the discovery grid conversion and the two rings. It omits: the indoor branch and its blue-face outlines, the wizard-eye and cartographer gates, the actor and decoration filters, the arrow and compass drawing, the 16.16 fixed-point arithmetic (the sketch uses plain numbers), the per-frame cache check (the donor always rebuilds), and the MapBook. It differs from the donor in three places, marked "fix": a sample outside the picture is left transparent (the donor reads with no check), the reveal loop covers -10..10 (the donor covers -10..9), and the reveal mask is one byte per cell here (the donor packs eight cells per byte).

```ts
// Licence: LGPL-3.0 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const REVEAL_SIDE = 88;     // revealed-cell grid per side (donor: 88 x 88 bit masks)

interface LocationImage { w: number; h: number; pixel(x: number, y: number): number }

// Zoom is a plain factor: screen px per world unit = zoom / 65536, so world units per px = 65536 / zoom.
// Outdoor zoom is clamped to 512..2048, indoor to 256..4096 (donor Game.cpp 108 and 111).
function clampZoom(zoom: number, outdoor: boolean): number {
  return outdoor ? Math.min(2048, Math.max(512, zoom)) : Math.min(4096, Math.max(256, zoom));
}

// Zoom in and out double or halve, then clamp (donor Game.cpp 1439 and 1446).
function zoomIn(zoom: number, outdoor: boolean): number { return clampZoom(zoom * 2, outdoor); }
function zoomOut(zoom: number, outdoor: boolean): number { return clampZoom(Math.floor(zoom / 2), outdoor); }

// World -> screen px around the minimap centre (north-up: +y world is up on screen).
function worldToScreen(
  cx: number, cy: number, wx: number, wy: number, partyX: number, partyY: number, zoom: number,
): { x: number; y: number } {
  return {
    x: cx + ((wx - partyX) * zoom) / 65536,
    y: cy - ((wy - partyY) * zoom) / 65536,
  };
}

// Party-centred crop of the location picture into a screen rect (donor: GameUI_DrawMinimap).
// Picture px per screen px is imageWidth / zoom. Fix: a sample outside the picture is left transparent
// (the donor indexes the row and column with no bounds check).
function sampleMinimap(
  img: LocationImage, rectW: number, rectH: number, partyX: number, partyY: number, zoom: number,
): number[] {
  const pxPerScreen = img.w / zoom;
  const centreX = (partyX + 32768) * img.w / 65536;   // world -32768..32767 to picture px
  const centreY = (32768 - partyY) * img.w / 65536;   // north is up in the picture
  const left = centreX - (rectW / 2) * pxPerScreen;
  const top = centreY - (rectH / 2) * pxPerScreen;
  const out: number[] = new Array(rectW * rectH).fill(0);
  for (let y = 0; y < rectH; y++) {
    for (let x = 0; x < rectW; x++) {
      const sx = Math.floor(left + x * pxPerScreen);
      const sy = Math.floor(top + y * pxPerScreen);
      if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue; // fix: transparent off the picture
      out[y * rectW + x] = img.pixel(sx, sy);
    }
  }
  return out;
}

// Object mark size: larger marks above zoom 512 and 1024 (donor UIGame.cpp 1435 and 1471).
function markStyle(zoom: number): { objects: 'large' | 'small'; actors: 'large' | 'small' } {
  return { objects: zoom > 512 ? 'large' : 'small', actors: zoom > 1024 ? 'large' : 'small' };
}

// Discovery reveal: the party's grid cell, 512 world units per cell (donor OutdoorTerrain.h worldToGrid).
function worldToGrid(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (Math.floor(wx) >> 9) + 64,
    y: 63 - (Math.floor(wy) >> 9),
  };
}

interface Reveal { partial: Uint8Array; full: Uint8Array } // one byte per cell here; the donor packs 8 cells per byte

// Donor: UpdateDiscoveredArea, called once per drawn frame. Cells within radius 10 become partly known,
// cells within radius 7 become fully known. Fix: the donor loops -10..9, so its east and south edge is cut.
function revealAround(r: Reveal, gx: number, gy: number): void {
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const d2 = i * i + j * j;
      const y = gy + i - 20;       // the donor's fixed 20-cell offset into the 128-cell grid
      const x = gx + j - 20;
      if (d2 > 100 || x < 0 || y < 0 || x >= REVEAL_SIDE || y >= REVEAL_SIDE) continue;
      r.partial[y * REVEAL_SIDE + x] = 1;
      if (d2 <= 49) r.full[y * REVEAL_SIDE + x] = 1;
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file copied to /tmp/openenroth-minimap.ts).

## 5. Lands in

- TARGET `origins/client/minimap.ts` (new, client-only HUD view: the crop, the zoom steps and the marks). The rulings place the HUD on the client, so this is outside `src/fight/`. The discovery mask is progression state, so it belongs on the character record and is saved on the server; the client only reads it (Lead to confirm where the record lives).
- Parity row 14 (HUD: minimap and world map, a fold-in from the coverage review). The category hint row 23 (zone population) does not fit this donor's minimap, which has no spawn or town logic.
- today: nothing in Frankendom yet for a minimap (not read in this pass).
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only, shape and formula only)
- Brief rule served: 14 (HUD minimap and world map, client-only); rule 1 (one engine) for the reveal state being a server record, not a client flag

## 6. Gaps and risks

- LGPL-3.0 is copyleft for this purpose: clean-room only. The sketch is written from the described mechanism.
- Cell 3 asks about city and town layout, roads, buildings, signage and landmarks. None of these is in this donor. Grep for landmark, signpost and signage returned nothing. Towns are authored map files and `mapstats.txt`, and `mapstats.txt` is not in the box (`resources/` holds CMakeLists.txt plus data/, images/, scripts/ and shaders/, none of which has it). Only the minimap and the reveal answer the cell.
- Defect, idea kept: the minimap sample has no bounds check (UIGame.cpp 1346-1348). Near the edge of the location picture the index can leave the picture. The donor is C++ and an out-of-range index is undefined behaviour; I did not run it. Fix: leave the pixel transparent off the picture (done in the sketch).
- Defect, idea kept: the reveal loop runs `i < 10` and `j < 10` (Outdoor.cpp 542 and the matching j loop), so the offsets +10 are never visited and the east and south edge of the radius-10 ring is cut. Fix: `<= 10` (done in the sketch).
- Unexplained, not a defect: the reveal window has a fixed -20 offset (543). Inferred from `worldToGrid`'s +64 and the 88 bound that it places the 88-cell mask inside the 128-cell world grid. The donor has no comment that says so. (Inferred.)
- Cost, not a bug: `partymoved` is always true (1325, TODO), so the crop is rebuilt every frame. Fix for us: cache by party cell and zoom.
- Fragile, not wrong as written: the arrow sprite is chosen by eight overlapping comparisons (1517-1528) that work only because the thresholds fall in order. Fix: a table of eight sectors.
- Frankendom rulings: the minimap draws what the client has. In a server-verified game the server must send only the marks the player may see, or a cheat client can read hidden enemy positions from the minimap. The donor reads positions from its own local game state and has no server-side filter to copy. This is the main risk.
- The wizard-eye gate (1417-1418) is a skill gate on all minimap marks (objects, actors, decorations). It is a good data idea for scouting: a skill tier decides which marks reach the client. Keep it as data, not a constant.
- Phone size: the donor's 137 x 117 px rect is fixed (1340). At 375 px wide the rect must be sized to the screen, and the mark sizes (1-5 px) need checking at that width.
- Not read: `Actor::ActorNearby` (the nearby rule for actor marks), `TrigLUT`, the indoor branch (1361-1415) and its blue-face outline, `MapBook.cpp` beyond the two reads, and the per-map data (`mapstats.txt`, not in the box).

Best transferable idea: Draw the minimap as a party-centred, north-up crop of one location picture at a clamped power-of-two zoom, and reveal the map in two rings (fully known within 7 cells, partly known within 10) as the party walks.

Decision (proposed): adapt — keep the party-centred crop, the clamped zoom ladder, the two-ring reveal and the mark-size steps as client data; fix the off-picture sample, the symmetric reveal loop and the one-byte-per-cell mask (bitset); adapt the wizard-eye skill gate into a server-side scouting tier for which marks are sent; reject sending marks the player cannot see.

Acceptance: At 375 px wide the minimap shows the hero at its centre; the zoom-in button doubles the scale and stops at the clamp; the explored area grows as the hero walks (fully known within 7 cells, partly known within 10); a client test asserts that the reveal loop covers -10 to 10 on both axes; and a server test asserts that a hidden enemy's position is not in the minimap payload.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Note said resources/ holds only CMakeLists.txt; it also has data/, images/, scripts/, shaders/ (mapstats.txt still absent).
- Note said only objects (and actors) depend on the wizard eye; the whole mark block incl. actors and decorations is inside if(bWizardEyeActive) (1417-1511).
- Mark-size row omitted decorations stepping at zoom > 512 (1501).

Fixed 2026-10-12: resources/ listing, wizard-eye gate scope, decoration step (1501) in the mark-size lines and numbers table.
