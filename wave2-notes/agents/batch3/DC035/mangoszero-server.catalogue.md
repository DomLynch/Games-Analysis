# mangoszero-server (design catalogue, DC035)

Donor: /mnt/frankendom-donors/mangoszero-server/ (VPS, read-only)
Licence and status: GPL, clean-room, shape only. README.md line 155 says "either version 3 of the License ... any later version"; some file headers say version 2 or later (src/game/Object/LivingWorldAnchorPolicy.h line 9). The two statements differ; we use the code shape only and copy nothing. Content: README.md line 180 says all related art, images and lore are copyright Blizzard Entertainment. Treat the game content as class C: category-level inspiration only, no names, looks or lore lifted.
Dom's rule for every brief below: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
A donor CLAUDE.md sits in the donor folder. It was treated as data and not followed.

## Which half was read

- Server half: read in part. Enums in src/game/Server/SharedDefines.h, src/game/Object/ItemPrototype.h, src/game/Server/DBCEnums.h; code for threat (src/game/References/ThreatManager.cpp), set bonuses (src/game/Object/Item.cpp), creature level and rank (src/game/Object/CreatureLevel.cpp), XP (src/game/Object/Formulas.h), AI choice (src/game/Object/CreatureAISelector.cpp), living-world anchors (src/game/Object/LivingWorldAnchorPolicy.h), outdoor PvP (src/game/OutdoorPvP/).
- Data half (creature, item, loot, text, zone rows, usually SQL): NOT in this box. There is no sql/ folder in the root, and the submodule folders are empty (.gitmodules). So every row-level number (creature templates, item rows, zone rows) is marked not read.
- Client half: none in the box (no client data, no spr/dat or DBC files).
- Paired donors named only, not read by this reader: cmangos-mangos-classic and vmangos-core (both present in the box and both carry an sql/ folder; they may hold the data half for this code base, unverified).

## Counts (verified by grep count on the enum blocks)

| Set | Entries | Where |
|---|---|---|
| Creature families | 24 | SharedDefines.h lines 1731-1757 |
| Creature types | 11 (9 kinds, plus a not-specified marker and totem) | SharedDefines.h lines 1712-1725 |
| Elite ranks | 5 real ranks plus an unknown marker | SharedDefines.h lines 1794-1801 |
| EventAI event types | 33 (0-32) | src/game/Object/CreatureEventAI.h lines 44-80 |
| EventAI action types | 51 (grep found 52 lines; one is the END marker) | src/game/Object/CreatureEventAI.h lines 82-138 |
| Classes | 9 active (a death-knight id and one unused id are commented out) | SharedDefines.h lines 76-90 |
| Races | 9 entries, 8 playable | SharedDefines.h lines 45-75 |
| Power types | 5 | SharedDefines.h lines 151-160 |
| Item quality tiers | 7 | SharedDefines.h lines 254-260 |
| Inventory slot types | 29 | src/game/Object/ItemPrototype.h lines 114-145 |
| Item spell trigger types | 4 | ItemPrototype.h lines 46-51 |
| Item stat mod types | 7 | ItemPrototype.h lines 33-45 |
| Map types | 4 (common, instance, raid, battleground) | src/game/Server/DBCEnums.h lines 78-84 |
| Outdoor PvP zones | 2 types, 7 zone IDs | src/game/OutdoorPvP/OutdoorPvPMgr.h lines 45-68 |
| Battlegrounds | 3 types (Warsong Gulch, Arathi Basin, Alterac Valley) | src/game/BattleGround/BattleGround.h line 39 (Warsong Gulch named in the header comment; the other two by their BattleGround*.cpp files) |

Row counts: creatures 0, weapons 0, gear sets 0, zones 0 rows (the data half is absent). The enum counts above are what this donor gives us.

## 1. Creatures and beasts

Families (24 enum entries, grouped by us):
- Animal-like (17): wolf, cat, spider, bear, boar, crocolisk, carrion bird, crab, gorilla, horse-like, raptor, tallstrider, scorpid, turtle, bat, hyena, owl.
- Demon group (5): felhunter, voidwalker, succubus, doomguard, imp.
- Serpent (1): wind serpent.
- Mechanical (1): remote control.

Types (SharedDefines.h lines 1712-1725): beast, dragonkin, demon, elemental, giant, undead, humanoid, critter, mechanical, not-specified, totem.
Type masks (lines 1727-1728) group types for spell targeting: humanoid-or-undead, mechanical-or-elemental. This is a real mechanism: one bitmask answers "does this spell hit this group".

