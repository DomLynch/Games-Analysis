# Design catalogue: wcassis-willeq (DC059, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/wcassis-willeq/ (fan client for the EverQuest Titanium client, C++ with Irrlicht)
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU057/wcassis-willeq.assets.md
Donor class for inspiration: C. Code is GPL-3.0 (LICENSE line 1; README.md line 715). No game asset file is in the box, and no asset licence is stated. README.md line 266 says the user needs their own EverQuest Titanium client files. README.md line 717 says EverQuest is a registered trademark of Daybreak Game Company LLC. Per the brief, inspiration stays CATEGORY-LEVEL: no instance-level creature, race, zone or look is recreated. This is design inspiration, not a legal opinion.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED.

Note on the audit: the AU057 inventory does not list the config/ folder (12 JSON files). That folder holds race, spell, weather, environment and tree-wind tables that the client reads. It is read here and the gap is flagged below.

## Which halves were read
- Client half, read: src/client/graphics/eq/race_codes.cpp (race table loader), src/client/graphics/environment/boids_manager.cpp (ambient flocks and their biome rules), src/client/graphics/environment/spell_emitter_presets.cpp (spell style lookup), src/client/graphics/spell_visual_fx.cpp (cast glow, lines 327-339), src/client/graphics/weather_system.cpp (weather state machine, lines 168-240), src/client/audio/creature_sounds.cpp (creature sound prefixes and variants), src/client/audio/zone_sound_emitter.cpp (volume, lines 209-226), src/client/audio/zone_audio_manager.cpp (crossfade constant, line 137), src/client/combat.cpp (target priority, consider colour, aggro, melee range, lines 746-1265 as listed).
- Config half, read: config/race_models.json (185 race rows), config/spell_effects.json, config/weather_effects.json, config/environment_effects.json, config/tree_wind.json, config/music_events.json (small, read whole); config/detail_objects.json and config/ui_settings.json (top-level keys and structure only).
- Data half, read for counts and structure: data/zone_lines.json (106 zone entries), data/zone_lines_unresolved.json (3 entries), data/zone_lines/ (117 files, counted), data/zone_points.json (582 entries), data/item_models.json (3661 entries, item id to model number). Contents of the per-zone files not opened.
- Common half: src/common holds net, util and performance_metrics.cpp only. It has no class, race or creature table. Read by listing only.
- Server half: absent (src has only client and common). The race and class ids the client uses are not defined in the box.
- Reference docs: docs/reference/pre_luclin_zones.json read for its three expansion groups (classic, kunark, velious). Other docs names only.

## Data tables used (names, not loaders)
- config/race_models.json: race id to model code, scale, gender variant, animation source, invisibility (185 rows).
- config/spell_effects.json: 8 resist colour keys and 9 spell visual styles, plus a global particle cap.
- config/environment_effects.json: 10 ambient emitter types, the boids block.
- config/weather_effects.json: storm, storm clouds, rain overlay, snow overlay.
- config/tree_wind.json: tree motion multipliers per weather.
- src/client/graphics/environment/boids_manager.cpp: biome to ambient creature rules, day and night.
- src/client/audio/creature_sounds.cpp: race sound prefixes (98 rows) and the seven sound types.

## Counts (basis in brackets)
- creatures: 185 race rows [config/race_models.json]. The file mixes playable and creature races and has no flag to tell them apart, so this is a race count, not a creature count.
- classes: 16 player class ids [combat.cpp line 1039, the class_id range 1 to 16]. The class names are not in the box.
- weapons: 0. No weapon table in the box. The spell visuals are not weapons (see section 3).
- gear_sets: 0. No armour or set table in the box. data/item_models.json maps 3661 item ids to model numbers; that is a lookup, not a gear set list.
- zones: 106 zone-line entries [data/zone_lines.json]; 117 per-zone files; 582 zone points. Three expansion groups in docs/reference/pre_luclin_zones.json.

## 1. Creatures and creature families (category level)
Creature models and animation are S3D archives that are not in the box. The creature picture comes from the race table, the creature sound table and the ambient flock rules.

