# flareteam-flare-engine (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` (draw, zoom, blips: `MenuMiniMap::updateOrtho` 363-417, `renderMapSurface` 294-349, `fillEntities` 558-623), with `/mnt/frankendom-donors/flareteam-flare-engine/src/FogOfWar.cpp` (reveal: `FogOfWar::logic` 179-191, `updateTiles` 233-255) | Licence: GPL-3.0-or-later (as read: MenuMiniMap.cpp header lines 11-12, "either version 3 of the License, or (at your option) any later version"; COPYING is GPL version 3, 29 June 2007) | C++ | symbol `MenuMiniMap::updateOrtho`

Checked: Read in full: src/MenuMiniMap.cpp 1-636 (all of it). Read: src/FogOfWar.cpp 61-300 and 340-396 (mask load, logic, updateTiles, bounds). Read by grep and short ranges: src/Settings.h 43-45 (minimap modes), src/Utils.cpp 329-331 (calcDist is Euclidean), src/EngineSettings.cpp 193-195 (fogofwar switch), src/GameStatePlay.cpp 386, 1051-1055 (prerender and render call sites). Not read: src/FogOfWar.cpp 300-340 (tile-definition loader), src/MapRenderer.cpp and the event system beyond the fields the minimap uses, the input mapping, and the engine data files `menus/minimap.txt` and `engine/fow_mask.txt`: neither is in this donor box (mods/ has `default` and `gcw0_defaults` with no minimap or fog-mask file), so the fog radius and mask values are unknown. Confidence: high on the draw order, reveal and blip rules (read in full); medium on what the dark-layer values mean where MapRenderer was not read. Camera scope: n/a.

## 1. Mechanism

Two loops: a reveal step that runs when the hero moves, and a draw step that runs every frame.

Setup (once per map load): `GameStatePlay` calls `mini->prerender(&mapr->collider, mapr->w, mapr->h)` (GameStatePlay.cpp 1051). `prerenderOrtho` makes a square surface sized `max(map.x + zoom, map.y + zoom) * zoom` (MenuMiniMap.cpp 352) and paints the whole map into it at two zooms: `base_zoom` and `base_zoom * 2` (279). Each map tile is a `zoom` x `zoom` block (407-410). Wall types 1 and 5 use `color_wall`, obstacle types 2 and 6 use `color_obst`, others are not drawn (395-399).

Reveal (each step the hero has moved, FogOfWar.cpp 180):
1. `updateTiles` stamps the view mask around the hero: a square of side 2r+1 (r = `mask_radius`, the header radius) (233-238). For each cell in range: `dark &= mask` (245) and `fog = mask` (246). The dark layer only loses bits, so an explored tile stays explored. The fog layer is the current view and is rewritten every stamp.
2. If any dark value changed, `update_minimap` is set (248-249). Then `calcMiniBoundaries` clamps the mask box to the map (221-230) and `mini->update` repaints only that box (186-188). That repaint is clipped to a window centred on the hero (378-389).
3. A tile is repainted as visible only when its dark value is 0 (`if (tile_type != 0) draw_tile = false`, 402-403). A tile with some bits still set stays off the map.

Draw (every frame, `render(hero_pos)` 245-266, called from GameStatePlay.cpp 1055):
4. Zoom mode: `current_zoom = 1 * base_zoom` in normal mode and `2 * base_zoom` in 2x mode (253-256). The mode cycles with the minimap key (207-212) and a click inside the map area toggles normal and 2x (217-231). A hidden mode returns early (214-215).
5. `renderMapSurface` clips the prebuilt surface to a `pos.w` x `pos.h` window centred on the hero (312-315) and stretches that clip to the map area (331-333). The window is not clamped to the map edge; the off-map part is transparent.
6. `renderEntitiesOrtho` clears the entity layer, rebuilds the blip list with `fillEntities` (504-505), and draws each blip as a `zoom` x `zoom` square (509-515).
7. `fillEntities` builds the blip list. Radius: `visible_radius = max(pos.w, pos.h) * 0.7071` (141). Hero: always (559-562). NPC hotspots: only when the event is active, inside the radius, and inside the fog mask radius (570-580). Teleports (intermap events): a dot per tile of the event rectangle within the radius (581-594). Monsters: if `hp > 0` and fog is on, skipped beyond the mask radius (599-605); allies within the radius (606-610); enemies only when `in_combat` and within the radius (611-615); dead bodies that still have collision as obstacles within the radius (617-620).

