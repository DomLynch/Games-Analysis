# ikemen-engine-Ikemen-GO (asset audit, AU026)

Donor: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO/ (VPS, read only). 175 files in total.
Half read: ENGINE (Go source, partial) plus the engine-side DATA half (data/*.zss, data/*.air, data/*.cmd, data/*.const: the common state scripts every character inherits). The CHARACTER and STAGE content (MUGEN-format SFF sprites, AIR, CNS, SND) is NOT in the box and the engine does not ship it. The README says the engine is MUGEN-resource compatible. Paired donor in the box: the top-level folder nonameentername-openfight looks like a fighting-game donor by name. It was not read by me and is outside my batch.

## 1. Licence files (as the files say)
- LICENCE.txt line 1: MIT License, Copyright 2016 Suehiro and later named contributors up to 2026 Kokorz, plus 'Ikemen GO contributors'.
- LICENCE.txt line 33: 'The MIT License applies to the Ikemen GO engine and the scripts in this repo.' The data/*.zss, data/*.air, data/*.cmd and external/script/*.lua files are scripts in the repo, so the file's statement covers them.
- LICENCE.txt line 52: 'Work contributed to Ikemen GO by various artists is licensed under a Creative Commons Attribution 3.0 Unported License.' It applies to: the 'default-3x5' font by Gacel, and the icon or logo of the engine by Cylia Margatroid (lines 52-56).
- LICENCE.txt line 60: 'On release builds the engine is packed with more assets that could have different licences.' Release-build assets are NOT in the box; the file says to check a ScreenpackLicence.txt that is not present.
- README.md line 58: the default motif (screenpack) is in a different repo and is licensed CC-BY 3, not MIT.
- font/Open_Sans/LICENSE.txt: Apache License, Version 2.0 (January 2004) for the Open Sans font files.
- The soundfont and any MIDI or audio sample are not in the box.

## 2. Asset inventory (what is actually here)
- data/ (13 files, about 97 KB total): action.zss (3 KB), common1.cns.zss (27 KB, the common state script with 53 StateDef blocks), common.air (663 B, common animations for missing actions: run, hop back, dizzy), common.cmd (2.5 KB, common command list), common.const (10 KB, constants), functions.zss (7 KB, IkSys_ functions: at least 17 named functions), guardbreak.zss, dizzy.zss, tag.zss (13 KB), training.zss, score.zss, system.zss, demo.zss. These are scripts, not art.
- font/: default-3x5.sff, default-3x5-bold.sff, their .def files, debug.def; font/Open_Sans/ 10 TTF files plus LICENSE.txt. The SFF (sprite) font files are binary, not opened.
- external/icons/: 4 .ico and 3 .png Cylia-named icon files plus Ikemen.ico, Ikemen_V2.ico and an icon-src folder (not read).
- external/shaders/: HQ2x and HQ4x and Scanline shaders, as .glsl sources and compiled .spv (binary).
- external/script/: menu.lua, main.lua, start.lua, options.lua, default.lua, debug.lua (6 Lua scripts).
- src/resources/: defaultMotif.ini, defaultStoryboard.ini, defaultConfig.ini (config, not art).
- src/shaders/: GLSL and SPIR-V shader sources. Repo-wide counts: 18 .spv and 13 .glsl files.
- build/: build scripts, Info.plist, Docker files (not read).
- external/mods/: empty (only .keep). No character or stage content.

## 3. Rights-holder status (from repo files only)
- Open-source engine fork: the README says it was forked from an earlier repo whose author seemingly stopped working on it. The LICENCE lists contributors. Status: open-source fan engine (MIT), no commercial characters or stages in the box.

## 4. Classes per asset group
| group | path | class | why |
|---|---|---|---|
| engine common state scripts | data/*.zss, common.air, common.cmd, common.const | A | MIT, 'scripts in this repo' (LICENCE line 33) |
| Lua front-end scripts | external/script/*.lua | A | MIT (same line) |
| engine code and shaders | src/*.go, src/shaders, external/shaders | A | MIT (same line) |
| Open Sans fonts | font/Open_Sans/*.ttf | A (keep the notice) | Apache 2.0 per font/Open_Sans/LICENSE.txt |
| default-3x5 font | font/default-3x5*.sff, .def | B | CC-BY 3.0 per LICENCE line 52 and the font line |
| Cylia logo and icons | external/icons/IkemenCylia_*.png, Ikemen_Cylia*.ico | B | CC-BY 3.0 per LICENCE line 56; exact file mapping is my inference from the names |
| Ikemen.ico, Ikemen_V2.ico | external/icons/ | C | not named in the licence; not read |
| default motif and screenpack | not in box (separate repo) | C | CC-BY 3 per README line 58; not in box |
| release-build assets | not in box | C | LICENCE line 60 says they may differ; not in box |
| characters and stages | none in box | D | nothing in the box |

best_class: A for the engine-side data and scripts (MIT). B for the CC-BY font and logo (attribution required). Characters and stages are D (absent).

## 5. Inspiration (MIT donor: code and data may be adapted; still build a distinct original)
- Hit reaction is a state with a timer and a branch on the next state. The stand-hit state (common1.cns.zss line 497) calls a shake function that chooses the stand or crouch shake by the hit's ground-type field (line 499). When the shake timer ends, the state goes to a knockback or a fall, chosen by the hit's vertical velocity or fall flag. Keep 'shake until a timer ends, then knock or fall'; change the shake axis and the ending animation.
- Just-defend window: IkSys_JustDefend (functions.zss line 68) opens a short window from the first guard frame while the defender holds back. A guard hit inside the window sets a flag. The window is written as gameTime plus 3 (line 73). Keep a short perfect-guard window with a readable reward; change the reward (for us: a stamina refund and a flash, not a bonus flag).
- Danger cue: IkSys_Danger (functions.zss line 85) raises a one-shot flag the first time life is at or below one quarter of its maximum (line 87). It is edge-triggered, so the cue plays once per drop. Keep the one-shot low-life cue; change the look (a heartbeat sound instead of a red vignette).
- Reversal beats hit on the same tick: the collision pass sorts characters by priority, reversal first, then a normal hit definition, then none, with ties broken by id (src/char.go lines 14904-14924). Then all push checks run, then the gethit flags are cleared, then hit detection runs in the same order (lines 14957 onward). Keep the deterministic order of operations; change it to our server tick and ids.
- Parry as a reversal flag: IkSys_Parry (functions.zss line 56) raises its return only when a reversal happened on this move and an enemy exists, and it is latched per game time so it fires once. Keep the once-per-tick latch; change the timing ring that shows it.
- Input buffer through hit pause: common command entries set a buffer for hit pause (common.cmd line 11, buffer.hitpause). Keep a buffer that runs through hitstop; this is the input-buffer fold-in for hud-ui.
- Dizzy flag: IkSys_Dizzy (functions.zss line 94) is high only while dizzy and emits one event per tick. Keep the one-event-per-tick; change the cue (stars orbiting the head, not a sprite).
- Common states as data: one file defines the hit, guard, air, knockdown and dizzy states for every character (common1.cns.zss, 53 StateDef blocks), a common command list is appended to every character, and a common animation file fills missing actions (common.air line 14 for a dizzy fallback). Data-first; the same shape as our catalogue fields.
- Rumble in hit states: the shake states set force feedback by shake state (the 5000 and 5010 shake states use a short square wave; the 5001 and 5011 states use a longer sine wave with amplitude; line numbers approximate, not grep-verified). A cue-per-shake-state idea for row 12 and the controller.

## 6. Briefs (distinct originals only; Dom's rule: recreate as a clearly distinct original, never a copy)
- label: stand-hit shake (own label, effect). why: a hit reaction that holds for a timer and then branches. keep: shake until a timer ends, then knock or fall by air or ground. change: shake along a different axis; a short grey flash at the end. ref: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO/data/common1.cns.zss lines 497-511.
- label: just-defend window (own label, mechanic). why: a short perfect-guard window that is readable at 375 wide. keep: a three-tick window from the first guard frame. change: a shield ring visual and a stamina refund rather than a bonus flag. ref: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO/data/functions.zss lines 68-82.
- label: low-life pulse (own label, effect). why: a single cue the first time life drops to a quarter. keep: one-shot edge trigger at a quarter of max life. change: heartbeat sound instead of a red vignette. ref: data/functions.zss lines 85-92.
- label: reversal ordering (own label, mechanic). why: a reversal on the same tick as a hit wins by priority, deterministically. keep: reversal first, then hit definition, then none; ties by id. change: our server tick and entity ids; a timing ring on the enemy's feet for the reversal window. ref: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO/src/char.go lines 14904-14957.
- label: dizzy stars (own label, effect). why: a status that is high only while active and emits one event per tick. keep: one event per tick while the status holds. change: stars orbit the head, not a sprite. ref: data/functions.zss lines 94-105.

## 7. Cross-link (cells)
- fight loop and parry (rows 3, 4): the guard, reversal and just-defend states above.
- controls (row 5): common.cmd buffers and the hit-pause buffer.
- hero and creature clips (rows 6, 7): common.air and the state chains (the actual character clips are absent).
- hit impact and hitstop (row 10): shake states and their timers.
- combat sound cues (row 12): force feedback per shake length (common1.cns.zss around lines 502-508).
- hud-ui (row 14): the guard bar is in src/fightscreen.go (newGuardBar at line 1291 and step at line 1341; grep hits, not read); input buffer.
- sound-music: none in the box (no audio content).
- loot, spawns, zones: none in the box.
- Idle vocabulary: stand state 0 in common1.cns.zss (line 23). Death and respawn: not read in this pass.

## Not read / not verified
- The character and stage content (absent). Release-build screenpack and its licence (absent).
- data/action.zss, guardbreak.zss, dizzy.zss, tag.zss, training.zss, score.zss, system.zss, demo.zss, common.const (names only, except the cited functions).
- Most of src/*.go: char.go only at the collision pass; fightscreen.go only at grep hits; compiler and bytecode files not read.
- The SFF and TTF binaries, the SPIR-V shaders, and the build folder: not opened.
- No donor code was built or run.
