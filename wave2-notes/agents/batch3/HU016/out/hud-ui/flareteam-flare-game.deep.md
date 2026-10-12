# flareteam-flare-game (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/flareteam-flare-game/mods/fantasycore/menus/minimap.txt` (data half, read in full; second layout `mods/minicore/menus/minimap.txt` also read) with the paired engine `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` (engine half) | Licence: data under Creative Commons Attribution-ShareAlike 3.0 Unported (per `flareteam-flare-game/LICENSE.txt`, line 3); engine under GPL-3.0-or-later (per `MenuMiniMap.cpp` line 12, "either version 3 of the License, or (at your option) any later version") | C++ engine + plain-text data | symbol `MenuMiniMap`

Checked: Hint `art_src/interface/menus.xcf` is a layered binary image (the minimap frame art), not the logic, so not used. Data half read: both minimap.txt files (10 and 10 lines; all keys read). Engine half read: `MenuMiniMap.cpp` 56-266 (constructor, align, logic, render), 268-362 (prerender, update, renderMapSurface, prerenderOrtho), 363-418 (updateOrtho), 497-518 (renderEntitiesOrtho), 550-623 (clearEntities, fillEntities); `Settings.h` 43-45 and `Settings.cpp` 104 (by grep and read); `FogOfWar.h`/`FogOfWar.cpp` 206-208 and 215-225 (by grep only, not read in full). Confidence high on the ortho path, its dot rules and its mode logic. (not read): the isometric path (`MenuMiniMap.cpp` 419-496 and 520-549; the iso branch is a parallel path), the FogOfWar mask update (its body beyond 225), the code that sets `fow->mask_radius`, and the destructor (625-636). camera_scope: not applicable (the minimap is a HUD panel, not a camera). Other hud-ui sub-topics: the touch layer and the world map were not read here.

## 1. Mechanism

