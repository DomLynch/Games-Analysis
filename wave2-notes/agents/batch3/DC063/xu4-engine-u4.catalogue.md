# xu4-engine-u4 (design catalogue, cell DC063)

Donor: /mnt/frankendom-donors/xu4-engine-u4/ (VPS only, read-only)
Half read: the engine (src/creature.cpp, combat.cpp, party.cpp, aura.h/.cpp, dungeon.h/.cpp, tileanim.cpp, config_boron.cpp in part) and the data pack (module/Ultima-IV/config.b in full, maps.b and graphics.b in the sections cited). The paired half, the original game data, is not in the repo (audit AU059 says so; not re-checked).
Licence: code GNU GPL v3 (COPYING line 1 and line 2). Assets mixed and mostly unstated (AU059). Asset class C. Use shape only: clean-room, never a copy.
Rule for every idea below: recreate as a clearly distinct original, never a copy. Each entry names the trait KEPT and the trait CHANGED. Mood resemblance target 20-30 percent.

Correction to the asset audit: AU059 says 35 creature rows. config.b has 60 `(id:` rows (ids 0 to 59). The count is grep, not receipted.

Counts (from the files): creatures 60 rows; player classes 8; weapons 16 rows; armour 8 rows (no set bonuses); map entries 57 (1 world, 17 city or castle, 8 dungeon, 8 shrine, 23 combat).

## 1. Creatures and beasts

Families by row id (config.b, rows 0-59):
- Transport and town (0-17): 2 horse rows (0-1), 8 class rows (2-9), 7 town rows (10-16) and a lord-type NPC with a ranged magic effect (row 17). Town rows are flagged good or wontattack.
- Sea and nature (18-24): a pirate vessel (sails), 4 sea creatures that swim (some ranged, one poisons), and 2 forces of nature (rows 23-24) that wander, cannot attack and can move onto the avatar (config.b:80-81).
- Main encounter (25-52, 28 rows): vermin and beasts (rat, bat, spider, python, slime, insect swarm); undead (ghost, skeleton, phantom, liche: all resist sleep); raiders (orc, rogue, troll, ettin, cyclops, headless); casters (evil mage, zorn, daemon, gazer); top tier (hydra, dragon, the top demon row 52 with encounter size 1).
- Scene rows (53-59): fixed set-dressing rows (a campfire, a wounded villager, an avatar tile, a fire-field phantom at config.b:127-129).

Escalation (data and code):
- Base HP runs from 32 (town rows) to 255 (top rows). XP value runs from 3 to 16 across the rows (config.b, same rows).
- Group size is a per-row field: encounterSize 12 to 15 for vermin and swarms (rows 25, 26, 29, 31, 34), 4 to 8 for mid tier, 1 for the top tier (row 52, config.b:111).
- Leader links chain the tiers: the rat row names the skeleton row as leader (config.b:84), the skeleton row names an evil mage (config.b:97 shows the link is to row 45), the evil mage names a daemon, the daemon names the top demon row. Combat code can pull a leader or a grand-leader into a common group (see section 1, combat rules).
- Combat rules that set group shape (combat.cpp:362-385): a single roll of 1 to 8 creatures. If the roll is 1, the group is the row's encounterSize range (groupSize+1 to 2 x groupSize, assuming xu4_random(n) gives 0 to n-1, not checked). The group is re-rolled until it is at most twice the party size. Town guards get 2 x party size (combat.cpp:385). Each slot of a group has a 1 in 32 chance of the grand-leader and, failing that, a 1 in 8 chance of the leader. The last slot is always the base creature (combat.cpp:347-354).

Top 8 striking (each with a label of our own, file path, why, keep, change):

1. Storm ring. Rows 23-24 (whirlpool, twister). Why: a roaming hazard that wanders and carries the player when it moves onto them, and cannot attack. Keep: a hazard that moves the player off their line. Change: a telegraphed spinning ring with a ground shadow and a slow tick sound, not water. Ref: /mnt/frankendom-donors/xu4-engine-u4/module/Ultima-IV/config.b:80-81.

