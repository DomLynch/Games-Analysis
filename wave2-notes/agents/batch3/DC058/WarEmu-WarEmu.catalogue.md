# WarEmu-WarEmu (catalogue, DC058)

Donor: /mnt/frankendom-donors/WarEmu-WarEmu/ (VPS only). Receipts: receipts.tsv in this folder (verified; 66 rows across both donors, all pass).
Machine-readable copy: WarEmu-WarEmu.catalogue.json.

## Halves and licence
- Read: server half. WorldServer combat (CombatInterface.cs), AI brains, ability handlers, loot manager, area influence, client-file manager. Common database schema classes, and the enums in Common/Database/GameData.cs and SystemData.cs.
- Data half: row data is not in the box. A narrow search found no .sql dump. Every creature, item, zone and scenario row is absent, so no named instance is listed below.
- Client half: none in the box. The server reads the original client archive files at run time (WorldServer/Managers/ClientFileMgr.cs). No art, audio or text tables were found.
- Licence (as the files say): no LICENSE, COPYING or NOTICE file in the top two levels. Assembly metadata is a template default (Common/Properties/AssemblyInfo.cs line 11). 38 WorldServer .cs files carry a GPL header saying "version 2 or later" (for example WorldServer/World/Abilities/Handlers/Zone/DealDamagesInFront.cs, header block). That is a per-file claim with no LICENSE file behind it. Treat as no clean licence: clean-room, shape only.
- Rights holder: unknown. The server reads archive files from a commercial game client, and the repo says nothing about who owns them.
- Class: C. Category-level inspiration only. No career, faction, creature, zone or item names are copied, and no instance-level look is proposed.
- Rule for every original below: a clearly distinct original, about 20-30 percent resemblance in mood only, never a copy. Trait kept and trait changed are named in each.

## Counts (what is actually in the box)
- creatures: 0 creature rows. Schema only (Common/Database/World/Creatures/Creature_proto.cs). Creature types: 6 top-level types and 16 subtypes (enum, lines 27 and 38).
- classes: 24 career lines (GameData.cs line 998) and 7 race ids (line 369), split across two realms (line 764) plus neutral. Not mapped to archetypes here (the mapping is not in the box).
- weapons: 0 weapon rows. The item-type enum has 9 weapon types (GameData.cs line 931), so this count is an enum count, not rows.
- gear_sets: 0 set rows. Enum counts: 5 armour and robe classes plus 1 shield type (ItemTypes), 19 equipment slot ids (ItemSlots, line 1124), 6 rarity tiers (SystemData.cs line 76).
- zones: 0 zone rows. Zone schema (Zone_Info.cs), area schema (Zone_Area.cs), scenario schema (Scenario_Info.cs).

## 1. Creatures
- Schema (Creature_proto.cs): entry, name, two model ids, min and max scale (lines 111 and 118), min and max level, faction (line 139), creature type (line 146), creature subtype, ranged flag, icon, emote, title, flags, script name.
- Top-level types (lines 27 to 36): 6 non-none types (animals, demons, humanoids, monsters, plants, undead).
- Subtypes (from line 38): 16 non-none subtypes. Beasts, birds, insects and arachnids, reptiles, an unmarked demon group, four demon sub-families (one per patron), beast-men type, dwarf-type, greenskin-type, human-type, ogre-type, rat-folk type, and a chaos-breed type. Names here are category labels, not copied.
- Spawn (Creature_spawn.cs line 132): waypoint mode is one of loop, one-way or random.
- Behaviour from code (no rows, so these are mechanics, not creatures):
  - Brains (WorldServer/World/AI/): a base class with Start, Stop and an abstract Think. The aggressive brain returns while fighting (AgressiveBrain.cs line 20), otherwise starts combat with the best attackable unit. The passive brain (PassiveBrain.cs line 16) and guard brain (GuardBrain.cs line 16) have an empty Think.
  - Ability handler files: 16 in WorldServer/World/Abilities/Handlers/. Opened by name only, except the 4 in Zone/ and the 3 in Entries/ that were read: a front cone, a counter on hit, a flee, plus heal-from-damage and a group heal. Other types were not opened.
  - Front cone (DealDamagesInFront.cs line 62): a target cap of 3 for two ability ids, and a cap of 9 for one more. One id roots the target for 3 seconds (DisableMovements(3000), not quoted).
  - Counter on hit (DealDamagesWhenHitHandler.cs lines 39 to 49): one shot per armed window. OnTick re-arms it on every tick. Damage is a base value, plus level times 5.82, plus strength divided by 5 if the max range is 5 or less, plus weapon damage times 0.1 times cast time in seconds. A custom value overrides the formula.
  - Flee (FleeAbilityHandler.cs line 66): sets action points to 0 and holds the reset for 10000 ms, then adds a buff.

