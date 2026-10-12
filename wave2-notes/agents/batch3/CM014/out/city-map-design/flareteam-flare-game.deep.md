# flareteam-flare-game (city-map-design, cell 3)

Donor: engine code `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` (procedural layout 972-1487; `Chunk::isStraight` 1644), with the data halves `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/maps/procgen_rules/iron_labyrinth.txt` (rules), `.../maps/iron_labyrinth/vendor_room.txt` and `key1.txt` (chunk types), and `/mnt/frankendom-donors/flareteam-flare-game/tiled/empyrean_campaign/black_oak_city.tmx` (the authored city, plus its exported `mods/empyrean_campaign/maps/black_oak_city.txt`) | Licence: engine code GPL-3.0-or-later (Map.cpp header lines 10-11); game data repo CC-BY-SA 3.0 Unported (LICENSE.txt line 3), so the data is clean-room shape only | C++ (engine) + Tiled/flare text data | symbol `Map::procGenCreatePath`

Checked: Halves read. Code: Map.cpp 972-1198 (walk and path), 1200-1343 (rules, chunk pools, link ports, main-path attempts, branches), 1344-1478 (keys, variant pick, placement), 1489-1530 (tile and object copy helpers), 484-486 and 605-623 (unique status and enemy group keys), 1644-1646 (isStraight); Map.h 162-198 (chunk types and link enum); UtilsMath.h 45-53 (randBetween). Data: the whole iron_labyrinth.txt rules file, the procgen lines of vendor_room.txt and key1.txt, black_oak_city.tmx (layers, the event group 352-410, the enemy group 588-600, and object counts by grep: 53 objects, 35 events, 18 enemy zones), and the exported black_oak_city.txt (grep: 18 [enemy] blocks, 35 [event] blocks). Not read: the campaign status code (`camp->checkStatus` and `setStatus`), `Map::load` for the procgen cache, the code that spawns from `numbermin` and `numbermax`, `npcs/il_loren.txt` (the vendor NPC: so the vendor's services are not verified), the other chunk files, and the tile art. Confidence: high on the generator order (read in full); medium on what the vendor room offers (the placement is read; the NPC is not). The city map itself has no hub, service, sign or landmark objects, so the city half of this cell is a negative finding; the transferable part is the generator. Camera scope: n/a.

## 1. Mechanism

The generator lays a region out as a grid of prebuilt chunks, each with four link sides. It walks a main path from a random start, adds doors and branches, then fills each cell with a chunk variant.

Rules (data, iron_labyrinth.txt lines 2-9): doors_max 2, door_spacing_min 2, main path 10 to 20 chunks, 1000 attempts, branches 5 to 10 chunks, 2 branches per door level. Chunk pools (lines 11-40) are sorted by `procgen_type`: links, key, normal, and the two door types.

1. Setup: the grid size is the region size divided by the chunk size (Map.cpp 1275-1276, 1317). The four ports come from the first link chunk: regions named north, south, west and east (1287-1307; the comment at 1288 says only the first link chunk is used).
2. Main path: each attempt clears the grid (1024-1035) and starts at a random cell (1044-1045). The desired length is random between the min and max (1330). The attempt loop stops at the cap (1332), keeping the last path even if it is out of range (see gaps).
3. Step: pick a random direction (1071); if that link is taken, rotate up to four times (1075-1086). A neighbour is taken by `procGenWalkSingle` (972-1015): on the main path it must be empty; start, end and door cells block; a neighbour that already has k links is taken at odds 1/k and only on the same door level (1011).
4. Doors: once the walk has gone past the minimum spacing (1168), a straight cell may become a door (north-south or west-east) at a chance that starts at 100 for the first door and rises by 5 per step after that (1170-1172). A placed door raises the door level on both sides (1160-1161), resets the chance and the branch count (1162-1165). The minimum gap between doors is `door_spacing_min` (floored at 2) when the rules set one (1062-1064); the length-divided value (1061) is only the fallback.
5. Branches: on each normal cell the walk may record a branch root, at a chance that starts at 50, rises by 5 per step, and resets to 50 after a root (1066, 1181, 1177), with at most 2 roots per door level (1175).
6. Branches are grown from their roots with `procGenCreatePath` again, using a random length (1339-1341). The length call is defective (see gaps).
7. The last main-path cell becomes the end (1192).
8. Keys: for each door level, one normal chunk is drawn at random and removed from the list, then marked key (1362-1375).
9. Placement: each cell draws a variant from its type's pool, skipping any whose unique status is already set (1388-1400, 1391). It nudges away from a repeat of the west or north neighbour's variant, once (1404-1414). Setting the unique status on placement (1420-1422) keeps a once-per-campaign room from being offered again.
10. Ports: each placed chunk copies the tile layers and the objects inside the port rectangles of a link chunk variant chosen at random per chunk (1424-1428, 1441-1477).
11. The hero starts at the start cell's chunk position (1433-1436). The generated map is saved and reused unless the reset status is set (305-308). Fog of war is switched off while chunks load (1262-1264).

## 2. Key functions

- `Map::procGenWalkSingle`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 972-1015. The one-step acceptance rule: empty on the main path, blocked cells, odds 1/k, door level match.
- `Map::procGenCreatePath`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 1017-1198. Main path and branches, door chance, branch roots, end cell.
- `Map::procGenFillArea`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 1200-1487. Rules, pools, port rectangles, attempts, branch calls, keys, variant pick, placement.
- `Chunk::isStraight`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 1644-1646. A straight cell has north and south, or west and east, and nothing else.
- `Math::randBetween` (`UtilsMath.h` 45-49): inclusive integer range; the reversed-bounds case is not handled (see gaps).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Path length between min and max | Rules: min 10, max 20 (iron_labyrinth.txt 4-5); min clamped to at least 3 (Map.cpp 1325), max to at least min (1326) |
| Door count and spacing | doors_max 2 (rules 2); spacing min 2 (rules 3); min door distance starts as max(2, desired / doors_max) (1061) but is overwritten by max(2, door_spacing_min) whenever spacing is above 0 (1062-1064), so with the shipped rules (spacing 2) it is 2 |
| Door chance | 100 for the first door, then +5 per step (1170, 1172); 0 after a door (1162) |
| Branch chance | start 50 (1066); +5 per step (1181); reset 50 after a root (1177) |
| Branches | max 2 per door level (rules 9; 1175); length 5 to 10 intended (rules 7-8) |
| Walk acceptance | odds 1/k for a neighbour with k links (1011) |
| Attempt cap | 1000 (rules 6; 1332) |
| Key per level | one (1362-1375) |
| Unique rooms | vendor, treasure and warp rooms carry a campaign status (vendor_room.txt line 10) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: step with a random direction and rotation, neighbour acceptance, the main-path door chance and its ramp, branch roots and their chance, one key per door level without replacement, and unique-room status. It omits the door-direction restriction after a door (Map.cpp 1088-1100), the variant nudge (1404-1414), the port copy and object copy (1441-1477), the attempt loop and the rule that retries until the length and door count fit, the disk cache, and the fog switch. It replaces the global `rand()` with a seeded generator, and it swaps reversed bounds in `randBetween` (the donor does not). Branch length uses the fixed bounds, not the donor call that caps the upper bound at the min (1340).

```ts
// Licence: GPL-3.0-or-later (engine donor, Map.cpp) and CC-BY-SA 3.0 (game data donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "empty" | "normal" | "start" | "end" | "key" | "door_ns" | "door_we";
// links index: 0 = north, 1 = south, 2 = west, 3 = east (donor enum order, Map.h:178-181)
export interface Cell { kind: Kind; doorLevel: number; links: [boolean, boolean, boolean, boolean] }
export interface Pt { x: number; y: number }

const STEP: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const OPP = [1, 0, 3, 2];

// Seeded PRNG (mulberry32). The donor calls the global rand(); a Frankendom grammar must be reproducible.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inclusive integer range. Swaps reversed bounds; the donor helper (UtilsMath.h:45-48) does not.
export function randBetween(rng: () => number, lo: number, hi: number): number {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return a + Math.floor(rng() * (b - a + 1));
}

export function newGrid(w: number, h: number): Cell[][] {
  const g: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < w; x++) row.push({ kind: "empty", doorLevel: 0, links: [false, false, false, false] });
    g.push(row);
  }
  return g;
}

function linkCount(c: Cell): number {
  return c.links.filter((v) => v).length;
}

// A straight chunk is north+south only or west+east only (Map.cpp:1644-1646).
function isStraight(c: Cell): boolean {
  const [n, s, w, e] = c.links;
  return (n && s && !w && !e) || (!n && !s && w && e);
}

// One walk step (donor procGenWalkSingle, Map.cpp:972-1015). Returns the next cell or null (stay).
// Main path: the target must be empty. Any target: start, end and door cells block; a target with k links
// is taken only at odds 1/k and only on the same door level.
function walkTarget(grid: Cell[][], cur: Pt, d: number, mainPath: boolean, rng: () => number): Pt | null {
  const nx = cur.x + STEP[d][0];
  const ny = cur.y + STEP[d][1];
  if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) return null;
  const next = grid[ny][nx];
  if (next.kind === "start" || next.kind === "end" || next.kind === "door_ns" || next.kind === "door_we") return null;
  if (mainPath && next.kind !== "empty") return null;
  const k = linkCount(next);
  const prev = grid[cur.y][cur.x];
  if (k > 0 && (next.doorLevel !== prev.doorLevel || rng() * k >= 1)) return null;
  return { x: nx, y: ny };
}

export interface PathRules { mainPath: boolean; doorsMax: number; doorMinDist: number; maxBranches: number }
export interface PathResult { end: Pt; length: number; doors: number; branchRoots: Pt[] }

// Grow a path of up to `steps` steps (donor procGenCreatePath, Map.cpp:1017-1198). Door chance ramps; a
// branch root is recorded on a normal cell under a chance that starts at 50 and rises by 5 per step.
export function growPath(grid: Cell[][], start: Pt, steps: number, rng: () => number, rules: PathRules): PathResult {
  let cur: Pt = { x: start.x, y: start.y };
  let length = 1;
  let doors = 0;
  let doorChance = 0;
  let doorDist = 0;
  let branchChance = 50;
  let branchCount = 0;
  const branchRoots: Pt[] = [];
  if (rules.mainPath) grid[cur.y][cur.x].kind = "start";

  for (let s = steps; s >= 0; s--) {
    let d = Math.floor(rng() * 4);
    const rotate = rng() < 0.5 ? 1 : -1;
    for (let tries = 0; tries < 4 && grid[cur.y][cur.x].links[d]; tries++) d = (d + rotate + 4) % 4;

    const prev: Pt = { x: cur.x, y: cur.y };
    const target = walkTarget(grid, cur, d, rules.mainPath, rng);
    if (!target) continue;

    const from = grid[prev.y][prev.x];
    const to = grid[target.y][target.x];
    from.links[d] = true;
    to.links[OPP[d]] = true;
    to.kind = "normal";
    cur = target;
    length++;
    doorDist++;

    if (rules.mainPath) {
      if (from.kind !== "start" && isStraight(from) && doors < rules.doorsMax && rng() * 100 < doorChance) {
        from.kind = from.links[0] && from.links[1] ? "door_ns" : "door_we";
        from.doorLevel++;
        to.doorLevel++;
        doorChance = 0;
        doors++;
        doorDist = 0;
        branchCount = 0;
      }
      if (doorDist > rules.doorMinDist) doorChance = doors === 0 ? 100 : doorChance + 5;
      if (to.kind === "normal" && branchCount < rules.maxBranches && rng() * 100 < branchChance) {
        branchRoots.push({ x: cur.x, y: cur.y });
        branchChance = 50;
        branchCount++;
      }
      branchChance += 5;
    }
    to.doorLevel = from.doorLevel;
  }
  if (rules.mainPath) grid[cur.y][cur.x].kind = "end";
  return { end: cur, length, doors, branchRoots };
}

// One key per door level, drawn without replacement (donor Map.cpp:1362-1375).
export function placeKeys(grid: Cell[][], doors: number, rng: () => number): void {
  const levels: Cell[][] = [];
  for (let i = 0; i < doors; i++) levels.push([]);
  for (const row of grid) for (const c of row) if (c.kind === "normal" && c.doorLevel < doors) levels[c.doorLevel].push(c);
  for (const pool of levels) {
    if (pool.length === 0) continue;
    const i = Math.floor(rng() * pool.length);
    pool[i].kind = "key";
    pool.splice(i, 1);
  }
}

// Once-per-campaign service rooms (donor procgen_unique_status, Map.cpp:1391 and 1421): a room whose
// status is already set is never offered again. Returns the chosen room name, or null.
export function pickUnique(pool: { name: string; status: string }[], campaign: Set<string>, rng: () => number): string | null {
  const open = pool.filter((r) => !campaign.has(r.status));
  if (open.length === 0) return null;
  const pick = open[Math.floor(rng() * open.length)];
  campaign.add(pick.status);
  return pick.name;
}

// Branch length, fixed bounds (donor call at Map.cpp:1340 caps the upper bound at the min; this sketch does not).
export function branchLength(rng: () => number, min: number, max: number): number {
  return randBetween(rng, min, max);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (typecheck only; the sketch was not run).

## 5. Lands in

- TARGET `origins/server/zone-layout.ts` (proposed path; not verified against the Frankendom repo): server-side zone skeleton generation. Runs on the server with a seed, and the result (cells, the seed and the once-per-campaign statuses) is stored in the server's ledger.
- Parity-checklist row 23 (zone population). The batch hint says row 23. Row 23 covers spawn caps, respawn and despawn, and the generator places chunks, not spawns, so the match is loose. The enemy zones in the city file (category, level, number, see Mechanism and the data) are row 23 data and are the closest fit in this donor.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later code; CC-BY-SA data; clean-room only)
- Brief rule served: zones as data (the rules are a data file; chunk pools and link ports are data); one ledger (the unique-room statuses and the seed belong to the server ledger); server-verified state

## 6. Gaps and risks

- The donor is a labyrinth generator: doors, keys and branches are dungeon ideas. For a town, the port walk maps to road ends (north, south, east, west) and branches to side streets; door levels would gate districts, and keys are not needed. Drop what does not transfer; do not port the labyrinth wording.
- Defect (branch length, Map.cpp 1340): `Math::randBetween(branch_length_min, std::min(branch_length_min, branch_length_max))` caps the upper bound at the min. With the shipped rules (min 5, max 10; iron_labyrinth.txt 7-8) the call is `randBetween(5, 5)`, which always returns 5, so the authored max of 10 is never used. fix: `std::max(branch_length_min, branch_length_max)` as the upper bound. The idea (random branch length in a data range) is kept.
- Defect (randBetween with reversed bounds, UtilsMath.h 45-48): when min is above max, `rand() % (d + signum(d))` yields a value from minVal up to minVal + (minVal - maxVal), not a value between max and min. Only the branch call reaches it, and the fix above removes that path. fix: swap the bounds, or refuse reversed bounds at rules load. The sketch swaps.
- Risk (not run): each chunk picks its link variant at random (Map.cpp 1424-1428), so the two sides of a shared edge can be copied from different link files (the rules list links1 to links4, lines 12-15). Whether those link files agree at their ports was not read. fix: pick one link variant per edge, or per run, and store it on the cell.
- Risk: the attempt loop stops at the cap and keeps the last path even if the length or door count is out of range (1332-1336). fix: retry with a new seed, or fail the zone build.
- Risk: the variant nudge (1404-1414) moves once per neighbour and does not loop, so a repeat can remain. Acceptable if the layout is checked, but say so.
- Risk: the code uses the global, unseeded `rand()`, so a layout cannot be reproduced from a seed. fix: a seeded generator (the sketch uses mulberry32).
- Gap: the vendor room is a normal chunk with a unique status (vendor_room.txt lines 9-10). What the vendor sells is in `npcs/il_loren.txt` (not read), so the service half is unverified. The mechanism (one per campaign) is verified.
- The city TMX has no hub, service, sign or landmark objects. It is authored: chests with a map tile change on open (`mapmod`, one-shot via `repeat=false`), a portal to Black Oak Farm (`intermap`, on_trigger), ambient sounds on load, and 18 enemy zones. Those zones are rectangles in Tiled pixels that the export turns into tile units (74,45,8,13 for the first zone, which is 7104/96, 4320/96, 768/96, 1248/96; checked by arithmetic). The spawn code that reads `numbermin` and `numbermax` (Map.cpp 622-623) was not read.
- Frankendom gap: the donor stores the generated map on disk and reads it back (Map.cpp 305-308). Frankendom must keep the seed and the placed statuses on the server, not a client file.


Best transferable idea: Grow a zone skeleton as a random walk over prebuilt chunks with four matching ports, then place each one-off service room from a pool that drops a room once its campaign status is set.
Decision (proposed): adapt - the walk, the once-per-campaign room and the one-per-level pick are small and match zones as data; the labyrinth doors and keys are dungeon-only, and the disk cache and unseeded rand() do not fit a server-owned world.
Acceptance: a new town run builds a grid in which every road port lines up with its neighbour's port; exactly one vendor block is placed per campaign; a server test asserts that the same seed produces the same grid, and that the vendor room is not offered again once its status is set.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later code and CC-BY-SA data; clean-room only)
Brief rule served: zones as data (rules and pools are data); one ledger (seed and unique statuses on the server); server-verified state


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Table row 'min door distance max(2, desired/doors_max) (1061)' is not the effective value: Map.cpp:1062-1064 overwrites it with max(2, door_spacing_min)=2 whenever spacing>0 (shipped rules 3: spacing 2), so the desired/doors_max term never applies with the shipped rules. Everything else checked holds: walk accept rule 972-1015 (1/k, door level, start/end/door block), door chance 100 then +5 (1168-1172), reset at 1162-1165, branch chance 50/+5/reset (1066,1175-1181), keys 1362-1375, variant nudge 1404-1414, unique status 1391/1420-1422, branch length defect at 1340 (randBetween(5, min(5,10)) real), randBetween reversed-bounds defect real (UtilsMath.h:45-48), licence GPL header 9-11 and CC-BY-SA LICENSE line 3, rules file values, tmx counts 53/35/18, zone 74,45,8,13, number parse at 622-623. Not-read list honest.
Missed: Effective door spacing override (1062-1064). Door-direction restriction (1088-1100) is disclosed as omitted. No bigger mechanism missed.

Fixed 2026-10-12 (Sonnet fixer): effective door spacing corrected (verified Map.cpp 1061-1064). No sketch change (the sketch takes doorMinDist as a rule input).
