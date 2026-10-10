# ValveSoftware-source-sdk-2013 (asset audit, cell AU054)

Donor/Licence: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/`. Code licence: Source 1 SDK LICENSE (LICENSE:1), Valve copyright (LICENSE:3). Asset licence: none separate; the same LICENSE covers the SDK as shipped.

Checked: root listing, LICENSE (full terms, lines 1-40), README.md (build and distribution notes), thirdpartylegalnotices.txt (headings and the Godot and Fast Pow entries), game/ tree and counts by type, game/mod_hl2mp/scripts/weapon_ar2.txt (head and sound block), game/mod_hl2mp/scripts/HudAnimations.txt (command comments), game/mod_hl2mp/scripts/soundscapes_streetwar.txt (one random block), game/mod_hl2mp/resource/mod_hl2mp_english.txt (key count via iconv, UTF-16).

Which half: DATA half read (game/ scripts, resource strings, HUD animation rules). CODE half: not in the box for this review (the src/ tree was not read; README says mods build from src/ against a Steam install). Paired retail data: Source SDK 2013 Multiplayer, installed via Steam (README.md:18).

## Licence and rights
- LICENSE: free to use, copy and modify the SDK to develop a modified Valve game on the Source 1 engine (LICENSE:9). Distributions of the SDK must (1) be free of charge, (2) include the LICENSE and third-party notices, and (3) include the copyright notice and the added provisions (LICENSE:13). The file says what it says; no legal reading here.
- Rights holder: Valve Corporation (LICENSE:3). Original company.
- Third-party notices file lists engines and libraries used by Valve (e.g. Godot Engine at thirdpartylegalnotices.txt:890-893, Fast Pow Function at :630). Notices, not assets.
- Game art, models, sounds: not in the box. Counts over game/: 0 .mdl, 0 .wav, 0 .mp3, 0 .vvd, 0 .phy. Present: 2 .vmt, 1 .vtf (1.4 MB logo), 1 .bsp (11.4 MB map dm_lockdown.bsp), 29 .txt, 8 .res, 3 .lst.

## Asset inventory (what is in the box)
- game/mod_hl2mp/scripts/: weapon scripts (one per weapon), HudAnimations.txt, game_sounds_*.txt, soundscapes_*.txt (several), launcher and HUD layout .res files, key-binding .lst files. Text data. Class C.
- game/mod_hl2mp/resource/mod_hl2mp_english.txt (UTF-16; about 65 lines; 48 quoted keys by iconv count; key prefixes HL2, HL2MP, ScoreBoard, Playerid, Game). Localised strings with a full-name key and a menu key suffix. Class C.
- game/mod_tf/resource/mod_tf_english.txt: UTF-16 string table; not counted (encoding check gave an unusable count). Class C.
- game/mod_hl2mp/maps/dm_lockdown.bsp: 11,384,400 bytes, binary map. Not opened. Class C.
- game/mod_tf/materials/logo/new_tf2_logo.vtf (1,398,288 bytes) and .vmt: a logo texture and its material. Not opened. Class C.
- game/mod_hl2mp/materials/example_model_material.vmt (202 bytes): example material text. Not opened.

## Class per group
- Scripts and strings (text data): C (SDK licence; free-of-charge distribution condition in LICENSE:13).
- Map and logo textures: C (binary, not read).
- No model, sound or music files in the box.
Best class: C.

## Inspiration (category level; proprietary donor, so shape and mechanism only)
- Weapon as a data row: one script per weapon holds a display-name key, a view model and a player model reference, an ammo type, clip size, reserve, damage, a bucket and a slot position for the weapon wheel, and sound slots by event (single shot, double shot, reload, empty, special). Each event also has an NPC variant (weapon_ar2.txt:5-26 region). Keep: sound slots per event with an NPC or AI variant. Change: our weapon rows in the catalogue, fewer fields, our own names.
- HUD motion as a tiny script: one line animates a panel property (colour, position, size, alpha) to a target with a named easing (Linear, Accel, Deaccel), and events can start or stop other events at a time (HudAnimations.txt:20-21 and the command comments). Keep: named easing and event chaining for UI. Change: our own motion language, e.g. a small overshoot on hit feedback.
- Random ambience bed: a soundscape block picks a wave at random from a pool, with a time range and a volume range, so ambience never loops the same way (soundscapes_streetwar.txt:21 region). Keep: interval range, volume range, wave pool. Change: our own biome sample sets, never the donor's files.
- Two-length labels: each item has a full-name key and a short menu key with a suffix. Keep: a long label for the detail view and a short one for menus and narrow HUD. Change: our own copy.
- Two-line display name: some display names put a parenthetical subtitle on a second line. Keep the pattern (name then a short subtitle) for a 375 wide phone screen. Change: our own names.

## Inspiration briefs
1. Rifle with NPC shot variants. Why it works: a rifle has a distinct sound per shot type, and the NPC version is separate so AI shots can be mixed without changing the player's sound. Keep: sound slot per event with an NPC variant. Change: our own weapon, our own sound slots, no Valve sound names. Ref: game/mod_hl2mp/scripts/weapon_ar2.txt:5-26.
2. Two-line weapon name. Why it works: a short name plus a parenthetical subtitle reads on a narrow screen without truncation. Keep: name then subtitle. Change: our own names and subtitles. Ref: game/mod_hl2mp/resource/mod_hl2mp_english.txt (key grammar only; not quoted).
3. Random ambience bed. Why it works: a random pick with a time and volume range stops ambience from feeling looped. Keep: interval range, volume range, pool. Change: per-biome pools of our own sounds. Ref: game/mod_hl2mp/scripts/soundscapes_streetwar.txt:21 region.
4. Eased HUD motion vocabulary. Why it works: three named curves cover most UI motion. Keep: named easing and event chaining. Change: a different curve set and our own hit-flash timing. Ref: game/mod_hl2mp/scripts/HudAnimations.txt:20-21.

## Cross-link
- Sound: the weapon sound slots and the random ambience block (sound-music fold-in: layering and ambience beds; this donor has the random-pick bed, not the crossfade). Hud-ui: the HUD motion script and the two-length label pattern. Loot and progression: the weapon row (fields only). Camera, spawns, VFX, animation: not in the box (model and material files absent).

## Not read
- The src/ code tree. The two binary maps and textures (.bsp, .vtf) beyond sizes. The full soundscape and game_sounds files beyond one block. The UTF-16 strings body beyond the key count. The third-party notices beyond the headings I cite.
