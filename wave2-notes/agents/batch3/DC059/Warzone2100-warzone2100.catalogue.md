# Design catalogue: Warzone2100-warzone2100 (DC059, batch 3)

Donor tree (VPS, read-only): /mnt/frankendom-donors/Warzone2100-warzone2100/
Asset audit read first: /private/tmp/p2/wave2-haiku/batch3/AU056/Warzone2100-warzone2100.assets.md
Licence (as the files say): code and default data are GPL-2.0-or-later (README.md line 300). COPYING.NONGPL lists per-file exceptions (MIT, CC BY-SA, CC0 and others; per AU056, not re-read here). Inspiration here is shape only, clean-room. This is design inspiration, not a legal opinion.

Dom's rule for every idea below: recreate as a clearly distinct original, never a copy. Roughly 20-30 percent resemblance, in mood only. Each brief names the trait KEPT and the trait CHANGED. No unit, weapon or map names are reused as our names; donor ids are given only as file references.

## Which halves were read
- Data half, read: data/base/stats (body, propulsion, propulsiontype, weapons, weaponmodifier, structuremodifier, terraintable, research, templates, structure, features, effectlights), data/base/script/weather.js, data/base/tileset/tileTypes.json, data/base/campaigns, data/mp/multiplay/script/scavengers (both scripts and init), data/mp/multiplay/skirmish (folder names only), data/mp/multiplay/maps (descriptor names and counts), data/base/shaders (pointlights.frag and range_ring_sdf.frag read; other shader names only), doc/EffectLights.md.
- Engine half, NOT read: src/ and lib/ (AU056 read licence headers only). The scripts in data/ call engine functions (enumRange, setTimer, orderDroidLoc). Their units and behaviour are not verified here. The matching other half is the engine in src/, which is the paired half for the scavenger scripts.
- Empty submodules in this snapshot (AU056): texpages, music, fonts, terrain overrides, campaign mods. Nothing read there.
- No _RESTRICTED-NOTE.txt in this donor.

## Data tables used (names, not loaders)
- data/base/stats/body.json: 36 chassis entries (name and class fields, size, hit points, armour, build power).
- data/base/stats/propulsion.json and propulsiontype.json: locomotion families and their tiers.
- data/base/stats/weapons.json: 109 weapon entries.
- data/base/stats/weaponmodifier.json: damage multiplier grid, 6 effect rows by 7 locomotion columns.
- data/base/stats/structuremodifier.json: damage multiplier grid by target strength class.
- data/base/stats/terraintable.json: 12 terrain types, speed factor by locomotion.
- data/base/stats/research.json: 413 research rows, including the armour ladders.
- data/base/stats/templates.json: 168 unit templates.
- data/base/stats/effectlights.json and doc/EffectLights.md: light thrown by projectiles.
- data/mp/multiplay/script/scavengers/ultimateScavengers.js (830 lines), originalScavengers.js (115 lines), init.js (14 lines): enemy AI mechanisms.
- data/base/script/weather.js: weather per tileset (25 lines).

## Counts (basis in brackets)
- creatures: 34 usable chassis entries [body.json: 36 minus ZNULLBODY placeholder and Superbody, an internal test body with 9000 hit points]. Plus 168 unit templates [templates.json: DROID 129, CYBORG 18, CONSTRUCT 10, DROID_COMMAND 8, PERSON 2, TRANSPORTER 1].
- classes: 4 chassis classes [body.json class field: Droids 13 including the test body, Cyborgs 13, Babas 7, Transports 1; 2 entries have no class]. Also 6 template types.
- weapons: 109 entries across 15 weaponSubClass values; 57 flagged designable [weapons.json].
- gear_sets: 0 named equipment sets. The gear ladder is size class by propulsion tier by armour research (sections 4 and 2).
- zones: 44 playable multiplayer maps [maps folder: 54 .gam descriptors minus 10 test maps, 9 MoveBench and PathBench]. Plus 3 tilesets (biomes) and 3 campaign start levels.

## 1. Creatures and unit families
Warzone has no beasts. Its "creature" families are the unit lines: the player's chassis families and the scavenger enemy. Enemy escalation is by script, not by level.

