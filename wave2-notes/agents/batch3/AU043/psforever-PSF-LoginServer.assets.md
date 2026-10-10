# psforever-PSF-LoginServer (asset audit, cell AU043)

Donor: /mnt/frankendom-donors/psforever-PSF-LoginServer (VPS, read-only). Halves: login and world server code (src/main/scala, server/) and the data pack (src/main/resources/zonemaps, guid-pools, overrides, db). The game client is not in the box. Paired donor in this batch: none.

## 1. Licences (as the files say)
- Code: GNU GPL v3 (LICENSE.md line 4 'Version 3, 29 June 2007'; README.md line 252 'GNU GPLv3. See LICENSE.md for the full copy.').
- Source headers: '// Copyright (c) 2017 PSForever' (scripts/copyright.sh line 4 defines the header).
- Data (zonemaps, guid-pools, overrides, db): no licence line and no licence file in the repo files read.

## 2. Asset inventory (paths and counts)
- Zone object placements: src/main/resources/zonemaps/map01.json to map15.json, map96 to map99 (about 30,012 object entries; object count by type: locker_cryo 4,373, gr_door_ext 3,361, gr_door_int 2,738, lock_small 2,638, zipline 2,570, order_terminal 1,959, manned_turret 1,205, spawn_tube_door 1,010, respawn_tube 1,010, painbox_radius_continuous 948). Also ugd01 to ugd06 and zpl_ugd01 to zpl_ugd06 (not counted).
- Lattice: zonemaps/lattice.json (22K; 33 keys; pairs of base names per map; intercontinental set; caverns keys). Test copy in src/test/resources/zonemaps.
- Id pools: src/main/resources/guid-pools/ (27 JSON; c1.json start 0, max 937 for 'environment').
- Property overrides: server/src/main/resources/overrides/ (6 .adb.lst files; game_objects0 124 lines).
- Schema and notes: server/src/main/resources/db (18 SQL files), notes/login-server.tex. Not read for content.
- Packet captures: 714 capture files credited in THANKS.md line 16; none in the box (none found by name at maxdepth 4).
- Images: README image links point to external hosts; none in the tree.

## 3. Rights-holder status (repo files only)
Community preservation project. README lines 5-6: "recreated login and world servers for PlanetSide 1" and the aim to "preserve PlanetSide 1's unique gameplay and history". README line 8 says the servers are built for PlanetSide version 3.15.84.0. The data's origin and rights are not stated. Status: unknown for the data; restricted (C). No clean-room statement.

## 4. Best class
C for every data group (zone placements, lattice, id pools, overrides). D for SQL and notes, packet captures (absent) and images (absent). Code: GPL v3, shape only for Frankendom.

## 5. Inspiration notes (own words; category-level for class C)
- Base as a placed-object list: type, position, yaw, id and map id per object (zonemaps/map01.json, first entry). Keep the schema, use our object types.
- Recurring base vocabulary: lockers, terminals, a respawn tube, a turret, a zipline, interior and exterior doors. Repetition makes each base read at a glance.
- Two-tier link graph: a pair list per zone for local links, and a separate list for links between zones (lattice.json; Zones.scala lines 417-420, 749-753, 872). Use for spawn routes and travel.
- Toggled hazard volume: sphere sitting slightly below the surface, an always-on flag that can be off, a small fixed damage that hits health only (GlobalDefinitionsMiscellaneous.scala lines 861-870).
- Respawn point with a fixed delay field: ams_respawn_tube.Delay = 10, with the code comment calling 10 temporary and 1 the default (lines 38-40).
- Overlay overrides: a separate per-item property file laid on top of base definitions (overrides/*.adb.lst). The unit of the numbers is not stated in the file read.
- Id pools per zone: start and max per pool so ids do not collide across zones (guid-pools/c1.json).

### Defects and notes (keep the idea, fix the defect)
- Respawn delay comment says 10 is temporary and the default is 1 (GlobalDefinitionsMiscellaneous.scala line 39 comment). fix: set the delay as zone data, not a hard value.
- Painbox damage is a fixed 2 with DamageRadius 0 and DamageToHealthOnly (lines 866-870). Reading only: the definition has no area radius, so the damage is point-like at the volume (not run). fix: if an area effect is wanted, set a radius; keep health-only as the rule.

## 6. Inspiration briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Each names the trait kept and the trait changed.
1. Respawn pod with a delay. Keep: spawn point as an object with one delay field; a spawn-tube object in the zone. Change: our own pod shape and material; a countdown on the pod; a delay per zone. Ref: GlobalDefinitionsMiscellaneous.scala lines 38-40.
2. Toggled hazard ring. Keep: always-on flag that can be off; sphere below the surface; small fixed damage to health only. Change: ring shape; a pulse light on each tick; our own damage type. Ref: GlobalDefinitionsMiscellaneous.scala lines 861-870.
3. Two-tier base graph. Keep: pair list per zone; separate inter-zone list; data read at load. Change: our zone names; links drawn as road or river; a cost per link. Ref: src/main/resources/zonemaps/lattice.json; Zones.scala lines 417-420.
4. Zipline traversal. Keep: two fixed ends; a fast ride between them. Change: rope bridge or vine; our own ride speed and sound. Ref: src/main/resources/zonemaps/map01.json (grep for zipline; line not checked).

## 7. Cross-link to our cell topics
- zones and spawns: placed-object schema and two-tier lattice (sections 5 and 6, items 1 and 3).
- hud-ui, sound-music, vfx: none read in this donor (no UI, audio or effect assets in the box).
- loot: none read (the override files give item properties only).

## Not read
See not_read in psforever-PSF-LoginServer.assets.json. Main gaps: most of src/main/scala, zone contents beyond map01 and the type counts, the ugd and zpl files, guid pools other than c1, most override lines, SQL and notes.
