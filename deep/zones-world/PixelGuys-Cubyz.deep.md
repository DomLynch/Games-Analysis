# PixelGuys-Cubyz (zones-world, cell 7)

Donor: /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig | Licence: GPL-3.0 per LICENSE file (no per-file header) | Zig | symbol Biome / TreeNode.init / TreeNode.getBiome / finishLoading

Symbol check (opened, 2026-10-09 correction pass): Biome struct 171-410 (ClimateProperties 172-218, fields 220-265, init from 267, hasTag ends 409-410), TreeNode union 490-591 (init 501-567, getBiome 569-590), finishLoading 652-722 all land on the named code. Also opened: ValueNoise.zig samplePoint2D (28-38), percentileTable (40) and percentile (91-98); terrain.zig climateWavelengths (88, 115-120); climategen/NoiseBasedVoronoi.zig 95-175 (the caller).

## 1. Mechanism
- Biomes are data records: struct Biome (171-410) holds a 15-bit climate flag set, cave flag, radius and variation, height range, roughness/hills/mountains, cave settings, fog and sky colour, id and palette id, vegetation, sub-biomes, transition biomes, music, a per-biome spawn chance and tags (220-265). The 15 flags are five groups of three (hot/temperate/cold, inland/land/ocean, wet/neitherWetNorDry/dry, barren/balanced/overgrown, mountain/lowTerrain/antiMountain, 172-192). fromZon with initMidValues fills the middle flag of any group the data left empty (210-215).
- Registration: register (639-650) builds a Biome from its data and appends it to the cave list or the surface list. finishLoading (652-722) moves zero-chance surface biomes to the end of the list (655-666), builds the climate tree over the non-zero ones, byTypeBiomes = TreeNode.init(arena, biomes[0..nonZero], 0) (667), fills id and palette index lookups (668-678), then resolves sub-biome lists with their total chance (679-692) and transition biomes with a log line for unknown ids and for overlapping climates (694-721).
- TreeNode.init (501-567): a node is a leaf when the slice has at most 1 biome or all 15 bits are used, i.e. depth 5 (503-510); the leaf stores the total chance and an alias table over the slice. Otherwise, for the current group of three flags (shift by parameterShift, mask 7), a biome is "low" only when exactly the first flag is set (value 1), "high" only when exactly the third is set (value 4), otherwise "middle" (514-525, partition map 552). Chances are normalised (526-529). The two borders are NOT the raw shares: lowerBorder = ValueNoise.percentile(chanceLower), upperBorder = percentile(chanceLower + chanceMiddle) (532-533). percentile (ValueNoise.zig 91-98) interpolates a 128-entry table that maps a share of the map to a noise value, because the 2D value noise is not uniform. The slice is partitioned in place into low, middle, high and the three children are built with parameterShift + 3 (555-564).
- TreeNode.getBiome (569-590): at a branch it reads the wavelength for this depth from the world's terrain profile (577; defaults hot_cold 2400, land_ocean 3200, wet_dry 2400, vegetation 2400, mountain 500, terrain.zig 116-120), samples ValueNoise.samplePoint2D at x and y divided by that wavelength using a fresh seed from main.random.nextInt(seed) at each level (578), and picks child 0 below lowerBorder, 2 at or above upperBorder, else 1 (579-587). At a leaf it seeds from (seed, x, y) with initSeed2D and samples the alias table by chance (571-574).
- Who calls it: NoiseBasedVoronoi Chunk.init (111-141) draws up to 100 consecutive rejected random points inside a climate chunk, calls tree.getBiome(&biomeSeed, x, y, 0) with biomeSeed = the world seed at each point (119-120), gives the biome a radius (radius plus variation times a signed random, 121), rejects the point if it is closer than 0.85 times the sum of radii to an existing point in this or a neighbouring chunk (95-109, 122-131), and stores accepted points sorted by x with a random height in the biome's range and weight 1/sqrt(pi r^2) (134-140). So the tree picks biome kinds for Voronoi seed points, not per column. The step that turns those points into a per-column biome (the rest of the file past 175) was not read.
- Inputs: world seed, point, registered biomes. Server-side terrain generation.

## 2. Key functions
- Biome (data struct) | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig | 171-410 | the per-biome data record; not the logic. Climate is a 15-bit flag set in groups of three.
- TreeNode.init | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig | 501-567 | builds the climate tree: three groups per level, borders at the noise percentiles of the cumulative chance shares, recurse with the next flag group.
- TreeNode.getBiome | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig | 569-590 | walks the tree with noise at each level, then picks the leaf biome by chance with a per-(x, y) seed.
- finishLoading | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig | 652-722 | drops zero-chance biomes from the tree, builds the root tree (byTypeBiomes, line 667), resolves sub-biomes and transitions.
- ValueNoise.percentile | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/noise/ValueNoise.zig | 91-98 | maps a share of area to a noise threshold via a 128-entry table.
- NoiseBasedVoronoi Chunk.init | /mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig | 111-141 | draws biome seed points per chunk using getBiome, rejecting too-close points.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Climate tree: split by one axis per level into three groups, borders at the noise percentile of the cumulative chance shares | Three-way split and depth bound 5 (theirs: 15 bits / 3, line 503) |
| Biome chosen by noise at a wavelength per level | Wavelengths 2400, 3200, 2400, 2400, 500 (theirs, terrain.zig 116-120) |
| Leaf choice weighted by chance, seeded per (x, y) | Biome chance values (theirs, data) |
| Data record per biome with defaults | Height, roughness, fog and sky colours, sub-biome lists (theirs) |
| Seed points rejected when closer than a fraction of their radii | 0.85 factor, 100 rejections per chunk (theirs, NoiseBasedVoronoi 102, 116) |

