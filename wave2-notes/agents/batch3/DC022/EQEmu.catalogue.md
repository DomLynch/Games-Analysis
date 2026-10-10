# EQEmu (catalogue, DC022)

Donor: /mnt/frankendom-donors/EQEmu/ (VPS, read-only over ssh).
Asset audit used first: AU018 (EQEmu.assets.md), class C.
Class C rule applied: inspiration stays CATEGORY-LEVEL (for example 'a plated beetle boss'). No instance-level names, looks or stat blocks are carried over. Dom's rule for every item below: recreate as a clearly distinct original, never a copy. Keep the mood, change the names, numbers and looks. This is inspiration, not a legal opinion.

## Licence, halves and what is missing

- Code: GPL-3.0 (LICENSE.md line 3). Clean-room, shape only.
- Game content: the README names the original publisher as owner of the game and its assets. It also says ProjectEQ world data is included; that claim is not confirmed in the tree. No separate licence for the SQL content.
- Half read: the SERVER half (common/ and zone/ code, and the rule toggles in utils/sql). The DATA PACK is not in the tree: utils/defaults/Maps is empty, there are no art, audio or model files, and the SQL holds 3 npc_types inserts and no item inserts (AU018). So creature, item and zone instance counts are zero.
- Paired client candidates on the box (names suggest client halves; NONE opened): daeken-OpenEQ, djhenry-eqoxide, eq-p99-tools-eq-client, knervous-eqsage, LanternEQ-LanternExtractor, wcassis-willeq.
- Restricted note: none at the donor root.

## Counts (verified by grep or read, 2026-10-11)

- Body types: 39 constants in common/bodytypes.h (categories, not creature instances).
- Player classes: 16 (ids 1 to 16, common/classes.h:27-42). Plus 16 GM class ids (20 to 35) and 14 service or merchant class ids (40 to 71).
- Armour types: 4 named (cloth, leather, chain, plate) plus unknown (common/classes.h:124-132).
- Races: 769 uint16 constants in common/races.h (mixed playable and NPC model ids; split not checked).
- Zone-id constants: 481 (common/eq_constants.h; names not listed).
- Light levels: 11 (common/light_source.h:53-64).
- Dynamic zone types: 5 plus none (common/dynamic_zone_base.h:45-52).
- Creature instances: 0 in the tree. Item instances: 0. Zone maps: 0.

## 1. Creatures and beasts (category level only)

Families are body-type categories (common/bodytypes.h). The comment at bodytypes.h:25 says body types above 64 make the mob invisible. Examples of tags: Humanoid 1, Undead 3, Giant 4, Construct 5, Magical 7, Summoned Undead 8, Raid Giant 9, Raid Coldain 10, Vampire 12, Animal 21, Insect 22, Monster 23, Summoned 24, Plant 25, Dragon 26, Velious Dragon 30, Familiar 31, Muramite 34 ('tribal dudes'), Swarm Pet 63, Monster Summon 64, Special 67.

Escalation and boss pattern (zone/npc_scale_manager.cpp): the scale type is 0 normal, 1 named or rare, 2 raid target.
- Named or rare: rare spawn, or a name with '#' in it, or a capital first letter (npc_scale_manager.cpp:562).
- Raid target (npc_scale_manager.cpp:558).
- Class damage multiplier by level band for each class (npc_scale_manager.cpp:413 onward; for example Warrior 220 below level 20, 230 below 30, 250 below 40, 270 below 53, 280 below 57, 290 below 60, 300 below 70; the unit of the multiplier was not checked).
- Global scale table keyed by type, level, zone and instance version (npc_scale_manager.cpp:26-60).
- Unique by name blocks duplicates (zone/spawn2.cpp:231). Per-type spawn limits (zone/spawn2.cpp:240).

### Top 8 striking categories (category level)

