# TrinityCore-TrinityCore (design catalogue, DC056)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore` (read over ssh on the VPS, read-only).
Licence: GPL-2.0 for the code (COPYING line 1, TC-R37). Game data origin unstated; asset audit class C (AU053).
Halves read: SERVER half (`src/server/game` enums, `src/server/scripts` boss and zone files) and DATA half schema only (`sql/base/dev/*.sql`, `sql/updates`, `sql/old`). CLIENT half (DB2/art/audio) is not in the box.
Paired donor in the box: none.

Rule for every item below (Dom, 2026-10-11): recreate as a clearly distinct original, never a copy. Inspiration is at category level only (this donor is class C), so names, looks, numbers and ids are ours. KEPT and CHANGED are named on each entry.

## Important limits
- Creature, item and map ROW data is not in the box. `sql/base/dev/*.sql` holds schema only (zero INSERT rows). The row-bearing files under `sql/old` and `sql/updates` are patch trails, not full tables. So no creature, item or set counts are claimed.
- Counts below come from enums and folder listings, which I did count. They are not row counts.

## 1. Creatures and beasts
- Type enum: 15 ids (Beast, Dragonkin, Demon, Elemental, Giant, Undead, Humanoid, Critter, Mechanical, Not specified, Totem, Non-combat pet, Gas cloud, Wild pet, Aberration). File: `src/server/game/Miscellaneous/SharedDefines.h` lines 5016-5032 (TC-R01, TC-R02).
- Grouping helpers exist, e.g. a demon-or-undead mask (TC-R03).
- Family enum: 86 entries including id 0 (`SharedDefines.h` 5040-5130). Named families by group, identity only; behaviour per family is not read:
  - Beast-like: wolf 1, cat 2, spider 3, bear 4, boar 5, crocolisk 6, carrion bird 7, crab 8, gorilla 9, raptor 11, tallstrider 12, hyena 25, bird of prey 26, wind serpent 27, dragonhawk 30, ravager 31, warp stalker 32, spore bat 33, ray 34, serpent 35, moth 37, chimaera 38, devilsaur 39, worm 42, clefthoof 43, wasp 44, core hound 45, spirit beast 46, fox 50, monkey 51, hound 52, beetle 53, shale beast 55, hydra 68, basilisk 130, stone hound 128, mammoth 300, whiptail 315.
  - Demonic: felhunter 15, voidwalker 16, succubus 17, doomguard 19, imp 23, felguard 29, felimp 100, voidlord 101, shivarra 102, observer 103, wrathguard 104, infernal 108, terrorguard 147, abyssal 148, incubus 302.
  - Undead: ghoul 40, zombie 56, abomination 155, blood beast 296.
  - Elemental: water 49 (TC-R06), fire 116 (TC-R07), earth 117, storm 145.
  - Dragonkin-like: lesser dragonkin 303, pterrordax 290, lizard 288.
  - Family 57 is labelled QA test in the enum. Not a design source.
- Boss pattern (scripts read):
  - Health-threshold air phase: lift off at 65 percent (TC-R16), takeoff to a fixed hover point (TC-R18, TC-R40). At 40 percent, while airborne, the script leaves the air phase and re-enables ground combat (TC-R17). The landing sequence itself is not fully read.
  - Summon cap by mode: 20 or 40 adds, as the RAID_MODE values (TC-R19).
  - Late-phase switch at 35 percent health (TC-R27, threshold only; the body is not read).
- Rank/elite enum: not located under `src/server/game` headers (not read).

Top 8 striking (each is a category-level original, label is ours):

1. Brood Sky Matron (own label). Why striking: a ground boss that lifts off at a health threshold and drops a capped swarm; reads well at 375 wide because the takeoff is a big silhouette change. Keep: threshold lift, capped swarm per phase, a second threshold that ends the air phase. Change: our arena and names, a shorter-lived swarm, our own telegraphs. Ref: `src/server/scripts/Kalimdor/OnyxiasLair/boss_onyxia.cpp` lines 324, 386, 246, 460 (TC-R16, TC-R17, TC-R18, TC-R19).
2. Sweep Warden (own label). Why striking: the arena itself is the threat, with a timed safe lane (detail in section 5). Keep: a telegraphed safe lane that moves on a timer, and a timed window. Change: our tile shapes, our telegraph colours, no teleport punishment. Ref: `src/server/scripts/Northrend/Naxxramas/boss_heigan.cpp` lines 67, 162, 195, 197 (TC-R20, TC-R21, TC-R23, TC-R24).
3. Ice Wyrm Late Rise (own label). Why striking: a second behaviour switch at 35 percent health. Keep: the threshold switch idea. Change: everything else. Ref: `src/server/scripts/Northrend/IcecrownCitadel/boss_sindragosa.cpp` line 407 (TC-R27). Body not read; claim limited to the threshold.
4. Four-Element Brood (own label). Why striking: four elemental families give four distinct silhouette and palette groups. Keep: one family per element. Change: our four elements, our moves, our sound. Ref: `SharedDefines.h` 5083 (water), 5098 (fire), 145 storm and 117 earth (TC-R06, TC-R07). Identity only; behaviour not read.
5. Hydra-Kin (own label). Why striking: a multi-head silhouette can be read at 375 wide. Keep: the multi-head silhouette idea. Change: head count, colour and attack pattern. Ref: `SharedDefines.h` 5091 (family 68). Identity only; behaviour not read.
6. Felguard Warband (own label). Why striking: a demonic group of mixed families that share a type mask. Keep: group composition from one type mask. Change: our names and roles. Ref: `SharedDefines.h` 5066 (felguard 29) and 5035 (mask) (TC-R08, TC-R03). Identity only.
7. Crypt Ghoul (own label). Why striking: a simple undead family set that can scale in count. Keep: a small family set per undead tier. Change: our look, our moves. Ref: `SharedDefines.h` 5076 (ghoul 40) (TC-R09). Identity only.
8. Wintergrasp Turret (own label). Why striking: siege guards that are creatures tied to tower state. Keep: turrets tied to the objective state. Change: our faction and our shapes. Ref: `src/server/scripts/Battlefield/BattlefieldWG.cpp` line 221 (TC-R38). The comment marks it as a todo; behaviour not read.

