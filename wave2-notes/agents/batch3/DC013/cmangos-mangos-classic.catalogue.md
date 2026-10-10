# cmangos-mangos-classic (catalogue, DC013)

Donor: /mnt/frankendom-donors/cmangos-mangos-classic/ (read over ssh, not copied)
Class: C (asset audit AU010). Game content is named as Blizzard Entertainment copyright in COPYRIGHT.md line 7. Inspiration here stays CATEGORY-LEVEL: no creature, item, zone or boss names, no exact looks. Only mechanisms and table shapes.
Rule for every idea: recreate as a clearly distinct original, never a copy. Mood and mechanism only, about 20-30 percent resemblance. Each idea names the trait KEPT and the trait CHANGED. Code is GPL v2 (LICENSE line 2): shape only, no code copied.

## What this donor is
A server emulator for a fantasy MMO of the late 2000s. The repo ships no client art, audio, models or maps. The content is in SQL dumps (game-derived data) and the server code that reads them. Most of the box is server logic. That is the useful part for Frankendom: the threat table, the spawn pools, the weather walk, the death sickness and the cone test.

## Halves read
- Data pack: sql/base/mangos.sql (schema of 164 tables, insert blocks counted for the main tables), sql/base/dbc/original_data/*.sql (six dumps; structure and counts only, Spell.sql not read row by row).
- Server half: src/game/Globals/SharedDefines.h, src/game/Entities/ItemPrototype.h, src/game/Entities/Item.h, src/game/Server/DBCEnums.h, src/game/Weather/Weather.cpp (regenerate and state functions), src/game/Pools/PoolManager.cpp (spawn and roll functions, lines 196-265, 369-420), src/game/Combat/ThreatManager.cpp (sort, victim selection, taunt), src/game/Entities/Player.cpp (resurrection sickness, durability, lines around 1040, 4340-4370, 4514-4562), src/game/Spells/Spell.cpp and Spell.h (cone), src/game/Entities/Object.cpp (arc test), src/game/Loot/LootMgr.cpp (quality rate line 387).
- Client half: none in the box. The repo root and src/ hold no client folder. The WoW client is not shipped. Paired donor: none.

## 1. Creatures (counts: 24 families, 11 types, 5 elite tiers)
- Types (SharedDefines.h lines 1179-1189): beast, dragonkin, demon, elemental, giant, undead, humanoid, critter, mechanical, unspecified, totem.
- Families (SharedDefines.h lines 1196-1222, DBC-derived): 24 entries, of which 18 animal-like, 5 demon-pet-like, 1 remote-controlled. Names not repeated here.
- Elite tiers (SharedDefines.h lines 1224-1232): normal, elite, rare-elite, world boss, rare, plus an unknown sentinel.
- Data: sql/base/mangos.sql creature_template has one sample row (insert at line 1334; the row is on line 1335). The world creature list is not in the box, so no creature count from data. creature_model_info has 17 rows (insert at line 1096): per-model bounding radius, combat reach, walk and run speed, gender.
- Abilities and bosses: boss encounter data (section 5). Signature abilities are not listed here: the spell table is counted only.

Top striking (silhouette at 375 wide, one signature behaviour, one sound or effect, could be ours at 20-30 percent resemblance). Sound: none in the box.
1. label: Rare roamer. Why: a rare tier that walks in the open, so an encounter is a surprise. Keep: a separate rare tier as a data flag (enum at SharedDefines.h 1224-1232). Change: our tell is a short aura and a sting, not a copy of any look.
2. label: Wedge breather. Why: a front cone with a data-set angle is a readable telegraph in a 375-wide view. Keep: the angle comes from a table per attack; a negative value means the back side (Spell.h 1147-1153). Change: our angles; draw the wedge on the ground before the attack (proposed 0.8 s, our number, not from the code).
3. label: Phased guardian. Why: boss phases are data (encounter rows keyed by map and difficulty). Keep: encounter credit by creature or spell, and a last-encounter flag per instance. Change: our phase triggers and HP steps live in zone data.
4. label: Hate-holding brute. Why: a melee brute that keeps its target until another player is clearly ahead on threat. Keep: switch only at 1.1 times threat in melee, 1.3 times at range (ThreatManager.cpp 398-406). Change: MAX_ATTACKERS = 3 and a visible hate marker.
5. label: Model-sized brute. Why: reach and speed per model are data, so a big model reads big. Keep: per-model combat reach and speed as data (creature_model_info, insert at mangos.sql line 1096). Change: our rig sizes.

## 2. Classes, races, factions (counts: 9 classes, 9 race enum entries)
Classes (SharedDefines.h lines 72-86; 9 active, 2 commented out). Category labels are mine:
- plate melee; plate-and-mail hybrid holy; ranged hunter; stealth rogue; healer priest; hybrid shaman; caster mage; pet warlock; shape-shifter druid.
- Signature mechanic: not read per class. The Powers enum (SharedDefines.h lines 149-156) lists mana, rage, focus, energy and happiness (pet), plus health.
- Progression shape (data): class level stats have 540 rows (insert at mangos.sql line 4965), which is 9 classes x 60 levels. Race-class level stats have 2400 rows (insert at line 5532): 40 race-class pairs x 60 levels (counted by awk). Start combos: 40 rows across 8 races and 9 classes (playercreateinfo, insert at line 8039).
Races (SharedDefines.h lines 35-50): nine entries, MAX_RACES = 9. Eight have start data in the base dump. Faction grouping not read.

## 3. Weapons (counts: 21 weapon subclasses)
- Families (ItemPrototype.h lines 193-215): one-hand and two-hand axe, bow, gun, one-hand and two-hand mace, polearm, one-hand and two-hand sword, staff, exotic (two), fist, misc, dagger, thrown, spear, crossbow, wand, fishing pole, plus one obsolete entry.
- Tiers: 7 quality values, poor to artifact (SharedDefines.h lines 249-255). Colour names appear only in enum comments; the client draws them (not in box).
- Special properties: set bonus by piece count (Item.h lines 36-37: item count plus up to 8 spell slots per set). Enchantment templates exist as a table (not counted).
- Data: the base dump has 74 sample item rows (insert at mangos.sql line 2797). Their quality values are only 0 and 1, so the base dump shows starter gear only, not the tier ladder.

Top striking (mechanisms and shapes):
1. Quality ladder with a drop rate per tier: LootMgr.cpp line 387 looks up a rate by quality, config table at lines 40-46. Why: rarity can carry colour and sound. Keep: one rate per tier as config. Change: our tiers, colours and sound.
2. Set bonus by piece count (Item.h 36-37). Keep: thresholds by pieces worn. Change: our steps and effects.
3. Long reach silhouette: polearm and staff families as readable long shapes. Category idea from the names only; the per-weapon shapes are not read.
(Only three are real finds; the rest of the weapon list is names.)

## 4. Armour and gear (counts: gear sets not counted)
- Armour subclasses (ItemPrototype.h lines 236-248): misc, cloth, leather, mail, plate, buckler, shield, libram, idol, totem. The material ladder is cloth, leather, mail, plate. Off-hand: buckler and shield. Relic: libram, idol, totem.
- The 74 sample rows hold armour subclasses 0, 1, 2 and 6 only.
- Gear sets: set rows were not counted. The set mechanism is the top item in section 3.
- Durability: a fatal fall costs 10 percent durability on gear (Player.cpp line 1040). A single durability hit has a one-point minimum (Player.cpp line 4561).

Top striking:
1. Cloth-to-plate ladder as weight silhouettes: category idea; the sample data has no visual.
2. Shield as a visible off-hand, a clear silhouette at 375 wide (category idea).
3. Relic focus items (libram, idol, totem) as a separate silhouette family (category idea).
4. Set bonus steps (section 3).
5. Durability loss on a fatal fall as a gear-wear beat (Player.cpp 1040): keep the flat percent; change: show a short wear state, not a stat cut.

## 5. Zones and dungeons (counts: 4 map types, 32 instance rows, 3 battleground rows)
- Map types (DBCEnums.h lines 99-103): common, instance (dungeon), raid, battleground.
- Instance table: instance_template has 32 rows (insert at mangos.sql line 2549): parent map, level range, max players, reset days, ghost entrance map and point, mount allowed.
- Encounter table: instance_encounters has 272 rows (insert at mangos.sql line 2248; credit type and credit entry per encounter). The DBC dump DungeonEncounter.sql holds about 610 encounter rows (grep-level count, not exact); its table is instance_dungeon_encounters (schema at line 25).
- Battleground table: 3 rows (insert at mangos.sql line 325).
- Weather: four types (SharedDefines.h line 1535-1541), each with a grade 0 to 1 walking in three bands. Walk and season: section 5 top 1.
- Hazards: spell cones (section 6). Fatal fall costs durability. Weather and night are not read.

Top striking:
1. Weather walk (Weather.cpp lines 61-205): a timer per zone; roll 0-99; under 30 holds; 30 to 59 steps better (or resets to fine when the grade is light); 60 to 89 steps worse; 90 and up is a radical change (light goes heavy, heavy goes half to light or changes type). When the weather is already fine, any roll of 30 or more draws a new type. Keep: the walk, the hold chance and the seasons (91-day blocks from day of year). Change: one band table, fix the fall-through (below).
2. Encounter credit table (instance_encounters, 272 rows): a kill credits an encounter by creature or spell, with a last-encounter flag per instance. Keep: credit rows as data. Change: our zone data fields.
3. Pool-fed spawns with a limit (PoolManager.cpp lines 391-416): spawn count = limit minus alive; rolls shuffle eligible members; chance rolls fall back to the first eligible. Keep: the limit and the refill on death. Change: retry until the pool reaches its limit (see defects). Row 23.
4. Ghost return point per instance (instance_template ghost columns, insert line 2549): a per-zone death return point as data. Keep: per-zone return point. Change: our death presentation.
5. Mount flag per instance (instance_template mount column): a zone rule as data. Small, but a clean example of zone-as-data.

## 6. Item and effect looks worth recreating (mechanisms, no names)
- Front and back wedge: the cone angle comes from a table; a negative value flips to the back side; the back cone is the complement of a wide front arc (Spell.h lines 1147-1153; Object.cpp line 1579; Spell.cpp lines 7586-7591, default 60 degrees).
- Vertical allowance for an area hit: the height band shrinks with distance from the centre, except an NPC caster on a player target, which gets the full height (Spell.h lines 1142-1144). Technique: a 3D slab test for ground-area telegraphs.
- Weather intensity: four types, each with light, medium and heavy states, plus a fine state below 0.27 (Weather.cpp lines 256-290). Technique: a grade into a small state table that drives fog, rain or snow.
- Model reach: per-model bounding radius and combat reach (creature_model_info). Technique: hitbox size per model as data.

## 7. Inspiration for Frankendom (originals, not copies)
1. Wedge Breath (creature attack). Keep: a front wedge with an angle from data; back wedges by sign. Change: our angles; wedge drawn on the ground before the attack; server-verified hit. Rows: 4 (fight loop) and 13 (specials).
2. Hate Anchor (elite brute). Keep: sticky target, switch at 1.1 times in melee, 1.3 times at range; taunt wins. Change: MAX_ATTACKERS = 3 and a hate marker on screen. Rows: 4 and 5.
3. Walkers' Weather (zone weather). Keep: the walk, the 30 percent hold, the three bands and the season. Change: one band table for both logic and visuals; the fair branch returns cleanly. Row: 16 (colour grade and quality) and 23.
4. Ghost Walk (death). Keep: a per-zone return point as data, and a sickness that scales with level. Change: sickness in seconds with a short damage ramp, not a long debuff. Rows: 17 (death and respawn) and 18.
5. Pool of Wanderers (spawn pool). Keep: a limit minus alive, and a refill on death. Change: retries until the pool is full; a real CanSpawn gate. Row: 23.
6. Rare Roamer (encounter). Keep: a rare tier flag and a better reward for it. Change: our tell and our reward table. Rows: 18 and 12.
7. Set Pieces (gear). Keep: thresholds by piece count, up to eight effects. Change: our steps and our effects. Row: 15 (gear dressing) and 18.

Reuse tag: donor-idea (GPL v2 code: shape only; Blizzard content: category level only).

## Defects found (keep the idea, fix the defect)
- Pools: CanSpawn for creatures calls the map check (PoolManager.cpp line 372) and then returns true anyway (line 373). The gate is a no-op. Fix: return the map check result (map->CanSpawn not read, so confirm its meaning first).
- Pools: after a roll fails or returns null the loop skips it (line 413) and does not retry, so a pool can stay under its limit. Fix: retry a bounded number of rolls before giving up.
- Weather: the get-fair branch (Weather.cpp lines 118-122) sets fine but does not return. Control falls to a fresh type roll (line 167). Fix: return true after the fair branch, or confirm the fall-through is intended (the comment suggests it is not).
- Weather: the walk uses bands at one third and two thirds (lines 118-148), but the visual state uses 0.27, 0.40 and 0.70 (lines 256-281). Fix: one band table for both.
- Threat: no defect found in the threat lines read.
- Cone: values 0 and some negatives exist in the table (SpellCone.sql line 38 holds a zero entry). The code reads them as front or back arcs. Fix: check the zero entry's meaning; a zero is an empty front arc.

## Receipts
cmangos-mangos-classic.receipts.tsv (63 rows). Verified with verify_receipts.py: receipts ok 63, failed 0.

## Counts, method and caveats
- Table row counts come from line-based counts of each insert block in mangos.sql (exact for the blocks counted by line). The cone table count (709) is from a split count of one insert line. The DungeonEncounter count (about 610) and Spell.sql (about 22,000) are grep-level estimates.
- Most of the base dump is schema. The world creature and item lists are not in the box.
- Class and race mechanics beyond the enums were not read.

## Not read
- Warden modules (73 binaries; not opened, origin not stated).
- sql/updates (four folders), characters.sql and realmd.sql beyond names, logs.sql.
- Spell.sql row content (count only).
- Most of src/game: AI, Maps, Movement, Quests, BattleGround, PlayerBot, AuctionHouseBot, Entities (creature AI), most of Player.cpp, most of Spell.cpp.
- contrib/mmap (offline navmesh; name only), dep/ and the DroidSans font (audit only).
- Client half: none in the box.
