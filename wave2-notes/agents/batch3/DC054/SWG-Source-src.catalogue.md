# SWG-Source-src (design catalogue, DC054)

Donor: /mnt/frankendom-donors/SWG-Source-src (VPS only, read-only). 7,920 files.
Half read: SERVER half (game/server, engine/server) plus the shared enum headers under game/shared and the data tables under game/server/database (schema, item_conversion, queries). Client half is NOT in the box (no client game code). Data pack (dsrc) is absent.
Paired donor: SWG-Source-swg-main (orchestration only; its dsrc, src, serverdata, stationapi and exe submodules are empty). See that donor's catalogue.
Confidence: high on what is listed as read; the audit (AU052) was checked and agrees except for the corrections in "Audit corrections" below.

## Restriction and licence (class C)
- _RESTRICTED-NOTE.txt line 1: leaked official SWG source, proprietary, no licence. Study shape and idea only.
- LICENSE.md line 1 is the GNU Lesser General Public License text. This conflicts with the restricted note, so the donor is class C.
- Shared enum headers carry a copyright line naming Sony Online Entertainment (2001).
- Rule for this donor: inspiration is category-level only. No constants, coordinates, names or exact looks are recorded. Every idea below is recreated as a clearly distinct original, never a copy.
- Not a legal opinion.

## Counts (what was actually found)
- Creatures: 0 creature template paths (grep of object/mobile across game/ returns nothing). Creature behaviour logic is present (7 behaviours, mental-state bands) but no creature families, names or stat blocks are in the box.
- Classes: no class or profession table in the box. Profession and skill-template names appear in code (profession in 95 files, skill_template in 15), but the data that defines them is absent. Mechanics present: Jedi roster, bounty hunter, pet-to-master link.
- Weapons: 16 distinct weapon template paths, 14 of which are lightsaber (crafted saber) variants.
- Gear: 271 distinct armour template paths in 22 armour folders; 9 paths carry a gp_ prefix (meaning not confirmed in code).
- Zones: 6 zone-type tables (planet_objects, cell_objects, building_objects, city_objects, battlefield_marker_objects, location_lists).

## 1. Creatures and beasts
- No creature families in the box (see Counts). What is present: a seven-step behaviour ladder and mental-state bands that drive creature escalation.
- Behaviour ladder (Behaviors.def, lines 16 to 23): calm, alert, threaten, retreat, flee, attack, frenzy. Calm is the start; frenzy is the top.
- Mental states drive the ladder. Fear has five levels (calm, alert, threaten, flee, panic) and anger has three (calm, attack, frenzy). Each behaviour sets a ceiling for the matching mental state (CreatureObject.cpp setMentalStateTowardClampBehavior, line 5860; band check at line 5896). The final write after the ceiling check was not read.
- Pets: creature_objects has a master_id column (creature_objects.tab line 8). The name suggests an owner link; how the server uses it was not read.
- Creature weapons: 119 NPC weapon rows (npc_weapon_loot.sql, insert lines from line 3) give attack speed and a damage range per row. The spread is wide, roughly two orders of magnitude. Values not recorded.
- Boss or elite pattern: not found in the box (no boss table, no spawn table). Not read: npc_spawner mentions in publish_gold_db_update_20090604.sql (name only).
- Top striking, category-level (no creature template exists to copy):
  1. Threat-ladder brute. A beast that steps through posture and colour from calm to frenzy. Silhouette change is the readable signal at 375 wide. Signature behaviour: the ladder. Sound: not in box.
  2. Three-stage fall. A creature that goes down, then incapacitated, then dead, rather than dying in one frame (see section 6, postures).
  3. Bonded pet. A pet that stores its owner's link (master_id column). Shared threat with the owner is reported by audit AU052 (HateList, not re-read here).

## 2. Classes, races and factions
- Jedi (Force user) roster, JediManagerObject.cpp. The server keeps a roster of Jedi players with state, faction, location, bounty value, spent Jedi skill points and script data. Progression is by spending Jedi skill points (updateJediSpentJediSkillPoints, line 705 area). Death state is a special flag that restricts what the character can do (States.def line 70). Client effect not read.
- Bounty hunter. A hunter role that accepts bounties on Jedi, counts its active bounties, and switches its PvP status on accept (see section 6 for the bounty rules).
- Battlefield faction. Participants carry a faction id (battlefield_participants.tab line 5). Jedi carry a faction int (updateJediFaction, JediManagerObject.cpp line 750).
- Races and species: a species mention exists in 45 files; no species table in the box. Not read.
- Progression shape: none beyond Jedi skill-point spending and bounty count. XP is a typed table (experience_points.tab, object_id, experience_type, points), not a level curve in the box.