## 2. Classes, races and factions
- Classes: 15 non-zero entries, from Warrior (1) to Traveler (15) (`SharedDefines.h` 156-170; TC-R10, TC-R11). Entries include Adventurer (14) and Traveler (15), which are labelled in the file.
  - Role and signature mechanic per class: not read (spec and talent files not in the box; `chr_classes` and `chr_specialization` are schema only, hotfix schema at `sql/base/dev/hotfixes_database.sql` 1768).
  - Progression shape: not read.
- Races: 32 uncommented ids in `src/server/game/Miscellaneous/RaceMask.h` (count of `RACE_* = ` lines not starting with a comment). Examples: Human 1 (line 30), Dark Iron Dwarf 34 (TC-R12), Dracthyr entries 52 and 70 (two faction ids).
  - Race mechanics and racials: not read.
- Factions: not read.

## 3. Weapons
- Weapon rows are not in the box. Schema only: `item_damage_one_hand`, `item_damage_two_hand`, `item_damage_*_caster`, `item_damage_ammo` in `sql/base/dev/hotfixes_database.sql`.
- Weapon families, tiers and special properties: not catalogued. Honest gap.
- Top 5 striking weapons: none verified (no rows read).

## 4. Armour and gear
- Quality ladder (`SharedDefines.h` 380-392): 0 poor, 1 normal, 2 uncommon, 3 rare, 4 epic (TC-R13), 5 legendary (`SharedDefines.h` 387), 6 artifact, 7 heirloom (TC-R14), 8 wow token. Colour names appear only in comments; no art colour codes are taken.
- Sets: `item_set` table (hotfix schema line 5509, TC-R34) and `item_set_spell` (line 5571, TC-R39). Set rows are not in the box, so set counts are not claimed.
- Look and cosmetic tables (schema only, row data not read): `item_appearance`, `item_modified_appearance`, `transmog_set`, `transmog_outfit_slot_info`, `artifact_appearance_set`, `artifact_tier` (`sql/base/dev/hotfixes_database.sql`).
- Top 5 striking (conditional, from schema and enums, not from rows):
  1. Quality ladder with 9 tiers and a separate heirloom tier (TC-R13, TC-R14). Keep the stepped ladder. Change: our ramp, our glow and sound per step.
  2. Set bonus table (TC-R34, TC-R39). Keep: set members plus a set spell. Change: our set names and rules.
  3. Appearance-over-stats tables (transmog). Keep the separation of look from stats. Change: our rules.
  4. Artifact tier table. Keep: one item that grows through tiers. Change: our shape.
  5. Heirloom tier as a distinct gear class. Keep: a tier that scales with level. Change: ours.
  Each of these is a schema-level idea only; no row evidence.

## 5. Zones and dungeons
- Zone script files: 68 `zone_*.cpp` files across the expansion folders (folder listing). Examples with paths: `Northrend/zone_wintergrasp.cpp`, `EasternKingdoms/zone_tol_barad.cpp`, `DragonIsles/zone_the_forbidden_reach.cpp`, `Maelstrom/zone_deepholm.cpp`, `BrokenIsles/zone_mardum.cpp`, `Draenor/zone_assault_on_the_dark_portal.cpp`, `Outland/zone_netherstorm.cpp`, `Pandaria/zone_the_wandering_isle.cpp`.
- Dungeon and raid archetypes: about 91 subfolders across the expansion script trees (mix of instances and zone sub-scripts; not classified). Examples: `Kalimdor/OnyxiasLair`, `Northrend/Naxxramas`, `Northrend/IcecrownCitadel`, `Kalimdor/Firelands`, `Outland/BlackTemple`, `Outland/CoilfangReservoir`.
- Battlegrounds: 31 folders in `src/server/scripts/Battlegrounds`.
- PvP zones: 5 outdoor PvP scripts (`OutdoorPvP/OutdoorPvP{HP,NA,SI,TF,ZM}.cpp`), 2 battlefields (`Battlefield/BattlefieldWG.cpp`, `BattlefieldTB.cpp`).
- Hazards: floor-section eruptions (section 1, Sweep Warden), siege towers and cannons (Wintergrasp), capture points (outdoor PvP).
- Map types: 9 entries in `DBCEnums.h` 1597-1607 (common, instance, raid, battleground, arena, scenario, wowlabs, house interior, house neighbourhood; TC-R15).
- Torghast-style tower: `Shadowlands/Torghast/spell_torghast.cpp` is the only file in that folder; layers and floors not read.

