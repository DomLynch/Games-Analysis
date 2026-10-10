# afritz1-OpenTESArena (encounter-templates, EN009)

Donor: /mnt/frankendom-donors/afritz1-OpenTESArena (VPS, read-only). Open-source engine for The Elder Scrolls: Arena (MIT code). Depth: full for the encounter path (when a roll happens, what the roll picks, where the group appears, how a guard response and a camp behave). Half read: engine code under OpenTESArena/src. Data half: NOT in the box. The encounter chances, the encounter table and the table indices are read from the user's own Arena executable; data/exe/aExeStrings.txt only holds their offsets (lines 128 to 130). Paired donor for this topic in this batch: daggerfall-unity (EN009's other note). They are two games, not two halves of one.

## 1. What the player sees and feels

Walking a road, nothing happens for long stretches. At the top of each in-game hour a roll decides whether a group comes. When it hits, the group appears a few tiles from you, close enough that the first sight is them in your face, not at the edge of the view. Camping runs the clock 600 times faster: each in-game hour is a roll, so an eight-hour rest plays out in about four real seconds, and a message interrupts the rest the moment enemies are near. In town after a crime, guards arrive within a few tiles, and the first one to arrive plays one of two guard sounds (halt for violence, stop-thief for theft). In a dungeon the roll is checked every in-game minute, so the walk is a steady low risk that pauses while an enemy is already nearby.

## 2. Why it works, is striking, and could be ours

- Readable at 375 wide: spawns are close, so the group does not need a telegraph to be seen. The sprites are not in the box (not read), so the silhouette cannot be checked here.
- One signature behaviour: the encounter is a small record of count, id and level (RandomEncounters-style, see section 3), and the level is always near the player. A group is a tiered threat, not a random mob.
- One signature cue: the camp interruption message and the first-arrival guard sound. The sound names are read; the audio files are not.
- Could be made ours at 20 to 30 percent resemblance: yes. The triangular level pick, the record of count and level, the "nothing else near" gate and the camp-as-fast-forward are shapes, not art or numbers.

## 3. The rule behind it

Rule A, when a roll happens (GameState.cpp 1259 to 1321, ArenaEntityUtils.cpp 1002 to 1040).
- Outdoors (wilderness): one roll per in-game hour (ArenaEntityUtils.cpp line 1030). Not per minute (line 1015).
- Town: one roll per in-game minute, only at night and only when no citizens are near (line 1015 and GameState.cpp 1302).
- Dungeons (non-town): one roll per in-game minute, but not while camping (line 1015). Interiors roll per minute even while camping (same line). Camping adds the hour roll (line 1035).
- A raised platform blocks rolls (line 1005). Nothing rolls while an enemy is already near (GameState.cpp 1305).
- The chance is a percent from the exe table (line 1054; values not in the box). A building trespass uses a fixed 20 (line 1074). Night on two holiday days (dayOfYear 243 and 283) uses 25 (line 1157). A table index of 13 or more means no encounter (line 1145). The roll is `encounterChance > next(100)` (GameState.cpp line 1316).

Rule B, the level and the record (ArenaEntityUtils.cpp 1175 to 1225).
- Working level = min(player level + 1, 20) plus next(4), i.e. plus 0 to 3 (lines 1179 and 1180).
- A folded dice roll: a bounded draw up to 2L (line 1166), with values above L folded back to [0, L] (lines 1167 to 1169). The result peaks at L and thins toward 0.
- Accept if the roll is at least L/2 (line 1185). If not, set L to (L shifted right once, then doubled) (line 1191) and retry. Net effect (my reading; the code gives no comment): the level is drawn from the top half of [0, L] with the peak at L. The trim step only changes odd levels.
- New game (level 0): level capped at 0 to 2 (line 1194). Main quest encounters: floored at the player level minus 0 to 2 (lines 1199 to 1201).
- A level maps to exactly two groups (line 1217, DebugAssert count == 2). One is picked by a coin (line 1218). A group is a record: count, id, level (line 1225).

Rule C, where the group lands (ArenaEntityUtils.cpp 1231 to 1277; GameState.cpp 874 to 905).
- One location per member. Offset = a signed 16-bit draw shifted right by 6, so about -512 to 511 Arena units (lines 1241 and 1243). Divided by 128 units per voxel (GameState.cpp; MIFUtils.h line 23), that is about -4 to +3 voxels on each axis.
- The search rejects only the player's own tile (line 1254). The occupancy and floor checks are commented out (lines 1257 to 1265).
- Up to 40 tries per radius (line 1239); the radius doubles on expansion (line 1276).
- Back in spawnEncounterEnemies, a member on a bad voxel is skipped with `continue` (GameState.cpp 895 onward), so a group can arrive smaller than its count.
- Guard response: 1 to 3 guards (ArenaEntityUtils.cpp line 959). The first guard to arrive plays Halt for violence or StopThief otherwise (GameState.cpp 934 and 937).

