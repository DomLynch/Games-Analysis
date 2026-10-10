# Asset audit: CapnBry-excalibar

Donor tree: /mnt/frankendom-donors/CapnBry-excalibar/ (VPS, read-only). Paths below are relative to that folder unless shown absolute. Receipts: receipts.tsv (verified). Machine-readable copy: CapnBry-excalibar.assets.json.

**Best class: B**

## Code licence
GPL v2 for the Excalibur, Odin's Eye and DAOCSkilla components (excalibur/COPYING, odinseye/COPYING, win32/DAOCSkilla/LICENSE.txt, DisplayLicense.pas header). No root-level licence file. win32/Cheyenne says its bundled components may carry their own licences.

## Asset licence
Mixed and unclear. Excalibur maps (excalibur/maps/Maps_Readme.txt): 99.96 percent by Masta Mappa, asks that use of the data gives mention to Masta Mappa. Odin's Eye maps (odinseye/maps/Maps_Readme.txt): mostly by Mapfiend, text says they are released under the GPL. No licence file for PNG skins, fonts, .dat tables or icons. Cheyenne's UndSieBrutus.dll is binary only per its README.

## Rights-holder status
unknown. Repo is a community conversion of Excalibur/Odin's Eye/DaocSkilla tools for Dark Age of Camelot (README). No file states who owns the game geography, zone text or the game data. README describes the radar as using sniffed game network data and says it enabled cheating. Not marked restricted; no _RESTRICTED-NOTE.txt in this folder.

## Asset groups

