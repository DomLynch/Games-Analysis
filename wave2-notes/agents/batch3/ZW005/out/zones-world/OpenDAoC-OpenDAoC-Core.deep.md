# OpenDAoC-OpenDAoC-Core (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Zone.cs` (with `world/SubZone.cs`, `ECS-Services/ZoneService.cs`, `ECS-Components/MovementComponent.cs`, `world/Area.cs`, `world/WorldMgr.cs`, `world/Region.cs`) | Licence: GPL-3.0 (donor `LICENSE`, line 1: "GNU GENERAL PUBLIC LICENSE", Version 3, 29 June 2007) | C# | symbol `Zone.GetObjectsInRadius` / `Zone.CheckForRelocation` / `ZoneService.TickInternal`

Checked: Opened as candidates: `world/Zone.cs` (225-330, 330-470, 478-537, 550-556, 676-692), `world/SubZone.cs` (all 161 lines), `ECS-Services/ZoneService.cs` (all 104), `ECS-Components/MovementComponent.cs` (1-75), `ECS-Services/GameServiceUtils.cs` (13-30), `ECS-Components/PlayerMovementComponent.cs` (96-112), `world/Area.cs` (100-330, 493-544), `world/WorldMgr.cs` (581-625, 688-700, 1050-1060), `world/Region.cs` (150-156, 977-986), `gameobjects/GameObject.cs` (645, grep only), `gameobjects/GameNPC.cs` (1012-1024). Grep for `respawn`, `population`, `spawn cap`, `max npc/mob/player` and `MaxNPC`/`NpcLimit` over `world/Zone.cs`, `world/Region.cs`, `world/WorldMgr.cs` returned nothing. Not read: `Zone.cs` 470-478 and 565-680 (area lookup, NPC queries), `Area.cs` Polygon (330-492), `ZonePointEffects.cs`, `ZoneBonus.cs`, the calling service for `MovementComponent.Tick`, the `ServiceObjectStore` internals, and the enclosing function name for `GameObject.cs` 645. Not run: no C# build or test was run. Confidence: high on the grid, the query and the queued relocation (read end to end); high on the Z-skip inconsistency (read; not run); medium on the wide-zone limit (derived from constants, not checked against zone data). Scope: world zones (not a camera; `camera_scope` does not apply).

Best transferable idea: index the objects of a zone in a fixed grid of cells, answer radius queries by culling cells with their nearest distance, and apply cell changes in a queued pass once per tick, with movement flags plus a timer as the only trigger.
Decision (proposed): adapt - take the fixed cell grid per zone, the ring query with nearest-distance culling, and the queued relocation applied once per tick; reject the Z-skip in fully-enclosed cells, the silent failure when an object is outside the grid (it is then not in any query), and the hard-coded move-to-bind policy on failure. Why for Frankendom: many-on-one and zone queries (who is in reach of this defender) need a cheap radius query; the Pit (one fixed arena, MAX_ATTACKERS = 3) does not need the index, so this is for the world only.
Acceptance: A server test puts 5000 objects in one zone, asserts that 1000 random 3D radius queries (including centres on cell edges and near the zone border) return exactly the brute-force set, and that an object moved across a cell edge is in its new cell after one tick and not before.

## 1. Mechanism

