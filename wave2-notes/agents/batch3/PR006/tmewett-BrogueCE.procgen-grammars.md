# tmewett-BrogueCE (procgen-grammars, feel/world-design note)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE` | Licence: GNU AGPL v3 (LICENSE.txt line 1), copyleft: shape only, no code, names or values copied | C | depth: full (level pipeline read end to end) | half read: both (engine generator in src/brogue, data tables in src/variants/GlobalsBrogue.c and src/brogue/Globals.c)

Checked: digDungeon (Architect.c 2877-2981); carveDungeon, attachRooms, designRandomRoom, depth adjust (2274-2480); addLoops (340-399); buildAMachine (984-1731); addMachines and runAutogenerators (1732-1855); cellIsFeatureCandidate (492-530, head only); levelIsDisconnectedWithBlockingMap (3109-3199); validStairLoc and placeStairs (3609-3766); RogueMain level setup (230-290, 670-770); Math.c seeding (184-190); the struct definitions in Rogue.h (1877-1882, 2617-2771); the blueprint, feature, autogenerator and profile tables. Confidence high on order of steps and selection rules, high on the level-seed flow. Not run: nothing was executed; all statements are from reading. Counts are from grep.

## 1. What the player sees/feels

From the generator, not from play: a level is a set of plain rooms (cross, circular, cave, chunky shapes) joined by doors, short corridors and a few loops that give second routes. Lakes of water, chasm or lava sit in the rooms, and the generator refuses any lake that would cut the level in two. Most rooms are empty; some are reward rooms with altars, pedestals or cages, and the way in is guarded by a locked door, a hidden door, a lever, or a trap room whose key lies elsewhere on the level. Stairs sit in wall niches, and a level's entry and exit are kept at least a third of the column count apart.

## 2. Why it works / is striking

- Readable at 375 wide: rooms are simple boxes and circles, and each reward room is a small set of altars or pedestals inside a walled interior, so the silhouette reads.
- One signature behaviour: a reward room is a named blueprint whose interior is chosen by where it fits (a chokepoint of the right size), and whose contents are a list of feature rows. A room that is too big or too small for the blueprint is simply not used.
- Could be made ours at 20-30 percent resemblance: yes. A zone is one blueprint picked by weight for its tier, its features placed by count ranges and personal space, and the result checked for connectivity before it is kept.

## 3. The rule behind it

Level order (digDungeon, Architect.c 2877-2963): clear, carve rooms (weighted room types; each new room slides across the grid in shuffled order until a wall matches, up to 35 attempts), add loops (a door is added between two floor cells only if the walking distance between them is longer than 20), lakes, non-machine autogenerators, diagonal cleanup, machines, machine autogenerators, lake boundary cleanup, bridges, doors and walls.

Machine build (buildAMachine, 984-1731):
1. Pick a blueprint by frequency from those whose depth range and flags qualify (1061).
2. Pick the interior. Room blueprints take a chokepoint gate whose enclosed size fits the blueprint's size range (1084-1087). Area blueprints grow a blob by path-distance rings from a random floor origin until a random target size is met (1174-1181).
3. If the blueprint says treat-as-blocking or require-blocking, check that the interior does or does not cut connectivity (1197, validator at 3137-3199). Failure retries up to 10 times.
4. Snapshot the level (1221). Then build features in list order. Alternative groups build exactly one random member of each group (1291-1324).
5. Per feature: instance count is a uniform draw in its range (1393). Candidates are interior cells that are unoccupied and inside a near-origin or far-origin band, where the band edges are the 25th and 75th percentile of distance from the origin (1271); a candidate is picked uniformly (1413). After each placement, a square of personal space is cleared so later features cannot sit too close.
6. If a non-repeat feature places fewer than its minimum, restore the snapshot and delete all spawned items and monsters (1675). A repeat feature keeps placing while it still places at least its minimum (1670).
7. Vestibules (door guards) and adopted keys are sub-machines, built recursively with 10 tries each.

Data fields (designer-tunable; donor values withheld because the donor is copyleft):

