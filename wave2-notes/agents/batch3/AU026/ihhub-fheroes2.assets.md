# ihhub-fheroes2 (asset audit, AU026)

Donor: /mnt/frankendom-donors/ihhub-fheroes2/ (VPS, read only)
Half read: ENGINE SOURCE (src/fheroes2/ battle, ai, monster code) plus the project's own data pack (files/, maps/, docs/). The ORIGINAL game data (HEROES2.agg / HEROES2X.agg, which hold the sprites, the creature animation frames and the original sound and music) is NOT in the box. docs/GRAPHICAL_ASSETS.md says the user must place those files from their own copy. The paired half (the original game) is therefore absent.

## 1. Licence files (as the files say)
- Code: LICENSE (GNU GENERAL PUBLIC LICENSE, Version 2, June 1991). README.md section Licence: 'This project is licensed under the GNU General Public License v2.0'.
- Original game resources: README.md Copyright section says 'All rights for the original game and its resources belong to former The 3DO Company. These rights were transferred to Ubisoft.' The project does not claim them.
- Soundfont: files/soundfonts/README.txt says fheroes2.sf3 is based on GeneralUser GS v1.471 by S. Christian Collins, with unused samples removed. GeneralUser-GS-LICENSE.txt: 'You may use GeneralUser GS without restriction' for music creation, private or commercial, but the same file says the author cannot be 100% sure where all samples originated and that some may be of questionable origin.
- resurrection.h2d (project-made art pack): no separate licence file in the folder. docs/GRAPHICAL_ASSETS.md says the file holds new assets the project adds. Covered only by the repo GPL-2 statement (README), which does not name data files.
- maps/*.fh2m (11 files): no licence or author text in the folder.
- files/lang/*.po and docs/json/lang_*.json: no separate licence; GPL-2 by the README statement only.

## 2. Asset inventory (what is actually here)
- files/data/resurrection.h2d: 41,427 bytes, the project's own H2D container. About 60 named image entries (grep count 64 of name-like strings, not decoded). Names include prop idle loops numbered 0 to 5 (barrel_animation_0..5, black_cat_animation_0..5), abandoned-mine variants by biome (desert, lava, rock, snow, swamp), castle captain quarters, observation-tower parts, wizard bay transition loops (animation_0..4), main menu editor buttons, keyboard hint buttons, and spell icons. Pixel content not opened.
- files/soundfonts/fheroes2.sf3: 2,610,591 bytes, SF3 soundfont for MIDI (GeneralUser GS base). Plus GeneralUser licence and readme files.
- files/lang/*.po: 23 translation catalogues (one per language) plus Makefile. de.po has 3,273 msgid entries (grep count). docs/json/lang_*.json: 23 JSON language files.
- files/timidity/timidity.cfg, files/emscripten/index.html + fheroes2.jpeg, files/images/platform/{psv,switch}: platform config and images. Not read beyond names.
- maps/: 11 .fh2m map files, for example 4_dimensions, 7_deserts, Apocalypse, Eruption, Final_Invasion, Lost_Temple, Ravenhold, Tetra_conflict, Utopeia. Map format binary; not opened. Author per map not stated.
- src/resources/: app icons (ico, icns, png) and an rc file: not read.
- Original creature sprites, hero portraits, terrain tiles, original sounds and music: absent (in the user's HEROES2.agg).
- Creature animation file names are in source code: src/fheroes2/monster/monster_info.cpp lines 146-147 (BIN frame file per creature tier; several tiers share one file).

## 3. Rights-holder status (from repo files only)
- The engine is a community re-implementation (GPL-2) that requires the original game data. The README names The 3DO Company and then Ubisoft as holders of the original game and its resources. Status: uses original game data (proprietary, not in the box). The project's own data (resurrection.h2d, maps, translations, soundfont) is a separate case; see section 4.

## 4. Classes per asset group
| group | path | class | why |
|---|---|---|---|
| original game art, sprites, portraits, tiles | not in box (HEROES2.agg) | D | absent; the user supplies it; proprietary |
| original sounds and music | not in box | D | absent |
| project art pack | files/data/resurrection.h2d | B | project-made; GPL-2 by README (share-alike); per-file licence not stated |
| translations | files/lang/*.po, docs/json/lang_*.json | B | GPL-2 by README; no per-file licence |
| maps | maps/*.fh2m (11) | C | no author or licence stated per map; unclear |
| soundfont | files/soundfonts/fheroes2.sf3 | C | built on GeneralUser GS; the author's own licence text says sample origin is uncertain; class C until provenance checked |
| platform and emscripten extras | files/images, files/emscripten | B | GPL-2 by README; not read |
| battle and monster data tables | src/fheroes2/monster/monster_info.cpp | C | GPL-2 code: clean-room, shape only |

best_class: B for the project-made data (resurrection.h2d and translations, share-alike via the README). Original game art and sound are D (absent). The soundfont and the maps are C.

## 5. Inspiration (category-level; GPL-2 donor, shape only, no constants)
- Turn order: one ordering function picks the next unit from the active units of both armies by speed; a tie goes to whichever army moves first (src/fheroes2/battle/battle_arena.cpp lines 169-180, receipts turn_order_function, turn_order_tie). Keep the deterministic tie-break; in our real-time duel, use the input tick as the tie-break.
- Morale as a per-turn roll: at the start of a unit's turn, a good or bad morale mode is rolled from the unit's morale value, and the AI avoids bad morale more often than a human (src/fheroes2/battle/battle_troop.cpp line 301, SetRandomMorale). Keep the per-turn random mode that changes one action; change the presentation (an aura, not a text line).
- Stalemate guard: the AI planner checks a counted limit on turns without any death, and the function's first half compares the dead-unit totals of both armies between turns (src/fheroes2/ai/ai_battle.cpp line 678 isLimitOfTurnsExceeded, line 690 comment). Only the start of the function was read: the retreat or surrender branch that follows was not read. Keep a counted no-kill limit that ends a stalemate; in our engine this is a real-time no-hit timer shown as a countdown.
- Battle stat table as data columns: attack, defence, damage min and max, hit points, speed, shots, plus lists of abilities and weaknesses per creature (monster_info.cpp line 234 header, table from about line 233). Data-first shape for rows 20 and 21 (catalogue as runtime source and catalogue fields).
- Tier sharing: several creature tiers point to one animation file (monster_info.cpp line 147), so an upgrade reuses the base sprite sheet and changes only its stat row. Keep the sharing; change the visuals (an upgrade adds a visible mark).
- Idle loops by name: the resurrection pack uses '<prop>_animation_N' with N from 0 to 5 for barrels and critters, and transition loops for buildings (file names in files/data/resurrection.h2d). This is the idle vocabulary for rows 7 and 14: small numbered loops for props.

## 6. Briefs (distinct originals only; Dom's rule: recreate as a clearly distinct original, never a copy)
- label: veteran spear line (own label). why: a cheap front-line tier that becomes a stronger tier with the same sprite sheet. keep: stat-row upgrade on a shared sheet; faster tier with more hit points. change: polearm silhouette with a tower shield, not a pike; a different colour ramp. ref: /mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster_info.cpp lines 233-238 (battle stat rows) and 147 (shared frame file).
- label: bow tier pair (own label). why: a ranged base tier and its upgrade with a shot-count column. keep: shots as a stock column; upgrade shares the base sheet. change: quiver shown as visible pips on the HUD; a different bow silhouette. ref: monster_info.cpp lines 146-147.
- label: morale aura (own label, effect). why: the good or bad morale mode is a per-turn random roll that changes one action. keep: per-turn roll with biased odds for a bad mode. change: gold or grey aura and a ground ring, not a text line. ref: src/fheroes2/battle/battle_troop.cpp line 301.
- label: prop idle loop (own label). why: six-frame numbered loops for small props and critters. keep: numbered six-frame idle loop. change: our own critter (for example a lantern moth), not the donor's cat. ref: files/data/resurrection.h2d (entries barrel_animation_0..5 and black_cat_animation_0..5, names only).
- label: stalemate timer (own label, mechanic). why: a counted stretch with no deaths ends the fight. keep: a counted no-kill limit. change: a real-time no-hit timer shown as a countdown on the HUD. ref: src/fheroes2/ai/ai_battle.cpp lines 678-690.

## 7. Cross-link (cells)
- battle and tiers (rows 1, 2, 4, 18, 20, 21): sections 5 and 6.
- hud-ui (row 14): the battle morale indicator is in src/fheroes2/battle/battle_interface.cpp (RedrawActionMorale near line 5371; grep hit only, not read).
- sound-music (row 12): the soundfont is a trimmed GM bank; its layering and bank choice not read in the engine.
- loot, spawns, zones: none in this donor (it is a turn-based strategy engine with map data; the map files are not opened).
- vfx: none read.
- Death and respawn presentation: not read.

## Not read / not verified
- resurrection.h2d content (only the entry names were listed, by grep, not decoded); the 11 maps; the soundfont internals; platform images; translation text (counts only).
- src/fheroes2/monster/monster_anim.cpp, src/fheroes2/ai/ai_battle.cpp beyond the two functions above, battle_arena.cpp beyond the turn-order function, battle_interface.cpp beyond the grep hit.
- The original HEROES2.agg is absent. No original art or sound was seen.
- No donor code was built or run.