- Zone geometry. A zone is an axis-aligned rectangle at `XOffset, YOffset` with `Width, Height` (`Zone.cs` 34-37, 232-240). `WorldMgr.RegisterZone` builds it from zone data as `OffX * 8192` and `Width * 8192` (`WorldMgr.cs` 605-611), so zone data is in 8192-unit blocks. `IsPointInZone` is half-open: `XOffset <= x` and `x < XOffset + Width` (`Zone.cs` 688). `Region.GetZone(x, y)` is a linear scan over the region's zones, first match (`Region.cs` 977-986).
- Cell grid inside a zone. Each zone creates 32 x 32 = 1024 `SubZone`s (`Zone.cs` 21-22, 214, 251-252), each 65536 / 32 = 2048 units square (23), with a shift of 11 bits (24). The cell index of a point is `(x - XOffset) >> 11` and `(y - YOffset) >> 11`, packed as line times 32 plus column (`Zone.cs` 277-290, 268). A point outside 0..65535 of the zone offset has no cell and returns -1 (283).
- Each `SubZone` keeps one linked list per `eGameObjectType` (`SubZone.cs` 13, 27-38), so a query can skip empty lists per type (`Zone.cs` 370).
- Radius query, in order (`Zone.cs` 330-394). (a) `sqRadius = radius * radius` (332). (b) The ring is `(radius >> 11) + 1` cells in each direction from the centre cell (337-355), clamped to the 32 x 32 grid. (c) For each non-empty cell in the ring: if it is not the centre cell, skip it when its nearest distance to the point is more than the radius (379; min-distance at 512-537, uses the nearest edge when the point's x is inside the cell's x range, else the nearest corner). (d) If the farthest corner is within the radius, the cell is "fully inside" (383; max-distance at 550-556). (e) Each object in the cell is kept when `ignoreDistance` is true or when `IsWithinSquaredRadius` holds (389). That helper adds the x, y and z squares (480-498). So a fully-inside cell skips the z test as well (see section 6).
- Relocation trigger (`MovementComponent.cs` 56-68, `SubZone.cs` 156-159). A movement component runs a check when `_relocationCheckPending` is set (movement sets it, 68) or when `ShouldTick(_nextRelocationCheckTick)` is true (58, 20 in `GameServiceUtils.cs`). The check then reschedules itself 2000 ms ahead (8, 62) and clears the pending flag (63). A player position change that moves in XY calls `UpdateLastMovementTick` (`PlayerMovementComponent.cs` 104-107).
- Relocation itself (`Zone.cs` 398-466). If the object's cell is still the same, stop (407-411). Otherwise, if the object is still active and in this zone's region (423): when its new point is outside this zone (`newSubZoneIndex == -1`), look up the zone in the region (428), and if none exists, move a player to bind or remove any other object from the world (430-437, 459-465); otherwise queue a transition to the new zone's cell (451). If the object is in a different state or region, queue a transition to no cell (457).
- Queued transition (`SubZone.cs` 97-134). `InitiateSubZoneTransition` stores the destination zone and cell (110-111), returns early if a transition is already queued (114-115), and otherwise adds the object to the service store and sets the queued flag (117, 128). A concurrent call is refused by a guard flag (100-106).
- Applied once per tick (`ZoneService.cs` 23-43). `Tick` takes the view of queued `SubZoneObject`s and runs `TickInternal` on each (39). `TickInternal` returns when the current and destination cell are equal (56-57). Otherwise: moving between cells of one zone uses `AddObjectToThisAndRemoveFromOther` (70); leaving to nothing uses `RemoveObject` (80); a first insert uses `AddObject` (88). Zone counters are updated when the zone changes (72-76, 82-83, 90-91). The queued flag is cleared in a `finally` (100, `SubZone.cs` 151).

## 2. Key functions

