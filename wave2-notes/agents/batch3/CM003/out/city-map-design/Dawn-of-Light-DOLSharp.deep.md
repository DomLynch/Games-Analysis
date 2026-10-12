# Dawn-of-Light-DOLSharp (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/AbstractArea.cs` (with `world/Area.cs`, `world/AreaMgr.cs`, `world/Region.cs`, `packets/Client/168/PlayerPositionUpdateHandler.cs`) | Licence: GPL-2.0-or-later (file headers: "either version 2 of the License, or (at your option) any later version"; `LICENSE` is the GPL v2 text) | C# | symbol `AbstractArea.OnPlayerEnter`

Checked: Read in full: AbstractArea enter/leave (208-250), AreaMgr.LoadAllAreas (15-63), Area.Circle containment and load (198-245), Area.Polygon containment (359-382), Region.AddArea (1317-1349) and GetAreasOfZone (1396-1412), and the area diff in both position-handler blocks (323-343 and 988-1018). Read in part: Zone.GetAreasOfSpot (1080-1082), SpellHandler MustCheckLOS (899-910) and its caller (1244-1262), GamePlayer stealth tick (12812-12830), GamePlayer location name (7463-7464), broadcast command (96-112). Candidates opened, hint file first: `DOLDatabase/Tables/Teleport.cs` (hint: a teleport destination table, not layout), `GameServer/world/WorldMgr.cs` (teleport registry, 100-175 and 485-515), `GameServer/world/TeleportArea.cs`, `GameServer/gameobjects/GameTeleporter.cs` (67-100, 270-337), `DOLDatabase/Tables/Area.cs`, `GameServer/gameobjects/GameObject.cs` (CurrentAreas 323-335). Confidence: moderate. The donor has no city layout generator, no road or building grammar and no minimap in the `.cs` files (grep for minimap, mini-map, radar, landmark, signpost and bulletin matched only `Region.cs` and `AbstractCraftingSkill.cs`, neither read). What is read is the landmark and district trigger layer a city map would use for signage. Not read: housing (`DBHouse*`), `Zones.cs`, `Pathing/`. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Named areas are rows in the `Area` table (`DOLDatabase/Tables/Area.cs` 7): description, centre X/Y/Z, radius, region, a class name, and per-area flags for broadcast, sound and LOS. At start-up `AreaMgr.LoadAllAreas` creates each row's class by name (AreaMgr.cs 23; falls back to the script assemblies), copies Sound, CanBroadcast and CheckLOS (48-51), and registers the area with its region (55). If any row throws, the outer catch logs "Loading all areas failed" and returns false (60-62), so the remaining rows are skipped.
- `Region.AddArea` (Region.cs 1317-1349) gives the area the next free ID and appends the ID to the candidate list of every zone the area intersects (1337-1338). Each zone's candidate list is a fixed array of 50 slots (AbstractArea.cs 80; Region.cs 240). There is no bounds check at 1338.
- Lookup: `Zone.GetAreasOfSpot` (Zone.cs 1080-1082) calls `Region.GetAreasOfZone` (Region.cs 1396-1412), which tests only the zone's candidates with `IsContaining`.
- Circle containment (Area.cs 212-234): early-out when the X or Y offset passes the radius on the positive side (216); squared planar distance (225); height term added only when both the area and the spot have non-zero Z and the caller did not ignore Z (227-230); compare squared distance with the cached squared radius (233, cached at 242). Polygon containment (359-382): even-odd edge test over the points; height is ignored.
- Enter and leave run inside the position packet handler, not on a timer. In the older-client block (323-343) and the 1124 block (988-1018, method at 741): if the region clock is past `AreaUpdateTick`, compute the new area list for the new position (330, 995); fire `OnPlayerLeave` for each old area not in the new list (336, 1004); fire `OnPlayerEnter` for each new area not in the old list (339-340, 1011-1013); store the new list (342, 1017); set the next check 2000 ms ahead (343, 1018).
- `OnPlayerEnter` (AbstractArea.cs 221-250): if DisplayMessage is on and a description exists, sends a localised "entered" system message (223-239); optionally sends the description to screen centre when a server property is on (242-243); plays the area sound when Sound is non-zero (245-247); raises PlayerEnter (249). `OnPlayerLeave` (208-215) sends a left message in the same way and raises PlayerLeave.
- Two flags are read elsewhere. CanBroadcast gates the area scope of the player broadcast command: it collects players who share an area with that flag set (broadcast.cs 100-107). CheckLOS: `MustCheckLOS` (SpellHandler.cs 899-910) returns true when any current area has the flag, and the spell path (1251) sends a line-of-sight check for an NPC caster when the target is a player or the caster stands in such an area. The stealth tick (GamePlayer.cs 12818-12830) also turns on its LOS check when the player stands in a flagged area.
- A location string is built from the first current area's description, skipping bind areas (GamePlayer.cs 7463-7464; what the string is used for was not read), so list order decides which name wins where areas overlap.

