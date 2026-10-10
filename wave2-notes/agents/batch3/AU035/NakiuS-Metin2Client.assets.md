# NakiuS-Metin2Client (asset audit, AU035)

Donor tree: /mnt/frankendom-donors/NakiuS-Metin2Client/ (VPS, read-only)
RESTRICTED donor: _RESTRICTED-NOTE.txt line 1 says "leaked Metin2 client source, no valid licence. Study shape/idea only; never copy code, constants or text." Everything below is category-level. No constants, coordinates or colour codes are given.
Which half I read: the CLIENT half only (source/GameLib, source/UserInterface, source/ScriptLib, source/EterLib, source/EterPack and the vs_files project files). The game SERVER is not in the box. The data tables the client loads (item_proto and mob_proto, per locale) are referenced by the client code but are NOT in the box (see asset groups).

## Licence (what the files say, and a conflict)
- LICENSE line 1: "MIT License"; line 3: "Copyright (c) 2018 - Ymir / Jonatan Acahu" (the name is written with an accent in the file).
- _RESTRICTED-NOTE.txt line 1 (Dom's note, added 2026-10-10): "leaked Metin2 client source, no valid licence".
- CONFLICT: the repo LICENSE is an MIT licence naming Ymir / Jonatan Acahu, while the restricted note says the source is leaked with no valid licence. The files do not resolve this. Per the rule: conflicting licence, so class C, and the restricted note governs use: shape and idea only.
- README.md line 2 is only "the latest version developed" (no licence text).

## Rights-holder status (repo files only)
- Named in LICENSE: Ymir / Jonatan Acahu (copyright line). The restricted note says leaked. Status: conflicting; treat as restricted (leak/decompile). Do not seek mirrors.

## Asset inventory (what is and is not in the box)
- Non-code files found by extension: no PNG, DDS, TGA, JPG, GR2, GRP, MP3, WAV, OGG, TTF or FNT files. The shipped Metin2 art, models, sounds, maps and fonts are NOT in this box. Asset class D for those (none present).
- Text: 1 Python file (source/UserInterface/Version.py), 2 C files, and text files only under extern/include (boost Unicode data and readme files). Not game text. Not read.
- Build libraries: extern/library holds 27 .lib files (names seen include dxguid.lib, glut.lib, libjpeg-6bMT.lib, SecureEngineSDK32.lib, dmoguids.lib, d3dx8.lib, mmap.lib, ddraw.lib). Binary library files; not opened. Licence unknown for each. Class C (unclear). Note SecureEngineSDK32.lib is a third-party protection SDK by name only.
- Build artefacts: vs_files/UserInterface/Distribute/PythonApplication.cod and Metin2Distribute.map. Not read.
- Data tables referenced but absent: item_proto (ItemManager.cpp line 276 error text; PythonApplication.cpp line 1016 path; Locale.cpp lines 320 and 365) and mob_proto (PythonApplication.cpp line 1018; Locale.cpp). Per-locale table files: locale/<locale>/item_proto and locale/<locale>/mob_proto. NOT in box. Class D (absent).
- Packed asset archive reader: source/EterPack (EterPackManager.cpp, EterPack.cpp, EterPackCursor.cpp, policy files). The reader code is here; the archives are not. Class D for the archives. I did not study the archive policy code (out of scope for shape notes).
- UI: source/UserInterface has 167 entries (C++ and Python-hook code). Count only; not read beyond names.
- Sizes: 334 .cpp and 301 .h/.hpp under source/ (counts only).

## What the client code shows (category level, my own words)
- Combo input is a timed window with a buffered pre-input. InputComboAttackCommand (ActorInstanceBattle.cpp lines 156-213): when the motion carries input-time data, a press before the input window closes is remembered as a pre-input (line 195); a press after the window closes is refused (line 177); a press after the next-combo time starts the next hit at once (line 185, not receipted: non-ASCII comment on line). ComboProcess (lines 215-253) fires the buffered pre-input when the next-combo time passes (line 233).
- Fallback for motions without input-window data (ActorInstanceBattle.cpp lines 199-209): the next hit is taken only when the press arrives after most of the swing. A press that arrives earlier is NOT stored (no pre-input is set in that branch). This is a dropped-input defect for us. Fix: store the early press as a pre-input and fire it at the same boundary.
- Normal attack gate (lines 457-468): accepted while the actor is waiting, or while attacking after most of the swing (line 466).
- Swing progress (lines 451-454): elapsed time since the motion started, multiplied by the motion's speed ratio. An older expression that used a separate attack-speed function is commented out (line 454). Idea: speed belongs to the motion ratio. Check: this is an idea; the commented-out line shows a change of approach, not a bug.
- Bow mode: a press that arrives after the input window closes is kept as a next-attack request (lines 180-181), and it is run when the motion ends with no combo running (ComboProcess else-branch, lines 242-251).
- Battle hit effect chosen by an id (ActorInstanceBattle.cpp line 8). Attack speed is set per actor (ActorInstance.cpp line 181).
- Item and mob tables are loaded per locale from a locale folder (PythonApplication.cpp lines 1016-1018; Locale.cpp lines 320 and 365). The stats tables are not in the box, so nothing about numbers can be checked.

## Inspiration notes (category level, my own words; no constants)
- Combo chain with an input window and a pre-input buffer: a press inside the window is remembered and fires at the next hit boundary; a press after the window is refused. For rows 3 and 5 (guard, controls, input buffer). Fix for our build: buffer early presses in every branch so none are dropped.
- Normal-attack gate: a fresh swing is accepted only when the current swing is nearly done. For row 4, use the same gate on our hero swing, with the buffer fix above.
- Ranged mode keeps a late press as a next-attack request, run when the current motion ends. For bow-like weapons in row 13 (specials), a ranged action keeps its late input instead of dropping it.
- Swing progress as elapsed time times a per-actor ratio. For row 6 (hero actor and animation), one ratio per motion rather than a global stat.
- Per-actor battle hit effect chosen by id. For row 8 (blood, wounds, decals) and row 10 (hit impact), a hit-effect id on the hit record.
- Per-locale table files for names. For row 21 (catalogue fields), keep names in locale tables and stats in one catalogue.

## Inspiration briefs (category-level only; no instance-level looks)
See the .assets.json "briefs" key.

## Cross-link to our cell topics
- controls and input buffer: primary (ActorInstanceBattle.cpp 147-253, 457-468).
- hero animation and attack speed: ActorInstanceBattle.cpp 451-454; ActorInstance.cpp 181.
- hit effects: ActorInstanceBattle.cpp 8.
- loot, spawns, zones, camera, sound, HUD: not present as data in the box (UI and tables not read; tables absent).

## Not read
- The game server (absent from the box).
- Any item_proto or mob_proto data (absent).
- The EterPack archive policies and crypto (out of scope; not studied).
- source/UserInterface (167 entries; names only), source/GameLib beyond ActorInstanceBattle.cpp and ActorInstance.cpp lines cited.
- The 27 .lib files, the .cod and .map build artefacts, extern/include (boost).
- Lines that carry non-ASCII comments (ActorInstanceBattle.cpp lines 185 and 202 are the same kind of test as 233 and 466; only the ASCII lines are receipted).
