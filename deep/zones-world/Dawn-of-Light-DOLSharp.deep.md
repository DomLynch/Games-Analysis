# Dawn-of-Light-DOLSharp (zones-world, cell 7)

Donor: /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | Licence: GPL-2.0-or-later per Zone.cs header (LICENSE file is GPL-2 text) | C# | symbol Zone.ObjectEnterZone / GetObjectsInRadius

Symbol check (opened, 2026-10-09 correction pass): ObjectEnterZone 465-504, GetObjectsInRadius 542-675, GetSubZoneIndex 447-458 all land on the named functions. Also opened: private ObjectEnterZone overload 512-535, UnsafeAddToListWith(out)DistanceCheck 678-761, Relocate 766-845, UnsafeUpdateSubZoneTimestamp 848-859, ShouldElementMove 862-923, CheckSquareDistance 988-1009, CheckMinDistance 1025-1050, CheckMaxDistance 1065-1074.

## 1. Mechanism
- A Zone covers a fixed square of 65536 by 65536 world units from its Offset, split into 32 by 32 subzones (SUBZONE_NBR_ON_ZONE_SIDE = 32, "must be a power of 2, limit 128", line 48; SUBZONE_SIZE = 65536 / 32 = 2048, line 55; cell index by right shift, lines 57-59, 455-457). Each subzone holds one circular doubly linked list per object type (m_subZoneElements[subzone][type], indexed in the query at 594).
- GetSubZoneIndex (447-458) returns -1 if the coordinate is outside 0..65535 on either axis relative to Offset, otherwise (y shifted into a line, plus x column).
- ObjectEnterZone(obj) (465-504) runs InitializeZone first if needed (468), computes the subzone, classifies the object as PLAYER, NPC, ITEM (GameStaticItem) or DOOR (IDoor) in that order (479-486) and silently returns for anything else (488). It wraps the object in a list node, pushes it under lock on that subzone and type list (496-500) and bumps the zone object count with Interlocked.Increment (502). The object count is the only thing the enter path updates.
- Moving inside a zone does NOT call enter. Position changes are fixed up lazily: ShouldElementMove (862-923) is run on every element the query or the relocation timer touches. It drops ghosts (null, not Active, or in a different region, 869-871 and 914-920), hands elements whose coordinate maps to subzone -1 to the "out of zone" set (877-891) and elements whose subzone changed to the "in zone" set (897-910). Those sets are applied after the walk: PlaceElementsInZone (926-951, re-push under the new list lock) and PlaceElementsInOtherZones (954-984, finds the target zone by coordinate and calls the private ObjectEnterZone overload 512-535).
- Relocate(state) (766-845) is the timer-driven sweep of the same logic. A (subzone, type) list is swept when Environment.TickCount passes its stored timestamp (783); the timestamp is set to now + MAX_REFRESH_INTERVAL = 2000 ms (61, 848-859) whenever a query or sweep touches the list. What drives Relocate (the timer registration) was not read.
- GetObjectsInRadius(type, coord, radius, partialList, ignoreZ) (542-675): squared radius (546); block of cellNbr = (radius >> shift) + 1 subzones around the observer's cell on each side, clamped to 0..31 (553-579). For each non-empty list (the "dirty read" empty test, 596-597): if it is the observer's own subzone, every object gets a distance check (600-609); otherwise CheckMinDistance on the cell rectangle rejects the cell when the nearest edge or corner is beyond the radius, CheckMaxDistance accepts every object in the cell without a per-object test when the farthest corner is inside the radius, and only the cells between get per-object checks (612-643). Results go into partialList, skipping objects already present (703-706, 750-756). The 3D squared-distance check with an early exit after x and y, and ignoreZ to skip z, is CheckSquareDistance (988-1009).
- Locking: every list is locked on insert (496, 527) and on every query or sweep (602, 626, 637, 789, 942).
- Inputs: coordinate, radius, type. Output: the objects in range. Server-side in the donor.

## 2. Key functions
- Zone.ObjectEnterZone | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 465-504 | typed insert into the subzone list.
- Zone.GetSubZoneIndex | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 447-458 | coordinate to subzone index, or -1.
- Zone.GetObjectsInRadius | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 542-675 | block walk, min and max cell shortcuts, per-object checks, relocation of strays at the end.
- Zone.ShouldElementMove | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 862-923 | lazy fix-up: drop ghosts, flag cross-subzone and cross-zone movers.
- Zone.Relocate | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 766-845 | timed sweep that applies the same fix-up.
- Zone.CheckMinDistance / CheckMaxDistance | /mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs | 1025-1050 / 1065-1074 | nearest and farthest point of a cell rectangle versus squared radius.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Grid bucketing of entities into per-cell, per-type lists | 32 subzones per side, subzone size 2048 over a 65536 square (theirs, lines 48, 55) |
| Block query clamped to the zone, radius converted to cells (+1) | MAX_REFRESH_INTERVAL 2000 ms (theirs, line 61) |
| Reject a cell when its nearest point is out of range, accept the whole cell when its farthest corner is in range, per-object test otherwise | Type codes ITEM 0, NPC 1, PLAYER 2, DOOR 3 (theirs, 70-76) |
| Lazy bucket fix-up when a query touches a list, plus a timed sweep | Ghost test: not Active or wrong region (theirs, 869-871) |