## 2. Key functions

- `MenuMiniMap::updateOrtho`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 363-417. Paints the visible tiles of a box into the prebuilt surface; full-map call at prerender, box call from the reveal.
- `MenuMiniMap::renderMapSurface`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 294-349. Picks the surface for the zoom mode, clips it around the hero, draws the entity layer.
- `MenuMiniMap::fillEntities`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 558-623. The blip rules (hero, NPC, teleport, ally, engaged enemy, corpse).
- `FogOfWar::updateTiles`: `/mnt/frankendom-donors/flareteam-flare-engine/src/FogOfWar.cpp` 233-255. The mask stamp: monotone dark layer, current fog layer, change flag.
- `FogOfWar::logic`: `/mnt/frankendom-donors/flareteam-flare-engine/src/FogOfWar.cpp` 179-191. Runs only when the hero moved; calls the stamp, then the minimap repaint.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fog view mask: square of side 2r+1 around the player | r = header `radius` from the fog mask file (FogOfWar.cpp 260); value not in donor box |
| Bits per tile for partial reveal (sub-tile directions) | `bits_per_tile` at least 1 (FogOfWar.cpp 264); a defined bit with value above 0 is 1 << (val - 1) (295) |
| Minimap radius for blips | 0.7071 x max(w, h) (MenuMiniMap.cpp 141) |
| Zoom | 1 px per tile by default (`base_zoom` 73, config key 132); 2x mode is 2 x base (255-256) |
| Enemy colour | (255,0,0) default (MenuMiniMap.cpp 60) |
| Monster reveal test | `in_combat` true (611); hp > 0 (599) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (stamp the view mask into a monotone dark layer and a current fog layer; repaint a tile only when fully revealed; blips filtered by alive, fog radius, ally or engaged, and radius; window centred on the hero). It omits the two-zoom prebuilt surfaces, the isometric mapping, the entity pool, the event rectangles for teleports, the NPC hotspot rule, the bits-per-tile tile table (the sketch takes the mask as a flat array of already-combined bit values), and the per-frame clip. It uses Euclidean distance, as `Utils::calcDist` (Utils.cpp 330) does. The window origin is not clamped to the map, as in the donor.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Pt { x: number; y: number }
export interface Fog { w: number; h: number; dark: number[][]; fog: number[][] }

// Step 1: stamp the view mask (square of side 2r+1, read x-major then y) around the player.
// 'dark' is monotone: bits are only cleared, so a revealed tile stays revealed. 'fog' holds the current view.
export function stampView(f: Fog, c: Pt, r: number, mask: number[]): boolean {
  let changed = false;
  let k = 0;
  for (let x = c.x - r; x <= c.x + r; x++) {
    for (let y = c.y - r; y <= c.y + r; y++) {
      const m = mask[k++];
      if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
      const prev = f.dark[x][y];
      f.dark[x][y] &= m;
      f.fog[x][y] = m;
      if (f.dark[x][y] !== prev) changed = true;
    }
  }
  return changed;
}

// Step 2: a tile is drawn on the minimap only when fully revealed (dark layer is 0).
export function minimapShowsTile(f: Fog, x: number, y: number): boolean {
  return f.dark[x][y] === 0;
}

// Step 3: blips. A hostile is shown only when engaged and inside the radius; idle hostiles are not drawn.
export interface Mob { pos: Pt; hp: number; ally: boolean; engaged: boolean; corpseCollision: boolean }
export type Blip = "ally" | "enemy" | "corpse";

// Donor factor 0.7071 (MenuMiniMap.cpp:141) times the larger minimap side.
export function minimapRadius(w: number, h: number): number {
  return Math.max(w, h) * 0.7071;
}

// Euclidean distance, as Utils::calcDist (Utils.cpp:330).
function dist(a: Pt, b: Pt): number {
  return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
}

