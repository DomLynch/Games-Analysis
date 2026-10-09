# OpenGothic (zones-world, cell 7)

Donor: /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | Licence: MIT | C++ | symbol World::World / World::roomAt / World::portalAt / World::tick

Symbol check (opened, 2026-10-09 correction pass): World::World 66-123, roomAt(point) 311-334, roomAt(node) 336-359, portalAt 361-369, tick 375-384 all land on the named functions.

## 1. Mechanism
- World constructor (66-123): looks up the world file name in the virtual file system index; if it is not found it logs and returns with a half-built world (69-73). Otherwise it opens it, loads it with zenkit::World choosing the Gothic 1 or Gothic 2 version from version().game (76-79) and reports 20 percent. It starts two async jobs, a dynamic collision world and a packed visual mesh plus WorldView (84-92), reports 30, then moves the BSP nodes, sectors and leaf node indices out of the loaded world into this->bsp and sizes sectorsData to the sector count (96-102), reports 50. It then waits for the view (60 percent) and the dynamic world (70 percent), creates the global effects and the waypoint matrix, adds every world vob to the object manager, builds the waypoint index and reports 100 (105-117). Any exception is logged and rethrown (119-122).
- roomAt(point) (311-334): an empty BSP returns "". Otherwise start at node 0 and loop: signed distance = plane.xyz dot point minus plane.w; positive picks front_index, otherwise back_index (cast to unsigned, so a negative index also counts as out of range); if the chosen index is >= node count, stop at the current node (317-325). Then test the point against that node's bbox, min inclusive and max exclusive on all three axes (327-329) and call roomAt(node) when inside, else return "".
- roomAt(node) (336-359): for every sector and every node slot it lists, skips slots beyond leaf_node_indices (343) and leaf indices beyond the node array (345-346), and counts a hit when that leaf is this node (compared by address, 347). The sector's name is returned only when the count is exactly 1; otherwise a static empty string. The "TODO: portals" comment sits on the unique-owner branch (353-355).
- portalAt(tag) (361-369): empty tag gives nullptr; otherwise a linear scan of sector names and a pointer to the matching entry of sectorsData (not the sector itself).
- tick(dt) (375-384): returns at once if the static doTicks flag is false (376-378, the flag is local and never changed in this function); otherwise object manager tick (dt, dt), dynamic world tick, sound tick only when a player exists, then global effects tick.
- Inputs: a point. Outputs: a room name or empty. Client-side single player. Room lookup is on demand; tick is per frame.

## 2. Key functions
- World::World | /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | 66-123 | loads the world file, builds collision and visual mesh on threads, moves the BSP in.
- World::roomAt (point) | /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | 311-334 | BSP descent to the last in-range node and bounding-box test.
- World::roomAt (node) | /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | 336-359 | node to owning sector; name only when unique.
- World::portalAt | /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | 361-369 | sector data lookup by name.
- World::tick | /mnt/frankendom-donors/OpenGothic/common/world/world.cpp | 375-384 | per-frame ticks in order.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| BSP point location by plane sign | Plane and node data from the zen file (theirs) |
| Leaf owned by exactly one named region, else unknown | Sector name as room id (theirs) |
| Load progress reported in steps | 20, 30, 50, 60, 70, 100 percent (theirs, lines 81, 94, 103, 106, 109, 117) |

## 4. TypeScript sketch
simplified: node indices are plain numbers (the donor compares node addresses and casts the child index to unsigned); the node plane is a four-number record instead of a vec4; the leaf is the last node reached, as in the donor; the roomAt(node) step is merged into roomAt and the donor's static empty-string return is a literal; no world-file loading, threading or tick.
```ts
// Licence: MIT (OpenGothic). Lift permitted; re-expression of world.cpp 311-359 (roomAt).
type Vec3 = [number, number, number];
type Box = [number, number, number, number, number, number];
interface Plane { nx: number; ny: number; nz: number; d: number; }
interface BspNode { plane: Plane; front: number; back: number; box: Box; }
interface Sector { name: string; nodeSlots: number[]; }

// Descend the BSP: front when the point is on the positive side. Stop at the node whose chosen child is out of range.
function leafAt(nodes: BspNode[], p: Vec3): number {
  let i = 0;
  for (;;) {
    const n = nodes[i]!;
    const s = n.plane.nx * p[0] + n.plane.ny * p[1] + n.plane.nz * p[2] - n.plane.d;
    const next = s > 0 ? n.front : n.back;
    if (next < 0 || next >= nodes.length) return i;
    i = next;
  }
}

// The room is the one sector that owns this leaf. Zero or two-plus owners give ''.
function roomAt(nodes: BspNode[], leafNodeIndices: number[], sectors: Sector[], p: Vec3): string {
  if (nodes.length === 0) return '';
  const leaf = leafAt(nodes, p);
  const [x0, y0, z0, x1, y1, z1] = nodes[leaf]!.box;
  if (!(x0 <= p[0] && p[0] < x1 && y0 <= p[1] && p[1] < y1 && z0 <= p[2] && p[2] < z1)) return '';
  let name = '';
  let count = 0;
  for (const s of sectors) {
    for (const slot of s.nodeSlots) {
      if (slot >= leafNodeIndices.length) continue;
      const idx = leafNodeIndices[slot]!;
      if (idx >= nodes.length) continue;
      if (idx === leaf) { name = s.name; count++; }
    }
  }
  return count === 1 ? name : '';
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/world/zone-bounds.ts (new, name set by Lead): which named area a point is in, used to fire a zone-change when the player crosses a boundary. Zone 1 has no such lookup today (`zone1.ts` is hand-built).
- Parity-checklist row: 20 (catalogue as runtime source: area/zone records are data) and 4 (aggro/leash areas read the same lookup).
- Reuse tag: rewrite-from-idea (the BSP format is Gothic-specific; the idea of room-by-point is reusable).
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks
- Room lookup needs a BSP. Frankendom zones are data (zones as data, one engine), so a box or grid lookup is the likely fit; the BSP is not worth porting.
- A leaf shared by two sectors returns empty. Portals are not handled (TODO in the donor).
- The owner search is a full scan of all sectors and slots on every call; not cached.
- Client-side and single-player in shape. Frankendom's server owns zone state and kill verification (server-verified kills, one ledger); this lookup may only inform the client's view.
- No zone-change events are emitted; a caller must diff successive results.
- The tick order (objects, collision, sound, effects) is a single-player frame, not a 60 Hz fight tick; the Pit stays a client of the shared engine.
- vob loading, the waypoint matrix and GlobalEffects were not read.