Top 5 creature archetypes (mechanic level, since there are no rows; silhouette not judged):
1. Retaliating brute (counter on hit). Keep: one-shot retaliation per window. Change: arm it on a cooldown timestamp instead of every tick (see original 3). Ref: DealDamagesWhenHitHandler.cs lines 39, 47, 49.
2. Front sweeper (cone with a target cap). Keep: a cone with a cap on targets. Change: the cap is a field in the ability data, not a check on ids. Ref: DealDamagesInFront.cs line 62.
3. Spent-then-flees. Keep: zero the action resource, then a timed lock. Change: a one-second warning tell and a four-second lock. Ref: FleeAbilityHandler.cs line 66.
4. Tethered guard. Keep: a tether radius from spawn and a guard brain that does nothing on its own. Change: walk back at a fixed speed, not a snap (see original 6). Ref: CombatInterface.cs line 298; GuardBrain.cs line 16.
5. Scaled spawns. Keep: a min and max scale per prototype, so each spawn is a little different. Change: roll the scale from a seeded value so a replay matches. Ref: Creature_proto.cs lines 111 and 118.

## 2. Classes, races and factions
- Careers: 24 career lines (GameData.cs lines 998 to 1025). Grouping by archetype is not in the box.
- Progression shape from enums only:
  - TacticType (line 964): career, renown, tome.
  - CareerCategory (line 1084): 19 categories, including career tactic and morale, race tactic and morale, archetype tactic and morale, three renown stat tiers (A, B, C), renown offensive, defensive and resist sets, a realm renown set, two tome sets, specialization and automatic.
  - PlayerSpecialization (line 1109): 3 paths.
  - AbilityType (line 1062): standard, morale, tactic, granted, passive, pet, guild.
- Morale: an ability type exists (morale, line 1062). The only morale code read is a packet opcode for a morale list (WorldServer/World/Objects/Player.cs around line 303). No morale logic was found.
- Races: 7 ids (line 369) in two realms (line 764). Realm membership per race is not read.
- Factions: an enum exists (line 660). Members not read.

## 3. Weapons
- No weapon rows. Weapon item types (ItemTypes, line 931): sword, axe, hammer, spear, staff, dagger, bow, gun, pistol. Shield (one type). Armour: light, medium, heavy. Robes: robe and medium robe.
- Item fields that carry weapon behaviour (Item_Info.cs): two-handed flag (line 304), talisman slots (line 272), rarity (line 84), realm, race, career, minimum rank and renown, unique-equipped flag, spell id, and stats and spells strings. Stat slots are capped at 12 (line 32).
- Special properties: spells per item (spell id and spells string). No set-bonus field was found in the fields read.
- Tier visuals: not in the box (no client).

Top 5 (category level):
1. Hammer. Keep: a heavy blunt weapon read. Change: a heavy swing wind-up telegraph. Ref: GameData.cs line 931 (hammer type). Whether a hammer is two-handed is decided per item by the two-handed flag (Item_Info.cs line 304); the grip of any real hammer row is not in the box.
2. Staff. Keep: a caster focus class. Change: a charge glow that tracks the spell being cast. Ref: GameData.cs line 931.
3. Dagger. Keep: a fast, light weapon class. Change: two quick hits per swing, each with its own sound. Ref: GameData.cs line 931.
4. Pistol and gun pair. Keep: a ranged firearm class with two types. Change: a muzzle flash tied to fight camera shake, not a model. Ref: GameData.cs line 931.
5. Talisman-socketed item. Keep: socket count as a visible property. Change: sockets are shown on the item icon as glows when filled. Ref: Item_Info.cs line 272.

## 4. Armour and gear
- Rarity ladder (SystemData.cs line 76): 6 tiers. Utility (1), common (2), uncommon (3), rare (4), very rare (5), artifact (6). Tier colours are not in the box.
- Equipment slots (ItemSlots, GameData.cs line 1124): 19 ids (right and left hand, either hand, ranged, body, gloves, boots, helm, shoulders, shirt, pants, back, belt, tabard, banner, and four accessory slots). EquipSlots (line 1033) adds two pocket slots (17 names).
- Dye (TintMasks, GameData.cs line 1054): four values (none, A, B, both). This suggests two tint channels per item; the shader code that uses them is not in the box, so this is an inference from the enum names.
- Item flags (enum Item, line 723): temporary, no-move, bind on pickup, bind on equip, dye-able, decayed, broken, chain use, magical salvageable, mundane salvageable.
- Mounts: two mount item types (basic and advanced) in ItemTypes. Mount_Info (Common/Database/World/Items/Mount_Info.cs) has a speed field.
- Salvage (Salvaging enum, line 342): five values.