1. Named rare tier. Ref: zone/npc_scale_manager.cpp:562. Why: a naming rule alone chooses the boss tier. Keep: the name decides the tier, no extra data needed. Change: the naming rule and the tier numbers.
2. Raid target tier. Ref: zone/npc_scale_manager.cpp:558. Why: a separate raid-scale tier beyond named. Keep: a third tier for raid bosses. Change: all numbers.
3. Dragon family. Ref: common/bodytypes.h:52 (Dragon 26), with Dragon 2 (:55), Velious Dragon (:56) and Dragon 3 (:58) as separate era tags. Why: one family, several era tags. Keep: one family, many tags. Change: visuals and tags.
4. Swarm pet. Ref: common/bodytypes.h:62. Why: a small-pet swarm tag, and the source comment warns not to use it to find all swarm pets. Keep: a swarm as its own class. Change: rules.
5. Undead family. Ref: common/bodytypes.h:29 (Undead 3) and :34 (Summoned Undead 8). Why: undead and summoned undead are separate tags. Keep: summoned variant as its own tag. Change: look and rules.
6. Raid giant. Ref: common/bodytypes.h:35 (Raid Giant 9) and :36 (Raid Coldain 10). Why: era-specific raid giants as a body type. Keep: era-tagged raid giants. Change: visuals.
7. Plant. Ref: common/bodytypes.h:51 (Plant 25). Why: a stationary creature family by tag. Keep: a plant family. Change: the look.
8. Monster summon. Ref: common/bodytypes.h:63 (MonsterSummon 64). Why: summoned monsters get their own tag. Keep: a summon tag. Change: the summon look and rules.

## 2. Classes, races and factions

Player classes (names only; mechanics not read): Warrior, Cleric, Paladin, Ranger, Shadow Knight, Druid, Monk, Bard, Rogue, Shaman, Necromancer, Wizard, Magician, Enchanter, Beastlord, Berserker (common/classes.h:27-42). Beastlord (id 15) is a pet-based class by name only.

Armour tiers (common/classes.h:125-128): cloth 1, leather 2, chain 3, plate 4.

Companions: hireable mercenaries and bots carry their own spell lists per class (AU018 cites utils/sql/git/optional/2013_02_18_Merc_Spells.sql). Code in zone/bot*.cpp and zone/lua_bot.cpp (not read).

Factions: common/faction.cpp and zone/zone_npc_factions.cpp (not read).

## 3. Weapons

No weapon instances in the tree. The structure is in common/item_data.h:
- Weapon item types (common/item_data.h:55-60): one-hand slash (0), two-hand slash, one-hand piercing, one-hand blunt, two-hand blunt. Then bow (61), large throwing (63), shield (64).
- Bane damage fields (common/item_data.h:414-416): bane damage by race, by body type, and an amount. This ties the body-type table to weapons.
- Elemental damage type (common/item_data.h:426): 1 is magic, 2 is fire.
- Delay and range fields (common/item_data.h, Delay and Range, not pinned to a line).

### Top 5 striking mechanics (structure, not content)

1. Bane by body type. Ref: common/item_data.h:416. Keep: a bane rule that targets a body-type family. Change: our families and numbers.
2. Elemental damage type. Ref: common/item_data.h:426. Keep: a small element enum on the weapon. Change: our element set.
3. One-hand and two-hand split by slash, pierce and blunt. Ref: common/item_data.h:55-60. Keep: the split by hands and damage style. Change: names.
4. Bow and large throwing as ranged classes. Ref: common/item_data.h:61-63. Keep: separate ranged types. Change: range numbers.
5. Light as an item type. Ref: common/item_data.h:72 (ItemTypeLight). Keep: a light source is a weapon-slot item. Change: the light rules.

## 4. Armour and gear

No gear sets in the tree. Tiers and look fields:
- Armour ladder: cloth, leather, chain, plate (common/classes.h:125-128).
- Material field (common/item_data.h:437, 'Item material type'). Enum not located.
- Elite material field (common/item_data.h:445, uint32 EliteMaterial). Meaning not read.
- Per-instance colour as RGB (common/item_data.h:430, 'RR GG BB 00 as it appears in pc').
- Light value per item (common/item_data.h:422) and light levels (common/light_source.h:53-64).
- Light slots (common/light_source.h:25-30): innate, equipment, spell, and active (the highest of all).

### Top 5 striking gear mechanics

1. Armour ladder cloth to plate. Ref: common/classes.h:125-128. Keep: a four-step material ladder. Change: the names and the stat numbers.
2. Light-level ladder from unlit to brilliant (11 steps). Ref: common/light_source.h:54-64 (LightLevelUnlit at :54, LightLevelBrilliant at :64). Keep: glow tiers as an ordered ladder. Change: names and colours.
3. Light slot precedence: active is the highest of all. Ref: common/light_source.h:25-30. Keep: highest-wins for an aura. Change: the rule.
4. Per-instance RGB colour. Ref: common/item_data.h:430. Keep: a colour per item instance. Change: our palette.
5. Elite material flag. Ref: common/item_data.h:445. Keep: an 'elite' look flag on gear. Change: what it does.

