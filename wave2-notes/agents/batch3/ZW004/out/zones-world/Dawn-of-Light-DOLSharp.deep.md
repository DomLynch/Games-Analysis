# Dawn-of-Light-DOLSharp (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs` | Licence: GPL-2.0-or-later (Zone.cs header lines 4-6: "either version 2 ... or (at your option) any later version"; repo LICENSE is GPL v2) | C# | symbol `Zone.GetObjectsInRadius`

Checked: Read in full, on the VPS: `Zone.cs` constants and subzone index (48-61, 442-541), radius query (542-680), add/scan/relocate (680-861), per-object move rule `ShouldElementMove` (862-923), placement (926-986), distance helpers (988-1080), `GetNPCsOfZone` (1155-1200). Also read: `Region.cs` 1229-1236 (GetZone), 1459-1516 (GetInRadius), 1518-1548 (CheckShortestDistance), 1804-1812 (Relocate); `WorldMgr.cs` 440-460 and 884-905 (zone rows to Zone), 639-676 (relocation thread); `Client/168/PlayerPositionUpdateHandler.cs` 90-150 (zone change from client). Not read: the DB `Zones` table contents, where a zone's spawn tables come from (not read), zone bonus accessors, `Zone.Delete`. Confidence: high on the index, query and relocate order (read end to end, from the code); medium on the "stale-cell miss" in section 6 (follows from control flow, not run). camera: not a camera cell.

Best transferable idea: Index every NPC and player in a fixed grid of cells so radius queries read only nearby cells, accept whole cells inside the circle without a per-object check, and exact-check only the edge cells.
Decision (proposed): adapt — take the grid and the wholly-in / wholly-out cell test; reject the lazy re-filing, since the donor can miss a moved object until a scan notices it, and Frankendom's single ledger re-files on every move.
Acceptance: a server test moves an NPC across a cell edge and asserts a radius query from the far side returns it on the same tick; a property test asserts grid results equal a brute-force scan for random points and radii.

## 1. Mechanism

- A zone is a window of 65536 units from its offset, cut into a grid of 32 x 32 subzones of 2048 units each (Zone.cs:48, 55; the grid index is `column + line << 5`, Zone.cs:444). Each subzone holds four doubly linked lists, one per object type (item, NPC, player, door). The window check is at Zone.cs:449-452: a point more than 65535 units from the zone offset gets index -1 and is not indexed by this zone.
- Insert: `ObjectEnterZone` computes the subzone from the object's position and pushes a node on that subzone's list (Zone.cs:465 onward). Objects are not moved when they walk; the node stays in the cell it was filed under.
- Staleness: a cell is brought up to date only when someone scans it. Two paths do that: (a) a radius query that visits the cell, and (b) the relocation sweep when the cell's refresh timer has expired (2000 ms, Zone.cs:61, 783, 850).
- Radius query (`GetObjectsInRadius`, Zone.cs:542): the cell box is `(radius >> 11) + 1` cells on each side of the centre cell (553), clamped to the grid. For each non-empty cell in the box, in row-major order:
  - the centre's own cell: every object gets an exact squared-distance check (`UnsafeAddToListWithDistanceCheck`, 714-762; the check is at 750);
  - another cell: `CheckMinDistance` (617) drops cells that are wholly outside the circle; `CheckMaxDistance` (621) tests whether the whole cell is inside the circle; if so every object is added with no distance check (`UnsafeAddToListWithoutDistanceCheck`, 628, 678-712); otherwise each object gets the exact check.
  - every cell visited gets a new refresh timestamp, now + 2000 ms (`UnsafeUpdateSubZoneTimestamp`, 850).
