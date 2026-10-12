# swgemu-Core3 (server-performance-scaling, cell 38)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/QuadTree.cpp` (with `TreeNode.cpp`, `objects/scene/components/GroundZoneComponent.cpp`, `managers/object/ObjectManager.cpp`, `ZoneServerImplementation.cpp`) | Licence: GNU AGPL version 3 (`COPYING` is the AGPL v3 text; `README.md` 171-172 says "either version 3 of the License, or (at your option) any later version") | C++ (engine3-based, ODB persistence) | symbol `QuadTree::inRange` (object overload, line 139) and `QuadTree::_inRange` (line 558)

Checked: Read in full: `QuadTree.cpp` update (105-137), inRange object overload (139-209), `_insert` head (283-330), `_inRange` object overload (558-629), `_inRange` range query (717-745), `TreeNode.cpp` testInRange (160-179), `GroundZoneComponent.cpp` updateZone (90-170), `ObjectManager.cpp` updatePersistentObject (494-498), onUpdateModifiedObjectsToDatabase (1026-1051), onCommitData (1053-1100), `ZoneServerImplementation.cpp` startGroundZones (238-289). Not read: the `Zone` wrapper that forwards `update` and `inRange` to the tree (the calls at GroundZoneComponent.cpp 123 and 129 reach `QuadTree::update` and `QuadTree::inRange` only by my reading of the names; the wrapper was not opened), the zone object range value (`getZoneObjectRange`, not in this box), the rest of `_insert` (331-412), the engine tree (`src/engine` is absent from the donor), the flush thread `UpdateModifiedObjectsThread` (absent), `CloseObjectsVector` internals, `ActiveAreaQuadTree`. Confidence: high on the tree query, the leave/enter logic and the move path; medium on the split rule (only the first 30 lines of `_insert` read); the persistence path is partial (call sites only). camera_scope does not apply (server donor).

## 1. Mechanism

- Sharding unit. `startGroundZones` creates one `GroundZone` per enabled zone name (`ZoneServerImplementation.cpp` 241, 258), deploys it (261), runs its load-managers task (276-277), then polls `hasManagersStarted()` every 500 ms (285-286). Each zone owns its own tree, so zones are the unit of parallel work and of locking (the thread model of `deploy` is in the missing engine tree, not read).
- Spatial index. Each zone has a quadtree of its objects. `QuadTree::update` takes the tree mutex (108) and re-files the object. `_insert` (283-330): a leaf holding one object is split into four children when a second object arrives (301), but only while one side is still larger than 8 units (306; the node is kept as a flat list if both sides are 8 or less). When splitting, objects marked "bounding" (crossing a child boundary) are not pushed down (327-328), so they stay in the parent.
- Radius query. `_inRange` (717-745) first tests the node's own objects with the exact check (724), then descends only into the children whose box passes `TreeNode::testInRange` (734-741). That test (`TreeNode.cpp` 165-179) is conservative: a box is hit if it contains the point on both axes (166), or if an edge of the box lies within range on each axis (172, 175). Corners may pass that the exact check later rejects, but no node with an in-range object is dropped.
- Move path (`GroundZoneComponent::updateZone`, 90-170). Under the zone lock (105) the object is re-filed (123). After the lock is released (125-126), the in-range refresh runs with the zone object range (129). Then active areas are updated, the transform is broadcast (a light message when `lightUpdate`, otherwise the full message, 150-156), and the object is told about its own move (160).
- Interest set update, `QuadTree::inRange(obj, range)` (139-209). The previous position is read first (157-158). (a) Each member of the object's close set that is now out of range (174) and was in range at the previous position (178) is removed from both sides (179-184). (b) The tree walk `_inRange` (558-629) adds each object now in range to both close sets (579-589). For a pair that is already known, it calls `notifyPositionUpdate` on the other side (592). (c) Objects now out of range that were in range before are removed from both sides (600-610). So each pair enters once and leaves once, on the move that crosses the edge.
- Persistence (partial). `updatePersistentObject` only sets a dirty bit (494-498). The write is done by an engine thread that is included at `ObjectManager.cpp` 20 but is not in the donor. What is in the donor is the character batch: the dirty rows are read in one query (1035, 1037), written as one multi-row `REPLACE INTO characters` (1058-1076), then cleared by one `DELETE FROM characters_dirty` keyed on each row's `character_oid` and `galaxy_id` (1061, 1078), executed after the write (1085-1086).

## 2. Key functions

