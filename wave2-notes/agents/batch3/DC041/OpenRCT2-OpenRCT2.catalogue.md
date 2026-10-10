# Design catalogue: OpenRCT2-OpenRCT2 (DC041, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/OpenRCT2-OpenRCT2/
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU040/OpenRCT2-OpenRCT2.assets.md (and .assets.json)
Donor class for inspiration: C for the art, language and sound resources (no asset licence in the box; the park objects are a separate download not in the box). Code is GPL-3.0 or later (licence.txt line 1), and the game is a re-implementation of a commercial game (readme.md line 11), so every mechanic below is clean-room, shape only.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED. This is design inspiration, not a legal opinion.

Headline for Dom: this donor is a theme-park simulator. The box has no beasts, dragons, monsters, weapons or armour. The creature, weapon and gear sections below are therefore empty by design, not skipped. The useful content is in weather, climate zones, helper-staff state machines and the palette and gloom looks.

## Which half was read
- Data half: read. data/language/en-GB.txt (3860 STR lines counted; values not quoted), data/shaders/ (applypalette and related GLSL), data/scenario_patches (142 .parkpatch files, names counted only).
- Code half: read by cited lines. src/openrct2/world/Weather.h and Weather.cpp (weather states, forecast, sound, lightning, gloom), src/openrct2/entity/Staff.h and Staff.cpp (staff types and fixing, security, patrol), src/openrct2/rct12/RCT12.h (legacy climate enum), src/openrct2/Date.h (month count), src/openrct2/object/ClimateObject.cpp (pattern lookup).
- Matching other half: the paired data pack (objects.zip, the park objects with rides, scenery, guests and costumes) is named in assets.json and is NOT in the box. Climate pattern values come from that climate object, so the distribution numbers are not in the box.

## Data tables used (names and structure, not loaders)
- data/language/en-GB.txt: staff labels (STR_0768 to STR_0771), hire verbs (STR_1700 to STR_1703), staff plural and singular labels (STR_1859 to STR_1866), costume prompt (STR_1946), a monster-truck ride name and a circus animal show attraction (the only creature-like words, both attractions).
- src/openrct2/world/Weather.cpp:48-58: kWeatherTraits table, nine rows (temperature delta, effect, gloom level, weather level, sprite).
- src/openrct2/world/Weather.cpp:85-90: gloom colours, four entries.
- src/openrct2/world/Weather.h:24-40: weather type enum (9 types), climate months (8), distribution size (23).
- src/openrct2/rct12/RCT12.h:45-51: climate enum (4 climates).
- src/openrct2/entity/Staff.h:31-38: staff type enum (4 types).

## Counts (basis in brackets)
- creatures: 0. No creature, beast or monster data in the box [grep of en-GB.txt and of src/openrct2 entity, peep, world, object folders for creature, beast, monster, dragon: no creature hits; the two locale hits are an attraction and a ride name].
- classes: 4 helper staff types [Staff.h:31-38]. The visitor type is one more (guest, STR_0767), not counted as a class. Costumes exist for entertainers (STR_1946) but costume data is in the objects pack, not in the box.
- weapons: 0. No weapon data in the box. The nearest are weather hazards (lightning, blizzard), not weapons.
- gear_sets: 0. No gear in the box.
- zones: 4 climates [RCT12.h:45-51]. Plus nine weather states, which are hazards and moods, not zones.

## 1. Creatures and beasts
None in the box. Nothing ranked. The park's living things are visitors (guests) and staff, which are in section 2. The creature sprites and the park objects are in the objects pack, not in the box.

## 2. Classes, races and factions

Helper staff (four types, Staff.h:31-38):
- Handyman: sweeps paths, waters, mows, empties bins (Staff.cpp:1037 mowing, :1085 watering, :1147 bin, :1227 sweeping; path finding at :495). Patrol-style jobs, idle-to-task loop. Progression: no progression ladder found in the code read (wage function at Staff.cpp:2645 not read).
- Mechanic: fixes and inspects rides. Runs a multi-step fixing state machine (Staff.cpp:2003-2060): enter station, move to the broken vehicle, fix the restraints or doors, fix a malfunction, move to station end or start, fix the brakes, move to exit, finish fix or inspect, leave by the entrance. Path finding at :754.
- Security guard: patrols an area set by the player (patrol area setters at Staff.cpp:265-293). Walk animation switches to an alternate slow group when the patrol path is crowded (Staff.cpp:1718-1735).
- Entertainer: nearby-guest update at Staff.cpp:889; costume choice exists (STR_1946). Function body not read.

Visitor: guest (STR_0767; a locale label, the guest code was not read). Not read in detail; guest behaviour is in the peep code, not in this pass.

Factions: none. Climate is the closest analogue to a faction, see section 5.

