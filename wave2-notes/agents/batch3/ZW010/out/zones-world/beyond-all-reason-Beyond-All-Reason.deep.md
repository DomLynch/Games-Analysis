# beyond-all-reason-Beyond-All-Reason (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/include/startbox_utilities.lua` | Licence: GPL v2 (repo `LICENSE.md`: "released under the GPL v2 licence"; `startbox_utilities.lua` has no licence header of its own; the sibling gadget `game_startbox_config.lua` says `license = "GNU GPL, v2 or later"`) | Lua | symbols `resolveArrangement`, `ParseBoxes`, `GetRandomPos`, `ClosestPos`

Checked: Read in full `luarules/gadgets/include/startbox_utilities.lua` (543 lines), `common/lib_polygon.lua` (90 lines) and `luarules/gadgets/game_startbox_config.lua` (113 lines). Read the scav call sites at `scav_spawner_defense.lua` 1137-1140 and 1466-1475. Callers found by grep only (not read): `raptor_spawner_defense.lua` 871, 1214, 1262, 2126; `scav_spawner_defense.lua` 1518, 2534; `game_coop_II.lua` 86, 155; `SpawnerEnemyLib.lua`; several widgets using `HasStartbox`. Not read: `common/lib_spline.lua` (`TessellateRing`), `common/luaUtilities/modoption_payload.lua` (`Decode`), `FlatAreaCheck`. Grep for level, zone or map transition and `loadlevel` in `luarules`, `common` and `luaui` gave no hits. Streaming: no zone-streaming code in the files read; the `stream` grep hits (for example `game_restart_with_state.lua`, `scav_cloud_spawner.lua`) were not opened, so streaming is not ruled out repo-wide. Confidence: high on the layout-pick order, containment and draw rule (every line receipted); medium on how the scav loop behaves overall because `FlatAreaCheck` was not read. camera_scope: not applicable (zones topic).

## 1. Mechanism

- This is the zone layout for team start positions. Zones are polygons stored as data, one set per team count, and the engine picks the set that matches the live number of ally teams. Input: the active ally team count (Gaia excluded) and two optional modoption payloads, a per-match override and a team-count keyed set (`ParseBoxes`, 302-303). Output: per ally team, one or more polygons, a centroid start point, and a name.
- Order of steps, as the code runs:
  - (a) Config is parsed once and cached (`GetConfig`, 364; the parse is inside `pcall`, 367). A failed parse logs a warning (371) and leaves the engine's rectangles in charge.
  - (b) Layout pick, `resolveArrangement` (112-135). First, the override is used only if it has at least one box for every team (63, 113). Second, the exact team count (118). Third, the smallest count above the live count (123; `matchSetLarger` picks the smallest key greater than `numTeams`). Fourth, the largest count below (128). If none matches, it returns nil (133).
  - (c) If the pick gave an arrangement: `transformArrangement` (166-199) maps box `i` to ally team `i - 1` (172), scales the authored coordinates by map size / 200 (169), and gives each box a centroid start point (189-190, 196). The name comes from the centroid as a fraction of the map (192). Ally teams with no box get a whole-map entry (`fillUnboxedAllyTeams` at 225, fill at 228; `buildWholeMapEntry` at 205, "Anywhere" at 218).
  - (d) If the pick gave nothing: `buildFallback` (233). Portrait maps (237) get a north band that runs from the top edge down to 0.2 of the map depth (243), and a matching south band at the other end (the south box is not receipted). Landscape maps get a west band from the left edge to 0.2 of the map width (274), and an east band at the other end (the east box is not receipted).
  - (e) Each polygon is densified by `SplineLib.TessellateRing` (321; not read) and keeps its anchors. The z value is clamped to map depth minus one (328, 336).
  - (f) Containment: a point is inside a zone if it is inside any of the zone's sub-polygons (`PointInStartbox`, `lib_polygon.lua` 43-55). The test is ray casting: an edge straddles the row (24), and the parity flips when the point is left of the crossing (26).
  - (g) Draw: `GetRandomPos(allyTeamID, inset, tries)` (457-490). The bounding box is shrunk by `inset` and clipped to the map (464). Each try draws one integer point uniformly in that box (471). The point is accepted if it is inside, and (when inset > 0) if the four cardinal points at distance `inset` are also inside (478). If no try succeeds it returns nil and does not widen the search (489; the comment above the function says the same).
  - (h) Edge clamp: `ClosestPos` (494-532) returns the point if inside. Otherwise it projects the point onto every edge of every sub-polygon, clamps each projection to the segment, and returns the nearest one.