## 4. TypeScript sketch
simplified: the donor's borders come from a 128-entry percentile table of its own value noise (sketch takes a `pct` function and the caller supplies it); the donor draws a fresh noise seed per level from a shared seed (the sketch leaves noise to the caller); the leaf uses an alias table, the sketch a linear weighted scan; zero-chance biomes are not removed; the flag layout is replaced by an axis array per zone (the donor's low is exactly the first flag set, high exactly the third, anything else is middle, which the axis value hides); the Voronoi seed-point placement that calls the tree is not in the sketch.
```ts
// Licence: GPL-3 | clean-room: written from the mechanism, no donor lines.
// Zone pick from climate data. A tree splits zones by one climate axis per level into three groups (low, mid, high).
// Each branch has two noise thresholds, placed so each group's share of the map matches its chance share.
// A leaf picks one zone by chance weight, seeded per position.
interface Zone { name: string; chance: number; axis: number[]; }     // axis[d]: -1 low, 0 mid, +1 high
interface Node { lo: number; hi: number; kids?: Node[]; leaf?: Zone[]; }

// Noise values are not uniform (they bunch near 0.5), so a share must be mapped to a noise value.
// pct(share) is that mapping for the noise you use; for uniform noise it is the identity.
function build(zones: Zone[], depth: number, maxDepth: number, pct: (share: number) => number): Node {
  if (zones.length <= 1 || depth >= maxDepth) return { lo: 0, hi: 0, leaf: zones };
  const groups: Zone[][] = [[], [], []];
  const share = [0, 0, 0];
  for (const z of zones) {
    const g = (z.axis[depth] ?? 0) + 1;
    groups[g]!.push(z);
    share[g]! += z.chance;
  }
  const total = share[0]! + share[1]! + share[2]!;
  return {
    lo: pct(share[0]! / total),
    hi: pct((share[0]! + share[1]!) / total),
    kids: groups.map((g) => build(g, depth + 1, maxDepth, pct)),
  };
}

// noiseAt(depth) is the 2D value noise at this position, at the wavelength for that depth.
function pick(node: Node, depth: number, noiseAt: (depth: number) => number, rand: () => number): Zone | undefined {
  if (!node.kids) {
    const leaf = node.leaf ?? [];
    const total = leaf.reduce((s, z) => s + z.chance, 0);
    let r = rand() * total;
    for (const z of leaf) {
      r -= z.chance;
      if (r < 0) return z;
    }
    return leaf[leaf.length - 1];
  }
  const v = noiseAt(depth);
  const g = v >= node.lo ? (v >= node.hi ? 2 : 1) : 0;
  return pick(node.kids[g]!, depth + 1, noiseAt, rand);
}
```

## 5. Lands in
- Frankendom file: TARGET origins/world/zone-rules.ts (new: zone rules as data, the tree is the runtime) and origins/world/generate.ts (new: terrain and zone generation). Neither exists today (Zone 1 is hand-built in `zone1.ts`).
- Parity-checklist row: 20 (catalogue as runtime source: a zone/biome record is a data record read by the runtime) and 21 (record fields with defaults).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- Cubyz is a voxel generator, not a zone server. Frankendom zones are authored places with NPCs, quests and spawns; a noise tree picks visual biomes, not gameplay content. Do not let a generated pick decide fights; the one engine takes its inputs from the zone record.
- Random leaf choice uses a seed from position. Frankendom's zone copies (rule 10) need seeding by zone copy id, not by position alone; and any random pick that affects loot or kills must be server-side (server-verified kills, one ledger).
- Biome selection happens on the server and the client gets the result. That matches the server-verified rule, but the donor does not say what a client does when the data changes.
- The climate flags are a fixed 15-bit layout and the depth is limited to five levels. Frankendom's zone schema must not inherit a bit layout.
- The uniform-share mapping needs a percentile table for whichever noise Frankendom uses; the sketch's threshold is wrong for non-uniform noise unless `pct` is supplied.
- MAX_ATTACKERS = 3 and the Pit as client have no counterpart here. Transition biomes, sub-biomes and the per-column resolve after the seed points were not read.
- GPL-3: mechanism only. The sketch is written from the three-way split and the threshold rule; no donor lines.
