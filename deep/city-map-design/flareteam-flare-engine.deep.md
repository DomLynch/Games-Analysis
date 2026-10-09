# flareteam-flare-engine (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` | Licence: GPL-3.0-or-later (per MenuMiniMap.cpp header: version 3 or any later version) | C++ | symbol `MenuMiniMap::prerenderOrtho` | input line 351 verified: `prerenderOrtho` opens at 351 (closes at 361). The tile picture is painted by `updateOrtho` (363-417, a repaint on map change, not per frame); the per-frame entity draw is `renderEntitiesOrtho` (497-518); the visibility rule is `fillEntities` (558-623). `visible_radius` is set in the constructor (line 141).

## 1. Mechanism

- A minimap built from the zone's collision grid, drawn as a pre-rendered tile picture plus a per-frame entity layer. Inputs: the collision grid (tile types 1 and 5 are walls, 2 and 6 are obstacles, 397-399), the fog-of-war dark layer (when fog is on), the player's position, and the list of map events and entities. Output: a coloured picture of the zone, with the hero, NPC hotspots, teleports, allies, enemies in combat and corpses drawn on top. `prerender` (268-281) builds a 1x and a 2x picture (scaled by `default_zoom_level`), in the orthogonal or isometric variant; `update` (282-292) repaints a bounded region of both. `logic` (203-240; the mode toggle is 207-232, the config button 234-239) toggles the mode between normal and 2x on a key (a key press at hidden wraps to normal; the key never sets hidden) or a click inside the map area, and returns early when the mode is hidden (hidden is set elsewhere, not by this key).
- Prerender (`prerenderOrtho`, 351-361): the surface is sized to the map's larger side plus the zoom, times the zoom. `updateOrtho` (363-417) paints each map cell that is a wall or an obstacle as a zoom-by-zoom block in its colour, skipping a colour with zero alpha (406). In fog mode a cell whose dark-layer value is non-zero is not painted (401-404). A partial update (bounds smaller than the map) sets a pixel-batch clip window around the hero (376-389); the loops still run over the given bounds.
- Entity layer (`renderEntitiesOrtho`, 497-518): clears the surface to transparent, rebuilds the entity list (`clearEntities`, `fillEntities`, 558-623), and draws one zoom-sized dot per entity, offset by the hero-centred view (`renderMapSurface`, 294-349, which also clips the tile picture to the panel around the hero).
- Visibility (`fillEntities`, 558-623): the hero is shown when inside the map bounds (561). An event is skipped when it carries a show-on-minimap component set to zero (566-568). An active NPC hotspot is shown within `visible_radius` of the hero, and in fog mode only if it is also within the fog mask radius (570-580). An active intermap teleport event (trigger or interact activation) is shown per tile within the radius (581-593); in fog mode it skips tiles by checking the dark layer at the event's first tile, not at the tile being drawn (587, a donor quirk). Entities: alive allies within the radius; alive non-allies only when in combat and within the radius; corpses with collision within the radius, drawn in the obstacle colour (597-621). The fog mask radius applies to hotspots and living entities (600-605) but not to teleports (dark-layer test only) or corpses.
- Tick: the static picture is built by `prerender` on load (the caller is not read) and repainted by `update` when the map changes; the entity layer is rebuilt every render frame.

## 2. Key functions

- `MenuMiniMap::prerenderOrtho`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 351-361. Surface sizing, then the first paint.
- `MenuMiniMap::updateOrtho`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 363-417. Clip window, wall and obstacle colours, fog test, zoom-block paint.
- `MenuMiniMap::renderEntitiesOrtho`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 497-518. Clears and paints the entity dots.
- `MenuMiniMap::fillEntities`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 558-623. Visibility rule for every kind of map object.
- `MenuMiniMap::MenuMiniMap` (constructor): `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuMiniMap.cpp` 56-162 (read in full). Default colours at 57-63, overrides from `menus/minimap.txt` at 81-139, and `visible_radius` = 0.7071 x max(width, height) of the minimap panel (line 141).
- `MenuMiniMap::prerender` / `update` / `renderMapSurface`: same file, 268-281 / 282-292 / 294-349. Builds both zoom surfaces, repaints a bounded region, and draws the hero-centred view.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Static picture from a collision grid, one colour per blocked tile class | Colours: defaults wall (128,128,128), obstacle (64,64,64), hero white, enemy red, ally yellow, NPC green, teleport (0,191,255) (theirs, lines 57-63), overridable from the menu file |
| Reveal radius: show a thing only within a radius of the viewer | `visible_radius` = 0.7071 x max(panel w, h) (theirs, line 141) |
| Fog: hide what the fog mask has not revealed | Fog mask radius (theirs, data) |
| Zoom: each map cell is a zoom x zoom block | Zoom levels 1x and 2x times `default_zoom_level` (theirs, lines 130-133 and 254-256) |
| Combat-only enemy reveal | `in_combat` flag (theirs) |

