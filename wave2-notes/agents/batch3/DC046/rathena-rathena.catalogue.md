# rathena-rathena (design catalogue, DC046)

Donor: /mnt/frankendom-donors/rathena-rathena (VPS, read only).
Licence: GNU GPL v3 for the code (LICENSE line 1; README.md line 81). Data files carry a GPL v3 header (db/re/mob_db.yml header). The game whose data sits in db/ is not named in the files. Treat every number as shape only. Recreate as a clearly distinct original, never a copy. Not legal advice.

Halves read: DATA PACK (db/re/*.yml, db/re/mob_skill_db.txt, db/import-tmpl/mob_skill_db.txt header, npc/instances, npc/mapflag, npc/re spawn lines counted by script). SERVER HALF (src/) only partly: src/map/mob.cpp condition-handler lines 4361 and 6405 by grep; the rest of src/ not read. CLIENT HALF: not in the box. No paired client donor in the box.

Checked: counts below are grep or awk counts over the named files (method stated per line). Receipts for the key counts and mechanics are in receipts.tsv (68 rows, all verified by verify_receipts.py). I am confident in the data-table reads; I could not see art, sound, or the client, so silhouette, sound and gear look are marked "not in box".

Also: the mob_db "Ai" number is a brain id I did not decode (doc/mob_db_mode_list.txt not read in this pass).

## 1. Creatures and beasts

Counts (db/re/mob_db.yml, grep of "  - Id:"): 2,675 entries. Of these: 732 carry Class: Boss, 190 carry the MVP mode flag (Large 120, Medium 64, Small 6). Explicit Class values: Boss 732, Event 69, Battlefield 25, Guardian 4. Other entries leave Class out (default not read).

Families by Race (entries / boss-class / MVP-flag):
- Formless 697 / 241 / 18
- Demihuman 451 / 133 / 49
- Demon 360 / 128 / 47
- Brute 329 / 55 / 24
- Insect 223 / 30 / 14
- Plant 192 / 17 / 7
- Undead 186 / 36 / 10
- Fish 104 / 30 / 7
- Angel 68 / 43 / 9
- Dragon 59 / 17 / 5
- two player-race rows (Player_Human, Player_Doram) and 4 rows with no race.

Elements (top): Neutral 665, Earth 406, Dark 293, Water 268, Fire 260, Wind 243, Undead 194, Poison 134, Ghost 114, Holy 94.

Escalation with level (Level field, all 2,675 entries): 1-19: 244; 20-39: 125; 40-59: 183; 60-79: 189; 80-99: 476; 100 and up: 1,458. Boss-class by level: under 40: 44; 40-69: 33; 70-99: 124; 100 and up: 531. The top of the tier ladder is level 100+ bosses; the MVP set spans levels about 25 to 224 (awk over Level and Mvp lines).

Signature abilities come from db/re/mob_skill_db.txt: 14,514 data rows (lines not starting with //) across 1,941 mobs and 286 distinct skill ids. Rows are keyed by mob, state, skill, rate, cast time, delay, target and one condition. State counts: attack 7,990; chase 3,255; idle 2,429; angry 383; walk 239; follow 147; loot 58; dead 8; any 5. Condition counts: always 10,445; HP at or below a % 1,668; rudely attacked 673; slaves at or below a count 499; skill used on it 294; friend HP at or below a % 287; long-range attacked 257; player count (attackpcge, not decoded) 161; cast-targeted 73; on spawn 57; monsters nearby greater than a count 53; status on 17; ground attacked 9; master attacked 6; friend status on 6; damaged greater than a value 5; alchemist 3; trick casting 1.

Condition semantics (db/import-tmpl/mob_skill_db.txt header, lines 28, 39, 46). These three are the core of the design pattern: HP band, minion count, crowd count.

Top 8 most striking (labels are ours; donor names not used):

1. Crown Revenant (entry at mob_db.yml line 1808; Class and MVP lines 1840 and 1842). Undead, Medium, Boss, MVP. Summons a guard set on spawn (mob_skill_db.txt 182). Re-summons when guards are at or below 3 (180). Power-up at 30 percent HP with a 120 s delay (166). Self-heal on a "damaged greater than 50,000" condition (179; whether it is per hit or total is not verified). Why striking: a minion refill rule and a hit-triggered heal. Keep: refill at a small count (3) and the on-spawn summon. Change: the heal becomes a visible wind-up window; the power-up becomes a visible aura with its own cue. Ref: db/re/mob_db.yml:1808; db/re/mob_skill_db.txt:166,179,180,182.

2. Ladder Wyrm (entry at mob_db.yml line 43096; HP line 43101). Dragon, Dark, Large, Boss, MVP, 42 skill rows (tied with the water family below for the most rows among the MVP entries I counted). Its skills unlock at HP bands: stone skin at 3 percent (mob_skill_db.txt 5661 area), power-up at 15, quagmire at 28 (5665), earthquake at 30 (5667), invisibility at 40, heal at 60 (5691), wide curse at 75, slow cast at 70, sleep at 95. On-spawn summon at 5656. Why striking: each band adds a move, so the fight changes shape as HP falls. Keep: the band ladder and the on-spawn summon. Change: four bands, not ten; each band gets a roar cue and a telegraph readable at 375 wide.

3. Dragon that re-summons from zero (entry at mob_db.yml line 31175; HP line 31180). Dragon, Dark, Large, Boss, MVP, HP line 6,005,000 (field not interpreted beyond the raw value). Summons minions only when none are left (slave count 0, mob_skill_db.txt 3800). Why striking: a zero-minion trigger is a clear "you cleared the adds, now the boss calls more" beat. Keep: the zero-count summon. Change: the summon is a visible call with a wing-beat cue, capped to our 3-attacker rule.

4. Five-colour beetle brood (entries at mob_db.yml lines 61082, 61213, 61270, 61327, 61384 for IDs 2529, 2532, 2533, 2534, 2535). Insect, Large, Level 155, HP line 50,000,000 on each, MVP flag on all five. Elements: Poison, Fire, Earth, Water, Wind. The quake skill appears on 2529 (mob_skill_db.txt 8884) and on 2532 (rows 8912-8913); 2532 also carries a pulse strike (8911). Not every member was checked for the same rows. Why striking: one family, one silhouette, five colourways. Keep: one shape, five elements, one level tier. Change: each element gets its own signature move and cue; palette is ours.

5. Gilded thief beetle (entry at mob_db.yml line 4187; class line 4219). Insect, Fire, Large, Level 65, Boss, MVP. Teleports away when rudely attacked (mob_skill_db.txt 385-386). The name suggests gold plating, but the gold look is not in this box (client side). Why striking: a flee-and-return thief. Keep: flee on a hit, return later. Change: our own metallic gold ramp and a thief cue.

6. Tidal kraken tiers (family of six MVP Large Water entries: IDs 2187, 2188, 2189, 2190, 2194, 2202; entries at mob_db.yml 49743 and 50468, HP lines 49748 and 50472). Levels: 2194 at 95; 2187 and 2188 at 100; 2202 at 124; 2189 and 2190 at 155. Signature: a storm skill on chase (mob_skill_db.txt 7075), a wide curse (7091), summon at 3 slaves (7098). Why striking: one family spans four level tiers. Keep: level tiers inside one silhouette and the storm as a telegraphed area. Change: the storm fills from the edge in our own ring; tiers shown by fin and scale colour.

7. Crowd hopper (entry at mob_db.yml line 100678; HP line 100682; Insect, Earth, Small, Level 164, not Boss). While chasing, uses its self-teleport when more than four monsters are in range (mob_skill_db.txt 13072, condition mobnearbygt 4). Why striking: a crowd-count trigger, a rule that fits a many-on-one fight. Keep: the crowd-count trigger. Change: count our hate-list members, and cap the response to our MAX_ATTACKERS = 3 rule. It repositions the pack, not the player.

8. Demon with a retinue (entry at mob_db.yml line 1868; ID 1039; Demon, Dark, Large, Level 81, Boss, MVP). Two summon rules: on spawn (mob_skill_db.txt 204) and when slaves are at or below 3 (202). Why striking: the same two-rule summon pattern as #1, on a different race, showing the rule is reusable. Keep: both rules. Change: the retinue is a visible group that breaks off when the boss is hit hard.

Not verified: silhouette at 375 wide, sound, and effect looks for all eight (no art or audio in the box). Skill names (for example the AegisName and skill ids) map to rows in db/re/skill_db.yml; I checked the names for the rows I cite (skill_db.yml lines 1290, 5941, 5942, 1353 and others) but did not read the effects themselves.

## 2. Classes, races and factions

- Player race rows in mob_db: Player_Human and Player_Doram (one row each).
- Job tree: 175 distinct job names in db/re/skill_tree.yml (grep of "  - Job:"; first entry line 44, Novice).
  - Base, second and high tiers: Novice, Novice_High, Hyper_Novice, plus 9 names containing "High".
  - 51 "Baby_" names (a beginner variant of a job).
  - 15 names ending in "2" (alternate branches).
  - 17 names with a "_T" suffix (transcend tier).
  - 83 other names, not split further.
- Progression shape: base, then second, then transcend. Level and job-exp thresholds are in db/re/job_exp.yml and db/re/job_stats.yml (job_stats read in part: BonusStats per level, lines 1-25 of the file). Signature mechanic per job: not read in this pass.
- Factions and guilds: castle_db.yml has 44 entries (grep of "  - Id:"); guild_skill_tree.yml not read.

## 3. Weapons

- 2,806 weapon rows (grep of "Type: Weapon" in db/re/item_db_equip.yml; first at line 95).
- Weapon level tiers (WeaponLevel 1 to 5): 163, 153, 740, 1,171, 579 (level 4 is the largest; line 116 for a level-4 row).
- Weapon families by SubType (top 10): Dagger 304, Staff 281, 1hSword 216, Bow 205, Mace 196, Book 166, 2hSword 140, Katar 132, 2hStaff 116, Whip 112.
- Special properties: random options (db/re/item_randomopt_db.yml, 249 option rows; groups in item_randomopt_group.yml, 108 group rows). Weapon attribute options include wind, water, undead and telekinesis (wind at line 737). Weapon indestructible is also a random option.
- Visual distinctness of tiers: not in the box (client). The server only shows tiers as numbers.

Top 5 striking (families, not named items; file paths given):
1. Katar family (SubType Katar, 132 rows; db/re/item_db_equip.yml). Name-level read only; the paired-weapon shape and silhouette are not verified from data.
2. Staff and book caster families (281 and 166 rows; db/re/item_db_equip.yml). Name-level read only; the caster role is inferred from the SubType names.
3. Whip reach family (112 rows; db/re/item_db_equip.yml). Long reach, a different threat range.
4. Wind-attribute random option (db/re/item_randomopt_db.yml line 737). An elemental roll on any weapon as a random option; a cheap way to make elemental tiers.
5. High-grade refine material tier (db/re/refine.yml lines 60 and 64: material types HD and Enriched beside a normal type). Refining has three material grades with their own rates and prices; a readable tier ladder.

## 4. Armour and gear

- Armour rows: 8,954 "Type: Armor" rows (grep count in db/re/item_db_equip.yml). Shadow gear and pet rows also exist (not counted in full: case variants Shadowgear and ShadowGear, PetEgg and Petegg).
- Refine groups (db/re/refine.yml): Armor (line 49), Weapon (line 663), Shadow_Armor, Shadow_Weapon (line 2478). Each has per-level rates and three material types (Normal, HD at line 60, Enriched at line 64).
- Enchant grades (db/re/enchantgrade.yml, line 58): two families, Armor and Weapon. Grades None, B, C, D (grade chances per refine level).
- Gear sets: 8,618 combo rules in db/re/item_combos.yml (grep of "- Combo:"; line 38 is the first). These are item combinations, not uniquely named sets; combos are not de-duplicated.
- Materials cloth to plate and mythic metals: material names are in the item rows; not read in full. Gold, metallic and crystal looks are not in the data (client side).
- How the game shows tiers: refine level and enchant grade as numbers; visual tiers not in the box.

Top 5 striking:
1. Refine material tiers (refine.yml 49-64): three material grades with rates and prices. Keep the ladder, change the materials and names.
2. Enchant grade chances (enchantgrade.yml 58): a per-grade chance table up to a refine level. Keep the odds-by-grade shape.
3. Random option groups (item_randomopt_group.yml line 45): a rolled slot table with a min, max and chance per option. Keep the slot roll, change the option set.
4. Combo rules (item_combos.yml line 38, 8,618 entries): two or more items combine into a bonus. Keep the combo idea, cap the combos.
5. Shadow gear families (ShadowGear and Shadowgear rows, about 1,000 together): a separate gear track. Keep the separate track idea.

## 5. Zones and dungeons

- Instance definitions: 78 (db/re/instance_db.yml, grep of "  - Id:"). 18 have TimeLimit (seconds); 19 have AdditionalMaps (multi-map instances).
- Tower archetype: 101 floors (npc/instances/EndlessTower.txt line 12). Floor-by-floor warps.
- Other instance archetypes: catacomb (db/re/instance_db.yml, a second instance entry), and nest, shrine and memorial scripts (npc/instances/NydhoggsNest.txt, SealedShrine.txt, OrcsMemory.txt; names not copied here). Their floor counts and rules were not read.
- Field spawns: 3,563 monster spawn lines in npc/re (475 .txt files; counted by script). Most common minimum respawn values: 5 s (1,606 lines), 3 min (629), 1 min (150), 30 min (104), 5 min (96). Note: delay column read as delay1 (minimum respawn), the second field is variance (not read).
- Map flags (npc/mapflag, 29 files): nightmare (death drops, line 4), night, pvp, gvg, nopvp, nopenalty, nobranch, noskill, nowarp, nomemo, nosave, reset, town, partylock, restricted, skill damage and duration.
- Biome list: not read (no biome data; map names in db/map_index.txt, 1,323 lines, not analysed).
- Hazards: nightmare death drops, pvp and gvg flags. Terrain hazards not read.

Top 5 striking:
1. Endless tower (101 floors; npc/instances/EndlessTower.txt line 12). A floor ladder with one warp per floor. Keep the ladder, change floor count and loot.
2. Nightmare death drop (npc/mapflag/nightmare.txt line 4). On death, items and equipment may drop at a rate. Keep the risk, change to a cap and a recovery window.
3. Pvp and gvg flags (npc/mapflag). Zones switch rules by flag. Keep the flag-per-zone idea.
4. Timed instance (TimeLimit, 18 instances). A clock on the run. Keep the clock.
5. Multi-map instance (AdditionalMaps, 19 instances). One run across several maps. Keep the chained-map idea.

## 6. Item and effect looks worth recreating

- Mob skill table as a runtime source (db/re/mob_skill_db.txt): HP band and crowd triggers. Reference: db/import-tmpl/mob_skill_db.txt lines 28, 39, 46 (condition semantics).
- Effect catalogue: doc/effect_list.md (978 lines; not read in this pass, the audit read the header).
- Spawn and death rules: db/re/level_penalty.yml (34 rows, EXP and drop tables keyed by level gap; header at line 26).
- Glow, aura, shader and sound: not in this box (no art, no audio, no shader code read).

## 7. Inspiration for Frankendom (originals, our own names)

1. Crown Revenant: an undead boss that calls a guard when its guards fall to 3, then goes quiet. Keep: the refill threshold. Change: a visible wind-up window instead of a free heal. Ref: db/re/mob_skill_db.txt 180, 182.
2. Ladder Wyrm: a dark dragon whose HP bands each unlock one new move, four bands, one roar cue per band. Keep: the band ladder. Change: fewer bands, distinct silhouette, our moves. Ref: db/re/mob_skill_db.txt 5656-5691.
3. Five-Colour Brood: one beetle family, one size, five elements, five colourways, one signature move each. Keep: family and level tier. Change: the moves and palette. Ref: db/re/mob_db.yml 61082-61389.
4. Tidal Tiers: one water family across four level tiers. Keep: tiers in one silhouette. Change: the storm ring fills from the edge; tiers shown by fin colour. Ref: db/re/mob_db.yml 49743-50472.
5. Crowd Hopper: a small pack beast that blinks when more than four enemies are near. Keep: the crowd-count trigger. Change: count hate-list members and cap at 3 attackers. Ref: db/re/mob_skill_db.txt 13072.
6. Gilded Thief: a gold-look thief that flees when hit and comes back. Keep: flee and return. Change: our own gold ramp and cue. Ref: db/re/mob_skill_db.txt 385.
7. Death Ledger: a level-gap EXP curve plus a capped death drop with a recovery window. Keep: the gap curve. Change: curve values and drop rules. Ref: db/re/level_penalty.yml 26-38; npc/mapflag/nightmare.txt 4.
8. Tower of Floors: a shorter tower of 10 floors with a clock and a per-floor warp. Keep: floor ladder and clock. Change: floor count and loot ceremony. Ref: npc/instances/EndlessTower.txt 12.

## Not read
- src/ server code beyond mob.cpp condition lines (4361 and 6405 by grep).
- npc/ script bodies beyond spawn-line counts and the instance and mapflag headers (npc/re has 499 files; npc/quests 88; npc/cities 27).
- db/re item bonus scripts; job_exp.yml; castle_db rows; guild_skill_tree.yml; achievement rows (361 entries counted, not read); quest_db.yml; map_drops.yml; mob_summon.yml.
- doc/effect_list.md (header read in the audit only); doc/mob_db_mode_list.txt (Ai and mode decoding).
- Binary files: db/GeoIP.dat, db/map_cache.dat, db/re/map_cache.dat.
- Client half and any art, sound or shader data: not in the box.

## Reuse tag
Shape only (GPL). Reuse the condition pattern (HP band, minion count, crowd count) and the tier-in-one-family idea. No values or names copied.

## Brief rule served
Recreate as clearly distinct originals, never a copy. For each idea above, the kept trait is the trigger or the tier shape; the changed trait is the moves, palette, names and visual cues.
