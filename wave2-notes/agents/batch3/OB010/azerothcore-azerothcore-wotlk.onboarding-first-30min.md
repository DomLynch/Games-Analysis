# azerothcore-azerothcore-wotlk (onboarding-first-30min, OB010)

Donor: azerothcore-azerothcore-wotlk (VPS, read-only: /mnt/frankendom-donors/azerothcore-azerothcore-wotlk)
Licence: GNU GPL v2 code (LICENSE). Game content is game-derived; no asset licence file; licence position unclear. Content class C. Inspiration is category-level only; no numeric donor values are carried into our data fields.

Checked: DATA half (data/sql/base/db_world: playercreateinfo*, quest_template, creature_template, creature_classlevelstats, creature_queststarter and creature_questender, creature_default_trainer, npc_trainer, gossip tables, player_xp_for_level, smart_scripts) and SERVER half (src/server/game/Entities/Player/Player.cpp Create and LearnCustomSpells, Player.h action-button enum, Globals/ObjectMgr.cpp starter-table loaders, Handlers/CharacterHandler.cpp tutorial handlers, Server/WorldSession.cpp tutorial save, src/common/Common.h constant, AI/SmartScripts event enum). CLIENT half not in the box: no UI, no cinematics, no DBC rows (the *_dbc.sql files are schema only, per DC007). The matching client is the WoWdot donor in this batch. Confidence: high on the starter tables and quest chain; high on the server order of operations for character creation; medium on the player experience, which needs the client.

## 1. What the player sees and feels (375 wide)
Nothing in the server tells the player anything before control. The first screens (creation, intro, UI) live in the client, which is not here. What the server does do is hand the new character a start place, a pre-filled action bar with 2 to 7 buttons, a few starting spells, and a first quest from a quest-giver standing in the start town. The first quest is a kill-8 chore with a short text (quest description of about 220 characters), then a return to the same NPC. Each step after that is also a kill-8 with a return, and the last step is titled "Report to Goldshire", which points the player at the first hub.

## 2. Why it works / is striking (375 wide)
- Readable beat: a kill-8 chore with one NPC is readable on a phone in one line.
- One signature behaviour: the same NPC gives the chain and closes it, so the return trip is the progress marker.
- One signature sound or effect: none in the data read (client-side). Not read.
- Could be made ours at 20-30 percent resemblance: a four-step opener in the gladiator ring with the same quest giver, each step a kill-8 in a level band that rises by one step, then a report that opens the hall.

## 3. The rule behind it
Start placement and kit (server order of operations, Player.cpp Create, lines 485-700):
1. Start place: playercreateinfo row for the race and class pair (line 47 is the Human Death Knight row: map 609, zone 4298). 62 rows in total, 9 distinct map and zone pairs; the largest groups are map 1 zone 14 (11 rows) and map 609 zone 4298 (10 rows).
2. Default skills and custom spells: LearnDefaultSkills, then LearnCustomSpells (line 623). LearnCustomSpells only runs when CONFIG_START_CUSTOM_SPELLS is on (Player.cpp line 12111). The cast-spell table has 2 rows (Death Knight Blood Presence, Warrior Battle Stance). The skills table has 77 rows.
3. Action bar: each row of playercreateinfo_action is (race, class, button, action, type) (ObjectMgr.cpp line 4710; push at 4740); applied at Player.cpp line 627. 283 rows across 62 race and class keys, 2 to 7 buttons per key. Type codes: spell 0, click 1, equipment set 0x20, macro 0x40 (Player.h lines 220-224).
4. Outfit: looked up from the start-outfit DBC (lines 630-664). The DBC is not in the box, so the outfit is not read.
5. Starter items: playercreateinfo_item has one data row, a placeholder note. So the item kit is effectively the outfit.
6. Collector accounts get a gift voucher that names the first town per race (Player.cpp lines 669-699; for Human, the Goldshire voucher at line 680).

Opener chain (quest_template.sql and creature tables):
- Quest giver: Marshal McBride, creature 197 (creature_template.sql line 181). He starts quests 7, 15, 21, 54 (creature_queststarter.sql lines 38-41) and 3100-3104 (lines 42-46). He also ends 7 and 15 (creature_questender.sql lines 39-40).
- Quest 7 "Kobold Camp Cleanup": kill 8 vermin, return to McBride. Reward: money field 25 (raw), XP-difficulty index 5 (quest_template.sql line 144).
- Quest 15 "Investigate Echo Ridge": kill 8 workers, report to McBride. Reward: money 40, XP index 5, next quest 21 (line 152).
- Quest 21 "Skirmish at Echo Ridge": kill 8 laborers, return to McBride at the abbey. Reward: no money.
- Quest 54 "Report to Goldshire": the hub hand-off.
- Description lengths: 218, 282 and 254 characters for 7, 15 and 21; completion text 63 characters each.

Mob rule (creature_template.sql and creature_classlevelstats.sql):
- Kobold Vermin, entry 6 (creature_template.sql line 93): level band 1 to 2, rank 0 (normal), HealthModifier 1, DamageModifier 1, unit class 1 (the warrior-type archetype), AIName SmartAI.
- Kobold Worker (entry 257) and Kobold Laborer (entry 80): level 3 (rows at lines 233 and 124). Kobold Tunneler (entry 475): level 5 to 6 (line 415).
- So winnability comes from a level band that rises with each quest step, with normal rank and multiplier 1. No script rigs the fight.
- The level-1 warrior-type archetype row carries a base HP and a base damage (creature_classlevelstats.sql line 53). How those are combined in combat was not read.

