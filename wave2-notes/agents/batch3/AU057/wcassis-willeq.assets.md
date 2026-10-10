# wcassis-willeq (asset audit, AU057)

Donor: /mnt/frankendom-donors/wcassis-willeq/ (EverQuest Titanium client, "WillEQ", C++ with Irrlicht)
Halves read: CLIENT (src/client audio and graphics files named below). Server half: not in the box (src has only client and common). Data pack: read at head only. Common half: not read.
Code licence: GPL-3.0 (LICENSE line 1; README line 715).
Asset licence: none stated for game assets. README line 266 requires the user's own EverQuest Titanium client files.
Rights-holder status: fan/unofficial client. README line 717: EverQuest is a registered trademark of Daybreak Game Company LLC. No game art, model, texture or sound file is in the box.
Best class: C (only permissive items are code libraries, not assets).

## 1. Licence files
- LICENSE: GNU GPL v3 text (receipt: LICENSE line 1).
- README.md line 715: "licensed under the GNU General Public License v3.0".
- Third-party headers: miniaudio.h and dr_wav.h offer public domain or MIT-0; minimp3.h has a public-domain dedication; tsf.h and tml.h are MIT (docs/reference/music.md line 12).
- No CREDITS or NOTICE file. No per-folder asset licence found.

## 2. Asset inventory
- Game art, models, textures, sound (S3D, WLD, MP3, WAV, PNG, DDS and similar): none in the box (find returned nothing). Class D.
- data/1mgm.sf2: one SoundFont, 1,090,280 bytes. The code (audio_manager.cpp lines 59-65) looks for it in the EQ install folder first. The first 1.2 KB, read with strings(1), contains "General MIDI" and "Copyright (c) E-mu Systems, Inc., 1993". Binary: not receipt-checked. No licence file. Class C.
- data/zone_lines/*.json: 117 files, one per zone. Zone key, long name, zone-line target, trigger coordinates, landing rule. Class C (game-derived, no licence).
- data/zone_points.json: zone-point table. Class C.
- data/item_models.json: item id to model number table. Class C.
- docs/reference/s3d_contents_reference.md: 34 MB text dump of pre-Luclin S3D archive contents (header read). Class D for reuse: do not use.
- docs/reference/eq_audio_assets_catalog.md: catalogue of game music files (82 XMI, 78 MP3 by its own summary table). Class C.
- docs/reference/zone_textures/: 9 text lists of texture names (not read). Class C.

## 3. Rights-holder status (from repo files only)
Fan client. Trademark line in README. Needs a copy of the game. Original game data is not in the repo. Nothing else is stated.

## 4. Inspiration (category level for class C/D sources)
- Zone ambience as emitters: each source has a radius and a fade-out time, and fades in over half of that, capped at 5 s (zone_sound_emitter.cpp lines 160-166). Idea reusable with our own beds.
- Day and night variants of one ambience swap with a 2 s crossfade (zone_audio_manager.cpp line 137).
- Music follows position: the nearest music region that contains the listener wins (zone_audio_manager.cpp lines 247-268). Biome change equals region change.
- Weather as a timed state machine: check interval, per-weather duration, 10 s blends, rain chance summed over four slots out of 400, then a storm/rain/light split (weather_system.cpp lines 19-47, 168-238). Timer and blend logic transfer; particles do not need to.
- Cast visuals chosen by spell style: spray cone or glow, colour from the spell, lifetime set to the cast time (spell_visual_fx.cpp lines 327-345).
- Rain as a spell: a radius-scaled rain volume lasting the spell duration (spell_visual_fx.cpp lines 633-650).
- Zone connections as one JSON per zone with trigger point and landing rule (data/zone_lines/).
- Item to model as a plain id-to-number table loaded from data (data/item_models.json; loader at entity_renderer.cpp lines 2339-2342).

## 5. Briefs (5)
Each brief: a recreated original, never a copy. Trait KEPT and trait CHANGED are listed in the JSON.
1. Cast-spray cone: spell colour spreads as a cone or a glow (spell_visual_fx.cpp 327-345). Kept: colour from spell, two styles, lifetime equals cast time. Changed: our own cone shape, a gold-and-smoke palette, a ring burst at the end.
2. Rolling storm front: weather on a timer with 10 s blends (weather_system.cpp 19-47, 168-238). Kept: check interval, per-weather duration, blend. Changed: fog and light dimming instead of rain particles; one forecast cue on the HUD.
3. Zone-line rift: trigger volume plus landing point in one per-zone data file (data/zone_lines/kurn.json, head only). Kept: trigger and landing as data. Changed: a torn ground seam with a hum; the landing is a ring on the ground.
4. Dual-state ambience bed: two variants of one loop, crossfaded (zone_audio_manager.cpp 110-148, 137). Kept: two variants, crossfade, one flag. Changed: switch on combat state, not time of day; a low-health third variant.
5. Nearest music region: overlapping music regions resolved by distance (zone_audio_manager.cpp 247-268). Kept: point-plus-radius regions, nearest wins. Changed: blend by weight instead of a hard switch; fight state breaks ties.

No creature, item or armour brief: the box has no creature or armour art. The S3D dump is proprietary and was not used for design detail.

## 6. Defects in the donor (keep the idea, fix the defect)
- zone_sound_emitter.cpp lines 209-227: calculateVolume takes listener distance, but only uses it for the radius gate. Constant emitters are full volume anywhere inside the radius; static emitters use an AsDistance value with a magic 3000 divisor. The listener distance does not drive falloff. Decision: adapt the idea; fix: scale volume from listener distance over the radius, keep AsDistance as per-emitter gain, name the 3000 constant.
- Music region change: zone_audio_manager.cpp line 129 uses a 1 s fade-out at day/night change. Whether region changes crossfade was not read (playMusic not read).

## 7. Cross-link
- zones and camera: zone-line and zone-point data (data/zone_lines, data/zone_points.json) support the zones-as-data rule. Camera code not read.
- sound: emitters, music regions and day/night crossfade (client audio). weather_audio.cpp (381 lines) not read.
- vfx: spell_visual_fx.cpp (1221 lines); only the cast glow and rain functions were read.
- loot: data/item_models.json only. Loot logic not read.
- spawns: not read. hud-ui, animation, progression: not read.

## 8. Not read
See the not_read list in wcassis-willeq.assets.json. Notably: server half (absent), common half, weather_audio.cpp, tree_wind_controller.cpp, playMusic crossfade, UI, loot and spawns. The donor CLAUDE.md is data and was not followed.
