# 00-Evan-shattered-pixel-dungeon (procgen-grammars, cell PR002)

Donor/Licence: 00-Evan-shattered-pixel-dungeon. LICENSE.txt is GNU GPL v3; source headers say GPL v3 (Evan Debenham, 2014-2026). Copyleft: clean-room, shape only. No code, names or tables copied.
Root (VPS): /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon. Paths below are relative to core/src/main/java/com/shatteredpixel/shatteredpixeldungeon (called SPD below) unless marked.
Checked: read SPD/levels/RegularLevel.java 95-318 and 377-380 (build loop, initRooms, mob placement), SPD/levels/rooms/standard/StandardRoom.java (size categories, weight table, room picker), SPD/levels/rooms/secret/SecretRoom.java 1-120 (secret budget and queue), SPD/levels/rooms/special/SpecialRoom.java 80-190 (special queue), SPD/levels/painters/RegularPainter.java 355-400 (water and grass patches), SPD/levels/Patch.java (whole file), SPD/actors/mobs/MobSpawner.java 60-276 (rotation, rare adds, alt swaps), SPD/actors/buffs/ChampionEnemy.java 90-120, SPD/Dungeon.java 290-360 and 430-445 (depth to level class), SPD/levels/Level.java 530-545, and SPD-classes/src/main/java/com/watabou/utils/Random.java 175-195 (weighted pick). Confidence high on order of operations (read line by line). Medium on the rest of the painters (not read).

Half read: client. The whole generator runs in the game client; this donor has no separate server half and no data pack (tables are Java). No paired donor needed.

Counts (by reading and grep): 35 entries in the standard room list (the list includes one class twice); 12 secret room classes; 19 special room classes (9 equip, 10 consumable, plus one lab and one pit room that are added in code); 34 trap classes (not read).

## 1. What the player sees and feels
Each floor is one loop or a figure-eight of rooms, sized normal, large or giant (4-10, 10-14 or 14-18 tiles across). On a 375-wide screen you see one room at a time, and most rooms have one signature feature you can name from the doorway: a chasm bridge, a ring of books, a pool, a line of statues. Enemies come as a shuffled set of families per floor. Depth 1 is rats and a snake, depth 2 adds gnolls, and so on. Now and then a rare variant appears. Only in the optional Champion Enemies challenge mode, some enemies carry a champion modifier (six kinds, for example fire, projectile, giant or growing), which marks them out before they reach you; in a normal run none do. The first room is a breath: no enemy stands within eight walk steps of the entrance. (Inference from code. Not played.)

## 2. Why it works / is striking
- Readable silhouette: one feature per room, sized by a budget, so a room reads as one shape at 375 wide.
- One signature behaviour: a counted rotation per floor, so the player can learn the order (rats, then gnolls, then crabs and slimes).
- One signature sound or effect: not read (outside the procgen topic).
- Could be made ours at 20-30 percent resemblance: yes. A counted family list per zone, a champion-style modifier, and a safe ring at zone entry.