## 3. Weapons
- Families (16 distinct template paths): melee sword, two-handed sword, polearm, crafted lightsaber (one-handed, two-handed, polearm), and ranged. Ranged has only 2 path references; detail not read.
- Tier ladder for lightsabers: one-handed generations 1 to 5 (saber_conversion.txt lines 6 and 10 show gen1 and gen5); polearm and two-handed generations 1 to 4. In the sampled rows the damage bands rise with generation.
- Component tiers: 12 advanced component twins (weapon_conversion.txt line 3 shows blaster_pistol_barrel_advanced). Advanced versions carry wider and higher damage bands than their basic twin in the sampled rows.
- Special properties: elemental type and elemental value columns exist on the conversion table (weapon_conversion.txt header). Set bonus: not found.
- Visual distinctness of tiers: not readable here (art absent). The name carries the generation.
- Top 5 striking, category-level:
  1. Five-generation saber ladder. One weapon family, five named generations. Readable as a growing blade at 375 wide. Keep the generation number and rising band; change to our own generation names and a glow that steps up.
  2. Basic and advanced twins. Each crafted part has a basic and an advanced version. Keep the pair; change the advanced look to a visible upgrade seam.
  3. Polearm and two-handed sabers sharing one generation scale. Keep the shared scale; change the silhouette.
  4. Modular gun parts. Guns built from named parts (barrel, power handler, feed mechanism, core). Keep the part-based build; change the part names.
  5. Melee sword family as a plain base set. Keep as baseline for the generation ladder.

## 4. Armour and gear
- Material and family ladder (folder names, armour template paths): padded, chitin, bone, composite, marauder, ubese, ris, zam, mandalorian, bounty hunter, stormtrooper, clone trooper, and a three-role species family (sentinel, guardian, defender).
- Tier shape: each armour piece has effectiveness as a banded value with four bands (armor_conversion.txt header and rows). A matching four-band general protection scale sits beside it. Values not recorded.
- Conversion to new templates: armour rows map old templates to new ones (New Template ID column). Shows the game tiers old gear to new gear by data, not code.
- How tiers show: the file names carry the family; in-game visual read not possible (client absent).
- gp_ prefix: 9 paths. Read as gold-plated only if the code says so; not confirmed. Marked unverified.
- Top 5 striking, category-level:
  1. Three-role family. One species armour family split into sentinel, guardian and defender roles. Keep three roles per material; change silhouette and colour per role.
  2. Material ladder from padded to composite. Keep the ordered material list; change the materials to our own (rope, shell, bone, plate).
  3. Four-band effectiveness per piece. Keep banded effectiveness; show each band as a visible tier pip on the piece.
  4. Named faction sets. Mandalorian, bounty hunter and stormtrooper sets as separate looks. Keep the separate sets; change names and looks.
  5. Gold-plated variant of a base piece (gp_ prefix). Keep the base-plus-variant pattern; change the finish to our own metallic.

## 5. Zones and dungeons
- Zone types from schema: planet (planet_name), city, building, cell (interior rooms), battlefield region with faction participants, location list (ordered points with a radius per scene), waypoints (coloured, active flag), installations (tick-based), harvester installations (extraction and hopper).
- Dungeon archetype: an interior NPC spawner script name appears (publish_gold_db_update_20090604.sql line 62). Name only; spawn logic not read.
- Biome list: not in box (no terrain, no planet list read). Marked not read.
- Hazards: status states (poisoned, bleeding, on fire, and one burn state per element, see section 6) act as hazard vocabulary. Zone-level hazard data not in box.
- Top 5 striking, category-level:
  1. Battlefield region with faction join. A region that tracks which faction each participant is in. Keep the region-plus-participant table; change to capture points with a timer.
  2. Ordered location list with radius. A list of points per scene, each with a radius. Keep as patrol or escort path data; change to a visible ground ring.
  3. Tick-based installation. An installation with a tick counter and power that runs while active. Keep the tick counter; change to a visible glowing fuel gauge on the camp object.
  4. Interior cells inside buildings inside cities. A nested zone hierarchy. Keep nesting; change to one room type per building.
  5. Waypoints with colour and an active flag. Map pings that can be hidden. Keep the active flag; change the colour rule to threat colour-coding.

