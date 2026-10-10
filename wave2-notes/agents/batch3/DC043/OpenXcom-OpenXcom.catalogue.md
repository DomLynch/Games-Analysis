# OpenXcom-OpenXcom (design catalogue, DC043)

Donor: OpenXcom-OpenXcom (VPS: /mnt/frankendom-donors/OpenXcom-OpenXcom/). Ruleset data is read from bin/standard/xcom1 (UFO set) and bin/standard/xcom2 (TFTD set).
Licence (as the files say): code GPL-3.0+ (LICENSE.txt:2, install/debian/copyright:8). Weapon art for the TFTD set is CC BY-SA 4.0 (bin/standard/xcom2/Resources/Weapons/license.txt:4). The original game sprites, maps and audio are not in the repo; README.md:17 says a vanilla copy is required. Rights holder of the original game: the metadata names Microprose (bin/standard/xcom2/metadata.yml:7); current owner not stated in the files.
Donor class: B for rules, code and data. Original-game art is not in the box, so no look here is copied from it.
Dom's rule for every entry below: recreate as a clearly distinct original, never a copy. Our labels are our own. The donor's unit and item ids appear only in the ref column so a human can look.

## Halves read
- Data half (read): both rulesets. Tables: units.rul, alienRaces.rul, alienMissions.rul, alienDeployments.rul, alienItemLevels.rul, armors.rul, items.rul, terrains.rul, mapScripts.rul, soldiers.rul, ufos.rul (xcom1 and xcom2). Strings: counted only (xcom1 Language/en-US.yml, 1090 lines; xcom2 en-US.yml, 1231 lines, 1133 STR_ keys).
- Engine half (read, in part): src/Battlescape (BattlescapeGenerator.cpp, AIModule.cpp, MeleeAttackBState.cpp, UnitDieBState.cpp, BattleUnit.cpp, Map.cpp, UnitSprite.cpp, TileEngine.cpp 828-861), src/Mod (RuleMissionScript.cpp, RuleItem.h, Unit.h), src/Geoscape/GeoscapeState.cpp 2622-2628.
- Server and client: one process, no split. The engine is the whole game.
- Resource pack (PCK sprite sheets, MAP and ROUTES binaries, audio): not read. The repo does not hold it; the README says the user copies it in.
- Paired donor in the box: none. OpenGFX (the free graphics pair for OpenTTD) is not in the box. Nothing here is checked for a pair with another donor.

## Counts (what each number counts)
- creatures: 55 alien rows across both sets (xcom1 30, xcom2 25). Excludes player tanks and hover tanks, civilians and the TFTD player vehicle rows. Zombie rows are counted as creatures.
- classes: 19 = 18 alien composition lists (xcom1 6 including a mixed list, xcom2 12 including underwater and mixed-crew lists) plus 1 human soldier type (xcom2 soldiers.rul:2).
- weapons: 42 firearm rows (battleType 1; 21 per set, including vehicle guns). Ammo, melee and grenade rows are not in this number.
- gear_sets: 52 armour rows across both sets (xcom1 28, xcom2 24). This includes civilians and the "none" row and creature hide rows.
- zones: 32 terrain rows (xcom1 10, xcom2 22). Mission types: 8 (xcom1) and 10 (xcom2). Battle deployment types: 13 (xcom1) and 22 (xcom2).

