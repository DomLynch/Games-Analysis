# l1j-en-classic (design catalogue, DC032)

Donor: /mnt/frankendom-donors/l1j-en-classic/ (VPS, read-only)
Class: C for the data tables (game-specific content, not cleared; audit AU029). Code is GPL-2.0. Inspiration stays category-level. No instance-level looks, no copied names, no copied lore.
Dom's rule: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
Not legal advice; the licence reading below is what the files say.

## Halves read
- Read: the SERVER half. Source (src/l1j/server/server/model, templates, datatables, classes), the SQL dump (db/l1jdb_m10.sql), the XML data (data/xml/Cycle, Item, NpcActions), rates and server config (config/).
- Client half (art, sound, models, client rules): NOT in this donor. The paired client in the box is uglyoldbob-l1j-client (audit AU054: GPL-3.0 client code, game data not in its repo). I did not open the client. Note: audit AU029 says no paired donor exists; AU054 lists this one. I follow AU054.
- Data files I did not open: the archive (db/archive/archive.tar.bz2), the connector zip, the binary idstate.dat, and the 567 map grid files (counted only).

## Counts (verified in the box, from the SQL dump and XML)
- Creatures: 2,747 NPC-table rows; 1,313 are monster class (L1Monster). 1,795 distinct names across all NPC rows.
- Classes: 7 playable classes (L1ClassId.java lines 28-34).
- Weapons: 331 weapon rows.
- Gear sets: 62 armour-set rows. Armour: 624 armour rows.
- Zones: 545 map-table rows; 1,521 dungeon teleport rows; 567 map grid files (maps/).
- Other: 11,772 spawn-list rows; 11,004 drop-list rows; 793 mob-skill rows; 94 mob-group rows; 52 trap rows; 110 treasure boxes; 28 live world-boss cycle entries.

## 1. Creatures
Monster-class rows (1,313):
- Level 50 or higher: 264. Level 70 or higher: 26.
- Family tag set on 898 monsters, across 125 distinct tags. 415 have no tag.
- Family alert mode 1 (same family only) on 725 monsters. Mode 0 on 588.
- Agro flag on 909 monsters. Tamable on 234. Undead flag set on 307 (value 1 to 5; meaning not read). Ranged attack set on 1,287. Hard flag on 144. Teleport on 7.
- Highest HP in the table: 30,000. Five level-1 rows carry it (probably event or training rows, not interpreted); a level-60 row and a level-70 row also carry 30,000; the level-99 row carries 28,000.
- Light radius set on 1,399 of 2,747 NPC rows (all NPC classes).

Mob skills (793 rows; 424 carry the full 22 values and carry the type counts; the other 369 carry 21 values in the dump, so their column alignment is unchecked and they are left out of field counts):
- Type 2 (magic attack): 309 rows. Type 1 (physical attack): 69 rows. Type 3 (summon): 46 rows.
- Trigger random: set on all 424 full rows. Trigger range set on 391. Trigger count set on 17. Trigger HP set on 8. Summon set on 46.
- Poly id set on 0 full rows; area width set on 14 full rows.

Pets: 29 pet-type rows link each form to the next through an evolution column.

Traps (52 rows): monster-summon 34, teleport 7, skill 4, damage 3, poison 3, heal 1.

Top 8 striking (creatures, category-level):
1. Heavy late-tier brute. The highest-level big-HP monster in the table (level 99, HP 28,000; NPC row 81163). Why: one large body that carries a late fight. Keep: a single heavy silhouette with a long wind-up. Change: our brute telegraphs each swing with a visible ground mark.
2. Gated caller. A summoner whose ordered skill list is gated by random chance, HP ratio, lowest-companion HP, distance band, and use count (L1MobSkillUse.java 405-465). Keep: ordered gates, first usable wins. Change: a visible call-out before each summon.
3. Kin-alert pack. Family tags with a mode: mode 1 alerts the same family only; group leaders link the group (L1NpcInstance.java 370-392). Keep: tag and mode as data. Change: a hate list with the three-attacker cap (Frankendom ruling MAX_ATTACKERS = 3) and an alert ring on the ground.
4. Window boss. A world boss whose appearance is a random point inside a daily window (BossCycle.xml line 12-13; L1BossCycle.java 215-258). Keep: the daily window and the random appearance. Change: a sighting hint and a daily jitter (see the defects below).
5. Hard-flag elite. 144 monsters carry a hard flag in the table. Keep: a flag marks elites in data. Change: an elite ring that reads at 375 wide, not a stat number.
6. Tamable companion that evolves. 234 tamable monsters; 29 pet-type rows link each form to the next (pettypes table, NpcIdForEvolving). Keep: evolution as a data link. Change: each evolution shows as a silhouette change.
7. Ambush trap creature. 34 of 52 traps summon monsters (L1MonsterTrap). Keep: a trap that spawns its own threat. Change: a telegraph on the floor before it fires.
8. Light-carrying creature. 1,399 NPC rows carry a light radius. Keep: light radius as data. Change: light colour per faction, readable at 375 wide.

