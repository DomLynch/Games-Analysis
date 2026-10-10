# Kelsidavis-WoWee (asset audit, reader AU028)

Donor/Licence line: code MIT with an additional restriction (LICENSE line 1; LICENSE lines 15-19 say the software may not be used as the basis for, or a component of, any commercial video game or other commercial game product without express written permission). The restriction was added 2026-07-21 per NOTICE line 13; code published before that date is plain MIT (NOTICE lines 13-14). Assets: music is all rights reserved (LICENSE lines 31-47); textures are described but not in the box; game data is not shipped. Best class C.

Checked: LICENSE (full, 47 lines), NOTICE (full), ATTRIBUTION.md (lines 1-80 and the legal notice at lines 69-71), assets/ listing and counts, assets/textures/README.md (head), Data/ listing (opcodes and expansion layout files), src/ top level, src/audio/ (file list; music_manager.cpp, ambient_sound_manager.cpp, combat_sound_manager.cpp read in the cited ranges), src/game/ and src/ui/ (grep only). Receipts: 89 rows across the four donors, all pass verify_receipts.

## Halves
- Client half: READ in part (src/audio, src/ui grep, src/game grep; assets/; Data/). This is a client for World of Warcraft 3.3.5a (ATTRIBUTION line 71; the README names the client version the user must own).
- Server half: NOT IN THE BOX. The tree is a client; the references in ATTRIBUTION.md (TrinityCore, MaNGOS, AzerothCore) are referenced, not included.
- Data half: the WoW game data (MPQ archives, DBC tables, art, sound) is NOT IN THE BOX. ATTRIBUTION.md line 71 says the user must supply their own legally obtained data. Data/ holds protocol and layout JSON only: Data/opcodes/canonical.json and aliases.json; Data/expansions/tbc, wotlk and turtle with opcodes.json, dbc_layouts.json, update_fields.json and expansion.json. These describe the user's client files; they do not hold names or looks.
- Paired half: none in the box.

## Licences (as the files say)
- LICENSE line 1: MIT License (with Additional Restriction). Lines 12-13: the usual MIT notice condition. Lines 15-19: the additional restriction text (quoted above in paraphrase).
- LICENSE lines 31-47: ORIGINAL MUSIC ASSETS LICENSE, Copyright (c) 2026 Kelsi Davis, All rights reserved (line 33). The music and audio are not covered by the MIT licence. Line 40: the music may not be copied, redistributed, modified, sampled or used in a derivative work without express written permission. Line 44-45: provided solely for use within the Wowee project and not extracted for other projects.
- NOTICE line 8: MIT with one additional restriction. NOTICE line 26: World of Warcraft and related assets, names and marks are property of Blizzard Entertainment, Inc.; the project ships none of them.
- ATTRIBUTION.md line 69: no Blizzard proprietary data, assets or code is included. Line 71: users must supply their own legally obtained WoW 3.3.5a game data files.
- assets/textures/README.md line 3: source is the TurtleHD Texture Pack (Turtle WoW); line 5: 298 BLP textures, 11 MB, described. The BLP files are not in the box (only the README is present in that folder).

## Rights holder (from files only)
Wowee Contributors (code, LICENSE line 3). Kelsi Davis (music, LICENSE line 33; NOTICE line 3). Blizzard Entertainment (WoW marks and assets, NOTICE line 26). The HD texture pack's owner is not named in the files beyond 'TurtleHD Texture Pack (Turtle WoW)' (textures README line 3): unknown.

