# EQEmu (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/EQEmu/zone/zone.cpp` (with `zone/zone.h`, `zone/position.cpp`, `zone/zoning.cpp`, `zone/client.cpp`, `zone/client_packet.cpp`, `zone/common.h`) | Licence: GPL-3.0-or-later (file header of `zoning.cpp`: "either version 3 of the License, or (at your option) any later version"; `LICENSE.md` is the GPL v3 text) | C++ | symbol `Zone::GetClosestZonePoint`

Checked: Read in full: `Zone::GetClosestZonePoint` (2031-2085), `Zone::GetClosestZonePointWithoutZone` (2093-2128), `ZoneDatabase::LoadStaticZonePoints` (2131-2194), `Client::CheckVirtualZoneLines` (9914-9930), `Distance` (position.cpp 80-82). Read in part: the zone-transition handler in `zoning.cpp` (84-150 and 284-325, the unsolicited-zone and arrival branches, and the bind modes at 1160-1185); `Handle_OP_ClientUpdate` (client_packet.cpp 4832, call at 5074). Not read: the rest of the zoning handler (instances, restrictions, cheat-manager consequences of `CheatDetected`), the water-map branch in full, `GetClosestZonePoint` callers outside zoning. Hint file `utils/scripts/convert_maps_to_mmfs.pl` is a batch map converter for zone geometry (34 lines, read in full), not layout. Other candidates opened: `zone/zonedb.cpp` (grep only), `common/repositories/zone_points_repository.h` (grep only). Confidence: moderate. This is the zone-line and home-hub travel layer: the roads between zones and the gate or death return to a bind hub. It is not in-town layout (no building grammar, no minimap, no NPC placement found; grep for minimap, landmark, signpost, city and town matched only bind-point and zone-point code). camera_scope: n/a.

## 1. Mechanism

- A zone line is a row in the content DB, loaded per zone and version (`zone.cpp` query at 2139, field copies through 2163): position x, y, z, heading; target zone and instance; target x, y, z and heading; a client version mask; width and height. Rows marked `is_virtual` are kept in a separate list (2182-2183) and never enter the physical list.
- Physical lines (`zone_point_list`): `GetClosestZonePoint(location, targetZone, client, range)` (2031) walks the list. It skips lines whose version mask does not match the client (2045-2047), keeps only lines to the target zone (2051), and measures a true 2D distance (`Distance`, 2053; `position.cpp` 81 is the square root of the squared distance). The distance is set to 0 only when both axes are sentinel (2054), so a line with one sentinel axis is measured as a normal 2D distance here.
- The range test: `max_distance2 = max_distance * max_distance` (2040) and `if(closest_dist > max_distance2)` (2078) compare a true distance to a squared bound. With the range constant 40000 (`common.h` 64) the bound is 1.6e9, so the test does not limit anything in practice. A band from 400 units up to that bound flags a cheat (2068-2071) but does not refuse.
- Fallback without a target zone: `GetClosestZonePointWithoutZone` (2093-2128) takes the nearest line by squared planar distance, zeroing each sentinel axis on its own (2112), and compares the squared distance to the squared range (2117, 2125). This path is consistent; the range is 40000 units (`common.h` 62).
- Zone request: an unsolicited zone request (client asks to go to zone Z) uses the nearest line to Z (`zoning.cpp` 138); if there is none, or its target is not Z, the request is cancelled and a cheat is flagged (141-147). Arrival (316-319; only +999999 counts, -999999 does not): each target axis equal to 999999 keeps the player's current coordinate; otherwise the target coordinate is used. A nearby fallback for requests with no target zone (`zoning.cpp` 100) uses the no-zone lookup with the nozone range.
- Home travel: gate and death use bind slot 0 as the destination (`zoning.cpp` 94-95 for the target-zone choice, 288-299 for arrival, 1168 gate call, 1182-1183 `GoToDeath` into `ZoneToBindPoint`). The donor sets `ignore_restrictions = 1` for bind travel and marks it in a comment as possibly exploitable (299).
- Virtual boxes: `Client::CheckVirtualZoneLines` (9914-9930) runs from the client update handler (`client_packet.cpp` 5074). For each virtual line: the box is centred on the line's x and y, half-size `width / 2` on both axes (9917, 9920-9923, strict comparisons); height band from `z - 10` (9924) to `z + height` (9925, strict). Inside the box, the player is moved to the line's target (MovePC).

