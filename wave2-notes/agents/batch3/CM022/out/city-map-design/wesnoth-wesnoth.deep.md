# wesnoth-wesnoth (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/minimap.cpp` (with `src/color_range.hpp`, `src/team.cpp`, `src/game_config.hpp`, `data/core/team-colors.cfg`, `data/core/terrain.cfg`) | Licence: GPL-2.0-or-later (`src/minimap.cpp` header: "either version 2 of the License, or (at your option) any later version"; `COPYING` is GPL version 2, June 1991) | C++ | function `image::prep_minimap_for_rendering`

Checked: opened all of src/minimap.cpp (1-329) in full; src/color_range.hpp 72-82 (colour range indices); src/team.cpp 948-953 (side minimap colour); src/game_config.hpp 166 (declaration); data/core/team-colors.cfg 1-30 (format), 61-63 (white), 139-141 (reef), 199-201 (cave); data/core/terrain.cfg 1-16 (id link); COPYING 1-5. Not read: the viewer's `shrouded()` and `fogged()` implementations (src/display.hpp declares them at 360 and 363 only), `unit::invisible()` and `get_hidden()`, the orb-status helper, the minimap preference defaults (not found in src/preferences/*.cpp), the terrain overlay images, and every caller of `prep_minimap_for_rendering`. camera_scope: n/a. Confidence: high on the order of operations, the cell-size tiers and the colour arithmetic; medium on what "shroud" and "fog" mean for a player, since the viewer code was not read.

## 1. Mechanism

- Settings read once per call (48-52): draw terrain, terrain colour-coding (images versus colours), draw villages, draw units, and unit movement-coding (side colour versus orb colour).
- Cell size (54-66): 4 px per hex when terrain drawing or terrain coding is off (56-57). Otherwise 8 px per hex when the larger map side is over 60 (58-59), 16 px when over 40 (60-61), and 24 px otherwise (62-63; the value is on a short line, so it has no receipt).
- Canvas size (70-71): width = map width x cell x 3/4 (hex columns overlap at three-quarter pitch), height = map height x cell. Return nothing if the map is empty or nothing is to be drawn (74-81).
- Visibility predicates (83-93): a blindfolded player sees everything shrouded (87). A hex is fogged only if it is not shrouded and the viewer reports fog (92). A shrouded hex is deliberately not treated as fogged, "no need to fog a black image" (91).
- Hex placement (98-105): x = column x 3/4 cell minus cell/4; y = row x cell + cell/4 (odd column) or minus cell/4 (even column), minus cell/4. So odd columns sit at row x cell and even columns half a cell higher (stagger).
- Render into an offscreen texture, cleared first (109-120).
- Terrain pass (125-221), per hex, in this order: `highlighted` if it is on the reach map and not shrouded (127); a shrouded hex takes the void terrain (129-131).
  - Terrain-image path (139-169): blit the terrain's minimap image; for combined terrains blit the overlay (147-153); blit a fog overlay image if fogged (158-162) and a highlight overlay image if reachable (164-168). The comments say these are 40% black and 40% white. The images were not read.
  - Colour path (170-219): colour = the `rep()` (fourth hex value) of the terrain's colour range (178-181). For each underlying terrain of a combined hex (185-215): look up its range, return without drawing if missing (189-191); darken each channel by 50 if fogged (195-199); lighten by 50 if reachable (201-205); the first underlying colour is taken, later ones are blended as `col - (col - tmp) / 2` (207-214). Fill the hex at three-quarter width (217-218).
- Village pass (226-262): skip a village that is shrouded or fogged (228). Default colour is the "white" range's `min()` (235-238). If the village has an owning side: side colour when movement-coding is on or there is no viewer (244-245); otherwise own (unmoved), enemy or allied preference colour (247-253). Fill at three-quarter width (257-260).
- Unit pass (267-298): skip a unit that is fogged, invisible to an enemy, or hidden (273-275). Colour = side minimap colour (277). If movement-coding is off, colour = orb colour by status: enemy, own side (via the orb-status helper), or allied (279-291). Fill at three-quarter width (293-296).
- Output (303-326): the returned function fits the raw texture into the destination box, keeping the aspect ratio: ratio = min(box w / raw w, box h / raw h) (307-310); size as integers (313-314); centred inside the box (317-318); blit (322); return the rectangle actually used (325).

Data table (the source of the colours):
- `data/core/team-colors.cfg` has one `[color_range]` per id. Its `rgb` has four hex values: average (mid), highlight max, shadow min, and marker colour (the file comment at line 7). In code, `min()` is the third value and `rep()` the fourth (src/color_range.hpp 78-79). Examples: white `E1E1E1,FFFFFF,1E1E1E,FFFFFF` (62), reef `...,2F8399` (140), cave `...,3C355C` (200).
- Terrain ids in `data/core/terrain.cfg` are the same ids as the colour ranges (line 10 comment), so a terrain's minimap colour is data, not code.
- A side's minimap colour is `rep()` of its side colour range (`src/team.cpp` 952).

