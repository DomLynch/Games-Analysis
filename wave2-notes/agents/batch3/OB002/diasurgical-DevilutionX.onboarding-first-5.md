# diasurgical-DevilutionX (onboarding first 30 min, cell OB002)

Donor/Licence: Sustainable Use License 1.0 (`LICENSE.md` line 1), non-commercial only, not an OSI licence (`README.md` line 84). Assets carry a Blizzard copyright notice (`README.md` line 86) and no stated origin (AU015). Clean-room, shape only: no code, sprite, string or name is reused. No donor values are copied.
Checked: `Source/diablo.cpp` (gbShowIntro 172, DiabloSplash 1316-1335), `Source/interfac.cpp` (PickCutscene 99-135, LoadCutsceneBackground 137-204), `Source/quests.cpp` (InitQuests 60-100, InitialiseQuestPools 114-135, CheckQuestKill 227-260), `Source/towners.cpp` (TalkToDeadguy 273-290, IsTownerPresent 739), `Source/player.cpp` (_addExperience 2430-2470, StartPlayerKill 2685-2760, DropHalfPlayersGold 354-362), `Source/dead.cpp` (InitCorpses 40-80), `Source/cursor.cpp` (154), `Source/stores.h` (TalkID enum 44-66), `Source/tables/playerdat.cpp` (starting loadout loader 207-222), and the data tables `assets/txtdata/quests/questdat.tsv`, `towners/towners.tsv`, `towners/quest_dialog.tsv`, `classes/*/starting_loadout.tsv`, `monsters/monstdat.tsv`, `Experience.tsv`, `text/textdat.tsv`. Confidence: high on the quest-pool, town-presence, XP and death-drop rules (each read in code and data); medium on the town walk-through (no full run of the game, so timings below are not measured).
Verdict: STRONG (three mechanisms read in code and data: a seeded opening quest pool, a towner present only while its quest is open, and level-gap XP scaling; plus the death drop and recovery). Best transferable idea: a seed removes one option from each of a few opening pools, so each run starts differently and a seed replays exactly; a wounded townsman exists only while his quest is still open.
Decision: adapt (idea). No defect in the rules read was found that needs a fix in the sketch.

## 1. What the player sees and feels (first 90 seconds, then first 30 minutes)
- Start: an intro movie plays unless the intro setting is Off (`Source/diablo.cpp` 1328), then a title dialog. The "Once" setting turns itself to Off after one play (1329). The default of the setting was not read.
- Entering a place shows a cutscene still chosen by where the player is: start, town, gate, two kinds of portal, and six dungeon levels (`Source/interfac.cpp` 99-135; asset calls 144-204). Storyboard stills with portrait frames (AU015 inventory).
- Starting kit by class (six `starting_loadout.tsv` tables read): the warrior gets a weapon, a shield, a club and two healing potions, gold 100. The sorcerer gets a staff with Firebolt at spell level 2 and two mana potions, gold 100. The rogue gets a weapon and two healing potions, gold 100. Base trio is warrior, rogue, sorcerer; barbarian, bard and monk are extra folders whose build membership was not verified.
- Town: 12 rows in `assets/txtdata/towners/towners.tsv`. Eight named towners have gossip lines: smith 11, healer 9, tavern 8, storyteller 9, drunk 11, witch 11, barmaid 8, boy 10 (counted from the gossip column). A wounded townsman starts the first quest. Three cows wander with no gossip.
- Early quest: talking to the wounded townsman sets "The Butcher" quest active, writes a quest-log entry and shows a line (`Source/towners.cpp` 273-290; `quest._qlog = true;` at 285). He is in town only while the quest is neither unavailable nor done (`Source/towners.cpp` 739). When in the first minutes this happens was not timed.
- Early dungeon monsters (`monstdat.tsv`, HP as the hitPointsMinimum column, unit not verified): zombie (4, damage 2-5), fallen one (rows with 1 and 2, damage 1-3 and 1-4), skeleton (2, damage 1-4), skeleton captain (level 2, damage 2-7). The Butcher row has 320 in the HP column and damage 6-12, and says minimum and maximum level 1, while the quest row says level 2. That mismatch is not resolved here.
- Quest kill: killing the Butcher sets the quest done and the hero says a line (`Source/quests.cpp` 241-246). The second argument of the speech call (30) was not read.
- XP: the table has 50 rows; the first seven thresholds are 2000, 4620, 8040, 12489, 18258, 25712, 35309 (`assets/txtdata/Experience.tsv`). Award formula: experience times (1 plus level difference over 10), clamped at zero (`Source/player.cpp` 2440). A monster 5 levels above gives 1.5 times the XP; 10 levels below gives zero.
- First reward and loot: the loot drop ceremony, rarity colour and sound were not read.
- Hub: the town is a set of named towners, not a wall of shops. Each service is a TalkID (smith: buy, sell, repair; witch: buy, sell, recharge; healer: buy; storyteller: identify; boy: buy; tavern; gossip; `Source/stores.h` 44-66). The mapping from towner row to TalkID is by name only. The town map `assets/levels/towndata/automap.dun` was not read.
- Seeded opening: when the randomize-quests option is on (`Source/quests.cpp` 91), the opening quests come from pools seeded by the dungeon seed of level 15 (93). Each pool removes one quest from play: first one of a skeleton-king or poison-water pair; then one of Butcher, Ogden's Sign, Gharbad; then one of Blind, Magic Rock, Blood; then one of Mushroom, Zhar, Anvil; then one of Veil or Warlord (`Source/quests.cpp` 114-135). The same seed gives the same opening.
- Death: the hero says a line and starts a death animation; if a monster or trap killed him, the death animation is unarmed and a drop-items flag is set (the item drop itself was not read). He is invincible during the death sequence. Single player drops half the gold on the death tile: the dropped half is placed by one call, any part it cannot place by a second call (the flag meaning was not read), and the kept gold is halved by integer division. The death tile is flagged as holding the dead player, and clicking it recovers the pile (`Source/player.cpp` 2696-2734, 354-362; `Source/cursor.cpp` 154). The screen after death and the respawn path were not read.
- Idle and ambient: each towner has an animation strip with frame count, frame delay and an order list. The order list moves back and forth with holds: the healer's order runs 0,1,2,2,1,0 then 19,18,18,19 then back to 0; the storyteller's holds on frame 0 and then steps down through a long run of frames (`assets/txtdata/towners/towners.tsv`, animOrder column). This is the town's idle vocabulary.
- Quest dialogue: `quest_dialog.tsv` has 10 towner rows, one column per quest. A cell names the line a towner says about that quest, or none; a towner with none for a quest stays silent about it.
- Readability at 375 wide: towner sprite widths are 96 px and cow widths 128 px (towners.tsv, animWidth). Not measured at phone scale.