Rule D, camping (GameState.cpp 1240 to 1330; ArenaClockUtils.h lines 8 and 12).
- Clock: 86400 game seconds per 6646.15 real seconds, which is 13.0 game seconds per real second (ArenaClockUtils.h line 8). Camping multiplies that by 600 (line 12; GameState.cpp 1246).
- So one in-game hour takes about 277 real seconds normally, and about 0.46 real seconds while camping.
- When enemies are near after a rest, a popup shows and the camp is cleared (GameState.cpp 1324 to 1327).

Expected rates (computed from the code, real time, default clock; not measured):
- Outdoors: 13 hour rolls per real hour. The chance is the unknown exe value, so no density number.
- Dungeon, not camping: 780 minute rolls per real hour (13 game seconds per real second, 60 game seconds per minute).
- Camping: eight hours of rest is eight rolls in about 3.7 real seconds.
- Ambient citizens (read in part): up to 30 per chunk (CitizenUtils.h line 34; EntityChunkManager.cpp line 1218), placed 16 to 24 voxels from the player (ArenaCitizenUtils.h lines 14 and 15).

## 4. For Frankendom

Shape of a template: a zone row with a record (member count capped at 3, MAX_ATTACKERS; a family from the 12 families or a Pit character; a level), a level pick (rule B), a gate (no encounter while one is near), and a camp state (rule D). Ownership: cadence, caps and despawn are parity row 23 (zone population, origins/server/world-spawns.ts). Group aggro and target choice are row 4 (fight loop) in src/fight/ (new module encounter-template.ts, calling the existing hate list). Cadence runs on the server tick (row 18: server tick: fixed step, input intake, per-tick NPC budget). The client only shows the arrival.

Keep: the record of count, id and level; the level pick around the player; the "nothing near" gate, which maps to one encounter at a time in the ledger; the camp that fast-forwards and is interrupted by a message; the guard response as a capped group.

Change:
- Donor tables live in the user's exe. Ours are zone data, with numbers we set.
- Donor cadence is game time per in-game hour (about 4.6 real minutes outdoors). Ours must be real time, tuned to about one encounter per 20 seconds of walking, so set the roll in real seconds.
- Donor placement uses a ring of about 4 voxels. Ours should be far enough to read as coming, not on top of Dom. Use a minimum distance and an out-of-view start (see the daggerfall-unity note).
- Donor drops a member that lands on a bad tile. Ours: retry inside the 40 tries, then drop with a log.
- Donor terrain is hard-coded to 0 (GameState.cpp line 1311). Ours: pass the real terrain per tile.

## 5. A 5-minute look test Dom can judge on his phone

One scene flag, no release rows. Three presets, one minute of walking each:
- A: the Arena-style ring of about 4 units (close spawn).
- B: a ring of 8 to 16 units out of the view cone.
- C: a 1-to-3 record from the level fold, against a fixed 3.
Dom judges: is a close spawn startling or cheap; does the camp fast-forward read as rest (show the hour counter), and does the interrupt land; how many encounters a minute of walking at each preset. Target: src/fight/encounter-template.ts (row 4).

## 6. Licence and content status

Code: MIT. LICENSE.txt line 1 "The MIT License (MIT)"; line 3 "Copyright (c) 2016-2026 The OpenTESArena Developers". The README (line 9) says no game assets are distributed. The encounter chances, tables and offsets are the user's own game data, not in the repo; the exe-string file lists offsets only. MIT code can be adapted with the notice kept, so the level fold, the record shape and the camp clock are adaptable code shapes. No data is copied (none in the box). Our numbers and names are our own. No legal conclusion.

## 7. Gaps

Not read: ArenaEntityUtils.cpp lines 1 to 1000 (guard types and armour, citizens, interior trespass helpers); ArenaInteriorUtils (isPlayerTrespassing); EntityChunkManager citizen loop beyond the cap; snapToTileCenter; the camping start and stop code; the popup and dialogue text (not quoted); sound and animation assets; death and respawn; loot. Half read: engine code. Data half: not in the box (the user's Arena exe). Server half: not applicable (single-player client).

Defects (keep the idea, fix the defect):
- D1, terrain hard-coded: GameState.cpp line 1311 (`const int terrainType = 0;`). Fix: pass the tile's terrain; the index logic already exists (ArenaEntityUtils.cpp line 1106).
- D2, occupancy and floor checks commented out in the spawn search (ArenaEntityUtils.cpp lines 1257 to 1265). Fix: restore the floor check inside the 40-try loop, so a bad tile retries instead of being dropped.
- D3, members on a bad voxel are dropped silently (GameState.cpp line 895, `continue`). Fix: retry, and return the spawned count to the UI (actualSpawnCount is already returned).
- D4, the trim step `(encounterLevel >> 1) * 2` (line 1191) is not a halving and has no comment. Fix: decide the intent. If halving was meant, use L / 2 and re-test; if parity was meant, say so in a comment and test it.
