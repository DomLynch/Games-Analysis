# OpenXcom-OpenXcom (assets, AU041)

Donor: OpenXcom-OpenXcom (VPS: /mnt/frankendom-donors/OpenXcom-OpenXcom/)
Code licence: GPL. LICENSE.txt is GPL v3 (LICENSE.txt:2); install/debian/copyright says "License: GPL-3.0+" (line 8). Modified SDL_gfx code is LGPL with permission (README.md:13).
Asset licence: mixed. (a) Weapon artwork in two folders is CC BY-SA 4.0 (license.txt in xcom1 and xcom2 Weapons folders). (b) The original X-COM sprites, maps, units and sounds are NOT in the repo; the README and the UFO/TFTD READMEs say the user copies them from their own copy of the game (README.md:17, bin/UFO/README.txt, bin/TFTD/README.txt). (c) Other PNGs (UI, fonts, bullets, Pathfinding, icon) have no per-file licence line in the files read: unclear, so class C.
Rights-holder status: open-source clone of X-COM (README.md:6-8). The files name Microprose as author of the original game (bin/standard/xcom2/metadata.yml:7). Current owner of the original not stated in the files (unknown). Clean-room claim: not stated. Original data is needed to run, so the repo itself holds no original data (per README).
Best class: B (CC BY-SA 4.0 weapon art and GPL code/data in repo). Everything from original X-COM data is class C or not present.
Half read: this donor is a full game engine (src/) plus YAML data (bin/standard/xcom1 and xcom2 rulesets). I read the data tables first, then one reaction-fire path and one damage line. Server/client split: not applicable (single client). Paired donor in the box: not checked.