- `Zone.GetObjectsInRadius` (3D): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Zone.cs` 330-394. Ring query with distance culls.
- `Zone.CheckForRelocation` and `Relocate`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Zone.cs` 398-466. Same cell stops; new zone via region lookup; abort policy.
- `Zone.GetSubZoneIndex`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Zone.cs` 277-292. Point to cell, or -1.
- `SubZoneObject.InitiateSubZoneTransition`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/SubZone.cs` 97-134. Queue with a single pending move.
- `ZoneService.TickInternal`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/ZoneService.cs` 45-102. Applies the move once per tick.
- `MovementComponent.TickInternal`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Components/MovementComponent.cs` 56-64. Flag or timer gate.
- `Area.Circle.IsContaining` (point test used by areas, a different thing from the zone grid): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/world/Area.cs` 278-300.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed cell grid per zone | 32 x 32 cells (`Zone.cs` 21-22); cell 2048 units (23); shift 11 (24) |
| Zone extent the grid covers | 65536 units per side, checked as 0..65535 from the zone offset (283) |
| Ring size for a radius | `(radius >> 11) + 1` cells (337) |
| Cell cull | nearest distance to the cell's rectangle, squared, compared with radius squared (379, 512-537) |
| Fully-inside shortcut | farthest corner squared within radius squared (383, 550-556); skips the z test (389) |
| Relocation timer | 2000 ms (`MovementComponent.cs` 8) |
| Zone data units | `OffX * 8192`, `Width * 8192` (`WorldMgr.cs` 608-611) |
| Circle area test | prefilter `x - X > Radius` and `y - Y > Radius` (`Area.cs` 282, 286); `dist squared <= Radius * Radius` (291, 299) |
| Circle z test | used only when both points have nonzero z (293) |
| Square area | lower bound 0, upper bound Width (`Area.cs` 142); Width and Height both = radius from DB (169-170) |
| Respawn | per mob, `RespawnInterval * 1000` ms (`GameNPC.cs` 1022); none per zone (grep) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's fixed 32 x 32 grid per zone, the ring query with a nearest-distance cull per cell, and the queued cell move applied once per tick, with the movement flag or the 2 s timer as the only trigger. It omits: the cross-zone lookup and the move-to-bind or remove-from-world policy on failure (`Zone.cs` 428-465), the per-type lists (one set here), the ServiceObjectStore view and the locking, the fully-inside shortcut, and the reference-cell skip. It differs on purpose in two places: the z test is applied in every cell (the donor skips it for fully-inside cells, 389), and the destination is read from the object's position when the move is applied (the donor stores the destination when the move is requested, `SubZone.cs` 110-111, last call wins). The sketch clamps the query centre to the grid, where the donor clamps the ring bounds.

```ts
// Licence: GPL-3.0 (donor LICENSE). CLEAN-ROOM sketch written from the mechanism (fixed cell grid inside a zone,
// ring query with distance culls, queued cell moves applied once per tick, timer plus movement flag for relocation).
export interface Obj { id: number; x: number; y: number; z: number; cell: number | null; queued: boolean; }

const ZONE_SPAN = 65536;             // fixed zone extent in world units
const SIDE = 32;                     // cells per zone side
const CELL = ZONE_SPAN / SIDE;       // 2048 units per cell
const CELL_SHIFT = 11;               // log2(CELL)
const RELOCATION_MS = 2000;          // timer for objects that moved without a flag

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class ZoneGridSim {
  readonly cells: Set<Obj>[] = Array.from({ length: SIDE * SIDE }, () => new Set<Obj>());
  private queue: Obj[] = [];

  constructor(readonly xOff: number, readonly yOff: number) {}

  cellOf(x: number, y: number): number | null {
    const dx = x - this.xOff, dy = y - this.yOff;
    if (dx < 0 || dy < 0 || dx >= ZONE_SPAN || dy >= ZONE_SPAN) return null;
    return ((dy >> CELL_SHIFT) << 5) | (dx >> CELL_SHIFT);
  }

  // Objects within radius r in 3D. Every non-empty cell in the ring is culled by its nearest distance;
  // no cell skips the Z test (the donor skips it for cells fully inside the radius).
  near(x: number, y: number, z: number, r: number): Obj[] {
    const r2 = r * r;
    const ring = (r >> CELL_SHIFT) + 1;
    const cx = clamp((x - this.xOff) >> CELL_SHIFT, 0, SIDE - 1);
    const cy = clamp((y - this.yOff) >> CELL_SHIFT, 0, SIDE - 1);
    const out: Obj[] = [];
    for (let row = Math.max(0, cy - ring); row <= Math.min(SIDE - 1, cy + ring); row++) {
      for (let col = Math.max(0, cx - ring); col <= Math.min(SIDE - 1, cx + ring); col++) {
        const set = this.cells[(row << 5) | col];
        if (set.size === 0) continue;
        const left = this.xOff + col * CELL, top = this.yOff + row * CELL;
        const right = left + CELL, bottom = top + CELL;
        const ddx = Math.max(left - x, 0, x - right), ddy = Math.max(top - y, 0, y - bottom);
        if (ddx * ddx + ddy * ddy > r2) continue;
        for (const o of set) {
          const ox = x - o.x, oy = y - o.y, oz = z - o.z;
          if (ox * ox + oy * oy + oz * oz <= r2) out.push(o);
        }
      }
    }
    return out;
  }

  // Movement code only queues; the cell change happens in tick(). One pending move per object.
  requestRelocate(o: Obj): void {
    if (o.queued) return;
    o.queued = true;
    this.queue.push(o);
  }

  // Applied once per game tick. The destination is read from the object's current position when applied.
  tick(): void {
    for (const o of this.queue) {
      o.queued = false;
      const dest = this.cellOf(o.x, o.y);
      if (dest === o.cell) continue;
      if (o.cell !== null) this.cells[o.cell].delete(o);
      if (dest !== null) this.cells[dest].add(o);
      o.cell = dest;
    }
    this.queue = [];
  }
}

