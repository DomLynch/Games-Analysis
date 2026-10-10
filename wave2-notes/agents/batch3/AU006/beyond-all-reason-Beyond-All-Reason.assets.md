# beyond-all-reason-Beyond-All-Reason (asset audit, AU006)

Donor root (VPS, read-only): /mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/
Scope: RTS game on the Recoil/Spring engine (Lua). Very large asset set: about 5,800 animation frames, 2,046 models, 1,459 sound effects, 105 music files.

## Licences (as the files say)
- Code: LICENSE.md:2 "BAR game code is released under the GPL v2 licence, though individual files can have their own license (specified in wupget:GetInfo)." license_general.txt:2 says the engine requires code under GPL.
- Models and textures: LICENSE.md:6 "Models by Cremuss are released under the CC-BY-SA 4.0 license." LICENSE.md:7 "All other models and textures are under the CC-BY-NC-ND 4.0 license".
- Derivatives: LICENSE.md:9 "This license does not permit any derivative work". license_general.txt:20 says CC-BY-NC-ND content may not be used as a dependency.
- Animations: LICENSE.md:10 "All animations are under CC-BY-NC-ND 4.0 license".
- Per-folder files (all read, first lines):
  - objects3d/Units/license.txt:1: models whose unit "artist" tag is Cremuss are CC-BY-SA 4.0; Beherith, Kaiser, Firestorm, Mr. Bob are CC-BY-NC-ND 4.0.
  - unittextures/license.txt: cor_* textures are CC-BY-NC-ND 4.0 (Beherith); Arm_* textures are CC-BY-SA 4.0 (Cremuss); decals *_aoplane* are CC-BY-NC-ND.
  - unittextures/pilha_crystal_license.txt: pilha_crystal_* files are licensed to Beherith (no licence name given).
  - objects3d/rocks30/licence.txt:3: rock models are "licensed to Beherith (mysterme@gmail.com) under the Royalty-Free Blender Market license".
  - scripts/Raptors/License.txt:1: raptor animation scripts are "License: GNU GPL v2."
  - bitmaps: license_bitmaps.txt says the projectile and UI textures "were made for Beyond All Reason by IceXuick" with "All rights reserved."
  - sounds: license_sounds.txt:1 "Sound effects made for Beyond All Reason. By IceXuick, all rights reserved." Folders from after January 2019 are "All rights reserved" per license_sounds.txt. Raptor folder: "All rights reserved" for sounds made after July 2020 (license_sounds.txt:15). sounds/voice-soundeffects/AllyRequest.wav: "Released under CC0 1.0 Universal" (license_sounds.txt:35).
  - sounds/modbroadcast/license.txt:1: "All sound files here are from: Pixabay", with a copied Pixabay licence summary.
  - music: license_music.txt:1 "Music made for Beyond All Reason (BAR). All Rights Reserved (CC BY NC ND 4.0)", for music/original/*.
  - icons: license_icons.txt: "By IceXuick/Floris/PtaQ, all rights reserved (CC BY NC ND)". unit pictures: license_unitpics.txt, CC BY NC ND.
  - cursors: anims/license.txt:1 "Cursors made for Beyond All Reason. By IceXuick, all rights reserved".
  - luaui/images/lava/license.txt:1: "lava2_* is under CC Zero license"; lava6_* also CC0; lava7_* is "licensed from gametextures.com".
  - luaui/images/raptor_scum/license.txt:1: "The alien_guts_* textures are under the CC Zero license".
  - Fonts: fonts/exo2/OFL.txt:3 "This Font Software is licensed under the SIL Open Font License, Version 1.1."; fonts/OFL-Poppins.txt and fonts/fallbacks/OFL-Noto.txt are also OFL files. fonts/monospaced, fonts/unlisted: no licence file read.
  - luaui/images/Ranks, luarules/images: IceXuick, CC BY NC ND or all rights reserved.

## Rights-holder status (repo files only)
- Community project. Art, sound and music are credited to named makers in the licence files (IceXuick, Floris, PtaQ, Beherith, Cremuss, Rubus, Kaiser, Firestorm, Mr Bob, and about 28 music contributors listed in music/original/credits.txt).
- Some content is third-party and licensed in: Blender Market rock pack (objects3d/rocks30), Pixabay sounds (sounds/modbroadcast), gametextures.com lava (luaui/images/lava/lava7_*), OFL fonts.
- No clean-room or original-company statement in the files. Nothing names an original commercial game as the source.

## Asset inventory (counts from find and du)
| group | path | count | size | licence summary |
|---|---|---|---|---|
| animation frames | anims/ | 5718 files (5537 png) | 36 MB | cursors, all rights reserved |
| bitmaps | bitmaps/ | 227 (158 tga, 36 png, 24 bmp, 9 jpg) | 172 MB | IceXuick, all rights reserved |
| effects | effects/ | 70 lua (raptors/ subfolder of 6) | small | GPL code |
| fonts | fonts/ | 18 (ttf, otf, ttc) | 22 MB | OFL for Exo 2, Poppins, Noto; others not read |
| gamedata | gamedata/ | 27 (26 lua) | 392 KB | GPL code |
| icons | icons/ | 833 png | 6.8 MB | CC BY NC ND |
| music | music/ | 105 (92 ogg, 9 mp3, 4 txt) | 516 MB | CC BY NC ND, all rights reserved |
| 3D models | objects3d/ | 2046 (2038 s3o) | 209 MB | mixed, see per-folder files |
| sidepics | sidepics/ | 4 | 20 KB | not read |
| sounds | sounds/ | 1459 (1440 wav, 15 mp3) | 437 MB | mostly all rights reserved; one CC0 file |
| shaders | shaders/GLSL | 8 | 76 KB | GPL code (not read) |
| units | units/ | 969 lua + 1 py | 5.3 MB | GPL code (unit definitions, not read) |
| language | language/ | 34 json, 1 yml, 1 lua | not measured | not read |

The model folder objects3d/Raptors has 183 entries, including 6 named *_spectre.s3o variants. The folder has no licence file of its own in the listing; the top-level LICENSE.md rule applies.

## Class per group
| group | class | reason (from the file) |
|---|---|---|
| code (lua, GPL) | B | GPL v2; per-file licences can differ |
| Cremuss models and Arm_* textures | B | CC-BY-SA 4.0 (share-alike, attribution) |
| CC0 textures (lava2, lava6, alien_guts) and AllyRequest.wav | A | CC0 1.0 per the file |
| raptor animation scripts | B | GPL v2 per scripts/Raptors/License.txt |
| OFL fonts (Exo 2, Poppins, Noto) | B | OFL 1.1 conditions travel with the font |
| all other models, textures, icons, unit pictures, cursors, bitmaps | C | CC-BY-NC-ND 4.0 (no derivatives) or all rights reserved |
| music | C | CC BY NC ND 4.0 |
| most sounds | C | all rights reserved after 2019 |
| modbroadcast sounds (Pixabay) | C | the file cites a licence summary; not clear for our use |
| rock pack (rocks30) | C | licensed to one author under a Blender Market licence |
| lava7 (gametextures.com) | C | third-party licence, terms not in repo |
| units lua and GLSL | B | GPL code, shape only if clean-room |

best_class: C overall. The only A content is CC0 (a handful of textures and one voice file).

Note on the per-model routing key: LICENSE.md:8 says to look up each unit's author in units/ "having customparam: 'author'". objects3d/Units/license.txt:1 instead names an "artist" tag, and a grep of units/ finds no artist tag (one comment in units/other/ceg_test_projectile.lua:6). The units files carry a model_author field instead (914 units files mention author, e.g. units/armassistdrone.lua:69). So the two licence files use different keys. Per-model licence was not checked in full.

## Inspiration (own words, no copied text)
- Raptor death bursts come in a size ladder: micro, small, medium, large variants of one red burst (effects/raptors/raptorunitexplosion-red.lua:6 starts the micro block; the file header lists small, medium and large). Each tier layers heat clouds and simple particle systems (54 lines in that file contain the word class). Recreate as a 3-layer burst (flash, cloud, droplets) with a tier by unit size.
- Blood as a recolour: the drop textures come in a normal and a "white" version (bitmaps/raptors/ has blood_splat.tga and blood_splat_white.tga, plus blooddrop2 and bloodsplat2 pairs). The raptor effects use the white drops (effects/raptors/raptor-effects.lua:32 uses blooddropwhite), so the colour is set at runtime. This is a good pattern for our wound and blood cell (parity row 8).
- One silhouette, several skins: the raptor folder has base models and *_spectre variants (objects3d/Raptors/raptor2_spectre.s3o and similar). A ghostly second skin makes an elite without a new model. Visuals not read (binary).
- Lava as two maps: the lava sets are named diffuse-emit and normal-height pairs (luaui/images/lava/lava2_diffuseemit.dds, lava2_normalheight.dds), so one map carries glow and another carries bumps. Good for zone materials. Textures not read.
- Cursor and UI frame sets: cursor sets are frame sequences at several sizes (anims/icexuick_75, _100, _133, _166, _200). Each state is a full frame run (for example 64 frames for upgrade-mex). Useful model for an animated target cursor.
- Environment particles by biome: effects include atmospherics.lua, dust_cloud.lua, volcano.lua, lava.lua, lavasplash.lua, watersplashes.lua. Not read beyond names.

## Inspiration briefs
See the JSON "briefs" key (5 briefs).

## Cross-link to our cell topics
- vfx: raptor bursts, blood recolour, spectre skins, lava maps. Strongest match.
- hud-ui: cursor frame sets, rank icons, unit pictures. Licences are CC BY NC ND, so inspiration only.
- sound: sounds/ has many categories (weapons, units, UI, atmos, raptors). Only AllyRequest.wav is CC0. Everything else is class C.
- zones and spawns: scripts/Raptors (animation scripts, GPL) and effects/raptors are the swarm theme. Gadget logic (luarules) not read.
- camera, loot, animation: not read beyond names.

## Not read
- Unit definitions in units/ (969 lua) except by name; the artist-tag check is the only read.
- Most effects (only effects/raptors/raptorunitexplosion-red.lua and raptor-effects.lua were read, in part).
- All binary files: s3o models, tga, dds, png, ogg, mp3, wav. Names and counts only.
- language/ JSON, shaders/GLSL bodies, luaui/ and luarules/ logic, ipynb notebooks.
- The full OFL texts, monospaced and unlisted font licences (none read).
- music/original/credits.txt beyond the first lines.