- Data (flare-game). Layout is data, one engine. `fantasycore` sets a 256 x 288 panel (`pos`, line 1) aligned top-right (`align`, line 2), with the map drawn at `map_pos=4,36,248,248` (line 5) and `default_zoom_level=3` (line 9). `minicore` is the same engine with a 64 x 72 panel and a 64 x 64 map at `0,8` (lines 6 and 9); it has no zoom line, so it uses the engine default of 1. Colours and the config-button position are data keys too.
- Pre-render (engine). `prerender` builds two full-map surfaces once, one at the base zoom and one at 2x (268-281). Each is square, of size `(max(map w, map h) + zoom) * zoom` (352-353). Walls (collision 1 or 5) are painted grey 128, obstacles and pits (2 or 6) dark grey 64 (397-398), each tile as a zoom x zoom block (drawn at 409).
- Fog. When `eset->misc.fogofwar > 0`, a tile is painted only when its dark-layer value is 0 (401-403). Unexplored or still-covered tiles stay blank. This is the only place the map is hidden by fog; the dot rules below add their own gate.
- Per-frame window. `renderMapSurface` (294-349) picks the surface for the mode (normal = base zoom, 2x = twice), clips it to a window centred on the hero: origin = `zoom * hero - size / 2` (308 for the entity offset; 312 for the clip). The entity layer is rebuilt every frame (`renderEntitiesOrtho` 497-518 calls `clearEntities` and `fillEntities`), and each dot is drawn as a zoom x zoom block at `zoom*x - offset`.
- Dot rules (`fillEntities` 558-623), in order:
  1. The hero, always, in white (562).
  2. Map events flagged for the minimap (unless `SHOW_ON_MINIMAP` is 0): NPC hotspots that are active, within the fog mask radius (573) and within `visible_radius` (green); intermap teleports, per tile of the event rectangle, within `visible_radius` (blue; the fog test on 587 uses the event's origin tile for every tile, see section 6).
  3. Living units (hp > 0): allies within `visible_radius` (yellow, 606); foes that are in combat within `visible_radius` (red, 611). A living foe that is not in combat gets no dot. With fog on, a living unit beyond the fog mask radius gets no dot (602-603).
  4. Dead bodies that still have collision (617): dark grey (the obstacle colour) within `visible_radius`. No fog test here.
- The radius. `visible_radius = max(pos.w, pos.h) * 0.7071` (141), which is the half-diagonal of the panel in pixels. It is then compared with tile distances (611 and others), so the cull is in the wrong unit (see section 6).
- Modes and keys. The mode is `settings->minimap_mode`: 0 normal, 1 2x, 2 hidden (`Settings.h` 43-45; `Settings.cpp` 104 gives the config default 0). The map key (`logic`, 209-210) adds one and, if the result is above 2x, sets normal. A mouse press inside the map area toggles normal and 2x (218-221), and a press that started outside the area cannot start a zoom drag (`lock_zoom_change`). Hidden returns early in `logic` (214) and `render` (246). The config screen can set the mode (`MenuConfig.cpp` 1051 and 1428).
- Zoom. Normal is `1 * base_zoom` and 2x is `2 * base_zoom` (`render`, 254-256). `base_zoom` is 1 by default (constructor) and comes from `default_zoom_level` (line 132).

- String table (fold-in, game data): `mods/fantasycore/languages/data.pot` holds 76 entries (77 `msgid` lines including the header), with no `msgid_plural` and no `%s`/`%d` placeholders. Its `data.de.po`, `data.fr.po` and `data.zh.po` each carry the same 77 `msgid` lines, so they are full translations of the same key set. The minimap itself uses no game strings beyond its title and the "Configuration" tooltip (`MenuMiniMap.cpp` constructor). Quoted nothing.

## 2. Key functions

- `MenuMiniMap::MenuMiniMap` (layout keys, colours, zoom, radius): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 56-162 (`base_zoom` at 132, `visible_radius` at 141).
- `MenuMiniMap::logic` (mode key, mouse toggle): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 203-240 (key at 209-210, mouse at 218-221).
- `MenuMiniMap::renderMapSurface` (window clip, layer choice): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 294-349 (offset at 308, layer choice at 321).
- `MenuMiniMap::updateOrtho` (tile paint and fog gate): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 363-417 (walls 397, fog 401-403).
- `MenuMiniMap::fillEntities` (dot rules): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 558-623 (hero 562, fog 573 and 602, ally 606, combat 611, body 617).
- Data: `/mnt/frankendom-donors/flareteam-flare-game/mods/fantasycore/menus/minimap.txt` and `/mnt/frankendom-donors/flareteam-flare-game/mods/minicore/menus/minimap.txt`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pre-render the tile map once per zoom level; per frame only blit a window and redraw the dots | Two levels, base and 2x (theirs, 268-281) |
| Hero-centred window: origin = zoom x hero - window / 2 | Window = map rectangle size (theirs, 308; fantasycore 248 x 248, line 5) |
| Explored tiles only | Dark-layer value must be 0 (theirs, 403) |
| Dots only for the hero, living allies and engaged foes; idle foes not shown | Colours: hero 255,255,255; enemy 255,0,0; ally 255,255,0; npc 0,255,0; teleport 0,191,255; wall 128 grey; obstacle 64 grey (theirs, constructor 57-63) |
| Dot radius | max(w, h) x 0.7071 (theirs, 141) |
| Zoom ladder | Base zoom from data, default 1 (theirs, 132; fantasycore 3, line 9); 2x = twice base |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's dot order (hero, allies, engaged foes, bodies), the window origin, the fog gate on explored tiles, the zoom ladder, and the radius. It omits the NPC hotspot and intermap teleport dots (the teleport fog bug is in section 6), the isometric projection, the event flags, the per-tile loop, the colour values (the caller supplies the dot kind), and the pre-render surfaces themselves. It changes three things on purpose: the mode key cycles all three modes (the donor's key never reaches hidden); bodies follow the same fog rule as living units (the donor skips the fog test for bodies); and the radius is passed in as a tile distance (the donor's value is in pixels, see section 6).

```ts
// Licence: GPL-3.0-or-later (engine donor, MenuMiniMap.cpp); data file under CC-BY-SA 3.0 (game donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type MapMode = "normal" | "2x" | "hidden";

interface Unit {
  x: number;
  y: number;
  hp: number;
  ally: boolean;
  inCombat: boolean;
  corpseCollision: boolean;
}

interface Hero { x: number; y: number; }

type DotKind = "hero" | "ally" | "enemy" | "corpse";
interface Dot { x: number; y: number; kind: DotKind; }

// Donor: visible radius = max(map w, h) * 0.7071 (the half-diagonal of the map square), used as a tile distance.
function visibleRadius(mapW: number, mapH: number): number {
  return Math.max(mapW, mapH) * 0.7071;
}

// Donor cycle: mode++, then anything above "2x" resets to normal. From "2x" the key therefore
// goes back to normal and never reaches "hidden". FIX: cycle through all three modes.
function nextMode(m: MapMode): MapMode {
  const order: MapMode[] = ["normal", "2x", "hidden"];
  return order[(order.indexOf(m) + 1) % order.length];
}

// Zoom in pixels per tile for a mode; null when the map is hidden. The 2x surface is a separate pre-render, not a scale.
function zoomFor(m: MapMode, baseZoom: number): number | null {
  if (m === "hidden") return null;
  return m === "2x" ? 2 * baseZoom : baseZoom;
}

// Hero-centred window: top-left corner in map pixels (donor: zoom * hero - size / 2, integer halving).
function windowOrigin(zoom: number, hero: Hero, w: number, h: number): { x: number; y: number } {
  return { x: zoom * hero.x - Math.trunc(w / 2), y: zoom * hero.y - Math.trunc(h / 2) };
}

// Unit dots: the hero always; living allies and engaged foes (in combat) within the radius;
// dead bodies that still block movement within the radius. With fog on, a living unit beyond the
// fog mask radius is not drawn. FIX: the donor skips the fog test for bodies, so a body in
// unexplored ground showed on the map; here bodies follow the same fog rule as living units.
function unitDots(hero: Hero, units: Unit[], radius: number, fogOn: boolean, maskRadius: number): Dot[] {
  const out: Dot[] = [{ x: hero.x, y: hero.y, kind: "hero" }];
  const dist = (x: number, y: number): number => Math.hypot(x - hero.x, y - hero.y);
  for (const u of units) {
    if (fogOn && dist(u.x, u.y) > maskRadius) continue;
    if (dist(u.x, u.y) > radius) continue;
    if (u.hp > 0) {
      if (u.ally) out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "ally" });
      else if (u.inCombat) out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "enemy" });
    } else if (u.corpseCollision) {
      out.push({ x: Math.trunc(u.x), y: Math.trunc(u.y), kind: "corpse" });
    }
  }
  return out;
}

// A tile is drawn only when fully uncovered by fog (donor: the dark layer value must be 0).
function tileVisible(fogOn: boolean, darkLayerValue: number): boolean {
  return !fogOn || darkLayerValue === 0;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/flare-minimap.ts), exit 0.

## 5. Lands in

- TARGET `origins/client/minimap.ts` (client-only minimap view model: window, explored-tile gate, dot rules; zones supply the map rectangle, colours and zoom as data). Parity-checklist row 14 (HUD).
- today: not checked (Frankendom minimap or map files not opened for this note).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later engine; CC-BY-SA 3.0 data; clean-room only, no data copied)
- Brief rule served: client-only HUD reads engine state and never writes it; zones as data (the layout and colours are data keys, not constants in the function).

## 6. Gaps and risks

- Both halves are copyleft: the engine is GPL-3.0-or-later and the data is CC-BY-SA 3.0. Clean-room only; the sketch was written from the mechanism and no data values were copied into Frankendom.
- Defect (mode key cannot reach hidden): `MenuMiniMap.cpp` 209-210 adds one to the mode and resets it to normal when it is above `MINIMAP_2X`. From 2x the key goes to 2, which is above 2x, so it resets to normal (`Settings.h` 43-45 puts hidden at 2). The map can only be hidden from the config screen (`MenuConfig.cpp` 1428). fix: cycle all three modes (the sketch's `nextMode`).
- Defect (teleport fog test uses the wrong tile): `MenuMiniMap.cpp` 587 checks `layers[dark][event_pos.x][event_pos.y]` for every tile of the teleport rectangle (the loop variables are j and k, 584-585). Every tile is tested against the event's origin tile. fix: index the tile being drawn (j, k).
- Defect (bodies skip fog): the fog gate is inside the living branch (599, 602). A body with collision (617) is drawn within the radius even in unexplored ground. fix: apply the same fog gate to bodies (the sketch).
- Unit mismatch (harmless here): `visible_radius` (141) is built from pixels, then compared with tile distances (611 and the others). At base zoom 3 the cull is about three times the drawn window, so the surface clips the extra dots. Nothing visible breaks in the data as written. fix if a tighter cull is wanted: radius in tiles = `visible_radius / zoom`.
- Design question: the map draws only engaged foes (611). Idle foes are invisible, so a sleeping camp is not on the map until it fights. That is a readability choice; decide whether Frankendom wants idle foes shown as a faint dot.
- Frankendom rulings: the minimap is client-only and reads engine state. "In combat" must come from the engine's fight set (MAX_ATTACKERS = 3 and the hate list), not a client guess.
- Readability at 375 px: a 248 x 248 map is large for a phone. The fantasycore layout is 256 x 288, the minicore layout is 64 x 72. Pick the size per device, as data.
- Clock: the window is recomputed from the hero's position each frame (the entity layer every frame, 497-518), so there is no timer here.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later engine; CC-BY-SA 3.0 data; clean-room only)
Brief rule served: client-only HUD reads engine state; zones as data; the minimap never decides what is in combat.

Best transferable idea: a hero-centred minimap that pre-renders the tile map once per zoom level, shows only explored tiles, and draws the hero, living allies and engaged foes (not idle foes) inside a radius.
Decision (proposed): adapt — take the pre-rendered zoom ladder, the explored-tile gate, and the rule that only engaged foes get a dot; fix the mode cycle, the teleport fog index, and the body fog gate; do not port the radius-in-pixels cull as written.
Acceptance: on a 375-wide phone, the minimap shows the hero in white, allies in yellow and foes in combat in red only; unexplored tiles and idle foes are blank; a unit test asserts nextMode("normal") is "2x", nextMode("2x") is "hidden" and nextMode("hidden") is "normal".