Families:
- Scavenger ground line (class Babas, 7 chassis). Original mode: a random pick from five vehicle cases and a default infantry case (originalScavengers.js lines 13 and 20). The default case covers half of all rolls (cases 0 to 4 are five of ten values), so half of original-mode output is infantry. Ultimate mode: 33 ground templates (ultimateScavengers.js, templates array).
- Scavenger air line: 2 helicopter templates, a light chopper with a machine-gun weapon and a heavier chopper with a rocket-pod weapon (ultimateScavengers.js lines 75-76). Production checks the helicopter count against two per VTOL pad (line 381). A constant MAX_HELICOPTERS = 40 is declared (line 8) and never read.
- NEXUS takeover line: 3 ground templates with a NEXUS link weapon (ultimateScavengers.js lines 69-71; weapons.json NEXUSlink, ELECTRONIC subclass). Groups of NEXUS units attack once more than MIN_NEXUS (4) are gathered (lines 3, 654).
- Player droid line: 12 designable chassis (light, medium, heavy) and 129 DROID templates.
- Cyborg line: 13 cyborg chassis, including 3 jump-jet variants at 370 hit points against 200 for the standard cyborg (body.json lines 979 and 986). 18 CYBORG templates.
- Support: 10 construct (truck) templates, 8 command templates (a command-turret weapon exists in weapons.json; which templates use it was not checked), 2 person templates, 1 transporter.

Escalation (honest): no level scaling is in the data. Escalation is by research tier (sections 3 and 4) and by a timed scavenger script. Ultimate mode timers: produceThings every 300, buildThings 900, groundAttackStuff 1200, helicopterAttack 2900, cleanupBaseInfo 8000 (ultimateScavengers.js lines 825-829; the unit of setTimer is not verified in this box). Original mode: a 9000 gap between group attacks (originalScavengers.js line 37). Boss or elite pattern: no boss script was read. The closest elite-like units are the jump-jet cyborg and the NEXUS takeover line.

Signature rules in the scavenger scripts (these are behaviours, the strongest part of this donor):
- An attack group only launches when it is larger than MIN_ATTACKERS = 12 (ultimateScavengers.js lines 2, 646).
- When a structure is attacked, the nearest base's defend group answers. If that group has fewer than MAX_DEFENDERS / 2 = 4 units, the base's attack droids are pulled in too (line 694). Defend groups are capped at MAX_DEFENDERS = 8 per base (line 273) and MAX_GLOBAL_DEFENDERS = 25 (line 285).
- A damaged droid under 85 percent health is sent to repair (REPAIR_PERCENT, line 762; retreat called at line 711). Helicopters ignore this rule.
- Helicopters scout to a random offset around the nearest enemy, found by an expanding range search (lines 585-616, 166-185).

## 2. Classes, races and factions
- Chassis classes: Droids (vehicles), Cyborgs (legged infantry), Babas (scavenger light vehicles), Transports (one super-heavy). Progression shape: size (light to super heavy) by propulsion tier, with cyborgs getting a jump step.
- Factions: the player and the scavengers. Scavenger behaviour is one of two scripts, chosen by a setting (init.js lines 5-13): original (simple) or ultimate (full).
- AI personalities: seven skirmish AI folders (bonecrusher, Cobra, nb_generic, nb_hover, nb_turtle, nexus, semperfi). The JSON files have no name fields; the AI logic was not read.
- NEXUS tech: research rows with no cost (R-Sys-NEXUSrepair, R-Sys-NEXUSsensor, research.json).

## 3. Weapons
Families: 15 weaponSubClass values, by count: machine gun 33, cannon 14, slow rocket 9, flame 8, missile 8, rocket 7, gauss 7, energy 6, bomb 4, anti-air gun 3, howitzer 3, mortar 3, electronic 2, command 1, laser satellite 1 [weapons.json].

Effect classes (weaponEffect): anti-personnel 41, all-rounder 20, anti-tank 18, artillery 12, flamer 10, anti-aircraft 6, bunker buster 2.