## 2. Key functions

- `AbstractArea.OnPlayerEnter`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/AbstractArea.cs` 221-250.
- `AbstractArea.OnPlayerLeave`: same file, 208-215.
- `AreaMgr.LoadAllAreas`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/AreaMgr.cs` 15-63.
- `Region.AddArea` and `Region.GetAreasOfZone`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Region.cs` 1317-1349 and 1396-1412.
- `Area.Circle.IsContaining`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Area.cs` 212-234. `Area.Polygon.IsContaining`: same file, 359-382.
- Area diff, legacy block: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/packets/Client/168/PlayerPositionUpdateHandler.cs` 323-343. 1124 block: same file, 988-1018.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Named district as a circle or polygon row; enter and leave from a diff of the old and new lists | Circle radius per row (Area.cs 242, the DB `Radius` column) |
| Per-zone candidate list so a lookup tests few shapes | Cap 50 per zone (AbstractArea.cs 80; Region.cs 240); zone span 65536 for the zone-intersection test (Area.cs 202) |
| Membership check with squared distance, no square root | None (Area.cs 225, 233) |
| Height counts only when both sides carry a height | Rule: zero Z means "no height" (Area.cs 227) |
| Enter-only sound cue, 0 = silent | Sound byte per row (AbstractArea.cs 245-247) |
| Recheck throttle | 2000 ms (PPUH.cs 343, 1018) |
| Per-area LOS switch | CheckLOS bool per row (AbstractArea.cs 50; read at SpellHandler.cs 903 and GamePlayer.cs 12820) |

## 4. TypeScript sketch

simplified: the sketch keeps the containment rules (circle with squared distance and optional height, even-odd polygon), the 50-area cap enforced at load, the enter and leave diff, and the LOS helper. It reorders the donor: membership is recomputed on every call, where the donor recomputes at most every 2000 ms (the time gate is the fix). It omits the zone prefilter (IsIntersectingZone), region ID allocation, the localised message and the screen text, the sound send, the PlayerEnter and PlayerLeave events, and the spell and stealth code that reads `losCheck`. The caller must emit leave events before enter events, as the donor does (336 before 339). The square pre-check checks both sides here; the donor checks only the positive side, which is correct but costs more.

```ts
// Licence: GPL-2.0-or-later (donor, Dawn of Light). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Pt = { x: number; y: number };
type Shape =
  | { kind: "circle"; x: number; y: number; z: number; radius: number }
  | { kind: "polygon"; points: Pt[] };

interface ZoneArea {
  id: number;
  name: string;        // shown as "entered X" in the client HUD
  shape: Shape;
  soundId: number;     // 0 = silent
  announce: boolean;
  losCheck: boolean;   // while inside, targeted spells and arrows need line of sight
}

// Donor MustCheckLOS: any current area with the flag turns the LOS rule on for that living.
export function mustCheckLos(current: ZoneArea[]): boolean {
  return current.some((a) => a.losCheck);
}

interface Spot { x: number; y: number; z: number }

// Engine rule (donor: AbstractArea.cs 80): a zone can hold at most this many areas.
const MAX_AREAS_PER_ZONE = 50;

// Fail at load time, not mid-way through a loop (donor has no check; see Gaps).
export function loadZoneAreas(areas: ZoneArea[]): ZoneArea[] {
  if (areas.length > MAX_AREAS_PER_ZONE) {
    throw new Error(`zone has ${areas.length} areas, cap is ${MAX_AREAS_PER_ZONE}`);
  }
  return areas;
}

function inCircle(p: Spot, c: Extract<Shape, { kind: "circle" }>, ignoreZ: boolean): boolean {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  // square pre-check on both sides (donor checks only the positive side, then relies on the distance test)
  if (dx > c.radius || dx < -c.radius || dy > c.radius || dy < -c.radius) return false;
  let d2 = dx * dx + dy * dy;
  // height only counts when both sides carry a height and the caller wants it
  if (c.z !== 0 && p.z !== 0 && !ignoreZ) {
    const dz = p.z - c.z;
    d2 += dz * dz;
  }
  return d2 <= c.radius * c.radius;
}