## 5. Zones and dungeons

- Zone types (common/spdat.h:1646): outdoors (1), dungeons (2), any (255).
- Hot zones: a zone bonus added to the XP multiplier (common/ruletypes.h:370, HotZoneBonus 0.75).
- Dynamic zones (common/dynamic_zone_base.h:45-52): expedition, tutorial, task, mission (shared task), quest.
- Spawn conditions gate spawns by zone state (zone/spawn2.cpp:172 and the SpawnConditionManager at spawn2.cpp:731 onward).
- Forced repop clears spawn timers (zone/zone.cpp:1923-1924).
- Zone-id constants: 481 (names not listed; no maps in the tree).

### Top 5 striking zone mechanics

1. Hot zone bonus. Ref: common/ruletypes.h:370. Keep: a zone-wide XP event as a rule. Change: numbers and naming.
2. Dynamic zone types. Ref: common/dynamic_zone_base.h:45. Keep: zone instances with a type (expedition, task, mission, quest). Change: our types.
3. Spawn condition gate. Ref: zone/spawn2.cpp:172. Keep: a zone population that changes with world state. Change: the condition source.
4. Forced repop. Ref: zone/zone.cpp:1923-1924. Keep: a full clear and refill on demand. Change: trigger.
5. Outdoor and dungeon zone type. Ref: common/spdat.h:1646. Keep: one type flag per zone. Change: types.

## 6. Item and effect looks worth recreating

No art, audio or shader files in the tree. The only look data is in fields:
- Light levels as glow tiers (common/light_source.h:54-64).
- Per-instance RGB colour (common/item_data.h:430).
- Elite material flag (common/item_data.h:445).
Rendering lives in the client halves (not read).

## 7. Inspiration for Frankendom (category-level originals)

1. Named and raid scale tiers. Keep: three tiers (normal, named, raid) decided by a name rule and a raid flag (zone/npc_scale_manager.cpp:554-572). Change: the names and numbers. Rows 7 and 23.
2. Weighted spawn group with a per-type cap and a five-second retry. Keep: weighted roll (zone/spawngroup.cpp:107), cap check (zone/spawn2.cpp:240), retry (zone/spawn2.cpp:234 and :242). Change: caps as zone data fields. Row 23.
3. Respawn with variance and a persisted death time. Keep: a plus or minus half-variance window (zone/spawn2.cpp:124) and a write at death (zone/spawn2.cpp:469). Change: storage to our ledger. Rows 23 and 17.
4. Ratio hate with two-strike out-of-range removal. Keep: ratio clamp 1 to 999 (zone/hate_list.cpp:343) and removal on the second out-of-range tick (zone/hate_list.cpp:871-873). Change: our hate list lives in the engine. Row 4, MAX_ATTACKERS = 3.
5. Smart target preference as a data table. Keep: the preference rules in common/ruletypes.h:712-719 (sitting +35 percent, critically wounded +100 percent, melee range +10 percent, tunnel vision 0.75). Change: the numbers. Row 4 (zone/hate_list.cpp:366 uses the rule).
6. Global loot filter. Keep: AND across rule kinds and OR within one kind (zone/global_loot_manager.cpp:116-185, LevelMin at :127). Change: the filter fields. Row 18.
7. Death tax with a level gate and corpse window. Keep: loss starts at level 10, multiplier 3 (3.5 percent), corpse resurrection window 3 hours (common/ruletypes.h:45-56), respawn-from-hover countdown 300 seconds (common/ruletypes.h:126-127). Change: numbers and presentation. Row 17.
8. Light ladder as glow tiers. Keep: 11 named tiers and the highest-wins slot (common/light_source.h:25-64). Change: names and colours; check the glow at 375 px. Rows 14 and 16.

## Not read

- zone/mob_ai.cpp (2991 lines), zone/aggro.cpp (1729 lines), zone/npc.cpp, zone/corpse.cpp, zone/bot*.cpp, zone/lua_*.cpp, zone/perl_*.cpp (names only).
- zone/zone_loot.cpp: structure only.
- world/, loginserver/, queryserv/, client_files/, submodules/, shared_memory/, eqlaunch/, ucs/.
- common/races.cpp, common/faction.cpp, common/content/, common/item_data.cpp.
- utils/sql: counted only (362 files, 170 with INSERT INTO, 33 mention npc_types, 3 INSERT INTO npc_types). The rule toggles were read by grep, not in full.
- eq_constants zone names (count only). Changelogs.
- The paired client halves (none opened).
