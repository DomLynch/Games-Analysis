# OpenEnroth-OpenEnroth (hud-ui, cell 2)

Donor: /mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIGame.cpp | Licence: LGPL-3.0 (LICENSE read: GNU LESSER GENERAL PUBLIC LICENSE Version 3; copyleft, clean-room, shape only) | C++ | symbol GameUI_DrawMinimap

Checked: cell 2 = row 2 of cells-HU006.tsv. Hint file UIPopup.cpp does not hold the minimap: grep shows only character-screen tooltip helpers (244-257, 1078-1166). The real radar is GameUI_DrawMinimap, UIGame.cpp 1287-1531, read end to end and called from Engine.cpp:207 with rect (488, 16, 137, 117). Also read: GameUI_GetMinimapHintText (647-668), Viewport.cpp 120-138, GameConfig.h zoom settings (649-670), Rect.h 44-46, TrigLut.h 14, Actor.h 101-103, ActorEnums.h 105, Actor.cpp 2596-2608 (part of an AI loop; function not identified), 2975, 3854-3903 (outdoor AI list, whole), 3906-3976 (indoor AI list, most of it), MapBook.cpp 150-222 (world map, most of it), mm7text_ru.h (whole, 19 lines), mm7text_ru.cpp 684-856 (plural, gender, token expansion), Localization.cpp 46-80, SdlEventLoop.cpp 218-246 (touch). Not read: the caller of the AI-loop at Actor.cpp:2605, the value of meleeRange and of MaxActiveAIActors, the Mastery enum values, the wizard-eye skill function, the wider widget draw loop. Confidence: high on the minimap draw order and the arrow table (checked on the VPS against a transcription of the donor's if-chain for all 2048 yaw values: 0 mismatches). Medium on the nearby-flag source outdoors. String table: global.txt is not in the donor (resources/data holds only resource_mask_table.json), so the translated entry count is not available; the enum LocalizationEnums.h has 681 lines with explicit numeric values (grep count). Camera_scope: not a camera note.

## 1. Mechanism

Outdoor radar, drawn every frame by GameUI_DrawMinimap (UIGame.cpp:1287):

1. Reveal flag (1309-1319): the wizard-eye flag from the party, OR a hired cartographer NPC, OR a debug flag. The reveal gates the object and actor blips.
2. Terrain crop (1328-1349): the outdoor map image is centred on the party. Party position is converted to 16.16 image coordinates; one screen pixel steps W / zoom image pixels; each destination pixel copies one source pixel (nearest neighbour). The crop is rebuilt every frame: partymoved is hard-wired to true (1325).
3. Blips (1416-1511), only inside the reveal: objects drawn as treasure crosses or projectile dots (objects need mastery at or above EXPERT, 1418); actors drawn if not Removed and (Dead or ActorNearby) (1455-1458), coloured friendly, hostile, or corpse; level decorations flagged visible-on-map.
4. Marker size by zoom: actors a 5 px cross above zoom 1024, else 2 px; objects and decorations 5 px above zoom 512.
5. Arrow (1515-1526): yaw masked to 2047, mapped to one of 8 sprites (table in section 3).
6. Compass strip (1528-1529): x = floor(yaw x 0.1171875 + 0.5) + 285, clipped to a 26 px window at x 541.
7. Frame drawn last at (468, 0) (1531).

Awareness that fills the nearby flag (Actor.cpp). Outdoor, MakeActorAIList_ODM (3854-3903): distance = octagonal length minus actor radius, floored at 0; under 5632 the actor becomes active and, if hostile, sets yellow alert under 5120 and red alert under 307; the list is sorted by distance and the first MaxActiveAIActors (config value not read) get the full-AI state. Indoor, MakeActorAIList_BLV (3906-3976): Euclidean length minus radius; under 10240 is a candidate; after the sort the first 30 that can detect the party are flagged ACTOR_NEARBY (3950-3956). Outdoors the NEARBY flag is set in the AI loop at 2604-2605 (function not read in full) and at monster spawn (2975). The minimap gate is therefore the flag, not a radius.

World map: DrawBook_Map_sub (MapBook.cpp:152-217) does the same nearest-neighbour crop at book zoom 384 (161-162 centre; 169 scale). Fog: fully revealed cells show terrain; partially revealed cells alternate grey and terrain in a checkerboard by (i + centre.x + j) % 2 (199-203); unrevealed cells are black (204). The donor's own TODO (153) says this should be merged with the minimap.

Order of operations: reveal flag, then crop, then blips, then arrow, then compass, then frame.

## 2. Key functions

- GameUI_DrawMinimap (UIGame.cpp:1287-1531): the radar.
- GameUI_GetMinimapHintText (UIGame.cpp:647-668): mouse position to world coordinates, using the same zoom (659-663). It is mouse-only (uses mouse->position()).
- Actor::MakeActorAIList_ODM (Actor.cpp:3854-3903) and Actor::MakeActorAIList_BLV (3906-3976): the awareness lists that set active, hostile, nearby and the alert levels.
- DrawBook_Map_sub (MapBook.cpp:152-217): world map with fog.
- SdlEventLoop::dispatchTouchFingerEvent (SdlEventLoop.cpp:220-246): a finger becomes a left mouse press, release, or move; position scaled to the window.

## 3. Numbers vs mechanism

- Zoom is screen pixels per 65536 world units. Defaults: outdoor 512 (range 512-2048), indoor 1024 (range 256-4096) (GameConfig.h:649-670). At outdoor 512, one pixel is 128 world units, so the 137 x 117 rect shows 17,536 x 14,976 units.
- Marker thresholds: actors 5 px above zoom 1024 (so outdoor zoom from just above 1024 up to the 2048 max gives big actor marks, and the 512 outdoor default gives 2 px); objects and decorations 5 px above zoom 512.
- Arrow: 2048 yaw units per turn, 8 sectors, using a chain of if statements where the last match wins. Resulting bands: sector 7 = (1920, 2047] and [0, 127]; 0 = [128, 384]; 1 = [385, 639]; 2 = [640, 896]; 3 = [897, 1151]; 4 = [1152, 1408]; 5 = [1409, 1663]; 6 = [1664, 1920]. Checked against the sketch's table: 0 mismatches over all 2048 values.
- Compass: 0.1171875 = 240 / 2048, so the strip moves 240 px per turn, offset 285, clipped to x 541-566.
- Awareness distances: outdoor active 5632 (octagonal), yellow alert 5120, red alert 307; indoor candidate 10240 (Euclidean), yellow 5120, red at meleeRange (value not read); indoor cap 30 detectors.
- Defect (hover readout): the draw centre is rect.center() = x + w/2 = 488 + 68 = 556 (Rect.h:45, Engine.cpp:207), but the hover readout hard-codes 557 (UIGame.cpp:661). At zoom 512 that is 128 world units of error in x. Fix: take the centre from the same function as the draw.
- Defect (cost): partymoved is hard-wired true (1325), so the terrain is re-sampled every frame; the donor's own comment says this is a TODO. Fix: redraw only on party movement or zoom change.
- Fragile (not wrong): the arrow sectors use a last-match-wins chain with mixed < and <= (1518-1525). The sketch uses one boundary table and matches the donor for every yaw value.
- Limit: the assert at 1340 ties the code to a 137 x 117 rect; only debug builds check it.

## 4. TypeScript sketch

simplified: pure functions, no draw calls; the reveal and nearby flags are booleans passed in; the donor's 16.16 fixed point is replaced by floats in outdoorSourcePixel; the arrow uses one boundary table instead of the donor's if-chain (checked equal over all 2048 yaw values on the VPS). Typechecked on the VPS with tsc --strict --target es2020 (exit 0).

```ts
// Radar minimap rules (client HUD only). Pure functions: no draw calls, no engine state.
// Units: world units (65536 per map side, party at the centre), zoom = screen px per 65536 world units.

export interface Vec2 { x: number; y: number; }
export interface Size { w: number; h: number; }

// Donor: Rect.center() = {x + w/2, y + h/2}; the minimap rect is 137 x 117 at (488, 16).
export function rectCentre(x: number, y: number, w: number, h: number): Vec2 {
  return { x: x + Math.trunc(w / 2), y: y + Math.trunc(h / 2) };
}

// Donor: pPoint = centre + delta * zoom / 65536 (float, then truncated to int). Screen y is flipped.
export function worldToMinimapPx(dx: number, dy: number, zoom: number, centre: Vec2): Vec2 {
  return {
    x: Math.trunc(centre.x + (dx * zoom) / 65536),
    y: Math.trunc(centre.y - (dy * zoom) / 65536),
  };
}

// Outdoor terrain crop: the image is imgW px square and covers 65536 world units; the party is at its centre.
// Nearest-neighbour sampling; one screen px steps imgW / zoom image px (donor: 16.16 fixed point).
export function outdoorSourcePixel(partyX: number, partyY: number, dstX: number, dstY: number,
                                   rect: Size, zoom: number, imgW: number): Vec2 {
  const step = imgW / zoom;
  const partyPx = { x: ((partyX + 32768) / 65536) * imgW, y: ((32768 - partyY) / 65536) * imgW };
  return {
    x: Math.floor(partyPx.x - (rect.w / 2) * step + dstX * step),
    y: Math.floor(partyPx.y - (rect.h / 2) * step + dstY * step),
  };
}

// Marker size grows with zoom. Donor: actors 5 px cross above zoom 1024, else 2 px; objects and decorations above 512.
export function actorMarkerPx(zoom: number): number { return zoom > 1024 ? 5 : 2; }
export function objectMarkerPx(zoom: number): number { return zoom > 512 ? 5 : 2; }

export interface ActorFlags { removed: boolean; disabled: boolean; dead: boolean; nearby: boolean; }

// Donor: actors are drawn only while the wizard-eye reveal is on, and only if not removed/disabled
// and (dead or nearby). The nearby flag is set by the AI loop (see Checked line; not a radius here).
export function showActorBlip(eyeOn: boolean, a: ActorFlags): boolean {
  if (!eyeOn) return false;
  if (a.removed || a.disabled) return false;
  return a.dead || a.nearby;
}

// Donor: objects need the reveal AND a mastery level at or above EXPERT; the caller passes the numeric threshold.
export function showObjectBlip(eyeOn: boolean, mastery: number, expertLevel: number): boolean {
  return eyeOn && mastery >= expertLevel;
}

// Arrow sector, 8 sprites over 2048 yaw units (donor TrigLUT mask 2047). Boundaries as the donor draws them:
// sector 0 = [128, 384], 1 = [385, 639], ..., 6 = [1664, 1920], 7 = wrap (< 128 or > 1920).
const SECTOR_UPPER = [384, 639, 896, 1151, 1408, 1663, 1920];
export function arrowSector(yaw: number): number {
  const r = yaw & 2047;
  if (r < 128 || r > 1920) return 7;
  for (let k = 0; k < SECTOR_UPPER.length; k++) {
    if (r <= SECTOR_UPPER[k]) return k;
  }
  return 7; // not reached for r in [0, 2047]
}

// Compass strip: 240 px per full turn (0.1171875 = 240 / 2048), offset 285, drawn through a 26 px clip.
export function compassX(yaw: number): number {
  return Math.floor(yaw * 0.1171875 + 0.5) + 285;
}

export {};
```

## 5. Lands in

Target: src/fight/minimap.ts (proposed new client module; the HUD is client-only). Parity row 14 (HUD). The radar reads the snapshot and never decides who is in a fight.

## 6. Gaps and risks

- Cheating risk: the donor's blip gate reads flags the client already holds. In Frankendom the server must send only the presence-gated blips (or the minimap leaks every actor). The gate itself is server-owned; the client only draws.
- Nearby is a flag, not a radius, in the donor. Frankendom should use the engine's engagement set (MAX_ATTACKERS = 3 and the hate list), not a separate radius, so the radar and the fight agree. The donor's 30-detector cap is an AI budget, not a display rule.
- One ledger: the donor's reveal reads the party's skill level (wizard eye) and a hired NPC. Frankendom should read the one character record for any reveal tier (progression), not a second copy.
- The Pit is a fixed arena; a radar does not belong there. The minimap is a world element.
- Touch: the donor's touch path only turns a finger into a left mouse press, release and move (SdlEventLoop.cpp:227-243). The hover readout (GameUI_GetMinimapHintText) reads the mouse position, so on a phone it never shows. Frankendom must design its own tap behaviour; nothing to copy here.
- Readability at 375 wide: the donor's rect is 137 x 117 px on an 800 x 600 screen. At outdoor default zoom the actor marks are 2 px, which will not read on a phone. Frankendom must pick a marker size for 375 px, not reuse 2 px.
- No lock-on and no input buffer in this donor (grep finds none).
- String tables (Buka grammar, for reference): the Russian build uses ^-tokens. ^I[n] records a number; ^L[a;b;c] or ^L<n>[a;b;c] picks a plural form (rule: n mod 100; 11-14 take the many form; last digit 1 takes the first form, 2-4 the second, else the third; no ^I means zero; 783-785, 701-711). ^P<case>[name] records a gender (regular names are not declined; special names are, 806-808, 813-819). ^R[m;f;n] picks an ending by the last gender (795). Malformed tokens copy through. The comment at 834 says the DLL capped stored numbers at 10; the code I read does not cap. Global strings: global.txt, tab-separated index and text, two header lines skipped, CRLF lines (Localization.cpp:47-53); 16 strings are overwritten in code after load (60-75), so the code wins over the file for those keys.
- Licence LGPL-3.0: shape only, no line-by-line translation.

Reuse tag: reuse-candidate (radar with presence-gated blips, zoom LOD markers, 8-sector arrow). Donor licence copyleft; shape only.

Brief rule served: "keep the idea, fix the defect". The 557 hover centre, the every-frame terrain redraw and the fragile arrow chain are fixed in the sketch or in the fix notes. Judged on the mechanism, not the genre.

Best transferable idea: A radar that draws only server-sent, presence-gated blips at a zoom-scaled marker size, with an 8-sector arrow from one yaw table and a compass strip that scrolls 240 px per turn.
Decision (proposed): adapt - keep presence-gated blips, zoom LOD markers and the 8-sector arrow; the server sends the blip list and the client only draws it; the 2 px default marker is replaced with a size chosen for 375 px.
Acceptance: At 375 px wide, a test with a fixed snapshot shows the arrow in sector 3 at yaw 1000 and draws a hostile blip only inside the server's presence gate (for reference, the donor's outdoor active range is 5632 units, but the donor gates on a flag, not that radius); a second test asserts that a hover readout centre equals the draw centre.