| name | unit | donor value | where |
|---|---|---|---|
| blueprint.depthMin / depthMax | depth | withheld | zone data |
| blueprint.roomSizeMin / roomSizeMax | cells | withheld | zone data |
| blueprint.frequency | weight | withheld | zone data |
| blueprint.flags | bitmask | n/a | engine constant |
| feature.instanceCountMin / instanceCountMax | count | withheld | zone data |
| feature.minimumInstances | count | withheld | zone data (must be 1 or more for repeat rows, see defects) |
| feature.personalSpace | cells | withheld | zone data |
| feature.band (near origin / far from origin) | ratio (25th / 75th percentile) | n/a | engine constant |
| autogen.minDepth / maxDepth | depth | withheld | zone data |
| autogen.intercept and slope (count per depth, integer division) | count | withheld | zone data |
| autogen.frequency (extra instance chance) and maxNumber | percent, count | withheld | zone data |
| profile.roomWeights (8 room types) and corridorChance | weight, percent | withheld | zone data |
| loop minimum path distance | cells | withheld | zone data |
| reward pacing: suppression multiplier, offset, increase factor | count per depth | withheld | engine constant per variant |
| stair anchor minimum distance from entry | cells | withheld | engine constant |

Reward pacing (1759-1765): the number of reward rooms a level must try to build is a deficit against a depth curve, computed from rewards already built plus rewards planned on this level. A failed build is not lost; the deficit carries to the next level. A random tail adds extra rooms with a geometric chance.

Seeds (RogueMain.c 255-281, 670-770; Math.c 184-190): a game seed fills one seed per level at start (64-bit if the game seed is 64-bit; legacy path otherwise). Stair anchors are drawn at start: each level's down anchor is redrawn until it is at least DCOLS / 3 away (distanceBetween) from its up anchor (277-279), and the next level's up anchor is the same point (281). The real stairs are then placed at the nearest valid niche to each anchor (3712). A level is generated only when first entered (674), seeded from its own level seed (685), and the game RNG is restored afterwards (768). Two RNG streams are seeded identically (cosmetic and substantive, 189); the design intent is that cosmetic effects use their own stream. I did not check every call site to confirm that.

## 4. For Frankendom

- Maps to: zones as data. A zone row = blueprint id + tier + seed. 700 zones = blueprints picked by weight within each tier. The 100 Pit characters are not involved; this is terrain and placement.
- Keep: blueprint rows with count ranges and personal space; the chokepoint-sized interior; the connectivity validator before a zone is kept; the restore-on-failure snapshot; alternative groups; the per-level seed drawn once and stored.
- Keep (pacing, feeds row 23 and row 18): "one reward vault per N zones per tier, deficit carried forward" as a target count in zone data. Row 23 owns zone population; row 18 owns loot rolls. The reward vault itself is a blueprint.
- Change (donor defects, keep the idea, fix as noted):
  - Gate candidates stop at 50 in scan order (Architect.c 1084), so the chosen room is biased to the west side of the map. Fix: collect every candidate, then pick uniformly (reservoir sample is fine).
  - Area blobs fill each distance ring column by column after a shuffle (1174-1181), so one shuffled column is taken first. Fix: shuffle the whole ring list before taking cells.
  - A repeat feature with minimum 0 never ends (1670): the loop repeats while the last pass placed at least its minimum, and "0 or more" is always true, so it cannot stop. Every repeat row in the donor has minimum 1, by convention only (GlobalsBrogue.c repeat rows). Fix: the loader rejects repeat rows with minimum below 1. (Read from the code; not run.)
  - zoneSizes is a fixed array of 200 with no bound check (3139). Fix: sized list, or fail the build past a limit.
  - The retry counter `failsafe` is reused as an item re-roll counter (1505). Harmless today because the outer loop has finished, but a refactor could break it. Fix: separate counter.
  - Tables are C initialisers; a new row needs a rebuild. Fix: move rows to a JSON table checked against a schema at build time.
- Core slice this week: an offline zone builder that takes blueprint rows and a seed and emits a zone row plus a connectivity report. It feeds zone data and row 23 (zone population) through the target count, not the live server.

Decision (proposed): adapt. Keep the blueprint-row shape, count ranges, personal space, validators and rollback; fix the five defects above before any use.
Acceptance: a build test generates 50 zones from stored seeds; every walkable cell is reachable from the entry; every feature meets its minimum; rebuilding a stored seed gives identical output; a repeat row with minimum 0 is rejected at load.

## 5. Look test (Dom, 5 minutes, phone)

Print six zones from one blueprint set, six seeds, top-down at 375 px wide, with the entry marked. Dom picks the two that read as a place (a room with a vault, a loop) and says which one looks like a maze. Then one hand-made zone next to them. Pass: all six are fully connected (the report says so), each reward room has its minimum feature count, and the picks rebuild identically from their stored seeds.

