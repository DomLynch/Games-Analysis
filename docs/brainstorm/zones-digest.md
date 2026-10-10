# Digest: zones-world (60 notes)

### latentcollapse-RustDAoC (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/D004/out/zones-world/latentcollapse-RustDAoC.deep.md
best_idea: Store each zone as one row (id, region, grid offset) and place every entity by adding its zone-local coordinates to the zone's offset times a fixed cell size, so one world frame serves all zones and a zone lookup is O(1).
decision: adapt - Adopt the frame and the table (zone-local plus cell offset gives the world; O(1) id lookup), since zones as data on one runtime is our ruling; adapt the overlap rule into an explicit tested rule, and reject the donor's silent id masking, which returns zone 0 for id 512.
acceptance: A server test loads the zone table and asserts that zone 0 (Camelot Hills, offset 67/59) with zone-local (12511, 26346) gives world (561375, 509674); that an id of 512 or more resolves to no zone; and that a point inside two overlapping zones resolves to the zone with the nearer centre.
tags: new:zone-frame-offset,new:overlap-nearest-centre,new:id-lut
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Silent aliasing. `offset_of` and `zone_region` mask the id with 511 (zones.rs 48, 59), and the table is built only for ids below 512 (37). So an id of 512 returns zone 0's offset (slot 0). The packet path cannot produce such an id, because the zone id is at most 9 bits (zones.rs 112 and the comment at 20). A direct call can. The donor's unknown-zone test (zones.rs 184-186) uses id 9999, which masks to slot 271; the generated table has no zone 271 (grep of zone_offsets.rs), so the test passes because that slot is empty, not because the lookup rejects out-of-range ids. Frankendom should re
checker: -