## 1. Creatures and beasts
Families (12 per set, each with a rank ladder of 5 to 6 rows):
- UFO set (xcom1/units.rul): a grey family with 6 rows (rows 151 to 261); a floating family with 6 rows (311 to 431, floatHeight set); a snake-like family with 5 rows (479 to 571); a heavy armoured family with 3 rows (619 to 642 and 665); a tall family with 3 rows (740 to 786); and single-row living-weapon creatures: a robotic disc (283), a melee-only reaper (455), a melee-only chryssalid (595), a silacoid (688), a celatid acid-spitter (714), a walking sectopod (809), and a zombie (834).
- TFTD set (xcom2/units.rul): aquatoid (6 rows, from line 2), gillman (4), tasoth (2), lobsterman (5, from line 266), deep one (1), triscene (1, line 409), xarquid (1), calcinite (1), tentaculat (1, line 484), hallucinoid (1), biodrone (1, line 535), zombie (1).
- Rank ladder: a family's rows are a set of roles (soldier, leader or squad leader, engineer or technician, medic, navigator, commander; the names vary by family). The race lists (alienRaces.rul) put the commander first (alienRaces.rul:4 is the commander at index 0). alienRank in the deployment table picks the row by index (alienDeployments.rul:4 uses rank 5, the soldier end, for the small scout).
- Escalation with level: four levers, all data or code:
  1. Race weights are a step function keyed by months passed (alienMissions.rul:6 for the research mission). The engine picks the highest key not above the current month (RuleMissionScript.cpp:321 and 326).
  2. Item tier (built-in weapon level) is drawn per unit from a 10-slot row for the current month (alienItemLevels.rul:2 and BattlescapeGenerator.cpp:1098). The month index is capped at the table length.
  3. Quantity: a base chosen by difficulty band (beginner and experienced use the low value, veteran and genius the midpoint, super the high value), plus RNG(0, dQty) plus RNG(0, extraQty) (BattlescapeGenerator.cpp:1081, 1083, 1089).
  4. Placement: a percentage chance that each unit spawns outside the craft (BattlescapeGenerator.cpp:1093).
- Boss pattern: the Cydonia landing (alienDeployments.rul:1168) drops 4 to 6 rank-5 units plus 3 to 5 rank-1 units, with a 60 percent chance of each unit placed outside the craft in the first block. The final assault (alienDeployments.rul:1246) lists rank 0, rank 1 and rank 2 blocks; the rank 0 and rank 1 blocks carry heavy-plasma item sets (the rank 2 block was not read). The BOSSBATTLE map script (mapScripts.rul:105) has more block commands than the alien base script it resembles (mapScripts.rul:74).
- Signature abilities (one line each, read from the rows):
  - living weapon: the body is the weapon, no separate item (livingWeapon field on 7 rows in xcom1 and 8 rows in xcom2).
  - explode on death (specab 1, Unit.h:26 enum; the cyberdisc row).
  - burn the floor when moving (specab 2, silacoid row).
  - burn and explode (specab 3, biodrone row).
  - zombie-maker: a melee hit marks the victim to rise as a zombie (MeleeAttackBState.cpp:244-245). A zombie on death converts to its spawnUnit (units.rul:856; UnitDieBState.cpp:230).
  - floating: floatHeight on floater, hover and celatid rows.
  - per-unit aggression 0 to 2 and intelligence fields (see section 6 and the originals).

