# ioquake-ioq3 (zones-world, cell 1)

Donor: /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_world.c (hint file; the zone decision is elsewhere, see Checked) plus /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c, /mnt/frankendom-donors/ioquake-ioq3/code/qcommon/cm_test.c, /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_game.c, /mnt/frankendom-donors/ioquake-ioq3/code/game/g_mover.c | Licence: GPL-2.0-or-later (sv_world.c header: "either version 2 of the License, or (at your option) any later version"; COPYING.txt is GPL-2.0) | C | symbol `SV_AddEntitiesVisibleFromPoint`

Checked: The hint file sv_world.c is the server's entity spatial index (sector tree, link, area query, read 40-463; trace code 464-687 not read). It does not decide which zone a client is sent. That decision is in sv_snapshot.c 289-427 (`SV_AddEntitiesVisibleFromPoint`, read in full), using the area flood in cm_test.c 334-410 (read in full) and the door driver in g_mover.c 605-665 and sv_game.c 198-209. Candidates opened: sv_world.c, sv_snapshot.c, cm_test.c, sv_game.c, g_mover.c, sv_init.c (470-490 and the SV_SpawnServer header at 398, call site only), g_spawn.c (380-392, macro only). Not read: CM_BoxLeafnums (cm_test.c 135-215), CM_ClusterPVS decompression, SV_AddEntToSnapshot, the CM_LoadMap flood call (cm_load.c 655, seen in grep only), where ADJUST_AREAPORTAL is used (g_spawn.c 382-387 defines it; call sites not read), mover speed and door triggers. Confidence: high on the order of the visibility test and the flood; medium-high on the overflow-cluster reading in section 6 (read twice, not run).
Best transferable idea: Gate what a client is streamed by reachability over a zone graph: each door edge carries a reference count, the server re-floods the graph on every change, and a client is sent only entities whose zone is connected to its zone.
Decision (proposed): adapt - Frankendom zones are data on one runtime, so the donor's BSP areas and PVS clusters do not transfer; the transferable part is a zone graph with reference-counted gate edges and a server-side send filter, which gives one checkable rule for which zones a player receives.
Acceptance: Server test: with the gate between zones A and B shut, a snapshot for a player in A contains no entity whose zone is B; opening the gate adds them in the next snapshot; a second gate on the same edge keeps B visible until both are shut; closing an edge whose count is already 0 throws.

## 1. Mechanism

Two cooperating systems.

(A) The area graph. The map is split into areas that are joined by portals (doors). Each edge keeps a count of open doors, incremented in both directions on open and decremented on close (cm_test.c 399, 402). A close that would go below zero is a fatal error (cm_test.c 404-405). After every open or close the whole graph is re-flooded (cm_test.c 409): each unflooded area starts a new flood id (378), and the flood recurses only across edges whose count is above zero (349-352). Connectivity between two areas is then one integer compare of flood ids (433).

Who changes the edges: a door mover. When a door at its rest position (MOVER_POS1) is used, it starts moving toward MOVER_1TO2 and, on the team master only, opens its portal at once (g_mover.c 644-647, 658-659). When it arrives back at MOVER_POS1 (the 2TO1 arrival branch, 608-610) it closes the portal (617-619). So the edge stays open for the whole move back and closes only on arrival. The server wrapper ignores entities that have no second area (sv_game.c 205-207) and otherwise calls the area function (208).

(B) The per-client send filter. Each snapshot is built for one client (SV_SendClientSnapshot 597-602 calls SV_BuildClientSnapshot). The eye point is the player origin plus view height (sv_snapshot.c 487-488). From it the server takes the eye leaf, its area and its cluster (310-312). The area bits for the snapshot are the union of all areas in the eye area's flood (315; cm_test.c 472-475). The client's PVS is the cluster's visibility set (317). Then it walks every entity (319). Entities that are not linked (323), flagged not-for-client (333-355) or already added through a portal (360-361) are skipped; broadcast entities are always sent (365-367). For the rest:
- Area test (372-378): the entity's first area must be connected to the client area; if not, its second (door) area is tried (375). If neither connects, the entity is blocked by a door (376).
- Cluster test (383-395): the entity keeps up to 16 clusters (`MAX_ENT_CLUSTERS`, server.h 34; 322-323 in sv_world.c). If any stored cluster bit is set in the PVS, the entity is visible.
- Overflow (396-409): if no stored cluster is visible and the entity has a last cluster, a range scan runs and a final compare decides (see section 6).
- Visible entities are added (412). A portal entity (SVF_PORTAL, 415) also adds everything visible from its origin2 (423), and only if a radius in generic1 is either unset or not exceeded (419-421).

