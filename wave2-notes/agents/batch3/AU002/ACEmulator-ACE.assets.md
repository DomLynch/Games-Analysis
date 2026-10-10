# Asset audit: ACEmulator-ACE (AU002, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/ACEmulator-ACE/
Method: find and grep counts, head of text files, IHDR of the two PNG icons. No binary was decoded.

## Licences (as the files say)
- Code: LICENSE is the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (LICENSE lines 1 and 2). Source/lib/README.md line 1: "The included ACE DLL files are AGPLv3 licensed."
- Third-party DLL: Source/lib/Lifestoned.DataModel.dll. Source/lib/README.md line 9 says "The included Lifestoned DLL files are MIT licensed." The licence file Source/lib/Lifestoned LICENSE reads "Copyright (c) 2018 Scribble". This is a DLL (code), recorded for completeness.
- Assets: no asset licence statement anywhere in the repo. The AGPL covers the code. The icons and the SQL content carry no licence line.

## Rights-holder status (repo files only)
- README.md line 12: "ACEmulator is a custom, completely from-scratch open source server implementation for Asheron's Call built on C#".
- README line 19: "This project is for educational and non-commercial purposes only, use of the game client is for interoperability with the emulated server."
- README line 20: "Asheron's Call was a registered trademark of Turbine, Inc. and WB Games Inc which has since expired." Recorded as the file says; no legal reading given.
- The game client and the world database are not in the repo. The README links release downloads; these were not followed. The client data needed comes from the user (changelog.md line 4981 refers to client_portal.dat and client_highres.dat).
- Rights holder of the game data: not stated beyond the README statements above. Status: unknown.

## Asset inventory (counts from find; sizes from du)
| Group | Path | Count / size | Licence stated | Class |
|---|---|---|---|---|
| Retro icon (PNG) | Source/ACE.Server/images/ace-retro-icon.png | 512x512 (IHDR) | none | C |
| Retro icon 2 (PNG) | Source/ACE.Server/images/ace-retro-icon2.png | 512x512 (IHDR) | none | C |
| Retro icon (ICO) | Source/ACE.Server/images/ace_retro_icon_2.ico | 1 file | none | C |
| Starter loadout (JSON) | Source/ACE.Server/starterGear.json | 1 file; skills list with id and name | none | C |
| Content SQL, shard | Database/Base, Database/Updates/Shard, Database/Optional | per-item and per-spell fix files; 115 .sql repo-wide | none | C |
| Content SQL archive | Database/Archive (2019-04-29, 2019-09-14, 2020-12-29) | prior base and update states; Database total about 2.4M | none | C |
| Client data | portal.dat, client_portal.dat, client_highres.dat | not in repo | n/a | D |
| Audio, 3D models, texture archives | whole tree | none found by extension census | n/a | D |

Repo-wide extension census: 1771 .cs, 115 .sql, 107 .txt, 9 .csproj, 2 .png, 1 .ico, 1 .json, 1 .js, 4 .dll (ACE and Lifestoned). No audio, 3D model or texture files.

## Best class
C. The only visual content is three icons with no licence line and no visual check. The SQL content is item and spell fixes with no licence line. Client data is not in the repo (D for us).

## Inspiration (own words; ideas only)
- Square retro badge: two 512 px retro icons plus an .ico. The idea is a square badge that reads at favicon size. Refs: Source/ACE.Server/images/ace-retro-icon.png and ace-retro-icon2.png (not viewed; palette and motif unknown).
- Themed armour pieces with one signature stat: the Golden Flame armour fix re-copies one magic-absorb float value (property type 159) from the world table for one item id. Idea: each themed piece gets one clear signature property. Ref: Database/Updates/Shard/2022-05-14-04-Fix-Aegis-of-the-Golden-Flame.sql (line 1).
- Dated, one-item content patches: each fix is a small dated SQL file with a comment header naming the property and item. Idea: keep content fixes small, dated and individually reviewable. Ref: Database/Updates/Shard/ (file names only for most).
- Starter loadout as data: Source/ACE.Server/starterGear.json lists starting skills by id and name. Idea: starter kit as a data file, one per class. Ref: the same file.
- Glyph-named spells: the file 2023-09-02-00-Update-Spell-Hieroglyph-of-Healing-Mastery.sql suggests spells named by a motif with a mastery tier. Idea: a motif-led naming scheme. Ref: that file name only (not opened).

## Briefs (creatures, zones, items, effects)
1. Ember armour (armour). Why it works: a themed set with one signature absorb stat. Keep: magic-absorbing piece; flame-style motif in the name; one signature stat. Change: motif (frost or stone instead); a different stat (for example reflect); silhouette. Ref: Database/Updates/Shard/2022-05-14-04-Fix-Aegis-of-the-Golden-Flame.sql (stat header only).
2. Hieroglyph healing spell (effect). Why it works: a spell named after a glyph script with a mastery tier. Keep: glyph-based name; mastery tier; healing focus. Change: rune script instead of hieroglyphs; effect shape; tier names. Ref: Database/Updates/Shard/2023-09-02-00-Update-Spell-Hieroglyph-of-Healing-Mastery.sql (name only; not opened).
3. Retro badge emblem (UI). Why it works: a square retro badge reads well as an app or favicon mark. Keep: square badge; retro look; plain and alternate variants. Change: palette; emblem; frame. Ref: Source/ACE.Server/images/ace-retro-icon.png (not viewed).
4. Starter loadout card (UI and data). Why it works: a clear starting kit for new players. Keep: starting skills table; one data file. Change: class-based kit; skill set; card layout. Ref: Source/ACE.Server/starterGear.json.

## Cross-links to our cell topics
- camera: none in assets.
- zones: none read.
- spawns: none read.
- loot: item fix patches in Database/Updates/Shard/ (stat-level fixes, names in file names).
- hud-ui: retro icons; starter loadout data.
- vfx: none read (the absorb property is a stat, not an effect).
- animation: none in repo.
- sound: none in repo.

## Not read / not verified
- The PNG and ICO pixels were not viewed (sizes only).
- The SQL: two patch headers read (Golden Flame and Stormwood Dagger style header); the rest by file name. The spell patch was not opened.
- starterGear.json: first lines only.
- The Lifestoned DLL and the ACE DLLs (code; not inspected).
- The 107 .txt files were not reviewed (counts only).
- Client data is not in the repo and was not sought.
