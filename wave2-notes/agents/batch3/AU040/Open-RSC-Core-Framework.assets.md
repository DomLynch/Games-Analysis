# Open-RSC-Core-Framework (asset audit, AU040)

Donor: /mnt/frankendom-donors/Open-RSC-Core-Framework/ (VPS, read only)
Halves: both are in the box. Server half = server/conf/server/defs (definitions) and server/conf/server/data/maps (map packs). Client half = Client_Base/Cache (sprite, landscape, audio packs) and Client_Base/src (Java, one line checked). The server Java code (server/src, server/plugins) was not read.

## Licence
- Code: GNU AGPL-3.0 (LICENSE line 1).
- Assets: no asset licence in the box. The repo-wide AGPL is the only statement found; it does not say whether it covers the packs, definitions, maps or sounds. All asset groups are class C.

## Rights-holder status (from files only)
Reverse-engineered RuneScape Classic replica. README line 15: "black box reverse engineering" of the original RSC, which the README says closed in 2018. README line 76: based on earlier RSC replication and private server projects. Whether the packs came from original game files or were re-created is not stated. Rights holder unknown from the files.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Client sprite and landscape packs (binary) | Client_Base/Cache/video/ (Authentic_*, Custom_*, models, library, spritepacks/Menus.osar) | 7 files | C |
| Sound cues | Client_Base/Cache/audio/ (37 wav + sounds.mem) | 38 files | C |
| NPC definitions (JSON) | server/conf/server/defs/NpcDefs.json (794), NpcDefsCustom.json (42) | 836 entries | C |
| Item definitions (JSON) | defs/ItemDefs.json (1290), ItemDefsCustom.json (303) | 1593 entries | C |
| Object and door definitions (XML) | defs/GameObjectDef.xml, DoorDef.xml | 2 files | C |
| Placement data (JSON) | defs/locs/ (SceneryLocs 2.2 MB, NpcLocs, GroundItems, variants) | about 20 files | C |
| Map and region packs (binary) | server/conf/server/data/maps/ (land*.jag, content*) | about 12 files, 2.2 MB | C |
| Combat task ladder (JSON) | defs/extras/CombatOdyssey.json | 14 tiers, 101 tasks | C |
| Launcher icons (PNG) | Client_Base/src/res/ | 5 files | C |
| Text tables | server/conf/server/languages/ | 9 files, 146 lines | C |
| Database SQL | server/database/mysql/ (core.sql table list only) | many | C |

## Inspiration (own words)
- Look by slot: each NPC points to up to nine sprite slots and creatures can share one (NpcDefs.json line 18621, sprites1 165 for id 477). Recreate a look as a slot plus palette swap.
- Rare top tier: the top six by combat level carry respawns of 30 to 75 seconds and four of six are aggressive. Recreate our brute as a capped, grace-timed spawn with its own silhouette.
- Kill ladder: 14 tiers and 101 tasks, each a group of NPCs with a kill count (defs/extras/CombatOdyssey.json lines 4 to 9). Recreate as a zone ladder with a visible count.
- Paired hit sounds: combat1a/1b, combat2a/2b, combat3a/3b (Client_Base/Cache/audio). Two variants per tier reduce repeats.
- Custom art band: the client branches on animation id 230 and up when custom sprites are on (Client_Base/src/orsc/mudclient.java line 6362). Keep added art in its own id range.
- Placement as data: NpcLocs, SceneryLocs and GroundItems hold where things sit. Use the same idea for walk density.

## Briefs
- Tier-top brute: keep the rarity from respawn time and the aggressive default; change the silhouette and palette, and gate the spawn with a zone grace timer. Ref NpcDefs.json lines 18606 and 18621 (not visually opened).
- Hit-pair sound variants: keep a/b pairs per hit tier; change the impact tail per weapon class. Ref Client_Base/Cache/audio/combat1a.wav (name only).
- Zone kill ladder: keep 14 tiers with groups and counts; change to per-zone, per-biome steps with one boss. Ref defs/extras/CombatOdyssey.json lines 4 to 9.
- Custom art id band: keep a separate id range; change to a per-pack range set in data. Ref mudclient.java line 6362 (condition only).

## Cross-links to topics
- spawns: NpcLocs and SceneryLocs as walk-density data; respawn fields in NpcDefs.json.
- loot: ItemDefs.json fields and server/src/com/openrsc/server/content/DropTable.java (code not read).
- sound: the combat hit pairs and the death, victory, underattack cues.
- hud-ui: client sprite packs (binary, not opened).

## Not read
Binary packs and maps (names and sizes only); WAV cues not played; most JSON entries (counts and sampled fields); CombatOdyssey dialogue arrays; server/src and server/plugins code; launcher icons; third-party folders (Portable_Windows JDK/Ant/HeidiSQL, PC_Launcher licence files).
