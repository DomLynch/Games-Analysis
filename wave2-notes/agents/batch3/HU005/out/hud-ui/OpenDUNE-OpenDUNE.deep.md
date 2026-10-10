# OpenDUNE-OpenDUNE (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/gui/viewport.c` (GUI_Widget_Viewport_DrawTile 877-963), with `map.c` (Map_UpdateMinimapPosition 235-312; Map_UnveilTile 1339-1368; Map_MarkTileDirty 1683-1689), `tile.c` (Tile_GetDistance 39-46; Tile_RemoveFogInRadius 114-146), `unit.c` (Unit_RemoveFog 1217-1231), `house.c` (House_UpdateRadarState 371-420), `gui/gui.c` (viewport scroll 4578-4650) | Licence: GPL-2.0 (COPYING is GNU GPL Version 2, June 1991; the one header read with the "any later version" wording is video/scalebit.c, not the files read here, which carry no licence header; clean-room, shape only) | C | symbol `GUI_Widget_Viewport_DrawTile`

Checked: the minimap draw read in full (viewport.c 877-963); the viewport outline update read in full (map.c 235-312); reveal read in full (tile.c 39-46 and 114-146, unit.c 1217-1231); the radar state read in full (house.c 371-420); the changed-tile queue read in full (map.c 1683-1689; viewport.c 756-811). Read in part: Map_UnveilTile and its neighbour helper (map.c 1288-1368), Map_Update (590-628), the scroll redraw (gui/gui.c 4560-4652). Callers checked by grep: Tile_RemoveFogInRadius (unit.c 1230, 1998, 2027, 2500; structure.c 465-971), Map_UnveilTile (unit.c 2549; opendune.c 1404; tile.c 143), GUI_Widget_Viewport_DrawTile (viewport.c 775 and 977; map.c 275). Not read: GFX_DrawTile and the sprite sheet code, the body of Structure reveal beyond 971, and the game-loop caller of GUI_Widget_Viewport_Draw. The hint file (gui/gui.c) is the wrong file for the minimap: it holds the viewport scroll and the repair-button flash only. Confidence: high on the minimap rules, the reveal and the radar gate; medium on the whole minimap cycle (the scale above 1 sprite path was not read). camera_scope: n/a (HUD).

## 1. Mechanism

- Reveal (fog of war). Each unit that is on the map and allied with the player reveals the tiles around it (unit.c 1224-1230). The radius comes from the unit type; a radius of 0 reveals nothing (1226-1228). Tile_RemoveFogInRadius (tile.c 114-146) walks the square of side 2r+1 inside the 64 x 64 map, skips tiles whose distance is above the radius (141), and unveils the rest for the player (143). Distance is the longer axis plus half the shorter one, in integer maths (tile.c 44-45). A unit entering a tile also unveils it for its house (unit.c 2549). Bullets reveal a fixed radius of 2 (unit.c 1998). Structures reveal with their own radius (structure.c 971); in the enhanced mode the reveal centre moves to the middle of the structure footprint (966-969).
- Unveil (map.c 1339-1368): refused for any house other than the player's (1345). Sets the revealed flag (1351), marks the tile dirty, credits structures as seen by the house (1358-1362), then re-evaluates the four orthogonal neighbours. A neighbour's fog-edge tile is chosen from a 4-bit mask of which neighbours are still veiled (1313, 1325), so there are 16 possible edge tiles.
- Minimap pixel (viewport.c 877-963), one screen pixel per tile at the smallest scale (960). Order of tests:
  (a) if the tile is unveiled and the player's radar is on (894), the pixel is the colour of a unit on the tile (house colour; sandworm fixed at 255, 923), otherwise the terrain colour (901), or the house colour if the tile is a structure tile (904-908);
  (b) otherwise, if one of the player's own structures is on the tile, its house colour (934-938);
  (c) otherwise the blank colour 12 (944).
  So with the radar off, only the player's own buildings are drawn, even on revealed tiles, and enemy units are never drawn. Above scale 1 the same tests choose sprite frames instead of pixels (898-920, 935-942).
- Radar state (house.c 371-420). On when the outpost is built and production covers usage (389); off when either fails (386). The same test runs both ways, so there is no dead band. A change plays the static animation (394-410) in reverse when turning on (the frame index runs from the end, 410) and forward when turning off, with a sound (405). The call blocks: it waits for the voice to finish (401) and calls Timer_Sleep(3) after each frame (413) before it returns.
- Dirty redraw. Map_MarkTileDirty (1683-1689) sets a bit and appends the tile to a list of 200 (45, 1687-1688). The consumer (viewport.c 756-811) redraws each listed tile (775), clears its bit as it goes (765), and if the list was full, rebuilds the next list from the bit array (801-808). Overflowed tiles therefore wait one frame and are not lost.
- Viewport outline. Map_UpdateMinimapPosition (map.c 235-312) returns at once when the position is unchanged (257). Otherwise it clears the displayed bits of the old 46-cell border (264-277), redraws those tiles, strokes the new rectangle at (scale + 1) pixels per tile (288-293), and sets the displayed bits for the new border (295-300). The border is a fixed list of offsets (238-250): the top and bottom rows of 15 and the sides of 8 rows.