## 2. Classes
Seven playable classes, ids 0 to 6 (royal, knight, elf, wizard, dark elf, dragon knight, illusionist). Each class is a stat curve in code (classes/L1ClassFeature.java and one file per class). Each defines fixed base stats, maximum stats, and per-attribute curves for hit, damage, magic, evasion and regeneration.

- Royal (id 0): magic level min(2, level/10) (L1RoyalClassFeature.java 39). Evasion-type rating level/8. Fixed Str 13, Cha 13.
- Knight (id 1): magic level level/50, no cap (L1KnightClassFeature.java 34). Fixed Str 16, max Str 20. Melee damage bonus: +2 at Str 18 or more, +4 at Str 20 (line 107 onward). Starting HP 16.
- Elf (id 2): magic level min(6, level/8). Fixed stats near 12 across Str, Dex, Con, Int.
- Wizard (id 3): magic level min(10, level/4), the highest magic ceiling (L1WizardClassFeature.java 39). Fixed Int 12, max Int 18. Fixed Str 8.
- Dark elf (id 4): magic level min(2, level/12) (L1DarkElfClassFeature.java 39). Fixed Dex 15, the highest base Dex. Fixed Con 8.
- Dragon knight (id 5): magic level min(4, level/9) (L1DragonKnightClassFeature.java 39). Fixed Str 13, Con 14.
- Illusionist (id 6): magic level min(6, level/8). Fixed Int 12, Con 12.

Progression shape: each class sets its own cap on magic level (2, 4, 6, 10, or uncapped for the knight) and its own evasion rate per level. This is a data-shaped curve in code, so balance can be read per class in one place.

Role per class: not read in depth. Signature mechanics beyond the stat curve are not checked here.

## 3. Weapons
Weapon families (331 rows, by type column): sword 76, bow 39, staff 31, two-hand sword 30, dagger 24, edoryu 23, claw 21, spear 19, single spear 16, blunt 15, two-hand blunt 15, two-hand staff 5, single bow 5, gauntlet 4, kiringku 4, chain sword 4.

Material tiers (weapon rows): iron 100, steel 74, wood 49, black mithril 23, mithril 19, silver 16, oriharukon 14, bone 13, platinum 13, gold 6, gemstone 3, leather 1.

Special properties: elemental and set bonus are on armour sets (section 4); weapon rows carry a damage-bonus field, a double-damage chance, and a magic damage modifier (weapon table columns).

Top 5 striking (weapons):
1. Two-hand family (sword 30, blunt 15, staff 5). Keep: a two-hand flag that trades offhand for power. Change: our two-hand weapons carry a visible stance change.
2. Bow family (39 bow rows and 5 single bow). Keep: a ranged family with a single-hand variant. Change: draw animation tied to the draw time.
3. Claw and gauntlet (21 and 4). Keep: fast short-range hands as a family. Change: a combo strip that reads at 375 wide.
4. Black mithril and oriharukon (23 and 14 weapon rows). Keep: the upper material tiers. Change: our tiers use our own names and a colour ramp.
5. Chain sword (4 rows). Keep: a rare reach-and-chain weapon family. Change: a visible chain link trail.

## 4. Armour and gear
Armour types (624 rows): armour 105, amulet 83, helm 79, ring 73, cloak 52, earring 52, boots 41, glove 38, shield 36, belt 34, a type code T 27, guarder 4.