Top 5 (category level):
1. Artifact rarity with the unique-equipped flag. Keep: one-of-a-kind top tier. Change: a glyph as well as colour, so it reads without colour. Ref: SystemData.cs line 76; Item_Info.cs (UniqueEquiped).
2. Two-channel dye. Keep: two independent tint channels per item. Change: palettes from our own catalogue, not the donor's. Ref: GameData.cs line 1054.
3. Talisman-socket items. Keep: sockets as a visible count. Change: sockets are shown on the silhouette. Ref: Item_Info.cs line 272.
4. Advanced mount versus basic. Keep: two mount tiers with a speed field. Change: the advanced mount has a visible gait change in its idle. Ref: GameData.cs line 931 (mount types); Mount_Info.cs.
5. Magical versus mundane salvage. Keep: two salvage classes by flag. Change: magical salvage gives a sparkle on the drop. Ref: GameData.cs line 723 (flags).

## 5. Zones and dungeons
- Zone schema (Zone_Info.cs line 79 for tier): zone id, name, min and max level, type, tier, price, region, offset x and y.
- Zone areas (Zone_Area.cs lines 39 to 54): zone id, area id, realm, piece id, an order influence id (line 51), a destruction influence id (line 54), and an explore token entry. Capture is two-sided per area.
- Scenarios (Scenario_Info.cs): id, name, min and max level, min and max players, type, tier, map id, enabled. These are instanced matches.
- Public quests (PQuest_Info.cs): name, type, level, zone id, pin position, discovered and unlocked tokens. Difficulty has four steps (easy, medium, hard, very hard; GameData.cs line 594), plus an unknown value. Reward types: basic, advanced (SystemData.cs line 765).
- Keep status (KeepStatus, GameData.cs line 973): five values in order (safe, outer walls under attack, inner sanctum under attack, keep lord under attack, sieged). The enum is not used anywhere in the WorldServer code read.
- Cultivation (CultivationStage, GameData.cs line 531): six growth stages (empty, germination, seedling, flowering, grown, harvesting).
- Hazards: none read as files.
- Walk density (what appears every 20 seconds of walking): not in the box. Spawn rows are absent.

Top 5 (category level):
1. Two-sided zone capture. Keep: two influence values per area, counted only inside the explore region (AreaMapMgr.cs lines 79 to 96). Change: one zone meter drawn as a ring, flicker when contested (see original 1).
2. Five-step keep siege ladder. Keep: five steps from safe to sieged. Change: each step changes the zone music layer (sound-music fold-in). Ref: GameData.cs line 973 (enum only).
3. Public quest with four difficulty steps. Keep: difficulty and reward tier as separate fields. Change: the difficulty is a ring count, readable at 375 wide. Ref: GameData.cs line 594.
4. Instanced scenario with min and max players. Keep: a player band per scenario. Change: a fill bar on the entry prompt. Ref: Scenario_Info.cs.
5. Crop plot with six growth stages. Keep: six stages as a looks ladder. Change: the stage is visible at 375 wide as a height change. Ref: GameData.cs line 531.

## 6. Item and effect looks worth recreating
Only state flags and data fields were read. The draw code is on the client, which is not in the box.

| label | technique | ref |
|---|---|---|
| Object state flags | 17 states on a unit: berserk, stealth, taunted, detaunted, knocked down, scale up, carrying banner, carrying flag, an armour-shell state, a rally state, a combo state, a keep state, three mutation states (crush, blade, claw), and two transform-chicken states. Each is a flag the client could read. | src/Common/Database/GameData.cs line 638 (ObjectEffectState) |
| Scale variance per spawn | min and max scale per prototype; a random roll per spawn | Creature_proto.cs lines 111 and 118 |
| Two-channel dye | two tint channels per item | GameData.cs line 1054 |
| Rarity ladder | six tiers, no colours in the box | SystemData.cs line 76 |
| Con ladder | nine steps from no-level, through trivial and effortless, easy, equal, challenging, dangerous and deadly, to friendly. The labels are a threat ramp; the colours are not in the box. | GameData.cs line 329 (ConType) |
| Codex | 12 sections and 7 reward kinds in one codex (bestiary, achievements, titles, zone maps, lore, tactics, and more) | GameData.cs line 380 (Tome) |