- Callers and how often they run: this is start-time and spawn-time code, not a per-frame loop. The config gadget loads it once in `gadget:Initialize` (`game_startbox_config.lua` 27-29). For modes other than choose-in-game it widens every box to the whole map (35-38). For choose-in-game it sets the engine rectangle to the polygon bounds (the `elseif` branch, ending at 50) and exposes `GG.IsInsideStartbox` (64) and related accessors.
- Scav spawns use the draw as follows (read). Attempt #2 runs a 100-iteration loop (`scav_spawner_defense.lua` 1137). Each iteration makes one draw with the spread as inset and `tries = 1` (1138). A nil draw breaks out of the whole loop (1139-1140). The boss spawn (1470-1472) is a `repeat` loop with inset 0 and one try per call, and it stops on the first nil.
- Streaming and transitions: none found in the code read. Each map is one zone set loaded once at start.

## 2. Key functions

- `resolveArrangement`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/include/startbox_utilities.lua` 112-135. The four-step pick order (override, exact, larger, smaller) and the nil return.
- `ParseBoxes`: same file, 298-343. Decodes the two modoption payloads (302-303), chooses the arrangement or the fallback (312), densifies the polygons (321), clamps z (328-337), returns config, source and an explicit flag (342).
- `transformArrangement`: same file, from 166 (box loop 172-199). Box-to-ally-team mapping, 200-unit grid scale, centroid start point and name.
- `GetRandomPos`: same file, 457-490. Shrunk bounding box, one integer draw per try, four-offset inset test, nil on failure.
- `ClosestPos`: same file, 494-532. Nearest-edge projection for a point outside the zone.
- `PointInPolygon` and `PointInStartbox`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/common/lib_polygon.lua` 12-35 and 43-55. Ray casting, applied to every sub-polygon.
- Config gadget: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_startbox_config.lua` 35-50 (mode split and the engine rectangle), 64 (`GG.IsInsideStartbox`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Layout chosen by team count: override, exact, nearest larger, nearest smaller | None. The pick order is the rule. |
| Polygon containment, ray casting, sub-polygons unioned | None |
| Draw in the bounding box shrunk by an inset, accepted only if four offset points also pass | Inset comes from the caller: `spread` at scav 1138, 0 at scav 1470 (theirs) |
| Nearest point on the boundary for an outside point | None |
| Authored coordinates on a 200-unit grid, scaled to the map | 200 (theirs, 169) |
| Default try budget per call | 100 (theirs, `DEFAULT_TRIES`, 448); every call site found passes 1 (1138, 1470) |
| Scav outer attempt loop | 100 (theirs, 1137); ends at the first nil draw (1139-1140) |
| Fallback bands for maps with no layout | 0.2 of the map (theirs, 243, 274); portrait test `mapSizeZ > mapSizeX` (237) |
| Edge clamp for z | `mapSizeZ - 1` (theirs, 328) |

## 4. TypeScript sketch

simplified: the sketch keeps the layout pick order (override, exact, nearest larger, nearest smaller), the ray-cast containment over all sub-polygons, the inset draw with its four offset checks, and the nearest-edge clamp. It omits the whole-map fill for unboxed ally teams, the map-geometry fallback bands, the spline densification (`TessellateRing`, not read), the z clamp to map depth minus one, the 200-unit grid scale, the centroid start point and name, the modoption decode, the engine rectangle sync, and the `GG` API. It replaces `math.random(min, max)` with a supplied `rnd()` that yields the same integer range. It returns null where the donor returns nil and has no 100-try default; the retry budget belongs to the caller.

```ts
// Licence: GPL v2 (donor, beyond-all-reason). Clean-room sketch of the mechanism shape only; not a translation.
type Pt = { x: number; z: number };
type Poly = Pt[];

// Zone data: for each team count, one list of polygons per ally team (index = ally team id).
type Layouts = Map<number, Poly[][]>;
type Layout = { perAllyTeam: Poly[][]; source: "override" | "set" };

// 1. Pick the layout for this team count: override, then exact, then nearest larger, then nearest smaller.
function pickLayout(layouts: Layouts, teams: number, override?: Poly[][]): Layout | null {
  if (override && override.length >= teams) return { perAllyTeam: override, source: "override" };
  const exact = layouts.get(teams);
  if (exact) return { perAllyTeam: exact, source: "set" };
  let larger: number | undefined;
  let smaller: number | undefined;
  for (const k of layouts.keys()) {
    if (k > teams && (larger === undefined || k < larger)) larger = k;
    if (k < teams && (smaller === undefined || k > smaller)) smaller = k;
  }
  if (larger !== undefined) return { perAllyTeam: layouts.get(larger)!, source: "set" };
  if (smaller !== undefined) return { perAllyTeam: layouts.get(smaller)!, source: "set" };
  return null; // caller falls back to a default split of the map
}