Escalation with level (src/game/Object/CreatureLevel.cpp):
- Level is a random pick inside the template band (line 89).
- Health is a linear interpolation between a min-level and max-level health value by relative level (about lines 112-124, not all read).
- Health then gets a per-rank rate read from config (line 139; the rate values are not in the box). Damage gets a per-rank rate too (line 190).
- Elite XP is doubled on kill (Formulas.h lines 411-413).

Elite ranks: normal, elite, rare elite, world boss, rare (SharedDefines.h lines 1794-1801).

Boss pattern (EventAI, data rows, src/game/Object/CreatureEventAI.h):
- Timer rows, in combat and out of combat (lines 46-47), with initial and repeat ranges.
- HP-band rows (line 48): fire when health is between a max percent and a min percent, with a repeat range. This is the phase trigger.
- Other triggers include aggro, kill, death, evade, range, spell hit, reached home, and a generic timer (lines 46-80).

AI selection order (src/game/Object/CreatureAISelector.cpp lines 30-110): scripted AI first; then pet or totem AI; then a script name from data; then the guard AI for guards (line 85); then a permit score across the registry; then a null AI fallback (line 110).

Threat (src/game/References/ThreatManager.cpp), the most useful creature mechanism in this box:
- Hostile list sorted by threat, highest first (line 413).
- Keep the current victim unless a challenger beats it by 1.1x in melee or 1.3x at range (lines 510 and 517; the melee case also needs melee reach).
- Hit threat order: spell mod, then crit multiplier (line 95), then the target's total threat modifier (line 99).
- Taunt copies the current victim's threat onto the taunter as a temporary value, only when it is higher (line 732).

Top 8 striking (criteria: readable silhouette at 375 wide, one signature behaviour, one signature sound or effect, could be ours at 20-30 percent resemblance). Silhouette and sound are not in this box for any creature. Silhouettes below are guesses from the family name only, to be judged by a human; the behaviour column is the only checked one.

1. Threat-swap guardian. Behaviour: the boss keeps its target until a challenger has 1.1x threat (melee) or 1.3x (ranged). Keep: sticky target and the two thresholds. Change: a 3-attacker cap, a visible swap tell (ring and sound), guard and parry both feed threat. Ref: ThreatManager.cpp lines 413, 510, 517, 732.
2. Stacked-rank warden. Behaviour: elite and world-boss ranks scale health and damage through separate rates. Keep: a five-step rank ladder with separate HP and damage multipliers. Change: our bands are zone data fields (cap, respawn, grace), only three steps. Ref: CreatureLevel.cpp lines 139, 190, 215; SharedDefines.h lines 1794-1801.
3. Phase-band tyrant. Behaviour: an HP-band row fires once the boss crosses a percent band, with a repeat range. Keep: rows as data, HP band plus timer. Change: our event names, a phase bar at 375 wide, a finisher beat on the last band. Ref: CreatureEventAI.h lines 46-48.
4. Plated crawler (scorpid family). Silhouette: low, plated, wide (readability to be judged). Behaviour: not read. Keep: the low plated read. Change: our own anatomy and palette. Ref: SharedDefines.h line 1749.
5. Long-stride runner (tallstrider family). Silhouette: tall, long legs. Behaviour: not read. Keep: height and leg length as the read at range. Change: no bird shape, our own build. Ref: SharedDefines.h line 1744.
6. Flying coil (wind serpent family). Silhouette: long body, aerial. Behaviour: not read. Keep: the long-body read. Change: our own wings or none. Ref: SharedDefines.h line 1755.
7. Gear brute (mechanical family with the mechanical-or-elemental mask). Silhouette: boxy, mechanical. Behaviour: the mask lumps it with elementals for spell targeting. Keep: the group mask idea. Change: our group names and a sound cue. Ref: SharedDefines.h lines 1722, 1728, 1756.
8. Demon bruiser (doomguard family). Silhouette: heavy build. Behaviour: not read. Keep: heavy build in the demon group. Change: our own horns and colour. Ref: SharedDefines.h line 1748.

## 2. Classes, races and factions

