# PixelGuys-Cubyz (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig` (with `src/server/terrain/biomes.zig`, `src/server/terrain/ClimateMap.zig`, `src/server/terrain/SurfaceMap.zig`) | Licence: GPL-3.0 (repo LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; NoiseBasedVoronoi.zig has no per-file licence header) | Zig | symbols `GenerationStructure.init`, `Chunk.init`, `findClosestBiomeTo`, `fillRecursively`, `toMap`, `TreeNode.getBiome`

Checked: Read in full: `NoiseBasedVoronoi.zig` (1-548: `generateMapFragment`, `BiomePoint`, `Chunk.init` and `checkIfBiomeIsValid`, `GenerationStructure.init` with its phase loop, `interpolationValueBetween`, `findClosestBiomeTo`, `drawCircleOnTheMap`, `addSubBiomesOf`, `addTransitionBiomes`, `pruneInterpolationCandidates`, `fillRecursively`, `toMap`); `biomes.zig` 171-282 (`Biome` fields and `init` radius and height parsing) and 548-593 (`TreeNode` build tail and `getBiome`); `ClimateMap.zig` 39-48, 100-131 (fragment cache, `cacheInit`, aligned fragment origin); `SurfaceMap.zig` 64-66 (biome cell size). Not read: `biomes.zig` 282-400 (rest of `init`), 413-547, 594-775 (register, `finishLoading`, sub-biome table build); `world.zig` chunk manager and the spawn search (grep lines 854-860 only); `CaveBiomeMap.zig`. Callers checked: `findClosestBiomeTo` is called only from the leaf case of `fillRecursively`; `fillRecursively` is called from `toMap` (529) and recursively; `TreeNode.getBiome` is called from `Chunk.init` (120) and recursively from itself; `generateMapFragment` is called from `ClimateMap.cacheInit` (via `profile.climateGenerator`). Confidence: high for chunk placement, the phase rule, the classification and the fragment assembly (all read end to end); medium on the sub-biome and transition passes (read, not used in the sketch); no look at how chunks are loaded around a player (not read). camera_scope: n/a (zones-world topic). Two donor sub-systems are the nearest thing to streaming here: the climate fragment cache (`ClimateMap.zig` cache, 2048 by 2048 chunks inside 8192-unit fragments) and the per-window chunk set.

## 1. Mechanism

- Unit of layout: a climate fragment is 8192 world units (`ClimateMap.zig` 44-45: `mapShift = 8 + biomeShift`, `biomeShift = 5` from `SurfaceMap.zig` 64), aligned to its size (`ClimateMap.zig` 128: `wx & ~mapMask`). Biome cells are 32 units (`SurfaceMap.zig` 66). Layout works in chunks of 2048 units (`NoiseBasedVoronoi.zig` 71-73).
- Window: to build a fragment, the generator makes a window of chunks 4 chunks wider than the fragment on every side (`GenerationStructure.init`: `8 + width/chunkSize` chunks per side, origin `wx + x*chunkSize - 4*chunkSize`, lines 160-194). Chunk origins are therefore aligned to the 2048 grid, and parity of a chunk's window index equals parity of its absolute index.
- Chunk centres, step 1 (`Chunk.init`, 74-157): for each chunk, a seeded RNG (`random.initSeed2D(worldSeed, {wx, wy})`, 113) draws candidate points inside the chunk (`x` and `y` uniform over 2048). The biome kind at a candidate is read from the climate tree at that point (`tree.getBiome`, 120; `TreeNode.getBiome` 569-587 picks a child by a value-noise sample at each depth, and a leaf draws from an alias table seeded by the point). Its radius is `radius + radiusVariation * signed random` (121). The candidate is accepted only if it is at least `0.85 * (r1 + r2)` from every centre already placed in the same chunk and from every centre of the adjacent chunks passed in (102, 127). A rejection increments a counter; the chunk stops after 100 consecutive rejections (116). An accepted centre gets a height uniform in [minHeight, maxHeight] and a weight `1/(sqrt(pi) * radius)` (138).
- Chunk centres, step 2 (phase order, 166-194): the window is generated in four parity phases: (even, even) first with no neighbours; (even, odd) sees the (even, even) neighbours above and below (offsets 173-178); (odd, even) sees six neighbours; (odd, odd) sees all eight. Each adjacent pair is checked once, by the later chunk. Non-adjacent chunks are never compared.
- Classification, step 3 (`findClosestBiomeTo`, 225-303): a point's distance to a centre is `|p - c| * weight` (`voronoiDistanceFunction`, 61-62), i.e. measured in units of that centre's radius. For each pair of candidates, a blend share is computed from the two distances: a smoothstep over a band of width 0.5 centred on the midline of the two distances (216-219, 208-209, 253-257). The candidate weights are multiplied by the shares. The weighted average of height, roughness, hills and mountains uses these weights (262-279).
- The biome itself is a hard choice: the candidate with the smallest distance is taken, after adding 10 to the distance of any candidate whose kind is outside its height limits at the local weighted height (281-287). So the biome identity switches on a hard edge, while the continuous fields blend across the band.
- Fragment assembly, step 4 (`toMap` 520-547): candidates from all chunks of the window go into `fillRecursively` (529), which splits the fragment (with a margin of 64 biome cells, line 485) into quadrants, halving both sides, until a block has a side under 8 cells (488). Candidates are pruned per quadrant by an interpolation-band test (`pruneInterpolationCandidates`, 450-483). Each leaf cell is classified with `findClosestBiomeTo`.
- Then transition biomes (`addTransitionBiomes`, 399-448): where the climate bits of the neighbourhood match a transition biome's climate triplets within its width, a cell is replaced with probability `transitionBiome.chance` (432). Then sub-biomes (`addSubBiomesOf`, 348-397): a count is drawn from the parent's total sub-biome chance and capped by `maxSubBiomeCount` (357-364), and sub-biome circles are drawn inside the parent. Both passes are read but are not in the sketch.

