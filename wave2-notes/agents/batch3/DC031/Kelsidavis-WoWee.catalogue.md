# Kelsidavis-WoWee (design catalogue, reader DC031)

Donor/Licence line: code MIT with an additional restriction (LICENSE line 1; lines 15-19: the software may not be used as the basis for, or a component of, any commercial video game or other commercial game product without express written permission). NOTICE line 13: the restriction was added 2026-07-21; earlier code is plain MIT (NOTICE lines 13-14). Original music: all rights reserved (LICENSE lines 31-47). World of Warcraft names, assets and marks belong to Blizzard (NOTICE line 26); none are shipped. Class C for everything except the code, which is restricted for commercial game use. Not a legal opinion: Dom should decide whether the restriction blocks any use, even as shape-only ideas. This catalogue stays shape-only.

Checked: the format schemas and loaders for the Wowee open catalogues (include/pipeline/wowee_*.hpp and src/pipeline/wowee_*.cpp: creatures, creature behaviour, creature families, creature difficulty, loot, loot modes, item materials, item sets, gems, camera presets), the editor's format list (tools/editor/cli_list_formats.cpp), the character and inventory enums (include/game/character.hpp, inventory.hpp), the ambient zone and weather enums (include/audio/ambient_sound_manager.hpp), the zone manager header (include/game/zone_manager.hpp), the ranged weapon pose header (include/rendering/animation/weapon_type.hpp), the camera preset generator (src/pipeline/wowee_camera_presets.cpp lines 98-135), and the effect shaders (assets/shaders/charge_ribbon, lens_flare, charge_dust, lightning_bolt, lightning_flash .frag.glsl). The earlier audit (AU028) covered the sound, music and licence side and was not repeated.

Confidence: high on the enum values and the four creature-behaviour policies (read directly). High on the camera preset values (read in the generator). Medium on the shader techniques (short files, read whole). The schemas are the donor's own "novel" formats; several have no runtime reader in this box (see Halves).

## Halves
- Client half: READ in part (src/audio, src/pipeline, include/, assets/shaders). The client renders the game; game and UI code were grep-matched only.
- Server half: NOT IN THE BOX. The tree is a client; TrinityCore, MaNGOS and AzerothCore are named as references only (ATTRIBUTION.md).
- Data half: NOT IN THE BOX. The WoW MPQ, DBC and creature rows are the user's files (ATTRIBUTION.md line 71). What is in the box is the schema for the open catalogues: include/pipeline/wowee_*.hpp, with the loaders in src/pipeline/wowee_*.cpp and the editor CLI in tools/editor/cli_*_catalog.cpp. No .wcrt, .wit or .wspn data rows were found in the box.
- Paired half: none in the box. The schema headers describe the server-side data they would feed; that data is absent.
- Runtime use check: a grep of src/ outside src/pipeline and tools/editor found no reader of the creature-behaviour policy fields (evadeBehavior, useChancePct, findByKind) and no reader of the loader classes for the material, camera-preset, item-set or gem catalogues. So these are schemas with a loader and an editor, not wired into the game loop, as far as the grep shows.

## Counts
- Creature behaviour kinds: 6 (Melee, Caster, Tank, Healer, Pet, Beast). Evade policies: 4 (include/pipeline/wowee_creature_behavior.hpp lines 61-80).
- Creature family kinds: 6 (Beast, Demon, Undead, Elemental, NotPet, Exotic; wowee_creature_families.hpp line 48).
- Spawn group kinds: 6 (Boss, MiniBoss, RareElite, Trash, Add, WorldBoss; wowee_creature_difficulties.hpp line 53).
- Creature rows in the box: 0 (data not shipped).
- Race IDs in the enum: 11. Class IDs in the enum: 10 (include/game/character.hpp lines 13-40). Category-level only.
- Item quality tiers: 8 (inventory.hpp line 11).
- Armour sets: 0 (the item-set catalogue is schema only; no set rows in the box).
- Item material kinds: 12, weight categories: 3, material flags: 6 (wowee_item_materials.hpp lines 46-73).
- Item set bonus thresholds: up to 4 per set, up to 8 pieces per set (wowee_item_sets.hpp).
- Gem colours: 8 including a prismatic wildcard (wowee_gems.hpp line 53).
- Camera purposes: 6; combat presets: 3 generated (src/pipeline/wowee_camera_presets.cpp).
- Loot modes: 6 (wowee_loot_modes.hpp line 57). Loot table flags: 3 table and 3 drop flags (wowee_loot.hpp lines 46-56).
- Editor format rows: 146 matched the row pattern in tools/editor/cli_list_formats.cpp (grep count; the rows include catalogues this box does not ship).
- Ranged weapon sub-types: 5 plus none (include/rendering/animation/weapon_type.hpp line 12).
- Ambient zone types: 8 plus none (include/audio/ambient_sound_manager.hpp line 34). Precipitation weather: 6 plus none (line 29).