Top striking helpers (silhouette at 375 px, one signature behaviour, one signature sound or effect):
1. Mechanic (fixer). Signature behaviour: a mid-job upgrade from inspecting to fixing when a breakdown shows up during the inspection (Staff.cpp:2018-2019, comment at :2018). Keep: the inspection-to-fix upgrade and the long substate list. Change: our responder revives a downed teammate in the fight zone; no station, no brakes.
2. Security guard (warden). Signature: the walk changes to a slower group when the path is crowded (Staff.cpp:1718-1725). Keep: crowd-aware walk. Change: our guard slows near crowds and quickens on alarm.
3. Handyman (sweeper). Signature: a patrol loop with a short idle between tasks (Staff.cpp:1852 updatePatrolling). Keep: the task-patrol loop. Change: our helper patrols a shrine ring, not a park path.
4. Entertainer (performer). Signature: an area effect over nearby visitors (Staff.cpp:889, body not read). Keep: a nearby-group effect with a costume tag. Change: our performer buffs allies in a radius with a visible aura; body to be read before reuse.

Progression shape: none for helpers in the box. The mechanic's substates are the nearest thing to a progression ladder.

## 3. Weapons
None in the box. Hazards (lightning, storms, blizzards) are in section 5 and the weather state table, not in weapon data.

## 4. Armour and gear
None in the box. Staff costumes exist as a prompt (STR_1946) but their data is in the objects pack.

## 5. Zones and dungeons

Climate zones (four, RCT12.h:45-51): cool and wet, warm, hot and dry, cold. Each climate has a monthly pattern set (eight months, Weather.h:39), a base temperature, a random bias and a 23-entry distribution table of weather types (Weather.h:40). Pattern values come from the climate object in the objects pack (not in the box). Lookup is by game month (Weather.cpp:115; ClimateObject.cpp:102).

Weather states (nine, Weather.cpp:48-58), with temperature delta and gloom level as written in the trait rows:
- sunny (temperature +10, gloom 0), partly cloudy (+5, gloom 0), cloudy (0, gloom 0), rain (-2, gloom 1, light), heavy rain (-4, gloom 2, heavy), thunderstorm (+2, gloom 2, heavy, storm effect), snow (-10, gloom 1, light), heavy snow (-15, gloom 2, heavy), blizzard (-20, gloom 2, heavy, blizzard effect).

Dungeon archetypes: none in the code read. The park is open terrain as far as the read files show.

Hazards: thunder and lightning only in storm and blizzard effects (thunder base chance 0x1B4 for storms and 0x6D for blizzards, Weather.cpp:214-221); the rate is shifted down by game speed. The climate also carries cold and warm temperature thresholds for items (Weather.h:49-59); which items those are was not read.

Top 5 striking (for zone mood, not combat):
1. Storm front. Signature: a rain or storm state that steps one unit at a time toward the forecast (Weather.cpp:164-197), with lightning flashes and a thunder timer (Weather.cpp:221-225). Keep: stepwise transitions, the forecast timer, the storm-only lightning, the lightning rate that drops at higher game speed. Change: zone-bound forecast; the flash is a readable silhouette cue at 375 px.
2. Heavy snow and blizzard. Signature: a blizzard row with the largest cold delta and the heaviest gloom (Weather.cpp:57). Keep: gloom and cold together. Change: our blizzard is a fight-zone hazard with a slow debuff, not a park mood.
3. Gloom ladder. Signature: four discrete darkening steps keyed by the weather gloom level (Weather.cpp:85-90). Keep: discrete steps. Change: our steps are tuned to a threat level.
4. Thunderstorm with cold-tinted sky. Signature: storm effect with a warm temperature delta (+2) and heavy gloom, so the storm is not the coldest state. Keep: the counter-intuitive temperature choice. Change: our storm is the hottest state in the desert zone.
5. Four-climate split. Signature: each climate has its own eight-month distribution (Weather.h:39-40). Keep: data-driven climate per zone. Change: our climates are fight zones with a threat season.

## 6. Item and effect looks worth recreating (technique, not art)
- Palette-index recolour: one 8-bit index texture is read and looked up in a 256-entry palette uniform in the fragment stage (data/shaders/applypalette.frag:3, :12). Use: a zone colour grade or a damage flash on one sprite set. Keep: one index texture, one palette lookup. Change: our palettes are zone data, not ride or team colours.
- Gloom steps: four named filter palettes (null, darken 1, darken 2, darken 3) keyed by gloom 0-3 (Weather.cpp:85-90, :312-321). Use: a dimming ladder for night, storm or a threat level. Keep: discrete steps. Change: our ladder is a cool grade with a vignette.
- Lightning flash: a flash flag set with a random roll while a lightning timer runs (Weather.cpp:459-461; the renderer that reads and clears gLightningFlash was not read, so the flash length is unknown). Use: a storm flash cue. Keep: random per-frame roll and a short timer. Change: our flash is a rim light on the nearest fighter only.
- Weather sound ramp: the rain bed rises in fixed steps of 80 to a capped volume, and fades out in steps until below a floor, then stops (Weather.cpp:388, :399). Use: an ambient rain bed per zone. Keep: stepped ramp in and out with a floor. Change: our bed crossfades at zone borders.
- Glass and translucent map palettes (audit only, not re-read): resources/palettes/map_glass, map_translucent. Use: a dimmed overlay for a minimap that keeps terrain readable.
- Bitmap font size ladder (audit only): one face in bold, small and tiny sizes (resources/fonts/latin). Use: a readable HUD size ladder at 375 px; our HUD uses one sans with weight steps.

