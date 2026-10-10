# 2004Scape-Server (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/zone/Zone.ts` | Licence: MIT (`/mnt/frankendom-donors/2004Scape-Server/LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2023-2025 Lost City"; adaptation permitted) | TypeScript | symbol `Zone.computeShared` and `Zone.writeFullFollows` (with `NetworkPlayer.updateZones`, `BuildArea.rebuildZones` / `rebuildNormal`, `World.processZones`, `World.scaleByPlayerCount`)

Checked: Read in full: `zone/Zone.ts` (1-577), `zone/ZoneMap.ts`, `zone/ZoneGrid.ts`, `entity/EntityLifeCycle.ts`, `entity/LocObjEvent.ts`, `util/LinkList.ts` (10-30, 97-112). Read in part: `entity/BuildArea.ts` (25-94; lines 1-24 not read), `entity/NetworkPlayer.ts` (280-340), `World.ts` (378-440, 694-713, 714-720, 981-1010, 1116-1126, 1146-1156, 1330-1353, 1364-1370, 1424-1460, 1540-1552, 1773-1777), `GameMap.ts` (96-142), `entity/NonPathingEntity.ts` (1-30), `entity/Npc.ts` (112-140), `entity/Obj.ts` (27-61), `entity/Loc.ts` (turn, grep lines only), `entity/Entity.ts` (grep lines only). Not read: World.ts 1-377 and the world init, NetworkPlayer.ts 1-280, the packet encoders (`ZoneMessageEncoder`, `UpdateZone*` models), the client, the script handlers that call `removeNpc` / `removeObj` (which pass the respawn duration; the values are not known from this donor). Greps: `ZoneGrid.isFlagged` has no caller in `src` (only its definition); `Zone.LOCS` is never read. Toy check: I compiled the clean-room sketch on the VPS and ran it (section 4); the donor itself was not run. Confidence: high on the per-tick zone pipeline and the resync rules; high on the cap and eviction; medium on the respawn timers (Loc turn body not fully read). camera_scope: not applicable (zones topic).

Best transferable idea: Each zone builds one shared delta buffer per tick from its public events, every viewer gets that same buffer, private drops go only to their receiver, and a viewer who first sees a zone gets a full snapshot before any deltas.
Decision (proposed): adapt - take the once-per-tick shared zone delta, the per-viewer follows filter and the full resync on first sight of a zone for the server's zone stream (origins/server/zone-sync.ts); we do not take the RuneScape 104-tile client build window, and we reject respawn scaling by total player count (below).
Acceptance: Server test: two players in one zone receive byte-identical enclosed deltas for the same tick; a player who enters the zone receives one full snapshot and then only deltas; a drop tagged to player A appears in no snapshot or delta sent to player B; a 130th dynamic drop in a full zone evicts the oldest dynamic drop and never a static spawn.

## 1. Mechanism

