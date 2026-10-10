# CleverRaven-Cataclysm-DDA (catalogue, DC012)

Donor: /mnt/frankendom-donors/CleverRaven-Cataclysm-DDA (VPS, read-only). Single-player roguelike in C++ (engine under src/) with a large JSON data pack (data/json).
Licence (as the files say): LICENSE.txt line 1 states the project is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License. We treat it as shape-only inspiration: we write our own data and art, copy no tables, text or art. Not legal advice.
Dom's rule for every idea below: recreate as a clearly distinct original, about 20-30 percent resemblance in mood only, never a copy. Names used here are our own labels.

**Which halves were read.** Data half: data/json, read by file and by parsed fields (monsters, items, materials, field types, weather, overmap, mapgen names, monstergroups, martial arts, professions, species). Engine half: only the lines cited from src/mongroup.cpp, src/monster.cpp and src/mapgen.cpp. Combat, AI and sound code were not read. The paired other half is the same donor (engine and data are in one folder), so no second donor is needed.

**Counts (honest).**
- Creatures: 1221 MONSTER entries across the top-level monsters files (67 files that hold MONSTER entries) and the netherum subfolder. About 828 lines carry copy-from, so many entries are variants, not distinct species.
- Classes: 34 species (races and kinds) plus 30 martial-art styles (32 entries, minus style_none and style_debug). 219 professions are starting jobs, not combat classes, and are not counted here.
- Weapons: 420 melee item entries (includes tier copies, inferior and fake variants).
- Gear sets: 62 material-tier families with all five metal tiers, across armour and melee (2765 armour item entries in total).
- Zones: 44 overmap_location entries, 80 map_extra events, 318 overmap specials, 1280 overmap terrain tiles, 25 weather types, 98 field types, 66 emitters.

## 1. Creatures and beasts

Families (file and rough entry count; counts include copy-from variants):
- Insect and spider 145 (insect_spider.json); mammal 123; fish 121; reptile and amphibian 80; bird 58; feral humans 44; mollusk 10; rodent-kin 8.
- Nether and string-dimension kin: nether.json 75, nether_animal 6, string_dimension 7, netherum subfolder 16, scarlet_sea 1, reverberation 3.
- Undead: fungus_zombie.json 70 (19 "dusted" undead families, each with a fungalize and fungus stage, plus fungal mounds, constructs and animal forms); 24 zed_* and zed-* files with 226 entries in total (hulks, brutes, crawlers, acid, electric, burned, skeletal, survivor, soldiers; not counted per family).
- Triffid and plant kin: triffid.json 13 (sprig, sprout, triffid, queen, heart, vine beast, creeper hub, fungicidal triffid).
- Mi-go 7 (mi-go.json); Yrax 8 variants plus the quadraphract parts (yrax.json); kraken and octopus kin (kraken_spawn.json 4); singularity bosses (singularities.json 3); starers 3 (starers.json); robots, drones, turrets and mechsuits (defense_bot 9, drones 9, turrets 9, mechsuits 3, cyborgs 6).

Escalation and bosses: no character level scales the monsters in the data. Escalation runs on two clocks:
- Time: upgrade chains. Fixed steps via age_grow (fungal zombies 1 unit per step; triffid sprig to young at 14 units) and random steps via half_life (fleshy shambler to flesh golem at half_life 168). Engine: src/monster.cpp lines 442-449 (fixed age, else a random day roll gated by one_in(2)).
- Spawn budget: pack and cost rules in monstergroups. Zombie group rows cost 7 for packs of 5-20, cost 13 for packs of 15-40, cost 20 for packs of 25-60 (parsed; the cost rows are the same group). Engine: src/mongroup.cpp lines 225-226 (pack roll) and 242 (budget deduction).
Boss pattern: multi-part bosses (quadraphract with legs), immobile bosses with a spawn that becomes a bigger form on death (singularity reclaimer), and a landmark boss that does not move (golden monolith).