## 2. Key functions

- `GUI_Widget_Viewport_DrawTile`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/gui/viewport.c` 877-963. One minimap tile: unveil and radar tests, colours, pixel or sprite.
- `Tile_RemoveFogInRadius`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/tile.c` 114-146. Reveal disc by distance.
- `Tile_GetDistance`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/tile.c` 39-46. Longer axis plus half the shorter.
- `Map_UnveilTile`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 1339-1368. Unveil, seen-by, neighbour edges.
- `Map_UpdateMinimapPosition`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 235-312. Viewport outline update.
- `House_UpdateRadarState`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/house.c` 371-420. Radar gate and its animation.
- `Map_MarkTileDirty` with the consumer loop: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 1683-1689 and `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/gui/viewport.c` 756-811.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Disc reveal with a cheap distance (longer axis plus half the shorter) | Distance rule (tile.c 44-45) |
| Reveal radius per unit type, 0 for none (27 entries in the unit table, values 0 to 5) | Example 5 for one unit (table/unitinfo.c 111) |
| Reveal radius per structure type (19 entries in the structure table, values 1 to 10) | Example 10 for one structure (table/structureinfo.c 1206) |
| Bullets reveal a small fixed disc | Radius 2 (unit.c 1998) |
| Radar on = service building present and power production at least usage | Test at house.c 386 and 389 |
| Dirty list of 200 entries backed by a bit array | Capacity 200 (map.c 45) |
| Viewport outline 15 by 10 tiles | Loop bounds (gui/gui.c 4606 and 4609) |
| Map scale: 62 by 62, 32 by 32 or 21 by 21 tiles per scenario | Scenario data (scenario.h 25) |

## 4. TypeScript sketch

simplified: whole-tile coordinates (the donor works in 1/256-tile units and rounds the distance up, tile.c 103-106). The sketch omits the neighbour fog-edge mask (map.c 1293-1330), pixel and sprite drawing, the static radar animation and its blocking wait, the house-owned palette sprites, the sandworm colour, the enhanced structure reveal centre, and the separate displayed-minimap bits. It keeps the donor's distance rule, the disc walk, the unveil test, the minimap colour order, the radar test and the dirty list with its one-frame overflow rebuild. Radar is a pure function of the current values here; the donor stores it as state, but its two tests are the same condition, so the result is the same.

```ts
// Licence: GPL-2.0 (OpenDUNE COPYING, version 2). Clean-room sketch from the described mechanism; no donor line is translated.
// clean-room
const W = 64;            // map is 64 x 64 tiles, index = y * 64 + x
const VIEW_W = 15;       // the minimap viewport outline is 15 x 10 tiles
const VIEW_H = 10;

interface Cell {
  unveiled: boolean;           // fog: revealed tiles only
  terrainColour: number | null; // null: a structure tile, drawn in its house colour
  houseColour: number;         // owner colour for structure or unit tiles
  ownStructure: boolean;       // structure belonging to the viewing player
  unitColour?: number;         // a unit on the tile, if any
}

// Distance in whole tiles: longer axis plus half the shorter one (integer), as the donor's Tile_GetDistance.
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx > dy ? dx + Math.floor(dy / 2) : dy + Math.floor(dx / 2);
}

// Dirty tiles: a bit array is the truth, a capped list is the fast path. Overflowed tiles are kept in the bits.
class DirtyQueue {
  private bits = new Uint8Array(W * W);
  private list: number[] = [];

  constructor(private cap: number) {}

  mark(idx: number): void {
    this.bits[idx] = 1;
    if (this.list.length < this.cap) this.list.push(idx);
  }

  // Returns this frame's tiles to redraw. If the list was full, the next list is rebuilt from the bits,
  // so overflowed tiles are redrawn one frame later instead of being lost.
  drain(): number[] {
    const out = this.list;
    for (const idx of out) this.bits[idx] = 0;
    this.list = [];
    if (out.length === this.cap) {
      for (let i = 0; i < this.bits.length && this.list.length < this.cap; i++) {
        if (this.bits[i] === 1) this.list.push(i);
      }
    }
    return out;
  }
}

// Reveal every tile within radius of the point (the radius comes from unit or structure data).
function revealRadius(cells: Cell[], cx: number, cy: number, radius: number, dirty: DirtyQueue): void {
  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      const x = cx + i;
      const y = cy + j;
      if (x < 0 || x >= W || y < 0 || y >= W) continue;
      if (dist(cx, cy, x, y) > radius) continue;
      const idx = y * W + x;
      if (!cells[idx].unveiled) {
        cells[idx].unveiled = true;
        dirty.mark(idx);
      }
    }
  }
}

// Radar: on when the outpost exists and production covers usage. Both directions use the same test.
function radarOn(hasOutpost: boolean, powerProduction: number, powerUsage: number): boolean {
  return hasOutpost && powerProduction >= powerUsage;
}

// Colour of one minimap pixel (one tile per pixel at the smallest scale).
function minimapColour(c: Cell, radar: boolean, blankColour: number): number {
  if (c.unveiled && radar) {
    if (c.unitColour !== undefined) return c.unitColour;
    return c.terrainColour ?? c.houseColour;
  }
  if (c.ownStructure) return c.houseColour;   // own buildings are shown even when the radar is off
  return blankColour;
}

// The 15 x 10 viewport outline as tile indices (46 cells: top and bottom rows, plus the two sides between).
function viewportBorder(topLeft: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      if (x === 0 || x === VIEW_W - 1 || y === 0 || y === VIEW_H - 1) out.push(topLeft + y * W + x);
    }
  }
  return out;
}

export {};
```