- Zone unit. A zone is an 8x8 tile block on one level (Zone.ts 36, SIZE = 8*8 tiles, read as 8 per side). `ZoneMap.zoneIndex` packs zone x, zone z (11 bits each) and level (2 bits) into one integer (ZoneMap.ts 7). Each zone holds linked lists of players, NPCs, locs and objs with counts (Zone.ts 45-53).
- Spawn data. Map squares load static NPCs and objs as RESPAWN entities (GameMap.ts 103-122 and 124-142; NPCs at 116 and 118, objs at 137 and 139). Static locs are added as RESPAWN (GameMap.ts 248). The free-to-play check is at GameMap.ts 111.
- Respawn timers. A removed NPC, obj or loc with a positive duration calls `setLifeCycle(duration)`, which registers a `LocObjEvent` on `World.locObjTracker` (NonPathingEntity.ts 18-21; LocObjEvent.ts 8-15). Each tick `processZones` turns each event whose tracker is still current (World.ts 984-988, LocObjEvent.ts 15). An NPC counts down its `lifecycleTick` in `turn` and respawns at 0 (Npc.ts 122-126); an obj does the same (Obj.ts 33-38).
- Player-count scaling. `World.scaleByPlayerCount(rate)` uses `min(total players, 2000)` and returns `((4000 - P) * rate) / 4000`, truncated (World.ts 1773-1776). NPC removal (1332, 1351) and obj removal (1542, 1548) apply it. Loc removal does not: it passes the raw duration (1453). So at 0 players a duration is unchanged and at 2000 or more it is halved.
- Build window (client view). `BuildArea.rebuildZones` (BuildArea.ts 31-55) marks the 7x7 zones (radius 3) around the player's zone as active, clipped to the window origin +/- 6 zones (41-49). `rebuildNormal` (57-93) sends the client a 13x13-zone rebuild when the player leaves a reload box of origin -4 to origin +5 zones (61-67, comment at 77). It then sets the origin to the player's position (88) and clears the loaded set (90), so every active zone gets a full resync.
- Per-viewer sync each tick. `NetworkPlayer.updateZones` (312-333) unloads zones that are no longer active (317-321). For each active zone it sends `writeFullFollows` if the zone is not yet loaded (326-328), then `writePartialEncloses` (329) and `writePartialFollows` (330). Full resync sends the current objs and locs for that viewer, skipping objs that belong to another receiver (Zone.ts 136-146, filter at 137).
- Shared buffer. `Zone.computeShared` (101-122) encodes the zone's ENCLOSED events into one byte buffer, stored as `this.shared` (121) or null if empty. `writePartialEncloses` (173-178) sends that buffer to every viewer. FOLLOWS events are per receiver: `writePartialFollows` (183-194) sends each event whose receiver is this player or public (189-191).
- Tick order (World.ts 379-440). NPC and player logic run first (396-407), then login and logout, then `processZones` (419) builds the shared buffers for zones touched this tick (`zonesTracking`, 996-998). Then `processClientsOut` writes per-viewer zone updates (1123). Then cleanup resets every tracked zone (1153-1154): shared buffer, events and entity events are cleared. A zone is tracked when a world change touches it (`trackZone`, 1368; seen at removeLoc 1449 and removeObj 1544).
- Dynamic obj cap. Zone.OBJS = 129 (Zone.ts 38). When a DESPAWN (dynamic) obj is added to a zone already at 129 objs, the code walks the obj list in list order and removes the first DESPAWN obj with duration 0 (280-288). The list is insertion-ordered (addTail) and `LinkList.all()` walks from the head (LinkList.ts 105), so the victim is the oldest dynamic drop. If no DESPAWN obj exists, the new obj is still added (292), so the cap is soft.
- Presence grid. `Zone.enter` flags a zone in `ZoneGrid` when a player enters (82) and the last player's leave clears it (94). `ZoneGrid.isFlagged` (26-52) can ask whether any zone within a radius is flagged, but nothing in `src` calls it (grep). NPC processing is not gated by presence: `processNpcs` runs every NPC (World.ts 714-719).
- Numbers. Zone side 8 tiles; obj cap 129; active view radius 3 zones (7x7); build window radius 6 zones (13x13); reload box -4 / +5 zones; player-count cap 2000; scale denominator 4000.

## 2. Key functions

