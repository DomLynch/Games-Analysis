# flareteam-flare-game (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` (generator code, 972-1487) with its data in `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/maps/procgen_rules/iron_labyrinth.txt` and `iron_labyrinth/*.txt` | Licence: game data CC-BY-SA 3.0 ("All of the art and data files ... are released under CC-BY-SA 3.0. Later versions are permitted.", README.md 21); engine code GPL-3.0 or later (README.md 19, and the engine src). Both are copyleft: clean-room, shape only. | C++ (engine) with plain-text rules | symbol `Map::procGenFillArea` (with `Map::procGenCreatePath`, `Map::procGenWalkSingle`, `Map::load`)

Checked: The hint file (underworld_stronghold_1.tmx) is a Tiled source map: it holds enemy objects and properties, and the game does not load it (tiled/README.md says so). The zone-layout mechanism is the labyrinth generator, so the verdict is about the generator. Cross-repo: the code is in flareteam-flare-engine; the game repo holds the rules and room pieces. Read in full: Map.cpp 972-1198 (walk and main/branch path), 1200-1487 (procGenFillArea: settings, chunk loading, retry loop, branches, keys, chunk placement); Map.cpp 224-330 (load, cache and regeneration); Map.cpp 1630-1636 (cache path); Map.cpp 1644-1646 (isStraight); Map.h 162-198 (Chunk); game iron_labyrinth.txt (rules, all of it), iron_labyrinth_f1.txt (rules, 1 line); game room1, links1, treasure_room and f1/start headers (grep); iron_labyrinth_f1.txt event block 690-702. Read in part: FileParser.cpp 174-190 (INCLUDE, by grep). Not read: copyTileLayer and copyMapObjects (Map.cpp 1489-1629), the MapSaver write of the generated map, the EventManager parse of PROCGEN_LINK and PROCGEN_FILENAME, the other chunk files beyond their headers. Not run: no build, no generation run in the engine; the sketch was run on the VPS only. Confidence: high for the generator order, the rules and the ramps; medium for the key-chain reading (derived from door-level counting, not tested in the engine). Camera: not applicable. Cell N = list column value 3.

Best transferable idea: Zone layout as a seeded random walk on a grid of room pieces, with the rules in a small key=value file, doors on straight runs, one key per door placed before that door, and unique rooms placed once per campaign.
Decision (proposed): adapt - the rules file is a good shape for zones as data, and the key-before-door and unique-once rules are reusable progression gates; take the rules-as-data file and the placement rules, leave out the per-save-slot cache file (the server owns zone state) and fix the branch-length draw.
Acceptance: A seeded server test generates a zone with 2 doors, asserts a main path of length 10 to 20 from start to end, one key on the level before each door, that no unique room is placed twice, and that a regenerated zone with the same seed is identical.

## 1. Mechanism