## 7. Inspiration for Frankendom

Each original names what we keep and what we change. Parity rows are from the fight-parity checklist.

1. Storm Front (zone weather). Idea: each zone runs a weather state that steps one unit at a time toward a forecast, with a storm that flashes and a thunder timer. Keep: stepwise transitions on a fixed tick boundary (Weather.cpp:164); a forecast timer (Weather.cpp:368); storm-only lightning; lightning rate that drops with game speed. Change: the forecast belongs to the zone, not the server clock; the lightning is a 1-frame rim flash plus one thunder cue. Row 16 (colour grade), row 12 (combat sound cues), row 23 (zone population as zone data).
2. Gloom Ladder. Idea: four discrete darkening steps keyed by a gloom value that each weather or zone sets. Keep: discrete steps and a mapping table. Change: our steps are tuned to a threat level and use a cool grade. Row 16 (colour grade).
3. Rain Bed Ramp. Idea: an ambient bed that rises in fixed steps to a cap and fades out in steps until a floor. Keep: stepped ramp, cap and floor. Change: zone beds that crossfade at border tiles. Sound fold-in (ambience beds per biome and border crossfades).
4. Responder Mid-Job Upgrade. Idea: a responder that begins by inspecting a downed object and switches to repairing when the fault shows. Keep: the mid-job upgrade and the substate list. Change: revives a downed teammate in fight zones, no station and brakes. Row 17 (death and respawn), row 18 (XP award).
5. Crowd-Aware Warden. Idea: a patrol guard whose walk switches to a slow group when its path is crowded. Keep: crowd-aware walk switch and patrol area. Change: slows near crowds and quickens on alarm, with a stance cue. Row 7 (creature actor and clips), row 4 (aggro and leash).
6. Helper Roles. Idea: four NPC helpers, each with one job loop (sweep, repair, guard, perform). Keep: one role per helper with one signature job. Change: our helpers are fight-zone roles (medic, fixer, warden, bard). Row 2 (AI brain).
7. Palette-Index Zone Grade. Idea: one index texture per sprite set, looked up through a 256-entry palette per zone. Keep: index texture plus palette lookup. Change: zone grade only, no team or ride colour. Row 16 (colour grade), row 15 (gear dressing).
8. Climate per Zone. Idea: each zone has a climate with a month-by-month distribution of weather states. Keep: data-driven climate with a pattern per season. Change: our seasons are the match phases; a threat season changes the mix. Row 23 (zone population as zone data), row 20 (catalogue as runtime source).

## Licence note
Code: GPL-3.0 or later (licence.txt line 1; readme.md section on licence, per AU040). Re-implementation of a commercial game (readme.md line 11). The game needs the original game's files to play (readme.md line 74). Clean-room status is not stated in the files. Assets: no asset licence in the box; the separate downloads (objects, music, sound effects, title sequences, replays) have sha256 pins in assets.json but their licences are not in the box. Clean-room, shape only; no art, sound or language text reproduced.

## Also seen (addendum topics)
- Idle and ambient vocabulary: the security walk switch (Staff.cpp:1718-1735) is the only idle-style animation switch read. Staff have idle-to-task loops (Staff.cpp:1852).
- Death and respawn presentation: the mechanic's fixing state machine is the nearest loss-recovery flow (Staff.cpp:2003-2060): a breakdown is a loss, the responder is the recovery.
- Boss intro and finisher staging: none in the box.
- Readability at 375 px: the gloom ladder and the lightning flash are the only readability-relevant looks read; the HUD and font ladder were not read beyond names.
- HUD, minimap, touch: not read beyond the map palette names (audit).

## Not read or not in box
- Objects pack (objects.zip): rides, scenery, guests, costumes, climate patterns (climate values). Not in the box.
- Music, sound effects, title sequences and replays: not in the box (listed with sha256 pins in assets.json).
- src/openrct2 beyond the cited files: peep and guest behaviour, ride logic, the rendering path that consumes gLightningFlash, Staff.cpp wage function (:2645) and the entertainer body (:889).
- 27 other locale files (counted in the audit, not read).
- data/scenario_patches/*.parkpatch: names counted (142), contents not read.
- resources/mac/Assets.car and resources/mac/Archived: names only.