export function mobBlip(m: Mob, hero: Pt, fogOn: boolean, maskRadius: number, radius: number): Blip | null {
  const d = dist(hero, m.pos);
  if (m.hp > 0) {
    if (fogOn && d > maskRadius) return null;
    if (d > radius) return null;
    if (m.ally) return "ally";
    if (m.engaged) return "enemy";
    return null;
  }
  if (m.corpseCollision && d <= radius) return "corpse";
  return null;
}

// Step 4: the ortho window is centred on the player at zoom z; the window is w x h pixels.
export function windowOrigin(hero: Pt, z: number, w: number, h: number): Pt {
  return { x: z * hero.x - Math.floor(w / 2), y: z * hero.y - Math.floor(h / 2) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on a copy of this file).

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path; not verified against the Frankendom repo): the client minimap. The reveal state (dark and fog layers) lives with the zone runtime, not in the client, so that a server can own the explored state if it affects progress.
- Parity-checklist row 14 (HUD). The batch hint was row 23; row 23 is spawn caps, respawn and despawn, which this minimap does not do. The engaged-only enemy rule touches row 4 (aggro) only through the shared `in_combat` state.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (the fog mask and radius are data, not constants); client-only HUD; server-verified blips (the server decides which hostiles are engaged before a client is sent them)

## 6. Gaps and risks

- Defect (teleport fog test, MenuMiniMap.cpp 586-587): the fog check for every tile of a teleport event's rectangle indexes the dark layer at the event origin (`event_pos.x`, `event_pos.y`), not at the tile being tested (`j`, `k`). So the whole rectangle is shown or hidden by one tile. Also the dot test is `== TILE_HIDDEN` (all bits set) while the tile test is `!= 0` (403, 477), so a partly revealed tile can show a teleport dot while the tile itself is not drawn. fix: test `[j][k]` and use the same rule as the tile draw (dark == 0) for both. The idea is kept.
- Defect (NPC hotspot distance, 572 and 577): the fog test uses the event centre (`mapr->events[i].center`, 572) and the range test uses the event location (577). fix: use one point for both.
- Efficiency (fillEntities 558-623; clearEntities 550-555): the blip list is rebuilt every frame with a heap `new PixelEntity` per blip. fix: keep a reusable pool, or draw blips straight from the rules.
- Risk (not run): the reveal repaint is clipped to the window (379-389). If the reveal radius times zoom is more than half the window, tiles revealed outside the window are not painted, and they are not repainted until a later reveal changes them. At default sizes this is unlikely; check it before using a small window.
- Risk: missing mask data turns fog off for the player (`mapr->fogofwar` falls to `TYPE_NONE`, FogOfWar.cpp 150-153). The donor logs an error (129: "No mask defined") but gives the player no sign. Frankendom should fail the zone build instead.
- Frankendom gap: the donor keeps the reveal in the map's own layers (`mapr->layers`) and can save it (`save_fogofwar`, EngineSettings.cpp 196 comment). Frankendom needs one explored-state ledger per character and zone, written by the server.
- Frankendom gap: the engaged-only enemy blip is the right threat signal for many-on-one fights, but the donor reads `in_combat` from its local entity list (there is no server in the donor). Frankendom's server must decide "engaged" (the hate or target list) and send only those.
- The donor is a GPL-3.0 engine written for 2D isometric and orthogonal tilesets; Frankendom uses a 3D world. Only the reveal rule and the blip rule transfer, not the pixel surfaces.


Best transferable idea: Reveal the map by stamping a fixed view mask around the player into a monotone 'ever seen' layer, and show a hostile on the minimap only once it is engaged in combat and inside the view radius.

Decision (proposed): adapt - the stamp and the engaged-only blip are cheap and match zones as data and the hate list; the donor's bit-subdivided tiles, two prebuilt zoom surfaces and per-frame blip list are not needed for a 3D world, and the explored state must be server-owned.
Acceptance: an unexplored block stays dark on the minimap until the player's view reaches it, and a hostile appears as a red dot only after it engages the player and within the radius, disappearing when it dies or leaves; a server test asserts that the minimap payload sent to a client contains only engaged hostiles within the view radius.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: zones as data (fog radius and mask are data); client-only HUD; server-verified blips and explored state (one ledger)