Top 8 most striking (label is ours):
1. Hive-walker (xcom1 sectopod row, units.rul:809). Why: the highest front armour of any alien row in the UFO set (armors.rul:243 gives the front value well above the other alien rows); a walking chassis that reads at 375 wide. Keep: heavy front, weaker rear and underside (armour facings by side). Change: the plate that breaks off becomes a visible break, not a generic walker shell. Ref: units.rul:809, armors.rul:243.
2. Bone-blade runner (xcom1 chryssalid row, units.rul:595). Why: melee only (firing skill zero), the largest time-unit pool of any UFO-set creature row, and its infection chain (zombie to runner, units.rul:856). Keep: a melee-only fast body, one infection stage that shows on the victim. Change: the infection has a visible timer and can be cured; the second form is ours, not a copy. Ref: units.rul:595, 834, 856; MeleeAttackBState.cpp:244-245.
3. Floating ladder (xcom1 floater family, units.rul:311 to 431). Why: a six-rank family of hovering units, a readable ladder from soldier to commander, all with the same hover height. Keep: one body, six roles, ranks raise stats and armour. Change: each role gets its own silhouette, not one body with a palette swap. Ref: units.rul:311, 431; armors.rul (FLOATER_ARMOR0 to 2).
4. Heavy brute (xcom1 muton family, units.rul:619). Why: a high-health body with three armour tiers by rank, reads well at distance. Keep: a tanky body with tiered armour per role. Change: the armour plates are separate sprite layers that can be lost in a fight. Ref: units.rul:619, 642, 665; armors.rul MUTON_ARMOR0 to 2.
5. Mech dome (xcom1 cyberdisc row, units.rul:283). Why: a living weapon that explodes on death (specab 1, Unit.h:26). A readable threat: the player knows what a kill costs. Keep: the punish on death. Change: our death is a shock ring with a short warning, not a blast. Ref: units.rul:283; Unit.h:26; BattlescapeGame.cpp:542 (the explode-on-death check).
6. Acid spitter (xcom1 celatid row, units.rul:714). Why: the highest firing skill of any UFO-set creature row, and its built-in weapon is an acid-type firearm row (items.rul, CELATID_WEAPON, damage type 8). Keep: ranged acid as its own damage type. Change: acid leaves a pool on the floor that can be walked around. Ref: units.rul:714; items.rul (CELATID_WEAPON); RuleItem.h:27.
7. Walking mother (TFTD tentaculat row, xcom2/units.rul:484; zombieUnit at line 507). Why: the body leaves a second body on death (zombieUnit field). The reveal is a reversal of the usual kill. Keep: the death spawns a follow-up. Change: the follow-up is a different creature from the zombie, with its own silhouette. Ref: xcom2/units.rul:484, 507, 564.
8. Burning spore pod (TFTD biodrone row, xcom2/units.rul:535). Why: burns the floor and explodes on death (specab 3, Unit.h:26). Fire and blast in one death. Keep: the fire-plus-blast death. Change: the fire stays on the tile where it dies, and the warning is a glow on the ground before the blast. Ref: xcom2/units.rul:535; Unit.h:26; Map.cpp:466 (fire overlay frames).

Sound: each row has a deathSound and a moveSound id (units.rul rows). The audio is not in the box, so no sound is copied; the ids only show that each family has its own death sound.

## 2. Classes, races and factions
- Human soldier: one type (xcom2/soldiers.rul:2, STR_SOLDIER) with a rank ladder in code. Sergeant, captain, colonel and commander add a bonus to the unit's value (BattleUnit.cpp:113-116; the commander bonus is at line 116). Progression: stats rise by training; the rank comes from missions.
- Alien factions: 6 composition lists in the UFO set (xcom1/alienRaces.rul) and 12 in the TFTD set (xcom2/alienRaces.rul, from line 2). A list gives the rows a mission can draw, by rank index. The UFO-set mixed list (xcom1/alienRaces.rul:52) draws from five families; the TFTD mixed-crew list (xcom2/alienRaces.rul:90) draws from several.
- Progression shape per family: rank index picks the role; alienMissions raises the share of stronger families with months passed; alienItemLevels raises the weapon tier with months passed.

## 3. Weapons
Families (UFO set, xcom1/items.rul):
- Plasma ladder: pistol, rifle and heavy (items.rul:762, 722, 682), each with a clip row (plasma damage type, damage type 5). Deployment item sets pair the heavy one with an alien grenade (alienDeployments.rul; the grenade row is items.rul:878). Tier sizes are data; the sprites are not read.
- Laser ladder: pistol, rifle and heavy (laser damage type 4).
- Projectile ladder: pistol, rifle, heavy cannon and auto cannon with AP, HE and incendiary ammo rows (damage types 1, 3 and 2).
- Rocket family: rocket launcher with small, large and incendiary rockets (damage types 3 and 2).
- Living weapons: built-in weapons for creatures (cyberdisc, celatid, sectopod). Melee-only bodies have no item at all.
TFTD set (xcom2/items.rul):
- Gauss ladder: pistol (527), rifle (565), heavy (604), each with a clip row of damage type 4.
- Torpedo swap: one launcher (447) with small (470), large (489) and phosphorous (508) ammo rows of different damage types (HE, HE and fire).
- Sonic family: cannon, blasta rifle and pistol, with a power clip of damage type 5.
- Stun and shock: thermal shok launcher (978) with a stun bomb row (1001; damageType 6 at line 1013).
- Harpoons and dart pods for the underwater vehicles.
- Melee: vibro blade (1064) and creature melee bodies (battleType 3, damage type 7).
Special properties: the damage types are an enum of ten (RuleItem.h:27): none, armour piercing, incendiary, high explosive, laser, plasma, stun, melee, acid and smoke. Smoke is converted to stun before any damage (BattleUnit.cpp:1108). Each armour row carries a 10-entry multiplier list, so a weapon's type is a real counter.
Visual tiers: each weapon has an inventory sprite and a floor sprite (sprite refs in items.rul). The art is not read here, so distinctness is not measured.