- `Zone.computeShared`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/zone/Zone.ts` 101-122. One buffer per zone per tick from ENCLOSED events.
- `Zone.writeFullFollows` and `writePartialEncloses` / `writePartialFollows`: `.../zone/Zone.ts` 132-194. The per-viewer resync and deltas.
- `Zone.addObj`: `.../zone/Zone.ts` 277-301. The dynamic cap and eviction.
- `NetworkPlayer.updateZones`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/NetworkPlayer.ts` 312-333. Which zones a viewer has, and when it gets a full sync.
- `BuildArea.rebuildZones` and `rebuildNormal`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/BuildArea.ts` 31-93. The active zone set and the rebuild window.
- `World.processZones` and `World.scaleByPlayerCount`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 981-1006 and 1773-1777.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One shared delta per zone per tick, reused by all viewers | Zone side 8 tiles (theirs, Zone.ts 36); tick order in World.ts 379-440 |
| Per-receiver filter for private events | receiver64 match (theirs, Zone.ts 189); obj filter (137) |
| Full snapshot on first sight of a zone, then deltas | Loaded set cleared on rebuild (theirs, BuildArea.ts 90) |
| Active set = square around the viewer, clipped to a window | Radius 3 zones (theirs, BuildArea.ts 46); window radius 6 (41, 49) |
| Capacity with oldest-first eviction for dynamic items | Cap 129 (theirs, Zone.ts 38); evict with duration 0 (280-288) |
| Respawn duration shrinks as players grow | Cap 2000 players and 4000 denominator (theirs, World.ts 1775-1776); applied to NPCs and objs only (1332, 1542) |

## 4. TypeScript sketch

simplified: keeps the donor order: one shared buffer per touched zone per tick, then each viewer gets a full snapshot on first sight, then the shared buffer, then its own follows; a dynamic item past the cap evicts the first dynamic item in list order; the window is clipped to the origin +/- 6 zones; respawn duration is scaled by player count (the function is kept for the comparison, not adopted). It omits the packed binary encoding (strings stand in for packets), the per-entity event list and its clear, the locs and NPC lists, the enter/leave flags and the presence grid, the multiway and zone trigger calls, the origin reset in rebuildNormal, and the cleanup step (the caller clears `events` and `shared`). A toy run on the VPS checked the order, the eviction and the window count (49 zones with origin = player; 28 at the window edge).

```ts
// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ZoneItem {
  id: string;
  receiver: number | null;   // null = visible to everyone; otherwise only this viewer id sees it
  dynamic: boolean;          // true for drops that the engine may evict (donor: DESPAWN lifecycle)
}

interface ZoneEvent {
  kind: "enclosed" | "follows"; // enclosed = shared with all viewers; follows = per receiver
  receiver: number | null;
  bytes: string;
}

interface Zone {
  id: number;
  items: ZoneItem[];        // list order = insertion order (donor: LinkList addTail, forward iteration from head)
  events: ZoneEvent[];      // cleared at the end of every tick
  shared: string | null;    // one buffer per tick, built from enclosed events
}

const OBJ_CAP = 129;        // donor Zone.OBJS = (8*8 << 1) + 1
const VIEW_RADIUS = 3;      // donor: 7x7 active zones around the player's zone
const BUILD_RADIUS = 6;     // donor: origin-relative build window, 13x13 zones

// Once per tick, for each zone touched this tick: one shared buffer from enclosed events.
function buildShared(z: Zone): void {
  const parts: string[] = [];
  for (const e of z.events) {
    if (e.kind === "enclosed") parts.push(e.bytes);
  }
  z.shared = parts.length === 0 ? null : parts.join("");
}

// Add an item. A dynamic item past the cap evicts the first dynamic item in list order (the oldest).
function addItem(z: Zone, item: ZoneItem): void {
  if (item.dynamic && z.items.length >= OBJ_CAP) {
    const i = z.items.findIndex((it) => it.dynamic);
    if (i >= 0) z.items.splice(i, 1);
  }
  z.items.push(item);
}

// Full snapshot for a viewer that has not loaded this zone yet: only items visible to that viewer.
function fullSnapshot(z: Zone, viewer: number): string[] {
  return z.items
    .filter((it) => it.receiver === null || it.receiver === viewer)
    .map((it) => `add:${it.id}`);
}

// What one viewer receives for one active zone this tick.
function zoneUpdatesFor(viewer: number, z: Zone, loaded: Set<number>): string[] {
  const out: string[] = [];
  if (!loaded.has(z.id)) {
    out.push(...fullSnapshot(z, viewer));
    loaded.add(z.id);
  }
  if (z.shared !== null) out.push(z.shared);
  for (const e of z.events) {
    if (e.kind === "follows" && (e.receiver === null || e.receiver === viewer)) out.push(e.bytes);
  }
  return out;
}