| kind | path | count/size | licence | class | note |
|---|---|---|---|---|---|
| map data, vector line maps (excalibur) | excalibur/maps/*.map | 608 files (text, comma-separated records: M/P/F/I/A lines with named colours) | Maps_Readme.txt: 99.96 percent by Masta Mappa, asks for mention; 7 named exceptions by others (Battleground, Cursed_Tomb, Tir-na_Nog variants, Undead_Halls, Druid_Barrow) with no licence line | C | Credit condition plus no licence grant for underlying game geography. Conflicts with the Odin's Eye GPL line, so C per the task rule. |
| map data, vector line maps (odinseye) | odinseye/maps/*.map | 44 files | Maps_Readme.txt: created for the most part by Mapfiend; 'released under the GPL'; asks that improvements be uploaded to the author's site | B | Explicit GPL statement in the readme. The readme does not say who owns the underlying game geography, so treat the GPL line as the file's statement only. |
| map index and region tables | excalibur/maps/mapinfo.txt, nmapinfo.txt, reginfo.txt; odinseye/maps/mapinfo.txt; excalibur/utils/mk_regions.dat | about 5 text tables plus one 9 KB .dat (binary, not opened) | none stated | C | Table of map ids, region names and flag columns. Coordinate content not reproduced here. |
| zone description prose | excalibur/maps/OMdesc.txt, odinseye/maps/OMdesc.txt | 201 lines of zone blurbs | none stated; text is game-world prose | C | Sampled only. Not reproduced. Prose belongs to the game world; use only as a structure example. |
| icon sprites, realm-coloured markers | win32/Cheyenne/Cheyenne_exe/skins/*.PNG, ground_target.png | 33 PNG: 21 at 32x32 (alb/hib/mid, 7 colours each), 11 at 64x64 (mob x7, generic x4), plus ground_target.png at 64x64. Sizes read from PNG header only. | none stated; Cheyenne_exe/README.txt says bundled components may carry their own licences | C | Pixel contents not opened. Named by realm (alb, hib, mid) and mob, with colour suffixes. |
| bitmap and texture fonts | win32/Cheyenne/Cheyenne_exe/fonts/arial.fnt, tahoma.fnt; win32/DAOCSkilla/helvetica10.txf, helvetica12.txf | 4 files, 5-7 KB for the .txf files | none stated | C | Font names only read. Typeface licence cannot be read from these files; the task says do not guess. |
| data tables (binary) | win32/DAOCSkilla/RealmRanks.dat (918 bytes), excalibur/utils/mk_regions.dat (9 KB) | 2 files | none stated | C | Binary, not opened beyond size. Game-derived; treat as unclear. |
| bundled binaries and archives | excalibur/editor.jar, odinseye/editor.jar, odinseye/convert.jar, win32/FakeLoginDLL/login.exe, win32/Common/PacketSniff/packet_debug_nt.dll, win32/Cheyenne/shared.zip, win32/Cheyenne/glpng.zip, win32/Cheyenne/libnids-1.16a-win32.zip | about 8 listed binaries and archives (find found 2 exe, 3 jar, 3 zip, 1 dll, 4 so across the tree) | none stated; UndSieBrutus.dll binary only per README | D | Not opened or run. Not usable as content. README says UndSieBrutus.dll is binary only, but the DLL itself was not located in this listing. |
| application icons | win32/Cheyenne/ShareServer/icon1.ico, win32/Cheyenne/Cheyenne/icon1.ico, win32/Cheyenne/CheyenneRadar/icon1.ico, win32/Cheyenne/CheyenneSniffer/icon1.ico, win32/Common/MobsightParse/icon1.ico, win32/PCAPDStream/icon1.ico | 6 .ico | none stated | C | Not opened. |
| Qt UI form files (text) | excalibur/*.ui, odinseye/*.ui | about 5 .ui (Qt Designer XML) | none stated | D | Layout files for code, no art. Not read. |

## Inspiration (own words, recreate from scratch)

- Faction read from colour family plus a size tier: one small badge set and one larger set for boss-type mobs, so the faction and the threat level both read at a glance on a radar.
- Layered vector maps: each map layer is drawn as thin coloured line strokes with a named colour per layer. A simple layer-colour legend lets a player read terrain, walls and paths without any filled art.
- Ground-target marker: a single 64x64 ring with a clear centre, used for ground-targeted area effects. Simple shape language that scales well.
- Small bitmap fonts in two sizes for chat and labels: crisp at phone size and cheap to draw in a HUD.
- Region table with flag columns (housing, tutorial, instance, water): one row per region with boolean-style flags. Good model for our own zone metadata.
- Realm and mob naming lets the art pipeline generate a whole colour family from one base icon.
- Zone blurbs are short, one per region, and tied to level bands. Structure is worth copying; the prose is not.

## Inspiration briefs

### Faction-tier radar badge
- **Why it works:** A compact badge that reads faction by colour family and threat by size, so a radar full of dots stays legible.
- **Traits worth keeping:** small hard-edged badge; one colour family per faction; larger tier for boss-type targets
- **Traits to change:** use our own faction palette, plus a shape code so colourblind players can tell factions apart; rank shown as a ring count, not a colour variant; distinct glyph per role rather than per colour
- **Reference:** win32/Cheyenne/Cheyenne_exe/skins/alb_red.PNG (32x32), mid_red.PNG, mob_red.PNG (64x64): header dims only, pixels not opened

### Layered line-map style
- **Why it works:** Thin coloured strokes per layer on a dark ground read like a field map and stay light on the GPU.
- **Traits worth keeping:** layer-coloured line strokes; fixed legend with one colour per layer; outlines simplified before drawing
- **Traits to change:** tie layers to our biome types, not line colours; draw walls as hatched shapes instead of plain lines; add elevation shading as a second pass
- **Reference:** excalibur/maps/Battleground.map (record format only; no coordinates reused)

### Ground-target ring
- **Why it works:** A minimal ring marks an area of effect without hiding the ground under it.
- **Traits worth keeping:** thin single-colour ring; clear centre; one asset at a single size
- **Traits to change:** add a slow pulse or dashed segments; match our spell-shape language (hex, rune ring); tint by effect school
- **Reference:** win32/Cheyenne/Cheyenne_exe/skins/ground_target.png (64x64, header dims only)

### Two-size HUD bitmap font
- **Why it works:** A pixel-clean font in two sizes keeps labels and chat sharp on a phone screen.
- **Traits worth keeping:** two sizes only; bitmap, not scaled vector; tight spacing for chat lines
- **Traits to change:** design our own pixel font, not a named commercial typeface; larger minimum size for touch; add a bold cut for names
- **Reference:** win32/Cheyenne/Cheyenne_exe/fonts/arial.fnt (font name only read)

### Zone flag table
- **Why it works:** A flat table with a flag per zone (instance, housing, water) makes zone rules data-driven.
- **Traits worth keeping:** one row per zone; boolean-style flags; numeric id plus readable name
- **Traits to change:** flags as named fields in our schema, not columns of 0 and 1; our own zone set and names; add spawn-density and loot-tier fields
- **Reference:** excalibur/maps/reginfo.txt (table read, flags only; no coordinates)

## Cross-link to our cell topics
Camera: none read. Zones: the region flag table (excalibur/maps/reginfo.txt) and the layered map style. Spawns and loot: monster location data is mentioned in the README only; no data files read. HUD-UI: radar badges, ground-target ring, bitmap fonts. VFX: ground-target ring only. Animation: none (static PNGs). Sound: none in repo.

## Not read or not verified

- All .map files beyond the first lines of Battleground.map and reginfo.txt (formats sampled, not reviewed one by one)
- OMdesc.txt prose (sampled only; not reproduced)
- All PNG and .PNG pixel content (dims read from header only, not opened)
- All .fnt and .txf font files (names only)
- All .dat and .jar binaries (sizes only, not opened)
- win32/DAOCSkilla and win32/Cheyenne source trees (not inspected beyond licence/readme lines)
- All .ico files