Families (category level only):
- Body-scale tiers: 11 race rows at scale 3.0 (the giant category), 13 rows at 0.3 or less, two of them zero-scale and flagged invisible (config/race_models.json; scale at line 270 and line 433; invisible flags at lines 3513 and 4550).
- Gender variant rule: 44 race rows carry a separate female code (race_models.json, gender_variants field).
- Animation borrowing: 9 rows name another race's animation source; 11 rows have a fallback code (race_models.json).
- Race sound sets: 98 race prefixes, each with seven sound types (attack, damage, death, idle, special, run, walk). Each type has a base file and up to three numbered variants (creature_sounds.cpp lines 14-154, 156, 166-181, 206-216).
- Ambient flocks: seven flock types spread across ten biome cases, with day and night sets (boids_manager.cpp lines 271-340).
- Melee reach by body size: dragon-band race ids get a 1.5 size factor and giant-band race ids a 1.3 factor (combat.cpp lines 1251-1253).

Escalation: none in the client. Escalation of threat is not in the box (the server holds level and spawns, not read).

Top 8 (category level, each with a file path):
1. Giant body tier. Why: one scale value sets a large silhouette and a longer melee band. Keep: a size field that drives reach and camera framing. Change: our own giant silhouettes, readable at 375 wide, with scale from our own data file. Ref: config/race_models.json line 270.
2. Tiny body tier. Why: very small bodies read as a crowd or dust at distance. Keep: a size floor for swarm bodies. Change: our swarm uses a clump silhouette, not a small copy. Ref: config/race_models.json line 433.
3. Size-banded melee reach. Why: a big body gets a longer band the player can see. Keep: reach scales with target size. Change: the band comes from our race data, not from race-id ranges. Ref: src/client/combat.cpp lines 1251-1253.
4. Day flyers and night bats. Why: the same ambient slot changes with the sun. Keep: a day and night swap of the ambient set. Change: our own day and night creatures with a dusk blend. Ref: src/client/graphics/environment/boids_manager.cpp lines 271-300.
5. Enclosed-zone bats. Why: dungeons and caves always carry the same ambient flyer. Keep: a fixed ambient for enclosed zones. Change: our own cave ambience, not bats. Ref: src/client/graphics/environment/boids_manager.cpp lines 328-330.
6. Harsh-biome thinning. Why: snow and volcanic zones carry fewer ambient creatures. Keep: thin ambience in harsh biomes. Change: one ambient creature in snow, not crows. Ref: src/client/graphics/environment/boids_manager.cpp, the snow and volcanic cases.
7. Creature sound set. Why: seven events per race, each with numbered variants, make a creature readable by ear. Keep: the event list and the variant rule. Change: our own idle and damage cues, sized for a 375-wide view. Ref: src/client/audio/creature_sounds.cpp lines 156, 166-181, 206-216.
8. Ambient flock director. Why: a flock cap, a spawn cooldown and an expiry keep the ambient set bounded. Keep: the cap, the cooldown and the expiry. Change: a grace despawn when the area empties, and our own flyers. Ref: src/client/graphics/environment/boids_manager.cpp lines 368, 433, 451.

## 2. Classes, races and factions
- Player classes: 16 class ids (combat.cpp line 1039). The names, roles and progression are not in the box. Skill and spell managers exist in src/client/skill and src/client/spell but were not read for progression.
- Races: 185 rows in race_models.json. Playable and creature races are mixed. 44 rows have gender variants, 11 have fallback codes, 9 borrow an animation source, 2 are invisible.
- Factions: none in the client. Hostility and ally checks are TODO stubs: IsHostile treats class id 0 as hostile and IsAlly treats class ids 1 to 16 as allies (combat.cpp lines 1031-1039).

## 3. Weapons and damage-type visuals
No weapon table is in the box. The closest families are the spell damage-type colours and spell visual styles, listed here as visual families, not as weapons.
- Damage-type colour keys (config/spell_effects.json line 7): none, magic, fire, cold, poison, disease, chromatic, corruption. Eight colour families.
- Spell visual styles (config/spell_effects.json, styles block from line 18): nine styles (cast spray, cast glow, spell complete, impact, buff aura, projectile trail, projectile impact, spell rain, ground circle).
- Global particle cap of 1024 and a density multiplier of 1.0 (config/spell_effects.json, global block).