// Active zones around the player, clipped to the origin-relative build window (zone coordinates).
function activeZones(pzx: number, pzz: number, ozx: number, ozz: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let x = pzx - VIEW_RADIUS; x <= pzx + VIEW_RADIUS; x++) {
    for (let z = pzz - VIEW_RADIUS; z <= pzz + VIEW_RADIUS; z++) {
      if (x < ozx - BUILD_RADIUS || x > ozx + BUILD_RADIUS || z < ozz - BUILD_RADIUS || z > ozz + BUILD_RADIUS) continue;
      out.push([x, z]);
    }
  }
  return out;
}

// Respawn duration scaled by player count: 1.0x at 0 players, 0.5x at 2000 or more.
function scaledRespawnTicks(baseTicks: number, players: number): number {
  const p = Math.min(players, 2000);
  return Math.trunc(((4000 - p) * baseTicks) / 4000);
}
```

## 5. Lands in

- TARGET `origins/server/zone-sync.ts` (new module, proposed; I did not read the Frankendom repo). It holds the per-zone shared delta, per-viewer follows and full resync on first sight.
- Parity row: row 23 (zone population) is the nearest row for the zone stream and for the respawn timers, and I cite it only as the closest fit. Plainly: no parity row covers zone streaming or per-tick zone deltas. The per-tick part also sits on the server tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget", post-K item 3).
- Respawn scaling, if it were ever wanted, would land in origins/server/world-spawns.ts under row 23. We reject it for now (below).
- Reuse tag: rewrite-from-idea (MIT; adaptation permitted; the sketch is written from the mechanism)
- Brief rule served: zones as data (zone size, caps and radii are zone data); server-verified (deltas are computed once on the server, never per client). Rules 7-9 n/a.

## 6. Gaps and risks

- Eviction rule disagreement. The code's comment (Zone.ts 563-564) says "the cheapest objs are automatically dropped", but the code removes the first DESPAWN obj in list order, which is the oldest drop (Zone.ts 282-287; LinkList.ts 105). Frankendom must pick one rule (oldest or cheapest), write it down and test it.
- Soft cap. If the zone is at 129 objs and has no DESPAWN obj, the new obj is still added (Zone.ts 280-292). A static spawn set can push the zone over its cap. Make the cap hard or count static items in the budget on purpose.
- Locs have no cap. `LOCS` (Zone.ts 37, 256) is declared and never read. Do not claim a loc cap from this donor.
- Respawn scaling is inconsistent and unfair for us. It applies to NPCs and objs (World.ts 1332, 1542) but not locs (1453). It scales by the total number of players on the server, not by the players in the zone (1773-1776), so a crowd in one zone shortens every zone's timers. Our rulings (server-verified kills, one ledger) do not want respawn speed to depend on total population. Reject it, or if we ever want it, make it per zone and apply it to every entity kind.
- Presence grid is unused. ZoneGrid is written on enter and leave (Zone.ts 82, 94) but its query (ZoneGrid.ts 26) has no caller. Do not cite it as a presence gate; NPCs are not skipped for empty zones (World.ts 714-719).
- The processZones comment says it builds the list of active zones (World.ts 415-418), but the code only computes shared buffers for zones touched this tick (996-998). A zone with no world change this tick sends nothing new, which is what we want, but the comment is wrong.
- Client window. The 13x13 rebuild and the mapsquare list (BuildArea.ts 57-93) exist because the RuneScape client keeps a fixed map memory. Frankendom's client is not built that way. Reject the window; keep the active-set and the full-resync-on-entry idea.
- Full resync writes a `UpdateZonePartialFollows` header for every obj (Zone.ts 140), where the partial-follows path writes it once (187). It may be intended; the client format was not read. Do not copy it without checking.
- Fixed-step and budget. The donor has no per-tick NPC budget: processNpcs runs every NPC each tick (World.ts 714-719). The server tick sub-line "per-tick NPC budget" is not supported by this code; do not cite it from this donor.
- MAX_ATTACKERS = 3 is unrelated. The Pit is a fixed arena (row 22) and does not use zone streams; keep this module off the Pit client.