- Per-object move rule (`ShouldElementMove`, 862-923), run on each node of each scanned cell, before the distance test:
  - object null, not Active, or in another region: ghost, removed, count decremented (914-920);
  - object now in another zone of the same region (index -1 here): queued for `PlaceElementsInOtherZones` and not returned by this scan (877-886);
  - object now in another cell of this zone (897): removed from this list and queued for `PlaceElementsInZone` (after the scan, so it is put into the new cell's list then);
  - object still in this cell: returned if within range.
- Relocation sweep: thread `RelocateRegions` wakes every 200 ms (WorldMgr.cs:646); for each region with `NumPlayers > 0` whose last relocation is more than 2000 ms old (653), `Region.Relocate` (1804-1812) calls `Zone.Relocate` on each zone. `Zone.Relocate` (766-846) skips a zone with no objects (769); for each cell and type whose timestamp has expired (783), it runs the same `ShouldElementMove` pass over the list and sets a new timestamp (850) if the list is not empty.
- Zone boundaries: `Region.GetZone` (1229-1238) returns the first zone whose half-open rectangle holds the point (`Offset.X <= x < Offset.X + Width`, same for Y, 1234). `Region.GetInRadius` (1459-1477) first queries the centre's zone, then every other zone with at least one object (1471-1472) whose nearest edge lies within the radius (`CheckShortestDistance`, 1518-1548). If the centre is in no zone the query returns an empty enumerator and logs an error (the else branch, 1511-1514; read).
- Zone rows: zones come from the DB `Zones` table (WorldMgr.cs 449-456). Offset and size are stored as bytes in 8192-unit blocks (`zoneData.OffX * 8192`, 898; `zoneData.Width * 8192`, 900).
- Transitions: the client sends its own zone id and an in-zone X and Y (PlayerPositionUpdateHandler.cs:92-94). The server looks the zone id up (117; unknown id leads to a move to bind, 119-130), takes `realZ == 0` as a fall-through (134-137), and sets the absolute position to `Offset.X + xOffsetInZone` (141). If the zone differs from `LastPositionUpdateZone` it sends the position, sends the zone description message, and stores the new zone (148-180, read in part).
- Random NPC from a zone (`GetNPCsOfZone`, 1171-1210): starts at a random subzone (1179), walks the cells with wrap-around, and with `firstOnly` returns the first matching NPC it meets.

## 2. Key functions

- `Zone.GetObjectsInRadius`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Zone.cs` 542-680. Cell box, prune, add, refresh, then relocation of moved objects.
- `Zone.UnsafeAddToListWithDistanceCheck` 714-762 and `Zone.UnsafeAddToListWithoutDistanceCheck` 678-712: per-cell scan, both call `ShouldElementMove` first.
- `Zone.ShouldElementMove` 862-923: the move rule; decides removal and queues the object for its new cell or zone.
- `Zone.Relocate` 766-846 and `Zone.UnsafeUpdateSubZoneTimestamp` 848-860: the timer-gated sweep.
- `Zone.PlaceElementsInZone` 926 and `Zone.PlaceElementsInOtherZones` 954-986: put moved nodes into their new cell or new zone.
- `Zone.GetSubZoneIndex` 447-457: window and cell index.
- `Zone.CheckMinDistance` 1025, `Zone.CheckMaxDistance` 1065: cell pruning. `Zone.CheckSquareDistance` 988: exact check, XY plus Z unless `ignoreZ`.
- `Region.GetInRadius` 1459-1516 and `Region.CheckShortestDistance` 1518-1548: zone-to-zone query.
- `Region.GetZone` 1229-1238 and `Region.Relocate` 1804-1812.
- `WorldMgr` relocation thread `RelocateRegions` 639-676.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Grid of cells, object filed in one cell | 32 per side (engine constant, Zone.cs:48) |
| Cell size | 65536 / 32 = 2048 units (engine constant, Zone.cs:55) |
| Query reach in cells | radius >> 11, plus one (engine rule, Zone.cs:553) |
| Window limit for indexing | 65535 units from zone offset (engine rule, Zone.cs:452) |
| Zone offset and width | 8192-unit blocks per DB row (zone data, WorldMgr.cs:898-900) |
| Cell refresh after a scan | 2000 ms (engine constant, Zone.cs:61) |
| Relocation poll | 200 ms (engine constant, WorldMgr.cs:646) |
| Relocation only with players present | `NumPlayers > 0` (engine rule, WorldMgr.cs:653) |

## 4. TypeScript sketch

simplified: the sketch keeps the cell grid, the cell box, the wholly-outside prune, the wholly-inside add, and the exact check on the edge cells. It is 2D (XY only, no Z and no `ignoreZ`); it has no lists per object type, no region or zone hand-off (a point outside this window is simply not indexed and queries from outside return the objects that are near in this window), no locks, and no refresh timers. It differs from the donor in one deliberate way: `move` re-files the object at once, so there is no stale cell (the donor's lazy re-filing is not copied). The cell box is the exact bound of the circle, where the donor uses `radius >> shift` plus one (a superset).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }
interface Obj { id: number; pos: Pt; }

const SIDE = 32;                  // cells per side of one zone window
const WINDOW = 65536;             // units covered by one zone window
const CELL = WINDOW / SIDE;       // 2048 units per cell

function sqMinDist(px: number, py: number, x0: number, x1: number, y0: number, y1: number): number {
  const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
  const dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0;
  return dx * dx + dy * dy;
}

function sqMaxDist(px: number, py: number, x0: number, x1: number, y0: number, y1: number): number {
  const dx = Math.max(Math.abs(px - x0), Math.abs(px - x1));
  const dy = Math.max(Math.abs(py - y0), Math.abs(py - y1));
  return dx * dx + dy * dy;
}

class ZoneGrid {
  private readonly cells: Set<Obj>[] = Array.from({ length: SIDE * SIDE }, () => new Set<Obj>());
  private readonly where = new Map<Obj, number>();

  constructor(private readonly ox: number, private readonly oy: number) {}

  // -1 when the point is outside this zone window; such objects are not indexed here
  private cellOf(p: Pt): number {
    const dx = p.x - this.ox;
    const dy = p.y - this.oy;
    if (dx < 0 || dx >= WINDOW || dy < 0 || dy >= WINDOW) return -1;
    return Math.floor(dy / CELL) * SIDE + Math.floor(dx / CELL);
  }

  insert(o: Obj): void {
    const c = this.cellOf(o.pos);
    if (c < 0) return;
    this.cells[c].add(o);
    this.where.set(o, c);
  }

  remove(o: Obj): void {
    const c = this.where.get(o);
    if (c === undefined) return;
    this.cells[c].delete(o);
    this.where.delete(o);
  }

  // Re-file at once on every move, so a query never reads a stale cell.
  move(o: Obj, to: Pt): void {
    this.remove(o);
    o.pos = to;
    this.insert(o);
  }

  // Objects within `radius` (2D) of `center`.
  query(center: Pt, radius: number): Obj[] {
    const out: Obj[] = [];
    const r2 = radius * radius;
    const px = center.x - this.ox;
    const py = center.y - this.oy;
    const minCol = Math.max(0, Math.floor((px - radius) / CELL));
    const maxCol = Math.min(SIDE - 1, Math.floor((px + radius) / CELL));
    const minRow = Math.max(0, Math.floor((py - radius) / CELL));
    const maxRow = Math.min(SIDE - 1, Math.floor((py + radius) / CELL));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const x0 = col * CELL, x1 = x0 + CELL;
        const y0 = row * CELL, y1 = y0 + CELL;
        if (sqMinDist(px, py, x0, x1, y0, y1) > r2) continue;   // cell wholly outside the circle
        const wholeCellIn = sqMaxDist(px, py, x0, x1, y0, y1) <= r2;
        for (const o of this.cells[row * SIDE + col]) {
          if (wholeCellIn) { out.push(o); continue; }
          const ex = o.pos.x - this.ox - px;
          const ey = o.pos.y - this.oy - py;
          if (ex * ex + ey * ey <= r2) out.push(o);
        }
      }
    }
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw004-dol-zone-grid.ts`: exit 0, no errors.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic; the grid is the neighbour lookup it needs, a new `origins/server/zone-grid.ts` if the server wants it as its own module). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The grid answers "is a player within R of this cell" for the despawn and coverage checks. The population sweep itself is not in this donor cell (not read).
- Today: Frankendom has no zone grid in the reviewed material. (Not checked in the game repo; the target path is from the addendum.)
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (one runtime; the cell size and window are engine constants, the zone offset and size are zone data); server tick intake is not in this cell.