## 2. Key functions

- `Chunk.init`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig` 74-157. Rejection placement of centres in one chunk, against placed neighbours, with a 100-reject stop and the weight.
- `GenerationStructure.init`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig` 159-206. Window of chunks, four parity phases, neighbour lists (edge chunks get fewer neighbours, 188-190).
- `findClosestBiomeTo`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig` 225-303. Pairwise blend, weighted height, argmin with height-limit penalty.
- `fillRecursively` and `toMap`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/climategen/NoiseBasedVoronoi.zig` 487-547. Quadtree fill to 8 by 8 leaves, then transitions, sub-biomes, copy-out.
- `TreeNode.getBiome`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/terrain/biomes.zig` 569-587. Climate-noise tree that chooses the biome kind at a point.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Chunk of fixed size; candidate centres per chunk from a seed | 2048 units per chunk (theirs, `NoiseBasedVoronoi.zig` 71) |
| Reject a candidate that is too close to a placed centre; stop after a run of rejections | 100 consecutive rejections (theirs, 116); spacing 0.85 of the summed radii (theirs, 102) |
| Radius = mean +/- variation per zone kind | Mean from min and max radius, default min 256 and max = min (theirs, `biomes.zig` 268-277) |
| Height per centre from the zone's own range | minHeight and maxHeight per kind (theirs, `biomes.zig` 297-298) |
| Normalised nearest: distance times 1/(sqrt(pi) r) | Weight 1/(sqrt(pi) * radius) (theirs, 138) |
| Blend band between two zones | Width 0.5 of the normalised distance, smoothstep (theirs, 216, 209) |
| Discourage a zone outside its height band | Penalty +10 in normalised distance (theirs, 281-285): far larger than the normal range of the normalised distance, so in practice a hard gate whenever another candidate is valid |
| Fragment of 4 by 4 chunks, quadtree fill down to small blocks | Fragment 8192 units (theirs, `ClimateMap.zig` 44-45); leaf when a side is under 8 cells (theirs, 488); margin 64 cells (theirs, 485) |

## 4. TypeScript sketch

simplified: the sketch keeps the chunk placement (phase order and neighbour lists, 0.85 spacing, 100-reject stop, radius draw, height and weight on accept), the pairwise blend, the weighted height and the argmin with the height-limit penalty. It omits: the climate tree (the zone kind is passed in as `kindAt`); the seeded RNG (passed in as `rnd`); the window origin and margin (neighbours are passed in directly); the quadtree fill and candidate pruning; the biome cell grid and its offset (`x` and `y` are plain numbers); the roughness, hills and mountains fields; the `smoothBeaches` factor; the transition and sub-biome passes; the fragment cache. It keeps the donor order inside `placeChunk` (x draw, then y draw, then kind and radius, then the clash test). It uses `Math.floor(rnd() * CHUNK)` for the integer draw and `2 * rnd() - 1` for the signed draw, which are not bit-identical to the donor's generator.

```ts
// Licence: GPL-3.0 (donor LICENSE file). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ZoneKind {
  id: string;
  radius: number;          // mean radius, world units
  radiusVariation: number; // +/- spread
  minH: number;            // height range this zone can be drawn at
  maxH: number;
  minHLimit: number;       // zone is discouraged where the local height is outside these limits
  maxHLimit: number;
}
export interface Centre { x: number; y: number; kind: ZoneKind; radius: number; height: number; weight: number; }
export type Rnd = () => number; // uniform in [0, 1)

