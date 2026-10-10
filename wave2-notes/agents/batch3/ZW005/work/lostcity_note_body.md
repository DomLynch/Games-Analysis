# LostCityRS-Engine-TS (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` (with `engine/entity/BuildArea.ts`, `engine/entity/NetworkPlayer.ts`, `engine/World.ts`) | Licence: MIT (donor `LICENSE`: "MIT License", Copyright (c) 2023-2026 Lost City) | TypeScript | symbol `Zone` (zone sync: `updateZones` / `rebuildZones` / `rebuildNormal`)

Checked: Read in full `engine/zone/Zone.ts` (602 lines), `engine/zone/ZoneGrid.ts`, `engine/zone/ZoneMap.ts`, `engine/zone/ZoneEvent.ts`, `engine/zone/ZoneEventType.ts`, `engine/entity/BuildArea.ts` (94 lines), `engine/entity/NetworkPlayer.ts` 255-320, `engine/World.ts` 340-420 (cycle order), 955-1000, 1098-1150, `engine/entity/Player.ts` 495-505, 548-560, 593-615, `datastruct/LinkList.ts` 97-110 (`all` order). Callers checked by grep over all of `src`: `isFlagged` (ZoneGrid has no caller in `src`), `getZoneGrid` (Zone.ts only), `enter`/`leave` (PathingEntity.ts 185-187, World.ts 943, 1280, 1314, 1613), `rebuildZones`/`rebuildNormal`/`updateZones` (see receipts). Not read: the packet encoders (`network/game/server/ZoneMessage*`, `UpdateZone*`), the bodies of `World.addObj`/`removeObj`/`trackZone`, the `Obj`/`Loc` entity classes, and what the `200` duration on drops counts (InvOps.ts 77, 80, 183, 248 are grep hits only). I ran one check on the VPS: a copy of `ZoneGrid.ts` under `node 22 --experimental-strip-types` (`/tmp/zw005/run.ts`), output in the mechanism section. Confidence: high on the streaming window, the sync order and the eviction loop (read end to end); high on the `ZoneGrid` index collision (run); medium on the `cheapest` comment being wrong, because I read no caller that pre-sorts objs. Scope: world zone streaming, not a camera; `camera_scope` does not apply.

Best transferable idea: keep a per-client window of zones around an origin, rebuild it only when the player walks out of an inner reload box (hysteresis), and send each zone's shared events once per tick to everyone while private events go only to their receiver.
Decision (proposed): adapt - take the origin window with a reload box, the per-zone "full state on first load, then shared, then per-player events" order, and the per-tick shared buffer; reject the RS packet format, the bit-grid zone flags (the index collides, see section 6) and the first-in-list obj eviction.
Acceptance: A server test walks one player back and forth across the reload edge and asserts the window rebuild is sent once per crossing, not per step; two players in one zone get one shared event encode (count = 1) and a private loot event reaches only its owner.

## 1. Mechanism