2. Split jelly. Row 29 (slime, divides flag, encounterSize 15). Why: after the creature survives a hit, a 1 in 2 roll divides it; the copy and the parent each take half the HP. Keep: split on a surviving hit, so the player's damage creates the threat. Change: fix the HP rounding (see defects below), cap splits per encounter, and give each split a squish sound. Ref: config.b:88; creature.cpp:512, 526-528, 738.
   Note: applyDamage also runs for fire and poison ticks (creature.cpp:483, 489), so a split can happen from a field, not only from the player.

3. Bloom spawner. Row 35 (gazer; spawnsOnDeath to row 34, the insect swarm). Why: the monster dies into another monster. Keep: a death that produces an added threat. Change: a one-second telegraph before the swarm appears, a swarm of fewer bodies, and spawns that count against the attacker cap. Ref: config.b:94; creature.cpp:541 (the spawn is gated by an enhancement flag, creature.cpp:534-537).

4. Chest mimic. Row 32 (mimic, camouflage on, camouflageTile chest, movement none). Why: it looks like a chest and reveals itself within 5 tiles. Keep: a camouflaged threat that shows when the player is close. Change: reveal at 2 tiles with a lid-tremor tell, and no reveal when the player is on the other side of a wall. Ref: config.b:91; creature.cpp:555.

5. Warding sage. Row 48 (zorn; casts negate; incorporeal). Why: when it acts it sets an aura on the party that blocks magic for 2 turns. Keep: one timed anti-magic aura that the party can read. Change: a visible halo around the caster, a counter-spell cue, and a real-time duration instead of turns. Ref: config.b:107; creature.cpp:317-318. The aura slot itself is in aura.h (enum at lines 13-19) and aura.cpp:18-27.

6. Escort ladder. Rows 25, 38, 45, 49, 52 (rat, skeleton, evil mage, daemon, top demon) linked by the leader field. Why: rarer elites enter a common group by a dice roll, and a whole chain can arrive from one low-tier row. Keep: the odds (1 in 8 leader, 1 in 32 grand-leader per slot) and a rule that the base row is always present. Change: an elite announces itself with a banner or a low horn, and zone data (row 23 of the parity list) decides which chain may appear in which zone. Ref: config.b:84; combat.cpp:347-354.

7. Pack swarm. Rows 25, 26, 29, 31 and 34 (encounterSize 12 to 15). Why: big groups of small, fast creatures that are weak alone. Keep: group size as a per-row number. Change: formations of fewer visible bodies at 375 wide, with the cap of melee attackers at 3 (MAX_ATTACKERS) and the rest waiting in a ring. Ref: config.b:84, 85, 93; combat.cpp:375 and 380-381.

8. Lava lizard. Row 47 (ranged lava attack, resists fire, leavestile flag set). Why: a ranged attack that leaves a terrain hazard behind it. Keep: a ranged attack that changes the ground. Change: a visible glow line that fades, and no lasting terrain change. Ref: config.b:106. What leavestile does was not read (src/ not searched for it).

Creature decision order (creature.cpp act(), lines 304-340), read in full for this order:
- Asleep: wakes with a 1 in 8 roll each turn (line 312).
- Teleport at 1 in 8 when the row allows it (line 325).
- Ranged attack at 1 in 4 when the row is ranged and the attack is not negated (line 329).
- Sleep cast at 1 in 4 when the row casts and the party is not negated (line 331-333).
- Flee when HP is under 24 (line 335).
- Otherwise attack or close in.

Defects found, with the fix (keep the idea, fix the defect):
- Divide rounds up on both halves (creature.cpp:526-528). Odd HP makes the total grow by 1 on each split. Fix: child = floor(hp / 2), parent = hp minus child.
- Damage roll is non-monotonic (creature.cpp:64-65). A roll of 9 gives 9 and a roll of 10 gives 0. Fix: a linear roll from 0 to max.
- Flee threshold is absolute, 24 HP (creature.cpp:93), while the other health states scale with base HP (creature.cpp:87-98). A 255-HP top row flees only near 9 percent. Fix: a fraction of basehp, the same as the other states.
- A fleeing caster still rolls ranged and sleep before the flee check (creature.cpp:325-335). This may be intended. Check before changing.