## 3. The rule behind it (grammar)
(a) Budget fill. Standard rooms are generated until a count budget is used. A large room costs 2 slots and a giant room costs 3 (via setSizeCat and the room's roomValue, StandardRoom.java 38-40 and 114; RegularLevel.java 138-139 reads it). Bigger rooms get more connections (sizeFactor squared, StandardRoom.java 114) and more mobs (sizeFactor, weight).
(b) Depth-banded weight table. A row of 35 weights per depth picks the room class (StandardRoom.java 191; rows at 171 and 174). Each band of five room types is weighted up at its depths, and a trailing group of ten filler types gets weight 1 or 0 per depth. Depth 5 turns all filler off (StandardRoom.java 174).
(c) Mob count per floor. 3 + depth mod 5 + a random 0-2, times 1.33 on large floors (RegularLevel.java 212). Depth 1 places 8 preset mobs (RegularLevel.java 222), but its mobLimit is 0 until the amulet is obtained (207-209). The LARGE feeling also multiplies the standard room count by 1.5 (RegularLevel.java 131-133).
(d) Rotation. getMobRotation takes counted slots per depth (for example 3 rats and 1 snake on depth 1), adds a rare mob with a 2.5 percent roll on four depths, swaps some slots for their rare alt (1 in 50 per slot, scaled by a multiplier), then shuffles (MobSpawner.java 63-66, 223, 245).
(e) Placement. A mob cell must be outside the entrance field of view and at least 8 walk steps away (RegularLevel.java 252). Each mob gets 30 tries (loop from line 255). From depth 2, a second mob joins the same room with a 1 in 4 roll (line 283).
(f) Variety queue. Secret and special rooms come from a per-run shuffled queue. The pick is weighted 6:3:1 (front, next, one after), and the chosen room moves to the back (SecretRoom.java 93, 98; SpecialRoom.java 177). Specials start with a consumable and then alternate equip and consumable (SpecialRoom.java 121, 125).
(g) Secret budget per five-floor band. A base of 2 to 3 per band, with a fraction rolled for one extra (SecretRoom.java 47). Each floor takes its share of what is left, with probabilistic rounding (SecretRoom.java 72).
(h) Champion roll with constant RNG calls (applied only when the Champion Enemies challenge is on, ChampionEnemy.java 109). The roll always consumes the same random calls, so the number of champions does not change the level's RNG (ChampionEnemy.java 97, 100). Some enemy types are blocked from champion status on early depths (ChampionEnemy.java 112).
(i) Patch generator. Seeded random fill, then clustering passes (majority filter), then an optional forced fill rate (Patch.java 42). Used for water (RegularPainter.java 367) and grass.
(j) Depth to class. Depths map to level classes by band, and every fifth depth is a boss (Dungeon.java 442; boss at 25 is HallsBossLevel, line 348; depth 26 is LastLevel, line 351).

Data fields (designer-tunable; donor values not copied, licence is GPL):
- rooms_budget_per_floor | slots | null
- room_size_slots (normal, large, giant) | slots | null
- mob_count_base, mob_count_depth_mod, mob_count_jitter, large_floor_mult | count, count, count, multiplier | null
- first_floor_preset_mobs | count | null
- safe_radius_steps | walk steps | null
- second_mob_one_in_N | 1 in N | null
- rare_add_chance | probability per listed depth | null
- alt_swap_chance_per_slot | probability per slot | null
- champion_blocked_until_depth (per modifier) | depth | null
- variety_queue_weights | front:next:after | null
- secret_budget_per_band (base and fraction) | count | null
- patch_fill, patch_clustering_passes | probability, count | null

## 4. For Frankendom
- 700 zones as data: a zone's budget (rooms or encounter slots) and its family list become zone-data fields. A zone tier plays the role of the depth band.
- 100 Pit characters reused across zones: a counted family rotation per zone picks from the 100. The alt swap (1 in N per slot) is the recolour-tier idea. Keep the swap, change the look.
- Many-vs-one, MAX_ATTACKERS = 3: the rotation is shuffled, but the donor does not cap how many engage at once. We cap engaged attackers at 3 in the engine (not in this rule).
- Safe ring: an 8-step no-spawn radius at zone entry and respawn. This belongs to zone population (row 23: spawn caps, respawn, despawn with grace; origins/server/world-spawns.ts). Row 17 covers the death and respawn side.
- Server-verified: the rotation and the champion roll come from the zone seed on the server. The constant-call rule (h) keeps replay identical.
- Keep: budget fill, counted rotation, weighted front-biased queue, safe radius, constant-call champion roll, the patch generator for zone skins.
- Change: no unbounded retry (defect 1); remove the dead branch (defect 2); cap patch iterations (defect 3).

## 5. Five-minute look test (Dom, on his phone)
Publish six 375-wide stills to the /preview/ folder (no release rows, per the look-test skill), all from one zone seed:
1. One floor with the safe ring drawn around the entrance.
2. A four-slot strip of the family rotation for three depth tiers (early, middle, late).
3. The same enemy with and without a champion modifier, at two frequencies (ours).
Dom judges: can he read each room's one feature from the doorway at 375 wide, and does the first room feel safe?

## 6. Licence and IP
GPL v3 (LICENSE.txt; source headers). Clean-room, shape only.
Kept (idea): budget fill; counted rotation with rare adds and alt swaps; front-biased variety queue; safe radius; constant-call champion roll; patch generator for skins.
Changed: names, families, room classes, every number, art.
No legal conclusions.

## 7. Gaps
- Not read: SPD/levels/traps/ (34 classes), SPD/levels/features/ (5), painters other than RegularPainter (Caves, City, Halls, Mining, Prison, Sewer), the paint code inside the 35 standard room classes (only the list and weights), rooms/quest and rooms/sewerboss, the rest of watabou Random, Level.java feelings, locale and string tables (not read).
- Half read: client. Not in the half I read: nothing; there is no server half in this donor.
- Depth: full for the procgen core, thin for painters.

Defects (keep the idea, fix the defect):
1. RegularLevel.java 255-299 (createMobs): the loop has no bail-out. If all 30 tries fail for a mob, the mob is kept and the loop tries the next room, with no cap. fix: cap total attempts per mob, then skip the mob and log.
2. SecretRoom.java 75: the branch `if (floorsLeft == 0)` can never run, because floorsLeft = 5 - floor (line 72) and floor is 0 to 4. The last floor of each band still takes all that is left through floorsLeft == 1. fix: delete the dead branch; behaviour is unchanged.
3. Patch.java, forced-fill loop: `while (fillDiff != 0)` has no iteration cap. It ends by random probing (length/10 tries per pick), so termination depends on luck. Not reproduced. fix: cap iterations and fall back to a deterministic scan.

Quirk (not a defect): depth 1 returns zero secrets before the band math (SecretRoom.java 67), so the first band spreads its budget over depths 2, 3 and 4 (three floors, floorsLeft 3, 2, 1), not five. Depth 5 starts the next band.

Best transferable idea: a counted, shuffled family rotation per zone, with a rare add and a per-slot alt swap, so the player learns the order and still meets surprises.

Decision: adapt (idea). Defects fixed in the sketch.
Reuse tag: pattern only (budget fill, rotation, queue, safe radius).
Brief rule served: zones as data; many-vs-one (cap 3); server-verified events; one ledger.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Champion modifiers roll only when Dungeon.isChallenged(Challenges.CHAMPION_ENEMIES) (ChampionEnemy.java 109); section 1 presented them as normal play. Confirmed.
- Quirk wording wrong: first secret band has budget over depths 2,3,4 (three floors), not 'four'. Confirmed in secretsForFloor (SecretRoom 66-87).
- Room size cost is via setSizeCat/roomValue (StandardRoom 38-40), not directly RegularLevel 138-139. Citation clarified.
- Missed: LARGE feeling multiplies standard room count by 1.5 (RegularLevel 131-133); depth 1 mobLimit is 0 unless amulet obtained (207-209). Added to rule (c).

Fixed 2026-10-12: champion modifier described as challenge-mode only (section 1, rule h), secret quirk now three floors, rule (c) and (a) additions and citations. No sketch in this note.