### ModernUO (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/U002/out/zones-world/ModernUO.deep.md
best_idea: One zone timer with a random respawn delay drawn fresh on each arm, a cap that blocks refill when full, weighted entries whose full members leave the pool, and a removal that re-arms the timer only when it is idle and the zone has room.
decision: adapt - Take the cap, the one-timer re-arm rule, the weighted entry pick with per-entry caps and the presence-gated trigger; the donor has no despawn on empty, so the grace despawn is ours to build and test.
acceptance: Server test: a zone with cap 6 and respawn 90-180 s schedules exactly one respawn timer in [90, 180] s after a kill and does not arm a second on a further kill while armed; a group zone with two survivors at timer fire spawns nothing; after the last player leaves, spawns persist for the grace seconds and despawn on expiry, and a re-entry inside the grace cancels the despawn.
tags: director,population-cap,group-refill,presence-gated,wait-gate
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism.
- No despawn on empty in the donor. Spawns persist until they are killed, deleted, carried or made controlled (`Defrag`, 814-819). Frankendom's row 23 grace despawn has no donor counterpart; it must be built and tested alone.
- The live count is lazy. `IsFull` reads `Spawned.Count` directly (292). Defrag runs only at the call sites listed in section 1, so a deleted spawn can still count as live until one of them runs. Frankendom's one ledger must update the count on every removal, not rely on a sweep.
- A non-group zone whose open entries all sit at their caps (probability sum 0, 871-874) still gets `DoTimer()` from `OnTic
checker: Default cap 1 cited at BaseSpawner.cs 261: wrong line. _count field is at 314, IsFull at 292 (right), default 1 comes from the ctor `this(1, 5min, 10min)` near line 149. GetSpawnPosition starts at 424 (note says 436). Note says group-mode OnTick: Respawn() then 'calls DoTimer()'; in code Respawn itself ends with DoTimer() (415) and OnTick calls DoTimer() again (847), so group refill arms twice. Sketch onFire group branch never re-arms after a refill that leaves the zone not full, which the donor

### ClassicUO (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/U007/out/zones-world/ClassicUO.deep.md
best_idea: Sweep for despawn on a throttled timer, collect destroyed entries and remove them after the walk, and evict only after a grace period with a per-pass cap.
decision: adapt - The grace-and-cap sweep fits the server's zone despawn-on-empty step (row 23); the donor's distance cull is client-only and must never delete server-known state (one ledger).
acceptance: Server test: a zone with no players for its grace period despawns its idle creatures, at most N per sweep, and a creature whose zone regains a player within the grace is kept; client: an entity 25 tiles away leaves the draw list within 50 ms and returns from server state on re-entry.
tags: grace-timer,new:throttled-sweep,new:deferred-removal,per-player-view,variable-step
gaps/risks(excerpt): - BSD-2-Clause: code may be adapted. The sketch is still written from the mechanism, not copied.
- The donor's distance cull is client-only. It deletes local objects, but the server still knows them. Frankendom's ledger must not change when a client hides an entity. Hiding and deletion must stay separate.
- No spawn logic here. The donor has no population caps, no respawn timer and no creature despawn-on-empty grace. Row 23's caps and respawn are not covered by this donor; only the sweep and grace shape is.
- The eviction scan is in creation order, not least-recently-used order. For memory that is fine; for a zone despawn the rule must be keyed on last player presence, not on insertion order
checker: None. Verified World.Update 294-298 (50 ms throttle), mobile cull 301-313 with deferred _toRemove 345-353, item cull 355-388 (OnGround, multi via HouseManager.TryToRemove), ClientViewRange default MAX_VIEW_RANGE 24 (World.cs:109, Constants 80-81), GameObject.Distance Chebyshev with last-step tile (32-62), GetChunk2 stamp at Map.cs:96 overwriting Create's +3000 stamp (Chunk.cs:49), ClearUnusedBlocks 247-268 (3000 ms, creation-order list, cap 50, HasNoExternalData with multi exemption commented ou

### 00-Evan-shattered-pixel-dungeon (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW001/out/zones-world/00-Evan-shattered-pixel-dungeon.deep.md
best_idea: One timer per zone spawns at most one enemy per cooldown while the weighted live count is under a cap re-rolled on each check, and only into a cell no player can see and at least 12 walk steps from the nearest player.
decision: adapt - Keep the director shape (weighted live cap, one spawn per cooldown, unseen and far-by-walk placement, short retry), but make cap, roster and cooldown zone data on the server, use a seeded roll, check every player's view, and add the despawn grace rule this donor lacks.
acceptance: Server test: a zone with cap 4, three live enemies and a 50 s cooldown gets exactly one spawn after the cooldown, out of view of every connected player and at least 12 walk steps from the nearest; a failed placement retries after 1 s; the same seed gives the same spawn sequence.
tags: director,population-cap,respawn-scaling,presence-gated,group-refill,timer-wheel,new:weighted-live-count
gaps/risks(excerpt): - Zones as data: in the donor the depth table and the cap formula are code (MobSpawner.java `switch`, RegularLevel.java 212). Frankendom must read the roster, cap base and cooldown from zone data, not copy the switch.
- No despawn: row 23 asks for despawn on empty with a grace timer. The donor has none (grep found no "despawn" in the package). The grace timer must be designed by us; do not claim it from this donor.
- Server-verified spawns: the donor checks visibility against one hero (`heroFOV`, RegularLevel and Level 805). Frankendom must check every connected player's view and walk distance before placing a mob, on the server.
- Order of consumption: the donor takes the species before pla
checker: -

### 0ad-0ad (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW001/out/zones-world/0ad-0ad.deep.md
best_idea: Zone ownership comes from weighted influence sources with a linear, terrain-cost-scaled falloff over a tile grid; the owner of each tile is the player whose summed weight is greatest, and only tiles connected to a root source count.
decision: adapt - Take the influence-falloff and max-weight owner shape for zone control, with weight, radius and root as zone data, integer math on the server, and recompute only on source change; the donor's full-map recompute and boundary drawing do not transfer as is.
acceptance: Server test on a 40x3 toy zone grid: one root (weight 10000, radius 140) at tile 2 owns tiles 0-19 and no owner beyond; an exact tie goes to the lower player id; an owned pocket not connected to its root is not counted.
tags: new:influence-falloff,new:max-weight-owner,new:root-connectivity,new:dirty-full-recompute,new:tile-cost-grid
gaps/risks(excerpt): - Not population: this decides who holds a zone, not how many mobs spawn. Do not put it in the spawn module.
- Integer falloff: `fall = floor(weight x 8 / radius)` (CCmpTerritoryManager.cpp 502-504). If weight x 8 is less than radius, the falloff is 0 and the source floods every reachable tile at constant weight (arithmetic, not run). A zone authoring rule must keep weight x 8 >= radius.
- Summed weight: many weak sources can beat one strong source (545-547 with 537-541). That is a design choice, not a Frankendom ruling; decide it per zone, do not inherit it.
- Ties: the lower player id wins an exact tie (ascending order, strict >, 544). Frankendom must state its own tie rule and test it.
- 
checker: -

### 2004Scape-Server (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW001/out/zones-world/2004Scape-Server.deep.md
best_idea: Each zone builds one shared delta buffer per tick from its public events, every viewer gets that same buffer, private drops go only to their receiver, and a viewer who first sees a zone gets a full snapshot before any deltas.
decision: adapt - Take the once-per-tick shared zone delta, per-viewer follows and full resync on first sight for the server zone stream; drop the RuneScape 104-tile client window, and reject respawn scaling by total player count (unfair across zones, applied to NPCs and objs but not locs).
acceptance: Server test: two players in one zone receive byte-identical enclosed deltas for one tick; a player entering the zone gets one full snapshot then only deltas; a drop tagged to player A is absent from B's snapshot and deltas; a 130th dynamic drop in a full zone evicts the oldest dynamic drop, never a static spawn.
tags: respawn-scaling,new:zone-shared-delta,new:per-viewer-follows,new:full-resync-on-entry,new:build-window,new:cap-evict-oldest
gaps/risks(excerpt): - Eviction rule disagreement. The code's comment (Zone.ts 563-564) says "the cheapest objs are automatically dropped", but the code removes the first DESPAWN obj in list order, which is the oldest drop (Zone.ts 282-287; LinkList.ts 105). Frankendom must pick one rule (oldest or cheapest), write it down and test it.
- Soft cap. If the zone is at 129 objs and has no DESPAWN obj, the new obj is still added (Zone.ts 280-292). A static spawn set can push the zone over its cap. Make the cap hard or count static items in the budget on purpose.
- Locs have no cap. `LOCS` (Zone.ts 37, 256) is declared and never read. Do not claim a loc cap from this donor.
- Respawn scaling is inconsistent and unfair
checker: -

### Anuken-Mindustry (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW002/out/zones-world/Anuken-Mindustry.deep.md
best_idea: A zone's spawn table as records (begin, end, spacing, base count, capped scaling, optional spawn-point filter), with the count per point computed by one pure function per wave.
decision: adapt - Keep the table shape and count formula as zone data in origins/server/world-spawns.ts; reject the global wave timer and the shockwave kill (kills must go through the server ledger); add the row 23 respawn and despawn-on-empty rules ourselves, since this donor has none.
acceptance: Server test on one zone with group {unitAmount:2, unitScaling:3, max:6, spawnPoint:-1} and two spawn points: 2 per point on cycles 0-2, 3 per point on cycle 3, never more than 6 per point.
tags: director,population-cap,respawn-scaling,wait-gate,variable-step,new:spawn-point-filter,new:drop-zone-clear,new:wave-index-table
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's names (`SpawnGroup`, `getSpawned`) are not carried into code.
- No population-driven spawning. Every spawn here is on a timer or a wave index. There is no respawn when a zone empties and no despawn with a grace timer, so row 23's grace and respawn rules are absent in this donor. Frankendom must write them, and this note gives no evidence for them.
- The drop-zone shockwave kills (Damage.damage with the wave team over the radius; the team and inclusion filter was not read). In Frankendom every kill is server-verified and goes through one ledger, so a spawn-side effect that deletes players is rejected. A prot
checker: -

### Card-Forge-forge (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW002/out/zones-world/Card-Forge-forge.deep.md
best_idea: Route every move between zones through one function that captures the leaving entity's state first, runs a replacement pass, then removes, adds, fires the event and runs triggers last with the captured state.
decision: adapt - Take the single move path with LKI captured before removal and a replacement pass before the move, and the rule that a summon leaving the arena is removed; reject the Magic-specific branches and the whole-zone snapshot copy at each checkpoint (capture only the entity that moves).
acceptance: Server test: a fighter killed in the arena moves to out once, and its death trigger (loot roll, XP) reads hp and buffs as they were at death; a summon leaving the arena is removed and its id is in no zone afterwards.
tags: stale-state,new:single-transfer-entry,new:lki-capture-before-move,new:replacement-pre-move,new:token-ceases-in-transit,new:hidden-zone-flag
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism; donor names are not carried over.
- Most of this donor is Magic rule text. Lines 100-146 and 281-303 and the merged-permanent block (398-432) encode Magic-specific rules; they do not transfer. Only the shape (guard, LKI, replacement, move, event, trigger) is in scope.
- Whole-zone snapshots. `Game.copyLastState` (220-228) copies every player's battlefield and graveyard at each checkpoint. A browser MMO should capture only the entity that moves; the sketch does that. The cost of the donor approach is not measured here.
- Replacement pass. The donor's `ReplacementHandler.run` (338) was not read, so its ordering among multipl
checker: -

### CleverRaven-Cataclysm-DDA (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW002/out/zones-world/CleverRaven-Cataclysm-DDA.deep.md
best_idea: Give each zone a population budget that spreads from its centre with falloff, spend it the first time the zone is entered, and on exit store each monster at its cell so re-entry restores it instead of re-rolling it.
decision: adapt - Take the budget spread, spend-once load, store-on-exit and reload, and 10-try placement; add a respawn timer with grace on empty (row 23) since the donor has none; reject the HP-to-zero step on unload (a stored monster is data, not a death paying loot or XP).
acceptance: Server test: spreadPopulation(12, radius 3) puts no unit outside radius 3 and more at the centre than the rim; entering a zone spawns its budget once; leave and re-enter restores the same monsters at their cells with no new spawns; no spawn lands inside the player's server-side sight proxy.
tags: director,population-cap,presence-gated,stale-state,new:population-budget-spread,new:spend-on-first-load,new:store-on-unload,new:spawn-outside-sight,new:dying-decay-ratio
gaps/risks(excerpt): - CC-BY-SA 3.0: clean-room only. The sketch is written from the mechanism; donor names are not carried over.
- No respawn. Once a zone is loaded its budget is cleared (`map.cpp` 10172), and a killed monster is not stored, so the donor's zones run out until the world is regenerated. Row 23 needs respawn and a grace timer on empty; this donor provides neither. The reproduction path (`monster::try_reproduce`, `map::add_spawn`) may refill zones, but it was not read.
- Store is not kill. The donor marks an unloaded monster as dead in memory (`game.cpp` 10387) after storing it. In Frankendom every kill goes through the server ledger with loot and XP, so a store must never pass through the death pa
checker: -

### CytopiaTeam-Cytopia (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW003/out/zones-world/CytopiaTeam-Cytopia.deep.md
best_idea: A per-zone spawn table keyed by zone kind, density and footprint, with a per-tick cap that counts only successful placements and a presence gate per zone.
decision: adapt - Take the per-zone table filter and the per-tick cap; drop building footprints and the power gate (ours is server-side presence); fix the donor's attempt counting and edge-only fit test. Row 23 is a partial fit: the donor has no despawn, respawn or grace timer.
acceptance: Server test with cap 5 and a 1 s tick: a zone with a player in range gains at most 5 spawns per tick; a zone with no player in range gains none; a tick whose first picks hit occupied cells still gains up to 5 (failed picks do not use the cap).
tags: director,presence-gated,population-cap,new:zone-spawn-table,new:footprint-fit,new:wall-clock-tick
gaps/risks(excerpt): - GPL-3.0 is copyleft: clean-room only. The sketch is written from the mechanism, not translated.
- The donor counts failed picks against the cap (ZoneArea.cxx 39, 55). After a load this bites: `ZoneManager::reset` (261-273) queues every zone cell with `occupied` at its default false (ZoneArea.hxx 13), and `Game::loadGame` calls `resetManagers` (Game.cxx 211-213). Built cells then look vacant, the attempts hit cells that `isPlacementAllowed` refuses (MapNode.cxx 246), and the cap is spent. This is inference from the code, not run. For Frankendom: derive occupancy from the one ledger, never from a flag a load can desync; the acceptance test must cover a restart with existing spawns.
- The fit
checker: -

### DCurrent-openbor (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW003/out/zones-world/DCurrent-openbor.deep.md
best_idea: A level director that spawns from an ordered, position-keyed list, refills a group between a minimum and a maximum live count, and holds a lock until the group is clear.
decision: adapt - Take the refill band (min, max) and the ordered entry list as zone data for zone population; key progress to server-side zone entry instead of a scroll clock; reject the donor's coupling of lock and bounds entries to the enemy band, and its consumption of failed spawns.
acceptance: Server test with band min 2, max 4: with 1 enemy alive and 4 spawn entries due, exactly 3 spawn in that step; with 2 alive none spawn; a lock entry at the head of the queue applies on the next step even while the band is full.
tags: director,group-refill,population-cap,wait-gate,new:position-keyed-queue,new:scroll-clock,new:player-count-variant,fixed-step
gaps/risks(excerpt): - BSD-3 permits adaptation. The sketch is still written fresh from the described mechanism.
- Coupling: music, scroll bounds, blockade, palette and wait entries are processed only inside the refill branch, so they wait for the live count to drop below `groupmin` (50037, 50039-50042). A lock can sit behind a full band. Frankendom must apply lock and bounds entries independently of the band (the acceptance test asserts this).
- Lost entries: `smartspawn` can return NULL for the player-count gate (49528-49535) or when `spawn()` gives no entity (49546-49549), and the index still advances (50142). Only the player-count case is intended. Frankendom must keep a failed spawn due.
- A wait does not s
checker: -

### DFHack-dfhack (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW003/out/zones-world/DFHack-dfhack.deep.md
best_idea: Paint a zone from one seed by flood fill inside one connected region, taking that region's edge cell once and not crossing it; an edit that opens a wall next to a zone adds the wall ring to the zone.
decision: adapt - Use the connected-region paint with an edge fringe as an authoring tool that writes zone data; reject the runtime expansion on dig, which changes zone data during play and conflicts with zones as data.
acceptance: Zone-editor test (if built): a fill from a cell inside a room stops at the room's opening; the first cell past the opening is included once; a second fill from the same seed changes nothing.
tags: new:connectivity-bounded-paint,new:fringe-include,new:edit-expands-zone,new:wall-ring-fill
gaps/risks(excerpt): - Zlib permits adaptation. The sketch is still clean-room, from the described rules.
- Runtime expansion (`expand_burrows`, 161-191) changes zone data during play. That conflicts with "zones as data" and with one ledger unless the change is replicated and server-owned. The addendum rulings name no destructible terrain, so this part is rejected unless such a feature is planned.
- Donor state lives in a plugin-global map (`active_dig_jobs`, 42). A dig that started before the plugin was enabled has no entry, and `operator[]` inserts a default (205), so the previous tile reads as the enum's zero value. Frankendom must not rely on a record that a load or a restart can lose; server state, one ledg
checker: -

### Dawn-of-Light-DOLSharp (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW004/out/zones-world/Dawn-of-Light-DOLSharp.deep.md
best_idea: Index every NPC and player in a fixed grid of cells so radius queries read only nearby cells, accept whole cells inside the circle without a per-object check, and exact-check only the edge cells.
decision: adapt - Frankendom needs fast nearby-entity queries for many-on-one candidates and zone population checks, so take the grid and the wholly-in and wholly-out cell test. Reject the lazy re-filing: the donor files a moved object under its old cell until a scan notices, which can miss it; Frankendom is one server ledger, so each move re-files the object at once.
acceptance: A server test moves an NPC across a cell edge and asserts a radius query from the far side returns it on the same tick; a property test asserts grid query results equal a brute-force scan for random points and radii.
tags: new:spatial-grid,stale-state
gaps/risks(excerpt): - Stale cells: the donor files a moved object under its old cell until a scan or the sweep notices. A query can then miss an object that moved into a cell already scanned in the same query (the object is found in the old cell later, moved, and not returned). This follows from `ShouldElementMove` and the scan order (control-flow reasoning, not run). Frankendom is one server ledger: re-file on every move (the sketch does this) and test it.
- Client-named zone and in-zone position: `PlayerPositionUpdateHandler.cs:92-141` takes the zone id and the in-zone X from the client and does not bound-check the X against the zone width in the lines read. Frankendom's ruling is server-verified: zone change
checker: -

### EQEmu (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW004/out/zones-world/EQEmu.deep.md
best_idea: When the last player leaves a zone, keep its NPCs stepping for a grace period, then freeze them until someone returns, while spawn points keep their own respawn timers and capped weighted draws as data.
decision: adapt - The grace-then-freeze gate and the per-point respawn timer with variance and caps fit a zone-as-data population. Reject despawn-on-empty as the default: the donor freezes NPCs and removes only depop-flagged ones, so despawn would need its own rule. Re-check the row 23 wording with Lead before building.
acceptance: A server test: the last player leaves; NPCs step for grace_s (zone data, default 60) and then stop; a player re-entering inside the grace window cancels the freeze; a spawn point flagged path-when-idle keeps stepping; a capped entry is not drawn while its count is at the cap.
tags: presence-gated,grace-timer,population-cap,respawn-scaling
gaps/risks(excerpt): - Freeze, not despawn: an idle NPC is still alive and frozen, and only spawn points with `path_when_zone_idle` keep stepping. Frankendom row 23 says "despawn on empty"; if that is the intent, this donor does not show it. Decide before building.
- Respawns run while empty: the spawn walk is not gated (`zone.cpp:1522-1531`), so new NPCs appear in an empty zone and then sit frozen (their step is gated in `MobProcess`). Frankendom must decide whether a respawn into an empty zone should wait.
- Stale first-mob edge (control-flow reading, not run): `old_client_count` is updated only inside the per-mob loop (505). If a zone has no mobs at the moment the last client leaves, the loop does not run, th
checker: -

### FWGS-xash3d-fwgs (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW004/out/zones-world/FWGS-xash3d-fwgs.deep.md
best_idea: Split the world into a fixed four-level tree of boxes, file each entity in the first box its extent crosses, and find triggers by walking only the boxes the mover overlaps, with a brush trigger tested on the mover's origin point.
decision: adapt - A fixed split tree gives cheap presence and boundary queries for spawn volumes and zone triggers. Reject the level-triggered touch: the donor calls the touch on every relink while overlapping, so the game must keep enter and exit state, and our ledger should own that state.
acceptance: A server test: a player walks into a zone-boundary trigger and the transition fires once on enter, not on each tick inside; a trigger whose box overlaps but whose origin is outside its volume does not fire; tree queries match a brute-force scan for random boxes.
tags: new:spatial-tree,presence-gated
gaps/risks(excerpt): - Level-triggered touch: `SV_TouchLinks` calls the touch callback on every relink while overlapping, with no enter or exit state in this file (`sv_world.c:559-562`; reading, not run). Frankendom must keep an inside set per player and fire on the change only.
- Brush triggers test the origin, not the box: a player whose body is in a zone but whose origin is outside the brush does not trigger (`sv_world.c:549-553`). Frankendom's zone boundaries should say which point counts (position in the zone, not the feet box).
- The tree is fixed at build time from the world bounds (`sv_world.c:476`). An entity outside the world box is filed in the root's lists by the walk's rules; this was not tested.
- 
checker: -

### KsanaDock-Microverse (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW005/out/zones-world/KsanaDock-Microverse.deep.md
best_idea: Give every zone one authored id and a rectangle, build the registry once at load, and answer which zone a point is in with one inclusive box test that returns null outside every zone.
decision: adapt - Zones are data on one runtime, and row 23 population counts need one unambiguous zone id per point; take the authored box, the single id and the null-outside rule, and reject the node-name key shown to the AI, the silent 100x100 fallback and the origin skip.
acceptance: A server test loads a 9-zone table and asserts each spawn point and test character position resolves to exactly one zone id (never the display name); a point in a gap returns null without error; a zone with a missing rectangle fails the load.
tags: new:zone-volume-aabb,new:one-id-per-zone
gaps/risks(excerpt): - Two names for one zone. The registry is keyed by node name (`RoomManager.gd` 27) and the AI sees node names in its room list (`AIAgent.gd` 1840, 1876, 1886). Other code uses the display name (75, 1956). At `AIAgent.gd` 1956 and 1961 the current room's display name is compared with node-name keys, so in this scene the current room is never excluded from the candidate list. Frankendom must use one zone id everywhere.
- `shape.extents` (`RoomManager.gd` 23): Godot 4 stores this property as `size` (the scene file does, `Office.tscn` 16745) and `extents` was the Godot 3 name. Not run. If Godot 4.4 has no `extents` on `RectangleShape2D`, line 23 fails on the first zone, `rooms` stays empty, and 
checker: -

### LostCityRS-Engine-TS (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW005/out/zones-world/LostCityRS-Engine-TS.deep.md
best_idea: Keep a per-client window of zones around an origin, rebuild it only when the player walks out of an inner reload box (hysteresis), and send each zone's shared events once per tick to everyone while private events go only to their receiver.
decision: adapt - Fits zones as data and one ledger: per-client window and per-zone shared-plus-private sync are the shape; reject the RS packet format, the bit-grid zone flags (index collision, run on VPS) and first-in-list obj eviction, which the donor's own comment contradicts.
acceptance: A server test walks one player back and forth across the reload edge and asserts the window rebuild is sent once per crossing, not per step; two players in one zone get one shared encode (count = 1), and a private loot event reaches only its owner.
tags: hysteresis,per-player-view,population-cap,new:origin-window-reload,new:zone-shared-buffer
gaps/risks(excerpt): - Transport: the donor sends RS-protocol binary packets (`network/game/server/*`), which were not read. Frankendom's browser client needs its own message shapes; only the window, order and buffer rules transfer.
- Latent bug, do not port: `ZoneGrid.index` is `(zoneX << 5) | (zoneY >>> 5)` (`ZoneGrid.ts` 15) but `zoneY >>> 5` takes six bits (the grid has 2048/32 = 64 words per column, `ZoneGrid.ts` 6). Columns overlap. I ran a copy on the VPS: after `flag(1, 0)`, `isFlagged(0, 1024, 0)` returns true; after `flag(0, 1024)`, `isFlagged(1, 0, 0)` returns true; a control with `flag(5, 100)` gives false for `isFlagged(0, 1024, 0)`. `isFlagged` has no caller in `src`, so the bug is latent. Frankend
checker: -

### OpenDAoC-OpenDAoC-Core (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW005/out/zones-world/OpenDAoC-OpenDAoC-Core.deep.md
best_idea: Index a zone's objects in a fixed grid of cells, answer radius queries by culling cells with their nearest distance, and apply cell changes in a queued pass once per tick, triggered only by movement flags plus a timer.
decision: adapt - Many-on-one and zone range queries need a cheap radius query in the world; take the grid, ring cull and queued move, and reject the Z skip inside fully-enclosed cells, the silent out-of-grid failure and the hard-coded move-to-bind policy. The Pit (MAX_ATTACKERS = 3) does not need the index.
acceptance: A server test puts 5000 objects in one zone and asserts 1000 random 3D radius queries (including cell edges and the zone border) equal the brute-force set, and an object moved across a cell edge is in its new cell after one tick, not before.
tags: new:fixed-cell-grid,new:ring-query-cull,new:queued-cell-move,timer-wheel
gaps/risks(excerpt): - Z is skipped in fully-inside cells (`Zone.cs` 383, 389). `CheckSubZoneMaxDistance` (550-556) measures only x and y, so an object far above or below the point is returned from a fully-inside cell and rejected from a border cell. The radius query is therefore 3D on the border and 2D inside. Not run; a test should show it. Frankendom must not copy the shortcut.
- Relocation lags by one tick: the move is applied in `ZoneService.Tick` (`ZoneService.cs` 39), so a query in the same tick sees the object in its old cell. Decide the rule (queries use the old cell for one tick, or the move is applied before queries) and test it.
- Two triggers, one of them slow. The timer fallback is 2000 ms (`Moveme
checker: -

### OpenGothic (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW006/out/zones-world/OpenGothic.deep.md
best_idea: Split a zone's NPCs into near, mid and far tiers by squared distance to the player, and spend perception and speech only on the near tier.
decision: adapt - Tier split and near-only perception are a cheap way to keep many NPCs per zone affordable, with radii as zone data; but combat state and hate must stay out of the tier so far NPCs still land hits and record server kills.
acceptance: A server test places an NPC holding a hate entry for the player just outside the near radius, ticks 60 times, and asserts the hit and the server-side kill are recorded; a second test asserts no perception scan runs until the player is inside the near radius.
tags: compute-budget,presence-gated,new:distance-tier
gaps/risks(excerpt): - Tiering must not gate hit resolution, kills or hate. In the donor the far tiers skip perception, speech and the AI loop, and the damage path was not read. Frankendom rules say kills are server-verified and MAX_ATTACKERS = 3. An NPC that holds a hate entry for the player must keep full state at any distance. Keep the tier out of `src/fight`.
- No hysteresis. The donor switches tier on every tick with no margin, so an NPC on the boundary can flip each tick. Frankendom needs a margin or a hold time (I found no donor counter-example and did not look for one).
- The split is O(n) per tick over all NPCs, with no cap. For the server tick, the tier pass should run on the fixed step and read server
checker: -

### OpenRA-OpenRA (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW006/out/zones-world/OpenRA-OpenRA.deep.md
best_idea: Keep a zone's live population between a minimum and a maximum by spawning on a randomised interval from typed spawn points, and refilling to the minimum in one burst when it is below.
decision: adapt - Cap, interval, typed spawn points and minimum burst are the zone-population shape we need, but the donor counts with a hook that drifts when a removal path skips it, so Frankendom should count the live server roster instead.
acceptance: A server test in a zone with maximum 4 and a 600-tick interval kills all 4 creatures and asserts one spawn per interval until the minimum is back, never above the maximum; a second test removes one creature by leash and by kill and asserts the count drops by one each time with no extra call.
tags: director,population-cap,group-refill
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room and shape only. The sketch was written from the mechanism, not from the lines.
- Manual counter drift. The count goes down only through a hook, so any removal path that skips it keeps the slot forever. Frankendom should count live server entities per zone instead, so that a kill, a leash or a despawn lowers the count with no extra call.
- No despawn. Row 23's "despawn on empty with a grace timer" is not in this donor. The donor has cap, interval, refill and burst only. Do not cite this file as the source of the grace timer.
- The maximum is not clamped in the burst. If the minimum is above the maximum, the donor overshoots. Frankendom zone loading should reject
checker: -

### OpenRCT2-OpenRCT2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW006/out/zones-world/OpenRCT2-OpenRCT2.deep.md
best_idea: Drive a zone's spawn chance from its attractiveness, with a soft cap that divides the chance above a population target, a hard ceiling, and a difficult gate, all rolled once per update on the server's seeded RNG.
decision: adapt - The per-roll threshold with soft cap and hard ceiling gives smooth zone population from zone data, but the park economics (fee against ride value, awards) do not transfer and fight limits such as MAX_ATTACKERS = 3 must stay hard, so only the zone population uses this rule.
acceptance: A seeded server test shows a zone 1.5 times over its suggested maximum spawns at one quarter the roll rate of a zone at its cap; a difficult zone spawns nothing while more than 150 above its suggested maximum; every roll is logged with its threshold so a replay rebuilds the population.
tags: population-cap,director,new:soft-cap-divisor
gaps/risks(excerpt): - GPL-3.0: clean-room and shape only. The sketch was written from the mechanism.
- A soft cap, not a hard one. Above the suggested maximum the donor still spawns, only less often; only difficult mode gates hard, and only for the main roll. Zone population can use this. Fight participants cannot: MAX_ATTACKERS = 3 must stay a hard limit in `src/fight`, not a probability.
- The inputs are park economics: rating, ticket price against ride value, and park awards. Frankendom has no economy of that kind. Its zone score would have to be data, and the price rule would need a real equivalent or be dropped.
- Determinism is good: the donor rolls its scenario RNG. Frankendom's server must roll its own 
checker: -

### OpenXcom-OpenXcom (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW007/out/zones-world/OpenXcom-OpenXcom.deep.md
best_idea: Describe a zone as a list of rectangles and a route as an ordered list of zone ids, pick spawn points by choosing a rectangle uniformly by count and then a point inside it, and retry a bounded number of times for a valid spot.
decision: adapt - Take the zone-as-rectangles data and the route-through-zones shape; do not take the 30-minute geoscape clock, and do not copy the client-triggered kill pause (kills are server-verified). The donor's weighted draw has an off-by-one, so do not copy it.
acceptance: A server test with one zone of two very different rectangles draws each about 50% over 10,000 draws; a roaming group visits zones in listed order; a spawn that fails 100 valid-spot tries is skipped or clamped by one stated rule, never placed on an invalid cell.
tags: director,group-refill,new:zone-rect-pick,new:zone-route,new:bounded-reject-sample,new:wave-countdown
gaps/risks(excerpt): - The donor calls `ufoShotDown` from `DogfightState.cpp:1055`, a client UI state. Frankendom's kills are server-verified, so the wave pause must be applied by the server on a verified kill. Do not port the client call.
- Donor cadence is a geoscape clock of 30 game minutes. A fight-speed zone runs on the server tick. Do not carry the minute values over as seconds; re-state them as zone data in the server's own unit.
- The donor's header comment for the spacing jitter (`RuleAlienMission.h` 50) disagrees with the code. Pin the code's behaviour with a test before copying the numbers.
- The weighted draw has the off-by-one described in section 1 (`WeightedOptions.cpp` 37). Copying the function c
checker: -

### PixelGuys-Cubyz (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW007/out/zones-world/PixelGuys-Cubyz.deep.md
best_idea: Generate zone centres per 2048-unit chunk from the world seed with a spacing rule of 0.85 times the summed radii, place the chunks in four parity phases so each chunk's neighbours are already fixed, and classify a point by the nearest centre measured in units of that centre's radius.
decision: adapt - Take the seeded chunk placement and the normalised nearest-zone rule, because they give a deterministic zone map from data without a baked file. Parity row 23 is the closest row, not an exact fit: this is layout, not population. Do not take the unclamped radius, the untested window-edge behaviour, or the f32 classification as is.
acceptance: A server test with a fixed seed asserts that chunk centres two or more chunks inside a window are identical when the window origin changes, that no two centres in adjacent chunks are closer than 0.85 times their summed radii, and that a point in a valley is not assigned to a mountain-only zone whose height limit it breaks.
tags: new:chunk-centre-rejection,new:parity-phase-neighbours,new:normalised-nearest-zone,new:height-gate-penalty,new:blend-band
gaps/risks(excerpt): - Radius is not clamped to the 2048 chunk assumption. The radius comes from zone data (`biomes.zig` 268-277), and only the adjacent 8 chunks are checked (`NoiseBasedVoronoi.zig` 173-178). Two centres in chunks two apart are at least 2048 units apart, so an overlap goes undetected once 0.85 times their radius sum exceeds 2048 (radius sums above about 2409). The donor does not enforce that limit in the code read. Frankendom needs a load-time check on radius.
- Window-edge chunks lose neighbours (`NoiseBasedVoronoi.zig` 188-190: out-of-window neighbours are skipped). A chunk's centres can therefore depend on which window computed it. The donor's code does not show why the fragment interior is f
checker: -

### TurningWheel-Barony (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW007/out/zones-world/TurningWheel-Barony.deep.md
best_idea: Keep each zone's spawn table as data (a roll modulus and bands of roll ranges), gate a band by substituting a lower-tier monster below a level rather than re-rolling, and let a custom curve override the base roll only until its first empty result on a level.
decision: adapt - The band table as zone data with a substitution gate fits parity row 23 (zone population). Reject the name-prefix zone lookup and the hard-coded switch statements. Keep the custom override only as explicit per-level state that resets at each level build. Caps, respawn and despawn are not in this donor's code.
acceptance: A server test with the Mines table asserts that over 10,000 spawn rolls, skeletons are 60 percent plus or minus 1 at level 1 and spiders and trolls are each 10 percent plus or minus 1 at level 2; a custom curve that returns nothing once is not consulted again on that level.
tags: new:zone-band-table,new:level-gate-substitution,new:override-until-first-empty,new:seeded-spawn-stream
gaps/risks(excerpt): - Zone identity comes from a name prefix (`strncmp(map.name, ...)`, 306 onward). A renamed map silently falls to the SKELETON fallback or to another zone's table. Frankendom needs a zone id as a data key.
- The base roll is taken before the custom roll (7866 before 7869), so a custom override still consumes the base stream and changes every later roll on the level. Frankendom must pick one order and test it.
- One shared level stream (`map_rng`) decides every table roll, so reordering placement reshuffles every monster on the level. Frankendom should seed each spawn from the zone seed and the spawn index.
- The nested draw in The Ruins (408) makes the odds depend on a second roll. Write nest
checker: -

### afritz1-OpenTESArena (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW008/out/zones-world/afritz1-OpenTESArena.deep.md
best_idea: Keep a square window of zone chunks around the player, diff it into load and free lists, and cap the population as a function of how much of the world is loaded, filling only the missing share as each chunk enters.
decision: adapt - The window diff and the loaded-area cap fit zones as data, but the donor only acts on chunk load, has no respawn timer or despawn grace, and does not save kills, so respawn must move to a server timer in the ledger.
acceptance: A server test kills an enemy in zone A, walks out and back inside the respawn timer, and asserts the enemy is still dead; after the timer, and with the player in the zone, a fresh spawn appears and the live count for zone A never exceeds its cap.
tags: population-cap,new:chunk-window-stream,new:despawn-with-chunk,new:placement-spawn
gaps/risks(excerpt): - The donor refills only when a chunk loads (`EntityChunkManager.cpp` 2170 is the only populate path). A citizen who dies, or leaves the scene, is not replaced until a chunk reloads. Frankendom row 23 needs an explicit respawn timer and a despawn grace timer on the server, both as zone data. The donor has neither.
- Kills and changes are not saved. Freed chunks destroy their entities (`EntityChunkManager.cpp` 2143) and the recycle has an open todo to save changes (`SpecializedChunkManager.h` 153). Against server-verified kills and one ledger, this must not be copied: a kill is a ledger record that exists independently of the streaming window.
- The cap scales with how many chunks are loaded 
checker: -

### alexbatalov-fallout1-ce (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW008/out/zones-world/alexbatalov-fallout1-ce.deep.md
best_idea: Make encounter risk a per-zone tier checked every N travel steps, with a once-per-character budget of unique encounters held in the ledger, so a rare special cannot repeat.
decision: adapt - The per-zone tier roll on a travel interval and the once-per-character unique pool fit zones as data and the one ledger; the donor's dice curve and luck/perk gate are shape only and would be zone or engine data we set ourselves; no donor code or tables are taken (restricted licence).
acceptance: A server test walks one character 1000 travel steps through a top-tier zone and asserts that encounters appear only outside town zones, and that a unique encounter id appears at most once in the character ledger across a save and a reload.
tags: director,new:travel-distance-trigger,new:zone-chance-tier,new:unique-once-bitmask,new:skill-scaled-interval,new:reroll-on-used
gaps/risks(excerpt): - The donor rolls per travel step and the step count is also the clock for time; Frankendom has no travel-step counter. The server needs a defined step (or a move-distance unit) for the check, and the check must be a server event so a client cannot skip it.
- The donor's unique pool is a bitmask in the save, which is client-side in the donor. Under one ledger and server-verified rules, the record belongs to the character on the server; the donor shows only the shape.
- The 3d6 curve is the donor's game feel. Frankendom should set tiers as explicit probabilities per zone rather than port the dice; the donor gives no reason for its numbers, so do not claim its feel.
- The loop's `while (v142 =
checker: -

### alexbatalov-fallout2-ce (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW008/out/zones-world/alexbatalov-fallout2-ce.deep.md
best_idea: Give each zone a frequency level per time-of-day band, roll it on a travel check, then pick one weighted table entry filtered by conditions and spent from a per-entry counter, so rare entries run out.
decision: adapt - Zone-by-time-band frequency, conditional weighted entries and per-entry counters fit zones as data and a server counter in the one ledger; the real-time throttle and the one-axis distance quirk do not fit a server tick and are rejected.
acceptance: A server test steps one character through a night zone and asserts that no roll passes unless the character moved the minimum distance on both axes since the last roll that passed; an entry with counter 2 fires at most twice across a save and reload; a cancelled encounter does not spend the counter.
tags: director,new:zone-daypart-frequency,new:skill-detect-roll,new:counter-budget,new:weighted-pick-luck-shift,hysteresis,new:real-time-throttle
gaps/risks(excerpt): - Real-time throttle: `getTicks()` (3324) and the 1500 ms gate (3325) are wall-clock. A server must count server ticks, or the check depends on the machine.
- Distance gate: the donor returns unless both axes moved 3 tiles (3331-3337), so a straight walk along one axis is never checked. Read as written, not run. Frankendom should state the distance rule explicitly and test it.
- Cancelled encounters still cost: `wmRndEncounterPick` spends the counter (3421, 3636-3637) and the reference position is set (3501-3502) before the yes/no dialog (3504-3518). A "no" answer returns 0 but does not restore either. Frankendom should decide this and test it; the sketch does not restore either.
- No guard 
checker: -

### amilich-isometric-city (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW009/out/zones-world/amilich-isometric-city.deep.md
best_idea: A per-slot population director where spawn, despawn and recovery run off one lagged demand signal, with a dead band between two thresholds, an age grace before removal, and capped per-tick chances.
decision: adapt - The dead band, age grace and capped per-tick chance are the shape row 23 needs; the jobs and tax economy and the footprint rules do not fit, and the donor despawns on negative demand rather than on an empty zone.
acceptance: A server test holds zone demand at -40 for 300 ticks and asserts no built spawn is removed before 30 ticks of age and removal never exceeds the 2% per-tick zone cap.
tags: director,population-cap,hysteresis,grace-timer,respawn-scaling
gaps/risks(excerpt): - The donor's demand is economic (jobs, population, tax). Frankendom has no economy here. The signal has to be defined as server-side counts (players and creatures per zone against the zone cap). That definition is ours, not the donor's, and is not tested.
- The donor abandons on negative demand, not on an empty zone. Row 23 asks for despawn on empty with a grace timer. The age grace and the cap transfer; the trigger does not, so the rule has to be changed, not copied.
- `Math.random()` makes the donor non-deterministic. Frankendom needs a seeded RNG per zone so server tests and the fight record (row 19) can replay a run.
- The donor is single-player and client-side, with no authority. Its n
checker: -

### angband-angband (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW009/out/zones-world/angband-angband.deep.md
best_idea: A zone population director with a trickle spawn (one roll per fixed tick, placed out of the player's sight), a hard cap, and cap relief by relaxing passes that remove the farthest and weakest creatures first, with a saving throw.
decision: adapt - The out-of-sight trickle roll and the cap relief by relaxing passes fit row 23, but the donor's compaction ignores whether a player is fighting a creature, so engaged creatures and bosses must be protected first; the random race table is deferred because zones are not yet data-driven per race.
acceptance: A server test fills a zone to its cap, requests one trickle spawn, and asserts the spawn is at least the zone's min-away distance from every player, and that compaction never removes a creature engaged with a player (MAX_ATTACKERS = 3) or a boss.
tags: director,population-cap,presence-gated,respawn-scaling,new:trickle-roll-out-of-sight,new:relaxing-cap-compaction
gaps/risks(excerpt): - The licence is dual. Option b (non-commercial, not-for-profit) is not an open-source licence, so the only safe reading for Frankendom is clean-room: nothing copied, only the shape.
- The donor's compaction deletes monsters by distance and level, not by whether a player is fighting them. The donor would remove an engaged creature at distance 6 if the pass allows it. Frankendom must protect engaged creatures (MAX_ATTACKERS = 3) and bosses before any pass runs. This is a change, not a port.
- The donor's `randint0` is not seeded for replay. Frankendom needs a seeded RNG per zone so the fight record (row 19) and server tests can replay a run.
- The donor is single-player and has no authority; 
checker: -

### ax-grymyr-l2dn-server (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW009/out/zones-world/ax-grymyr-l2dn-server.deep.md
best_idea: A respawn queue per spawn point that counts down when a corpse decays, schedules the respawn at a random time inside a delay band, and refuses to queue when alive plus already-queued would reach the cap.
decision: adapt - The cap rule (alive plus queued under the maximum), the random band with a 10 s floor and the fixed sweep fit row 23's respawn; the donor's decay trigger and same-object reuse do not fit Frankendom's server-verified kills and one ledger, so the trigger and the id are changed.
acceptance: A server test with a spawn point at maximum 3 kills three creatures and asserts no respawn is queued until a corpse is removed, each queued respawn fires after its band delay and never under 10 seconds, and alive plus queued never exceeds 3.
tags: respawn-queue,population-cap,fixed-step
gaps/risks(excerpt): - Provenance: `README.md` says the code began as a port of L2J (Java). If the port kept L2J code, the MIT notice on `LICENSE.txt` may not cover those parts. Until the L2J licence is read, treat this donor as clean-room, shape only.
- The donor starts the respawn clock when the corpse decays (Npc.cs 1080), not when the NPC dies. Frankendom's kills are server-verified; the clock should start from the verified kill or from the server's removal event, and the choice has to be tested.
- The cap is checked when the respawn is queued (Spawn.cs 213), not when it fires. A second spawn path (a GM command or another zone rule) can push alive above the cap between queue and fire. Frankendom should check
checker: -

### beyond-all-reason-Beyond-All-Reason (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW010/out/zones-world/beyond-all-reason-Beyond-All-Reason.deep.md
best_idea: Store each zone as data keyed by team count, pick the nearest layout when the exact count is missing, and test a spawn point with a point-in-polygon check plus four offset points so it keeps clear of the edge.
decision: adapt - Zone polygons per population size belong in zone data and the pick rule and inset test belong in the engine, which is the zones-as-data shape we want. Do not copy the map-geometry fallback, the nil-then-break draw loop, or math.random for server-verified spawns.
acceptance: A server test with a zone authored for 4 teams shows a 3-team instance uses the 4-team layout; 10,000 seeded spawn draws in an L-shaped zone with inset 1 all pass containment and the four-offset check; a zone with no layout for its team count fails the test rather than falling back.
tags: new:zone-layout-by-count,new:inset-rejection-sample,new:closest-edge-clamp
gaps/risks(excerpt): - GPL v2: clean-room only. The sketch is written from the described mechanism.
- Silent fallback: when a match has no layout, the donor invents bands from map geometry (233-275) and carries on. Frankendom's zones-as-data ruling means a zone with no layout for its team count should fail loudly in the server test, not invent one.
- Retry semantics: the donor draw returns nil on one miss, and the scav loop breaks out on that nil (1139-1140). So "100 attempts" is in practice up to 100 successful draws, and one miss ends the attempt. Frankendom must choose one rule (retry budget per spawn, or fail) and test it. This note does not check whether the donor's break is intended.
- Randomness: the dono
checker: -

### crawl-crawl (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW010/out/zones-world/crawl-crawl.deep.md
best_idea: Generate terrain from world coordinates and keep only a small window around the player, so terrain you leave and come back to is rebuilt identically without storing it.
decision: adapt - Keep the world-coordinate generator and the population top-up per re-anchor only if Frankendom adds endless wilderness, since authored zones do not need a window. Reject the destructive wipe: entities that leave the window must be moved or ledgered, never silently deleted.
acceptance: A server test walks a player 23 cells from the zone centre, triggers a re-anchor, then walks back; terrain at every world coordinate is identical before and after; every entity leaving the window is moved or recorded; at depth 3 the top-up is 18 or 21 spawns.
tags: new:window-reanchor,new:coordinate-keyed-regen,new:topup-per-shift
gaps/risks(excerpt): - GPL v2 or later: clean-room only. The sketch is written from the described mechanism.
- Destructive wipe: monsters outside the window are removed (632-633, 765) and item stacks are lost (755), with no kill, drop or ledger record. That breaks one ledger and server-verified kills. Frankendom must move or ledger such entities, never delete them.
- Randomness: the top-up uses the game's coin flip (1544) and the origin uses the game RNG (1491-1492). Frankendom's spawns must draw from the seeded server stream and log the count.
- Authored zones: Frankendom's zones are authored data, not endless terrain. The shift is worth porting only if we add endless or re-centred wilderness. Otherwise adopt o
checker: -

### cuteshaun-lineage2-api (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW010/out/zones-world/cuteshaun-lineage2-api.deep.md
best_idea: Name a position by the nearest authored anchor within a fixed radius, and take a group's home zone as the most frequent zone among its members, with ties going to the lowest id.
decision: adapt - Nearest-anchor-within-radius gives zone labels and population attribution for zones that have no polygon, with the radius as zone data. Keep polygon containment for anything that decides legality, since anchors have no shape.
acceptance: A server test places a spawn 9,000 units from a zone anchor whose radius is 10,000 and expects that zone; a spawn 11,000 units from every anchor expects no zone; a creature with three spawns in zone 7 and three in zone 4 reports zone 4.
tags: new:nearest-anchor-threshold,new:home-zone-mode,new:audited-override
gaps/risks(excerpt): - MIT: adaptable. Keep the notice if any code is copied; this note's sketch is a rewrite.
- One threshold for every zone: 10000 (`indexes.ts` 1564) applies to all zones. Frankendom zones differ in size, so the radius must be a per-zone data field, not a global constant.
- Anchors have no size or shape. A point near a small zone's centre resolves to it even if it is outside the zone's real edge. Use the anchor only for labels and budgets where a zone has no polygon. Legality (a spawn inside a zone, a kill inside a zone) must use containment.
- Brute force: one pass over all anchors per point, per request (`indexes.ts` 1590-1592). Fine for a web catalogue. In a Frankendom server tick, resolve 
checker: -

### daggerfall-unity (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW011/out/zones-world/daggerfall-unity.deep.md
best_idea: A zone-sized population pool that adds at most one creature per tick, shows each one only when it is out of the player's front view, and removes it by distance or a stuck count, with the cap set per zone.
decision: adapt - The cap-from-size rule, the one-spawn-per-tick limit and the pending-until-unseen gate fit row 23, but the donor is client-only and has no grace timer or empty-zone despawn, so Frankendom keeps the shape and makes the server own spawn and despawn.
acceptance: Server test: with a zone cap of 24, live count never exceeds 24 over 1000 ticks, at most one spawn per tick, and a creature is removed only after its grace timer runs with no player within the despawn range; client check: no creature pops in or out inside the front 180-degree view within 120 units.
tags: population-cap,presence-gated,wait-gate,accumulator,new:pooled-spawn
gaps/risks(excerpt): - The donor's pool is a client-side Unity object. Frankendom must make population server entities; the client only shows them. Nothing here is server-verified, and the donor has no kills, loot or ledger link.
- Despawn in the donor is immediate (distance 150 or night) with no grace timer and no rule about an empty zone. Row 23 needs despawn on empty with a grace timer, so the donor's rule is only the shape; add the grace timer as a zone field.
- The view gate uses the player's forward vector and is a client visibility rule. If the server used it for spawn or despawn, two clients would disagree. Keep it out of the server.
- Night churn (spawn not day-gated; enable and recycle are) is read fro
checker: -

### dhewm-dhewm3 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW011/out/zones-world/dhewm-dhewm3.deep.md
best_idea: A zone's NPCs stay awake while a player can reach their zone through open gates, freeze three seconds after the gate shuts, and a never-awake NPC waits for a player's view before it runs at all.
decision: adapt - The grace timer on disconnect and the skip-the-brain-when-frozen gate fit row 23's grace rule and the server tick's per-tick NPC budget; Frankendom has zones as data, so connectivity comes from zone gate data, not a portal BSP, and dormant means frozen, with despawn left to the row 23 empty-zone rule.
acceptance: Server test: a zone reached only through a gate keeps its NPC awake until the gate has been shut for 3000 ms, then the NPC is frozen (its brain does not run); reopening the gate wakes it on the same tick; a never-awake NPC does not run its brain until a test player's view includes its zone.
tags: presence-gated,grace-timer,per-player-view,new:zone-gate-graph,wait-gate
gaps/risks(excerpt): - GPL-3.0 with id's additional terms: clean-room only. The sketch is written from the described tests; no donor line is copied.
- The donor connects zones by a precomputed portal graph of a BSP map. Frankendom's zones are data, so the gate graph must be authored zone data (open or shut per gate), with a server-side toggle when a gate state changes. Do not port the portal builder.
- "Dormant" is a freeze, not a despawn. Row 23 needs despawn on empty with a grace timer. The donor's grace is only the freeze step; the despawn rule has to be added as its own zone field.
- The first-wake PVS check uses the player's visibility (a client view). On the server, the equivalent must be a server-known ru
checker: -

### dkfans-keeperfx (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW011/out/zones-world/dkfans-keeperfx.deep.md
best_idea: A spawn director that fires on a turn interval, picks one kind from a weighted table whose weights rise with what the zone supports, and stops at an active-count cap and at a price the player cannot pay.
decision: adapt - The interval, weighted pick, cap and pool gates map onto row 23 spawn tables as zone data (caps, weights, intervals per zone); the donor spawns at the player's entrance and never despawns, so Frankendom keeps the director shape and makes the server own spawn and any despawn.
acceptance: Server test: a zone with cap 6 and interval 10 turns never holds more than 6 live creatures and spawns at most one per interval; the timer resets when the cap blocks a spawn, so blocked ticks do not bank spawns; over 1000 seeded picks, adding three matching zone features raises that kind's share (the test asserts the direction, not a fixed number).
tags: director,population-cap,presence-gated,loot-cumulative-roll,new:weighted-spawn-table
gaps/risks(excerpt): - Donor bug (player_utils.c 486-487): the scan compares `total_score` against the running max, then stores `manage_score`. The intended maximum is over `manage_score`. As written, `max_manage_score` takes the `manage_score` of any active keeper whose `total_score` is larger than the running value of `max_manage_score`; when that value stays 0, dungeons with a positive score get an interval of 0, i.e. generation on every due turn (read, not run). Keep the idea (interval scales with the best zone's score); the fix is to compute the maximum over one field, explicitly, in the server code, and test it.
- Timer behaviour: the donor resets the timer for an active keeper even when the cap blocks the
checker: -

### electronicarts-CnC_Remastered_Collection (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW012/out/zones-world/electronicarts-CnC_Remastered_Collection.deep.md
best_idea: Label the connected regions of a zone once, rebuild the labels only when a wall or gate state changes, and make every placement search accept only cells in the anchor's region.
decision: adapt - Placement legality is a real rule for spawns and drops in a fast browser game, but Frankendom needs region labels built from its zone geometry and rebuilt on blocker change, not the donor's per-cell byte array with four movement classes.
acceptance: A server test seals a pocket with a wall; a spawn requested inside the pocket lands only in the pocket's region; after the wall is destroyed the labels are rebuilt and the next spawn can land outside it.
tags: new:connected-region-labels,new:region-scoped-placement,new:relabel-on-blocker-change,fixed-step
gaps/risks(excerpt): - Licence: GPL v3 with EA additional terms. Clean-room only. The sketch is written from the described mechanism and was not translated line by line.
- Labels are terrain only at build time (occupancy masked for infantry and vehicles, CELL.CPP 2916). Units and doors are then checked at query time. Frankendom must decide whether a closed door is a blocker that triggers a rebuild, or a query-time check. The donor does not give a rule for it.
- Rebuild cost: each trigger relabels the whole map (MAP.CPP 1491 warns about it). Frankendom zones are smaller, but a per-zone rebuild is still needed when a gate or wall state changes, and it should not run per tick.
- Region-count overflow: the label byt
checker: -

### endless-sky-endless-sky (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW012/out/zones-world/endless-sky-endless-sky.deep.md
best_idea: Give each zone a table of spawn entries, each with an interval and a condition gate; scale every interval by one global multiplier, pre-fill a newly entered zone by a few simulated seconds of draws, and block new spawns while friendly groups already outnumber enemies two to one.
decision: adapt - The per-zone interval table with a condition gate is what row 23 needs as zone data, and one global rate knob is a clean engine value; but the strength-ratio guard and missing interval floor do not fit the MAX_ATTACKERS = 3 ruling, so take the table and knob, add an explicit floor, and cap by attacker count.
acceptance: A server test runs a seeded zone with one entry of interval 600 ticks at multiplier 1 and asserts a spawn count near 10 over 6000 ticks; at a large multiplier the zone floor holds (no more than one spawn per floor period per entry); with more allied groups than twice the hostile groups in the zone, no new group spawns.
tags: new:interval-table,presence-gated,population-cap,new:pre-warm-on-entry,new:multiplier-scaled-interval
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and not translated line by line.
- Missing interval floor (donor bug or design gap): with `period / multiplier` below one, `Random::Int` takes a bound of zero (Random.cpp 83 returns zero for any bound of zero), so `!Random::Int(...)` is true on every step (Engine.cpp 2033), and the pre-warm test `< 60` is true every second (1535). Gamerules parsing has no upper clamp on the multiplier (Gamerules.cpp 107). The gamerules panel has a validated number dialog (GamerulesPanel.cpp 939-940); the validator was not read. Frankendom must set a floor in code and in the zone data.
- The pre-warm skips the population g
checker: -

### evennia-evennia (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW012/out/zones-world/evennia-evennia.deep.md
best_idea: Generate a zone chain lazily as players step through its exits, keep a fixed budget of unexplored exits and reserve every coordinate, lock each area's onward exits until its encounter is cleared, and collapse an instance after it has been idle.
decision: adapt - The lazy layout with a budget and reserved coordinates fits instanced zones, and the lock-until-cleared exit fits server-verified clears; but the donor collapses by generation age and its cleanup removes no rooms, so Frankendom takes the generator and the lock and writes its own empty-with-grace despawn that really removes the instance's areas.
acceptance: A player sees new areas only as they step through exits; the onward exit stays locked until the server confirms the encounter is cleared; once the instance has been empty for the grace period the server removes its areas and returns stragglers to the entrance, and a server test asserts the removed areas are gone.
tags: new:lazy-zone-chain,new:unexplored-exit-budget,new:reserved-coordinates,new:lock-until-cleared,new:idle-collapse
gaps/risks(excerpt): - BSD-3-Clause: the code may be adapted. Frankendom still writes its own sketch; no line is copied.
- Docstring says rooms are tagged with the branch id and the branch is deleted "when no characters remain" (dungeon.py 12-14). Neither is true in the code. Rooms get only the `not_clear` tag (107); the deleter checks age only (418). Treat the docstring as wrong.
- Cleanup removes no rooms: `delete()` searches rooms by the branch key in category `dungeon_room` (270), and nothing sets that tag. So every collapsed branch leaves its rooms behind (as read; the search was checked by grep, not run). Frankendom must tag or track the instance's areas at creation and delete them by that record.
- The ag
checker: -

### exult-exult (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW013/out/zones-world/exult-exult.deep.md
best_idea: A spawn point rolls once per trigger entry and latches even on a failed roll; the latch is re-armed by a distance-window rule, not a timer.
decision: adapt - Zones are data and row 23 needs caps, respawn and a despawn grace that this donor lacks; take the one-roll latch, entry trigger, count range and ring placement; reject the superchunk byte serialisation because we load zone data rather than save world state.
acceptance: A server test asserts that a spawn point with chance 50 and count 1..3 rolls once per entry, a failed roll still uses the entry, the point does not roll again until the player leaves its re-arm distance, and each monster lands on a free tile within 5 tiles or the shortfall is counted.
tags: presence-gated,hysteresis,new:one-roll-latch,new:window-rearm
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- No population cap. An egg places up to 63 monsters on one trigger and nothing counts live monsters from the same point. Frankendom needs its own cap (row 23) and must not rely on the latch for it.
- The latch is one roll per entry. A failed roll uses the spawn point until it is re-armed (egg.cc 1350-1351). Frankendom must decide and test whether a miss should use up the point; the donor does, by design of the flag.
- The re-arm is driven by where the player's client reports it is, through chunk changes (actors.cc 4810). In Frankendom the server must decide the re-arm from server-known positio
checker: -

### flareteam-flare-engine (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW013/out/zones-world/flareteam-flare-engine.deep.md
best_idea: A zone's enemy groups are rolled once per map load (chance gate, inclusive count range, bounded random placement with a row-major fallback), so a zone is a data record re-rolled on each entry, not a timer.
decision: adapt - The group record is the zone-data shape row 23 needs; the donor has no cap across groups, no respawn timer and no despawn grace, and re-rolls on every load, so Frankendom keeps server-owned population state and adds those rules; reject re-rolling on every load as the whole rule.
acceptance: A server test loads a zone with a group of 2..4 members, chance 50 and a 3x3 area, and asserts the group is rolled once per zone load, members land on distinct walkable tiles, and any shortfall is reported with its count.
tags: presence-gated,new:once-per-load-roll,new:occupancy-check,clamp-and-report
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Rolls happen once per map load. A group that fails its chance, or whose requirement is not met, is empty for that visit, and nothing re-rolls it. Row 23 needs a respawn rule the donor does not have.
- Population is rebuilt from the group records on each load (MapSaver writes only the records, 202-215), so a zone repopulates when the player re-enters. The donor has no saved live state to contradict that. Frankendom's ledger needs the opposite choice, and that choice is for Lead to decide.
- No occupancy during placement: `pushEnemyGroup` does not block the tiles it fills (92-117 has no collide
checker: -

### flareteam-flare-game (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW013/out/zones-world/flareteam-flare-game.deep.md
best_idea: Zone layout as a seeded random walk on a grid of room pieces, with rules in a small key=value file, doors on straight runs, one key per door placed on the level before that door, and unique rooms placed once per campaign.
decision: adapt - The rules file is a good zones-as-data shape, and the key-before-door and unique-once rules are reusable progression gates; take the rules file and placement rules, leave out the per-save-slot cache (the server owns zone state) and fix the branch-length draw.
acceptance: A seeded server test generates a zone with 2 doors, asserts a main path of length 10 to 20 from start to end, one key on the level before each door, no unique room placed twice, and that the same seed regenerates an identical layout.
tags: new:grid-random-walk,new:key-before-door,new:unique-once-per-campaign,new:pity-ramp
gaps/risks(excerpt): - Copyleft on both code and data: clean-room only. The sketch is written from the described mechanism, not from the lines.
- Branch length defect: the rules say a branch is 5 to 10 steps, but the draw uses `std::min(branch_length_min, branch_length_max)` as the upper bound (Map.cpp 1340), so every branch is 5 steps. The idea (a ranged branch length) is kept in the sketch; the defect is not. Frankendom's data must not copy the bug.
- Keys form a linear chain: each key sits in the stretch before its own door (door level counting, Map.cpp 1160-1161, 1184, 1352, 1371). Behind door N lies key N+1, so a player who cannot get past an early door cannot reach the next key. This is intended, but it is
checker: -

### freeciv-freeciv (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW014/out/zones-world/freeciv-freeciv.deep.md
best_idea: Spawn zone population by sampling a random point, accepting it only inside a distance band from an existing zone anchor, and scaling the group size by how many anchors the owner holds.
decision: adapt - Keep the ring-band sampler and the population-tiered count as the zone spawn director; the donor's one-shot, no-despawn uprising lacks the caps, despawn-on-empty and grace timer Frankendom's row 23 needs.
acceptance: Server test: three anchors on a 200x200 map, 1000 passes at NORMAL rate; every spawn is 5-8 tiles from an anchor on an empty tile, the tier steps up at exactly 10 anchors, and live count per zone never exceeds the zone cap (cap is new).
tags: director,presence-gated,respawn-scaling,new:sampled-ring-band,new:per-pass-attempt-budget,new:terrain-spawn-table
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no lines are translated.
- No cap: the donor keeps no count of live barbarians. Uprisings only add units; `BARBARIAN_MIN_LIFESPAN` (barbarian.h 30) is defined and not referenced anywhere else in the donor tree (grep over the whole tree). Frankendom needs a per-zone cap and must not copy the unbounded growth.
- No despawn, no grace timer: a barbarian group, once spawned, stays until killed. Frankendom's row 23 needs despawn on empty after a grace timer; that has no counterpart here.
- Turn-based: the donor's pass runs once per turn at end of turn. Frankendom runs on a real-time server tick, so the attempt count per
checker: -

### freeorion-freeorion (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW014/out/zones-world/freeorion-freeorion.deep.md
best_idea: Give each spawn kind its own location rule (a hop distance from player-held zones), a cap and a rate, then pick one eligible kind per zone before a single roll, so every zone is visited once.
decision: adapt - Keep the per-kind table (rate, cap and location rule as zone data) and the one-kind-then-roll loop at generation; reject the runtime spawner as written because it ignores the caps and location rules and hard-codes one kind.
acceptance: Server test: 2-hop safe radius around player-held zones and cap 5 on one kind; over 500 seeded generation passes no spawn is within 2 hops of a player zone, the kind never exceeds 5, and a lane-breaking spawn that would split the zone graph beyond blockers + 1 regions is refused.
tags: population-cap,presence-gated,director,new:kind-weight-then-roll,new:zone-hop-distance-guard,new:transition-connectivity-guard,new:empty-zone-runtime-filter
gaps/risks(excerpt): - GPL v2: clean-room only. The sketch is written from the mechanism; no lines are translated.
- The runtime spawner (turn_events.py 39-63) bypasses the table: no spawn limit, no distance rule, and only SM_KRILL_1. Frankendom must not copy this path. Both paths need one rule set.
- The donor's caps are galaxy-wide counts fixed at generation. Frankendom's cap is per zone and must be live (count of current spawns), with despawn on empty and a grace timer (row 23). The donor has no despawn at all.
- The "one roll per zone" rule means a rejected roll wastes the zone for this pass. In a real-time game this should be a per-tick budget, not a single pass.
- A rate above 1 over the base chance is a c
checker: -

### gawric-Unity-Client-for-L2J (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW014/out/zones-world/gawric-Unity-Client-for-L2J.deep.md
best_idea: Keep a zone loaded while the player is within a preload band of its edge (including the corner neighbour), and start at most one zone load or unload per frame so streaming never stalls the frame.
decision: adapt - Take the edge-band neighbour set and the one-action-per-frame budget for the client zone loader; reject the donor's missing hysteresis and its geodata that is never released with the zone.
acceptance: Client test: walk back and forth across a zone edge at the band line for 300 frames; the neighbour stays loaded through a hysteresis margin (no load/unload per crossing), at most one load or unload starts per frame, and geodata of a zone unloaded for a set time is released.
tags: new:edge-band-preload,new:corner-neighbour-set,new:one-action-per-frame,new:grid-zone-id,stale-state
gaps/risks(excerpt): - Apache-2.0: the sketch is clean-room. The donor is permissive, so a line-by-line adaptation is allowed with the licence kept, but it is not needed.
- No hysteresis. Loading and unloading use the same band (SceneLoader.cs 181-197 and 153-162). A player who jitters across the band line loads and unloads the neighbour each time. Frankendom needs a load band and a larger release band; that is a new field, not in the donor.
- Geodata is never released per zone. `_geodata` is written in `LoadMaps` (Geodata.cs 80) and cleared only in `OnDestroy` (45). `UnloadSWMap` does not touch it (SceneLoader.cs 240-249). Frankendom must release geodata with the zone.
- Hard-coded grid. The tile size (VectorUt
checker: -

### gemrb-gemrb (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW015/out/zones-world/gemrb-gemrb.deep.md
best_idea: Roll the encounter once per leg of a trip, in travel order, stop at the first hit, and place the ambush at the midpoint of that leg from a five-slot zone list.
decision: adapt - Frankendom zones are data on one runtime, so a zone-to-zone trip with a per-leg interruption roll is reusable only if zones gain a route. The roll must run on the server and record the chosen zone and cost in the one ledger; the donor's global RAND and its mutable link state do not transfer.
acceptance: A server test: on a three-leg route with chances 0, 100, 0 the trip stops at the midpoint of leg 2 in a data-slot zone; with all chances 0 the trip reaches the target; a 100 chance with all five slots empty completes the trip with no ambush.
tags: new:route-leg-ambush,new:zone-graph-cost
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Authority: the donor rolls with a global RAND in a single-player program. Frankendom must roll on the server and record the chosen ambush zone and cost in its one ledger, or the client can pick its own outcome.
- Mutable state: the donor's >= 100 step (GUIScript.cpp 2893-2894) writes into the stored link, so a later trip over that link sees a changed chance. Frankendom must keep chance as read-only zone data.
- Pointer hazard: `GetEncounterLink` returns a pointer into `area_links` (a vector, WorldMap.h 126). `AddAreaLink` can reallocate it (WorldMap.cpp 94-97, 453-454). The donor reads the link f
checker: -

### graememcc-micropolisJS (copyleft, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/ZW015/out/zones-world/graememcc-micropolisJS.deep.md
best_idea: Keep a clamped demand accumulator per zone type, updated on a fixed schedule from last cycle's counts, and sample each zone with a bounded roll while spreading the zone pass over the ticks of a cycle.
decision: adapt - The clamped valve, cap flag, one-in-N sample and eight-slice sweep fit Frankendom's zone spawn caps; the city economy (tax table, employment, internal market) does not fit the fight-focused world. The server runs the valve and the roll and logs each spawn in the one ledger.
acceptance: A server test: a capped zone's valve never goes above 0; each zone is sampled once per 16-tick cycle; no tick samples more than one eighth of the zone columns; an empty zone past its grace period loses population in steps and never exceeds its band.
tags: population-cap,accumulator,compute-budget,wait-gate,new:demand-valve,new:phased-zone-sweep
gaps/risks(excerpt): - GPL v3 with additional terms: clean-room only. The sketch is written from the mechanism, not translated. The donor has no trademark grant, so no donor names or art should be carried over.
- The valve is an economy model (residents, jobs, tax table, external market). Frankendom's rulings give no such model. Only the shape transfers: a clamped accumulator per zone type, a cap flag, and a sampled roll. The economy numbers (600, 0.02, 1.3, 3.7, the tax table) must not be copied as spawn rules.
- Authority: the donor rolls with `Math.random`-backed helpers in one process. Frankendom must roll on the server and log the chosen spawn or despawn in its one ledger.
- Lag: the valve reads the census 
checker: -

### id-Software-DOOM (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW015/out/zones-world/id-Software-DOOM.deep.md
best_idea: A bounded FIFO respawn queue of spawn points with a removal timestamp, that respawns at most one entry per tick and only once the oldest has waited long enough.
decision: adapt - Respawn of removed spawn points through a bounded queue, one per tick, fits zone population respawn. The donor's deathmatch-only gate, its unchecked item spawn and its table roll do not fit: Frankendom needs an occupancy check, a ledger record for drops and a seeded server RNG.
acceptance: A server test: removing 130 pickups in a zone leaves 127 queued and logs the three drops; the first respawn comes no earlier than the zone's delay after the oldest removal; no tick respawns more than one pickup; a respawn onto an occupied spawn point is deferred, not dropped.
tags: respawn-queue,population-cap,wait-gate,fixed-step,new:corpse-respawn-roll,new:difficulty-tier-bits
gaps/risks(excerpt): - Licence unclear. The headers say DOOM Source Code License, the README and LICENSE.TXT say GPL-2.0. Clean-room, shape only; do not copy lines or constants as code. The timing constants are game numbers (30 s, 12 s), not copyrighted expression.
- No occupancy check on items. The code read has no spawn-spot check in `P_RespawnSpecials` (578-631). A pickup can reappear on a player's feet. Frankendom must check the spot or defer the item.
- Corpses wait on an occupied spot without limit. A player standing on the spawn point holds the monster dead indefinitely. Frankendom needs a timeout or relocation rule, and the test must cover it.
- Silent drops. When more than 127 pickups are pending, the o
checker: -

### id-Software-Quake-2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW016/out/zones-world/id-Software-Quake-2.deep.md
best_idea: Save a zone's live entities when the player leaves, and overlay them on the zone's fresh baseline when it is entered again, so kills stay dead, while all saves are dropped at a unit boundary.
decision: adapt - Keep the save-on-exit, build-baseline-then-overlay and unit-wipe shape with the server writing a typed snapshot; reject the binary edict dump and the abort-on-bad-file load, which do not fit server-verified kills or the one ledger.
acceptance: Server test: a player kills 3 of 5 mobs in zone A and leaves; on re-entry the 3 stay dead and the 2 living mobs are where they were; the player is placed at a spawn point, not in an old body; a deathmatch-style zone ignores its snapshot and respawns its baseline; a map name starting with * drops all saved zones.
tags: new:zone-state-snapshot,new:restore-on-reenter,new:unit-wipe,stale-state
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- The save is a binary dump of the whole edict array with pointer fix-ups and a function-pointer base check (`ctf/g_save.c` 617-622, 680-693). Reject the format. Keep the shape: a typed snapshot of in-use zone entities, written by the server.
- A layout change or a bad file makes the donor abort (`gi.error` at 668-669, 684 and 692) rather than fall back to the baseline. Frankendom must choose a schema version and a fallback, so a bad snapshot never blocks a player entering a zone.
- The donor writes the snapshot to a local file under `save/current`. Frankend
checker: -

### id-Software-Quake (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW016/out/zones-world/id-Software-Quake.deep.md
best_idea: On a zone exit, snapshot each character once (clamped, a dead character gets the default kit), defer the move past the touch, then restore on arrival from one server-side record.
decision: adapt - The shape (fire-once exit with a short defer, minimum intermission wait, clamped carry snapshot, default kit for the dead, restore on arrival) fits zones-as-data and the one-ledger rule; the 16 untyped parm slots and the serverflags bit field do not, so the snapshot should be one typed record written by the server.
acceptance: Server test: a character with 250 health and an active quad timer leaves zone A; on arrival in zone B health is 100, no quad or key items remain and shells are at least 25; a character who died before the exit arrives with the default kit; a second touch on the same exit within the defer window produces one transition.
tags: wait-gate,new:zone-exit-carry,new:deferred-commit,new:death-resets-kit
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- The carry is 16 untyped float slots (`NUM_SPAWN_PARMS`), and the cross-level flags are a bit field. Both break the one-ledger ruling. Frankendom needs a typed snapshot on the character record, written by the server.
- The health floor of 50 means a player who leaves at 10 health arrives at 50 (75-78). This is a donor rule that Frankendom has not ruled on. Keep it as zone data or reject it.
- The 5 s exit wait and the 0.1 s defer are one global value each in this donor. Frankendom may want the wait per zone; the sidecar marks the wait as an engine constant,
checker: -

### ihhub-fheroes2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW016/out/zones-world/ihhub-fheroes2.deep.md
best_idea: Grow a living population by its exact expected rate, using one random draw to pay the fractional part, capped at the zone's limit, and never restart a cleared stack from zero.
decision: adapt - Take the stochastic-rounding growth step and its cap and no-regrow-from-zero guards as a server step for living camps, with the rate and cap as zone data; reject it as a respawn rule, because the donor never refills a killed stack and row 23 respawn and grace timers still need their own design.
acceptance: Server test: over 10,000 growth draws from a camp of 75 members, the mean growth is within 0.1 of 75/7 (about 10.71), no step takes the camp above the zone cap, and a camp at 0 members stays at 0 after any number of ticks.
tags: population-cap,new:proportional-growth,new:stochastic-rounding,new:no-regrow-from-zero
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- Clock: the donor's period is a calendar week of 7 days (`world.h` 69, 398). Frankendom's zones run on a real-time server tick, so the period must be a zone field (for example seconds per growth step), not a copy of the 7-day week.
- Randomness: the growth draw uses `Rand::Get` on the thread's RNG (`maps_tiles_helper.cpp` 1718, `rand.cpp` 99), which is not replayable. Frankendom's fight records and server-verified results need a seeded draw; `Rand::GetWithSeed` exists in `rand.cpp` 102-110 and was not checked further.
- Expected value versus one roll: the m
checker: -

### ioquake-ioq3 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW017/out/zones-world/ioquake-ioq3.deep.md
best_idea: Gate what a client is streamed by reachability over a zone graph: each door edge carries a reference count, the server re-floods the graph on every change, and a client is sent only entities whose zone is connected to its zone.
decision: adapt - Frankendom zones are data on one runtime, so the donor's BSP areas and PVS clusters do not transfer; the reference-counted gate edge graph and server-side send filter give one checkable rule for which zones a player receives. Do not copy the per-entity full scan (sv_snapshot.c:319) or the overflow branch (sv_snapshot.c:396-409).
acceptance: Server test: with the gate between zones A and B shut, a snapshot for a player in A contains no entity whose zone is B; opening the gate adds them in the next snapshot; a second gate on the same edge keeps B visible until both are shut; closing an edge whose count is already 0 throws.
tags: per-player-view,new:zone-portal-gate,new:refcounted-portal-edge,new:spatial-sector-tree
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor's snapshot filter does not use the sector tree. sv_snapshot.c 319 walks every entity for every client on every send. That is fine for a small map and wrong for a zone with many entities. Frankendom should keep a per-zone entity list instead of copying the loop.
- Overflow branch reads as off-by-one (sv_snapshot.c 396-409; not run). After a scan with no visible cluster, `l` ends at lastCluster + 1, so the test at line 403 (`l == lastCluster`) is false and the entity is sent. If the visible cluster is exactly lastCluster, the same test culls it. Also line 397 treats cluster 0 as "no overf
checker: -

### keldaanCommunity-pokemonAutoChess (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW017/out/zones-world/keldaanCommunity-pokemonAutoChess.deep.md
best_idea: Give each zone a weighted spawn table whose leftover mass means nothing spawns, and lock each entry to once per run so that a repeat roll is voided rather than rerolled.
decision: adapt - Frankendom needs a zone population rule with a per-run cap, and a table with explicit empty mass is a cheap, checkable designer knob. Adapt rather than copy: the donor's void-on-repeat lowers the real rate through a run, so Frankendom must publish the effective per-run rate or reroll on purpose.
acceptance: Server test: for a zone table whose entries sum to 0.475, 10,000 seeded rolls give an entry on 47.5 percent of rolls (within 1 point) and none on the rest; after entry X has spawned once, every later roll that picks X returns none, and the run's spawn list holds X once.
tags: population-cap,new:weighted-table-null-mass,new:once-per-run-void
gaps/risks(excerpt): - Licence conflict: the LICENSE file is GPL-3.0 and package.json says BSD-3-Clause. Frankendom should treat it as GPL and write clean-room only.
- Void-not-reroll lowers the real rate through a run. After a stage-4 encounter X has spawned, a later stage-4 pick of X yields nothing, so the effective chance of an encounter falls each time an entry is used up (the arithmetic is in section 3). Frankendom must either publish the effective per-run rate or reroll on purpose, and test whichever it picks.
- The festival switch (mini-game.ts 273, 278) skips both the leftover mass and the lock. A special rule of that kind must be a flag in zone data with its own test, not a silent branch.
- The lock liv
checker: -

### l1j-en-classic (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW017/out/zones-world/l1j-en-classic.deep.md
best_idea: Before a monster appears, pick a point at random in the zone's box (or near a fixed point), refuse any point a player can see, and retry the same spawn after 3 seconds with a new point, with the respawn delay as a fixed minimum plus a uniform whole-second jitter.
decision: adapt - The presence gate and the min-plus-jitter respawn timer fit row 23 directly, but the donor's view test is the client's screen shape and our camera is client-only, so the server must use its own range; the donor's band test and its unchecked fallbacks do not port.
acceptance: Server test: a monster area spawn whose first random point has a player within 13 tiles is retried after 3000 ms and placed only at a point with no player within 13 tiles; with respawn_screen set it is placed at the first passable point even in view; with min 10 and max 20 s, 10,000 draws give delays in [10, 19] s.
tags: presence-gated,population-cap,timer-wheel,new:density-random-round
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The last attempt places the monster without a passability or view check (L1Spawn.java 386, 428-432, 449-467, then 469-473). On a blocked map a monster can end up inside a wall or in view of a player. Frankendom must check the final point and skip or reroll it, and test that case.
- Non-monster spawns never leave the loop (449-467): the passable branch has no break for them, so they always run all 51 attempts and end at the last point, which for an area spawn is the fixed point (428-432). Read, not run. Frankendom must not copy this; area spawns must work for every entity kind.
- The retry is not 
checker: -

### levy-street-world-of-claudecraft (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW018/out/zones-world/levy-street-world-of-claudecraft.deep.md
best_idea: Move zone-to-zone transitions into the server tick as plain data pairs (a trigger radius and a landing per side) that run through one shared teleport recipe, and make a data test prove each landing sits outside its own trigger.
decision: adapt - The donor pairs are 2D and rely on a landing-outside-radius convention the code read does not enforce; Frankendom keeps the data shape and the server-side move, and adds the landing check as a data test instead of copying the convention.
acceptance: A server test loads every zone portal, asserts the landing check for each side, and walks a test player into side A: it arrives at side B's landing in one sim tick, is not moved again on the next tick, and the zone change is logged once.
tags: new:paired-portal-transit,new:landing-clear-of-trigger
gaps/risks(excerpt): - The trigger is 2D (x, z) and ignores y (portals.ts 19-23). A player on a bridge or ledge above a portal trigger would transit. Frankendom needs a height test or a per-portal floor.
- Nothing records that a player has just arrived. The only guard against a bounce is the geometry of the landing, which is a convention (types.ts 4295), so a knockback or a push back into the trigger is not covered by any code read here. Frankendom should enforce it by data test and by a short arrival lock in state.
- The donor's teleport writes a flavour log line and nothing else. There is no ledger entry and no server-verified event for the zone change. Frankendom's one-ledger ruling needs the transit recorded
checker: -

### lincity-ng-lincity-ng (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW018/out/zones-world/lincity-ng-lincity-ng.deep.md
best_idea: Generate a water or boundary feature by a priority-flood walk from a random start to the map edge, sometimes taking the runner-up tile with a weighted chance, then fill the basins it passes through as lakes.
decision: reject - Frankendom zones are authored data on one runtime with server-verified positions; a random carver at runtime would be a second source of truth unless its seed and output were frozen into zone data, and no fight, zone or spawn ruling needs procedural rivers. At most it fits as an offline map-authoring helper, which is not a combat or zone mechanic.
acceptance: Not a play feature. If built as an offline authoring helper, a test runs the carver twice with one seed and gets identical river tiles, and asserts every river ends on a border tile or on an existing river.
tags: new:priority-flood-path,new:runner-up-tie-break,new:border-sink
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch follows the described walk and is not a line-by-line translation.
- Randomness: the donor draws from a shared RNG (`BasicUrbg`), and a seed call exists at init_game.cpp 395 (context not read). Frankendom would need a fixed seed stored in zone data for any reproducibility.
- Empty frontier: the donor calls `edge.top()` after popping, which is undefined on an empty heap (init_game.cpp 660-668). The walk ends at the first border or water tile, so it probably cannot run dry, but I did not prove it.
- Runner-up chance at most 0.5 is from heap order (my reasoning), not a donor comment.
- Lake backtrack changes the terrain height of tiles (init_game.c
checker: -

### openmw (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW018/out/zones-world/openmw.deep.md
best_idea: Recentre the streamed zone block only when the player leaves the current block by half a cell plus a fixed margin, and prefetch around a position predicted one second ahead from last frame's movement, so a player near a border does not reload on every step.
decision: adapt - The hysteresis recentre and the predicted-position prefetch fit a fast browser game where zones are data and the client streams them; the detached-camera anchor does not fit, because the world camera is an attached third-person follow and the anchor only applies to a static, detached camera, and the camera is client-only anyway.
acceptance: Walking a player back and forth across a zone border by a few yards (no crossing) raises no zone-block load event after the first one; a sprint toward a border starts loading the next zone block before the player reaches it; a test asserts both on a fixture zone grid.
tags: hysteresis,new:velocity-lookahead-prefetch,new:snapped-anchor-prefetch
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch follows the described rules; it is not a line-by-line translation.
- Camera: the detached-camera anchor applies only in Static mode (scene.cpp 1151). An attached third-person follow camera gets no anchor from this code. For the owner's world-camera complaint, this mechanism does not help; the lever that does is the predicted position, which uses the player's movement, not the camera.
- The terrain list uses the predicted cell with no hysteresis (scene.cpp 1147-1152), while the real grid uses the hysteresis recentre in `playerMoved` (582-584). Two different centres can exist in one frame; a Frankendom port should pick one.
- The lattice snap is a floor o
checker: -

### otland-forgottenserver (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW019/out/zones-world/otland-forgottenserver.deep.md
best_idea: A zone is a list of spawn points, each holding at most one monster with its own timer, a presence gate that blocks only the points a player is near, and a per-check spawn cap.
decision: adapt - The shape (points with timers, one live monster per point, presence gate, per-check cap) fits row 23, but the donor's global leash radius and missing grace timer do not fit, so the leash radius becomes zone data and a grace timer is added.
acceptance: A server test with a zone of two points at 60 s spawntime: a player within 11 tiles of point A keeps A empty; A spawns at the first zone check after the player has been away for the grace time; no more than rateSpawn spawns happen in one zone check.
tags: director,presence-gated,population-cap,fixed-step,new:leash-overspawn-or-remove
gaps/risks(excerpt): - GPL-2.0: clean-room only. The sketch is written from the mechanism, and no donor line is copied.
- No grace timer. A spawned monster that leaves the leash is removed, or sent home, on the same think (monster.cpp 769-784). Row 23 asks for a grace timer before despawn on empty; the donor has none, so that part is ours to design.
- The leash radius is global in the donor (configmanager.cpp 267). The zone's own `radius` attribute is stored (spawn.cpp 59; spawn.h 54) and used only for NPCs (npc.cpp 431; game.cpp 762). Monsters are not leashed to their zone radius. Frankendom wants the leash radius as zone data, so it must not copy this.
- The respawn clock runs from the last spawn, not from the
checker: -

### pmbstyle-L2Solo (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ZW019/out/zones-world/pmbstyle-L2Solo.deep.md
best_idea: A zone is plain data, a list of axis-aligned boxes with an optional z band and an optional grid-cell tag, resolved by first match in list order, and a hunting spot takes the party-only zone found among its arrival points over its centre's zone.
decision: adapt - The box-and-band zone data and the classify-once step fit our zones-as-data ruling, but the first-match-without-overlap-check rule and the Lineage II cell offsets do not, so overlaps are rejected at load and the grid is ours.
acceptance: A server test: a point inside a box and inside its z band resolves to that zone; a point below the band resolves to none; an area with no box, cell or band never matches; two overlapping zones fail to load; a spot whose arrival point lies in the party-only zone is classed party-only even when its centre is open.
tags: new:zone-box-first-match,new:zone-band-z,new:cell-tag-zone,new:party-only-priority,new:classify-once,new:starter-level-gate
gaps/risks(excerpt): - Apache-2.0: code may be adapted. This sketch is a re-expression, not a copy. The donor root has no NOTICE file.
- Two zone models in one donor. `WorldAreaCatalog.js` uses boxes with first-match order; `TownRespawn.js` uses polygons (`RESPAWN_ZONES`, 66-70) and its own cell-to-group table (`REGION_GROUPS`, 47-63). The cell key is written twice (WorldAreaCatalog.js 163; TownRespawn.js 98-99). Frankendom has one zone runtime, so it should pick one model and not port both.
- First match in list order is the only overlap rule. The donor does not detect overlaps; the only test (`tests/test_town_respawn.js` 10-14) checks that an unconstrained area never matches. Frankendom should reject overlappi
checker: -

### vcmi-vcmi (copyleft, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/ZW019/out/zones-world/vcmi-vcmi.deep.md
best_idea: A reward's guard strength is a two-term hinge curve of the reward value with a per-tier row, the guard is the creature whose AI value fits that strength, and its count is the strength divided by that AI value.
decision: adapt - Keep the strength formula, the candidate-fit rule and the count rule as authoring-time data (the tier row is picked by zone data, the fallback is a named field); reject the generator's random placement and its retry loop, which Frankendom does not need at play time.
acceptance: An authoring test: a pile of value 6000 in a normal zone on a normal map gives strength 5000, a guard is required, the stack amount is 5000 divided by the creature's AI value, jittered to 75 to 125 percent only when the amount is 4 or more, and a pile at or below the tier threshold gets no guard.
tags: new:tier-table-row,new:hinge-strength-curve,new:guard-for-reward,population-cap
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Generation time only. Nothing here caps, respawns or despawns creatures during play. Row 23's runtime rules must come from another donor.
- The curve is a sum of two hinge terms, not a single piecewise function: the slope rises at value1 and again at value2 (ObjectManager.cpp 743-746). Frankendom should write the formula as tested data, not as a picture of a curve.
- The fallback is a hard-coded Azure Dragon (775), although the comment above it says "just pick any available creature" (774). Frankendom should make the fallback a named zone field.
- The jitter does not apply to the fallb
checker: -