- Zone data: a procedural region is an event with a rectangle and a rules file (iron_labyrinth_f1.txt, event block, `location=12,12,140,140` and `procgen_filename=...`, lines 698-699). The rules file pulls in the shared rules with INCLUDE (f1 line 1; FileParser.cpp 174-190 handles INCLUDE). The shared rules set doors_max 2, door_spacing_min 2, main path 10 to 20, 1000 attempts, branches 5 to 10 long, and at most 2 branches per door level (iron_labyrinth.txt 2-9).
- Chunks: each room file is a 28x28-tile map with a `procgen_type` (normal, links, key, door_north_south, door_west_east, start, end; see room1.txt 9, links1.txt 9, f1/start.txt 9). The first chunk file read sets the grid: the 140-tile region divided by the 28-tile chunk gives a 5x5 grid (Map.cpp 1274-1278). Chunk files are read into lists by type (1269-1283).
- Load and cache: `Map::load` (224-330) checks for a cached generated map in the save slot (path at 1633: user path, save prefix, game slot, hashed map name). If the cache exists and the reset status is not set, it loads the cache (306-307). Otherwise it generates (311) and saves the result (315).
- Main path (`procGenCreatePath`, 1017-1198): the grid is cleared (1026-1035), a random start cell is chosen (1044-1045) and marked start (1053-1054). Each step draws a random link and rotates to a free one, up to four tries (1071-1086), then applies the door-direction rule (1088-1100). The step is `procGenWalkSingle` (972-1015): it is refused if the target is start, end or a door (991-996), or is not empty on the main path (1000-1003). A cell that already has links can be joined only with chance 1 in its link count, and only on the same door level (1011). A refused step still spends one step (the loop decrements `steps` at 1187 either way), so the path length counts moves.
- Doors (1149-1173): a door replaces the cell just left if that cell is a straight run (`isStraight`, 1644-1646), is not the start, the door count is below doors_max, and a ramp chance hits (1151). The first door's chance is forced to 100 once the distance since the last door passes the minimum (1168-1170); after that the chance rises by 5 per step (1172). The door cell and the cell after it both gain a door level (1160-1161), and the level is copied forward (1184).
- Branches (1175-1181): on a normal cell, a branch root is recorded if a chance roll hits and the branch count is under the limit. The chance starts at 50, resets to 50 after a root, and rises by 5 per step (1177, 1181). After about ten steps without a root the chance is 100, so the limit alone decides.
- Main retry (1332-1336): the path is regenerated up to the attempt limit until its length is in range and it has at least one door. The desired length is drawn once before the loop (1330).
- Branch walks (1339-1343): each root gets a branch walk with the same walk rules, but without doors or new roots.
- Keys (1347-1375): normal cells are grouped by door level (1352-1353). For each door, one normal cell on that level becomes a key (1371-1373). Door level 0 is before the first door, so the first key is before the first door.
- Unique rooms (1388-1422): a chunk type is only given a map that is not already marked used in the campaign (1391-1392). A chosen unique room sets its campaign status when placed (1420-1422). Rooms with `procgen_unique_status` are treasure_room, vendor_room and warp_room (treasure_room.txt 10).
- Variant choice (1402-1416): a random variant of the chunk type is picked, nudged once if it matches the west or north neighbour (1404-1414).
- Placement (1430-1477): the chunk's tiles are copied at its grid offset, and the link strips from a links chunk are copied on each side that has a link (link rectangles from `procgen_link` events, 1292, lines 153-171 of links1.txt). The start chunk sets the hero position (1433-1436). Copy bodies were not read.

## 2. Key functions

- `Map::procGenWalkSingle`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 972-1015 (step refusal and link-join chance).
- `Map::procGenCreatePath`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 1017-1198 (random walk, door and branch ramps, end marking).
- `Map::procGenFillArea`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 1200-1487 (rules read, grid size, retry loop, branch walks, keys, unique and variant choice, placement).
- `Map::load`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 224-330 (cache or regenerate and save).
- `Chunk`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.h` 162-198.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Main path length drawn once in a range, retried until in range and with a door | Range 10 to 20, 1000 attempts (theirs, iron_labyrinth.txt 4-6; draw at Map.cpp 1330) |
| Doors per layout | At most 2 (theirs, iron_labyrinth.txt 2) |
| Minimum distance between doors | Minimum 2 (theirs, iron_labyrinth.txt 3; Map.cpp 1063) |
| First door forced once past the minimum | Chance 100 (theirs, Map.cpp 1170); later doors ramp +5 per step (theirs, Map.cpp 1172) |
| Branch roots with a ramp, reset on success | Start 50, +5 per step, reset to 50 (theirs, Map.cpp 1175-1181) |
| Branch count per door level | At most 2 (theirs, iron_labyrinth.txt 9) |
| Branch length | Range 5 to 10 in the rules (theirs, iron_labyrinth.txt 7-8), but the donor draws only the minimum (theirs, Map.cpp 1340) |
| Join an existing cell | Chance 1 in the cell's link count, same door level only (theirs, Map.cpp 1011) |
| Chunk size and grid | 28-tile rooms (theirs, room1.txt 2-3); region 140 tiles gives 5 per side (theirs, iron_labyrinth_f1.txt 698) |

Zone data versus engine rule: every number in the rules file is zone data. The ramps (50, +5, 100, 1 in link count) and the door-direction rule are engine rules.

## 4. TypeScript sketch

simplified: The sketch keeps the random start, the random link with up to four rotations, the step refusals (start, end, door, occupied on the main path, and the 1-in-link-count join), the door placement with the first-door forcing and the +5 ramp, the branch-root ramp, the retry loop, the branch walks and one key per door on the level before it. It omits the door-direction rule on door cells (Map.cpp 1088-1100), the variant anti-repeat nudge, the unique-room statuses, the chunk copying and link strips, the cache file and the save slot, and the defaults the donor applies when a rule is 0. It differs in one place on purpose: it draws branch length from the intended range (branch_min to branch_max), where the donor draws only branch_min (Map.cpp 1340), a defect this note does not keep. Tested only on the VPS with 200 seeded runs (doors at most 2, keys at most doors, one start, one end).

```ts
// Licence: GPL-3.0-or-later (engine code) and CC-BY-SA 3.0 (game data). clean-room sketch written from the described mechanism, not a translation of either.
// clean-room
type Kind = "empty" | "normal" | "start" | "end" | "door" | "key";