- `QuadTree::inRange` (object overload): `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/QuadTree.cpp` 139-209. Close-set refresh on move: leave on crossing, then tree walk.
- `QuadTree::_inRange` (object overload): same file, 558-629. Enter, refresh and leave for the nodes that pass the box test.
- `QuadTree::_inRange` (range query): same file, 717-745. Radius query with node culling.
- `TreeNode::testInRange` (2D): `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/TreeNode.cpp` 165-179.
- `GroundZoneComponent::updateZone`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/scene/components/GroundZoneComponent.cpp` 90-170.
- `ObjectManager::onCommitData`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/object/ObjectManager.cpp` 1053-1100 (character batch write).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lazy quadtree: split a leaf only on the second insert and only while it is larger than the minimum | Minimum split side 8 units (`QuadTree.cpp` 306) |
| Box-versus-square test that is conservative (no false negatives) | None (the test itself) |
| Interest set refreshed on each move; enter and leave fire on the crossing | Zone object range (not read: `getZoneObjectRange` is not in the box) |
| Query padding for a wider scan | Pad 64 units on top of the zone range (`GroundZoneComponent.cpp` 430) |
| Dirty flag, then one batched write and one batched clear | None (SQL shape only) |
| Zone as shard: one object per enabled zone, managers started in turn | Poll every 500 ms (`ZoneServerImplementation.cpp` 286) |

For a phone and a small Node server: the 8-unit split floor and the crossing-based leave are cheap and cap tree depth. The donor has no cap on close-set size and walks the whole close set on every move (`QuadTree.cpp` 162-188), so the per-move cost grows with local density. At 1,000 to 10,000 players in one area that walk is the first thing to measure. The 500 ms manager poll is a startup cost, not a tick cost.

## 4. TypeScript sketch

simplified: The sketch keeps the donor's shape: a lazy quadtree that splits on the second insert while a side is over 8 units, a conservative node test, a radius query that culls nodes before entities, and a move step that removes pairs on the crossing edge (previous position) and adds pairs now in range. It omits: the bounding-object rule (objects crossing a boundary stay in the parent; the sketch files each entity in one leaf), the mutex and the zone lock, the root-parent redirection for objects in containers, the `notifyPositionUpdate` refresh for pairs already known (592), the active areas, the light and full transform messages, and node cleanup on empty leaves. The split condition is the donor's: split while either side is over 8 (`QuadTree.cpp` 306 stops only when both are 8 or less).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Entity {
  readonly id: number;
  x: number;
  y: number;
  prevX: number;             // position before the last move
  prevY: number;
  readonly interest: Set<Entity>; // entities this one currently sees
}

const MIN_SPLIT = 8; // a node whose sides are both 8 units or less is not split further

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

class QNode {
  items: Entity[] = [];
  kids: QNode[] | null = null;

  constructor(readonly x0: number, readonly y0: number, readonly x1: number, readonly y1: number) {}

  // Conservative box-versus-square test: never rejects a node that holds an entity in range; corners may pass.
  mayHit(x: number, y: number, r: number): boolean {
    const inX = this.x0 <= x && x < this.x1;
    const inY = this.y0 <= y && y < this.y1;
    if (inX && inY) return true;
    const nearX = Math.abs(this.x0 - x) <= r || Math.abs(this.x1 - x) <= r;
    const nearY = Math.abs(this.y0 - y) <= r || Math.abs(this.y1 - y) <= r;
    return (inX || nearX) && (inY || nearY);
  }
}

export class AoiIndex {
  private readonly root: QNode;

  constructor(x0: number, y0: number, x1: number, y1: number, private readonly range: number) {
    this.root = new QNode(x0, y0, x1, y1);
  }

  insert(e: Entity): void {
    this.place(this.root, e);
  }

  // Radius query: whole nodes are culled before their entities are tested.
  query(x: number, y: number, radius: number): Entity[] {
    const out: Entity[] = [];
    this.collect(this.root, x, y, radius, out);
    return out;
  }

  // Call after an entity moved: x/y are the new position, prevX/prevY the old one.
  // Leave when it is out of range now but was in range before; enter when it is in range now.
  updateInterest(mover: Entity): void {
    const r2 = this.range * this.range;

    for (const other of [...mover.interest]) {
      const nowOut = dist2(mover.x, mover.y, other.x, other.y) > r2;
      const wasIn = dist2(mover.prevX, mover.prevY, other.x, other.y) <= r2;
      if (nowOut && wasIn) {
        mover.interest.delete(other);
        other.interest.delete(mover);
      }
    }

    for (const other of this.query(mover.x, mover.y, this.range)) {
      if (other === mover) continue;
      mover.interest.add(other);
      other.interest.add(mover);
    }
  }

  private place(n: QNode, e: Entity): void {
    if (n.kids) {
      this.place(this.childFor(n, e.x, e.y), e);
      return;
    }
    // Split only when the leaf already holds an entity and is larger than the minimum in either side.
    if (n.items.length > 0 && (n.x1 - n.x0 > MIN_SPLIT || n.y1 - n.y0 > MIN_SPLIT)) {
      this.split(n);
      this.place(this.childFor(n, e.x, e.y), e);
      return;
    }
    n.items.push(e);
  }