## 2. Key functions

- `Zone::GetClosestZonePoint` (target-filtered): `/mnt/frankendom-donors/EQEmu/zone/zone.cpp` 2031-2085.
- `Zone::GetClosestZonePointWithoutZone`: same file, 2093-2128.
- `ZoneDatabase::LoadStaticZonePoints`: same file, 2131-2194.
- `Client::CheckVirtualZoneLines`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 9914-9930.
- Zone-request and arrival branches: `/mnt/frankendom-donors/EQEmu/zone/zoning.cpp` 100, 138-147, 288-325.
- Bind travel: `/mnt/frankendom-donors/EQEmu/zone/zoning.cpp` 1160-1185 (`GoToDeath` at 1182).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Nearest exit to a named destination, filtered by target | Range 40000 for both lookups (`common.h` 62, 64); the donor's bound is effectively unlimited (zone.cpp 2040, 2078) |
| Sentinel "any" on an axis for trigger and "keep current" on an arrival | 999999 (zone.cpp 2054, 2112; zoning.cpp 316) |
| Warning band for a far-away zone request | 400 units (zone.cpp 2068), flags only |
| Virtual box trigger with a height band | Half-size = width / 2 on both axes (client.cpp 9917); z band starts 10 below (9924); height from the row (9925) |
| Home return from a death or gate | Bind slot 0 (zoning.cpp 1183) |

## 4. TypeScript sketch

simplified: the sketch keeps the nearest physical line filtered by target zone, the sentinel rules for triggers and arrivals (both signs, per axis), the box test with separate half sizes, the donor's strict bounds and the z band, and the bind-slot-0 home rule. It fixes the squared-versus-true distance mismatch by comparing true distances with the range, and applies the sentinel per axis in one place. It omits the client version mask, the water-map exception, the cheat detector (the donor flags; the sketch does not model the consequence), zone names, instances, the MovePC and handshake, and the donor's `ignore_restrictions` flag. The sketch keeps physical lines and virtual boxes in one list and separates them with `box`; the donor keeps them in two lists.

```ts
// Licence: GPL-3.0-or-later (donor, EQEmu). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number }

// Donor sentinel: 999999 (or -999999) on an axis means "any" for a trigger; on an arrival only +999999 means "keep the current value" (zoning.cpp 316-318).
const ANY = 999999;

interface Box { halfW: number; halfD: number; zBelow: number; height: number }

interface ZoneLine {
  id: number;
  x: number; y: number; z: number;             // trigger position
  targetZone: number;
  targetX: number; targetY: number; targetZ: number;
  box?: Box;                                   // present for a virtual zone box, absent for a physical line
}

interface Bind { zone: number; x: number; y: number; z: number }

function isAny(v: number): boolean {
  return v === ANY || v === -ANY;
}

// Arrival keep-current test: the donor tests only +999999 here (heading uses 999, zoning.cpp 319).
function keepsCurrent(v: number): boolean {
  return v === ANY;
}

// Squared planar distance; an axis marked ANY does not count. Both sentinel signs are handled on each axis.
function planarDistSq(p: Pos, l: ZoneLine): number {
  const dx = isAny(l.x) ? 0 : p.x - l.x;
  const dy = isAny(l.y) ? 0 : p.y - l.y;
  return dx * dx + dy * dy;
}

// Nearest physical line to the target zone within maxRange world units.
// Fix: the donor compares a true distance with a squared bound; here both are true distances.
export function nearestLine(lines: ZoneLine[], p: Pos, targetZone: number, maxRange: number): ZoneLine | null {
  let best: ZoneLine | null = null;
  let bestDist = Infinity;
  for (const l of lines) {
    if (l.targetZone !== targetZone || l.box !== undefined) continue;
    const d = Math.sqrt(planarDistSq(p, l));
    if (d < bestDist) {
      best = l;
      bestDist = d;
    }
  }
  return best !== null && bestDist <= maxRange ? best : null;
}

// Arrival point: a target axis equal to +ANY keeps the coordinate the player came from.
export function arrival(line: ZoneLine, from: Pos): Pos {
  return {
    x: keepsCurrent(line.targetX) ? from.x : line.targetX,
    y: keepsCurrent(line.targetY) ? from.y : line.targetY,
    z: keepsCurrent(line.targetZ) ? from.z : line.targetZ,
  };
}

// Virtual box: separate half sizes per axis (donor uses one width for both), strict bounds as in the donor,
// height band from zBelow under the box z up to height above it.
export function inVirtualBox(p: Pos, l: ZoneLine): boolean {
  const b = l.box;
  if (b === undefined) return false;
  return p.x > l.x - b.halfW && p.x < l.x + b.halfW
    && p.y > l.y - b.halfD && p.y < l.y + b.halfD
    && p.z >= l.z - b.zBelow && p.z < l.z + b.height;
}

// Gate and death travel: bind slot 0 is the home hub.
export function homeFor(binds: Bind[]): Bind {
  return binds[0];
}

export {};
```