// 2. Ray-casting point-in-polygon (crossing number). Concave shapes are fine.
function inPoly(x: number, z: number, poly: Poly): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  let j = poly.length - 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.z > z) !== (b.z > z)) {
      const xHit = b.x + ((z - b.z) * (a.x - b.x)) / (a.z - b.z);
      if (x < xHit) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function inZone(x: number, z: number, polys: Poly[]): boolean {
  return polys.some((p) => inPoly(x, z, p));
}

// 3. One draw per call inside the bounding box, clipped to the map. Accept only if the point and its four
//    cardinal offsets at distance `inset` are all inside, so the item keeps clear of the edge.
function drawInZone(
  polys: Poly[],
  mapX: number,
  mapZ: number,
  inset: number,
  rnd: () => number,
): Pt | null {
  let xmin = Infinity, zmin = Infinity, xmax = -Infinity, zmax = -Infinity;
  for (const p of polys) for (const v of p) {
    xmin = Math.min(xmin, v.x); zmin = Math.min(zmin, v.z);
    xmax = Math.max(xmax, v.x); zmax = Math.max(zmax, v.z);
  }
  xmin = Math.max(xmin + inset, 0); zmin = Math.max(zmin + inset, 0);
  xmax = Math.min(xmax - inset, mapX); zmax = Math.min(zmax - inset, mapZ);
  if (xmin > xmax || zmin > zmax) return null;

  const x = xmin + Math.floor(rnd() * (xmax - xmin + 1));
  const z = zmin + Math.floor(rnd() * (zmax - zmin + 1));
  const ok =
    inZone(x, z, polys) &&
    (inset === 0 ||
      (inZone(x - inset, z, polys) && inZone(x + inset, z, polys) &&
        inZone(x, z - inset, polys) && inZone(x, z + inset, polys)));
  return ok ? { x, z } : null;
}

// 4. A point outside the zone is pulled to the nearest point on any edge of any polygon.
function closestOnZone(x: number, z: number, polys: Poly[]): Pt {
  if (inZone(x, z, polys)) return { x, z };
  let best: Pt = { x, z };
  let bestD = Infinity;
  for (const poly of polys) {
    const n = poly.length;
    for (let j = 0; j < n; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % n];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const lenSq = ex * ex + ez * ez;
      const t = lenSq > 0 ? Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / lenSq)) : 0;
      const px = a.x + ex * t;
      const pz = a.z + ez * t;
      const d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < bestD) { bestD = d; best = { x: px, z: pz }; }
    }
  }
  return best;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw010-bar-startbox.ts`, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone layout and spawn-position engine logic, zone data as the source of the polygons). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The draw and containment are placement rules inside that row; they do not touch the fight step.
- Reuse tag: rewrite-from-idea (GPL v2; clean-room shape only, no line-by-line translation)
- Brief rule served: zones as data on one runtime (the polygons live in zone data, not in code); parity row 23.

## 6. Gaps and risks

- GPL v2: clean-room only. The sketch is written from the described mechanism.
- Silent fallback: when a match has no layout, the donor invents bands from map geometry (233-275) and carries on. Frankendom's zones-as-data ruling means a zone with no layout for its team count should fail loudly in the server test, not invent one.
- Retry semantics: the donor draw returns nil on one miss, and the scav loop breaks out on that nil (1139-1140). So "100 attempts" is in practice up to 100 successful draws, and one miss ends the attempt. Frankendom must choose one rule (retry budget per spawn, or fail) and test it. This note does not check whether the donor's break is intended.
- Randomness: the donor draws with `math.random` (471). On Frankendom, spawn positions are server-verified state, so the draw must come from the server's seeded stream and the chosen coordinates must be written to the spawn record.
- No streaming or transitions: the donor is one map loaded once. Nothing here covers zone streaming or moving between zones. Those would need another donor.
- Scope: these polygons only place team start positions. Spawn caps, respawn and despawn for creatures are in the scav and raptor spawner files, which belong to the spawns-encounters topic and were not read here.
- Unread helpers: `TessellateRing` (spline densification of edges) and the modoption decode. A zone that relies on curved edges depends on code this note has not read.

Best transferable idea: store the zone as data keyed by team count, pick the nearest layout when the exact count is missing, and test "is this spawn point inside the zone, and clear of its edge" with a point-in-polygon check plus four offset points.
Decision (proposed): adapt — Zone polygons per team count belong in zone data, and the pick rule and inset test belong in the engine, because they are the zones-as-data shape we want. Do not copy the map-geometry fallback, the silent nil-then-break draw loop, or `math.random` for server-verified spawns.
Acceptance: a server test with a zone authored for 4 teams shows that a 3-team instance uses the 4-team layout; 10,000 seeded spawn draws in an L-shaped zone with inset 1 all pass the containment and four-offset check; and a zone with no layout for its team count fails the test rather than falling back.

Reuse tag: rewrite-from-idea (GPL v2; clean-room shape only)
Brief rule served: zones as data on one runtime; parity row 23 (zone population).