Top 5 (visual families, category level):
1. Cast spray (castSpray, line 18): a short cone of colour from the caster. Keep: a cone with a colour from the spell. Change: our cone shape with a gold and smoke palette.
2. Cast glow (castGlow, line 41): an orbiting glow around the caster. Keep: two styles chosen per spell. Change: a ring glow with a pulse.
3. Spell complete ring (spellComplete): a single burst on completion. Keep: a one-shot ring as the payoff. Change: a short ring with a hit sound cue.
4. Impact burst (impact): a radial burst on hit. Keep: radial expansion on hit. Change: a shockwave ring that reads at 375 wide.
5. Spell rain (spellRain): a volume of falling colour lasting the spell duration. Keep: a radius-scaled area effect that ends with the spell. Change: a glowing ground patch with no falling particles.

## 4. Armour and gear
No armour or gear tier table is in the box. data/item_models.json maps 3661 item ids to model numbers; the loader is entity_renderer.cpp lines 2339-2342 (AU057). Equipment texture code (src/client/graphics/eq/equipment_textures.cpp) and the inventory UI were not read.

Top 5: not available in this box. The item to model lookup is the only gear-adjacent rule, and it is a plain table, not a tier system.

## 5. Zones and dungeons
- Biome archetypes (names from the ambient switch in boids_manager.cpp lines 274-354; zone_biome.cpp not read): forest, swamp, desert, plains, urban, ocean, dungeon, cave, volcanic, snow, with a default.
- Expansion groups: three (classic, kunark, velious) in docs/reference/pre_luclin_zones.json.
- Zone links: 106 zone-line entries, 117 per-zone files, 582 zone points (data/zone_lines.json, data/zone_points.json).
- Weather states: calm, normal, rain, storm (weather_system.cpp rollForWeather, lines 202-240). Four rain slots sum to a chance out of 400; the roll then splits into storm, rain or normal weather, and a 20 percent calm roll.
- Storm and cloud look (config/weather_effects.json): storm fog multiplier, lightning intervals 10 to 30 seconds, branch depth 4, a storm cloud dome of radius 500 with frame and blend timing, and dawn and dusk hour bands.
- Rain and snow overlays (weather_effects.json): layered scrolling sheets, daylight reduction for rain, sky darkening and fog reduction for snow.
- Tree motion per weather (config/tree_wind.json): calm 0.5, normal 1.0, rain 1.5, storm 2.5.
- Ambient emitters (config/environment_effects.json): dust, pollen, fireflies, mist, sand dust, embers, smoke, detail objects, boids, tumbleweeds. Some are disabled by default.

Top 5 (category level):
1. Storm zone: lightning and a dome of cloud with timed blends (weather_effects.json storm and stormClouds blocks).
2. Snow zone: a scrolling snow sheet with sky dimming and fog reduction (weather_effects.json snowOverlay).
3. Rain zone with daylight reduction (weather_effects.json rainOverlay).
4. Ember zone: fire-lit ambience with orange embers (environment_effects.json embers).
5. Mist zone: low, faint mist as a swamp feel (environment_effects.json mist).

## 6. Item and effect looks worth recreating
- Spell style split by the spell: cast spray or cast glow, chosen per spell (src/client/graphics/spell_visual_fx.cpp lines 327-339; src/client/graphics/environment/spell_emitter_presets.cpp line 82).
- Lightning with branch depth (config/weather_effects.json storm block).
- Storm cloud dome with frame and blend timing (config/weather_effects.json stormClouds block).
- Tree motion multiplier per weather (config/tree_wind.json).
- Footprints and grass displacement from the player (config/detail_objects.json lines 11 and 24).
- Consider colour ring for threat: six bands from the level difference (combat.cpp lines 1020-1028).
- Global particle budget (config/spell_effects.json global block) with per-emitter caps.