Typecheck: copied to the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/server/world-zonelines.ts` (new, proposed; not checked against the Frankendom repo): zone lines and virtual boxes as zone data, with nearest-exit lookup and home return computed by the server.
- Parity row 23 (zone data fields). Closest fit only: row 23 is about population, and this is travel between zones. Named here because the brief asks for one row from 1-23 and zone data is the nearest one.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (lines and boxes are rows); server-verified zone change (the server checks the nearest line from its own position, the client only asks); home return is one rule in one place.

Best transferable idea: a town exit as a zone-data row (position, target zone, target coordinate with a keep-current sentinel, optional box) that the server looks up from its own position, and a death or gate that always returns to the bind slot 0 hub.
Decision (proposed): adapt — keep the nearest-exit lookup, the keep-current arrival and the home return, but compare true distances to a real range (the donor's range is effectively unlimited), reject far requests instead of flagging them, and give boxes a depth as well as a width.
Acceptance: a server test sends a zone request from 600 units away from any line to that zone and expects a refusal; a player inside a virtual box with z in band is moved to the box target; a death moves the player to bind slot 0 at the bind's coordinates.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Defect 1, range: the target-filtered lookup compares a true distance with a squared bound (zone.cpp 2040, 2053, 2078; `position.cpp` 81), so a far zone request is accepted and only flagged (2068-2071). Next step (checker, 2026-10-12): when the range test nulls the target-filtered pick, zone.cpp 2078-2082 falls back to GetClosestZonePointWithoutZone, and zoning.cpp 141 cancels only if that point's target_zone_id differs from the request; the 2068 watermap flag fires in a different case (not in a zoneline) than the no-watermap 400 band. Fix: compare true distance to a real range and refuse (sketch `nearestLine`). Consequence of the cheat flag was not read.
- Defect 2, sentinel: the target-filtered path sets the distance to 0 only when both axes are 999999 (zone.cpp 2054), so a one-axis sentinel is not treated as "any" there; the fallback zeroes each sentinel axis on its own (2112). The same line measures differently in the two lookups. Fix: one per-axis rule (sketch `planarDistSq`).
- Defect 3, box shape: one `width` sets the half-size on both axes (client.cpp 9917, 9920-9923). A corridor cannot be described. Fix: add a depth column; the sketch has `halfW` and `halfD`.
- Defect 4, fixed z band: the 10-unit band below the box is a constant (client.cpp 9924), not data. Fix: `zBelow` per box.
- Defect 5, unused size on physical lines: width and height are loaded for physical lines (zone.cpp 2163, 2179) and never used by the physical lookup. Fix: drop from physical rows or use them.
- Bind travel: the donor sets `ignore_restrictions = 1` for bind travel and its own comment calls it possibly exploitable (zoning.cpp 299). Not analysed further. Frankendom must decide the home-return rule in one place and test it.
- Position trust: the box check and the zone request both run on the client-reported position (client_packet.cpp 4832, 5074). Frankendom's server-verified rule means the server must use its own last accepted position. This does not transfer as written; the donor's cheat manager is the only check read.
- Not read: the rest of the zone handler (instances, restrictions, cheat manager actions), the water-map exception (zone.cpp 2068), the zone-points table schema beyond the loader, and any in-town layout (none found).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Sketch isAny treated -999999 as keep-current on arrival; donor arrival (zoning.cpp 316-318) tests only 999999 (heading 999 at 319).
- Defect 1 'far request accepted and only flagged' omitted the next step (fallback to GetClosestZonePointWithoutZone at zone.cpp 2078-2082, cancel only if target zone differs, zoning.cpp 141); watermap flag at 2068 is a different case from the no-watermap 400 band.
Fixed 2026-10-12: sketch arrival now uses keepsCurrent (+999999 only); Defect 1 and the arrival line now state the fallback and the sign rule.
