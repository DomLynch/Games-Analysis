# FWGS-xash3d-fwgs (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_world.c` (`SV_CreateAreaNode` 419-459, `SV_ClearWorld` 461-482, `SV_TouchLinks` 499-574, `SV_LinkEdict` 627-696) | Licence: GPL-3.0-or-later (`sv_world.c` header lines 3-8: "either version 3 of the License, or (at your option) any later version"; no root LICENSE file in the donor tree, so the per-file header is the licence) | C | symbol `SV_CreateAreaNode`

Best transferable idea: Split the world into a fixed four-level tree of boxes once, file each entity in the first box its extent crosses, and find triggers by walking only the boxes the mover overlaps, with a trigger's brush test done on the mover's origin point.
Decision (proposed): adapt - take the fixed split tree, the first-crossed-node link and the overlap-only walk; reject the level-triggered touch (the donor fires the touch on every relink while overlapping, so the game must debounce it), and use enter and exit state in our ledger.
Acceptance: a server test: a player walks into a zone-boundary trigger; the transition fires once on enter and not on each tick inside; a trigger whose box overlaps but whose origin is outside its volume does not fire; a tree query returns the same set as a brute-force scan for random boxes.

Checked: Read on the VPS: `sv_world.c` 1-30 (header and includes), 360-500 (link helpers, `SV_CreateAreaNode`, `SV_ClearWorld`, `SV_UnlinkEdict`), 499-580 (`SV_TouchLinks`), 580-700 (`SV_FindTouchedLeafs`, `SV_LinkEdict`). Constants by grep: `common/world.h` 33-34 (`AREA_NODES` 32, `AREA_DEPTH` 4), `edict.h` 19-20 (`MAX_ENT_LEAFS_32`, `MAX_ENT_LEAFS_16` 48), `sv_cmds.c` 898 and 1043 (the playersonly command). Other candidates opened: `sv_game.c` by grep only (4315-4360, PVS leaf test, not read as a whole); `sv_frame.c` by grep only (986, changelevel check); `sv_move.c` and `sv_client.c` by grep only (callers of `SV_LinkEdict(ent, true)`). Not read: trace clipping (`SV_ClipToLinks`, `SV_ClipToPortals`, `SV_PortalCSG`), the PVS build that reads the leaf lists, and the game-side changelevel path. The hint file was the right file. Confidence: high on the tree build, link and touch order (read end to end); medium on the reading of the touch as level-triggered (follows from the code, not run). camera: not a camera cell.

## 1. Mechanism

