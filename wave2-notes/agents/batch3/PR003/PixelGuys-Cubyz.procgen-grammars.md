# PixelGuys-Cubyz (procgen-grammars, feel, PR003)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/` (VPS) | Licence: GPL-3.0 (`LICENSE`, line 1 "GNU GENERAL PUBLIC LICENSE", version 3). Code is clean-room, shape only. Asset content (blueprints, models, textures) not read beyond folder and file counts, so no asset is reused | Language: Zig | Half read: server (`src/server/terrain` generation) plus data in part (3 of 4 structure tables and one biome file read in full or in part; counts for the rest). Client render not read.

Checked: Read in full `src/server/terrain/structures.zig` (163 lines), `structuremapgen/SimpleStructureGen.zig` (206), `StructureMap.zig` (204), `chunkgen/StructureGenerator.zig` (31), `simple_structures/SbbGen.zig` (97), `structuremapgen/SbbEnumerationGenerator.zig` (210), and the relevant sections of `sbb.zig` (170-205, 225-350) and `biomes.zig` (352-386). Data: `assets/cubyz/structure_tables/rare`, `snowy`, `meteorite` read in full; `assets/cubyz/biomes/bush_mountains` lines 19-30; counts for the rest. Confidence high on every number cited (receipts in receipts.tsv). Medium on the walk-density reading, because the site-spacing constant lives in `noise/BlueNoise.zig`, which I did not read. Verdict: STRONG (real, read code; the one-roll ladder and the tag-gated tables are self-contained).

## 1. What the player sees / feels

Walking through a biome you pass small props placed at irregular spacing: a tree, a rock, a flower patch, a cactus or a mushroom, depending on the biome. Each site holds at most one thing, so props never stack in one spot and the ground stays clear. Caves can host models placed on the floor or hung from the ceiling (placement modes, `adjustToCaveMap` 33-89; the cave models themselves were not read). Over a long walk you meet a rare large landmark (the data has a statue entry, a snow-themed entry and a meteorite entry), because its table chance is tiny. Rows of signs are placed every 1024 blocks, but only when a generator that is disabled by default is switched on. On a phone at 375 wide the look is sparse props on open ground, with the occasional object that stands out.

## 2. Why it works / is striking

- Readable at 375 wide: one prop per site, spacing from blue noise, so nothing stacks and the screen does not clutter. Readability was not measured in the render code (not read); this is from the placement rule.
- Signature behaviour: rare things sit in their own table with their own tiny chance, so they feel special with no schedule and no timer.
- Signature sound/effect: not in the half I read (no audio code read).
- Could be made ours at 20-30% resemblance: each zone asks one question per site, "one prop, one landmark, or nothing", with fixed weights. Copy that shape, not the props.

## 3. The rule behind it

Per site, one roll (SimpleStructureGen.zig 97-139):

1. Sites: blue-noise points, one set per 32-block z band (97-103). Each site's random seed comes from the world seed and the site position (110), so any server can regenerate it.
2. One roll per site: draw one value; walk the biome's model list; the first model whose chance is above the roll wins, otherwise the roll drops by that chance (115, 139). Models after the winner never run. The weights sum to at most 1, and the leftover share is "nothing here". The biome loader rescales only when the sum goes above 1 (biomes.zig 378-382), so a list never silently drops entries.
3. Fit: the winning model is adjusted to the terrain for its placement mode (floor, ceiling, both, air, underground, water surface; `adjustToCaveMap`, 33-89). It is rejected if the surface falls in a different 32-block band from the site (45). A rejected site stays empty; it does not try the next model (116, `orelse break`).
4. Tables: a table has its own chance; each model's share is its weight divided by the table total, times the table chance (structures.zig 106-111). A table joins a biome only when the biome has every tag the table lists (biomes.zig 368-377). A table with no tags joins every biome.
5. Multi-block pieces: a blueprint variant is drawn with an alias table (sbb.zig 333-334). Child slots attach at rotations chosen by a 6x6 direction table (SbbGen.zig 80-96). Rotation varies only for up and down slots (sbb.zig 192-200).
6. Order: structures in a fragment are applied in ascending priority, so higher priority writes last (StructureMap.zig 84, 33). Generators run in ascending priority (165).
7. Seed salt: each generator's seed is the world seed XOR its own constant (181; the comment at 132 gives the reason).

Data fields (donor value null: GPL-3, not MIT/Apache/BSD):

| name | unit | donor_value_or_null |
|---|---|---|
| site_band_z | blocks (32) | null |
| site_margin_xy / z | blocks (16 / 32) | null |
| model_default_chance | share of 1 (0.1) | null |
| model_default_priority | rank (1) | null |
| table_chance_rare | share per site (0.000005) | null |
| table_chance_meteorite | share per site (0.00002) | null |
| model_chance_snowy | share per site (0.0001) | null |
| example_model_chance | share per site (0.16) | null |
| surface_band | blocks (32) | null |
| sparse_lod_divisor | count (16) | null |
| sparse_lod_threshold | voxel size (4) | null |
| fragment_size | blocks (128) | null |
| chunk_cache | entries (1024, 8-way) | null |
| variant_default_chance | share (1.0) | null |
| sign_row_period | blocks (1024) | null |
| enumeration_cell | blocks (32) | null |