## 6. Item and effect looks worth recreating (with paths)
- Burn states per element: ElectricBurned (States.def line 85), ColdBurned (line 86), AcidBurned (line 87), EnergyBurned (line 88), KineticBurned (line 89). Technique: one status state per element; client visual not read. Recreate as an element-tinted rim and ember particle per element.
- Glowing dead-Jedi state: GlowingJedi (States.def line 70). Technique: a glow state tied to a death condition; client visual not read.
- Disguised: States.def line 84. Technique: a status state; client visual not read. Recreate as a shimmer or translucency.
- Poisoned, bleeding, on fire: States.def lines 72, 73, 75. Technique: status overlays; not read.
- Downed postures: KnockedDown (Postures.def line 66), Incapacitated (line 67), Dead (line 68). Technique: posture change on the same body; death presentation.
- Combat attitude stance: CombatAttitudeAggressive (States.def line 58) with evasive and normal beside it. Technique: stance state; pose not read.
- Saber generations: sword_lightsaber_one_handed_gen1 and gen5 (saber_conversion.txt lines 6 and 10). Technique: a generation ladder; glow not read (art absent).
- Crystal-named lightsaber modules: lightsaber_module_force_crystal and lightsaber_lance_module_force_crystal (item_conversion or component paths). Name only.
- Hit regions: six body regions (combat.def lines 21 to 25 and the whole 32-line enum). Recreate as per-creature regions with a flash on the silhouette.

## 7. Inspiration for Frankendom (originals; each distinct, never a copy)
1. Bounty board of fallen champions. A visible roster of hunted players with a bounty count and a capped list of hunters. Keep: per-target hunter cap, one entry per hunter, server authority for the write. Change: cap at our MAX_ATTACKERS-style limit of 3; show bounty as a ring not a number; no callback-driven PvP toggle.
2. Threat-ladder beast. Calm, warn, attack, frenzy, four steps readable by colour ring and posture. Keep: a fixed ladder driven by a single meter. Change: four steps, not seven; no ceiling arithmetic; ring colour instead of a number.
3. Three-stage fall. Knocked down, then downed, then dead, with a finisher window in the middle. Keep: graded fall. Change: our finisher window and a readable downed pose.
4. Pet bound to master. A companion that holds its owner's link and shares threat. Keep: master link and shared threat. Change: our companion silhouette and a leash ring, not a bar.
5. Crafted-generation sword. Five generations of one blade; each one steps up the glow and band. Keep: generation number and rising band. Change: our generation names, a glow that steps up, and the crafted-part pairing.
6. Basic and advanced component twins. A crafted part with a basic and an advanced version that shows as a seam on the object. Keep: twin pair. Change: our seam look and our part names.
7. Three-role armour family. One material, three roles (for example sentinel, guardian, defender) with silhouette and colour per role. Keep: role variants. Change: role names and silhouettes.
8. Element-tinted status rim. One status state per element with its own rim tint and ember or frost particle. Keep: one state per element. Change: our palette (not copied) and our particle shapes.
9. Battlefield region with factions. A capture region that tracks faction membership. Keep: region-plus-participant table. Change: capture points with a timer and a faction ring.

## Audit corrections (checked this turn)
- Schema directory has 67 entries, of which 58 are .tab files (audit said 67 schema tables; the 67 counts all schema files).
- The audit's "no creature templates" statement is confirmed (object/mobile returns nothing).

## Defects noticed (keep the idea, fix the defect)
- JediManagerObject getJedi (line 908 comment, allocations just after): returns raw `new` vectors that the caller must free. Fix: return owned containers (vectors by value or unique_ptr) so no caller has to free them.
- C++UpdatePvp message delay: the bounty request sends delay 10 (line 1281) while the other call sites send 0 (lines 393, 1333, 1370, grep-verified). Intent unknown. Fix: pick one delay and name it, or comment why bounty is delayed.
- Fear and anger ceilings use an index offset with a minus-one clamp (CreatureObject.cpp around lines 5900 to 5930). Not fully read, so not judged. Fix (if needed): one lookup table indexed by behaviour name.

## Licence note
LICENSE.md line 1 is LGPL text. The restricted note says proprietary with no licence. Treated as class C. Category-level use only.

## Not read
- Client half (absent from the box).
- dsrc data pack (absent).
- Creature, class and profession data tables (absent).
- Final write in setMentalStateTowardClampBehavior after the ceiling check.
- HateList and ScriptMethodsHateList (covered by audit AU052; not re-read here).
- Spawn caps and respawn (not in box beyond a script name).
- Profile binaries (.profdata).
- Full SQL bodies beyond npc_weapon_loot.sql and the one publish script line.

Reuse tag: catalogue only; no code reused.