## 2. Classes, races, factions

Classes (config.b rows 2-9, lines 53-60): Mage, Bard, Fighter, Druid, Tinker, Paladin, Ranger, Shepherd. Eight player classes, each with a base HP field (48 to 144) and an exp field. The exp field meaning in the engine was not read.
- Role signature in the data: only the Mage row is ranged (config.b:53, rangedhittile magic effect). The class-specific spells are in src/spell.cpp (not read).
- Equipment locks are the class signature (config.b:13-46): fighter, tinker and paladin share chain and plate; magic chain is fighter and paladin; magic plate is paladin only; leather is not for mage; halberd is fighter, tinker, paladin; magic wand is mage, bard, druid.

Progression shape (party.cpp):
- Level is max HP divided by 100 (party.cpp:135). Max HP is the level signal, not a separate level table.
- The highest level allowed by XP doubles each step: level 2 at 100 XP, then 200, 400, 800, 1600, 3200, 6400, and level 8 is the cap (party.cpp:143-149).
- The real level and the XP-based max level are two systems. Their agreement is not checked here.

Races: none. There are no race rows.

Factions: a good flag on 30 rows and wontattack on the town rows. Forces of nature cannot be attacked (isAttackable, creature.cpp:54-62). Sea creatures can be good (row 22). Hostile is the default.

## 3. Weapons

Families (config.b:23-46, 16 rows):
- Melee (range 1): Hands, Staff, Mace, Axe, Sword. Damage 8, 16, 40, 48, 64.
- Thrown and ranged (range 10): Dagger (losewhenranged, line 27), Sling, Bow, Crossbow.
- Special: Flaming Oil (range 9, leaves a fire field, lost on use, config.b:34). Halberd (range 2, absolute range, attacks through objects, class-locked, config.b:36-38).
- Magic: Magic Axe (returns, class-locked, line 39), Magic Sword (128, line 40), Magic Bow (80), Magic Wand (160, mage bard druid, magic flash hit and miss tiles, line 42), Mystic Sword (255, magic, line 45).
Tiers: 8 to 255 damage. Visual tier is carried by the hit tile (magic flash, hit flash, poison field, rocks), not by a weapon look.

Top 5 striking:
1. Flaming Oil (config.b:34). Keep: a thrown consumable that leaves terrain. Change: a pool that crackles for a few seconds, not a fixed field.
2. Halberd (config.b:36). Keep: a reach-2 spear that hits through allies. Change: a visible sweep arc at 375 wide.
3. Magic Axe (config.b:39). Keep: a throw that returns. Change: a glint trail on the return, one sound cue.
4. Magic Wand (config.b:42). Keep: separate hit and miss effects for one weapon. Change: effect colour by school, not one flash for all.
5. Mystic Sword (config.b:45). Keep: a top weapon that is data only, with the magic flag. Change: a gold edge and a slow pulse, no stat block.

## 4. Armour and gear

Armour entries (config.b:13-20, 8 rows): Skin 96, Cloth 128, Leather 144 (not mage), Chain Mail 160 (fighter, tinker, paladin), Plate Mail 176 (same three), Magic Chain 192 (fighter, paladin), Magic Plate 208 (paladin only), Mystic Robe 248 (no lock).
- No sets and no set bonuses.
- Tiers are shown by name and class lock. The look of each tier is in the art folders (module/Ultima-IV/image, not read).
- Materials are named only: skin, cloth, leather, chain, plate, robe. No metal or gold shader in the data.

Top 5 striking:
1. Mystic Robe (config.b:20). The top defence with no class lock. Keep: the best tier is open to everyone. Change: a soft shimmer, not a metal.
2. Magic Plate (config.b:19). Paladin only. Keep: class-exclusive top gear. Change: the exclusive piece gets a crest on the chest.
3. Magic Chain (config.b:18). Two classes. Keep: a middle tier that is shared by two classes. Change: a rim-light instead of a colour change.
4. Leather (config.b:15). Denied to one class. Keep: a class-specific denial as a readable rule. Change: show the denial in the gear card, not a silent failure.
5. Chain and Plate (config.b:16-17). The same lock for three classes. Keep: one lock list for a pair of tiers. Change: each tier gets a distinct silhouette.

