# Anuken-Mindustry (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/maps/generators/BaseGenerator.java` (base layout) with `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/BaseRegistry.java` (part data and tiers) and the caller `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/maps/planet/SerpuloPlanetGenerator.java` | Licence: GPL-3.0 (`/mnt/frankendom-donors/Anuken-Mindustry/LICENSE` lines 1-2: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; the "or later" clause was not checked; clean-room only) | Java | symbols `BaseGenerator.generate`, `BaseGenerator.tryPlace`, `BaseRegistry.load`

Checked: opened BaseGenerator.java in full (306 lines); BaseRegistry.java in full (137 lines); SerpuloPlanetGenerator.java lines 28, 633 and 700-730 (caller context only). The hint file MapIO.java (276 lines) is the wrong file: it is the map reader and writer. Grepped only for its method names (lines 38-74, 213-250), not read. Data half: core/assets/baseparts holds 210 .msch schematic files (counted with ls; not opened); core/assets/basepartnames (the list the loader reads) was not read. Other generator files named in core/src/mindustry/maps/generators/ (PlanetGenerator, BasicGenerator, FileMapGenerator) were not opened. Not read: Rand.chance and Rand.range semantics, Seq.getFrac, Tile.circle (its radius units), Astar.pathfind, Schematics.place and placeLoadout, Geometry.d8 order, the .msch contents. Confidence: high on the pass and placement order (read end to end); medium-high on the wall rule (read as code, not seen on screen); medium on the path clear (order read, the A* function itself not read). camera_scope: not a camera cell.

Best transferable idea: a base is placed one part at a time: each part is drawn from a tier-sorted list by a difficulty fraction, bound to a resource tile it can mine, and accepted only if a 1-tile clearance is free; the number of passes grows with difficulty.
Decision (proposed): adapt - take the resource-anchored, one-part-at-a-time placement and the difficulty fraction, but run it from the zone seed on the server, put the chances and passes in zone data (clamped), and fix the three defects below.
Acceptance: in a zone with a mine node, the server places a camp whose drill part sits on the node with a 1-tile clear border, the same seed gives the same camp for server and client, and a test fails if any part overlaps the spawn-safe radius.

## 1. Mechanism

Order of operations in `BaseGenerator.generate` (lines 42-172):

1. Seed. If no base parts are loaded, return (47). Otherwise `Mathf.rand.setSeed(sector.id)` and one `nextDouble()` (49-50). The layout is a function of the sector id, not of the play session.
2. Numbers from difficulty (0 to 1). `baseChance = lerp(0.7, 2.1, difficulty)` (53). `resourceChance = 0.5 * baseChance` (55). `nonResourceChance = 0.002 * baseChance` (56). `passes` is 1 below difficulty 0.4, 3 below 0.8, else 5 (57). The wall angle is 70 degrees (54).
3. Cores. For each enemy core tile, clear its overlay (62) and place a core loadout chosen by fraction: `bases.cores.getFrac((difficulty + rand.range(0.4)) / 1.4)` (63). Then fill the core with every item to its capacity (66-69).
4. Passes (72-87). Each pass walks the circle of radius `range = 180` around the first core (`pass`, 189-192; the centre is `cores.first()`, 190). A cell is used only if it is replaceable (75). If it has an ore overlay, or a drop or liquid drop with a small extra chance, and a `resourceChance` roll succeeds (77-78), it takes a resource-bound part: `forResource(item)` then `getFrac(difficulty + rand.range(0.17))` (79-81). Otherwise a `nonResourceChance` roll takes any free part by `getFrac(rand.random(1))` (83-84). The part's rotation is a random pick from two values (207).
5. `tryPlace` (206-273). Pick the rotation; compute the bottom-left corner so the part's centre lands on the cell (208-214). Reject if any footprint tile is `isTaken` (217-222). `isTaken` (283-299) rejects the spot if an enemy core of the wave team is within `enemyCoreBuildRadius + tilesize` (284), and if any tile in the footprint plus a 1-tile pad (288) is not replaceable or is dark (290-296, 304). After validation an optional callback runs (225-231); the generator's calls at 81 and 84 pass none. For a resource part, the drills' footprint tiles get the item as overlay or floor, with a random neighbour tile also seeded (233-254). The schematic is placed (256). Then the drills are filled with the item (259-270).
6. Walls (97-130). An empty replaceable cell becomes a small wall when one of its 8 neighbour directions lies within 70 degrees of the direction from spawn to the cell, and that neighbour is a team building that is not a wall or mine (114-127). Large walls (132-149): on a 2x2 block of 1-tile cells that are walls or empty, three or more walls turn the block into a large wall (146-147).
7. Path clear (153-171). An A* path runs from each core to the spawn (157). The cost is 100000 for wave-team tiles outside `10f * 8` of the core (153, 157), 1 for tiles with a floor surface, and 10 otherwise, so the path prefers to stay inside the core ring and avoids enemy blocks further out. Outside that radius, wave-team blocks on the path are cleared, and so are the wave-team blocks next to each path tile (158-168). Inside the radius nothing is cleared (the `if` at 158). (The A* internals and the meaning of `within` units are not read.)