- Tree build (`SV_CreateAreaNode`, 419-459, called from `SV_ClearWorld` at 476 on the world model's bounds): at each node the box is split on its longer horizontal side (438; x if the x size is larger, else y) at the midpoint (442). Children are built recursively: `children[0]` gets the upper half (449), `children[1]` the lower half (450). At depth `AREA_DEPTH` (430; 4) the node is a leaf with axis -1. That gives 16 leaves and 31 nodes, inside the pool of `AREA_NODES` (32; `world.h` 33-34).
- Each node carries three lists: solid, trigger and portal (`SV_CreateAreaNode` clears all three, 426-428). Entities are filed into one of them.
- Linking (`SV_LinkEdict`, 627-696):
  - it unlinks the entity from its old place (`SV_UnlinkEdict`, 484-497) and skips the world and invalid entities;
  - it finds the BSP leaves the entity's box touches (`SV_FindTouchedLeafs`, 581-625), up to `MAX_ENT_LEAFS` (655; 48 for 16-bit cluster indexes, `edict.h:20`); beyond that it stores the head node instead (659) and sets the leaf count to zero;
  - non-solid bodies with no skin are not linked (664-665);
  - it walks down from the root: if the box is wholly above the plane (673) it goes to child 0 (674); if wholly below, child 1; otherwise it stops at the node the box crosses (677). That node is the one the entity is filed in;
  - a trigger is filed in that node's trigger list (682); portals and solid bodies go to their own lists (683-685, read).
- Touch pass (`SV_TouchLinks`, 499-574), run only when `SV_LinkEdict` was called with `touch_triggers` and the recursion guard is clear (687-690; `iTouchLinkSemaphore`, 408):
  - for each trigger in this node (504), in order:
    - if the game DLL supplies `SV_TriggerTouch` (514), that function alone decides the touch (517);
    - otherwise skip the entity itself and anything that is not `SOLID_TRIGGER` (522), require the group test (525), and require the absolute boxes to overlap (528);
    - for a brush trigger, the test point is the entity origin, offset by the hull offset (549), and it must be inside the brush (`PM_HullPointContents` not `CONTENTS_SOLID`, 553), otherwise skip;
    - point triggers are fired on box overlap alone;
    - the callback into the game (`pfnTouch`, 562) runs only when `!sv.playersonly` (559).
  - then it recurses: child 0 if the box's top is above the plane (569), child 1 if its bottom is below (571). A box that straddles the plane visits both children.
- Freeze-except-players: the console command sets `sv.playersonly` (898) and describes itself as "freezes time, except for players" (1043). While it is set the touch callbacks are not made, but the lists are still walked.

## 2. Key functions

- `SV_CreateAreaNode` - `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/server/sv_world.c` 419-459: builds the tree.
- `SV_ClearWorld` - `sv_world.c` 461-482: resets the pool and calls the builder on the world bounds.
- `SV_LinkEdict` - `sv_world.c` 627-696: leaf list, node choice, trigger filing, touch call.
- `SV_TouchLinks` - `sv_world.c` 499-574: the overlap-only walk and the brush test.
- `SV_FindTouchedLeafs` - `sv_world.c` 581-625: BSP leaf (cluster) list for each entity.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Tree depth, leaves at depth 4 | 4 (engine constant, `common/world.h:34`) |
| Node pool | 32 (engine constant, `common/world.h:33`); 31 nodes are used at depth 4 |
| Split axis | longer side of the box, ties to y (engine rule, `sv_world.c:438-440`) |
| Split plane | midpoint of the box on that axis (engine rule, `sv_world.c:442`) |
| Leaf-list limit | 48 for 16-bit cluster indexes (engine constant, `edict.h:20`); 24 for 32-bit (`edict.h:19`) |
| Brush trigger test | origin inside the brush (engine rule, `sv_world.c:553`) |
| Point trigger test | absolute box overlap (engine rule, `sv_world.c:528`) |

The world box is the map's own bounds (`sv.worldmodel->mins/maxs`, `sv_world.c:476`). It is map data, not a constant in this file.

## 4. TypeScript sketch

simplified: the sketch keeps the fixed split tree (depth 4, longer side, midpoint, upper child first), the first-crossed-node link for triggers, the overlap-only walk, the origin test for triggers, and the playersonly suppression. It is 2D (X and Y only; the donor's split axis is also only X or Y). It omits: solid and portal lists, the BSP leaf lists, the `MOVETYPE_FOLLOW` case, the non-solid skip, the game DLL override (`SV_TriggerTouch`), the group test, the recursion guard for touch callbacks that relink entities, and the actual callback (the sketch returns the touched list and leaves the callback to the caller). Each entity is filed in at most one node; the sketch keeps the node for each entity so a relink removes the old entry first.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Box { minX: number; minY: number; maxX: number; maxY: number; }
interface Ent { id: number; box: Box; origin: { x: number; y: number }; trigger: boolean; }

const DEPTH = 4; // leaves at depth 4: 16 leaves, 31 nodes in all

interface AreaNode {
  axis: 0 | 1 | -1;                 // -1 = leaf
  dist: number;
  children: [AreaNode, AreaNode] | null; // [upper, lower]
  triggers: Set<Ent>;
}

function axisMin(b: Box, axis: 0 | 1): number { return axis === 0 ? b.minX : b.minY; }
function axisMax(b: Box, axis: 0 | 1): number { return axis === 0 ? b.maxX : b.maxY; }
function overlaps(a: Box, b: Box): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// Uniform split of the world box, always on its longer side, down to DEPTH.
export function buildTree(depth: number, b: Box): AreaNode {
  const node: AreaNode = { axis: -1, dist: 0, children: null, triggers: new Set<Ent>() };
  if (depth === DEPTH) return node;
  const axis: 0 | 1 = (b.maxX - b.minX) > (b.maxY - b.minY) ? 0 : 1;
  const dist = 0.5 * (axis === 0 ? b.minX + b.maxX : b.minY + b.maxY);
  const upper: Box = axis === 0 ? { ...b, minX: dist } : { ...b, minY: dist };
  const lower: Box = axis === 0 ? { ...b, maxX: dist } : { ...b, maxY: dist };
  node.axis = axis;
  node.dist = dist;
  node.children = [buildTree(depth + 1, upper), buildTree(depth + 1, lower)];
  return node;
}

// Link an entity into the first node its box crosses (one node per entity).
export function link(root: AreaNode, e: Ent, where: Map<Ent, AreaNode>): void {
  const old = where.get(e);
  if (old) { old.triggers.delete(e); where.delete(e); }
  let node = root;
  while (node.axis !== -1 && node.children) {
    if (axisMin(e.box, node.axis) > node.dist) node = node.children[0];
    else if (axisMax(e.box, node.axis) < node.dist) node = node.children[1];
    else break;
  }
  if (e.trigger) { node.triggers.add(e); where.set(e, node); }
}

// Triggers that `e` touches. Coarse test: box overlap. Fine test: `inside` (point or volume test on the origin).
function collect(node: AreaNode, e: Ent, inside: (t: Ent, origin: { x: number; y: number }) => boolean, out: Ent[]): void {
  for (const t of node.triggers) {
    if (t === e || !overlaps(e.box, t.box)) continue;
    if (inside(t, e.origin)) out.push(t);
  }
  if (node.axis === -1 || !node.children) return;
  if (axisMax(e.box, node.axis) > node.dist) collect(node.children[0], e, inside, out);
  if (axisMin(e.box, node.axis) < node.dist) collect(node.children[1], e, inside, out);
}

// Move an entity: relink, then report the triggers it touches (none while playersOnly is set).
export function moveEntity(
  root: AreaNode,
  where: Map<Ent, AreaNode>,
  e: Ent,
  playersOnly: boolean,
  inside: (t: Ent, origin: { x: number; y: number }) => boolean,
): Ent[] {
  link(root, e, where);
  const out: Ent[] = [];
  if (!playersOnly) collect(root, e, inside, out);
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw004-xash-area-tree.ts`: exit 0, no errors.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` for the presence use (row 23, zone population: a spawn point or zone volume is live only while a player's box overlaps it; the tree gives that query cheaply). Row 23 does not name zone transitions; the transition use (zone-boundary triggers) has no row in the addendum, so Lead needs to place it.
- Today: not checked in the game repo (the target path is from the addendum).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (the world box and trigger volumes are map or zone data; depth 4 is an engine constant); server-verified (the server does the box and origin test, not the client).

## 6. Gaps and risks

- Level-triggered touch: `SV_TouchLinks` calls the touch callback on every relink while overlapping, with no enter or exit state in this file (`sv_world.c:559-562`; reading, not run). Frankendom must keep an inside set per player and fire on the change only.
- Brush triggers test the origin, not the box: a player whose body is in a zone but whose origin is outside the brush does not trigger (`sv_world.c:549-553`). Frankendom's zone boundaries should say which point counts (position in the zone, not the feet box).
- The tree is fixed at build time from the world bounds (`sv_world.c:476`). An entity outside the world box is filed in the root's lists by the walk's rules; this was not tested.
- Leaf lists are capped (`sv_world.c:655`, `edict.h:19-20`); over the cap the donor falls back to a head node. Frankendom has no PVS, so this does not transfer; do not copy the fallback.
- The game DLL can replace the whole check with `SV_TriggerTouch` (`sv_world.c:516-520`), so the rule is per game, not per engine.
- Transitions and changelevel are not in this file: `sv_frame.c:986` and `sv_init.c:653` read the flag (grep only); the trigger that sets it is game-side and was not read.
- Visibility is not in this file: the leaf list is read in `sv_game.c:4315-4360` (grep only, not read as a whole); that is where streaming to a client would be decided.
- Clean-room only: GPL-3.0. The sketch is written from the described mechanism.