## 5. Zones and dungeons

Map types (maps.b, 57 entries):
- World: one 256 by 256 world, chunked by 32 (maps.b:2).
- Cities, castles, towns, villages, ruins: 17 entries, each 32 by 32, exit border (the first starts at maps.b:63).
- Dungeons: 8 entries (maps.b:236 onward). Each is 8 by 8 per level, 8 levels, 16 rooms. The last one, the abyss, has 64 rooms (maps.b:325-326).
- Shrines: 8 entries, 11 by 11, fixed border (maps.b:328).
- Combat maps: 23 entries, 11 by 11 in every entry read (maps.b:352-369 region), one per battle terrain (brick, bridge, brush, camp, dungeon, dng0 to dng6, forest, grass, hill, inn, marsh, shore, ships), e.g. maps.b:352 (brick), 363 (dungeon), 367 (inn), 369 (ship at sea).

Terrain rules (config.b:132-167): speed classes slow, vslow and vvslow on swamp, brush and hills. Swamp adds poison (config.b:136). Water and shallows swim and sail. Mountains are unflyable. Fields for poison, energy, fire and sleep each have a dispel flag (config.b:155-159).

Dungeon archetypes and hazards (dungeon.h and dungeon.cpp):
- Tokens: corridor, ladder up, ladder down, ladder both, chest, ceiling hole, floor hole, magic orb, trap, fountain, field, altar, door, room, secret door, wall (dungeon.h:45-61).
- Traps: winds (quenches the light, dungeon.cpp:281), falling rock and pit (both give rock damage, the pit adds a view shake, dungeon.cpp:283-290). Trap types are at dungeon.h:97-101.
- Fountains: normal, healing, acid, cure, poison (dungeon.h:103-109).

Top 5 striking:
1. The Abyss (maps.b:325-326). The only 64-room dungeon. Keep: a bigger dungeon as its own archetype. Change: a colour band per depth, not new art per level.
2. Shrine (maps.b:328). Eleven by eleven, fixed border, a short sanctuary between battles. Keep: a sealed small room as a rest stop. Change: a light and a sound bed that change with the zone.
3. Winds trap (dungeon.cpp:281). Keep: a hazard that drains light. Change: the light flickers and dims, the torch is not removed.
4. Pit trap shake (dungeon.cpp:290). Keep: the camera shakes on pit damage. Change: a short, readable shake that can be turned off (accessibility).
5. Battle map per terrain (maps.b:352-369). Keep: the battle arena follows the terrain. Change: the arena comes from zone data, not a separate file per terrain.

## 6. Item and effect looks worth recreating

- Tile animation vocabulary (graphics.b:418-445, tileanim.cpp):
  - scroll: advances 4 steps a second, because the cycle counter runs at 4 a second (tileanim.cpp:35; screen.h:106 sets SCR_CYCLE_PER_SECOND 4). Water uses scroll_pool (graphics.b:420).
  - frame random 50: the frame advances on about half of the draws (tileanim.cpp:140; graphics.b:421). The gate returns early, so an idle sprite stays on its last frame.
  - campfire: a warm colour band is repainted with random jitter each frame (graphics.b:435; tileanim.cpp:107). This is the idea behind a flame look, without any colour copied.
  - phantom flicker: frame plus scroll (graphics.b:444).
  - flags: invert-based flag animations with context frames (cityflag, shipflag, pirateflag; graphics.b:423-433).