## 7. Inspiration for Frankendom (originals)
1. Two-sided capture ring. One zone meter drawn as a ring with two sides. The meter counts only inside the explore region. Flicker when contested. Keep: two influence values counted only inside the explore region. Change: one ring meter, not two numbers. Defect in the donor, fixed here: GetInfluenceId reads a field that Zone_Area does not declare (AreaMapMgr.cs line 86, and line 90), so the side has to be picked by realm (OrderInfluenceId or DestroInfluenceId). Parity: zone data (catalogue fields, row 21).
2. Sticky threat. Keep: pick the attacker with the largest share of damage received (CombatInterface.cs lines 36 and 343 to 355). Change: a stickiness band, so the current target holds until another's share is clearly higher (the band is a value to tune), and a healing term so a healer draws threat. Defect in the donor: GetHate reads only DamagesDeal (line 36), so healing is never counted, and the share moves with every hit. Fix: the stickiness band and the healing term. Engine-owned list. Parity row 4 (fight loop, aggro).
3. Counter stance. Keep: one-shot retaliation per window (DealDamagesWhenHitHandler.cs lines 39 and 47 to 49). Change: arm on a cooldown timestamp instead of every tick (the donor re-arms on each OnTick call, so the window depends on tick rate). Parity row 3 (guard, parry, stamina).
4. Cone with a three-target cap. Keep: a cone that caps hits (DealDamagesInFront.cs line 62). Change: the cap and the root time are fields in the ability data, not checks on ability ids. The cap of 3 matches MAX_ATTACKERS = 3. Parity row 13 (specials).
5. Spent-then-flee. Keep: zero action points, then a timed lock (FleeAbilityHandler.cs line 66). Change: a one-second tell before the flee and a four-second lock, so the player can read it. Parity row 13 (specials) and row 3 (stamina).
6. Tether with a walk-back. Keep: a tether radius of 200 from spawn (CombatInterface.cs line 298), and evade clears aggro from each attacker (line 285). Change: walk back at a fixed speed with a short reset window, instead of the donor's snap (ReturnToSpawn, lines 307 to 314, sets the position directly; Object.cs line 423). Parity row 4 (leash).
7. Two-channel dye. Keep: two tint channels per item (GameData.cs line 1054). Change: our own palettes and a dye slot count from data. Parity row 15 (gear dressing).
8. Staged crop plot. Keep: six growth stages (GameData.cs line 531). Change: a stage shows as height at 375 wide, and the harvest is a zone data node. Parity row 20 (catalogue as runtime source).

## Fold-ins (addendum topics)
- loot: LootRoll has need, greed and pass, with an auto-roll after 60 seconds (GameData.cs lines 134 to 139). Loot modes are round-robin, free-for-all and master loot (line 1026). LootsMgr.GenerateLoot(corpse, looter) at LootsMgr.cs line 112, and Loot.TakeLoot at line 37. Drop ceremony visuals and the phone inspect flow: client not in box, not read.
- spawns and encounters: walk density not in the box. Waypoint modes (loop, one-way, random) read (Creature_spawn.cs line 132). Leash radius 200 read.
- progression: codex sections and rewards read (GameData.cs line 380). Talent trees, death penalty and titles in use: not read beyond the enums.
- sound-music: the sound enum has about 100 members (GameData.cs line 403). By prefix: morale 8, public-quest 7, cultivation 7, apothecary 7, quest 6, pregame 5, career 5, and smaller groups for loot, scenario and RvR. Layering, stingers and biome beds: not in the box.
- death, respawn, boss intro, finisher staging: not read. A resurrect handler exists (WorldServer/World/Abilities/Handlers/), not opened.
- readability at 375 wide: no art, so not judged. Proxies: the three-target cap, the nine-step con ramp, and the two-channel dye.

## Defects noted (keep the idea, fix the defect)
- AreaMapMgr.GetInfluenceId reads Area.InfluenceId, a field Zone_Area does not declare (AreaMapMgr.cs lines 86 and 90). Fix: choose the side by realm. Not confirmed by a build; a partial class elsewhere could declare it, and a grep found none.
- Counter re-arms on every OnTick (DealDamagesWhenHitHandler.cs line 49). Fix: arm on a cooldown timestamp.
- Hate ignores healing and moves with every hit (CombatInterface.cs line 36). Fix: stickiness band and a healing term.
- Front cone caps and root times are checked against ability ids (DealDamagesInFront.cs line 62 onward). Fix: move them to ability data.
- Leash snaps (ReturnToSpawn, CombatInterface.cs lines 307 to 314). Fix: walk back.

## Not verified
- Client archives and art: not in the box.
- Binary DLLs and .suo: names only.
- CombatInterface Update and AttackAI: only the hate, aggro and evade functions were read.
- Scripting, abilities beyond the 7 files read, LobbyServer, and Launcher network code: file lists only.
- The data half (creature, item, zone and scenario rows): not in the box.
