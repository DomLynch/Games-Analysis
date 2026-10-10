# kblaschke-Iris2 (asset audit, reader AU028)

Donor/Licence line: code GNU GPL v3 (COPYING lines 5-6). Assets CONFLICTING: COPYING line 1 says the data/models art is GPLv3; README lines 146-147 say there is currently no licence for it. Class C.

Checked: top-level listing, COPYING, README (licence and data sections), AUTHORS, licenses/ list, data/ inventory with find and extension counts, src/data.cpp (asset loader lines 21-30), lua/lib.3d.combat.lua, lua/lib.blendout.lua, lua/lib.corpse.lua, lua/lib.cliloc.lua, compositors/NightVision.compositor (head). Receipts: 89 rows across the four donors, all pass verify_receipts (0 failed).

## Halves
- Client half: READ (src/ loaders, lua/ rendering, UI, data/ art). This is a 2D/3D client for Ultima Online (README line 4).
- Server half: NOT IN THE BOX. The client connects to an Ultima Online shard; config/shards/ holds 9 shard XML lists (names only read). No server source is in the tree.
- Data half: the Ultima Online binary tables (tiledata.mul, art.mul, artidx.mul, gumpart.mul, gumpidx.mul, Cliloc.enu) are NOT in the box. The README says the user needs their own legal copy (README line 8). src/data.cpp lines 21-30 name the files and their load policy.

## Licences (as the files say)
- COPYING line 1: the models and textures in data/models/ are available under GNU GPLv3. Lines 4-6: CODE LICENSE section, GNU General Public License, Version 3, 29 June 2007.
- README lines 146-149: there is currently no license for the models and textures in the data dir; they were created by the iris1 team (line 147); the team is replacing them with art to be made available under a Creative Commons licence such as by-nc-sa 'or something similar' (line 149).
- README line 177: see COPYING for the code licence.
- licenses/: lua.txt, lugre.txt, Ogre3d.html, tinyxml.txt (third-party licence texts; not opened beyond the list).
- lugre/lib/cadune_tree/license.txt: MIT-style permission text (first lines read, receipt line 1).
- Conflict: COPYING and README disagree about data/models. Per the audit rule this is class C.

## Rights holder (from files only)
Iris Team, copyright 2006-2011 (README line 1). Models and textures credited to the iris1 team (README line 147). README line 4 marks 'Ultima Online' with (tm). The files do not say whether the data/models art is converted from Ultima Online art: unknown.