Top 8 striking (judged on: readable silhouette at 375 wide, one signature behaviour, one signature effect; sound not read for any of them):
1. Growing titan chain. Label: "Three-stage flesh climber". Why: three named stages with hp 100, 200 and 400, and speed 50, 80 and 140 (monsters/jabberwock.json lines 3, 29, 67; hp values parsed). Speed rises with size, so each stage is a new threat. Keep: a staged chain where speed and hp rise together; the upgrade step by timer. Change: silhouette (a bark-plated giant), palette, and stage triggers by fight state instead of days.
2. Four-legged shard crab. Label: "Limbed shard crab". Why: a 2400 hp body with 400 hp legs (yrax.json lines 275, 343); a leg collapse fires a hurt event (line 360) and the death fires another. Keep: limbs as separate hp pools; a limb collapse as a mid-fight event. Change: crab silhouette, leg tells, and an event that drops a limb's guard rather than a text message.
3. Gilded sentinel. Label: "Gilded sentinel". Why: immobile, pacifist, casts spells, 100 hp (yrax.json line 193); a field map extra places these as landmarks (overmap/map_extras.json line 243). Keep: a non-attacking landmark that casts. Change: palette (gold is the donor's yellow), silhouette, and spell set.
4. Event-horizon hoarder. Label: "Event-horizon hoarder". Why: immobile boss with 3000 hp and six spells (singularities.json line 583; hp parsed); its spawns split off and burst into a bigger form (upgrades into a devourer). Keep: a boss that spawns and becomes a bigger threat on death. Change: silhouette and the split rule (ours: a timed split at half hp).
5. Pink-carapace raider squad. Label: "Carapace raider squad". Why: seven role variants (base, scout, guard, surgeon, slaver, myrmidon, captured) in one family; roles read by colour and loadout (mi-go.json lines 164, 225). Guards carry a shriek that stuns and a taser. Keep: one family, roles by colour and kit. Change: colours, silhouettes, and the stun as a telegraphed pulse.
6. Tentacle matriarch. Label: "Tentacle matriarch". Why: 850 hp, speed 120; a grab-drag, then a drag follow-up, then a long barbed tentacle (kraken_spawn.json lines 116, 141). Keep: a two-step grab-and-drag. Change: pull direction, tells, and a one-target rule so it works many-on-one.
7. Line-walkers. Label: "Axis-locked line-walkers". Why: three colours, each locked to one axis (ONE_DIMENSIONAL_X, Y, Z), with a ranged pull, 40 hp, and a vanish message on death (string_dimension.json lines 29 and neighbours). Keep: a readable movement lock as identity. Change: our own lock (lanes), no dimension lore.
8. Spore-stalked dead. Label: "Spore-stalked dead". Why: a three-stage transformation of an existing enemy: dusted, then a stalk growing, then the fungal form, one step per age unit (fungus_zombie.json lines 3, 11); death bursts from the spore stage (line 88). Keep: a visible three-stage change of a known enemy type. Change: our growth tells and a burst that is not fungus.
Honourable mention: triffid heart (triffid.json line 316): immobile queen with 500 hp and its own death effect (death_triffid_heart).

## 2. Classes, races and factions

- Martial-art styles (data/json/martialarts.json, 30 styles). Role: a melee stance. Signature mechanic: a static stat trade. The five "animal" styles all have learn difficulty 10 and a stance that moves a stat from one role to another. Examples: Tiger adds Strength to accuracy and takes Dexterity away (line 1408). Dragon adds Intelligence to accuracy and takes Dexterity away (line 433). Crane and Leopard move bash damage from Strength to Dexterity (parsed; lines not receipted). Snake moves accuracy and bash damage to Perception (parsed). Progression: learn difficulty and style priority; no level tree.
- Species (data/json/species.json, 34 ids): mammal, amphibian, bird, cyborg, reptile, fish, kraken, mutant, nether (plus burrowing and emanation kinds), migo, tindalos, slime, fungus, leech plant, insect (plus centipede, flying insect, spider), plant, mollusk, worm, zombie, ghoul, feral, robot (plus flying robot), yrax, horror, aberration, hallucination, human and unknown. Role: a biology set used for resistances and flags (not read). Progression: none.
- Professions (data/json/professions.json, 219 profession entries plus 62 item groups and 28 substitution sets). Role: starting job, kit and skills, for example vagabond (line 666). Not combat classes.
- Mutations (data/json/mutations, 27 files, 883 mutation entries, 30 categories). Role: a progression tree of traits, body parts and sub-body parts (mutation_category.json, mycus.json, supernatural.json; read by file name and count only). This is the richest progression system in the pack.
- Factions and missions: monster_factions.json, faction_missions.json (not read).

## 3. Weapons

- Families: 25 weapon categories (data/json/weapon_categories.json), for example long swords, great axes, whips, flails, hooking weapons, spears and polearms, knives, batons, maces and claws.
- Tiers: a five-step metal ladder per weapon, prefixes lc (mild steel), mc (medium), hc (high), ch (hardened), qt (tempered). 62 families carry all five tiers across armour and melee. Each tier copies a base and swaps the metal through replace_materials (for example qt_longsword swaps medium steel for tempered steel and leather for kevlar; items/melee/swords_and_blades.json line 1545).
- Special variants: 21 "_inferior" and 26 "_fake" melee ids (their role, display or otherwise, was not read).
- Non-steel families: wood, bone (bone shiv), glass (glass shiv, glass counted as 13 parts of the material), bronze (bronze khopesh and xiphos), iron (baselard).
- Stats example: mc_longsword has bash 9 and cut 36, weight 1904 g, techniques WBLOCK_2, BRUTAL and RAPID, and weapon category LONG_SWORDS (items/melee/swords_and_blades.json lines 1488, 1514).

Top 5 striking:
1. Tier by metal swap. The tempered longsword is the same tile as the medium one, with the metal and text changed (lines 1488, 1539, 1545). Keep: one base, five material swaps. Change: our tiers must show on screen (sheen and edge), which this pack does not do.
2. Two-handed longsword (mc_longsword, line 1514): bash 9 and cut 36 at 1.9 kg. Keep: a heavy two-hander with a block technique. Change: our reach and timing.
3. Bronze xiphos and khopesh (bronze material, parsed): a bronze tier that is a distinct metal family, not a steel step. Keep: a separate metal line. Change: our palette and silhouette.
4. Glass shiv (parsed): a fragile primitive built from glass and tape. Keep: a breakable primitive as a cheap weapon. Change: our break rule and sound.
5. Kukri and trench knives (parsed): a knife family with a tier ladder and wood or leather handles. Keep: the mixed-material grip. Change: our grip look.

## 4. Armour and gear

- Material tiers (data/json/materials.json): budget steel (chip_resist 11, lines 387-394) then low carbon (17, line 1992), medium carbon (18, line 2011), high carbon (18, parsed), hardened carbon (20, parsed) and tempered carbon (20, line 2067). Densities for the steels are all 8.0 (parsed), so the tiers differ by chip resistance and wording, not weight.
- Precious and organic metals: gold (density 19.32, conductive), silver (10.49), bronze (8.8); armour items with gold material 19, silver 18 (parsed). Organic: hardened chitin (density 1.45, chip 14), biosilicified chitin (1.45, chip 7) (parsed).
- Armour ladders: chainmail hauberk has a tempered entry that copies the base and swaps steel for tempered chain (items/armor/suits_protection.json line 1823); helm_close has a low carbon entry with looks_like helmet_sallet (helmets.json line 2324), with the tempered tier copying it.
- How tiers show: the tile is the same across tiers (looks_like is inherited); the tier shows in the description text and the stat block, not in the sprite. This is a gap we can fill with our own sheen ramp.
- Bespoke and exotic armour: 10 bespoke files (items/armor/bespoke_armor), combat exoskeleton files (not read).

Top 5 striking:
1. Hardened and tempered steel as a ladder (materials.json lines 1984, 2059, 2067). Keep: a material step that changes resistance, not size. Change: our look step (edge sheen).
2. Chainmail hauberk ladder (suits_protection.json line 1823). Keep: chain as a separate material family with tiers. Change: our chain pattern.
3. Gold-plated items (19 armour entries with gold, parsed). Keep: a precious metal as a distinct line in armour. Change: our gold ramp and glow rule.
4. Chitin armour (hardened and biosilicified chitin, parsed): an organic armour family from carapace. Keep: carapace as a material. Change: our colour and sheen.
5. Combat exoskeleton (items/armor/combat_exoskeleton*.json, not read): a heavy suit family. Mentioned for coverage only.

## 5. Zones, dungeons and hazards

- Overmap zones (data/json/overmap/special_locations.json and overmap_location entries, 44): woods, fields, swamp, water, ocean and lake shores, subterranean and subway, labs, roads and highways, crater, nether (glass terrain, special_locations.json), portal storm dungeon, string-dimension cores (true void and crossroads), scarlet sea reverberation, netherum labyrinth sparkling chasm, labyrinth2, inner cabins.
- Dungeon archetypes (mapgen): the netherum labyrinth (30 files in mapgen/netherum: small and large rooms, nests such as mazes, 6x6 passages and chasm halls, treasure rooms, flooded rooms, a safehouse, teleport stairs); portal storm dungeon (mapgen/portal_storm_dungeon); string dimension (mapgen/string_dimension); scarlet sea (mapgen/scarlet_sea); strange temple (mapgen/strange_temple.json); lab and microlab; bunker; sewer; fungal (mapgen/fungal).
- Map extras (80 events, overmap/map_extras.json): portal (line 195), golden monoliths (line 243), jabberwock sighting (line 322), crater, fungal zone, spider and wasp nests, roadblocks, helicopter crash, plant patches.
- Weather as a zone state (data/json/weather_type.json, 25 types): portal storms escalate early, distant, close, then full (line 421), and scarlet storms run 1 to 5 (line 522).
- Hazards (data/json/field_type.json, 98 types): fire (dangerous at its first level, line 340), electric sparks (dangerous), webs (webbed effect), darkness (light override 0.0), shadow (light override 3.7), toxic and tear gas, acid, fog.

Top 5 striking:
1. Portal storm escalation (weather_type.json lines 421, 522): four named phases ending in a full storm. Keep: phases that climb. Change: our visuals and phase timings.
2. Portal map extra with a vertical range from -5 to +5 (overmap/map_extras.json line 195). Keep: a portal that spans floors. Change: our own portal shape.
3. Golden monolith field (overmap/map_extras.json line 243). Keep: a landmark that does not attack. Change: our landmark art.
4. Netherum labyrinth (30 mapgen files). Keep: nests and treasure rooms within one maze theme. Change: our layout rules.
5. String-dimension core (overmap_location entries; mapgen/string_dimension). Keep: a zone with a one-axis rule. Change: our lane rule, and no dimension lore.

## 6. Effects and looks worth recreating

- Fire as a light ladder (field_type.json, fd_fire at line 331): its first level emits light 20 with a warm colour and counts as dangerous (line 340); later levels are brighter. Technique: light is a field property that scales with intensity. Our version: our own warm ramp and a light radius tied to hazard level.
- Bioluminescence ladder (fd_biolum at line 488): glimmer 4, glow 9, shine 20 (line 493). Technique: three light levels per field. Our version: a three-step glow on pickups or shrines.
- Darkness and shadow as negative light (fd_darkness and fd_shadow, parsed): a field that overrides light to 0 or to 3.7. Technique: light override as a hazard. Our version: an ambush zone that darkens.
- Emitters (data/json/emit.json, 66 entries): smoke plumes, sparks, shock bursts, cold and hot air streams, tear-gas blasts. Technique: named emitters that spray for a short time. Our version: our own three emitters (spark, plume, burst).
- Death effects per monster: a fungal burst (fungus_zombie.json line 88), a smoke burst (starers.json, parsed), a blood burst from a reclaimer spawn (singularities.json, parsed). Technique: each family has its own death effect. Our version: a death burst per family, kept short.
- Glyph colour as identity: mi-go pink and red, yrax yellow, linelanders pink, light cyan and red (monster files, parsed). Technique: colour alone sorts a family at a glance. Our version: our own colour sets, one per family.
- Vanish and burst messages on death (for example the string-dimension vanish, parsed). Technique: a short message as a death beat. Our version: a short beat, not text only.

## 7. Inspiration for Frankendom

1. Three-stage flesh climber (keep: stage steps with hp and speed rising together; change: triggers by fight state, our silhouette). Ref: monsters/jabberwock.json lines 3, 29, 67.
2. Limbed shard crab (keep: separate limb hp pools and a limb-collapse event; change: crab silhouette, leg tells). Ref: monsters/yrax.json lines 275, 343, 360.
3. Gilded sentinel (keep: an immobile pacifist landmark that casts; change: palette and spell set). Ref: monsters/yrax.json line 193; overmap/map_extras.json line 243.
4. Event-horizon hoarder (keep: a boss whose spawn becomes a bigger form on death; change: silhouette and a timed split at half hp). Ref: monsters/singularities.json line 583.
5. Carapace raider squad (keep: one family, roles by colour and kit; change: colours, silhouettes, a telegraphed stun pulse). Ref: monsters/mi-go.json lines 164, 225.
6. Tentacle matriarch (keep: two-step grab then drag; change: pull direction, tells, one target at a time for many-on-one). Ref: monsters/kraken_spawn.json lines 116, 141.
7. Stance stat trade (keep: stances that move a stat from one role to another; change: our stance names and stat pairs). Ref: data/json/martialarts.json lines 433, 1408.
8. Five-step metal ladder with visible sheen (keep: a material swap ladder and chip resistance; change: a visible sheen per tier, which the donor lacks). Ref: data/json/materials.json lines 387-394, 1984-2067; items/melee/swords_and_blades.json line 1545.
9. Portal storm phases (keep: four climbing phases; change: visuals and timings). Ref: data/json/weather_type.json line 421.

## Licence note
CC BY-SA 3.0 Unported (LICENSE.txt line 1). Shape only: we use mechanisms and layouts as inspiration and write our own numbers, names and art. No tables or text copied.

## Not read or not verified
- Engine: combat, AI, sound, rendering and most of src/mongroup.cpp, monster.cpp and mapgen.cpp (only the cited lines were read).
- Data read by parse and not receipted: many hp, speed and cost values, the hc and ch material values, the scarlet and labyrinth files, gold and silver counts, the bronze and glass entries, and the fake and inferior variants (roles not read).
- Not read: items/armor/combat_exoskeleton*.json, mutations (read by file name and count only), monster_factions.json, faction_missions.json, sound/ folder, gfx/ tiles, emit.json bodies.
- Copy-from chains were not fully resolved; hp and speed "None" in some parsed entries mean inherited values were not followed.
- Paired halves: none needed (engine and data share the folder).