## 2. Key functions

- `prep_minimap_for_rendering`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/minimap.cpp` 40-327 (the whole minimap, returned as a draw closure).
- Cell size tiers: minimap.cpp 54-66.
- Visibility predicates: minimap.cpp 83-93.
- Hex placement: minimap.cpp 98-105.
- Terrain colour arithmetic: minimap.cpp 170-219.
- Village owner colour: minimap.cpp 226-262.
- Unit visibility and colour: minimap.cpp 267-298.
- Fit to box: minimap.cpp 303-326.
- Colour range fields: `/mnt/frankendom-donors/wesnoth-wesnoth/src/color_range.hpp` 72-82.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cell size from the larger map side | 4 when drawing is off; 8 above 60; 16 above 40; 24 otherwise (theirs, minimap.cpp 56-63) |
| Three-state visibility: shroud is void, fog dims, clear is full | Shroud is void (theirs, 130); fog dims by 50 per channel (theirs, 196) |
| Reachable cells lighten | +50 per channel (theirs, 202) |
| Multi-terrain hex blends its parts | Half-weight blend `col - (col - tmp) / 2` (theirs, 211-213) |
| Hex pitch and fill width | Three-quarter width (theirs, 70, 217, 258, 294) |
| Hex stagger | Odd columns half a cell lower than even (theirs, 101) |
| Owner colour relative to the viewer | Three preference colours: own (unmoved), enemy, allied (theirs, 247-253) |
| Neutral village colour | Third hex of the "white" range, 1E1E1E (theirs, team-colors.cfg 62; color_range.hpp 78; minimap.cpp 235-237) |
| Aspect-preserving fit | Ratio is the smaller of the two box ratios (theirs, 307-310) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the visibility predicates (shroud before fog), the cell-size tiers, the hex rectangle, the terrain colour rule (darken or lighten per underlying terrain, then the same blend), the village and unit draw tests, and the aspect fit. It omits: the overlay images and the terrain-image path, the void terrain, the offscreen texture, the orb-status helper, the viewer and preference lookups (passed in as plain values), the missing-range early return (the sketch returns null instead), and the drawing calls. It changes nothing else on purpose.

```ts
// Licence: GPL-2.0-or-later (donor; src/minimap.cpp header and COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rgb = { r: number; g: number; b: number };

// Three-state visibility, in donor order: a shrouded hex is never "fogged" (black, void terrain); fog dims it.
type Vis = 'shroud' | 'fog' | 'clear';
function visibility(shrouded: boolean, fogged: boolean): Vis {
  if (shrouded) return 'shroud';
  return fogged ? 'fog' : 'clear';
}

// Cell size in pixels from the larger map side. Terrain off or colour-coding off gives 4.
function cellPx(maxSide: number, drawTerrain: boolean, coding: boolean): number {
  if (!drawTerrain || !coding) return 4;
  if (maxSide > 60) return 8;
  if (maxSide > 40) return 16;
  return 24;
}

// Hex top-left on the minimap. Columns alternate: odd columns sit at y * cell, even columns half a cell higher.
function hexRect(x: number, y: number, cell: number): { x: number; y: number; w: number; h: number } {
  const q = Math.floor(cell / 4);
  const odd = x % 2 === 1;
  return {
    x: Math.floor((x * cell * 3) / 4) - q,
    y: y * cell + q * (odd ? 1 : -1) - q,
    w: cell,
    h: cell,
  };
}

// Fill width is three quarters of the cell, so neighbouring columns meet.
function fillWidth(cell: number): number { return Math.floor((cell * 3) / 4); }

// Colour of a terrain hex made of one or more underlying terrains.
// Each underlying colour is darkened by 50 when fogged and lightened by 50 when reachable, then blended in turn.
function terrainColour(underlying: Rgb[], fogged: boolean, reachable: boolean): Rgb | null {
  if (underlying.length === 0) return null;
  let col: Rgb | null = null;
  for (const base of underlying) {
    const t: Rgb = {
      r: fogged ? Math.max(0, base.r - 50) : base.r,
      g: fogged ? Math.max(0, base.g - 50) : base.g,
      b: fogged ? Math.max(0, base.b - 50) : base.b,
    };
    const u: Rgb = reachable
      ? { r: Math.min(255, t.r + 50), g: Math.min(255, t.g + 50), b: Math.min(255, t.b + 50) }
      : t;
    if (col === null) {
      col = u;
    } else {
      // Donor blend: col - (col - tmp) / 2, integer maths.
      col = {
        r: col.r - Math.trunc((col.r - u.r) / 2),
        g: col.g - Math.trunc((col.g - u.g) / 2),
        b: col.b - Math.trunc((col.b - u.b) / 2),
      };
    }
  }
  return col;
}