- Geometry: a zone is 8x8 tiles (`CoordGrid.ts` 18 `pos >> 3`; `Zone.ts` 36 `SIZE = 8 * 8` counts tiles per zone; zone x = tile x >> 3 at `Zone.ts` 63). Each zone object is created on demand in a `ZoneMap` keyed by a packed int (`ZoneMap.ts` 7, 25-33).
- Two windows per player. (a) The build window: 13x13 zones (104 tiles), centred on an origin (`BuildArea.ts` 77 comment; 41-44 `leftX = originX - 6`, `rightX = originX + 6`). (b) The active set: 7x7 zones around the player's current zone (`BuildArea.ts` 46-47), clipped to the build window (49).
- Hysteresis. `rebuildNormal` (`BuildArea.ts` 57-93) rebuilds only when the player's tile position leaves the box that starts 4 zones before the origin and ends 5 zones after it (61-64, test at 67). A rebuild sends `RebuildNormal` with the mapsquares of the new window (72-86), sets the origin to the player's tile position (88-89) and clears `loadedZones` (90). So a player can walk 4 zones west or south, or 5 zones east or north, of the origin before a rebuild. `Player.ts` 502 and 556 call the same function; 556 passes `reconnect = true` inside a block that clears the build area first (554).
- Active set rebuild, only on zone change. `NetworkPlayer.updateMap` (238) compares the packed zone of the player with `lastZone` (265-266) and only then calls `rebuildZones` (267), which clears `activeZones` and refills the 7x7 set clipped to the window (`BuildArea.ts` 31-55).
- Per-tick order (`World.ts` cycle, 340-420): world, logouts, logins, `processZones` (390), `processInfo` (397; per-player `rebuildNormal` at 1002), `processClientsOut` (408), `processCleanup` (415). Within `processClientsOut` each connected player gets `updateMap` (1108, which can rebuild the active set) and then `updateZones` (1114).
- Per-player sync (`NetworkPlayer.updateZones`, 294-315). (1) Unload: any zone in `loadedZones` that is no longer active is removed (299-303). (2) For each active zone: if it is not loaded, `writeFullFollows` (308-309) sends a reset and the current visible state. Then `writePartialEncloses` (311) and `writePartialFollows` (312) run every tick for every active zone. (3) The zone is added to `loadedZones` (313).
- Shared vs per-player events. `Zone.computeShared` (101-122) encodes every ENCLOSED event of the zone into one `Uint8Array` once per tick. It runs only for `zonesTracking` zones (`World.ts` 978-979). `writePartialEncloses` (198-203) writes that same buffer to every player in the zone. `writePartialFollows` (208-219) writes the FOLLOWS events, skipping any whose `receiver64` is another player (214-215). Cleanup resets the zone (`World.ts` 1144 calls `reset`, which clears `shared` at `Zone.ts` 222).
- Full-state content (`Zone.writeFullFollows`, 157-189): sends the reset packet (160), then for each obj writes the active DESPAWN or RESPAWN objs (skipping objs changed this tick, `updatedThisTick` 124-147, or private to another player, 162), then for each loc writes active DESPAWN locs as `LocAddChange`, inactive RESPAWN locs as `LocDel`, and changed RESPAWN locs as `LocAddChange` (172-187). Locs whose `lastLifecycleTick` is this tick are skipped (173-174).
- Grid flag. `Zone.enter` for a Player adds it to the zone and flags the zone in the level's `ZoneGrid` (78-82); `leave` unflags when the count reaches zero (89-95). NPCs are counted but do not flag (83-85, 96-97).
- Obj cap and eviction. `Zone.OBJS = 129` (38). `addObj` for a DESPAWN obj, when `totalObjs >= 129`, walks `getAllObjsUnsafe()` and calls `World.removeObj(obj2, 0)` on the first DESPAWN obj it reaches, then breaks (305-313). It then adds the new obj to the tail (315-316) whether or not it evicted anything.

## 2. Key functions

