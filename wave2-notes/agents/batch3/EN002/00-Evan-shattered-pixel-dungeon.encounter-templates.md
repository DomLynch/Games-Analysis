# 00-Evan-shattered-pixel-dungeon: encounter-templates (EN002)

Depth: full. Half read: game logic (server-side in the sense of the game-rules half): levels, mob spawning, mob AI state rules, vault rooms, boss-level mob creation. The client half (sprites, UI, render code) and the messages data pack were not read.
Donor root (VPS, read-only): /mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/
Java base: core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/
Asset audit and zone catalogue used first: AU001 (/private/tmp/p2/wave2-haiku/batch3/AU001/00-Evan-shattered-pixel-dungeon.assets.md) and DC001 (/private/tmp/p2/wave2-haiku/batch3/DC001/00-Evan-shattered-pixel-dungeon.catalogue.md). Zones per DC001 section 5 (sewers 1-4, prison 6-9, caves 11-14, city 16-19, halls 21-24, boss depths 5, 10, 15, 20, 25).
Licence: code GPL v3 (LICENSE.txt). No asset licence file in the repo; art and music credited by name in AboutScene.java (AU001).

## 1. What the player sees and feels
On a level the room you enter is quiet. Nothing is close to the door: no enemy is in view of the arrival point and none is within eight steps of it. Then, as you walk, a single wanderer comes round a corner on a loop, turning at the same four corners every pass in a vault. On a 375-wide phone the threat shows as one or two sprites at a time, with the room's shape doing the work. In a boss arena there is no more coming: once the boss is down the level stops refilling.

## 2. Why it works or is striking
- Readable at 375 wide: spacing is the signal. The arrival room is empty by rule, so the first sprite you see is a decision point, not a surprise.
- One signature behaviour: vault wanderers patrol a fixed four-corner loop and can be detected only inside a facing cone (see section 3E). A player can read the loop and plan around it.
- Signature sound or effect: not read here (sounds/ and music/ not opened, AU001).
- Could be made ours at 20-30 percent resemblance: a four-corner patrol loop in a room, and a level that holds a fixed count of foes with a one-in-four pair rule. Keep the rule; change the room layouts, names and sprites.

## 3. The rule behind it
### A. How many foes a level holds
- RegularLevel.createMobs (RegularLevel.java line 220 onward): depth 1 gets 8 preset mobs (line 222); every other depth gets mobLimit().
- mobLimit (RegularLevel.java line 206 onward): depth 1 is 0 unless the amulet is held (10); deeper, mobs = 3 + (depth mod 5) + Random(0..2) (line 212). A LARGE feeling multiplies by 1.33 and rounds up. MiningLevel subtracts one.
- So the count cycles with depth: at depth 2 it is 5 to 7; at depth 5 it is 3 to 5; at depth 4 it is 7 to 9.

Data fields: level.mob_base (units, donor 3, GPL code constant, donor value null by rule); level.depth_cycle_mod (5); level.random_extra (0-2); level.large_feeling_multiplier (1.33); level.mining_offset (-1); level.depth1_preset (8).

### B. Where they stand
- Rooms: only StandardRoom instances take foes. Each standard room is added to a pool once per mobSpawnWeight: size NORMAL 1, LARGE 2, GIANT 3 (StandardRoom.java lines 38-40), and the arrival room gets weight 1 (StandardRoom.java around line 107).
- Exclusion: no foe within the arrival room's field of view at 8 tiles (RegularLevel.java line 238, ShadowCaster.castShadow with 8), and none within an 8-step walk of the entrance (RegularLevel.java line 252, buildDistanceMap with 8).
- Pairs: a second mob goes into the same room with chance 1 in 4, on depth 2 and deeper (RegularLevel.java line 283), if the count allows.
- Cells: a foe cannot stand on a trap, a plant, the exit, or on a large mob in a non-open cell.

Data fields: room.size_weight_normal 1, room.size_weight_large 2, room.size_weight_giant 3 (unitless; donor null); placement.entry_fov_radius 8 (tiles); placement.entry_walk_radius 8 (steps); placement.pair_chance 0.25 (probability).