Top 5 weapons (striking):
1. Plasma ladder (xcom1/items.rul:762, 722, 682). Keep: three tiers with clips, same family look at three sizes. Change: our tiers differ by a glow on the barrel, not by size only. Why: a ladder that reads at 375 wide.
2. Gauss ladder (xcom2/items.rul:527, 565, 604). Keep: pistol, rifle and heavy share a charge-pack clip. Change: the heavy one fires a visible charge line, and the clip is a chamber indicator. Why: charge packs as a readable clip.
3. Torpedo swap (xcom2/items.rul:447, 470, 508). Keep: one launcher, three ammo rows with different damage types. Change: the player swaps ammo in the field, the launcher stays. Why: ammo as the build choice, one silhouette.
4. Thermal shok bomb (xcom2/items.rul:978, 1001, damageType 6 at 1013). Keep: a stun-type area weapon that knocks out, does not kill. Change: a ring of pale heat that a reader can see from the fight camera. Why: non-lethal area control.
5. Vibro blade (xcom2/items.rul:1064). Keep: melee weapon with a damage type of its own. Change: its trail is a short arc. Why: melee that reads in one frame.

## 4. Armour and gear
- Human gear tiers, four per set: none, light (personal armour in the UFO set, plastic aqua armour in the TFTD set), heavy (power suit, ion armour), and top (flying suit in the UFO set, magnetic ion armour in the TFTD set). Source: xcom1/armors.rul:54 and xcom2/armors.rul:84.
- Facings: each armour row has four values (front, side, rear, under) and a 10-entry damage multiplier list (armors.rul rows). The facing is picked from the hit direction (BattleUnit.cpp:1096 to 1150). Side armour is subtracted from the power that comes through (BattleUnit.cpp:1178).
- Creature hides are armour rows too: 12 families per set, with rank ladders (lobsterman armour 0 to 2 rises with rank, xcom2/armors.rul:241).
- How the game shows a tier: the unit sprite comes from the armour's sprite sheet (spriteSheet field, e.g. TDXCOM_2.PCK for both ion tiers). The inventory sprite is a second field (spriteInv). Face and hair colour sets are per armour row, and drawingRoutine picks the layer order (UnitSprite.cpp switch on the routine and facing).
- Material looks: tiers use different sprite sheets (for example TDXCOM_1 and TDXCOM_2 for the TFTD human tiers). Colour recolour is done at draw time (UnitSprite.cpp:149).

Top 5 gear (striking):
1. Power suit (xcom1/armors.rul:54). Keep: a suit tier that sits between bare and top, with a visible silhouette change. Change: the suit's joints light up when armour is high. Why: tier you can read from behind.
2. Magnetic ion armour (xcom2/armors.rul:84). Keep: the top human tier on the same sheet as the tier below, so the upgrade is a palette and layer change. Change: a field effect at the top tier. Why: the cheapest top-tier look.
3. Sectopod shell (xcom1/armors.rul:243). Keep: a heavy front and a weak rear, so the flank matters. Change: the rear plate breaks and shows the drop. Why: directional armour in one silhouette.
4. Triscene shell (xcom2/armors.rul:385). Keep: a very high front value with a thin underside. Change: the underside weakness is a crouch-only window. Why: a weak point that a player can aim for.
5. Lobsterman armour ladder (xcom2/armors.rul:241 onward). Keep: three armour tiers by rank, the tiers rise slowly. Change: each tier adds one visible plate. Why: rank as a readable armour step.

