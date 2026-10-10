# id-Software-wolf3d (asset audit, AU026)

Donor: /mnt/frankendom-donors/id-Software-wolf3d/ (VPS, read only)
Half read: SOURCE ONLY. The client code (WOLFSRC/*.C, *.H, *.ASM) was read in part. The data pack that the loaders expect (VSWAP graphics, GAMEMAPS maps, AUDIOHED/AUDIO sound chunks) is NOT in the box. The loader names are in WOLFSRC/ID_CA.C (receipts sound and map loader lines). There is no matching data half in the box.

## 1. Licence files (as the files say)
- Code: WOLFSRC/README/LICENSE.DOC and README.rst (duplicated copy) carry a LIMITED USE SOFTWARE LICENSE AGREEMENT. The file says the Software (which it defines as source code, artwork data, music and software tools) is owned by ID and protected by US copyright law. Educational use: the file allows use of portions of the source code for educational purposes to develop your own software. It forbids commercial exploitation of the Software, and forbids redistribution, but says that software you develop under the educational right may be commercially exploited. It also says the licence terminates on breach.
- README.rst: John Carmack's release note says the code is released for the entertainment of the user community, with no guarantee that it builds, and that the data from a released Wolf or Spear version is needed to run the executable.
- No open-source licence (no GPL, MIT or CC text) is in the box.
- Asset licence: the same agreement, because the file's own definition of Software includes artwork data and music. No separate asset licence is written, and no art or music is in the box.

## 2. Asset inventory (what is actually here)
- WOLFSRC/ (about 100 files, plus subfolders README/ and OBJ/): source files (.C, .H, .ASM), Borland project files (WOLF3D.PRJ, WOLF.DSW, WOLF.IDE), the EGA/VGA graphics name enums and equate files (GFXE_WL6.H, GFXE_SOD.H, GFXV_*.EQU), audio name headers (AUDIOWL6.H, AUDIOSOD.H, AUDIOWL1.H), map name headers (MAPSWL6.H, MAPSSOD.H, MAPSWL1.H).
- GFXE_WL6.H: the graphics enum is EMPTY in this release (its body has only ENUMEND). The header keeps the counts (NUMCHUNKS 414, NUMTILE16 144). So no picture names are listed here.
- AUDIOWL6.H: a sound-name enum with NUMSOUNDS 87 names per block (the PC-speaker block and the AdLib block each start at their own offset; a digital block follows; music starts at index 261; 288 sound chunks in total). Names only, e.g. the walk-footstep, dog-death, player-death and gatling-attack names. No audio data.
- MAPSWL6.H: a TED5 map-name enum (floors, boss, secret floors). Count not verified exactly (about 60 name lines).
- WL_DEF.H: a sprite enum of about 533 distinct SPR_ tokens (guard, dog, officer, SS, mutant, boss, Schabbs, Hans, Gretel, Gift, Fat, Fake Hitler, Mecha Hitler, angel, spectre, plus static decorations). These are NAMES. No pixels.
- WL_ACT2.C (3,872 lines): the enemy state machines as statetype tables (frame id, tics, think function, action function, next state) plus per-difficulty hit-point table (starthitpoints) and shot/chase logic. This is the most useful non-art data in the box.
- WOLF3D.MAP (127 KB, linker map): not read.
- WOLFSRC/WOLF.EXE (50 KB), SV.EXE, OBJ/GAMEPAL.OBJ (palette object), OBJ/SIGNON.OBJ (64 KB), WOLF3D.DSK, WOLF.OBR, WOLFSRC.1 (566 KB, DeIce archive part), DEICE.EXE, INSTALL.BAT: all NOT read beyond their names and sizes (binary).
- WOLFSRC/GOODSTUF.TXT (2 KB): a fan mail/letter collection, not game text. Not quoted.
- Text (quests, dialogue, item names): not in the box. The game strings live in the data pack that is absent. WL_TEXT.C is the text pager code.
- Fonts, UI art, maps, music: none in the box as data.

## 3. Rights-holder status (from repo files only)
- Original company release: LICENSE.DOC names ID (id Software) as owner. The README is a source release note by a named id staff member. Status: original company (id Software), source-only release, no data.

## 4. Classes per asset group
| group | path | class | why |
|---|---|---|---|
| enum name tables (graphics, audio, maps, sprites) | WOLFSRC/GFXE_WL6.H, AUDIOWL6.H, MAPSWL6.H, WL_DEF.H | C | names only, the file rights are the limited-use licence |
| art, sprites, walls, tiles (data pack) | none in box (VSWAP not present) | D | nothing usable here |
| audio (sound/music data) | none in box (AUDIOHED/AUDIO not present) | D | nothing usable here |
| enemy state tables and shot logic | WOLFSRC/WL_ACT2.C | C | code, under the limited-use licence; inspiration only |
| executables and binaries | WOLFSRC/WOLF.EXE, SV.EXE, OBJ/*.OBJ | C | not read; proprietary binaries |
| fan text | WOLFSRC/GOODSTUF.TXT | C | not game content; not quoted |

best_class: C overall (for the names and state tables, inspiration only). Art and audio data are D because they are absent.

## 5. Inspiration (category-level only, proprietary donor)
- Shot chance is a function of range and of whether the defender can see the shooter. A shot from a shooter the player cannot see is more accurate than one the player can see and dodge; a running player makes shots harder (WL_ACT2.C T_Shoot: receipts shot_function, shot_visible_dodge). Keep the rule 'visible means dodgeable'; change it to a telegraph timer rather than a dice roll, so the fight engine's guard and parry rows stay the source of truth (row 3).
- Shooter accuracy scales by class: the heavy/SS class gets a range-based bonus (receipt shot_class_scaling_comment). Keep the idea that each shooter class has its own accuracy curve; change the curve numbers.
- Attack state chain: a shooting state with the shot fired on the middle frame, then back to chase (receipt guard_shot_frame). This is a clean windup, release, recover shape for row 7 (creature clips) and row 4 (fight loop).
- Walk/chase cycle built from four distinct frames with short one-frame holds between pairs (receipt guard_chase_cycle). The hold beat gives a readable pause at 375 wide.
- Death presentation: the death scream fires on the first frame of the death chain, then a four-frame fall, and the last frame is held forever (receipt death_scream_frame). Sound on frame one, not on the last frame; the body stays readable.
- Difficulty as a column per enemy class: one hit-point table with four rows, one per difficulty (receipt difficulty_hp_table). This is the data-first shape for row 21 (catalogue fields) and row 22 (Pit-only tiers).
- Dog leap: five-frame jump with the bite on the second frame (receipt dog_bite_frame). Telegraphed lunge, good for a row-7 creature clip.
- Ghost hover: two frames, short tic, no ground contact (receipt ghost_bob). Translucent pursuer reads as a threat without a new model.
- Projectile chain: rocket on a looping state with an action that spawns a smoke-puff chain, then a three-frame boom (receipt rocket_smoke). Effects as state chains are data, not code.

## 6. Briefs (distinct originals only; Dom's rule: recreate as a clearly distinct original, never a copy)
- label: patrol gunner (own label). why: readable silhouette, four-frame stride with a hold beat, shot on the middle frame. keep: four-frame stride with hold beat; windup, release, recover; shot on mid-frame. change: armour-plated silhouette with a cape, not a uniform; cool steel palette with an ember accent; a crossbow arm, not a pistol. ref: /mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_ACT2.C lines 418-444 (guard states), 431 (shot frame).
- label: hound leaper (own label). why: fast beast whose leap is the signature. keep: five-frame leap with bite on frame two; patrol loop then chase loop. change: a bipedal beast with a glowing jaw; different leap arc; different ear and tail shape. ref: WL_ACT2.C lines 503-525.
- label: wisp chaser (own label). why: a hovering translucent pursuer that needs no ground contact. keep: two-frame hover bob; transparency reads as danger. change: an ember-tailed smoke wraith with a lantern core, not a ghost. ref: WL_ACT2.C lines 460-470.
- label: range-scaled armoured shooter (own label). why: a heavy whose accuracy depends on range and class. keep: accuracy as a function of range and class. change: a telegraph ring replaces the hit dice; shoulder cannon silhouette. ref: WL_ACT2.C lines 3444-3520 (T_Shoot).
- label: smoke-trailed bolt (own label, effect). why: projectile that leaves its own puffs and ends in a short boom. keep: puffs on their own timer; three-frame boom. change: ember bolt with a spark trail; cyan boom. ref: WL_ACT2.C lines 181-189.

## 7. Cross-link (cells)
- camera: the ray-cast view and wall drawing are in WL_DRAW.C / WL_SCALE.C (not read beyond names). Not an asset.
- zones and spawns: map name enum only; the layouts are in the absent GAMEMAPS data. The enemy placement is via the map data (absent).
- loot: none in source (item pickup sounds are in the audio enum names only).
- hud-ui: none read.
- vfx: the smoke and boom chains (WL_ACT2.C 181-189) are the only effect data.
- animation: state chains (see section 5).
- sound: names only (AUDIOWL6.H); no audio data.
- Idle vocabulary: the guard's stand state is one frame that loops on itself with a think function (s_grdstand, WL_ACT2.C line 418); there is no separate idle clip. Death: see section 5.

## Not read / not verified
- WOLF3D.MAP (127 KB), WOLF.EXE, SV.EXE, WOLF3D.DSK, WOLF.OBR, OBJ/*.OBJ, WOLFSRC.1, DEICE.EXE, INSTALL.BAT, all *.ASM files, the rest of the WL_*.C files beyond the enemy and shot code, GFXE_SOD / AUDIOSOD / MAPSSOD headers.
- The exact map-name count and the exact sprite count (the 533 figure is distinct SPR_ tokens in WL_DEF.H, not a verified sprite-table count).
- No loader or data file was run. No donor code was run.
