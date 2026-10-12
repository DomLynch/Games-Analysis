# openmw (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/localmap.cpp` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; no per-file licence header in localmap.cpp) | C++ | symbol `LocalMap::updatePlayer`

Checked: Read in full: `LocalMap::updatePlayer` 477-548, `LocalMap::isPositionExplored` 453-470, the fog texture create/init/load/save functions 594-690, `WindowManager::update` 999-1007, `WindowManager::updateMap` 869-890, `LocalMapBase::setActiveCell` 378-401 (first half only), `getLocalViewingDistance` 86-104, door marker creation 672-725, `World::GetDoorMarkerVisitor` 1844-1877 (visitor body only partly read: 1850-1860). Callers of `updatePlayer`: one, found by grep (`windowmanagerimp.cpp:882`). Not read: `LocalMap::requestMap` / `requestExteriorMap` / `requestInteriorMap` (localmap.cpp 181-431), the render-to-texture setup (690-779), `globalmap.cpp`, the HUD minimap widget code in `hud.cpp`. Confidence: high on the reveal arithmetic and update order; medium on the neighbour-segment axis convention (see section 6). Camera scope: not applicable (this is a map cell, not a camera).

## 1. Mechanism

- Once per frame, `WindowManager::update` calls `updateMap` while a game is running (`windowmanagerimp.cpp` 1006-1007). `updateMap` passes the player's position and facing to `LocalMap::updatePlayer` (882). I read only that one caller (grep). The update function is not traced further (not read).
- Exterior: the cell index is `ceil(pos / 8192) - 1` on each axis (494-495). The position inside the cell becomes UV coordinates `u, v` (498-499). Interior cells use `worldToInteriorMapPosition` instead (485).
- Reveal radius: `0.17 x (32 - 1)` = 5.27 texels on a 32 x 32 fog texture per segment (503). In UV that is 5.27 / 32 (505). The player's own segment is always updated. A neighbour segment is updated only when the reveal circle crosses the shared edge (518-520). So at most a 3 x 3 block of segments is touched.
- Per texel of each updated segment: squared distance to the player in texel units (541-542). Then `alpha = min(old alpha, floor(clamp(dist^2 / r^2, 0, 1) x 255))` (544-545). The texel is written only if its value changed (547-548), and the segment is flagged and marked dirty when anything changed (559-560). The loop runs every frame whether or not the player moved; only the write and the dirty flag are skipped when nothing changed.
- Order of operations per frame: (a) compute cell and UV, (b) choose the affected segments, (c) for each texel, min-merge a radial alpha, (d) mark dirty. Because alpha only ever goes down, a revealed texel never hides again.
- Fresh segments start at 255 everywhere (`0xff000000`, 617). 255 is "never seen".
- Query: `isPositionExplored` truncates `31 x nX` and `31 x nY` to a texel and calls the spot explored if alpha is under 200 (463-469). By arithmetic from those numbers (not stated in the code): 200/255 of the squared radius means the explored edge sits at about 0.89 of the reveal radius.
- Persistence: a segment's fog is saved into the cell's fog state (`saveFogOfWar`, 111-164) and loaded back (`loadFogOfWar`, 624-661). The savegame path is the one that carries it (the code comments at 341-345 refer to fog state "from a savegame").
- Landmarks and signage on the map: only teleport doors become door markers. The visitor takes enabled, non-deleted doors that have a teleport destination (1852-1855), names each marker after its destination (1858), and skips empty names (1859). On the map, markers for the visible grid are created from a recycled pool (mapwindow 698-711), and every marker's notes are built from the custom markers that share its destination (692-702).
- Visible grid size: 1 cell by default (`CellGridRadius`, constants.hpp 29). If zoom is allowed and distant terrain is on, it becomes the camera viewing distance divided by 8192, clamped to [1, max setting] (mapwindow 99-101).
- Active grid: when the player changes cell, cells that left the grid are removed from the local map (`removeExteriorCell`), and door markers outside the new grid are recycled (mapwindow 378-440, first half read).

## 2. Key functions