Aggro line (smart_scripts.sql line 4270): the Vermin has an "On Aggro, say line 0" event row, event type 4 (aggro, SmartScriptMgr.h line 103), chance column 30. That is the whole first-hit feedback in data; the sound and animation are client-side (not in box).

Hub and services:
- Goldshire is reached by the quest 54 hand-off. Trainers and services are data, not gated here: npc_trainer 4934 rows, creature_default_trainer 806, gossip_menu 6082, gossip_menu_option 4677. Which of them open for a new character, and in which order, depends on conditions that were NOT read (the conditions table was not opened).

Experience curve (player_xp_for_level.sql, 79 rows): the first level needs 400 experience, the next 900, then 1400. The rule is a per-level table; the donor's exact values are not carried into our data.

Tutorial flags (server half):
- Eight 32-bit words per account, so 256 one-shot hint bits (Common.h line 142).
- A client packet names one bit: word index is the value divided by 32, bit is the remainder (CharacterHandler.cpp line 1311 reads the word).
- Clear sets all words to "all seen"; reset clears all (CharacterHandler.cpp lines 1316-1326).
- Saved per account on the in-game save path (WorldSession.cpp SaveTutorialsData, line 1070; PlayerStorage.cpp line 7286).

## 4. For Frankendom
- 700 zones as data: the start place and the kit are a table keyed by race and class, the same shape as playercreateinfo. Fits our "zones are data on one runtime" rule.
- 100 Pit characters reused across zones: the action bar and start spells are per character, so a Pit character needs no new kit code.
- Many-vs-one: not in the opener data. The Vermin is a single mob; the Frankendom opener is a ring fight. Use their level-band rule for the ring's first three opponents, with max three attackers.
- Server-verified events driving client presentation: the first-hit line and the aggro event are presentation events; the server must still emit the kill.
- One character, one ledger: the tutorial bits are per account (one ledger). That matches our rule better than per-character flags. Keep the 256-bit one-shot hint array.
- Keep: one quest giver who closes his own chain; kill-8 steps; a report that moves the player to the hub; the hotbar pre-filled with a few buttons; the one-shot hint bits per account; the config switch that turns starting spells on and off.
- Change: no placeholder rows in the chain (quests 73 and 108 are titled with a placeholder prefix and "No Reward" or "Mystery Reward"; quest 16 gives no XP). No data placeholders in our build. Quest 1 has a garbled title and a level-80 value (quest_template.sql line 140, first data row); it is not a start quest; do not use it.

## 5. A 5-minute look test Dom can judge on his phone (375 wide)
Build a four-step opener in the existing gladiator ring with one fixed quest giver: fight 1 vs a level-1 rank-normal opponent, fight 2 vs a level-2, fight 3 vs a level-3, then a "report to the hall" card that opens the bank. Show a one-shot hint once for the hotbar and never again (the bit is set after the first show). Judge: is the step count clear at 375 wide, does the hint show once only, is the report card the obvious next tap, and does the hotbar with 2 to 4 buttons feel sparse or clear.

## 6. Licence and IP
Code: GPL v2; clean-room shape only. Data: game-derived, licence unclear, class C. Inspiration stays category-level: "a level-banded kill-8 opener with one quest giver that closes its own chain", "per-account one-shot hint bits", "a start-kit table keyed by race and class". No names, quest text, creature rows, numbers, item ids or spell ids are carried into our build.

## 7. Gaps
- Not read: client half (no UI, cinematics, DBC rows); the start-outfit DBC; the conditions table that gates services; the body of the combat formula that uses the base damage; most of the 309 db_world files; the other 77 skill rows beyond the sample; the Ebon Hold start for Death Knights (map 609 zone 4298) beyond its start row.
- Half read: data and server (both, for the starter path). Client absent.
- Not in the half read: first-fight staging beyond the level band; first loot and its reveal; first level-up celebration; first meaningful choice; minute 5, 10 and 30 hooks as timed events; tutorial text length.
- Idle and ambient behaviours, death and respawn presentation, loot reveal ceremony, walk density, readability at 375 wide: not in the data half. Not read.

## Onboarding (first 30 minutes), for comparison only
1. First 90 seconds: the server gives a start place, a kit table and an action bar; the first screen and intro are client-side (not in box).
2. First fight: a level-banded normal-rank Vermin with multipliers 1; the first-hit feedback is one aggro line row. Winnable by level band, not by script.
3. First reward: quest 7 gives a small raw money value and an XP-difficulty index; the first level-up needs 400 experience. The celebration is client-side (not read).
4. First hub: quest 54 "Report to Goldshire"; services (trainer, gossip, vendors) are data rows whose order is gated by conditions not read.
5. First meaningful choice: none in the data read; the chain is fixed.
6. Pull-forward hooks: the next quest from the same NPC (quest 15 names 21 as next), then the report to the hub. Minute 5, 10 and 30 timing is not in the data.
7. Tutorial style: forced chain from one quest giver; one-shot hints (256 bits, per account) for optional tips; text short (about 220 characters for the first quest). Skippable: not read.
8. Drop-off risks it has: a repetitive kill-8 and return loop for three steps before the hub; placeholder quest rows. Risks it avoids: the level band climbs with each step, so the next fight is never a surprise.
9. Could be ours at 20-30 percent resemblance: the four-step opener in the ring plus a once-only hotbar hint. Look test: section 5.

## Also reported where the donor has it
- Idle and ambient behaviours: not in the data half.
- Death and respawn presentation: not in the data half.
- Loot reveal ceremony: not in the data half.
- Walk density: not in the data half.
- Readability at 375 wide: the chain puts one step in one line; the rest is client-side and not read.

Reuse tag: shape only (start-kit table, level-banded opener, per-account one-shot hints). Brief rule served: onboarding first 30 min (feel).