Armour materials: leather 129, cloth 93, iron 89, gemstone 83, gold 70, bone 56, mithril 23, black mithril 17, silver 14, wood 13, dragonscale 11, steel 8, platinum 4, vegetation 3, copper 3, glass 3, paper 3, oriharukon 2.

Armour sets (62 rows, by piece count): 1 piece 32 sets, 2 pieces 12, 4 pieces 10, 3 pieces 3, 5 pieces 3, 6 pieces 1, 8 pieces 1. Each set carries stat bonuses and four elemental defence values (water, wind, fire, earth).

Enchant: each armour and weapon row has a safe-enchant value. Enchant success and failure logs exist as tables (LogEnchantSuccess, LogEnchantFail).

Top 5 striking (gear):
1. Dragonscale and gemstone armour. Keep: rare materials that carry the top tier. Change: our dragonscale reads as plates with a scale pattern.
2. Elemental defence per set (four values). Keep: a set that defends by element. Change: our element shows as a shield rim colour, plus a shape cue.
3. Glass, paper, vegetation as odd materials (3 rows each). Keep: odd materials as a rare-look family. Change: ours are a rare look, not a joke tier.
4. Safe enchant as a tier gate (safe-enchant column). Keep: a safe level before risk. Change: a visible safe mark on the item.
5. Accessory slots: amulet 83, ring 73, earring 52. Keep: a dense accessory layer. Change: accessories sit on the silhouette, not a text list.

## 5. Zones and dungeons
Map table: 545 rows. Map-name buckets (first keyword match; approximate): tower 101, dungeon 57, floor 49, cave 18, island 13, castle 13, ship 9, hidden 8, forest 8, temple 7, jail 3, hell 2, prison 1, town 1, battle 1, desert 1, other 253.
- Dungeon teleport graph: 1,521 rows.
- Random dungeon: 10 rows.
- Underwater: 6 maps.
- Teleportable: 138 of 545 maps. Escapable 528. Resurrection 529. Penalty 536. Pets may be taken on 505 maps.
- Arena (Ultimate Battle): 5 settings rows with level bands 1-15, 10-20, 25-45, 30-48, 40-99, and max 20 players. Arena spawn rows 1,114, with seal count 15 on 26.

Top 5 striking (zones):
1. Tower stack: 101 tower-named maps and 49 floor-named maps. Keep: a stack of floors joined by teleports. Change: a floor palette shift and a cleared-floor marker.
2. Level-banded arena: 5 bands, each with a player cap. Keep: one arena per level band. Change: arena rules shown as a badge; Pit-only per Frankendom row 22.
3. Underwater rule on a few maps. Keep: a rule map that changes breath or movement. Change: a clear visual cue, not text.
4. Per-map rule flags as data (teleport, penalty, pets, escape). Keep: rules as a row of flags per map. Change: flags show as badges on the map.
5. Trap table as a hazard list (52 rows, 6 types). Keep: traps as typed hazards. Change: each trap type gets its own floor telegraph.

Biome archetypes: not in this half as data (map grids are not interpreted).

## 6. Looks worth recreating (server side only; visuals live in the client)
- Light radius per creature: npc light_size on 1,399 rows (l1jdb_m10.sql, column at line 1605). Technique: a point light per creature, with a radius from data.
- Aggro reaction graphic: npc agrogfxid1 and agrogfxid2 (columns at line 1580). Set on only 5 rows. Technique: a reaction emote on first aggro.
- Transform and doppel: npc transform_id set on 55 rows; doppel flag on 4. Technique: a shape change swap.
- Skill cast graphics: 37 distinct castgfx ids across the skill table. Technique: a per-skill cast effect id, to be mapped to our own effects.
- Sprite action table: 11,405 rows (not read beyond the count).
- Rest-zone regen multiplier as data: RateHpCastle = 5 (config/rates.properties line 10). Technique: a rest zone shown as a campfire glow, not a number.