- `LocalMap::updatePlayer`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/localmap.cpp` 477-548. Cell index and UV (494-499), radius (503-505), affected-segment test (513-524), per-texel min-merge (537-550).
- `LocalMap::isPositionExplored`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/localmap.cpp` 453-470. Threshold 200 at 469.
- `LocalMap::MapSegment::initFogOfWar`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/localmap.cpp` 609-622. Fresh segment, all 255 (617).
- `LocalMap::saveFogOfWar` and `loadFogOfWar`: `/mnt/frankendom-donors/openmw/apps/openmw/mwrender/localmap.cpp` 111-164 and 624-661. Save into the cell fog state (164), load back with a format check.
- `WindowManager::updateMap`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/windowmanagerimp.cpp` 869-890. Passes the player to `updatePlayer` (882).
- `getLocalViewingDistance`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/mapwindow.cpp` 86-104. Radius rule (99-101).
- `World::GetDoorMarkerVisitor` (teleport doors only): `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/worldimp.cpp` 1844-1877. Teleport filter at 1855; name at 1858.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Radial reveal: alpha = min(old, clamp(dist^2 / r^2) x 255); never re-hides | Radius ratio 0.17 of the texture (theirs, localmap.cpp 503) |
| Fog texture is a small square per map segment | 32 texels per side (theirs, localmap.hpp 144) |
| Explored if alpha < threshold | 200 out of 255 (theirs, localmap.cpp 469) |
| Fresh area starts unexplored | 255 (theirs, localmap.cpp 617) |
| One segment per world cell | 8192 world units per exterior cell (theirs, constants.hpp 25) |
| Active grid of cells around the player | Radius 1, so 3 x 3 cells (theirs, constants.hpp 29) |
| Visible map radius follows the view distance, clamped | viewing distance / 8192, clamped to [1, max] (theirs, mapwindow 99-101) |
| Door markers only for teleports, named after destination | Filter at worldimp.cpp 1855; name at 1858 |

Derived, not stated in the code: explored edge at about 0.89 of the radius (see section 1).

## 4. TypeScript sketch

simplified: the sketch keeps the reveal math (radius, per-texel min-merge, the 3 x 3 affected test with the donor's neighbour key), and the explored query. It omits: creating segments lazily (the donor's `segments[...]` creates an entry on read; the sketch skips missing segments), the interior map branch, the render-to-texture setup, the dirty-flag bookkeeping, the savegame encode and decode, and the door markers. It reorders nothing: the cell index and UV are passed in by the caller instead of being computed from world position.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RES = 32;                          // texels per map segment side (one exterior cell)
const EXPLORE_R = 0.17 * (RES - 1);      // reveal radius in texels (about 5.27)
const CELL_DIST = 1;                     // segments updated around the player (3 x 3)
const UNEXPLORED = 255;                  // alpha of a never-seen texel
const EXPLORED_BELOW = 200;              // alpha under this counts as explored

type Segment = Uint8Array;               // one alpha byte per texel (RES * RES)

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function newSegment(): Segment {
  return new Uint8Array(RES * RES).fill(UNEXPLORED);
}

// Player at (u, v) in [0, 1] inside cell (cx, cy). Monotone reveal: a texel only ever gets lower alpha.
export function revealAround(segs: Map<string, Segment>, cx: number, cy: number, u: number, v: number): void {
  const r2 = EXPLORE_R * EXPLORE_R;
  const rUV = EXPLORE_R / RES;
  for (let mx = -CELL_DIST; mx <= CELL_DIST; mx++) {
    for (let my = -CELL_DIST; my <= CELL_DIST; my++) {
      let affected: boolean;
      if (mx === 0 && my === 0) {
        affected = true;
      } else {
        const affectsX = mx > 0 ? u + rUV > 1 : u - rUV < 0;
        const affectsY = my > 0 ? v + rUV > 1 : v - rUV < 0;
        affected = (affectsX && my === 0) || (affectsY && mx === 0) || (affectsX && affectsY);
      }
      if (!affected) continue;

      const seg = segs.get(`${cx + mx},${cy - my}`); // donor: texY = y + my * -1
      if (!seg) continue;

      for (let tv = 0; tv < RES; tv++) {
        for (let tu = 0; tu < RES; tu++) {
          const dx = (tu + mx * (RES - 1)) - u * (RES - 1);
          const dy = (tv + my * (RES - 1)) - v * (RES - 1);
          const ratio = clamp01((dx * dx + dy * dy) / r2);
          const i = tv * RES + tu;
          seg[i] = Math.min(seg[i], Math.floor(ratio * 255)); // keep the smaller alpha
        }
      }
    }
  }
}

// Query at normalised segment coordinates (nX, nY) in [0, 1].
export function isExplored(seg: Segment | undefined, nX: number, nY: number): boolean {
  if (!seg) return false;
  const tu = Math.trunc((RES - 1) * clamp01(nX));
  const tv = Math.trunc((RES - 1) * clamp01(nY));
  return seg[tv * RES + tu] < EXPLORED_BELOW;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/CM019-openmw-minimap-reveal.ts` (with `export {}`): exit 0.