interface Cell {
  kind: Kind;
  doorLevel: number;
  links: (Cell | null)[];   // N, S, W, E
  x: number;
  y: number;
}

interface Rules {
  mainMin: number;           // zone data
  mainMax: number;           // zone data
  mainAttemptsMax: number;   // zone data
  doorsMax: number;          // zone data
  doorSpacingMin: number;    // zone data, chunks
  branchesPerLevelMax: number; // zone data
  branchMin: number;         // zone data
  branchMax: number;         // zone data
}

const DX = [0, 0, -1, 1];
const DY = [-1, 1, 0, 0];
const OPP = [1, 0, 3, 2];

function makeGrid(w: number, h: number): Cell[][] {
  const g: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < w; x++) {
      row.push({ kind: "empty", doorLevel: 0, links: [null, null, null, null], x, y });
    }
    g.push(row);
  }
  return g;
}

function linkCount(c: Cell): number {
  return c.links.filter((l) => l !== null).length;
}

function isStraight(c: Cell): boolean {
  const ns = c.links[0] !== null && c.links[1] !== null && c.links[2] === null && c.links[3] === null;
  const we = c.links[0] === null && c.links[1] === null && c.links[2] !== null && c.links[3] !== null;
  return ns || we;
}

// One step from `from` in direction d. Returns the cell to move to, or `from` if the step is refused.
function walkStep(g: Cell[][], from: Cell, d: number, isMain: boolean, rnd: () => number): Cell {
  const nx = from.x + DX[d];
  const ny = from.y + DY[d];
  if (ny < 0 || ny >= g.length || nx < 0 || nx >= g[0].length) return from;
  const next = g[ny][nx];
  if (next.kind === "start" || next.kind === "end" || next.kind === "door") return from;
  if (isMain && next.kind !== "empty") return from;    // main path never overlaps
  const n = linkCount(next);
  // A branch may join an existing cell: it succeeds with chance 1/n when n links exist, and only on the same door level.
  if (n > 0 && (next.doorLevel !== from.doorLevel || Math.floor(rnd() * n) > 0)) return from;
  return next;
}

interface PathResult { length: number; doors: number; roots: Cell[]; }

function walkPath(g: Cell[][], start: Cell, steps: number, isMain: boolean, rules: Rules, rnd: () => number): PathResult {
  let cur = start;
  let length = 1;
  let doors = 0;
  let doorChance = 0;
  let doorDist = 0;
  let branchChance = 50;
  let branchCount = 0;
  const roots: Cell[] = [];
  const doorMinDist = rules.doorSpacingMin > 0
    ? Math.max(2, rules.doorSpacingMin)
    : rules.doorsMax > 0 ? Math.max(2, Math.floor(steps / rules.doorsMax)) : 0;

  for (let s = steps; s >= 0; s--) {
    const prev = cur;
    // Random link, then rotate to a free one (at most four tries).
    let d = Math.floor(rnd() * 4);
    const rot = rnd() < 0.5 ? 1 : -1;
    for (let k = 0; k < 4 && prev.links[d] !== null; k++) d = (d + rot + 4) % 4;

    const next = walkStep(g, prev, d, isMain, rnd);
    if (next !== prev) {
      prev.links[d] = next;
      next.links[OPP[d]] = prev;
      next.kind = "normal";
      cur = next;
      doorDist++;
      length++;

      if (isMain) {
        // A door may replace the cell just left, if that cell is a straight run and the ramp chance hits.
        if (prev.kind !== "start" && isStraight(prev) && doors < rules.doorsMax && Math.floor(rnd() * 100) < doorChance) {
          prev.kind = "door";
          prev.doorLevel++;
          next.doorLevel++;
          doorChance = 0;
          doors++;
          doorDist = 0;
          branchCount = 0;
        }
        if (doorDist > doorMinDist) {
          doorChance = doors === 0 ? 100 : doorChance + 5;   // ramp: first door forced once past the minimum distance
        }
        if (cur.kind === "normal" && branchCount < rules.branchesPerLevelMax && Math.floor(rnd() * 100) < branchChance) {
          roots.push(cur);
          branchChance = 50;
          branchCount++;
        }
        branchChance += 5;   // ramp: after about ten steps without a branch the chance is 100
      }
      next.doorLevel = prev.doorLevel;
    }
  }
  if (isMain) cur.kind = "end";
  return { length, doors, roots };
}