## 5. Lands in

- TARGET `origins/world/fog.ts` (proposed new module, server-side reveal state per player) with the minimap drawing in the client HUD (client-only). Parity-checklist row 14 (HUD). The reveal discs and the per-tick dirty list are server-side per player; the drawing reads them.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, no line translated)
- Brief rule served: 1 (one runtime: zones as data, the reveal radius is a data field); rule 8 (row 14 and a named origins path)

## 6. Gaps and risks

- Per-player filtering (the main Frankendom gap). The donor's minimap reads one shared map, so the viewer's own reveal is the only filter. In Frankendom the server must send each player only the tiles and units inside that player's reveal; a client that gets the full map can draw enemies it should not know about. Test: a snapshot for player A contains no unit or tile outside A's reveal.
- Radar gate with no dead band (house.c 386-389). Power exactly at the usage line is on; a small dip turns the radar off and the next recovery turns it on again, and each change plays the animation. Fix: a hysteresis band as a data field (for example, off below 90 percent of usage, on at 100 percent), so a flicker does not flash the minimap.
- Blocking animation (house.c 401-413). The radar animation waits inside the state change for the voice and calls Timer_Sleep(3) per frame, so the game loop stops while it plays. Fix: the state change is immediate; the static animation is a client-only effect that starts on the change event.
- Dead guard (map.c 1685; viewport.c 890-892). The test `g_scenario.mapScale + 1 == 0` can never be true for a 16-bit scale of 0 to 2, and the viewport test `mapScale == 0` on the +1 value is the same kind of dead check. The branch that these guards seem to mean (minimap off) never runs. Harmless here, but it hides an intent. Fix: an explicit minimap-off flag from the zone data.
- Reveal centre (structure.c 965-969). The enhanced mode moves the reveal centre to the footprint middle; the original does not. Frankendom should store the reveal centre as a data field per structure, not compute it from the footprint at reveal time.
- Queue cap. The 200-entry list (map.c 45) is an engine constant tuned for a 64 x 64 map. A bigger zone needs the cap as data, or the overflow path runs every frame.
- Scroll blit (gui/gui.c 4578-4615). The viewport copies the overlap of the old view and redraws only the uncovered cells, and forces a full redraw when there is no overlap. This is a 2D tile camera trick: it does not transfer to a 3D third-person camera. Recorded for completeness; camera work is out of scope for this cell.
- Pixel colours and sprite frames are palette and sprite-sheet indices (viewport.c 898-920). Not transferable as is; Frankendom's minimap needs its own colour rule (team colours, contrast at 375 wide).
- Not run: no playtest, no screenshot, no network test.

Best transferable idea: Draw the minimap from the player's own reveal state only: tiles uncovered by a radius around their units and buildings (the radius as data), enemy units shown only on uncovered tiles while a radar building is powered, own buildings always, and redrawn only from a dirty queue.

Decision (proposed): adapt — the reveal-disc rule, the radar gate and the dirty queue fit Frankendom's zone map and its HUD budget; the donor's shared-map view is rejected, because Frankendom's server must filter per player.

Acceptance: On a 375 px phone in a zone, the minimap shows terrain and enemy units only inside the discs uncovered by the player's units and buildings; with its radar building unpowered it shows only the player's own buildings. Server test: the snapshot sent to player A contains no tile or unit outside A's reveal, and a tile uncovered this tick is redrawn in the same tick.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (server owns the reveal; client draws); rule 8 (row 14)

Also seen, not the note's subject (receipts in receipts.tsv): the low-health cue. The structure's high-health flag is true only above half of max hitpoints (widget_draw.c 484; threshold read in the line). The repair button then alternates between two colours on an animation toggle while the flag is false (gui.c 655; flag declared at gui.c 134). The side panel for a selected structure redraws only when a snapshot of its displayed values changes (widget_draw.c 470-486, the comparison list from 474 on). These are cheap urgency and budget cues for a 375 px HUD.