- `Zone.writeFullFollows`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 157-189. Reset plus current visible state for one client.
- `Zone.writePartialEncloses` / `writePartialFollows`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 198-203, 208-219. Shared buffer to everyone; per-player events to their receiver.
- `Zone.computeShared`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 101-122. One encode per zone per tick.
- `Zone.addObj` (cap and eviction): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 302-326.
- `BuildArea.rebuildZones`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/BuildArea.ts` 31-55. The 7x7 active set on zone change.
- `BuildArea.rebuildNormal`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/BuildArea.ts` 57-93. The reload box and window rebuild.
- `NetworkPlayer.updateZones`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/NetworkPlayer.ts` 294-315. Unload, full state on first load, shared, follows.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Zone = fixed tile block, zone id = tile >> 3 | 8 tiles per zone (`CoordGrid.ts` 18; `Zone.ts` 36) |
| Active set = square around the player's zone | radius 3, so 7x7 zones (`BuildArea.ts` 46-47) |
| Window around an origin, clipped | radius 6, so 13x13 zones = 104 tiles (`BuildArea.ts` 41-44, 72-75, 77) |
| Hysteresis box for window rebuild | 4 zones before origin on west/south, 5 zones after on east/north (`BuildArea.ts` 61-64). The asymmetry is in the code, its reason is not stated. |
| Per-tick sync cost | up to 7x7 = 49 active zones per player per tick (`BuildArea.ts` 46-47, `NetworkPlayer.ts` 306-313). Shared buffer is encoded once per zone, not once per player. |
| Per-zone obj budget | 129 (`Zone.ts` 38). The check counts DESPAWN and static objs (`objsCount`, 237, 316) but the eviction loop only takes DESPAWN objs (307-309). The add goes through even when nothing was evicted. A soft cap. |
| Loc budget | `LOCS = 8*8 << 2` = 256 (`Zone.ts` 37). Defined; the only occurrence in `engine/zone/` is its definition (grep). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: window rebuild only when the player leaves the reload box (hysteresis), the 7x7 active set rebuilt only on a zone change and clipped to the window, then per zone "unload if inactive, full state if newly active, shared events, per-player events". It omits: the `RebuildNormal` mapsquare message (`BuildArea.ts` 86), the login and reconnect clears (`Player.ts` 502, 554-556), the zone objects and the per-obj and per-loc filters in `writeFullFollows`, the packet encoders, the 129-obj cap and its eviction (`Zone.ts` 305-313), the afk-zone path, and the `computeShared` loop over tracked zones (`World.ts` 978-979), which is replaced by the passed-in count maps. It also uses string zone keys where the donor packs integers. It ignores the level; the donor's zone index carries the level (`ZoneMap.ts` 7) and a level change is not handled here.

```ts
{{TS}}
```

## 5. Lands in

- TARGET `origins/server/zone-stream.ts` (new module, proposed, beside `origins/server/world-spawns.ts`): the per-client zone window and per-tick sync. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer). Fit is partial: row 23 covers the per-zone obj cap and eviction (`Zone.ts` 305-313), but the streaming window and sync order have no row in 1-23. Tick placement sits under the row 18 server-tick sub-line (`World.ts` 390, 397, 408, 415); the one row cited here is 23.
- Reuse tag: adapt-from-idea (MIT, adaptation allowed; sketch re-expressed, not copied)
- Brief rule served: zones as data (zone geometry is a constant grid here, Frankendom's zones are data files); one ledger (shared versus per-player events are the same ledger filtered by receiver)

## 6. Gaps and risks

- Transport: the donor sends RS-protocol binary packets (`network/game/server/*`), which were not read. Frankendom's browser client needs its own message shapes; only the window, order and buffer rules transfer.
- Latent bug, do not port: `ZoneGrid.index` is `(zoneX << 5) | (zoneY >>> 5)` (`ZoneGrid.ts` 15) but `zoneY >>> 5` takes six bits (the grid has 2048/32 = 64 words per column, `ZoneGrid.ts` 6). Columns overlap. I ran a copy on the VPS: after `flag(1, 0)`, `isFlagged(0, 1024, 0)` returns true; after `flag(0, 1024)`, `isFlagged(1, 0, 0)` returns true; a control with `flag(5, 100)` gives false for `isFlagged(0, 1024, 0)`. `isFlagged` has no caller in `src`, so the bug is latent. Frankendom should use a Map of zone to player count.
- Eviction order: the loop evicts the oldest DESPAWN obj in list order (`LinkList.all` default, head to tail, `LinkList.ts` 97-105), but the comment at `Zone.ts` 588-589 says the cheapest objs are dropped. The donor does not do what its comment says. Frankendom's loot ledger must choose the rule (value, age or never evict) and test it.
- Soft cap: an obj add does not check whether it evicted anything (305-316), so a zone full of RESPAWN objs can go past 129. Frankendom should enforce a cap in one place with a test.
- Comment drift: `World.ts` 387 says the active set is built in `processZones`, but the code builds it in `updateMap` during `processClientsOut` (`World.ts` 1108, `NetworkPlayer.ts` 267). Do not copy the comment.
- Asymmetric reload box (`BuildArea.ts` 61-64): a designer-facing number, so make it data with a default and a test; do not hard-code the 4 and 5.
- Scope vs rulings: zones as data fits (the window is per client; geometry comes from data). Server-verified kills and MAX_ATTACKERS = 3 are not touched here. This sync is for world streaming; the Pit is one fixed arena and needs none of it (ruling: Pit as client).
- Per-tick cost: each client is checked against every active zone every tick (`NetworkPlayer.ts` 311-312), up to 49 zones, and the shared bytes of each zone are re-written to each player in it. Not measured here; measure before the world goes wide.
- Unread: encoders, `World.addObj`/`removeObj` bodies, what the `200` drop duration counts (unit unknown), whether `trackZone` is called from more places than `removeObj` (1525).