export const CHUNK = 2048;     // chunk edge, world units
export const MAX_REJECTS = 100; // consecutive rejections before a chunk stops adding centres
export const SPACING = 0.85;    // centres may come this close, as a fraction of the summed radii
export const STRENGTH = 0.5;    // width of the blend band, in normalised distance
export const HEIGHT_PENALTY = 10;

// Phase order: (even,even) first, then (even,odd), (odd,even), (odd,odd). Each chunk only checks
// neighbours already placed in an earlier phase, so every adjacent pair is checked exactly once.
export function phaseOf(cx: number, cy: number): number {
  return (((cx % 2) + 2) % 2) * 2 + ((((cy % 2) + 2) % 2));
}
export const PHASE_NEIGHBOURS: [number, number][][] = [
  [],
  [[0, -1], [0, 1]],
  [[-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
];

// Place centres in one chunk. `neighbours` are the already-placed centres of adjacent chunks.
export function placeChunk(cx: number, cy: number, kindAt: (x: number, y: number) => ZoneKind,
                           rnd: Rnd, neighbours: Centre[]): Centre[] {
  const out: Centre[] = [];
  let rejects = 0;
  while (rejects < MAX_REJECTS) {
    const x = cx + Math.floor(rnd() * CHUNK);
    const y = cy + Math.floor(rnd() * CHUNK);
    const kind = kindAt(x, y);
    const radius = kind.radius + kind.radiusVariation * (2 * rnd() - 1);
    const clash = out.concat(neighbours).some((c) => {
      const minD = (radius + c.radius) * SPACING;
      const dx = c.x - x;
      const dy = c.y - y;
      return dx * dx + dy * dy < minD * minD;
    });
    if (clash) {
      rejects++;
      continue;
    }
    rejects = 0;
    out.push({
      x, y, kind, radius,
      height: kind.minH + rnd() * (kind.maxH - kind.minH),
      weight: 1 / Math.sqrt(Math.PI * radius * radius),
    });
  }
  return out;
}

// Normalised distance: Euclidean distance times the centre's weight, so it is measured in units of the centre's radius.
export function voronoiDist(c: Centre, x: number, y: number): number {
  return Math.hypot(c.x - x, c.y - y) * c.weight;
}

function smoothstep(t: number): number { return t * t * (3 - 2 * t); }

// Share that the second centre takes over the first, as a smooth function of the first centre's distance.
function bandShare(d1: number, d2: number): number {
  const centre = (d1 + d2) / 2;
  const start = centre - STRENGTH / 2;
  const end = centre + STRENGTH / 2;
  if (d1 < start) return 0;
  if (d1 > end) return 1;
  return smoothstep((d1 - start) / (end - start));
}

// Biome identity is a hard argmin of normalised distance (with a height gate); the height is a blend.
export function classify(x: number, y: number, cands: Centre[]): { kind: ZoneKind; height: number } {
  const list: { c: Centre; w: number }[] = cands.map((c) => ({ c, w: 1 }));
  let i = 0;
  outer: while (i < list.length) {
    let j = i + 1;
    while (j < list.length) {
      const share = bandShare(voronoiDist(list[i].c, x, y), voronoiDist(list[j].c, x, y));
      if (share === 0) { list.splice(j, 1); continue; }
      if (share === 1) { list.splice(i, 1); continue outer; }
      list[i].w *= 1 - share;
      list[j].w *= share;
      j++;
    }
    i++;
  }
  const total = list.reduce((s, e) => s + e.w, 0);
  const height = list.reduce((s, e) => s + e.c.height * e.w, 0) / total;
  let best = list[0].c;
  let bestD = Infinity;
  for (const e of list) {
    let d = voronoiDist(e.c, x, y);
    if (height > e.c.kind.maxHLimit) d += HEIGHT_PENALTY;
    if (height < e.c.kind.minHLimit) d += HEIGHT_PENALTY;
    if (d < bestD) { bestD = d; best = e.c; }
  }
  return { kind: best.kind, height };
}

export {};
```

## 5. Lands in

- TARGET `origins/world/zone-layout.ts` (proposed new module; the Frankendom repo was not read in this pass, so the path is a proposal). It would generate zone centres per chunk from the world seed and classify points, feeding the zone data that the rest of the world reads.
- Parity row: no row fits zone layout generation exactly. Row 23 (zone population) is the closest, because the zone centres decide where zone-scoped spawns sit; this mechanism does not set population, caps or respawn, so it does not implement row 23 itself.
- today: Frankendom's current zone layout code was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data on one runtime (the layout comes from a seed and zone data, not a baked map); the layout function is pure, so the server can verify it

Best transferable idea: Generate zone centres per 2048-unit chunk from the world seed with a spacing rule of 0.85 times the summed radii, place the chunks in four parity phases so each chunk's neighbours are already fixed, and classify a point by the nearest centre measured in units of that centre's radius.
Decision (proposed): adapt - take the seeded chunk placement and the normalised nearest-zone rule, because they give a deterministic zone map from data without a baked file; do not take the donor's unclamped radius, its edge-of-window rule untested, or the float-based classification as is.
Acceptance: A server test with a fixed seed asserts that the centres of every chunk at least two chunks inside a window are identical when the window origin changes, that no two centres in adjacent chunks are closer than 0.85 times their summed radii, and that a point in a valley is not assigned to a mountain-only zone whose height limit it breaks.

## 6. Gaps and risks

- Radius is not clamped to the 2048 chunk assumption. The radius comes from zone data (`biomes.zig` 268-277), and only the adjacent 8 chunks are checked (`NoiseBasedVoronoi.zig` 173-178). Two centres in chunks two apart are at least 2048 units apart, so an overlap goes undetected once 0.85 times their radius sum exceeds 2048 (radius sums above about 2409). The donor does not enforce that limit in the code read. Frankendom needs a load-time check on radius.
- Window-edge chunks lose neighbours (`NoiseBasedVoronoi.zig` 188-190: out-of-window neighbours are skipped). A chunk's centres can therefore depend on which window computed it. The donor's code does not show why the fragment interior is far enough from the window edge for this not to matter. The acceptance test above is written to check it, and it was not run.
- The `smoothBeaches` branch uses the un-normalised weighted sum `height` (`maxHeight = @abs(height)`, line 271), while the height-limit check (281) divides that sum by `totalWeight`. This looks unintended. Not run; do not copy the branch.
- The donor works in `f32` floats (distances, `@sqrt`, smoothstep). Two machines can disagree on a boundary cell. If the server must agree with clients on zone identity, Frankendom should compute zone identity on the server only, or use fixed-point integers.
- Only the climate-fragment cache is streaming here. How chunks are loaded and dropped around a player (`world.zig` chunk manager) was not read.
- The sub-biome count (`NoiseBasedVoronoi.zig` 357-364) and the sub-biome table in `biomes.zig` (688-690) are a per-zone spawn table of their own. They are read in part only and are not in this note; a second note would be needed to call them STRONG.
- The biome choice uses a climate tree (`biomes.zig` 569-587), so the zone kind at a point depends on climate noise, not on the zone data alone. Frankendom's zones-as-data ruling needs a plain rule for which zone a point gets.
- Nothing in this mechanism covers many-on-one targeting or MAX_ATTACKERS.