// Village colour relative to the viewer. Neutral uses the range's shadow value (third hex of the "white" range).
type Owner = { kind: 'neutral' } | { kind: 'mine' } | { kind: 'enemy' } | { kind: 'allied' };
interface VillagePrefs { mine: Rgb; enemy: Rgb; allied: Rgb; neutral: Rgb }
function villageColour(owner: Owner, prefs: VillagePrefs): Rgb | null {
  switch (owner.kind) {
    case 'neutral': return prefs.neutral;
    case 'mine': return prefs.mine;
    case 'enemy': return prefs.enemy;
    case 'allied': return prefs.allied;
  }
}

// A village in shroud or fog is not drawn; a unit in fog, or invisible to an enemy, or hidden, is not drawn.
function villageDrawn(vis: Vis): boolean { return vis === 'clear'; }
function unitDrawn(fogged: boolean, enemyInvisible: boolean, hidden: boolean): boolean {
  return !(fogged || enemyInvisible || hidden);
}

// Fit the raw minimap into a box, keeping its aspect ratio, centred. Returns the rect actually used.
function fitRect(raw: { w: number; h: number }, box: { x: number; y: number; w: number; h: number }) {
  const ratio = Math.min(box.w / raw.w, box.h / raw.h);
  const w = Math.trunc(raw.w * ratio);
  const h = Math.trunc(raw.h * ratio);
  return {
    x: box.x + Math.trunc((box.w - w) / 2),
    y: box.y + Math.trunc((box.h - h) / 2),
    w,
    h,
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm022-wesnoth-minimap.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/minimap.ts` (the same HUD module as cell 1, new; client only). Hub and camp colour is set from server-owned data; the client only picks the colour. Parity-checklist row 14 (HUD). The batch hint said row 23; I used row 14 because a minimap is HUD and row 23 is spawn logic. Lead to confirm.
- Today: the Frankendom minimap state was not read (outside the donor and this folder).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: hub ownership and visibility come from the server, the client only draws them); 7 (client-only HUD)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Defect 1, neutral village colour (minimap.cpp 234-237). The code says "white" but takes `min()`, the third value 1E1E1E (near-black), not the marker colour FFFFFF. The TODO at line 234 says this colour should have its own key. Whether the dark colour is intended is not known from the code. Fix: give neutral hubs an explicit colour key in data, and set its value on purpose.
- Defect 2, missing colour range (minimap.cpp 189-191). A hex whose terrain has no `[color_range]` is returned early, so it stays transparent: a hole in the minimap. Fix: fall back to a data default colour and log the missing id once.
- Defect 3, null display (minimap.cpp 285). The orb-status call dereferences `disp` with no null check, while line 273 checks `disp`. Whether `disp` can be null on this path was not read. Fix: take the same null check, or pass the status in.
- Derived, not run: the blend (minimap.cpp 207-214) is order-dependent. For a hex of three parts the result is `c1/4 + c2/4 + c3/2`, so the last listed terrain carries half the weight. Fix: sort the parts or weight them explicitly in data.
- Risk 4, fog dim amount is a fixed 50 per channel (196-202). It does not scale with the colour, so a dark terrain can go to black under fog. Fix: make the fog factor a data field (ratio) rather than a subtraction.
- Frankendom: the server must decide who owns a hub, and must not send the owner of a hub the player cannot see. The client only colours what it is given.
- Frankendom: hidden or fogged units must not be sent to the client just to be hidden on the minimap.
- Hex layout does not transfer: Frankendom zones are not hex grids. Keep the cell-size tiers, the owner-relative colour and the three-state fog. Drop the stagger.
- Not applicable to the Pit (a fixed arena has no minimap). World zones only.

Best transferable idea: colour each hub on the minimap by its owner relative to the viewer (mine, enemy, allied, neutral), hide anything in shroud or fog, and dim terrain that is seen before but not now rather than erasing it.
Decision (proposed): adapt - the owner-relative hub colour and the three-state fog fit camps and towns in zones; the hex layout does not fit zones, the neutral colour needs its own data key, the missing-colour hole needs a fallback, and the fog dim must be a ratio.
Acceptance: a hub owned by the player's faction shows in the "mine" colour, an enemy hub in the "enemy" colour and a neutral hub in its own neutral colour; a hub in fog is not drawn; a zone of 61 or more tiles a side uses 8 px cells and one of 41 to 60 uses 16 px.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine: hub ownership and visibility come from the server, the client only draws them); 7 (client-only HUD)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
- Missed (informational, not an error): village and unit passes are skipped entirely when blindfolded (minimap.cpp 226, 267); line numbers drift by 1-2 in places (hex rect is 100-101).