## 6. Licence / IP

GNU AGPL v3 (LICENSE.txt line 1). Copyleft and network-facing: clean-room, shape only. The rules above are written in our words. No blueprint names, lore or table values are copied; data fields carry donor value null. Names used in this note are the donor's identifiers, cited for checking only.

## 7. Gaps

- Not read: SeedCatalog.c; designLakes, fillLakes (2638-2732); buildABridge (2786-2876); redesignInterior, fillInteriorForVestibuleMachine, prepareInteriorWithMachineFlags (674-983, read by name only); spawnDungeonFeature (3364-3505); analyzeMap choke-map body (192-339); designCross and attachHallwayTo bodies (2023-2063, 2205-2343); cellIsFeatureCandidate after line 530.
- Not compared: the Rapid and Bullet variant tables (src/variants/GlobalsRapidBrogue.c, GlobalsBulletBrogue.c), except that the repeat rows appear in them too.
- Half read: both. The client half (rendering of the level) is not relevant to procgen and was not read.
- No git history in the box. History below is from CHANGELOG.md and code comments.

## As-data shape

- Table: `src/variants/GlobalsBrogue.c` `blueprintCatalog_Brogue`, lines 173-621. 71 named blueprints (grep count), 285 feature rows (grep count of rows indented under them).
- Blueprint row fields: name (string); depthRange (min, max); roomSize (min, max); frequency (int); featureCount (int); dungeonProfileType (enum); flags (bitmask); feature[20].
- Feature row fields: featureDF (enum); terrain (enum); layer (enum); instanceCountRange (min, max); minimumInstanceCount (int); itemCategory (enum or -1); itemKind (int or -1); monsterID (int); personalSpace (int); hordeFlags (bitmask); itemFlags (bitmask); flags (MF_ bitmask). Struct at `src/brogue/Rogue.h` 2617-2636 and 2656-2665.
- Autogenerator table: `src/variants/GlobalsBrogue.c` lines 111-171, 49 rows: terrain, layer, DF, machine, required foundation, required liquid, minDepth, maxDepth, frequency, minNumberIntercept, minNumberSlope, maxNumber. Struct at Rogue.h 2753-2771.
- Profile table: `src/brogue/Globals.c` 934-951, 4 rows: 8 room-type weights plus corridorChance.
- A new blueprint is one row: yes, from existing enums and flags (it is a row in a C table, so it needs a rebuild today). A new feature kind (new DF, terrain, MF or BP flag) is code, not a row.

## Provenance per claim

Repo: tmewett-BrogueCE (folder above). Licence: AGPL v3. Each claim has a receipt in `receipts.tsv` (note = tmewett-BrogueCE), verified with the gate verifier. Key lines: Architect.c 2877 (pipeline), 377 (loop rule), 1061 (raffle), 1084 (gate cap), 1174-1181 (ring fill), 1393 and 1413 (instance and pick), 1670 and 1675 (repeat and minimum), 1759-1764 (pacing), 3139 (zone array), 3712 (stair snap); RogueMain.c 261-281 (seeds and anchors), 674-685 (first-visit generation); Math.c 189 (two RNG streams).

## What they patched later

- 64-bit seeds introduced (CHANGELOG.md 366); load of a 64-bit seed was out of sync and fixed (290).
- ARM generation made identical to x86 (388): a determinism lesson for us.
- Machine events fired twice (385); rare crashes in machine generation (550); falling items kept out of reward rooms (164); doors generated adjacent (390); key pedestal flammability (633).
- Code comments still show the seams: the hack note on the ring fill (1188) and the reused failsafe counter (1505).

## Rulings for Dom

1. Build zones offline from blueprint rows and a stored seed, and commit the output rows? Recommend yes; the live server only reads rows.
2. Should the connectivity, minimum-count and entry-anchor checks block a generated zone batch in CI? Recommend yes.
3. Should the reward-pacing rule (one vault per N zones per tier, deficit carried) become a target count in zone data for row 23? Recommend yes, decided after the first ten zones are looked at.

## Reuse tag

Reuse tag: adapt (AGPL, shape only; fix the five defects).
Brief rule served: one engine, zones as data, server-verified (the builder runs offline; receipts stored); PASS2 items 1-5 done above.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN.
- All checked claims hold. Minor: attachRooms takes (attempts, maxRoomCount); the room cap is also 35.