// Even-odd ray test, same edge ordering as the donor. Ignores height, as the donor does.
function inPolygon(p: Pt, pts: Pt[]): boolean {
  if (pts.length < 3) return false;
  let inside = false;
  let prev = pts[pts.length - 1];
  for (const cur of pts) {
    const [a, b] = cur.x > prev.x ? [prev, cur] : [cur, prev];
    if ((cur.x < p.x) === (p.x <= prev.x) && (p.y - a.y) * (b.x - a.x) < (b.y - a.y) * (p.x - a.x)) {
      inside = !inside;
    }
    prev = cur;
  }
  return inside;
}

export function contains(p: Spot, area: ZoneArea, ignoreZ = false): boolean {
  return area.shape.kind === "circle"
    ? inCircle(p, area.shape, ignoreZ)
    : inPolygon(p, area.shape.points);
}

// Membership diff for one player. Donor runs this only every 2000 ms (see Gaps); here it runs on every position tick.
export function updateMembership(
  prev: Map<number, ZoneArea>,
  candidates: ZoneArea[],
  p: Spot,
): { next: Map<number, ZoneArea>; entered: ZoneArea[]; left: ZoneArea[] } {
  const next = new Map<number, ZoneArea>();
  for (const a of candidates) {
    if (contains(p, a)) next.set(a.id, a);
  }
  const entered = candidates.filter((a) => next.has(a.id) && !prev.has(a.id));
  // leave is computed from the previous set, so areas that belong to a zone we just left are also reported
  const left = [...prev.values()].filter((a) => !next.has(a.id));
  return { next, entered, left };
}
```

Typecheck: copied to the VPS with `export {};` appended, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0 (run twice, after the losCheck edit; the second run is the final one).

## 5. Lands in

- TARGET `origins/server/world-areas.ts` (new, proposed; not checked against the Frankendom repo): named district triggers as zone data, membership computed by the server from its own accepted position.
- Parity row 23 (zone population, zone data fields: radius, sound, announce, LOS flag). The client banner and sound are HUD and are outside this row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (district rows live in zone data); server-verified state (membership from the server, not the client packet); banner client-only.

Best transferable idea: a named district row in zone data (name, circle or polygon, sound, LOS flag) that the server diffs against each player's position to fire enter and leave events.
Decision (proposed): adapt — keep the district row and the enter and leave diff, but recompute membership on every server position tick (not every 2 s), enforce the 50-area cap at zone load, and take position from the server, not the client packet.
Acceptance: a server test moves a player across a district edge in 0.3 s and expects one enter and one leave event; a zone with 51 areas fails to load with a clear error; a targeted spell cast by an NPC inside a losCheck district is refused without line of sight.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Defect 1, time gate: membership is refreshed at most every 2000 ms (PPUH 343, 1018). A crossing shorter than 2 s can be missed, and an entry can be announced up to 2 s late. Fix: recompute membership on every server position tick for moving players (at most 50 candidates per zone), and let the client debounce the banner.
- Defect 2, overflow: `Region.cs` 1338 writes into a 50-slot array with no bounds check (array sized at 240). A zone with a 51st intersecting area throws, and the outer catch (AreaMgr.cs 60-62) stops loading the rest. Fix: validate the count per zone when zone data loads (sketch `loadZoneAreas`).
- Defect 3, height: the height check is skipped when either Z is zero (Area.cs 227), and polygons ignore Z. A designer cannot tell from the row whether an area is 2D. Fix: an explicit `height` boolean per area in zone data.
- Position trust: the donor takes the position from the client packet (PPUH.cs 985, 1124 path), so enter, leave and the LOS flag all follow client-reported position. Frankendom's server-verified rule means the server must compute membership from its own last accepted position. This does not transfer as written.
- Hidden rule switch: CheckLOS changes targeting for NPC casters and the stealth reveal (SpellHandler.cs 1251; GamePlayer.cs 12820). Frankendom must list it in zone data and test it. Not read: what the LOS callbacks do when the check fails (`CheckLOSNPCToTarget`).
- Overlap order: the location string takes the first current area (GamePlayer.cs 7464), and list order is candidate order. Frankendom needs an explicit priority field rather than list order.
- Teleport destinations (hint file `DOLDatabase/Tables/Teleport.cs`; registry `WorldMgr.cs` 153; `TeleportArea.cs`; `GameTeleporter.cs`) are a fast-travel index, a different idea. Not written up here; a candidate for its own cell.
- Not read: `Zone.cs` beyond 1080-1082, `Zones.cs`, housing tables (`DBHouse*`), `Pathing/`, the city quest scripts (`CityOfCamelot.cs`, `CityOfJordheim.cs`, `CityOfTirnaNog.cs`; listed only), and the client. No minimap code in the `.cs` files was found.