## 7. Defects and fixes (keep the idea, fix the defect)
- Window boss, cycle search (L1BossCycle.java 215-232): steps the base date one period at a time, so cost grows with elapsed time. Keep the cycle. Fix: closed form from elapsed minutes modulo the period.
- Window boss, spawn offset (L1BossCycle.java 256): draws a new random offset on every call, so one boss reports a different time on each call. Keep the random appearance. Fix: draw once per cycle and store it.
- Gated caller, random gate (L1MobSkillUse.java 409-410): roll is 1 to 100 with a strict less-than, so a 100 percent gate fires 99 percent. Keep the random gate. Fix: use less-than-or-equal.
- Gated caller, companion gate (L1MobSkillUse.java 438): the gate rewrites the target before the skill is chosen, so a failed later gate still leaves the target changed. Keep the lowest-companion gate. Fix: return the target value; do not mutate it in the gate.
- Gated caller, summon cap (L1MobSkillUse.java 144-146): when the cap is hit, the skill spends its turn and returns true without summoning. Keep the cap. Fix: fall through to the next skill in the list.
- Gated caller, no triggers (L1MobSkillUse.java 405-465): a skill with no trigger field set never fires, because the usable flag starts false. Behaviour to confirm with the owner before we rely on it.
- Kin-alert link (L1NpcInstance.java 370-371): the base link method has an empty body. Keep the family alert. Fix: one place for link logic; the monster class overrides it (L1MonsterInstance.java 208: a link only fills an empty hate list).

## 8. Inspiration for Frankendom
1. Gated Caller: an ordered list of skills, each gated by random chance, HP ratio, lowest-companion HP, distance band, and use count. KEEP: ordered gates and first-usable-wins. CHANGE: a visible call-out, and the three fixes above. Rows: 2 (AI brain), 13 (specials).
2. Window Warden: a world boss that appears at a random point inside a daily window, with a sighting hint. KEEP: the daily window and the random appearance. CHANGE: a per-cycle jitter stored once, and a closed-form cycle. Rows: 23 (zone population), 18 (server tick: fixed step, per-tick NPC budget).
3. Kin Alarm: family tags with a mode; a pack alerts its family. KEEP: tag and mode as data. CHANGE: the three-attacker cap, and an alert ring on the ground. Rows: 4 (aggro, chase, leash), 23.
4. Weighted Strongbox: a treasure box with random chances summing to 100 (60 random boxes all sum to 100; 50 fixed boxes). KEEP: the weighted table and the 100 check. CHANGE: a rarity colour and sound at the drop. Rows: 18 (loot roll), 21 (catalogue fields).
5. Tamer's Growing Companion: a tamable creature with a data link to its next form. KEEP: evolution as a data link. CHANGE: each form has its own silhouette and idle loop. Rows: 7 (creature actor), 20 (catalogue as runtime source).
6. Tower Stack: dungeon floors joined by teleport rows, one floor theme per level. KEEP: stacked floors as data. CHANGE: palette shift per floor, cleared-floor marker. Rows: 20, 21.
7. Level-Banded Arena: one arena per level band with a player cap. KEEP: bands as data. CHANGE: Pit-only, per row 22.
8. Rest Ring Shrine: a regen multiplier for rest zones shown as a campfire glow. KEEP: the multiplier as zone data. CHANGE: a glow, never a number. Rows: 17 (death and respawn), 23.

Rulings used: MAX_ATTACKERS = 3; hate list in the engine; kills server-verified; zones are data; one character one ledger.

## 9. Licence
- Code: GNU GPL version 2 (COPYING line 1; README.md line 115).
- Data (SQL, XML, config, maps): under the same repo-wide GPL-2.0 statement. No separate asset licence found.
- The README calls the server a clean-room implementation (README.md line 84). This is the project's own description; I did not verify it.
- Rights holder: no owner is named for the game data tables. Game-specific tables are not clearly cleared (audit AU029, class C).
- Paired client: uglyoldbob-l1j-client (GPL-3.0 code; game data not in its repo, audit AU054).

## Not read
- Client half (art, sound, models); paired client not opened.
- Archive db/archive/archive.tar.bz2, connector zip, idstate.dat.
- Map grid files (maps/*.txt): counted only.
- Monster AI subclasses beyond the link method; trap logic; pet evolution logic; polymorph logic.
- Meaning of the undead value (1 to 5), the zone-type fields, and the 30,000-HP level-1 rows.
- Full class roles and signature mechanics beyond the stat curves.
- Item effect logic and craft recipes (369 item-making and 117 single-item-making actions counted only).