Counts from the data: 226 biome `.zig.zon` files, 158 blueprint `.zig.zon` files in 13 folders (71 top-level entries), 4 structure tables, 6 placement modes (`structures.zig` 15-22), 1243 `.chance` lines across biome files, 252 biome lines naming the blueprint model.

## 4. For Frankendom

- 700 zones as data: each zone (or biome-like group) carries a weighted ladder of props and camps, with "nothing" as an explicit weight. The ladder is data, not code.
- 100 Pit characters reused across zones: shared tables gated by tags are the analogue. A camp table tagged for a zone family joins every zone that carries the tag; untagged tables join all zones.
- Many-vs-one: a camp is a root piece with child slots (the socket grammar). Cap a camp at MAX_ATTACKERS = 3 attacker slots, so the cap is a template property and not a runtime rule.
- Server-verified, one ledger: the site seed is world seed XOR a zone salt, plus position. Every site is reproducible on the server, so the ledger stores events (kills, respawns), not layouts. Spawn caps, respawn and despawn belong to parity row 23 (zone population). Target: `origins/server/world-spawns.ts`. The one-roll ladder is that file's spawn-chance knob.
- Keep: one roll per site; weights summing to at most 1 with an explicit empty share; tag-gated shared tables; priority overwrite; a salt per generator. Change: the row-only seed (defect 1), the unbounded child recursion (defect 3), and the implicit empty share (make it a named weight).

## 5. The 5-minute look test

Render one zone as a 375 px wide top-down strip with about 40 sites, using three weight sets: dense (props on most sites), sparse (props on about a third), and rare (one landmark weight raised 10x). Dom checks on his phone: (a) does a prop appear every few steps with no two stacking; (b) does the landmark show up about once per long walk, not every screen; (c) does an empty patch read as a clearing rather than a bug. Pass if all three hold on the dense and sparse sets. No release rows, no lock.

## 6. Licence / IP

GPL-3.0 (`LICENSE`, line 1). Code is clean-room, shape only. Quotes here exist only for receipts. Asset content is not reused. Inspiration stays at category level: "a rare landmark on a long-tail table", "a ceiling hanger in caves". Our version keeps the one-roll shape and changes the props, weights and caps.

## 7. Gaps

- Not read: `noise/BlueNoise.zig` (site spacing, so walk density per 20 s cannot be computed from code), `CaveMap` and `CaveBiomeMap` internals, the cave model files, climate code, the render and audio code, and the sign block-entity code (only the call inside `SbbEnumerationGenerator.zig` was read).
- Not read in data: 226 biome files (one read in part), 158 blueprint files (counted only), the `wood` structure table folder.
- Not a naming grammar: `assets/cubyz/wordlist` (2048 words, `src/network/authentication.zig` 9-22) is used for account codes, not for names. Not read beyond that.
- Not present in the half I read: idle/ambient behaviour, death and respawn, loot reveal, boss staging, finisher camera.

## Defects (keep the idea, fix the defect)

1. Row-only seed in the enumeration generator: `.seed = worldSeed*%@as(u32, @bitCast(wpy))` (`SbbEnumerationGenerator.zig` 174) gives every cell in one row the same seed, and row 0 gets seed 0. Fix: hash (wpx, wpy, relZ) through the same `initSeed3D` call the simple-structure generator uses (`SimpleStructureGen.zig` 110). Idea kept: one seed per cell.
2. Repeating strip: the cell type is `@mod(@divFloor(wpx, 32), N)` (`SbbEnumerationGenerator.zig` 145), so the structure list repeats every N x 32 blocks. Fix: one roll per cell over the same weighted ladder. Idea kept: one structure per cell.
3. No depth cap on placement: `placeSbb` recurses into child slots (`simple_structures/SbbGen.zig` 76). The reachability pass in the enumeration generator (60-78) handles cycles for choosing roots, but I did not see a depth check on the recursive placement or a cycle check in `postResolutionChecks` (`sbb.zig` 310-332). Fix: a depth cap, or reject cycles at load. Idea kept: child slots with alignment.
4. Empty site on rejection: `orelse break` at `SimpleStructureGen.zig` 116 (and 163) empties the site when the rolled model fails the terrain fit. Change candidate: try the rest of the ladder, or keep it and name it as intended.
5. Backwards comparator: `compareStructureTables` returns `== .gt` (`structures.zig` 136), so tables sort in descending id order. The order is deterministic, so this is harmless but misleading. Fix: flip to `.lt` and check any reader that depends on order.
6. Hidden constant: `model.chance/16` (`SimpleStructureGen.zig` 159) assumes a 16-sample spacing for coarse levels of detail. Fix: a named constant tied to the spacing.

Best transferable idea: give each site one roll over a short weighted ladder with an explicit empty share, seed it from the world seed and the position, and gate shared tables by tags, so every zone can be regenerated and checked on the server.

Reuse tag: new:chance-ladder, new:socket-grammar, new:tag-gated-table, seed-discipline.
Tags: walk-density, seed-discipline, encounter-camp, signage, new:chance-ladder, new:socket-grammar, new:tag-gated-table.
Brief rule served: FEEL-TASK procgen-grammars (zones as data, seeded, server-verified, one ledger, walk density).