- Effect tiles (rangedhittile use across rows): magic flash in 6 rows, hit flash in 3, poison field in 3, rocks in 2, energy field, sleep field and lava in 1 each, random in 2 (config.b, single-line rows).
- Idle motion: monsters have 4 frames (config.b:282 onward), persons 2 (config.b:197 onward). Guards use a slow frame at random 5 (graphics.b:422).
- Death read: a short line on the message bar, with the XP only for a kill by the player (creature.cpp:700-702).
- Sound cues (config.b:474-510): spell precast, spell flash, fizzle, poison effect, poison damage, evade, magic heal, level up, gain virtue, moongate, cannon, party struck, whirlpool, cyclone, gate open, stone falling, wind gust, UI click and tick, ignite. The audio was not played.
- Music is by context: one bed per town type, dungeons, castles, shrines, combat, wanderer, fanfare (config.b:461-473). Music bed names are not copied here.

## 7. Inspiration for Frankendom (originals, all recreated as distinct originals, never copies)

Each one names what is kept and what is changed. Parity rows are from the Lead list.

1. Storm Ring (roaming hazard). Keep: a wandering hazard that cannot attack and moves the player. Change: telegraphed ring with a shadow and tick; zone data sets its path. Row 23 for spawn and row 4 for the fight loop. Ref: config.b:80-81.
2. Split Slime (split on a surviving hit). Keep: the split comes from damage the player dealt. Change: HP split floor(hp/2) and parent takes the rest; splits capped per encounter; counts toward MAX_ATTACKERS. Row 1 and row 18 (loot and XP stays with the parent only). Ref: creature.cpp:512-528, 738.
3. Bloom Spawner (death spawns a swarm). Keep: a death that adds a threat. Change: one-second telegraph, fewer bodies, the swarm uses the attacker cap. Row 17 (death and respawn). Ref: config.b:94; creature.cpp:541.
4. Chest Mimic (camouflage with a distance reveal). Keep: a hidden threat that reveals in range. Change: reveal at 2 tiles, lid tremor tell, no reveal through walls. Row 11 (fight camera). Ref: config.b:91; creature.cpp:555.
5. Warding Sage (timed anti-magic aura). Keep: one visible aura slot with a duration. Change: halo, counter-spell cue, real-time seconds. Row 13 (specials). Ref: creature.cpp:317-318; aura.cpp:18-27.
6. Escort Ladder (leader and grand-leader odds). Keep: 1 in 8 leader, 1 in 32 grand-leader, base row always present. Change: a banner or horn for an elite; zone data (row 23) decides which chain can appear. Row 23 for zone population. Ref: combat.cpp:347-354.
7. Storm Gear Ladder (armour tiers with class locks). Keep: a top tier open to everyone and a paladin-only tier. Change: a crest for exclusive tiers, a rim-light for the middle; no metal shader from this donor. Row 15 (gear dressing). Ref: config.b:13-20.
8. Winds Trap (light drain). Keep: a hazard that dims the light. Change: a flicker with a soft sound, no torch removal. Row 16 (colour grade and quality). Ref: dungeon.cpp:281.

## 8. Licence note

Code: GNU GPL v3 (COPYING line 1 and line 2). Assets: mixed, mostly unstated. Music and some art credit individual rights holders (AU059). The original game data is not in the repo. Shape only, clean-room.

## Not read

- The original game data (not in the repo).
- src/ beyond creature.cpp (lines 50-110, 300-345, 500-560, 680-760), combat.cpp (lines 320-390), party.cpp (lines 120-150), aura.h and aura.cpp, dungeon.h and dungeon.cpp (trap and token sections), tileanim.cpp (lines 15-190 in part). spell.cpp and the sleep and negate spell code: not read.
- config.b: vendors and the 16-entry palette body (the palette block at config.b:442 was not read as values, and no values are copied here).
- maps.b and vendors.b bodies: vendors.b has 1384 lines, not read beyond its header.
- graphics.b bodies: the sprite and tile lists were not opened (lines 1-400 not read in full).
- U4-Upgrade config.b (296 bytes, no creature rows) and graphics.b (13750 bytes, not read beyond the listing).
- All PNG, OGG, WAV, RFX and TXF files: names and counts only. Nothing opened, played or sized.
- doc/ text beyond names.
- leavestile and the fight camera, the death and respawn screens for the party, and the boss or intro staging: not read.