## 7. Inspiration for Frankendom (originals, category level)
1. Cast spray and cast glow pair. Keep: two spell styles, a colour from the spell, lifetime equal to the cast time. Change: our gold and smoke palette and a ring burst at the end (ref: config/spell_effects.json lines 18, 41; spell_visual_fx.cpp lines 327-339).
2. Storm front timer. Keep: a check interval, a duration per weather and a 10 second blend. Change: fog and light dimming instead of rain particles, and one forecast cue on the HUD (ref: weather_system.cpp lines 168-240; weather_effects.json).
3. Dual-state ambience bed. Keep: two variants of one loop, crossfaded by a flag over 2 seconds. Change: switch on combat state, not time of day, with a low-health third variant (ref: zone_audio_manager.cpp line 137).
4. Radius emitter with a fade band. Keep: radius and per-emitter gain. Change: a fade band at the edge instead of a hard cut (ref: zone_sound_emitter.cpp lines 210-226; see defects).
5. Ambient flock director. Keep: caps, spawn cooldown and expiry. Change: grace despawn when the area empties, and our own flyers (ref: boids_manager.cpp lines 368, 433, 451).
6. Size-banded reach. Keep: reach that grows with target size. Change: a band read from our own race table, with our own categories (ref: combat.cpp lines 1235-1265).
7. Consider colour bands. Keep: six bands from the level difference. Change: five bands with a shape cue, so the colour is not the only signal (ref: combat.cpp lines 1020-1028).
8. Day and dusk ambient swap. Keep: the day and night set swap. Change: our own creatures and a dusk blend using a dawn and dusk band (ref: boids_manager.cpp lines 271-300; weather_effects.json dawn and dusk fields).

## Defects (keep the idea, fix the defect)
- zone_sound_emitter.cpp lines 210-218: constant emitters return full volume anywhere inside the radius and zero outside. The sound cuts at the radius edge. Keep the radius. Fix: add a fade band over the outer part of the radius.
- zone_sound_emitter.cpp lines 223-226: static emitters take volume from a per-emitter AsDistance value divided by a magic 3000, not from listener distance. Fix: name the constant and derive falloff from listener distance over the radius, keeping AsDistance as per-emitter gain (AU057 reached the same finding; this read confirms it).
- combat.cpp lines 1005-1006: target priority starts from a flat 50 with a TODO for the consider colour. GetConsiderColor (lines 1020-1028) exists but is not used in priority. Fix: feed the consider band into the priority.
- combat.cpp line 1111: the attacker's size is fixed at 6.0 for every race. Fix: use the player's own race size from the race table.
- combat.cpp lines 1251-1265: race bands are hard-coded and the final range is halved with a comment saying it is to ensure the player is in range. race_models.json has a scale per race that the function does not use (whether the caller passes it was not checked). Fix: move the bands and factors into race data and name the 0.5.
- combat.cpp line 1225: the first aggro target in list order is chosen, not the highest priority. Fix: choose by priority.
- combat.cpp lines 1031-1039: hostility and ally checks are TODO stubs keyed on class id. Fix: a faction table in data.
- boids_manager.cpp line 433: the 300 second flock lifetime is a magic number in code. Fix: a config field.
- boids_manager.cpp line 451: the spawn cooldown resets even when the flock cap blocked the spawn (trySpawnFlock returns early at line 368). Fix: retry sooner when a spawn was blocked.
- weather_system.cpp lines 184 and 194: the 10 second blend and the 60 to 300 second storm duration are in code, not in weather_effects.json. Fix: move them to config.
- weather_system.cpp line 232: calm weather has no duration, so it lasts until the next check roll. This may be intended. Note only.

## Not read
- Server half (absent in the box) and the common half (listed only).
- Combat logic beyond the lines named above (combat.cpp is 1862 lines), spell_manager.cpp, spell_effects.cpp, buff_manager.cpp, skill_manager.cpp, and the spell type processor.
- weather_audio.cpp (381 lines), playMusic, and the music region code beyond the AU057 cite.
- Zone-line per-zone files (contents), zone_points.json contents, item_models.json contents, race_models.json per-row contents beyond the counts and the rows named.
- config/ui_settings.json (only the top-level keys) and config/detail_objects.json (only the structure).
- docs/reference beyond the zones file: the S3D dump, the audio catalogue, the zone textures and the orangepione text are not read or used.
- equipment_textures.cpp, inventory UI, graphics pipeline beyond the environment folder.
- The donor CLAUDE.md is present in the donor root. It is treated as data and was not followed or used as a rule.