### C. The rotation (the deck of foes per depth)
- MobSpawner.standardMobRotation (MobSpawner.java line 71 onward): a hand-written list per depth band, each comment giving the mix, for example depth 1 is three rats and a snake (4 entries); depth 2 is two rats, a snake and two gnolls (5); depth 3 is seven entries with three gnolls and a crab; depth 4 and 5 are six entries; depth 6 five; depth 7 six; depth 8 eight; depths 9 and 10 eight; caves depth 11 five and depth 12 six.
- getMobRotation adds rare mobs, swaps alternates, shuffles. Level.createMob takes the first entry and, when the list runs out, regenerates it (Level.java lines 537-541).
- Frankendom reading: a rotation is an ordered deck of families, which is exactly the "100 Pit characters reused across zones" shape. The deck gives variety without a per-zone roster.

### D. Respawn (a wandering trickle)
- MobSpawner is an actor. Each act: if mobCount() is below mobLimit(), it calls spawnMob(12) (MobSpawner.java lines 41-43); otherwise it waits the respawn cooldown.
- spawnMob(disLimit) (Level.java line 770 onward) makes a new mob, sets it to WANDERING unless it is passive (line 775), tries up to 30 cells whose path distance from the hero is at least 12 (line 783), and adds it only if the hero is alive.
- Cooldown: TIME_TO_RESPAWN = 50 (Level.java line 149) by default; DARK feeling uses two-thirds of that; the amulet branch scales the cooldown with the current mob count, clamped between 5 and 25 (Level.java around lines 752-766).
- So a level refills from the far side only, one at a time, and only up to its count.

Data fields: respawn.cooldown_base (time units, donor 50, donor value null); respawn.min_path_distance (tiles, donor 12); respawn.dark_cooldown_fraction (2/3); respawn.clamp_min 5, respawn.clamp_max 25 (amulet branch, time units).

### E. How foes notice you (the detection rule)
- Sleeping (classic): chance 1 in (distance + stealth) per turn (Mob.java line 1282 and the same formula line 1615).
- Wandering (classic): chance 1 in (distance / 2 + stealth) (Mob.java line 1320).
- Investigating: the first turn of investigating is reduced by 0.33 (Mob.java around lines 1585-1590).
- Stealth-gameplay wandering (vault rooms only): a moving enemy has a 75-degree cone (half-angle 37.5, Mob.java line 1621) within 6 tiles that uses the wandering chance (line 1622); a 150-degree cone (half-angle 75) that uses the sleeping chance; outside that, 1 in (distance + stealth) cubed, zeroed below 0.1 (StealthGameplayWandering.detectionChance, Mob.java lines 1612-1630).
- The v4 changelog text calls this "wandering enemies patrol pre-set routes" (ui/changelist/v4_X_Changes.java line 234).

Data fields: detect.sleep_divisor 1 (unitless); detect.wander_divisor 2; detect.cone_close_halfdeg 37.5 (degrees); detect.cone_far_halfdeg 75 (degrees); detect.cone_close_tiles 6 (tiles); detect.cube_cut 0.1 (probability); detect.investigate_first_turn_penalty 0.33 (probability).

### F. Vault patrol loops (the patrol shape)
- VaultRingRoom.java: four waypoints at the room's corners, inset two cells. A coin flip picks clockwise or counter-clockwise (the two arrays around lines 73-90), the enemy starts at Random(0..3) (line 89), gets the wander positions (line 91), and is set to WANDERING.
- Seven call sites across six vault rooms (VaultRingRoom line 91, VaultLongRingsRoom line 65, VaultTokensRoom line 155, VaultHallwayRoom lines 113 and 117, VaultRingsRoom line 97, VaultEnemyCenterRoom line 103).
- Eight vault mob classes turn stealth gameplay on: VaultGolem, VaultElemental, VaultDM200, VaultSkeleton, VaultShaman, VaultRat, VaultGhoul, VaultDM100 (activateSteathGameplayBehaviour calls; VaultElemental calls it three times).

