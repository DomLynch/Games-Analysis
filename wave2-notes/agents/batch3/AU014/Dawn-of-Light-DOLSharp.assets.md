# Dawn-of-Light-DOLSharp: asset audit (AU014)

Server emulator for Dark Age of Camelot (DAoC). Best class C: data and art are unclear or game-derived, so inspiration only.

## Licence
- Code: GNU GPL v2. LICENSE is the GPLv2 text (line 2: "Version 2, June 1991"). gplheader.txt is the source-file header, which says the program is under GPL v2 "or (at your option) any later version." (line 7).
- Assets: none stated. The only licence file is the root GPLv2 text, and no file says it covers the language, web UI, XML or navmesh data. Unclear, so class C.
- Pathing/Detour: copyright line only in the files read (Mikko Mononen, 2009-2010, DetourNode.cpp line 2). Licence text not located.

## Rights holder (from repo files)
Unknown. README line 4 calls it "Dawn of Light - Dark Age of Camelot Server Emulator (DOL)". The repo names no owner of the original game data. It carries DAoC-world names and coordinates in its data files.

## Which half was read
SERVER half: GameServer, GameServerScripts, DOLBase, data XML and language text. The CLIENT half is not in this repo. Matching client halves in the box, by folder name only and not opened: BifrostTitan-DAoC-Client-Lib, dol-leodagan-DaocClientLib. Other DAoC server folders: OpenDAoC-OpenDAoC-Core, daochook-daochook.

## Data tables (DATA FIRST)
- GameServerScripts/dbupdater/insert/Zones.xml: zone rows (ID, region, name, water and lava flags). Name "Camelot Hills" at line 7.
- GameServerScripts/dbupdater/insert/Regions.xml and StartupLocation.xml: region and start-point rows (not read beyond names).
- GameServerScripts/quests/Hibernia/BaseAddrirPathPoints.xml: escort route points with X, Y, Z and MaxSpeed. Route name at line 5. Albion has an equivalent file.
- GameServer/language/EN/*.txt (76 files) and the other six language folders (237 files in total): text tables for zones, spells, NPCs, keeps. EN/Zones.txt line 1 holds zone strings. Game text: not reproduced.
- GameServer/config/invalidnames.txt: blocked name segments (line 2).

## Inventory and class
| group | path | count | class |
|---|---|---|---|
| localisation text packs | GameServer/language | 237 files, 7 languages | C |
| web admin UI art | GameServer/webui/template/images | 12 GIFs (banner 8949 bytes, title 1546 bytes sampled) | C |
| world data XML | GameServerScripts/dbupdater/insert | 3 files | C |
| escort path points | GameServerScripts/quests/Hibernia (and Albion) | XML files | C |
| navmesh (binary) | Pathing/Detour/Test/zone078.nav | 1 file, 602560 bytes | C |
| Detour source | Pathing/Detour | about 25 files | C (licence text not read) |
| name filter | GameServer/config/invalidnames.txt | 1 file | C |
| example status page | GameServerScripts/web/OnlineStatusUpdateServerFiles | 2 PHP, 1 TXT | D (code, not art) |

No audio, no 3D models, no sprite sheets in the repo. Pathing README (line 11) says navmeshes come from third-party tools or a third-party download, with some zones missing. Not followed.

## Inspiration (category level; game-derived data, so no instance-level looks)
- Zones as plain rows with ID, region, name and water/lava flags: a clean zone-table design to rebuild with our own zones.
- One navmesh tile set per zone, streamed by distance: suits big maps. Generate ours from our own meshes.
- Escort routes as ordered waypoints, each with its own speed: good authoring format for guards and escorts.
- One folder per language with one text file per system: localisation layout to copy in structure.
- A retro frameset-style status page built from small bordered GIF pieces: keep the nostalgic panel idea, make a cleaner original.
- A name filter that blocks segments: a moderation concept, with our own list.

## Briefs
1. Bordered status panel (ours). Keep: beveled corners, tiled edges, banner strip. Change: our own pixel corners and palette, different layout. Ref: GameServer/webui/template/images/tborder_lt.gif (not viewed).
2. Zone navmesh tile set (ours). Keep: one walkable file per zone, tiles loaded by distance. Change: our own zone shapes, tile size and generator. Ref: Pathing/Detour/Test/zone078.nav (not opened).
3. Escort route with speed per step (ours). Keep: ordered waypoints, per-step speed. Change: our own route names and pacing curve. Ref: GameServerScripts/quests/Hibernia/BaseAddrirPathPoints.xml (line 5 only; coordinates not copied).

All briefs: recreate as a clearly distinct original, never a copy.

## Cross-links (task item 6)
- zones and spawns: Zones.xml and the navmesh are worth a look for structure.
- hud-ui: the bordered web panel is the only visual UI piece.
- camera, loot, vfx, animation, sound: no assets in the server half.

## Not read
GIF bodies; zone078.nav body; language text beyond the EN zone line; Regions.xml and StartupLocation.xml bodies; dbupdater .cs loaders; Detour licence text; web PHP files; Tests/.

Receipts: receipts.tsv (rows for Dawn-of-Light-DOLSharp; verified).
