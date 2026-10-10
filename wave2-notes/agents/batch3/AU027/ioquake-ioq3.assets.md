# ioquake-ioq3 (asset audit, AU027)

Donor: ioquake-ioq3 (Quake 3 engine, C, cmake). Donor tree: /mnt/frankendom-donors/ioquake-ioq3/ (1048 files: 536 .c, 350 .h, 40 cmake, 30 glsl, 14 txt, 13 png, 5 md, plus misc icons and docs). Tree was read by listing, grep and sed only.

Code licence: GPL-2 (COPYING.txt line 2 "Version 2, June 1991"). Metainfo file: project_license GPL-2.0-or-later (misc/linux/org.ioquake3.ioquake3.metainfo.xml line 6); the same metainfo file marks its own metadata CC0-1.0 (line 5). Exception: docs/id-readme.txt line 14-16 says some code is not under the GPL, naming the zlib-based unzip code (code/qcommon/unzip.c, libs/pak/unzip.cpp). libs/ is not in the box, so only the qcommon file is checkable here (not opened). code/thirdparty/curl-8.15.0 headers carry their own copyright lines; the curl licence text was not read.

Asset licence: split.
- Game data (baseq3 pk3 files: maps, MD3 models, textures, sounds, scripts): NOT in the box. README line 99 says the GPL covers the source "not the game data"; line 104 and 144 say the user supplies the baseq3 pk3 files. Class C.
- Art in the repo (misc/quake3.png, quake3.svg, quake3-tango.png and .xcf, macOS icns and iconset PNGs, DMG background, Windows .ico): the files read give no licence line for them (grep on quake3.svg found no CC or licence metadata). The "tango" name appears only in the .xcf and PNG file names. Licence unclear: class C.
- In-repo text and scripts (ui/hud.txt, hud2.txt, ingame.txt, menus.txt, menudef.h, docs/*.md and *.txt): under the project GPL tree; class B (share-alike condition: GPL-2). Frankendom policy for GPL: shape only.
- Shaders (30 .glsl in code/renderergl2/glsl): code, GPL tree; class B, shape only.

Rights-holder status: id Software copyright lines in code headers (code/game/syn.h line 3, 1999-2005) and the metainfo says the source was first released under GPL by id software on August 20th, 2005 (line 14). Repo says game data is commercial (README line 97-99). Asset owner for game data: not named in the repo files read. Rights status: "original game data (proprietary, not in repo)" plus "id Software GPL source release".

Halves read: engine and game code (code/, ui/, misc/, docs/). Server half: present in the same tree (misc/linux/start_server.sh, server_compile.sh; code/server and code/game are shared), only listed, not read. Data pack: not in the box; not read. Paired donor in the box: none for the data pack.

best_class: B for in-repo GPL text, scripts and shaders; C for game data and icon art of unclear licence. No sound or model files are in the box (none found by extension search).

## Data first (tables that hold names and looks)
- Item table: code/game/bg_misc.c line 44 `bg_itemlist[]` is the real content table, written as C. Each row names the pickup sound, world model, HUD icon, pickup name, quantity, item type and tag. Sound and model paths point at pk3 assets not in the box. Example rows: weapon rows at bg_misc.c 193-337 and 868-884 (weapon_gauntlet to weapon_grapplinghook and weapon_nailgun, weapon_prox_launcher); powerup rows at 521-572 (item_quad, item_enviro, item_haste, item_invis, and more). Entry count: the list runs from armour, health, weapons, ammo, holdables, powerups, persistent powerups, to an end marker. Title strings only; no list copied here.
- HUD: ui/hud.txt and ui/hud2.txt are menu loaders. The full HUD loads ui/hud.menu (hud.txt line 4), the minimal HUD loads ui/min_hud.menu (hud2.txt line 4). Those menu files are in the pk3 set, not in the box.
- Bot chat: code/game/ai_chat.c (1208 lines) and ai_dmq3.c (5490 lines) hold bot logic; the chat templates are pk3 script text, not in the box. Not read beyond line counts.
- Model format: docs/md4-readme.txt describes the MD4 bone skeleton (line 10) and says the MD3 models from id store every vertex per frame (line 5 context). This is the format spec, not assets.

## Inventory (what is actually in the box)
- Code: 536 .c and 350 .h files, plus asm and cmake. Not assets.
- Shaders: 30 .glsl files in renderergl2 (tonemap, shadow fill and mask, point-light shadow, SSAO, bokeh, depth blur, fog, dlight, lightall). Class B, shape only.
- Images: 13 PNG (misc/linux/quake3-tango.png; misc/quake3.png; macOS iconset 10 PNG; macOS DMG background). Pixel size not read (not opened, binary). Licence unclear, class C.
- Vector: misc/quake3.svg (not opened beyond licence grep). Class C.
- Icons: quake3.icns, quake3_flat.icns, ioquake3-folder.icns, quake3.ico (binary, not opened). Class C.
- Text: 14 .txt (incl. 2 CMakeLists; ui menu loaders, docs, asm notes), 5 .md. Class B.
- Sound, music, models, textures, maps, fonts: none in the box. Only referenced by path in bg_misc.c.

## Inspiration (creative notes, our own words; GPL, so shape only, clean-room)
- One pickup gate per item kind: a single function decides whether an item can be taken. Weapons are always taken; ammo is refused at a cap of 200; health is refused only when at max; power-ups are always taken (code/game/bg_misc.c lines 1039-1110). Keep: one shared rule that the client predicts and the server confirms. Change: our gate is server-verified (row 18) and each rule is a data field on the item.
- Item rows that carry the whole look and feel together: name, pickup sound, icon, world model, type (bg_misc.c line 44 onward). Keep: one row per item with icon and pickup cue together. Change: rows point at our catalogue, with a rarity colour and a sound key.
- Floating power-up pickup: the entity header marks it as suspended, i.e. it hovers above the ground (bg_misc.c line 521). Keep: the hover, so it is seen at 375 wide. Change: a ring of light, not a box; a glow colour per power.
- Light-volume shadow: the point-light shadow pass takes a shadow map, a light origin and a light radius (code/renderergl2/glsl/pshadow_fp.glsl lines 1 and 7). Keep: one light, one radius. Change: on a phone we bake a soft disc and cap the lights at two.
- Depth-only occlusion: the SSAO pass needs only the depth buffer and view info (code/renderergl2/glsl/ssao_fp.glsl lines 1 and 3). Keep: cheap darkening in creases. Change: gate it behind the grade quality tier (row 16).
- Two HUD presets chosen by a loaded list: full (ui/hud.txt) and minimal (ui/hud2.txt). Keep: the minimal preset as a switch. Change: our layout keeps bars in the thumb zone at 375 wide, and the preset list is data.
- Bone-driven creature storage: the MD4 note says vertices attach to bones and each frame stores bone positions only (docs/md4-readme.txt line 10). Keep: bone-only frame data for creature clips (row 7). Change: our own rig and bone names.

## Briefs
Rule for all briefs: recreate as a clearly distinct original, never a copy. Top-striking criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance. The box has no creature art and no audio, so the brief set is item, effect and rig ideas from code and shader text.
1. Hovering power-up (our own label): why: a floating pickup is found by eye on a phone. Keep: hover above ground, one pickup cue, a slow spin. Change: ring of light not a box, glow colour per power, label in our HUD. Ref: code/game/bg_misc.c line 521.
2. Light-radius soft shadow (our own label): why: a soft disc under a moving light reads as depth without a full shadow pass. Keep: one light, one radius, fades at the edge. Change: baked soft disc on phones, two lights max, offset to the light direction. Ref: code/renderergl2/glsl/pshadow_fp.glsl lines 1-7.
3. Crease darkening (our own label): why: cheap depth-based contact darkening that makes props sit in the scene. Keep: depth-only input, screen-space pass. Change: tier-gated, a radius in data, off on the low tier. Ref: code/renderergl2/glsl/ssao_fp.glsl lines 1-3.
4. Bone-only creature rig (our own label): why: keeps creature clips small on a phone. Keep: vertices attached to bones, bone positions per frame. Change: our bone names and chain count per creature, not the MD4 layout. Ref: docs/md4-readme.txt line 10.

## Cross-link to our topics
- camera: no camera code read in this donor beyond the renderer pass names; not read.
- hud-ui: the full and minimal HUD presets (ui/hud.txt, ui/hud2.txt) are a reference for row 14 and the touch UX fold-in.
- vfx and grade: the shadow and SSAO passes are references for rows 8 and 16 (quality tiers).
- loot: the pickup gate and item table (bg_misc.c) are references for row 18 and the loot drop ceremony.
- sound: pickup sound keys per item (bg_misc.c line 194). The sound files are not in the box.
- spawns: the item table lists entities that are placed in maps by the pk3 map files; not in the box.

## Not read
- Game data (pk3), maps, models, sounds, textures: not in the box.
- libs/pak/unzip.cpp (named in docs/id-readme.txt line 17 and the libs folder): not in the box.
- code/thirdparty/curl-8.15.0 licence text: not read.
- ui/menus.txt, ui/ingame.txt, ui/menudef.h: listed only.
- code/game/ai_chat.c and ai_dmq3.c: line counts only.
- All binary images (png, icns, ico, xcf, dmg background): not opened; sizes not measured.
- misc/quake3.svg: opened only for the licence grep.
- No sound files or music exist in the box; sound-music fold-in: not verifiable here.