## Asset inventory (find and extension counts; no binary opened)
- 3D meshes: data/models/models/ (folders such as to_008000, files such as mdl_007154.mesh). 2,743 .mesh across data/. Not opened.
- Textures: data/models/textures/ (tex_*.png, tex_armoire_*.png, tex_roof_red_0.png and similar). Across data/: 754 png, 36 dds, 3 tga, 5 bmp, 4 jpg.
- UI art: data/base/ (51 files): guibase.png, compassframe_* (compass, 6 variants), bar.png, aura.png, aura2.png, scroll.png, scrollbar.png, simplebutton.png, menu_bg.jpg, irislogo256x256bw.png, checker.png, stone512.dds. Pixel sizes not read.
- Fonts: data/base/font/ FreeSans.ttf, FreeSerif.ttf, FreeMono.ttf (3 files). Licence text not in box.
- Particles: data/particles/particles/*.particle, 11 files (Wither, MindRot, PoisonStrike, ConsecrateWeapon, healing, rings, Fields, fireballs, Strangle, PainSpike, explosions); data/particles/textures/ 11 images (fireball.tga, explosion.png, skull.png, firesmoke.png and others). Names only.
- Skybox: data/skybox/textures/: about 24 dds in three named sets (cleansky_*, darksun_*, sunset_*) plus skybox_*. Names only.
- Terrain: data/terrain/textures (perlinvolume.dds, water.jpg, watertrans.png, waves2.dds) and data/terrain/multitex masks (png). Names only.
- Compositors (post-process) and shader text: data/compositors/ (7 .compositor: NightVision, RadialBlur, BlackAndWhite, EdgeDetection, Embossed, plus shader .cg, .glsl, .material). This is code text under the repo licence.
- Skinning programs: data/grannys/ (hardwareSkinning.cg, .program, material). Code text.
- Ogre sample media: data/ogreSampleMedia/ (materials, models jaiqua.mesh and knot.mesh, packs/OgreCore.zip). Not opened; no licence text found in the folder by grep for 'licen' in txt/html/md.
- lugre/: third-party libraries; paged_geometry examples contain tree and plant .mesh files (under lugre/lib/paged_geometry/examples/media/); caelum/resources/sphere.mesh. Not opened.
- Audio: none. Find for ogg, wav, mp3, mid across the whole tree returned 0.
- Text: no quest, dialogue, lore or item-name text is in the tree. Item and creature names come from the Ultima Online Cliloc table (lua/lib.cliloc.lua line 18), which is not in the box.

## Class per group
- data/models meshes and textures: C (conflicting licence).
- data/base UI, data/particles, data/skybox, data/terrain: C (no licence text for those folders in the box).
- Compositor, shader and skinning text: B (code under GPL v3, a copyleft condition).
- Fonts: C (licence not in box, not read).
- data/ogreSampleMedia: C (licence not read).
- Ultima Online data files: D for this repo (not shipped; the user supplies them).

## Data first (names and looks)
The names and looks of Ultima Online objects live in the .mul and Cliloc files (src/data.cpp lines 21-30 and 311-312 name them; lua/lib.cliloc.lua lines 3, 9, 18 show the loader). Those are not in the box. The Lua side (lib.cliloc.lua) reads a base string file and an override file; that layering is the transferable part.

## Inspiration (own words; recreate from scratch)
- Floating hit numbers coloured by event: damage shown in yellow, HP loss red, HP gain green, mana blue and smaller, each with its own life span (lib.3d.combat.lua lines 50-100, colour at 53, life 2.5 s at 56, red/green branch at 77). Idea: colour and size tell the event type before the number is read. Change the palette and add an impact pop-in.
- Upper-floor cutaway: anything higher than a set height above the player is hidden when the player is inside (lib.blendout.lua line 6 threshold 18, line 11 entry point). Idea: keep the fight readable inside a building. Change: dissolve only the occluding piece, not the whole structure.
- Death is not 'gone from view': the corpse notes in lib.corpse.lua (comment block after line 11, not receipted) say health bars cannot tell death from leaving the screen. Idea for row 17: death is an explicit server state, never inferred from a missing entity.
- A fullscreen filter per mood: compositors such as NightVision (data/compositors/NightVision.compositor, line 2) draw one fullscreen quad after the scene. Idea for row 16: one state-driven grade pass. Change the colour so it is not green night vision.
- One signature particle per status: data/particles/particles/ has separate sets for mind, poison, wither, pain and strangle effects. Idea for row 13 specials and row 8 wounds: each status gets its own silhouette and motion, not a shared sparkle.
- Sky sets by mood: data/skybox/textures/ has three named families (cleansky, darksun, sunset). Idea: name the sky sets and switch them by zone mood. Change the palette.
- Layered text: base strings plus an override file (lib.cliloc.lua lines 26-40, CreateClilocLoader with base and localisation files). Idea: our text tables can take a base and a locale override.

## Briefs
See the .assets.json briefs array: four briefs (hit numbers, cutaway, mood pass, status particle). Each keeps one trait and changes at least three. Dom rule: a distinct original, never a copy.

## Cross-link (cell topics)
- camera: cutaway in lib.blendout.lua (row 11).
- hud-ui: data/base compass, bars, scroll and frame art (names only) (rows 14 and the minimap idea).
- vfx: data/particles (rows 8, 13).
- sound-music: no audio files in the tree; nothing to take.
- spawns/zones: no zone or spawn data in the box; the server half is absent.
- loot: the item name and property table is Ultima Online's Cliloc, not in the box.

## Not read
- lugre/ (except cadune_tree/license.txt first lines), licenses/ texts (lua.txt, lugre.txt, Ogre3d.html, tinyxml.txt), FreeSans/FreeSerif/FreeMono licence text (not in box).
- All .mesh contents (2,743), all texture pixel data, all .particle contents, skybox and terrain contents.
- config/shards/*.xml contents.
- lua/lib.buff.lua, lua/lib.bodygfx.lua, lua/lib.2d.effect.lua and the rest of lua/.
- data/ogreSampleMedia contents, packs/OgreCore.zip (not opened).