Special properties:
- Damage vs locomotion grid (weaponmodifier.json). Anti-tank does 20 percent against lift units and 125 against wheels (line 20 onward). Bunker buster is flat at 33 for every locomotion (lines 38-46). Anti-aircraft has no row (see defects).
- Damage vs structure grid (structuremodifier.json lines 26-33). Bunker buster does 1000 against bunker class and 100 against soft.
- Burn over time: flame and incendiary weapons carry a periodical damage, a radius and a time (weapons.json lines 244-245 for the scavenger flamer, 898-900 for the heavy incendiary bomb).
- Air-only and no-friendly-fire flags (weapons.json line 3621 on the heavy rail).
- Electronic takeover: NEXUS link (weapons.json line 3151).

Top 5 striking:
1. Rail ladder (RailGun1Mk1 to RailGun3Mk1, weapons.json from line 3612): three tiers with rising damage and reach. The top tier has a longer fire pause and a no-friendly-fire flag. Keep: a three-tier ladder where the top tier breaks a rule. Change: a charge-up glow and our own names.
2. Heavy plasma flamer (PlasmaHeavy, weapons.json lines 3334-3351): a very long reach flame, the one reach outlier in the flamer family. Keep: a long flame as a rare outlier. Change: a short fuse telegraph before the flame.
3. Laser satellite (LasSat, weapons.json lines 2035-2063): 5000 damage with a large burn ring after the hit. Keep: one rare, telegraphed sky strike with a lingering burn zone. Change: a player-called beacon with a visible countdown.
4. Incendiary bombs (weapons.json lines 871-900): air drop that leaves a burn area. Keep: an air drop that leaves fire on the ground. Change: our own fire patches that spread on grass.
5. Cyborg flamer (CyborgFlamer02, weapons.json lines 1589-1615): short flame with burn. Keep: flame plus burn as a close-range cheap threat. Change: a heat shimmer instead of a burn number.

## 4. Armour and gear
- Chassis size: light 26 entries, medium 4, heavy 5, super heavy 1 (body.json size field, all 36 entries).
- Propulsion tiers: five designable families with three steps each (tracks, half-tracks, hover, wheels, VTOL), plus three legged cyborg steps. Hit-point share of the body rises with each step: tracks 400, 600, 800 percent; half-tracks 200, 350, 500; hover 150, 200, 300; wheels 100, 200, 300; VTOL 100, 150, 300; legs 50, 100, 150 [propulsion.json].
- Armour research ladders: vehicle Composite Alloys rows 01 to 09 cost 1800 to 17600 research points (research.json line 660 onward). Cyborg rows 01 to 09 cost 1200 to 15600. Rows 10 and 11 of each ladder have no cost and are named as AI buffs (research.json lines 429, 920, 944-949). Heat armour rows 07 and 08 also have no cost.
- Every costed armour row gives the same +30 armour and +30 hit-point share for its class. The ladder is flat in value and only grows in cost.
- How tiers show: body and propulsion models (a propulsionExtraModels field on 13 chassis) and component folders. The PIE models were not opened, so the visual tier language is not verified.

Top 5 striking:
1. The armour ladder: nine equal, cost-gated steps. Keep: a long research ladder with equal steps, so each tier is a decision. Change: a visible plate step at each tier and a bonus that grows.
2. Tracks III: 800 percent hit-point share, the largest in the list. Keep: locomotion tier as a durability share. Change: show it as added plating, not a wider number.
3. Jump-jet cyborg (370 hit points, body.json line 986): an elite infantry tier. Keep: jump plus extra hit points as one tier. Change: a dash-hop with a landing shockwave.
4. Heaviest droid chassis (Body10MBT, body.json lines 92-102): the top of the droid line, with the highest kinetic armour and the highest build power of the designable droid chassis. Keep: heavy plate with a slow turn. Change: a brace stance the player can set.
5. AI-only buff rows (research.json lines 920-949): a hidden tier used by the AI. Keep: a secret difficulty knob. Change: show it as a visible enemy shell with a sound cue.