## 1. Licence files (what they say)
- LICENSE.txt:2: "Version 3, 29 June 2007" (GPL v3 text).
- README.md:8: "by Microprose, licensed under the GPL and written in C++ / SDL."
- README.md:13: "Uses modified code from SDL_gfx (LGPL) with permission from author."
- README.md:17: "OpenXcom requires a vanilla copy of the X-COM resources" (from either or both games).
- install/debian/copyright:6 and 8: Copyright 2009 Daniel Filipe (SupSuper) and Others; License GPL-3.0+.
- bin/standard/xcom2/metadata.yml:6-7: description "The original X-Com: Terror From the Deep"; author Microprose.
- bin/standard/xcom2/Resources/Weapons/license.txt:1 and 4: "Artwork (c) Riccardo Gasperi"; CC BY-SA 4.0 International.
- bin/standard/xcom1/Resources/Weapons/license.txt:1 and 4: "Artwork (c) Niklas Jansson (http://androidarts.com/) and Riccardo Gasperi"; CC BY-SA 4.0 International.
- Shader headers in bin/common/Shaders/*.shader: mixed (see section 2).

## 2. Asset inventory (real paths)
| Group | Path | Count / size | Licence (as the file says) | Class |
|---|---|---|---|---|
| Weapon art, TFTD set | bin/standard/xcom2/Resources/Weapons/Terror.png | 1 PNG, 288 x 48 px (IHDR) | CC BY-SA 4.0 (license.txt) | B |
| Weapon art, UFO set | bin/standard/xcom1/Resources/Weapons/Terror.png, Zombie.png | 2 PNG, sizes not read | CC BY-SA 4.0 (license.txt) | B |
| Projectile strips, TFTD | bin/standard/xcom2/Resources/BulletSprites/TFTD-LAND.png, TFTD-UNDERWATER.png | 2 PNG, 110 x 33 px each | no per-file line; folder has no licence file (unclear) | C |
| Projectile strip, UFO | bin/standard/xcom1/Resources/BulletSprites/BulletSprites.png | 1 PNG, size not read | no per-file line (unclear) | C |
| UI sprites, TFTD | bin/standard/xcom2/Resources/UI/ (invcopy, invpaste, globe_tftd etc.) | 5 PNG; 32 x 22 px and 27 x 3 px (globe) | no per-file line (unclear) | C |
| UI sprites, UFO | bin/standard/xcom1/Resources/UI/ | 7 PNG (invcopy, invpaste, reserve, kneelButton, globe_ufo) | no per-file line (unclear) | C |
| Missing-part placeholder | bin/standard/xcom2/Resources/Sprite/missing_arm.png | 1 PNG, 32 x 40 px | no per-file line (unclear) | C |
| Fonts (bitmap + data) | common/Language/Font.dat (127 KB), FontBig/FontSmall/FontGeo*.png incl. ko/jp/zh-TW variants | one .dat plus a PNG font sheet per size and language (count not taken) | no per-file line (unclear) | C |
| Engine icon | common/openxcom.png, res/ (openxcom_wide, block, mac, windows, linux icons) | 11 files in res/, 268 KB | no per-file line (unclear) | C |
| Pathfinding sprite | common/Resources/Pathfinding/Pathfinding.png | 1 PNG | no per-file line (unclear) | C |
| Shaders (screen filters) | bin/common/Shaders/*.OpenGL.shader | 24 files, GLSL | per file: GPL (e.g. CRT.OpenGL.shader:7), public domain (CRT-Lottes.OpenGL.shader:2; dot_n_bloom.OpenGL.shader:4; Phosphor-simple), others no line found | B (GPL and PD ones), C (no line) |
| Unit stats (YAML) | bin/standard/xcom2/units.rul (34 unit types), bin/standard/xcom1/units.rul | 34 rows in TFTD set; stat block of 11 fields | GPL (code repo) | B |
| Armour table (YAML) | bin/standard/xcom2/armors.rul (24 armour rows) | front/side/rear/under armour values and a 10-entry damage modifier list per armour | GPL (code repo); sprite refs point to original .PCK files (armors.rul:3) | B for values; sprite refs need originals (C) |
| Soldier name lists (YAML) | common/SoldierName/*.nam | 34 files by nationality, weighted look groups (German.nam etc.) | GPL (code repo); no name-list origin stated | B |
| String tables | bin/standard/xcom2/Language/en-US.yml, en-GB.yml | 1231 lines each, about 1184 key:value lines (grep count, en-US) | GPL (code repo); lore text is from the original games (UFOpaedia-style entries) | B for file, text itself not reproduced |
| Maps and routes | bin/standard/xcom2/MAPS/*.MAP (2 x 803 bytes), ROUTES/*.RMP (48 and 72 bytes); bin/standard/xcom1 has 2 MAP and 2 RMP | 8 small binaries | not stated in the files; the README says originals are copied in | C (origin not stated) |
| Ruleset YAML (all) | bin/standard and bin/common, 105 .rul files, 49 .yml | 3.1 MB total in bin/ | GPL (code repo) | B |

Sound: no audio files in the box (no .wav, .ogg or .mp3 in bin/). Audio comes only from the user's original game (README).

Not read: any PNG pixel content, Font.dat contents, the .PCK sprite files (absent), the .MAP/.RMP binaries beyond sizes, most of the 105 rul files (only units, armors, metadata read), en-GB.yml (line count only), name lists beyond the first lines of Bulgarian.nam and German.nam.

## 3. Rights-holder status (repo files only)
- Repo: open-source GPL project (README.md:6-8, LICENSE.txt, debian/copyright).
- Original data: the files name Microprose as author of the original game (metadata.yml:7). Current rights-holder: not stated in these files.
- Original X-COM resources are required and not included (README.md:17-30; UFO/TFTD README.txt).

## 4. Class by group
- B: weapon art under CC BY-SA 4.0 (share-alike), GPL code and rul/YAML data, GPL shaders and PD shaders.
- C: fonts, UI sprites, projectile strips, icons and other PNGs with no licence line; original-origin maps and routes; sprite refs that need the original .PCK files.
- D: none in this box beyond the absent audio and original sprite sheets.
- Best class: B (CC BY-SA 4.0 weapon art, share-alike condition).

## 5. Inspiration (category level, our own words; no names or text copied)
- Reaction fire is an interrupt chain. When a unit acts, enemies that can see it are asked to shoot first. The code picks the best-scoring reactor, and if that unit cannot react it is dropped and the next is picked, until the acting unit is reached (src/Battlescape/TileEngine.cpp:836-861). Reactions are triggered only by actions of the side whose turn it is (TileEngine.cpp:830-831). Our guard/parry/overwatch rows could use this chain shape, but a fight rule of ours should set the cost and state, not copy the code.
- A reaction costs the same action points as a normal shot and sends a hostile unit into an aggro state (TileEngine.cpp:1055 and 1061). An interrupt that flips the enemy's behaviour is a good tell for the player.
- Damage is scaled by the armour's per-damage-type modifier before anything else (BattleUnit.cpp:1106). Each armour row carries 10 damage-type multipliers (armors.rul:7-10 gives front/side/rear/under; damageModifier list follows). Creature resistances as a damage-type matrix, not a single armour number.
- Armour has four facings (front, side, rear, under). Armour value depends on where the hit comes from (armors.rul:7-10). Good for fight direction in a 3D-lite duel.
- Units have 11 stats plus a rank and race, and two body heights for stand and kneel (units.rul:46-63). The data gives a stand and a kneel height (units.rul:62-63); how the hit logic uses them was not read.
- Weapon and projectile art is kept as strips per environment: an underwater and a land projectile set, same size (110 x 33 px each; bullets folder). Good model for projectile variants by zone.
- Soldier names are generated from weighted look lists per nationality (common/SoldierName/*.nam, weights at Bulgarian.nam:1). Look-weighted name generation for NPC variety.
- Screen filters are a menu of GLSL shaders (scanline, CRT, bloom, pixel scalers). Useful for the colour-grade row (row 16), but use only the public-domain ones.

## 6. Inspiration briefs
See the JSON file, key "briefs" (4 briefs). Rule: each brief recreates a clearly distinct original, never a copy; traits KEPT and CHANGED are listed. Note: the sprite art for the units is not in the box, so briefs are on mechanics and silhouette data only.

## 7. Cross-link to our cell topics
- combat/AI (row 2, 3, 4): reaction-fire interrupt chain (TileEngine.cpp:828-861) is the main transferable shape.
- hit impact/death (rows 8-10, 17): not read.
- loot and gear (row 15, 18): armour rows (armors.rul) and weapon art.
- hud-ui (row 14): string tables (Language/en-US.yml) and icon UI sprites.
- colour grade (row 16): shader folder (bin/common/Shaders).
- zones and spawns (row 23): alienDeployments.rul, mapScripts.rul, MAPS and ROUTES files exist but were not read.
- sound (row 12): no audio in the box.

## Not read
- All PNG pixel content, Font.dat, .MAP/.RMP binaries beyond sizes, alienDeployments.rul, mapScripts.rul, most of the 105 rul files, en-GB.yml, name lists beyond the first lines of Bulgarian.nam and German.nam, src/Battlescape beyond TileEngine.cpp lines 828-861 and 1036-1061, getReactor() scoring (not read).