  private split(n: QNode): void {
    const mx = (n.x0 + n.x1) / 2;
    const my = (n.y0 + n.y1) / 2;
    n.kids = [
      new QNode(n.x0, n.y0, mx, my),
      new QNode(mx, n.y0, n.x1, my),
      new QNode(n.x0, my, mx, n.y1),
      new QNode(mx, my, n.x1, n.y1),
    ];
    const old = n.items;
    n.items = [];
    for (const e of old) this.place(n, e);
  }

  private childFor(n: QNode, x: number, y: number): QNode {
    const mx = (n.x0 + n.x1) / 2;
    const my = (n.y0 + n.y1) / 2;
    const idx = (x >= mx ? 1 : 0) + (y >= my ? 2 : 0);
    return n.kids![idx];
  }

  private collect(n: QNode, x: number, y: number, r: number, out: Entity[]): void {
    const r2 = r * r;
    for (const e of n.items) {
      if (dist2(e.x, e.y, x, y) <= r2) out.push(e);
    }
    if (n.kids) {
      for (const k of n.kids) {
        if (k.mayHit(x, y, r)) this.collect(k, x, y, r, out);
      }
    }
  }
}

export {};
```

Typecheck: the block above (with `export {}`) was saved as `work/core3-aoi-quadtree.ts`, copied to the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `origins/server/interest.ts` (new, proposed name; the Frankendom file layout was not read): the server-side per-player interest set, refreshed on each move from a per-zone radius index. It does not read fight state; the fight step in `src/fight/` never depends on it. Parity-checklist row 18 (the send side of the server tick, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Reuse tag: rewrite-from-idea (AGPL-3.0 copyleft; clean-room only)
- Brief rule served: 1 (one engine; the interest set is the server's view, not a second ledger); rule 4 n/a

## 6. Gaps and risks

- Copyleft: clean-room. The sketch is written from the mechanism.
- Scaling: the donor walks the whole close set on every move (`QuadTree.cpp` 162-188), so cost is per move times local density. At 1,000 to 10,000 players in one zone this is the first thing to measure. Frankendom needs a cap or a per-tick budget on enter and leave work, or it has to coarsen the grid when a zone is crowded. (Not measured.)
- Locking: `QuadTree::update` and `inRange` take the tree mutex (108, 148). Our Node server is single-threaded per zone, so the mutex is not needed; do not copy it. The zone lock in `GroundZoneComponent::updateZone` (105) is the part that would matter if zones ever ran on threads.
- Pair symmetry: the leave test uses the mover's previous position against the other object's current position (`QuadTree.cpp` 175-176, 597-600). This is exact when the other object did not move in the same tick. A pair where both move in one tick was not tested (I did not run the code), so the acceptance test below must cover that case.
- Bounding objects: objects that cross a child boundary stay in the parent (327-328). The sketch files each entity in one leaf. If Frankendom adopts the donor's rule, a large fight body near a zone seam could be in a parent node and be found by every query that passes the parent. Not decided here.
- Persistence: the write is an engine thread not in the donor. The character batch in the donor (`ObjectManager.cpp` 1035-1086) clears dirty rows with a DELETE keyed on rows read earlier. A row marked dirty between the read and the DELETE could be cleared without being written. This is not verified: it depends on how `characters_dirty` rows are written, which is not in this box. For us, the rule is to clear a dirty flag only with the version that was written.
- The zone object range is not in the donor box (not read), so no number from it goes into the data fields.
- Ruling check: "server-verified kills" and "one ledger" are not touched by the interest set. Kills must still be decided in the fight step, and the interest set only decides who is told.

Best transferable idea: keep an explicit per-player interest set that changes only on crossings (enter when in range now, leave when it was in range before and is out now), fed by a radius query that culls whole quadrants before testing entities, so the server sends only pairs that changed.
Decision (proposed): adapt. Keep the crossing-based enter and leave on each move and the node-culled radius query (idea). Use a Frankendom-specific cap on enter and leave work per tick, and make the radius data per zone, not a global constant. Reject the donor's mutex and its character-batch clear (the defect above is fixed by clearing with the written version).
Acceptance: a server test runs 2,000 random moves of 20 entities in a 512-unit zone and asserts that after every move each entity's interest set equals the brute-force set of entities within range, and that every pair fires one enter and one leave per crossing.

Reuse tag: rewrite-from-idea (AGPL-3.0 copyleft; clean-room only)
Brief rule served: 1 (one engine; the interest set is a view, not a ledger)