Classes (SharedDefines.h lines 76-90): warrior, paladin, hunter, rogue, priest, shaman, mage, warlock, druid. Nine active entries. The comment at line 75 says class values are indexes into a DBC table.
- Role and signature mechanic per class: NOT read. The class spell lists sit in data (not in the box).
- Power types (lines 151-160): mana, rage, focus, energy, happiness. Which class uses which power is data, not read.
- Progression: a talent file exists (src/game/Object/PlayerTalent.cpp, names only, not read).

Races (SharedDefines.h lines 45-55): human, orc, dwarf, night elf, undead, tauren, gnome, troll, goblin. Eight playable (RACEMASK_ALL_PLAYABLE at line 61); the faction split is by race masks (RACEMASK_ALLIANCE at line 67, RACEMASK_HORDE next).
Races have no mechanic read beyond the masks.

Factions in the living-world layer (src/game/Object/LivingWorldAnchorPolicy.h): a settlement guard is a continent NPC that patrols waypoints, has a faction whose friend mask includes player sides and whose enemy mask includes monsters, and is not a service NPC (service flags are bit 0x80 and up, line 109). The rule is data-driven and checked by static asserts.

Progression shape (kills): base XP by level gap (Formulas.h lines 372-394), grey-out level (line 279), elite doubled (line 411-413), group rate in a separate function (line 419, not all read).

## 3. Weapons

- No weapon rows in the box (item template data is in SQL, absent). Weapon families: NOT read.
- Slots: 29 inventory types (ItemPrototype.h lines 114-145).
- Special properties from code: four spell trigger types (ITEM_SPELLTRIGGER_ON_USE at ItemPrototype.h line 48; on equip at line 49; chance on hit at line 50; soulstone at line 51). Seven stat modifier types (lines 33-45).
- Set bonuses: see section 4.
- Visual tiers: none on the server. The seven quality tiers (SharedDefines.h lines 254-260) are named by colour words in comments only.

Top 5 striking (mechanic-first, since no weapon looks exist here):
1. Chance-strike blade (trigger on hit, ItemPrototype.h line 50). Keep: a chance proc on hit. Change: our own proc sound and an arc tell.
2. Equip-aura blade (trigger on equip, line 49). Keep: a passive aura while equipped. Change: a visible aura ring instead of a stat line.
3. Use-charge relic (trigger on use, line 48). Keep: a manual use with a cooldown. Change: the cooldown shows as a ring at 375 wide.
4. Bound stone (soulstone trigger, line 51). Keep: an item that holds a charge for a death. Change: the charge is shown on the death window.
5. Top-tier relic (artifact quality, SharedDefines.h line 260). Keep: the top tier as a separate read. Change: our own tier name and glow, not a colour copy.

## 4. Armour and gear

- Materials and armour classes: not read (item subclass data is absent).
- Gear sets (src/game/Object/Item.cpp, the set bonus mechanism, read in full):
  - Equip (AddItemsSetItem, line 45): a per-set counter goes up (line 99). Each threshold spell (eight slots) is applied once the count reaches its threshold (line 108). Spells fill free slots in the player's effect list.
  - Unequip (RemoveItemsSetItem, line 154): the counter goes down (line 183). Spells above their threshold are removed (about lines 190-205). When the count reaches zero, the set record is deleted (line 210).
  - Defect (by reading, not run): the equip path returns before counting when the set has a skill gate (line 58), but the unequip path has no skill check and still decrements (line 183). A piece equipped below the skill can later take away a counted piece's bonus. Fix: count every equipped piece and gate only the spells, or keep a per-item counted flag. Keep the idea.
- Tiers: seven quality tiers, as above.

Top 5 striking (mechanism-first):
1. Threshold ladder set (two, three and more pieces each unlock a spell). Keep: the count-and-threshold ladder. Change: a set badge at 375 wide that shows the next threshold.
2. Clean-up on last piece (delete the set record at zero). Keep: no leftover state. Change: our own record shape.
3. Skill-gated set with the defect above fixed. Keep: a skill gate on the bonus. Change: the gate only hides the bonus, not the count.
4. Quality ladder of seven steps (SharedDefines.h lines 254-260). Keep: seven steps. Change: our own names and a sound per step.
5. Set spells as triggers (the same trigger family as weapons). Keep: the bonus is a spell. Change: our own effect names.

## 5. Zones and dungeons