export function generate(w: number, h: number, rules: Rules, rnd: () => number): { grid: Cell[][]; mainLength: number; doors: number } {
  const minLen = Math.max(3, rules.mainMin);
  const maxLen = Math.max(minLen, rules.mainMax);
  const desired = minLen + Math.floor(rnd() * (maxLen - minLen + 1));   // drawn once, as the donor does

  let grid = makeGrid(w, h);
  let main: PathResult = { length: 0, doors: 0, roots: [] };
  for (let attempt = 0; attempt < rules.mainAttemptsMax; attempt++) {
    grid = makeGrid(w, h);
    const start = grid[Math.floor(rnd() * h)][Math.floor(rnd() * w)];
    start.kind = "start";
    main = walkPath(grid, start, desired, true, rules, rnd);
    const lengthOk = main.length >= minLen && main.length <= maxLen;
    const doorsOk = main.doors > 0 || rules.doorsMax === 0;
    if (lengthOk && doorsOk) break;
  }

  for (const root of main.roots) {
    // Intended range. The donor draws only branch_min here (Map.cpp 1340).
    const len = rules.branchMin + Math.floor(rnd() * (rules.branchMax - rules.branchMin + 1));
    walkPath(grid, root, len, false, rules, rnd);
  }

  // One key per door, on a normal cell of the door level before that door.
  for (let i = 0; i < main.doors; i++) {
    const pool: Cell[] = [];
    for (const row of grid) {
      for (const c of row) {
        if (c.kind === "normal" && c.doorLevel === i) pool.push(c);
      }
    }
    if (pool.length === 0) continue;
    pool[Math.floor(rnd() * pool.length)].kind = "key";
  }

  return { grid, mainLength: main.length, doors: main.doors };
}
```

## 5. Lands in

- TARGET `origins/server/zone-layout.ts` (new module, proposed): a seeded generator for zone layout, reading a rules record as zone data, with the server owning the result. The donor's rules file maps to a zone-data record; the rooms map to zone chunks.
- Parity row: none fits exactly. Row 23 is zone population (spawn caps, respawn, despawn), and this donor generates layout, not population. Row 23 is the nearest row because the generator copies enemy groups with the room chunks and gates progression with keys and doors. Plainly: no row covers layout generation, so this would need a new parity row before it is built.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later for the engine code, CC-BY-SA 3.0 for the game data; clean-room only)
- Brief rule served: zones as data (rule). The generator is a feature for later and does not touch the fight engine.

## 6. Gaps and risks

- Copyleft on both code and data: clean-room only. The sketch is written from the described mechanism, not from the lines.
- Branch length defect: the rules say a branch is 5 to 10 steps, but the draw uses `std::min(branch_length_min, branch_length_max)` as the upper bound (Map.cpp 1340), so every branch is 5 steps. The idea (a ranged branch length) is kept in the sketch; the defect is not. Frankendom's data must not copy the bug.
- Keys form a linear chain: each key sits in the stretch before its own door (door level counting, Map.cpp 1160-1161, 1184, 1352, 1371). Behind door N lies key N+1, so a player who cannot get past an early door cannot reach the next key. This is intended, but it is a progression rule, and Frankendom needs to decide it as a rule, not an accident.
- Unique rooms are per campaign, not per zone: once placed, the room's status stays set (Map.cpp 1420-1422), so the same unique room is not placed again in that campaign, even after regeneration (the reset status regenerates the layout, and the code read does not clear the unique status). Frankendom must decide whether a zone reset should free unique rooms.
- The cache is per save slot and map name (Map.cpp 1633), and a generated layout is only regenerated when a reset status is set (306). Frankendom's server owns zone state, so the file cache is not a model to copy; a seed plus a stored result is.
- The attempts limit (1000) can end with a layout that does not meet the length or door rule: the loop exits when the limit is reached (Map.cpp 1332-1336). The donor logs the final length and attempt count (1337) but does not treat a miss as an error, and the grid is used anyway. Frankendom must check the result and report a failed layout.
- The door-direction rule on door cells (Map.cpp 1088-1100) was not ported in the sketch; it matters for door cells on straight runs.
- Not read: copyTileLayer and copyMapObjects (Map.cpp 1489-1629), the save of the generated map, the PROCGEN_LINK and PROCGEN_FILENAME event parse, and the body of the chunk files. The engine was not run.