// Relocation check is due when movement flagged it, or when the 2 s timer has expired.
export class RelocationGate {
  private pending = false;
  private nextAt = 0;

  markMoved(): void { this.pending = true; }

  due(now: number): boolean {
    if (!this.pending && now < this.nextAt) return false;
    this.nextAt = now + RELOCATION_MS;
    this.pending = false;
    return true;
  }
}

export function checkRelocation(zone: ZoneGridSim, o: Obj): void {
  if (zone.cellOf(o.x, o.y) !== o.cell) zone.requestRelocate(o);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/zone-grid.ts` (new module, proposed): per-zone cell index, radius query and the queued relocation. Parity-checklist row 23 (zone population). Fit is partial: the index is what population queries would use, but this donor has no spawn caps, zone respawn or despawn (grep found none in `Zone.cs`, `Region.cs`, `WorldMgr.cs`; respawn is per mob at `GameNPC.cs` 1022). So row 23 gets the index only, and the caps have no donor source here.
- Reuse tag: adapt-from-idea (GPL-3.0; clean-room, shape only; the sketch was written from the mechanism, no lines were translated)
- Brief rule served: zones as data (zone rectangles come from zone data in 8192-unit blocks); server-verified (the queries and moves run on the server, the client does not see cells)

## 6. Gaps and risks

- Z is skipped in fully-inside cells (`Zone.cs` 383, 389). `CheckSubZoneMaxDistance` (550-556) measures only x and y, so an object far above or below the point is returned from a fully-inside cell and rejected from a border cell. The radius query is therefore 3D on the border and 2D inside. Not run; a test should show it. Frankendom must not copy the shortcut.
- Relocation lags by one tick: the move is applied in `ZoneService.Tick` (`ZoneService.cs` 39), so a query in the same tick sees the object in its old cell. Decide the rule (queries use the old cell for one tick, or the move is applied before queries) and test it.
- Two triggers, one of them slow. The timer fallback is 2000 ms (`MovementComponent.cs` 8), so an object that moved without a flag can sit in the wrong cell for up to two seconds. Frankendom's server should flag every position change and drop the timer.
- An object outside the grid is silently not in any cell: `AddObject` logs an error and returns false (`Zone.cs` 303-309), and no query will ever find it. The zone size is fixed by the grid (65536 units), while zone data sets `Width * 8192` (`WorldMgr.cs` 610). A zone wider than 8 blocks would lose its far part. Not checked against real zone data. Frankendom should validate zone size at load.
- Failure policy is hard-coded: players are moved to bind, other objects are removed (`Zone.cs` 459-465). Frankendom's rulings say zones are data, so the policy must come from data.
- `BindArea`, `SafeArea` and `Circle` use the radius as a true circle, but `Square` (the box used by zone areas) uses the radius as a side length (`Area.cs` 169-170). The DB field name is the same. Name the shape in data.
- Integer overflow: the circle caches `radius * radius` in an `int` (`Area.cs` 212, 251). Radius above 46340 overflows. Not checked against real data; keep the cache in a wider type.
- Zero means any height: the z test is skipped when either point has z = 0 (`Area.cs` 293). That is a convention for ground-level points, not a rule. Frankendom should make it an explicit field.
- Fit to rulings: the index serves many-on-one queries (who is in reach), which the Pit does not need (one fixed arena, MAX_ATTACKERS = 3). Use it in the world only. Server-verified kills are unaffected (queries are server-side).
- Unread: `Zone.cs` 565-680 (NPC queries and area lookup), `Area.cs` Polygon, `ZonePointEffects.cs`, `ZoneBonus.cs`, the caller of `MovementComponent.Tick`, `ServiceObjectStore`.
