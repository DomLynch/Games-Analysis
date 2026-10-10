# ryantpayton-MapleStory-Client (HeavenClient): assets (AU046)

Donor: /mnt/frankendom-donors/ryantpayton-MapleStory-Client (read on the VPS, read-only)
Halves: CLIENT half read (C++ sources, README, LICENSE, includes/, fonts/). The SERVER half is not in this repo (README points to a separate server project, "HeavenMS"). The box has no folder with that name. A folder named Elem8100-MapleNecrocer exists in the box; I did not open it, so I cannot say whether it is the server half. The DATA half (NX game files) is not in the repo at all; the README says the user supplies them.

## Licences (as the files say)
- Code: GNU AGPL v3. LICENSE line 1 is the AGPL title. Data/ItemData.cpp header says it is "free software ... GNU Affero General Public License ... version 3".
- README line 118: "HeavenClient is and will always be free and open-source." This is the project's own statement; the AGPL file governs.
- Assets: no asset licence is stated in the box. The repo contains no game art, sounds, maps or text tables (see inventory). The fonts and icon have no licence file next to them.
- Third-party code under includes/ keeps its own terms: glfw (LICENSE.md, permissive text), stb (public domain per the stb_image.h header), glew (LICENSE.txt, BSD-style clause), freetype (README only; licence file not read in full), bass24 (bass.txt not read), NoLifeNx (not read).

## Rights-holder status (from repo files only)
- Client code: header of Data/ItemData.cpp names "Daniel Allendorf, Ryan Payton" (Copyright 2015-2019) and calls the code "the continued Journey MMORPG client". The README calls HeavenClient "a custom, made-from-scratch game client for MapleStory".
- Game content: not in the repo. README line 46 and line 71 say the user must convert the official client's WZ files to NX and place them next to the executable. The README names Nexon only in a donation note (line 116: "support Nexon"). It does not state who owns the game data. Status for game content: "uses original game data, user-supplied at runtime; owner not stated in repo".

## Asset inventory (paths and counts, from find/ls)
- Game art, sprites, tiles, maps, mob/NPC/item images, sound, string tables: NONE in the repo. The code loads them from NX files named in Util/NxFiles.h (Base, Character, Effect, Etc, Item, Map, Map001/002, Map2, Mob, Mob001/002, Mob2, Morph, Npc, Quest, Reactor, Skill, Skill001-003, Sound, Sound001/002, Sound2, String, TamingMob, UI). None of those files are in the box.
- Fonts: fonts/Arial/Arial.ttf and fonts/Arial/Arial-Bold.ttf (2 files). Licence not stated in the box.
- Icon.png (1) and Icon.ico (1) at the repo root.
- includes/: 50 png files, all documentation images from the glfw and glew doc trees (e.g. includes/glfw-3.3.2.bin.WIN64/docs/html/*.png, includes/glew-2.1.0/doc/*.png). Not opened.
- Audio/: Audio.cpp and Audio.h only. No audio files (no .wav, .mp3, .ogg in the tree).
- Data/: 12 files, all code (ItemData, SkillData, JobData, EquipData, WeaponData, BulletData). These are code, not data tables. Item and skill values come from NX at runtime.
- Gameplay/: 80 files, all code (Combat, MapleMap, Physics).
- Character/: 72 files, all code (Look, Inventory). Equipment looks come from NX (Character.nx named in NxFiles.h).
- No .xml, .json, .csv or .lua data tables in the tree.

## Data first (names and looks)
- The names and look data (item names, mob names, skill names, map data, string tables) are NOT in this repo. They sit in NX files the user supplies (Util/NxFiles.h lines 39-66, e.g. "String.nx" and "Mob.nx"). I did not open the NX list beyond the names, and I did not read the loader in detail. Per the rule, the table is not in the box.

## Asset classes per group
- Game art / sound / maps / text (NX, user-supplied): class D here (absent). Using them would mean using Nexon's game content: not ours to take.
- fonts/Arial (2 .ttf): class C. Licence not stated in the box.
- Icon.png / Icon.ico: class C. No licence file next to them.
- includes/ doc images (50 png): class C. Third-party, not opened.
- Code (AGPL): class B for copying code (share-alike); we use the shape only, see the rule in the brief.

## Inspiration (own words; the mechanism is the point, not any look)
- Floating damage digits: the number is laid out glyph by glyph, each glyph advance is averaged with its neighbour, and the whole string is centred by half its width (DamageNumber.cpp lines 26-82, centring at line 68). Critical rows are taller than normal rows (36 vs 30 px, DamageNumber.cpp line 189), and several hits on one mob stack upward from the head position (Combat.cpp lines 385-398).
- Float-and-fade feedback: each number rises by a fixed speed per update (line 78), starts above full opacity (line 79) and loses a fixed step per update (line 181-182). With the 8 ms step (Constants.h line 29) and a 500 ms fade time (DamageNumber.h line 53), it takes about 94 updates to fade, which is roughly 0.75 s if updates are 8 ms apart (my arithmetic, not a stated value).
- Death presentation: a mob plays its die clip, the dead flag is set only when that clip ends (Mob.cpp line 153), then the sprite fades down by a fixed step per update (Mob.cpp line 158).
- Ground-patrol critter: a non-flying mob flips direction when it reaches an edge of its footing, once per edge (Mob.cpp around lines 190-198). A hit-stunned mob that turns at an edge drops out of the hit clip (Mob.cpp lines 197-198).
- Skill afterimage trail: the first frame at which the trail shows is read from the animation data (Afterimage.cpp line 47), and the trail draws only from that frame on (Afterimage.cpp lines 65-66). A frame gate, not a timer.
- Named UI sound table: UI sounds are fetched by name from one UI group and played by name (Audio.cpp lines 77-79). Good shape for HUD feedback.
- Stance-as-clip: a mob is a set of named clips (stand, move, jump, hit1, die1) selected by a stance value (Mob.cpp lines 62-73). Clean shape for our creature actor (parity row 7).

## Briefs
See the .assets.json "briefs" array. Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.

## Cross-links
- Combat feedback (damage numbers, hit reaction, death fade): combat-sim and hud-ui topics.
- Afterimage and stance-as-clip: animation topic.
- Ground-patrol turn at edges: spawns/encounters and physics topics.
- Named UI sound table: sound-music topic (only the table shape; no sound files in the box).

## Not read
- Net/ packet code (64 files), IO/ UI code (142 files), Gameplay/Physics and MapleMap internals beyond Mob.cpp, Character/Look and Inventory logic, Graphics/ (only file list), includes/NoLifeNx, includes/bass24 licence text (bass.txt), includes/freetype LICENSE.TXT (full text), any NX file (absent), Data/*.cpp bodies beyond the ItemData header.