## Asset inventory (find counts; no binary opened)
- Original music: assets/Original Music/ (19 .mp3, titles such as the ones on the 'Original Music' folder list; titles not reproduced). All rights reserved (see Licences). Class C (not usable; inspiration only).
- Splash and brand images: assets/krayonload.png, Wowee.png, wowee-soundtrack.png, hellfire-peninsula.png, 6 PNG in total under assets/ (four are listed at the top level). Licence not stated per file; the NOTICE does not name them. Class C (unclear).
- Shaders: assets/shaders/ (90 .glsl, 84 .spv, 4 .glsli). Code under the repo licence (the restriction applies). Class B (condition: no commercial game use without written permission).
- HD textures: assets/textures/ (README only in the box; 298 BLP described). Class C (third-party pack; not in box).
- Icon: 1 .ico in assets/. Not opened. Class C (unclear).
- Audio in the tree: the 19 mp3 above are the only audio files in the box. Game sound (ambient wav, combat wav) is loaded from MPQ-style paths (ambient_sound_manager.cpp line 138) that are the user's client files, not in the box. Class D for the repo.
- Data/ JSON layout and opcode tables: code-like data under the repo licence. Class B (same restriction).
- Lua addon and macro scripts: referenced in ATTRIBUTION.md (Lua 5.1.5, MIT); the scripts themselves not opened.

## Class per group
- Original music: C (all rights reserved; not usable).
- Splash images: C (unclear).
- Textures (described, not in box): C (third-party pack, unclear).
- Shaders and Data JSON: B (repo licence with an additional restriction).
- WoW game data: D (not shipped).

## Data first (sound and state)
The sound lookups are paths in src/audio/ambient_sound_manager.cpp (zone libraries, lines 136-183) and music names in src/audio/music_manager.cpp. Those paths point into the user's client files; the sound files are not in the box. The state tables are Data/expansions/*/update_fields.json and dbc_layouts.json (layout per expansion, not names).

## Inspiration (own words; recreate from scratch; category-level for class C)
- Zone ambience bed by place and time: updateZoneAmbience (ambient_sound_manager.cpp lines 762-780) picks a loop library from the zone type and day or night (line 770, line 774 forest case), and is silent indoors and in cities (line 764). Idea for the sound-music cell: one loop per biome, switched by time of day, silent in towns and interiors. Change: our biome set, a dusk blend instead of a hard switch. Border crossfade between zones: not read.
- Music with explicit fades: playMusic(fadeInMs) starts at zero volume and ramps with a timer (music_manager.cpp lines 64-98, fade duration line 98); stopMusic(fadeMs) fades out, then stops at zero (lines 195-208, comment line 204). Idea: every music change names its fade length. Change the stinger timing and the duck under the bed.
- Capped positional emitters: at most 5 fire and 3 water emitters are audible at once; others are dropped by distance (ambient_sound_manager.cpp lines 302-320, caps at lines 306-307). Idea for the per-tick budget (row 12 and row 16): a cap per emitter type. Change our numbers.
- Weapon-size swing and crit cues: playWeaponSwing(size, isCrit) (combat_sound_manager.cpp line 137) and playImpact(size, impactType, isCrit) (line 173). Idea for row 12 combat sound cues: swing sound by size class, impact by impact type, a crit variant. Change our size classes and the crit sound.
- Server-authoritative loot and death: loot and death come as server packets (src/game/inventory_handler.cpp and combat_handler.cpp, grep-matched; not read). Idea for rows 17-18: the client only renders what the server reports. Keep this as a ruling check; not a sound or visual asset.

## Briefs
See the .assets.json briefs array (four briefs: biome bed, fade stinger, capped emitters, weapon-size cue). Dom rule: recreate as a clearly distinct original; never copy the music or any WoW sound.

## Cross-link (cell topics)
- sound-music: ambient beds, fades, emitter caps (above). The music itself is not usable.
- combat sound (row 12): combat_sound_manager.cpp (above).
- hud-ui: src/ui (grep-matched minimap and frames) not read.
- progression and loot: src/game/inventory_handler.cpp and quest_handler.cpp (grep-matched) not read.
- spawns: src/core/entity_spawner.cpp listed, not read.

## Not read
- src/game/ and src/ui/ beyond grep matches; src/network, src/rendering, src/pipeline.
- Shader contents (.glsl, .spv binaries not opened).
- Music file contents (mp3, not opened).
- The 6 PNG contents.
- Data/ JSON contents beyond their file names.
- extern/ (third-party licences) and tests/.
- The Lua addon scripts.