Best transferable idea: Reveal the map as a monotone, radial, min-merged soft circle around the player so exploration never un-hides and the cost is one small texture pass per frame.

Decision (proposed): adapt - take the min-merge radial reveal and the explored threshold for a client minimap; drop the 3 x 3 segment tiling unless Frankendom zones are tiled the same way, and keep the reveal client-side (HUD) because the HUD is client-only in our rulings.
Acceptance: A player walks into a new zone and sees a soft circle of the minimap light up around them; a headless test feeds a fixed path of positions and asserts that no texel ever goes from explored back to unexplored and that a texel at the player's position reads explored.

## 5. Lands in

- TARGET `origins/client/minimap-reveal.ts` (new, proposed path; the Frankendom repo layout was not read). Client HUD only. Not in `src/fight/`.
- Parity-checklist row 14 (HUD). The list's hint was row 23. Row 23 fits the marker data (which zone has which door or landmark, as zone data), not the reveal itself, so the note cites 14 for the reveal.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: camera/HUD/sound are client-only (ruling); zones are data (the 8192 cell size becomes a zone field).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's 3 x 3 neighbour key is mirrored only as the donor's convention.
- Persistence would be a second ledger if explored state were saved outside the one ledger. Keep it client-side unless a progression feature needs it; then store it through the one ledger, never in a separate client save.
- Zones as data: the donor's map size is one constant (8192 world units per cell). Frankendom zones should carry size and reveal radius as zone fields, not constants.
- Cost: the donor's texel loop runs for every updated segment on every frame, even when the player stands still (only the writes are skipped). On a 375-wide phone this is cheap at 32 x 32, but the loop should be skipped when the player's texel did not move.
- Possible sign mismatch (unverified, not a confirmed defect): the neighbour segment key uses `y + my * -1` (527), while the distance term uses `my * (RES - 1)` without the flip (542). Whether these agree depends on the texture orientation set up in the render-to-texture code, which I did not read. The sketch mirrors the donor and marks the flip. Check before use.
- Door markers: the donor only marks teleport doors. A Frankendom hub-with-services marker would need its own rule (services are not doors); that part is not in this donor.
- Not in this donor: road or building grammar, hub placement, signage text. The donor has none of those; it is a map renderer for an existing world.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None material. Verified 477-548 updatePlayer (494-499 cell/UV, 503-505 radius, 518-520 affected test, 526-527 key with my*-1, 541-545 min-merge, 547-560 dirty), 453-470 explored (<200 at 469), 617 0xff000000, sFogOfWarResolution=32 (localmap.hpp 144), constants.hpp 25/29, mCellDistance=CellGridRadius (localmap.cpp 81), mapwindow 99-101 and 698-711, worldimp 1852-1859, windowmanagerimp 882/1006-1007, saveFogOfWar 111-164, GPL-3 LICENSE. The 0.89 radius derivation is arithmetically right (sqrt(200/255)).
Missed: Line 499 inverts v (v = 1 - |...|). That explains the y flip in the neighbour key (y + my*-1) and means the note's 'possible sign mismatch' in section 6 is not a mismatch: both the affected test and the distance term use the flipped v. The note flagged it as unverified, so no error, but the answer is in the cited lines.