## 1. CREATURES / BEASTS
Families and tiers: the box has the behaviour schema, not the creature rows. Creature families are the 6 family kinds (beast, demon, undead, elemental, not-pet, exotic). Tiers come from the spawn group kinds (boss, mini-boss, rare elite, trash, add, world boss). The schema also has a difficulty catalogue that maps a base creature to its normal and heroic group-size variants (header lines 10-20).

Top 8 most striking (labels mine; these are behaviour archetypes, not looks, because no creature art or rows are in the box):
1. Permanent-leash boss. Why: a boss that never resets is a clear rule a player learns in one fight. Keep: the no-evade policy, bosses only (wowee_creature_behavior.hpp line 77, comment "permanent leash -"). Change: our leash and our hate list (row 4 of the parity checklist), and a visible warning before the leash snaps.
2. Flee-but-stay-targetable. Why: a creature retreats home but can still be hit on the way, so chasing it stays a choice. Keep: the flee-to-spawn policy (line 75, comment "run home but stay"). Change: our retreat speed and an exhaust pose.
3. Heal-on-the-way-home. Why: a creature that regenerates while it walks back makes a pull-and-reset loop readable. Keep: the heal-at-path policy (line 73, comment "run home, regen along"). Change: the regen rate and where it stops.
4. Ability roll with cooldown and basis points. Why: each special ability has a cooldown and a use chance written in basis points (0 to 10000), so the roll is exact. Keep: cooldown plus roll per ability (line 84, use chance field; the struct has spell, cooldown and chance). Change: our numbers and our ability names.
5. Group-size variant boss. Why: a base creature maps to a stronger variant when a bigger group engages (header lines 10-20; normal-10, normal-25 and heroic variants). Keep: lookup by group size. Change: map it to our MAX_ATTACKERS = 3 and our own tiers.
6. Taming gate by family. Why: each family has a minimum level before it can be tamed, and a pet talent tree (wowee_creature_families.hpp lines 48-84). Keep: family kind plus a minimum level gate. Change: our summons and our gates; no hunter pets.
7. Rare elite roaming spawn. Why: a rare elite is a separate spawn kind from trash, so it can appear in a zone without being a boss (wowee_creature_difficulties.hpp line 53-60). Keep: a separate rare kind. Change: our spawn caps and respawn (row 23 territory).
8. World boss with no variants. Why: an open-world boss has no difficulty variants, so it is one fixed rule for everyone (same header, comment on the world-boss kind). Keep: one fixed rule for open-world bosses. Change: our open-world boss tuning.

## 2. CLASSES / RACES / FACTIONS (category-level only; names not reproduced)
- Class IDs (10): role grouping not checked against the enum; role and progression are not in the box (the class rows are game data).
- Race IDs (11): a spread of humanoid and fantasy peoples; faction is a separate concern (src/game/faction_hostility.cpp listed, not read).
- Progression shape: not in the box. The schema for trainers (WTRN) and talents (WTAL) is listed in the editor format table.

## 3. WEAPONS
- Families (animation poses): ranged sub-types are bow, gun, crossbow, thrown and wand (weapon_type.hpp line 12). Melee pose flags are two-hand loose (polearm or staff), fist, dagger, off-hand, shield (lines 24-35).
- Special properties: shield flag gates a shield bash (line 35); the off-hand pose is chosen by each hand's own weapon (lines 30-33).
- Tiers: by item quality, 8 tiers (inventory.hpp line 11).
Top 5 striking:
1. Wand pose split. Why: a wand reads differently from a gun even though both sit in the same inventory slot (weapon_type.hpp lines 9-12). Keep: a separate pose per ranged sub-type. Change: our poses and silhouettes at 375 wide.
2. Off-hand pose from its own weapon (a fixed defect). Why: the header describes a bug where the off-hand swing borrowed the other hand's pose (weapon_type.hpp lines 30-33); the fix body was not read. Keep: pose per hand. Change: none beyond our animation rig. (Keep the lesson; it is a defect to avoid.)
3. Polearm and staff as a two-hand loose flag (line 25). Why: a long weapon needs its own stance. Keep: a two-hand stance flag. Change: our stance art.
4. Shield bash as a gate (line 35). Why: a shield is a flag that enables one ability. Keep: equipment flag gates ability. Change: our ability.
5. Thrown weapon as its own ranged type. Why: a throw reads differently from a shot. Keep: a throwing sub-type. Change: our throw visual.