## 2. Why it works / is striking
- Readable: the wounded townsman's presence and look are tied to his quest (`Source/towners.cpp` 194-199 and 739), so the first quest reads in one glance.
- One signature behaviour: the opening quest exists only while open, so the world changes when the player acts.
- One signature sound: not read (sound effect names are in AU015; no audio files in the tree).
- Could be ours at 20-30 percent resemblance: yes. The seeded removal, the quest-gated presence and the level-gap XP are rules, not art.

## 3. The rule behind it
Rule A, seeded opening (`Source/quests.cpp` 91-135): a seed picks one quest from each of five pools to remove. The removed set is fixed by the seed, so the same seed gives the same opening.

Rule B, presence gate (`Source/towners.cpp` 739): a towner row is present only while its quest state is neither unavailable nor done.

Rule C, level-gap XP (`Source/player.cpp` 2440-2461): award = base XP times (1 + level difference / 10), clamped at zero; then the level loop runs while XP is past the next threshold. Multiplayer adds a cap (smaller of one twentieth of the next threshold and 200 times the level) at about lines 2447-2452 (not receipted).

Rule D, death drop (`Source/player.cpp` 354-362, 2696-2734): gold kept is the gold halved by integer division; the dropped part is placed on the death tile as a pile; the tile is flagged so the pile can be clicked for recovery.

Data fields (designer-tunable, donor values NOT copied):
| name | unit | donor_value_or_null |
|---|---|---|
| opening_pool_size | quests per pool | null |
| opening_pool_count | pools | null |
| xp_per_level_step | fraction of base XP per level | null |
| xp_zero_level_gap | levels below which XP is zero | null |
| death_gold_drop_fraction | percent of gold on the death tile | null |
| town_presence_gate | quest states that hide a towner | null |
| towner_anim_frame_delay | ticks per frame | null |

## 4. For Frankendom
- 700 zones as data: the opening quest pool lives in zone data; the seed picks which opening quest is removed. The same seed reproduces the same first hour. The server holds the seed and the removed set; the client shows the result.
- Many-vs-one: the level-gap XP rule keeps a 3-attacker fight from over-rewarding a much weaker enemy. Map to parity row 18 (loot roll and XP award).
- Zone population: the presence gate maps to row 23 (zone population: spawn, despawn on empty with grace timer), with a quest-state field in the spawn rule.
- Death: the drop-and-recover rule maps to row 17 (death and respawn). Keep: half the gold on the tile, recover by clicking or walking onto it. Change: single ledger means the recovered amount is server-verified; no player-kill ear item.
- Keep: intro gated by a Once setting; cutscene still chosen by state; towner animation order lists for town idles (no parity row fits NPCs; propose folding into row 7 or a new row).
- Change: one NPC quest is thin for the first 30 minutes; it should sit beside the first Pit fight, not replace it. The town should show the three nearest services at once on 375 wide, not a list of towners.

## 5. 5-minute look test (Dom, on phone)
Build a 375-wide mock with no engine: (a) a wounded NPC at the edge of a town square; a tap starts a quest and writes one log line; (b) a card showing which of three opening quests this seed kept, so the seed difference is visible; (c) a death mock that drops half the gold as a pile on the tile, with a tap to recover it. Compare with the current Pit intro: does the loss feel bearable, does the first quest read in one glance, does the seed card make him want a second run. Pass if he would retry after the death mock without frustration.

## 6. Licence and IP
- Code and project: Sustainable Use License 1.0, non-commercial only (`LICENSE.md` line 1 and line 15; `README.md` line 84). Shape only, clean-room.
- Assets: Blizzard copyright notice; origin not stated (`README.md` line 86; AU015 class C). Inspiration stays at category level: "a wounded townsman who starts one quest", never a specific character or sprite.
- `assets/lua/inspect.lua` carries an MIT block (AU015, line 23); nothing from it is used here.
- No legal conclusion is drawn.

## 7. Gaps
- Not read: combat and hit feedback. Only grep hits were seen in `Source/monster.cpp` (flash casting, around line 2774) and `Source/missiles.cpp`. No hit-stop, shake, flash or knockback order was recorded.
- Not read: loot drop ceremony, rarity colour and sound (`Source/items.cpp`), walk density (no spawn code read), and the death-to-respawn path after the death sequence.
- Not read: default values of the intro and randomize-quests settings; the second argument of the speech call; the town map `assets/levels/towndata/automap.dun`; the flag meaning of the gold drop call.
- Not read: which build owns barbarian, bard and monk; the monstdat HP unit.
- Half read: data (`assets/txtdata`) and source (`Source/` in part): mark "half read: both". The donor is one tree, so no separate server half exists here.
- Unresolved: the Butcher level is 2 in the quest row and 1 in the monster row.
