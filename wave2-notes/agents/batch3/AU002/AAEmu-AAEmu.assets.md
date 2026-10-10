# Asset audit: AAEmu-AAEmu (AU002, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/AAEmu-AAEmu/
Method: find and grep counts, head of text files, IHDR of one PNG. No binary was decoded.

## Licences (as the files say)
- Code, conflicting in the repo:
  - README.md lines 33 to 46, "Licensing information": "it under the terms of the GNU Lesser General Public License as published by" and "the Free Software Foundation, either version 3 of the License".
  - LICENSE.GPL is the GNU GPL Version 3 text ("Version 3, 29 June 2007").
  - LICENSE.MIT is an MIT licence, "Copyright (c) 2019 Rain0Ash".
  - The repo does not say which licence covers which code. Recorded as conflicting, so class C for any use of code. (Code is out of scope; the note is for the licence picture.)
- Assets, with explicit attribution pages in AAEmu.Login/Resources/:
  - 6_key_copy.html: Yusuf Önaldı, "https://creativecommons.org/licenses/by-sa/4.0" with the text "CC BY-SA 4.0", via Wikimedia Commons. This is CC BY-SA 4.0 as the file says.
  - Globe_icon_(the_Noun_Project_30701).html: Chris Kerr, from The Noun Project, "https://creativecommons.org/licenses/by/3.0/us/deed.en" with the text "CC BY 3.0 US", via Wikimedia Commons.
- Other icons (icon_login.png/.ico, icons.xcf, icon_game.png/.ico) and the WorldConverter example PNGs have no licence line in the repo.
- Game client files and compact.sqlite3 are not in the repo. Docs/wiki/Client.md says the client data "is also needed for server configuration" and lists download links. AGENTS.md says "Do not commit client packs, launcher binaries, compact.sqlite3, or secrets."

## Rights-holder status (repo files only)
- README line 48: "AAEmu/AAEmu are not affiliated with XLGames. All brands and trademarks belong to their respective owners."
- So this is an unofficial server. The repo does not state who holds rights in the game data or the client. Rights for client files: unknown.
- Download links to third-party hosts in Docs/wiki/Client.md were NOT followed. The repo does not say whether those hosts are authorised.