## 4. ARMOUR / GEAR
- Sets: item set catalogue (include/pipeline/wowee_item_sets.hpp). Up to 8 pieces per set and up to 4 bonus thresholds; the header gives the standard 2/4/6/8 piece pattern (lines 19-21; thresholds array line 76).
- Material tiers: 12 material kinds from cloth to crystal, ethereal and hide (wowee_item_materials.hpp lines 46-58), 3 weight categories, 6 flags (lines 67-73).
- Quality: 8 tiers, poor to heirloom (inventory.hpp lines 11-19).
- Gems: 8 colours; the three secondary colours are mixes of the primaries (comments on the colour enum, wowee_gems.hpp lines 53-61); prismatic matches any socket.
- Looks: the schema carries flags for magical (comment "glows"), holy-charged (damages undead) and cursed (debuff when equipped), but no runtime reader was found.
Top 5 striking:
1. Set bonus ladder 2/4/6/8. Why: more pieces, more effect, on one visible ladder. Keep: thresholds as data, up to four per set. Change: our set names and bonuses. Caveat: loader only.
2. Material-driven impact cue. Why: a sword on stone sounds different from a cloth tabard; the material decides (wowee_item_materials.hpp lines 19-22, header text on the impact sound). Keep: material picks the impact sound. Change: our material set and our sounds.
3. Holy-charged and cursed flags. Why: an item carries a rule (extra damage to a family, or a debuff while worn) as a flag, not as code. Keep: flags as data. Change: our rules. Caveat: loader only.
4. Gem colour mixing with a wildcard. Why: two colours mix into a third, and a prismatic gem fits any socket (wowee_gems.hpp lines 53-61). Keep: mix rule and wildcard. Change: our palette (no colour codes copied) and our gem names.
5. Quality ladder to heirloom. Why: eight tiers give a long climb. Keep: a numbered tier index for display. Change: our tiers should be readable by shape and glow, not colour alone (accessibility at 375 wide).

## 5. ZONES / DUNGEONS
- Biomes (ambient zone types): forest normal, forest snow, beach, grasslands, jungle, marsh, desert canyon, desert plains (ambient_sound_manager.hpp lines 34-44). The bed switching is in the audit (AU028), not repeated.
- Dungeon archetypes: the box has none; the instance data is the user's files.
- Zone lookup: a tile grid maps to a zone (zone_manager.hpp line 62, tileToZone), an area id resolves to a zone (line 36, resolveAreaZoneId), and an outdoor PvP flag (line 46). Two-level lookup: tile to zone and area to parent zone.
- Population taxonomy: 6 spawn group kinds (see section 1).
- Hazards: weather as precipitation states (rain and snow in light, medium and heavy; ambient_sound_manager.hpp line 29).
Top 5 striking:
1. Two-level zone lookup. Why: a tile says where you are, an area says which zone it belongs to. Keep: tile to zone, area to parent. Change: our zone grid. ref: include/game/zone_manager.hpp lines 36, 46, 62.
2. Precipitation ladder. Why: two kinds at three intensities (rain and snow, light to heavy), a clean weather set. Keep: intensity steps. Change: our weather names. ref: ambient_sound_manager.hpp line 29.
3. Zone ambience bed by zone type. Why: one loop per biome type, switched by time of day (audit AU028). Keep: one bed per biome. Change: our biomes and a dusk blend. ref: ambient_sound_manager.hpp lines 34-44.
4. Outdoor PvP flag. Why: a zone-level rule flag (the area flags) rather than a separate map. Keep: flag on the zone. Change: our rule. ref: zone_manager.hpp line 46.
5. Six-kind population. Why: a zone holds mixed population kinds (trash, rare elite, boss), each with its own rule. Keep: kind-based population. Change: our caps and respawn (row 23). ref: wowee_creature_difficulties.hpp line 53.