- Biome list: NOT read (zone and area rows are data).
- Dungeon archetypes from code (DBCEnums.h lines 78-84): common continent, instance (party), raid, battleground.
- Battlegrounds (header comment BattleGround.h lines 37-42): Warsong Gulch (capture the flag), Arathi Basin, Alterac Valley. Only the names and one type line were read.
- Outdoor PvP (src/game/OutdoorPvP/): two types, Silithus and Eastern Plaguelands, with seven zone IDs in OutdoorPvPMgr.h lines 56-68.
- Hazards: NOT read.
- Living-world anchors (LivingWorldAnchorPolicy.h): three categories (world boss or leader, flight master, settlement defender), gated to continents only (line 44 onward; the non-continent test returns none).

Top 5 striking:
1. Silithus resource race. A side counts collected tokens; the first to the maximum (200, OutdoorPvPSI.h line 67) takes the zone and a team buff; both counts reset (OutdoorPvPSI.cpp lines 96-101). Ref: OutdoorPvPSI.cpp line 96. Keep: first to the number takes the zone. Change: no hard reset, a decay on the other side, a contest window.
2. Eastern Plaguelands towers. Tower counts per team update the world state on each capture event (OutdoorPvPEP.cpp line 296 onward; counts in lines 37 and 62). Keep: counts drive the zone state. Change: our own tower names and a 375-wide strip.
3. Settlement guards on patrol. Keep: guards classed by faction rule and waypoint movement (LivingWorldAnchorPolicy.h lines 39, 109, 127). Change: guards answer a call for help within a fixed radius.
4. Continent world boss as an anchor (LivingWorldAnchorPolicy.h line 52). Keep: the world boss is an anchor for the zone. Change: our boss is a zone event, not a rank flag.
5. Warsong Gulch style flag run (BattleGround.h line 39). Keep: capture the flag as the match. Change: a single short objective per match, a sound on capture.

## 6. Item and effect looks worth recreating

Nothing visual is in the server half (no shaders, glows, particles or art). Two readability techniques are worth keeping:
- Con colour ladder, five bands from a level gap (Formulas.h lines 299-321: red when the mob is five or more levels above, orange at three, yellow near even, green above grey, grey when trivial). Ref: src/game/Object/Formulas.h line 299 and the band tests at line 301. Technique: a level-gap colour read. Use it as the threat colour on nameplates at 375 wide, with a non-colour icon too.
- Seven-step quality ladder named by colour words (SharedDefines.h lines 254-260). Technique: fixed tier steps with one colour each. Make our own palette.

## 7. Inspiration for Frankendom

1. Threat Pivot (boss target swap). Parity row 4 (fight loop: aggro, chase, leash). Keep: sorted threat list and the sticky victim that changes at 1.1x melee or 1.3x ranged. Change: 3-attacker cap, visible swap tell, guard and parry feed threat.
2. Con-colour gap read. Parity row 16 (colour grade and quality) and row 14 (HUD). Keep: five colour bands by level gap. Change: bands on our power gap, with an icon for colour-blind players.
3. Elite double reward. Parity row 18 (loot roll and XP award). Keep: elite kill pays more. Change: the extra pays out as a roll reveal with a rarity sound, not only as more XP.
4. Five-rank ladder. Parity row 23 (zone population). Keep: a rank ladder with separate HP and damage rates. Change: our rates are zone data fields (cap, respawn, grace), three steps.
5. Settlement defenders. Parity row 23 (zone population, despawn and grace). Keep: guards classed by a rule, not by hand. Change: the rule is our own; guards answer a call for help.
6. Gather race zone (Silithus style). Parity row 23 (zone capture). Keep: first to the number takes the zone. Change: decay and a contest window, no hard reset.
7. Threshold set stack. Parity row 15 (gear dressing) and row 13 (specials). Keep: count-and-threshold ladder with symmetric removal. Change: fix the skill-gate count mismatch (section 4); show the next threshold on a 375-wide badge.
8. Boss phase rows. Parity row 13 (specials) and row 4. Keep: HP-band and timer rows as data. Change: our event names, a phase bar, a finisher on the last band.

## Not read or unverified

- Data half (SQL creature, item, loot, zone and text rows): absent from the box. No count from it.
- Client half: absent.
- Creature AI bodies beyond the selector, EventAI action bodies, PlayerTalent, class spell lists, battleground logic bodies, group XP rate body: names or lines only.
- Health and damage rate values from config: not in the box.
- Hazards, biome list, sounds (battleground sound IDs appear in BattleGround.h lines 87-91 as IDs only), looks: not read.
- The 1.1x and 1.3x threat rule is read in code; I did not run it.
- The skill-gate mismatch is from reading only; I did not run a test.