## 5. Zones and dungeons
- Biomes (UFO set): 10 terrains: farmland, desert, forest, jungle, mars, mountain, polar, underground base, urban and alien base (xcom1/terrains.rul:2 onward). Each has a map script (xcom1/mapScripts.rul) with fill rules.
- Biomes (TFTD set): 22 terrains (xcom2/terrains.rul:2 onward): seabed, pipes, a plane site, several sunken and ruined sites, a volcano, a coral reef, a port, an island, a cargo site, alien bases, a level set, and a crypt. Some have a depth band field; the rest do not.
- Dungeon-like archetypes: the alien base (mapScripts.rul:74) carves tunnels with digTunnel and swaps wall and floor tiles by set (mapScripts.rul:88, MCD replacements). The boss battle (mapScripts.rul:105) is a larger version of the same carve. The TFTD alien colony map script is at xcom2/mapScripts.rul:122.
- Missions as zones: terror (alienDeployments.rul:706), alien base assault (843), base defence (alienDeployments.rul, STR_BASE_DEFENSE), Cydonia landing (1168), the final assault (1246). Only the first rows of the last two were read; the terror and base-defence bodies were not read.
- Hazards: the mission deployments carry tile debris sets (the seabed biome lists UFO debris, sand, rocks and weeds as map data sets). Night and day are a shade value per deployment (alienDeployments.rul shade fields, e.g. line 993 in the UFO set). Two utility rulesets force always day or always night (bin/standard/XcomUtil_Always_Daytime and XcomUtil_Always_Nighttime).

Top 5 zones (striking):
1. Alien base tunnels (xcom1/mapScripts.rul:74 and 88). Keep: a procedural carve from a seed, then a set-by-set wall swap. Change: our tunnels carve from a grid that reads at 375 wide, not from a fixed block set. Why: a dungeon from one carve rule.
2. Cydonia landing and final assault (xcom1/alienDeployments.rul:1168 and 1246). Keep: a late-campaign boss zone with the heaviest unit tier. Change: the boss zone gets a timed arrival, not a fixed roster. Why: a finale with a clear rank ladder.
3. Terror town (xcom1/alienDeployments.rul:706). Idea only (body not read): a town mission where a few enemies spread the fight. Keep: the town as a many-vs-one zone. Change: civilians flee in one readable direction (our idea, not in the donor data). Why: a town fight that reads.
4. Seabed debris (xcom2/terrains.rul:2 and the SEABED block). Keep: a sea floor with debris and weeds from one set of tiles. Change: the debris is a hazard that slows the player in a cone. Why: cheap biome from a shared tile pool.
5. Alien colony (xcom2/mapScripts.rul:122). Keep: a multi-level alien site. Change: levels are a stair, not a lift. Why: vertical zone reads at phone width.

## 6. Item and effect looks worth recreating
- Breathing bubbles (idle). When a unit's armour has drawBubbles set, its breath frame runs and the bubble overlay draws from the breath sheet (BattleUnit.cpp:102; Map.cpp:472). Eleven TFTD armour rows set it: the four human tiers (so humans breathe underwater) and seven alien rows (xcom2/armors.rul). None in the UFO set. Idle vocabulary for underwater units.
- Fire overlay. A burning unit draws a frame from the smoke sheet, advancing with animation frame (Map.cpp:466).
- Per-unit recolour. A colour-replace shader recolours a unit layer at draw time (UnitSprite.cpp:149). One sprite, many colour sets.
- Shade per tile. Unit and tile draws pass a shade value (Map.cpp, blitNShade calls). Time of day is a data value per deployment (shade fields in alienDeployments.rul).
- Projectile strips per environment: a land and an underwater strip with the same size (xcom2 bullet sheets, per AU041; not re-read here).
- Screen filters: 24 GLSL shaders in bin/common/Shaders, including CRT and bloom styles. Only the public-domain ones are safe to read for ideas (AU041).
- Corpse variants: four corpse rows per big unit (for example the reaper and sectopod corpse variants in xcom1/items.rul). Death pose varies from data.
- Living weapon idle: the living-weapon creatures have no item; their silhouette is the weapon.