## 4. TypeScript sketch
simplified: no locking; no init-on-first-use; no per-list refresh timestamp or timed Relocate sweep (fix-up happens only when a query touches a list); objects that left the zone are dropped (enter ignores a coordinate outside the grid) instead of being routed to another zone by coordinate; no region check in the ghost test (inactive only); the donor appends the whole out-of-zone and in-zone move sets after the walk, while this sketch re-buckets as it goes; no ignoreZ (2D only); bucket key is cell plus kind in one string map instead of an array of lists.
```ts
// Licence: GPL-2 (Dawn-of-Light-DOLSharp) | clean-room: written from the mechanism, no donor lines.
type Kind = 'player' | 'npc' | 'item' | 'door';
interface Obj { id: number; kind: Kind; x: number; y: number; active: boolean; }
interface ZoneGrid { x0: number; y0: number; side: number; subSize: number; buckets: Map<string, Obj[]>; }

function subIndex(z: ZoneGrid, x: number, y: number): number {
  const cx = Math.floor((x - z.x0) / z.subSize);
  const cy = Math.floor((y - z.y0) / z.subSize);
  if (cx < 0 || cy < 0 || cx >= z.side || cy >= z.side) return -1;
  return cy * z.side + cx;
}
const key = (idx: number, kind: Kind): string => idx + ':' + kind;

function enter(z: ZoneGrid, o: Obj): void {
  const idx = subIndex(z, o.x, o.y);
  if (idx < 0) return;
  const k = key(idx, o.kind);
  const bucket = z.buckets.get(k) ?? [];
  bucket.push(o);
  z.buckets.set(k, bucket);
}

function minD2(px: number, py: number, l: number, r: number, t: number, b: number): number {
  const dx = px >= l && px <= r ? 0 : Math.min(Math.abs(px - l), Math.abs(px - r));
  const dy = py >= t && py <= b ? 0 : Math.min(Math.abs(py - t), Math.abs(py - b));
  return dx * dx + dy * dy;
}
function maxD2(px: number, py: number, l: number, r: number, t: number, b: number): number {
  const dx = Math.max(Math.abs(px - l), Math.abs(px - r));
  const dy = Math.max(Math.abs(py - t), Math.abs(py - b));
  return dx * dx + dy * dy;
}

function inRadius(z: ZoneGrid, x: number, y: number, r: number, kind: Kind, out: Obj[]): Obj[] {
  const px = x - z.x0, py = y - z.y0, r2 = r * r;
  const ref = subIndex(z, x, y);
  const cells = Math.floor(r / z.subSize) + 1;
  const cx = Math.floor(px / z.subSize), cy = Math.floor(py / z.subSize);
  for (let gy = Math.max(0, cy - cells); gy <= Math.min(z.side - 1, cy + cells); gy++) {
    for (let gx = Math.max(0, cx - cells); gx <= Math.min(z.side - 1, cx + cells); gx++) {
      const idx = gy * z.side + gx;
      const list = z.buckets.get(key(idx, kind));
      if (!list || list.length === 0) continue;
      let all = false;
      if (idx !== ref) {
        const l = gx * z.subSize, t = gy * z.subSize;
        if (minD2(px, py, l, l + z.subSize, t, t + z.subSize) > r2) continue;
        all = maxD2(px, py, l, l + z.subSize, t, t + z.subSize) <= r2;
      }
      for (let i = 0; i < list.length; i++) {
        const o = list[i]!;
        if (!o.active) { list.splice(i--, 1); continue; }
        if (subIndex(z, o.x, o.y) !== idx) { list.splice(i--, 1); enter(z, o); continue; }
        const dx = o.x - x, dy = o.y - y;
        if ((all || dx * dx + dy * dy <= r2) && !out.includes(o)) out.push(o);
      }
    }
  }
  return out;
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/world/zone-grid.ts (new, name set by Lead), run from the server tick (post-K item 3). Used as the interest query for aggro acquisition feeding src/fight (today: Zone 1 `zone1.ts` / `open-fight.ts`, own copy).
- Parity-checklist row: 4 (fight loop aggro, chase, leash: who is near the player) and row 18 (post-K item 3, server tick owns the query).
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks
- Cell size is a Lead decision; the donor's 2048 over 65536 is not a Frankendom number.
- Zones as data (one engine): the grid must be built from the zone data record, not hard-coded; the donor's fixed 65536 square does not fit Frankendom zones of other sizes.
- Server-verified kills: this is an interest/aggro query only. Kill verification stays in the server tick, with the one ledger; the donor code shown has no kill or reward logic.
- MAX_ATTACKERS = 3 is not enforced by this query. The aggro layer (row 4) must cap attackers after it; the donor returns every object in range.
- The donor's lazy fix-up depends on queries or the 2 s sweep to notice movement. Frankendom's server tick should rebucket on move (cheaper to reason about) or sweep on the tick; the timer that calls Relocate was not read.
- Subscribe and unsubscribe packets to clients, region-level routing and InitializeZone were not read.
- Doors and items share one grid with players and NPCs in the donor; Frankendom's kinds must be decided.
