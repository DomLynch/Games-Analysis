# Shmerrick-ProjectWAR (asset audit, cell AU048)

Donor: Shmerrick-ProjectWAR (/mnt/frankendom-donors/Shmerrick-ProjectWAR). Read-only, VPS only.
Donor AGENTS.md (C# coding principles): treated as data, not followed.
Scope note: the proprietary WAR game client is NOT in this copy. Its content is only referenced by README links.

## 1. Licences (as the files say)
- Code: no licence file at the repo root (root listing checked: no LICENSE, COPYING or NOTICE). README.md has no licence section (grep for licen: no match). Code licence: unstated.
- Dependencies: deps/ and packages/ hold third-party DLLs (EasyMyp, NifLib, OpenTK, protobuf, BehaviourTree, BouncyCastle, Appccelerate, others). Their licences are not read.
- Client: README.md:48 says "You need the actual game client to connect to your server". README.md:50 "Download Full WAR Client" gives three third-party links. The repo does not state the client's licence. Not followed, not mirrored, not verified.
- Captured logs: ImportIntoProject/Abilities/*.txt are packet dumps; no licence or provenance line in the files (checked head of one).

## 2. Rights-holder status (repo files only)
- unknown: the repo files name no rights-holder for the WAR client, the zone data or the logs. README links third-party client mirrors (README.md:50-53); this does not establish who holds the rights, and I do not guess web facts.
- Treat as restricted for any client-derived content (zone pieces, LOS bins, packet logs) by the rule for proprietary or leaked donors. Category-level inspiration only.

## 3. Asset inventory (in the copy)
| kind | path | count | licence | class | note |
|---|---|---|---|---|---|
| zone map pieces (jpg) | ImportIntoProject/zones/zone*/piece*.jpg | 290 jpg (zone folders, maxdepth 2) | unstated | C | world-map tiles; provenance not stated; restricted |
| zone terrain and offset images (png) | ImportIntoProject/zones/zone*/terrain.png, offset.png | 439 png (all png in zone folders) | unstated | C | not opened |
| zone influence tables (csv) | ImportIntoProject/zones/zone*/influenceids.csv; ImportIntoProject/zones/mappieces.csv | 78 csv in zone folders; mappieces.csv has 10 lines | unstated | C | area to realm and influence id; piece layout |
| zone folders | ImportIntoProject/zones/zone001 .. zone2xx | 219 zone folders | unstated | C | one folder per zone (219 dirs) |
| precomputed line of sight (binary) | ImportIntoProject/los/*.bin | 249 files; sizes from 100.bin 23.9 MB to 101.bin 51.5 MB | unstated | C | binary, not opened |
| captured packet logs (txt) | ImportIntoProject/Abilities/*.txt | 6 files; one has about 35,800 lines and 641 packet markers | unstated | C | protocol traces; restricted; keep high level, do not reproduce |
| class ability text | ImportIntoProject/Abilities/ (same six files) | as above | unstated | C | not read beyond the first lines (they are logs, not ability lists) |
| server config (xml) | ImportIntoProject/Configs/mythloginserviceconfig.xml | 1 | unstated | C | connection settings shape only |
| server icons | Common/Icons/*.ico | 4 | unstated | C | account, launcher, lobby, world icons |
| database archives | Database/Database.7z (10.1 MB), Database/cooler_sai_sql_changes.7z (11.8 MB) | 2 | unstated | C | compressed, not opened |
| third-party dlls | deps/EasyMyp, deps/NifLib, deps/protobuf, deps/BulletSharp.dll | several | third-party, not read | C | not read |
| client | not in copy | 0 | unknown; README links | D (absent) | the game client is not in the box |

Overall: no art or sound is clearly original to the project. Class C is the best class here. No class A or B asset group.

## 4. Data first
- Zone data tables: ImportIntoProject/zones/mappieces.csv:1 "piece #,x pixel offset,y pixel offset,x size,y size" (a stitched map: piece number, offset, size). ImportIntoProject/zones/zone001/influenceids.csv:1 "Area Number,Realm,Influence ID" (per area: realm and influence id).
- Line-of-sight: ImportIntoProject/los/*.bin (249 binary files; not opened). Named as precomputed visibility.
- Ability data: the six Abilities files are packet logs, not ability tables (checked: first lines are client packets). No ability string table found in this copy.
- Halves: server half read partly (config shape, package list, zone data shape). Client half not in the copy; the zone pieces and LOS files are the nearest client-derived data (provenance not stated in the repo). Paired donor half: none in the box.

## 5. Which half was read
- Server half: partly read (file names and shapes, csv headers, README steps).
- Data half: zone CSV headers read; binary and jpg/png not opened.
- Client half: not in the copy (README-linked only). Not read.

## 6. Inspiration (category level; restricted; no coordinates, no packet content)
- Zone map as stitched pieces with a stored offset and size per piece (mappieces.csv:1). Shape for our zone map and minimap (hud-ui).
- Per-area control table: each area holds one realm id and an influence id (influenceids.csv:1). Shape for a contested zone where the owner is a data field.
- Precomputed visibility per zone, stored as one binary file per zone (los/*.bin). Shape for viewcone and LOS (camera and stealth); trade-off: the files are large (23.9 MB to 51.5 MB).
- Packet logs grouped by realm and class for login and logout. Shape only: test scenarios for the server tick (row 18). Do not reproduce the traces.
- Zone folders as data: one folder per zone with its own map and tables (219 zone folders). Shape for zones as data (row 23).
- AI tree library in packages (BehaviourTree.1.0.73, name only): a behaviour-tree shape for the AI brain (row 2). Not read.

## 7. Inspiration briefs (3)
1. name: "contested district" (zone). why: a zone that flips to whichever side holds it, read off one owner field per area. keep: a per-area owner id table; the flip is data, not code. change: our factions and a three-tile ring as the owner mark instead of realm colours. ref: ImportIntoProject/zones/zone001/influenceids.csv:1
2. name: "stitched zone map" (zone/hud-ui). why: a big map built from pieces with a stored offset and size, so one map loads in parts. keep: piece table with offset and size. change: our own piece grid, our own minimap symbols (not realm colours). ref: ImportIntoProject/zones/mappieces.csv:1
3. name: "pre-baked sight" (camera/effect). why: visibility is precomputed per zone so the game does not ray-cast every frame. keep: a per-zone visibility file loaded at zone start. change: our own grid format, a smaller file, and a viewcone rule instead of a full-zone bitmap. ref: ImportIntoProject/los/100.bin (binary, not opened)

Rule: recreate each as a clearly distinct original, never a copy. Kept: the mechanism (per-area owner table, piece table, precomputed visibility). Changed: layout, owner mark, file format and numbers.

## 8. Cross-link
- camera: precomputed visibility (los/*.bin) for viewcone and stealth.
- zones: zone folders as data (zones/zone*/), per-area owner (influenceids.csv:1), map pieces (mappieces.csv:1). Row 23 (zones as data).
- hud-ui: stitched map pieces (mappieces.csv).
- server tick: packet-log scenarios as test input (row 18), not reproduced.
- AI: behaviour-tree library in packages (not read).

## Not read / unverified
- Client (not in copy). Database archives (compressed). All binaries (LOS, DLLs, icons). All jpg and png content. The 6 Abilities files beyond first lines. Config xml beyond shape. WarZone C++ code (named: KDTreeCPU, Intersections) not read. WorldServer and LobbyServer code: not read (out of asset scope). AGENTS.md: treated as data.