## 7. Inspiration for Frankendom (originals, our names)
1. Campaign Tide (rule row 23, zone population). Idea: enemy mix as a step table keyed to the player's progression stage, not months. Keep: step-function weights and the highest-key-not-above rule. Change: keyed to zone tier and progression, not a calendar. Defect to fix before use: RuleMissionScript.cpp:326 walks the list with no end check; fix: sort the keys on load and clamp below the first key. Source: RuleMissionScript.cpp:321-326; alienMissions.rul:2.
2. Rot Chain (rows 6, 7, 18). Idea: a melee hit marks the victim to rise, and the rising body becomes a second creature on its own death. Keep: the two-stage death. Change: a visible timer on the victim that a shrine can cancel; the second form is ours. Source: MeleeAttackBState.cpp:244-245; UnitDieBState.cpp:230.
3. Four-Facing Shell (rows 3, 8). Idea: armour per facing, the hit side chosen from the hit vector, armour loses durability each hit. Keep: the 8-way side mapping, the side subtraction and the durability loss. Change: the lost durability shows as a crack; no random edge flip in fast duels. Source: BattleUnit.cpp:1096-1213.
4. Chain Guard (rows 3, 4). Idea: when an action happens, the best-scoring guard acts first; if it cannot, the next is tried. Keep: the best-first chain with fall-through. Change: each guard pays stamina, and the result is server-verified. Source: TileEngine.cpp:828-861.
5. Stance Dial (row 2, AI brain). Idea: a 0, 1, 2 aggression number changes odds and stance. Keep: the three states and their odds multipliers (AIModule.cpp:1296-1310). Change: three named stances the player can read from the pose and a sound cue, not a hidden number. Source: AIModule.cpp:1192 and 1310.
6. Living Edge (rows 6, 7). Idea: creatures whose body is the weapon, melee only, no separate item. Keep: no item to drop. Change: the body silhouette is the weapon; the kill shows what the creature was. Source: units.rul living-weapon rows (283, 455, 595).
7. Burn Ground (row 8, blood and decals). Idea: a unit that burns the floor when it moves and explodes on death. Keep: fire that stays where it was walked. Change: the floor glow is a visible warning before the blast. Source: UnitWalkBState.cpp:181 (burn floor on walk), Unit.h:26.
8. Thermal Stun (row 13, specials). Idea: a stun-type damage type that knocks out and never kills. Keep: a separate stun pool. Change: a visible shock ring from the fight camera. Source: RuleItem.h:27; items.rul:1001 and 1013.

## Where seen (folded topics)
- Idle and ambient animation: breathing bubbles, hover height, fire overlay (section 6).
- Death and respawn presentation: corpse variants and the zombie chain (sections 1 and 6).
- Boss staging: the Cydonia landing and final assault (section 5).
- Readability at 375 wide: the deployment rows read give up to about 6 units per rank row (alienDeployments.rul). No frame-level measure was taken.
- Accessibility and HUD: the string table is a flat keyed list of 1133 STR_ keys in the TFTD set (en-US.yml). Not read beyond the count.

## Not read
- PCK sprite sheets, MAP and ROUTES binaries, audio (none in the box), the 66 other language files, most of the 105 rul files (only the ones named above), alienDeployments.rul beyond the rows named, the shader files beyond the AU041 summary, src/Battlescape/BattlescapeGame.cpp (one grep hit at line 542 only), and getReactor() scoring (TileEngine.cpp, not opened beyond the call site).