### G. Boss arenas (the lair shape)
- SewerBossLevel.createMobs and addRespawner return null (SewerBossLevel.java lines 133-137). City, Halls and Last levels are the same shape (addRespawner null, createMobs empty).
- PrisonBossLevel creates Tengu held off-level (PrisonBossLevel.java line 598 onward); the boss is not part of the walk.
- CavesBossLevel.createMobs places Pylon objects at pylonPositions (CavesBossLevel.java lines 208-214). Its respawner was not read.
- So a boss arena has no refill. The lair is a one-time fight in a fixed arena.

### H. Shapes not found
- ambush: no ambush code or word in core/src/main/java (case-insensitive grep). The nearest is the detection cone and the stealth loop above.
- camp: no camp structure in code (grep for camp returned only the changelog line). The nearest is the per-depth rotation deck, which is a mix, not a place.
- escort: no escort code (grep returned only the changelog line). DirectableAlly and RatKing exist as allies; not read as an encounter.

## 4. For Frankendom
Map to our shape (700 zones as data, 100 Pit characters reused across zones, many-vs-one with at most 3 attackers, server-verified events driving client presentation):
- Keep the arrival rule: zero foes within view and eight steps of the arrival. It makes phone duels start clean, and it is cheap to check on the server.
- Keep the count as a formula per zone (base + depth term + random extra), and the one-in-four pair rule, so a room can hold two on purpose.
- Keep the deck (rotation) of families per zone band. It is how 100 characters become 700 zones of variety.
- Keep the respawn-from-far-side rule with a minimum distance and a cooldown, server-rolled.
- Keep the boss-arena rule: no refill after the boss. Our lair templates carry no respawn.
- Change: SPD's count is 3 to 9 per level in a single-player game; ours caps attackers at 3 on screen at once, so the formula feeds a reserve queue, not a crowd.
- Change: the detection formula is a client-side feel rule in the donor; ours is server-computed and the client shows the cone from the server state.
- Patrol loops: our patrol template is a four-waypoint loop in a room (corners inset), with a facing cone the server decides and the client draws.

## 5. A 5-minute look test Dom can judge on his phone
Build a static flag on the existing scene (no release rows, no lock; look-test skill). Two short comparisons on one 375-wide screen:
1. Arrival check: a room with the arrival marked; show two layouts, one with a foe inside eight steps and one with none. Dom judges whether the clean arrival reads as fair.
2. Patrol loop: one four-corner loop with a visible facing cone, with the cone at 75 degrees and at 150 degrees. Dom judges which cone he can plan around and whether the loop reads in one pass.
Optional third: a boss arena screen with no refill marker, to judge whether "one fight, no respawn" is clear without text.

## 6. Licence and IP
- Code: GPL v3 (LICENSE.txt line 1-2; source headers say "either version 3 of the License"). Numbers in the code are code constants, so donor values are null by our rule.
- Assets: no asset licence file in the repo (AU001). Art and music credited to named individuals in AboutScene.java; freesound samples listed as CC-BY or CC0 (per-file mapping not checked).
- Inspiration stays category-level: "a four-corner patrol loop in a room", "a fixed count per level with a one-in-four pair", "one fight, no refill at the boss". No copied code, text, names or sprites.
- Recreate as a clearly distinct original: keep the rule, change the names, layouts, palette and the numbers. No legal conclusion.

## 7. Gaps
- Half read: game logic only. Sprites, UI, render code, the messages/*.properties data pack (207 files), and sounds/ and music/ not read (AU001 "Not read").
- Not read: levels/traps and levels/features (hazards), levels/painters beyond names, most level room types beyond the vault set, the Caves boss respawner, MiningLevel.createMobs beyond the mobLimit offset, the final-boss phase logic (only the HP floors are in DC001), the amulet branch of respawnCooldown in full.
- Tengu and other boss AI bodies not read.
- Counts: about 71 mob class files in actors/mobs (includes base and helper classes, DC001 counts this as an upper bound); 16 NPC files; 8 vault mob classes with stealth activation; 7 call sites in 6 vault rooms.