Entity storage (sv_world.c 205-355): each entity's box is widened by one unit (272-279), its leaves are found with CM_BoxLeafnums (288), its first and second areas are set (298-314; areanum2 takes the second distinct area), its clusters are stored (316-326), and it goes into the first sector node its box crosses (335-352). An entity whose box touches no leaf is not linked (293-295). The sector tree is built once per map (SV_ClearWorld, sv_world.c 147-158, called from SV_SpawnServer at sv_init.c 484): it splits the world on the longer horizontal axis at its midpoint (121-127) to depth 4 (114).

## 2. Key functions

- `SV_AddEntitiesVisibleFromPoint`: /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_snapshot.c 292-427. The per-client visibility filter: area test, cluster test, portal recursion.
- `CM_AdjustAreaPortalState`: /mnt/frankendom-donors/ioquake-ioq3/code/qcommon/cm_test.c 389-410. Open and close as reference counts, then a full re-flood.
- `CM_FloodArea_r` and `CM_FloodAreaConnections`: /mnt/frankendom-donors/ioquake-ioq3/code/qcommon/cm_test.c 334-381. The flood that makes area connectivity one compare.
- `CM_WriteAreaBits`: /mnt/frankendom-donors/ioquake-ioq3/code/qcommon/cm_test.c 454-480. The area bit mask sent in each snapshot.
- `SV_LinkEntity`: /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_world.c 205-355. Stores an entity's areas, clusters and sector node.
- `SV_AreaEntities_r` and `SV_AreaEntities`: /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_world.c 381-438. The sector-tree box query. It is used by clip moves (515) and point contents (665), not by the snapshot filter.
- Door driver: /mnt/frankendom-donors/ioquake-ioq3/code/game/g_mover.c 608-619 (close) and 644-659 (open). Server wrapper: /mnt/frankendom-donors/ioquake-ioq3/code/server/sv_game.c 201-209.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gate edge is a reference count per direction; a close below zero is an error (cm_test.c 399, 402, 404-405) | None |
| Whole-graph re-flood on every change (cm_test.c 409) | None |
| Client gets entities whose area is connected to the client area, with a second area for doors (sv_snapshot.c 372-375) | Door straddles at most two areas (comment, sv_snapshot.c 373; storage at sv_world.c 303-311) |
| Entity keeps at most 16 clusters, then an overflow range (server.h 34; sv_snapshot.c 396-409) | 16 (theirs, server.h 34) |
| Leaf list cap per entity link | 128 (theirs, sv_world.c 204; the value shares a tab-separated line with the `#define`, receipt quotes the name only) |
| Sector tree depth: 4 levels (sv_world.c 114), so at most 16 leaf nodes (arithmetic from the depth, not a donor constant) | Depth 4 (theirs, sv_world.c 71; value on a tab-separated line) |
| Sector tree node cap | 64 (theirs, sv_world.c 72; value on a tab-separated line, not receipted) |
| Box widened so that near-touching entities are still checked | 1 unit (theirs, sv_world.c 274-279) |
| Portal entity radius (merged viewpoint is cut off past a radius) | Per entity, from generic1 (sv_snapshot.c 419); no default in the code read |
| The door's move starts 50 ms after the use call; the portal opens at once, not after the delay | +50 ms on the move start only (theirs, g_mover.c 647; the open call is at 659 with no delay) |

## 4. TypeScript sketch

simplified: the sketch keeps the flood and the reference counts, and omits the PVS cluster test (the second half of the donor's visibility check), the overflow-cluster branch, the portal recursion and its radius, the single-client, broadcast and not-for-client flags, the sector tree (the sketch scans all entities, as the donor's snapshot does), and the donor's floodvalid bookkeeping. It uses an explicit stack where the donor recurses. It does not guard a zone joined to itself. Zone ids are plain numbers, not donor area numbers.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Reference-counted portal edges between zones. A door adds 1 to each side when it opens and
// removes 1 when it shuts, so two doors on one edge both have to be shut before the edge closes.
export class ZoneGraph {
  private count: number[][];
  private reachOf: number[];   // per zone: id of its connected group; equal ids = connected