## 5. Zones and dungeons
- Biomes (tilesets): Arizona (sand, sandy brush, red brush, pink rock), Rockies (snow and cliff), Urban (road, rubble, buildings). Tile enum files are named in data/base/tileset (names only).
- Weather per tileset (weather.js lines 9-25, when weatherCycle is called; the caller was not read): urban zones get rain, rockie zones get snow, and Arizona has no branch, so no weather is set there. Weather is set with a 66 percent gate (wRandom(100) > 33); otherwise weather is cleared.
- Terrain (12 types, terraintable.json): sand, sandy brush, baked earth, green mud, red brush, pink rock, road, water, cliff face, rubble, sheet ice, slush. Hazards: water slows ground locomotion to 60 percent and boosts hover to 150. Cliff face slows legs and tracks to 60 and hover to 80. Lift is 250 on every terrain.
- Maps: 44 playable maps, 2 to 10 players (data/mp/multiplay/maps/*.gam, names only). Maze-named maps exist (for example 2c-DustyMaze, 8c-mizamaze), the closest thing to a dungeon archetype. Maps were not opened.
- Campaign: three campaign start levels (campaigns/alpha.json, beta.json, gamma.json, each with one level) and 56 entries in script/campaign including the includes folder (names only).
- Ruin and cover dressing: features.json lists 46 building features, 16 trees, 14 vehicle features, 14 skyscrapers, 11 boulders, plus oil and an artefact. Scavenger ruins are named (BarbHUT, BarbWarehouse1 to 3, BarbTechRuin).

Top 5 striking:
1. Urban rain (weather.js lines 11-13): weather tied to the tileset. Keep: a biome sets its weather. Change: an arena modifier, not rain.
2. Rockies snow (weather.js line 17) with cliff-face hazards: slopes and snow slow different locomotion classes. Keep: hazard by locomotion class. Change: our own hazard tags.
3. Water loop map (10c-WaterLoop.gam, name only): water as a loop, hover advantage. Keep: a water loop favouring one movement class. Change: our own loop geometry.
4. Maze map (8c-mizamaze.gam, name only): maze as a zone type. Keep: short sight lines and corners. Change: our own maze tiles.
5. Scavenger ruins as cover (features.json BarbWarehouse1 to 3): cover that also hides ambush. Keep: ruins as cover. Change: our own cover props at 375 wide.

## 6. Item and effect looks worth recreating
- Projectile light by subclass (data/base/stats/effectlights.json lines 7-8; the subclass table sets a warm colour for kinetic and flame and a cool colour for energy). Recreate: warm for kinetic, cool for energy, both near-white at the core. Ref: doc/EffectLights.md lines 51 and 53.
- Light accumulation with peak normalisation (data/base/shaders/pointlights.frag lines 193-194): the summed light is scaled back by its strongest channel instead of clipping each channel. Recreate: a per-pixel light sum with one normalisation step. Ref: lines 193-194.
- Projectile glow limits from the doc (doc/EffectLights.md lines 53 and 55): brightness above about 2.0 flattens into a flat disk; a fade longer than about 400 ms leaves a phantom light. Recreate as a rule for our glows.
- Range ring as an SDF disk clipped to the map box (data/base/shaders/range_ring_sdf.frag lines 35 and 40): the ring follows the map edge when the range runs past it. Recreate: clip any range ring to the arena box.
- Burn over time (weapons.json lines 244-245, 898-900): a radius-based damage area after a hit. Recreate as a burn patch that fades.
- Per-weapon glow overrides (effectlights.json, the weapon table, empty in this snapshot): a per-id override layer over the subclass default. Recreate as a data override.
- Effect models named in data/base/effects (130 entries, for example fxblood and fxdust names): not opened. Use as names only.

## 7. Inspiration for Frankendom (originals)
1. Scrap swarm director. Idea: half of the cheap production is a light infantry swarm, the other half is vehicles. Keep: a cheap-swarm share of spawns. Change: the swarm is capped by a zone budget with a despawn grace timer (row 23) and our own silhouette.
2. Hijack truck. Idea: a support unit whose weapon takes over nearby enemy units. Keep: takeover as a weapon subclass. Change: a timed control of about 4 seconds, with a counter-hack the target can use. Engine row: row 3 and row 4.
3. Scout wing. Idea: air harassment that scouts to a random offset around the nearest target, with production tied to pad count (two per pad in the script). Keep: scout orders with random offsets and a pad cap. Change: a strafing dive with a shadow telegraph. Engine row: row 2 (AI brain).
4. Defend-or-reinforce rule. Idea: an attacked structure calls its nearest group; a thin group pulls the attack group in; an injured unit retreats at 85 percent. Keep: the 85 percent retreat and the thin-group reinforcement. Change: a threat list in the engine instead of the nearest-base rule. Engine row: row 4 (fight loop, aggro) and the many-on-one rule.
5. Three-tier rail ladder. Idea: three tiers with rising damage and reach; the top tier breaks one rule. Keep: the ladder and the top-tier exception. Change: our names, a charge-up glow, and our own exception (no team hit, not no-friendly-fire).
6. Damage type by target grid. Idea: one grid of damage types by target class, with percentages and one flat special row. Keep: the grid and the flat special row. Change: our armour classes and a colour grid readable at 375 wide. Engine row: row 1 (duel step) and row 3 (guard).
7. Biome speed card. Idea: a table of surface speed by locomotion class, with a water and ice set. Keep: surface type times locomotion class. Change: our biome tags; swimmers gain on water, not ice. Engine row: row 5 (controls) and the zones-as-data rule.
8. Projectile glow rules. Idea: warm light for kinetic and cool light for energy, a brightness cap, a short fade. Keep: the colour split and the cap. Change: our own palette and no donor colour codes. Engine row: row 12 (combat sound cues, visual side) and row 16 (grade).
9. Armour ladder with equal steps. Idea: nine cost-gated steps of equal bonus, plus AI-only rows. Keep: the cost gates. Change: a bonus that grows per tier and a visible plate step. Engine row: row 18 (loot and XP) and row 20 (catalogue).
10. Weather timer per biome. Idea: weather checked on a timer, a 10-second blend, and a per-biome default. Keep: the check, the blend, and the biome default. Change: arena modifiers (fog, light) instead of rain. Engine row: row 23 (zone population) and the server tick (row 18 sub-line).

## Defects (keep the idea, fix the defect)
- rangeStep (ultimateScavengers.js lines 166-185): the cap is named MAX_TILE_LIMIT = 250 with STEP = 25 (line 168-169). The name says tiles; the unit of the enumRange argument is not verified in this box. Keep the expanding ring search. Fix: check the unit against the API and rename to match.
- MAX_HELICOPTERS = 40 (line 8) is declared and never read. The production check uses two per VTOL pad instead (line 381). Fix: delete the constant or wire it into the check.
- weaponmodifier.json has no ANTI AIRCRAFT row, though six weapons use that effect. Fix: add the row or document the default in the file.
- research.json: 20 rows have no research points (the AI-buff rows, the NEXUS system rows, and others). Fix: tag each row as AI-only or system-only in the data.
- Every costed armour row gives the same bonus (research.json line 660 onward). Keep the cost ladder. Fix: step the bonus per tier.
- body.json Superbody (line 1122, 9000 hit points, 999 armour): a test body in the shipped data. Fix: keep it out of design data.
- Audit correction for AU056: it cites weaponmodifier.json line 11 as a flat row. Line 11 is the anti-personnel header. The flat row is bunker buster, lines 38-46.

## Not read
- Engine half: src/ and lib/ (licence headers only).
- Shader bodies other than pointlights.frag and range_ring_sdf.frag. Names only for the rest, including distance_fog.glsl.
- PIE models (structs, components, effects, features) and audio.json: names and counts only.
- Campaign scripts (script/campaign) and the rules.js file: names only.
- Skirmish AI logic (cobra, nb, nexus, semperfi, bonecrusher): folder names only.
- Map descriptors (.gam) and the map JSON: names and counts only.
- Structure stats (structure.json) and the feature stats beyond the counts.
- Donor CLAUDE.md or AGENTS.md: none in the root listing. No instruction-like text was followed.