## 4. TypeScript sketch

simplified: the sketch is a reduced model. It drops the isometric path, the zoom blocks, the pixel clip window, the event kinds (NPC hotspot versus teleport, the show-on-minimap flag and activity test), the fog mask radius (it has a single reveal radius), the corpse rule, and the hero bounds test. `visibleThings` treats allies, NPCs and corpses alike (all within the radius); the donor adds the in-combat condition for enemies only, as the sketch does. The fog test in `paintMap` (revealed or not) matches the donor's dark-layer test.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Blocked = 0 | 1 | 2;                 // 0 open, 1 wall, 2 obstacle
interface Thing { x: number; y: number; kind: 'ally' | 'enemy' | 'npc' | 'corpse'; inCombat?: boolean; }

// Static picture: one colour per blocked cell; unrevealed cells (fog) stay blank.
function paintMap(grid: Blocked[][], revealed: (x: number, y: number) => boolean, fog: boolean): (string | null)[][] {
  return grid.map((row, y) => row.map((t, x) => {
    if (fog && !revealed(x, y)) return null;
    if (t === 1) return '#wall';
    if (t === 2) return '#obst';
    return null;
  }));
}

// Entity layer: the hero always; other things only inside a reveal radius of the hero.
function visibleThings(hero: { x: number; y: number }, things: Thing[], radius: number): Thing[] {
  return things.filter(t => {
    const d = Math.hypot(t.x - hero.x, t.y - hero.y);
    if (t.kind === 'enemy') return !!t.inCombat && d <= radius;
    return d <= radius;
  });
}

// Reveal radius from the panel size (theirs: 0.7071 of the larger side).
function revealRadius(panelW: number, panelH: number): number {
  return 0.7071 * Math.max(panelW, panelH);
}
```

## 5. Lands in

- Frankendom target: NEW `src/zone-map.ts` (a read-only client minimap; does not exist today) fed by the zone's layout from `origins/world/derive.ts` (`toWorld`: relative layout to metres to world) and by the server's visible-entity list from the presence service (`origins/presence/interest.ts`, which already sends only entities inside a 40 m radius, nearest first, capped). Files on the VPS snapshot /root/work-k7 (not main); headers and the `origins/world/README.md` read only.
- Parity-checklist row: none of rows 1 to 22. The nearest is row 14 (HUD: `src/hud.ts`), which covers fight bars, not a map. Feature-map section: zones as data (`origins/world/README.md`: landmarks at (u, v) in 0..1 and passages) and `docs/specs/origins/one-shard.md` §2 (what syncs, and interest radius).
- Reuse tag: rewrite-from-idea (GPL-3: clean-room only)
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- The reveal rule shows enemies only in combat and only inside a radius, but it runs on the client over the full entity list (597-622). Frankendom's presence service already sends only what is inside the interest radius, so a hidden entity is never on the wire; a client-side filter alone is not a secret.
- Fog mask is a per-tile reveal layer. Frankendom has no fog layer; zones may want one, as data. The donor's fog test is applied unevenly (teleports, corpses), so a port should apply one rule to every kind.
- The map is a static grid painted once per zoom. A Pit duel has no map; the minimap is a zone feature only (the Pit is a client).
- The constructor reads its layout and colours from a menu file with defaults. Frankendom must express them as zone data with defaults (zone-schema rule).
- Runs every render frame, rebuilding and re-drawing the entity list (`clearEntities` deletes and reallocates each entry); a Frankendom version should reuse a buffer.
- One engine, server-verified kills and MAX_ATTACKERS = 3 are unaffected: the minimap reads state, it never changes it.
- Not read: the isometric variant (`prerenderIso`, `updateIso`, `renderEntitiesIso`), the caller of `prerender`, and the fog-of-war class.