  constructor(readonly zones: number) {
    this.count = Array.from({ length: zones }, () => new Array<number>(zones).fill(0));
    this.reachOf = new Array<number>(zones).fill(-1);
    this.flood();
  }

  openPortal(a: number, b: number): void {
    this.count[a][b]++;
    this.count[b][a]++;
    this.flood();
  }

  closePortal(a: number, b: number): void {
    if (this.count[a][b] <= 0) throw new Error("closePortal: negative reference count");
    this.count[a][b]--;
    this.count[b][a]--;
    this.flood();
  }

  connected(a: number, b: number): boolean {
    return this.reachOf[a] === this.reachOf[b];
  }

  // Recomputed on every portal change, not per query, so a query is a compare.
  private flood(): void {
    this.reachOf.fill(-1);
    let id = 0;
    for (let z = 0; z < this.zones; z++) {
      if (this.reachOf[z] !== -1) continue;
      const stack: number[] = [z];
      this.reachOf[z] = id;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        for (let n = 0; n < this.zones; n++) {
          if (this.count[cur][n] > 0 && this.reachOf[n] === -1) {
            this.reachOf[n] = id;
            stack.push(n);
          }
        }
      }
      id++;
    }
  }
}

// An entity sits in its zone; a door-like entity may straddle two zones (zoneB = -1 if only one).
export interface Entity { id: number; zone: number; zoneB: number; }

// What a client in clientZone is sent: entities in any zone connected to it through open portals.
export function visibleFrom(g: ZoneGraph, clientZone: number, ents: Entity[]): number[] {
  const out: number[] = [];
  for (const e of ents) {
    if (g.connected(clientZone, e.zone) || (e.zoneB >= 0 && g.connected(clientZone, e.zoneB))) {
      out.push(e.id);
    }
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ZW017/ioquake-ioq3-zones.ts) exited 0 with no output.

## 5. Lands in

- TARGET `origins/server/zone-visibility.ts` (new, proposed; I did not read any Frankendom file for this note, so the current zone and snapshot modules are (not read)). It is the server-side send filter for zones, and the gate edges are set only by server code.
- Parity-checklist row 23 (zone population). Row 23 is about spawn caps, respawn and despawn, not visibility, so this is the closest row and not an exact fit. The server tick has no row of its own; this is not a tick note, so none is cited.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (Frankendom ruling); the send filter is server-side, so the client does not decide what it receives.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor's snapshot filter does not use the sector tree. sv_snapshot.c 319 walks every entity for every client on every send. That is fine for a small map and wrong for a zone with many entities. Frankendom should keep a per-zone entity list instead of copying the loop.
- Overflow branch reads as off-by-one (sv_snapshot.c 396-409; not run). After a scan with no visible cluster, `l` ends at lastCluster + 1, so the test at line 403 (`l == lastCluster`) is false and the entity is sent. If the visible cluster is exactly lastCluster, the same test culls it. Also line 397 treats cluster 0 as "no overflow". Frankendom should not copy this branch; if a port ever stores more than the cap per entity, write a test first.
- Door timing: the gate opens when the door starts moving and closes only on arrival (g_mover.c 644-659, 608-619), so a door in motion counts as open for the whole move. Frankendom must decide whether a half-open gate counts as open, and test it.
- Gate changes are reachable from the game VM through a syscall (sv_game.c 394 calls `SV_AdjustAreaPortalState`; the dispatch context around that line was not read). Frankendom must allow gate changes only from the server's one ledger, never from a client message.
- Reflood cost: each change re-floods all areas, and each flood step loops over all areas (cm_test.c 363-381, 349-352), so one change is roughly O(areas squared). Not measured. Zone graphs in Frankendom are small, but keep the flood off the per-tick hot path.
- Distance interest is only the portal radius (sv_snapshot.c 419), per entity and with no default in the code read. Frankendom zones are not distance-based, so do not treat this as the general interest rule.
- Not read: the PVS data format and decompression, CM_BoxLeafnums, the mover speed, what calls the spawn-time portal macro (g_spawn.c 382-387), and the trace code in sv_world.c 464-687. Nothing in this note depends on them except the cluster test, which is read as a bit test only.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: Entities with numClusters == 0 are culled (sv_snapshot.c 383-385) unless SVF_BROADCAST; CM_AreasConnected also returns true globally under cm_noAreas and false for area < 0 (cm_test.c 419-427)