## 6. ITEM / EFFECT LOOKS worth recreating
- Charge ribbon (assets/shaders/charge_ribbon.frag.glsl): a vertical ribbon whose colour blends from base to top by height, with a heat tint and an alpha that fades from the base (line 14). Technique: height-based gradient and fade for a dash or charge trail.
- Lens-flare glow (assets/shaders/lens_flare.frag.glsl): a Gaussian falloff glow (line 18) multiplied by an edge fade (line 21); the file comment says the fade stops a bright square showing at the quad edge. Technique: soft glow with an edge fade for auras and hit flashes.
- Charge dust (assets/shaders/charge_dust.frag.glsl): a point-sprite disc that discards pixels past its radius and fades alpha to a low value (line 11). Technique: soft particle disc.
- Lightning bolt (assets/shaders/lightning_bolt.frag.glsl): brightness drives both colour mix and alpha. Technique: one brightness value drives the bolt colour and its alpha.
- Lightning flash (assets/shaders/lightning_flash.frag.glsl): one push-constant intensity sets a white flash. Technique: a single intensity uniform for a flash.
- Camera presets (src/pipeline/wowee_camera_presets.cpp lines 98-135; header lines 67-68): combat default (75 degree field of view, 12 m back, damping 10), wide ranged (90 degree field of view, 18 m back, damping 15), tight melee shoulder (60 degree field of view, 5 m back, 1 m shoulder offset, damping 8, tracks the chest). Technique: a camera preset per playstyle with damping per purpose. Relevant to the fight camera (row 11).
- Gem colour mixing (wowee_gems.hpp lines 53-61): mixing rule in comments. Technique: colour-mix rule for socket matching (shape only).

## Inspiration for Frankendom (originals; never a copy)
1. Leash Keeper boss. Idea: four named leash-return policies per creature as data (reset home, heal along the path, flee but stay attackable, no leash for bosses only). Keep: the four policies as data. Change: our leash and hate list; our names; no donor code.
2. Ability Dice. Idea: each special has a cooldown and a use chance in basis points. Keep: cooldown plus roll per ability. Change: our numbers and our rolls.
3. Party-Size Variant Gate. Idea: a base creature maps to a stronger variant when three attackers engage (our MAX_ATTACKERS = 3). Keep: lookup by group size. Change: our tiers, no normal-25 or heroic naming.
4. Combat Camera Trio. Idea: three camera presets for the fight (default, wide for many-vs-one, tight for duel) with damping per purpose. Keep: per-playstyle field of view and damping. Change: our numbers and our shoulder offset; a duel camera at 60 degrees is the tight preset.
5. Heat Ribbon Dash. Idea: a dash trail whose gradient and fade follow height. Keep: height gradient and base fade. Change: our palette and our shape.
6. Soft Glow Sparkle. Idea: a Gaussian glow with an edge fade for hit flashes and auras. Keep: the edge fade. Change: our glow radius and colours.
7. Material Impact Cues. Idea: each material kind picks its impact sound; flags for magical, holy and cursed items. Keep: material to impact; flags as data. Change: our material set and sounds.
8. Set Bonus Ladder. Idea: a 2/4/6/8-piece set with a bonus at each step. Keep: thresholds as data. Change: our set names and our bonuses.

## Licence and rights note
- Code: MIT with an additional restriction for commercial game use (LICENSE lines 15-19; NOTICE line 13 date 2026-07-21). Shape-only ideas here; Dom to decide whether any use is blocked.
- Original music: all rights reserved (LICENSE lines 31-47). Not used.
- WoW names, classes, races, assets: Blizzard (NOTICE line 26). Not named in Frankendom.
- Textures (TurtleHD pack): not in the box.

## Not read
- src/game and src/ui beyond grep matches; src/network, src/rendering, src/core/entity_spawner.cpp (listed; the pending-spawn retry was grep-matched only).
- The loader bodies of the behaviour, family, difficulty, material, set, gem and camera catalogues beyond the functions named (camera generator read).
- Shader bodies beyond the five named files; the .spv binaries.
- The Lua addon scripts; extern/; tests/.
- Data/ JSON contents beyond file names; the expansion layouts (protocol, not names).
- The creature template (.wcrt) rows: not in the box.