## 6. Gaps and risks

- Stale cells: the donor files a moved object under its old cell until a scan or the sweep notices. A query can then miss an object that moved into a cell already scanned in the same query (the object is found in the old cell later, moved, and not returned). This follows from `ShouldElementMove` and the scan order (control-flow reasoning, not run). Frankendom is one server ledger: re-file on every move (the sketch does this) and test it.
- Client-named zone and in-zone position: `PlayerPositionUpdateHandler.cs:92-141` takes the zone id and the in-zone X from the client and does not bound-check the X against the zone width in the lines read. Frankendom's ruling is server-verified: zone changes must come from server-side portal or bind checks, not a client-named zone. The later speed and jump checks in the same handler were not read.
- Objects that leave the window into no zone: `PlaceElementsInOtherZones` (Zone.cs:976-980) calls `ObjectEnterZone` only when `GetZone` finds a zone. Otherwise the node has already been removed from its list and is not re-added (control-flow reading, not run). Frankendom must have one defined place for "outside every zone".
- Window limit: the index ignores points more than 65535 units from a zone's offset (Zone.cs:452). Whether any DB zone is larger was not checked.
- Random NPC choice (`GetNPCsOfZone`, 1179 and the loop after it): the random start cell, then first match, is not a uniform pick over NPCs; cells after a long empty run are picked more often (inference from the loop). Frankendom spawn picks should use an explicit list and a uniform draw.
- Centre outside every zone: empty result (Region.cs GetInRadius else branch). Frankendom must decide what a fight near a zone border does.
- Not read: where a zone's NPC spawns come from (DB spawn tables), and the rest of the zone-change flow (translation and bonus code after line 180).