Parts data (BaseRegistry.java 35-114). Each schematic is read (53). A part with a core block is a core part (61-63, 87-88). A part with an item source config gets `required` = that item (66-68). Parts without `required` go to the general list (89-90); the others go to `reqParts[item]` (102-103). `tier` = sum over the part's tiles of `(buildTime / buildCostMultiplier)^1.4` (85), computed after sandbox-only tiles are removed (83). Lists are sorted by tier (111-113) so that `getFrac` picks a part by fraction of cost.

Caller (SerpuloPlanetGenerator.java). `difficulty = sector.threat` (633). The base is generated only if `sector.hasEnemyBase()` (725), passing the enemy room cores, the spawn tile, the wave team and the difficulty (726).

Tick: none. Generation runs once per sector load.

## 2. Key functions

- `BaseGenerator.generate`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/maps/generators/BaseGenerator.java` 42-172. The whole pipeline: seed, numbers, cores, passes, walls, path clear.
- `BaseGenerator.tryPlace` (with the callback overload): same file 198-273. Rotation, footprint check, ore seeding, placement, drill fill.
- `BaseGenerator.isTaken`: same file 283-299 (enemy core radius and a 1-tile pad). `overlaps` 301-305.
- `BaseGenerator.pass`: same file 189-192 (the circle around the first core).
- `BaseRegistry.load`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/BaseRegistry.java` 35-114. Part load, `required`, core and general split, tier formula, sorting.
- `SerpuloPlanetGenerator` caller: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/maps/planet/SerpuloPlanetGenerator.java` 633, 725-726.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Chances rise with difficulty: lerp from 0.7 to 2.1, then 0.5x for resources and 0.002x for other cells | `0.7f`, `2.1f`, `0.5`, `0.002` (BaseGenerator.java 53-56). At difficulty 0 the resource chance is 0.35; at 1 it is 1.05 |
| Pass count steps with difficulty | 1 below 0.4, 3 below 0.8, else 5 (57) |
| Part chosen by a fraction of a tier-sorted list, with a small random bracket | Bracket 0.17 (52); the cores use +-0.4 noise over 1.4 (63) |
| Part tier = sum of build cost raised to 1.4 | `1.4f` (BaseRegistry.java 85) |
| Clearance of 1 tile around each footprint, and an enemy-core exclusion radius | `pad = 1` (BaseGenerator.java 288); `enemyCoreBuildRadius + tilesize` (284) |
| Walls on the spawn-facing side at 70 degrees | `wallAngle = 70` (54) |
| Large wall when a 2x2 has three or more walls | `walls >= 3` (146) |
| Path-clear cost: enemy blocks outside the core ring are very expensive, so the path runs through the ring if it can | `100000`, `1`, `10` (157); radius `10f * 8` (153) |

## 4. TypeScript sketch

simplified: the sketch keeps the pass structure (passes from difficulty, chances from difficulty, resource cells first, then free cells), the tier-sorted fraction pick, the 1-tile pad, the seeded RNG, and the wall rule as its own function. It changes three things on purpose: (1) the cell order is shuffled per pass with the seeded RNG (the donor walks the circle in a fixed order, line 191), (2) the bracket noise is drawn as U(0, 0.17) rather than the donor's Rand.range semantics (not read), and (3) the rotation is 0 or 90 degrees (the donor's `random.range(2)` value mapping is not read). It omits the core loadout and item fill, the ore seeding around drills, the drill fill, the enemy-core radius (the caller passes it in `taken`), the large-wall pass, the A* path clear, the postGenerate power-node step, and the disabled wall-replacement pass (`if(false)`, line 90). The `wallHere` function is not called by `generateBase`; it is a separate rule for the caller to apply after placement.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Part { name: string; tier: number; w: number; h: number; resource?: string; }
export interface Cell { x: number; y: number; empty: boolean; resource?: string; }
export interface Neighbour { dx: number; dy: number; ownBuilding: boolean; isWallOrMine: boolean; }

// Seeded RNG (mulberry32): the donor seeds Mathf.rand with the sector id (BaseGenerator.java line 49).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Donor lines 53-57: chances and pass count rise with difficulty (0..1).
export function chances(difficulty: number): { resource: number; nonResource: number } {
  const base = 0.7 + (2.1 - 0.7) * difficulty;   // lerp(0.7, 2.1, difficulty)
  return { resource: 0.5 * base, nonResource: 0.002 * base };   // may exceed 1 at high difficulty (see defects)
}

export function passesFor(difficulty: number): number {
  return difficulty < 0.4 ? 1 : difficulty < 0.8 ? 3 : 5;
}

// Pick from a tier-sorted list by fraction (donor Seq.getFrac is not read; this helper is ours).
export function pickFrac<T>(sorted: T[], frac: number): T {
  const f = Math.min(1, Math.max(0, frac));
  return sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
}

function shuffleInPlace<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// Donor lines 114-124: an empty tile becomes a wall when a neighbour direction lies within wallAngle
// of the spawn-to-tile direction and that neighbour is a team building that is not a wall or mine.
function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function wallHere(tileDeg: number, neighbours: Neighbour[], wallAngle: number): boolean {
  return neighbours.some(n => {
    const dirDeg = (Math.atan2(n.dy, n.dx) * 180) / Math.PI;
    if (angleDist(dirDeg, tileDeg) > wallAngle) return false;
    return n.ownBuilding && !n.isWallOrMine;
  });
}

// One part at a time. The caller supplies taken(), which must cover existing blocks and the enemy-core
// exclusion radius. The pad of 1 tile around the footprint matches the donor's isTaken (line 288).
export function placeOne(
  part: Part,
  x: number,
  y: number,
  rnd: () => number,
  taken: (x: number, y: number, w: number, h: number, pad: number) => boolean,
  put: (part: Part, x: number, y: number, rot: number) => void,
): boolean {
  const rot = Math.floor(rnd() * 2) * 90;   // two rotations, as the donor's random.range(2) is used (range semantics not read)
  if (taken(x, y, part.w, part.h, 1)) return false;
  put(part, x, y, rot);
  return true;
}

// Base layout. Each pass walks the candidate cells in a seeded shuffle; a resource cell may take a
// resource-bound part; any other empty cell may take a free part with a small chance.
export function generateBase(
  cells: Cell[],
  parts: Part[],                          // no requirement, sorted by tier
  byResource: Map<string, Part[]>,        // needs a resource, sorted by tier
  difficulty: number,
  seed: number,
  taken: (x: number, y: number, w: number, h: number, pad: number) => boolean,
  put: (part: Part, x: number, y: number, rot: number) => void,
): number {
  const rnd = mulberry32(seed);
  const ch = chances(difficulty);
  let placed = 0;
  for (let pass = 0; pass < passesFor(difficulty); pass++) {
    shuffleInPlace(cells, rnd);   // fix: a fixed scan order lets the first cells claim the space
    for (const c of cells) {
      if (!c.empty) continue;
      if (c.resource !== undefined && rnd() < ch.resource) {
        const list = byResource.get(c.resource) ?? [];
        if (list.length === 0) continue;
        const part = pickFrac(list, difficulty + rnd() * 0.17);   // donor bracket range 0.17 (line 52)
        if (placeOne(part, c.x, c.y, rnd, taken, put)) placed++;
      } else if (rnd() < ch.nonResource) {
        const part = pickFrac(parts, rnd());
        if (placeOne(part, c.x, c.y, rnd, taken, put)) placed++;
      }
    }
  }
  return placed;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cm001-anuken-base.ts, which ends with `export {};`): exit 0.

Defects found, each with the fix:
- Chance above 1: `resourceChance` is 0.5 x lerp(0.7, 2.1), so at difficulty 1 it is 1.05 (BaseGenerator.java 53-55), and the roll at line 78 then always passes (the Rand.chance semantics are not read, so this relies on the usual `nextDouble() < p` form). Every ore cell is taken at the top difficulty with no warning. fix: clamp the chances to 0..1 when zone data is loaded, and log the clamp.
- Fixed cell order: the pass walks the circle in one order (189-191), so cells near the first visited side claim the space first in every pass. fix: shuffle the cells per pass with the seeded RNG (sketch, `shuffleInPlace(cells, rnd)`).
- One centre for all passes: `pass` always uses `cores.first()` (190), so a second enemy core in the list does not get its own 180 radius, although every core gets a loadout (61-70). fix: run the passes per core centre (or per zone camp centre) and keep one occupied set.
- Path clear over-reaches: outside the core radius, the path clear removes wave-team blocks next to each path tile as well as on the path (163-168; the test is at 165), so it can delete parts placed a moment earlier. fix: clear only the path tiles, or keep the placed footprints in a protected set that the clear skips.
- Dead code: the wall replacement pass is disabled with `if(false)` (90-95) and `insanity` is a constant `false` (28). Not a defect in the mechanism; remove or document when porting.

## 5. Lands in

- TARGET `origins/zones/camp-layout.ts` (proposed new module; called by the zone loader once per zone seed, with the camp's parts and chances read from zone data). Not in `src/fight/`: the camp is zone content; the fight engine only sees the spawned NPCs.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn; zone data fields). The camp is zone content placed once, not population over time; no row covers layout, so row 23 is the nearest match and is approximate. Fields to add to zone data: `difficulty` (threat), the two chances (clamped), pass count, bracket range 0.17, the pad of 1, the spawn-safe radius, the wall angle 70, and the list of parts with tier and resource.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the camp is a zone file read by one runtime); row 23 for zone content placement; one seed gives one camp on server and client.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Server-verified: the camp's parts are structures a player can attack, so the server must place them. The client must never place them. The donor places them inside the sector generator (SerpuloPlanetGenerator.java 725-726); Frankendom must place them on the server from the zone seed.
- Difficulty comes from `sector.threat` (SP 633). Frankendom has no sector threat; the zone file must carry the number directly.
- The donor's loadout gives a core every item (66-69). That is a sandbox rule and must not be ported: it would give enemies every item.
- Parts depend on a resource tile. Frankendom's zones have resource nodes only if the zone data defines them; the anchor rule needs a node list per zone.
- The 1-tile pad and the spawn-safe radius are the only collision rules here. Hit boxes, walking paths for the player, and the camera's line of sight are not checked by this code.
- Wall rule (line 115) depends on the spawn direction, so it needs the spawn point as zone data. Its geometry is read as code; it was not seen on screen (medium confidence).
- Landmarks, signage and minimap: none of them in these files (not read).