Top 5 striking zones:
1. Wintergrasp-style siege zone. Why: a timed battle where towers, turrets and a relic set the outcome. Keep: a timed battle, tower state counts feeding the objective (TC-R30), two end paths (timer or objective, TC-R29 signature). Change: our zone, our factions, our end rules. Ref: `src/server/scripts/Battlefield/BattlefieldWG.cpp` lines 422, 626, 1152 (TC-R28, TC-R29, TC-R30).
2. Sweep chamber. Why: a floor that is itself a timed puzzle (section 1). Keep: a safe lane that moves; a timed window. Change: our shapes. Ref: `boss_heigan.cpp` 67-197 (TC-R20 to TC-R25).
3. Capture-point zone. Why: capture points as the objective per zone. Keep: one capture-point class per point. Change: our points and sound. Ref: `src/server/scripts/OutdoorPvP/OutdoorPvPZM.h` line 155 (TC-R31). Class declaration read; point logic not read.
4. Air-room arena. Why: a boss room with a fixed ground point the boss walks to before takeoff and a fixed hover point. Keep: the two fixed points (TC-R40; `boss_onyxia.cpp` line 115 for the ground point). Change: our room geometry.
5. Torghast-style tower. Why: a single script file hints at a layered tower; layering not read. Keep: undecided. Change: ours. Ref: `src/server/scripts/Shadowlands/Torghast/spell_torghast.cpp` (identity only; not read).

## 6. Item and effect looks worth recreating
- Floor-tile telegraph. Technique: per-section game-object tiles that cast a trap spell on the erupt tick, unsafe sections only (TC-R25, TC-R41). Ref: `boss_heigan.cpp` 180, 187.
- Takeoff lift. Technique: enable flight, then a move to a fixed hover point (TC-R18, TC-R40). Ref: `boss_onyxia.cpp` 241, 246. Landing not fully read.
- Quality ladder. Technique: nine tiers in one enum (TC-R13, TC-R14). Ref: `SharedDefines.h` 380-392.
- Siege state. Technique: destroyed and damaged tower counts drive the objective (TC-R30; `UpdateDamagedTowerCount` at `BattlefieldWG.cpp` 1233, not re-read). Ref: `BattlefieldWG.cpp` 1152.
- Spell visuals: `spell_visual`, `spell_visual_kit`, `spell_visual_missile` and `spell_visual_effect_name` exist in the hotfix schema. Row data not read; no glow or aura values taken.

## 7. Inspiration for Frankendom (originals, our names)
1. Brood Sky Matron. Idea: a ground boss that lifts at 65 percent, drops a capped swarm, and ends the air phase at 40 percent. Keep: threshold lift, capped swarm, second threshold. Change: our arena, our names, a shorter swarm.
2. Sweep Warden. Idea: a timed safe lane sweeps a four-section floor; unsafe sections erupt; a dance window every 90 s. Keep: the moving safe lane and the timed window. Change: ring-shaped tiles, a readable telegraph, no teleport penalty.
3. Siege Towers zone. Idea: a timed siege where tower counts set the objective. Keep: tower counts feed the objective and a timer end. Change: our zone, factions, and end rules.
4. Four-Element Brood. Idea: four elemental groups with four silhouettes. Keep: one family per element. Change: ours.
5. Quality ladder with nine steps. Idea: a stepped gear tier ladder with a heirloom step. Keep: the step count and heirloom class. Change: our colours, glow and sounds.
6. Capture-point zones. Idea: capture points as the zone objective. Keep: one point class. Change: ours.

## Not read
- Row data for creature, item, quest, spawn and map tables (schema only in the box).
- Creature rank/elite enum, creature template rows, creature loot and spawns.
- DB2 client data, art, models, audio, camera, sound (none in box).
- Class and race mechanics, talents, specs, progression.
- Weapon and armour rows, set rows, appearance rows.
- Sindragosa script body (threshold read only). Onyxia script beyond the phase lines above. Heigan `TeleportCheaters` body.
- Battlefield WG body beyond the three functions named; Outdoor PvP point logic.
- Torghast layering.
- `dep/` (third-party libraries; licence per library not read).
- Threat and spawn logic in the server core are covered by AU053 and not re-read here.