## Asset inventory (counts from find)
| Group | Path | Count | Licence stated | Class |
|---|---|---|---|---|
| Login icons (SVG) | AAEmu.Login/Resources/6_key_copy.svg (+ .html) | 1 SVG plus attribution page | CC BY-SA 4.0 (attribution page) | B |
| Login icon (SVG) | AAEmu.Login/Resources/Globe_icon_(the_Noun_Project_30701).svg (+ .html) | 1 SVG plus attribution page | CC BY 3.0 US (attribution page) | B |
| Login icons (PNG, ICO, GIMP) | AAEmu.Login/Resources/icon_login.png (256x256), icon_login.ico, icons.xcf | 3 files | none stated | C |
| Game icons | AAEmu.Game/Resources/icon_game.png, icon_game.ico | 2 files | none stated | C |
| Heightmap examples | Tools/WorldConverter/doc/Example Gimp Export 1.png, 2.png | 2 PNG | none stated | C |
| Game data (JSON and XML) | AAEmu.Game/Data/ (Creatures.xml, Doodads.xml, CharTemplates.json, Portal/*.json, Worlds/*) and Configurations/*.json | 67 .json repo-wide; 18 world folders | none stated | C |
| Database SQL | SQL/aaemu_game.sql, SQL/updates/, SQL/examples/, SQL/patches/ | 75 .sql repo-wide | none stated | C |
| Client models, geodata, textures, audio | not in repo (game_pak, per Docs and AGENTS.md) | 0 | n/a | D |
| Game templates | compact.sqlite3 (required by AGENTS.md) | not in repo | n/a | D |

Repo-wide extension census: 2737 .cs, 75 .sql, 67 .json, 41 .md, 13 .path, 9 .csproj, 6 .yml, 4 .png, 2 .svg, 2 .ico, 1 .xcf. No audio, model or texture archive.

## Best class
B, for the two icons with attribution pages (CC BY-SA 4.0 for the key icon; CC BY 3.0 US for the globe icon). Conditions as the files state them: attribution for both; share-alike for the key icon. Game data and client files are C and D.

## Inspiration (own words; recreate, do not copy the icons)
- Login glyph pair: a dotted globe and a key read as "world plus account" at a glance. Recreate the pairing with our own drawings. Refs: AAEmu.Login/Resources/Globe_icon_(the_Noun_Project_30701).svg; 6_key_copy.svg (CC BY-SA; inspiration only).
- Dotted-globe construction: the globe SVG starts with small circles placed around a ring plus an outline path. Simple vector icons of this kind scale well. Ref: the same globe SVG (first lines only; no colour attribute seen there).
- Easy and normal instance pairs: several dungeons ship a second, easier folder with its own spawn files (instance_nachashgar and instance_nachashgar_easy; instance_immortal_isle and instance_immortal_isle_easy). Idea: one map, two spawn sets. Ref: AAEmu.Game/Data/Worlds/instance_nachashgar_easy/.
- Multi-part instances: instance_howling_abyss and instance_howling_abyss_2 each carry their own npc, doodad and slave spawn files. Idea: a second run of an instance with its own spawn tables. Ref: AAEmu.Game/Data/Worlds/instance_howling_abyss_2/.
- Terrain from 16-bit grey images: WorldConverter exports a 16-bit grayscale raw height file that GIMP or Unity can open. Idea: paint terrain as a 16-bit grey image and convert it to height. Ref: Tools/WorldConverter/README.MD.
- Fast travel and respawn as data tables: Data/Portal/ holds worldgates.json, recalls.json and respawns.json. Idea: travel and respawn points defined as data, separate from code. Ref: AAEmu.Game/Data/Portal/.
- Spawns split from geometry: each world folder keeps its spawn files apart from map data (main_world/ has doodad, npc, slave, transfer and gimmick spawn files). Idea: designers re-tune zones without touching geometry. Ref: AAEmu.Game/Data/Worlds/main_world/.

## Briefs (creatures, zones, items, effects)
1. Dotted globe (UI glyph). Why it works: reads as "world or server" at small size. Keep: ring of dots; single colour; simple outline. Change: dot density; latitude lines instead of a ring; an orbit ring. Ref: AAEmu.Login/Resources/Globe_icon_(the_Noun_Project_30701).svg (CC BY 3.0 US; recreate, do not copy).
2. Key-and-globe login card (UI). Why it works: two glyphs mean account plus world. Keep: two-glyph card; one colour; the pairing. Change: swap the key for a lock or rune; icon size; layout. Ref: AAEmu.Login/Resources/6_key_copy.svg (CC BY-SA; inspiration only).
3. Easy-and-normal instance pair (zone). Why it works: one map, two difficulty tiers. Keep: same map with two spawn sets; the easy variant as its own spawn file. Change: layout; boss mechanics; theme. Ref: AAEmu.Game/Data/Worlds/instance_nachashgar_easy/ and instance_nachashgar/.
4. Two-part abyss instance (zone). Why it works: a second run of an instance with fresh spawns. Keep: two-part instance; separate npc, doodad and slave spawn files. Change: theme; layout; enemy set. Ref: AAEmu.Game/Data/Worlds/instance_howling_abyss_2/.
5. Ridged terrain from height images (zone and terrain). Why it works: a 16-bit grey height image is easy to hand-paint. Keep: 16-bit height images; export to a paint tool. Change: biome palette; height scale. Ref: Tools/WorldConverter/README.MD.

## Cross-links to our cell topics
- camera: none in assets.
- zones: instance and world folders (18 worlds), heightmap pipeline.
- spawns: per-world npc, doodad, slave and transfer spawn JSON files.
- loot: none read.
- hud-ui: login glyphs and game icons.
- vfx: none read.
- animation: none in repo.
- sound: none in repo.

## Not read / not verified
- The PNG and ICO pixels were not viewed (sizes and names only, except icon_login.png 256x256 from IHDR).
- SVG content: head of the globe SVG only; key SVG not read beyond its header.
- Game JSON and XML: names and structure only; no content reproduced.
- SQL: not opened (names and counts only).
- Download links in Docs/wiki/Client.md: not followed.
- The attribution HTML pages were read by grep for the licence line only.
- Unexpected: the licence conflict in the code (README says LGPL v3; LICENSE.GPL is GPL v3; LICENSE.MIT is MIT). See Licences.
