# alexbatalov-fallout2-ce (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md, same wording as the Fallout 1 box: internal business or non-commercial use only; source-available, not OSI; restricted) | C++ | symbol `wmMarkSubTileRadiusVisited`

Checked: The list's hint file `src/worldmap.h` is the wrong file (it holds the enums `CityState` and `City` and prototypes, lines 259-266). The mechanism is in `src/worldmap.cc`: `wmMarkSubTileRadiusVisited` (5064-5072, read in full), `wmSubTileMarkRadiusVisited` (from 5076, read in full through the fill switch), `wmMarkSubTileOffsetVisitedFunc` (from 5006, read in full), `wmAreaMarkVisitedState` (from 5641, read to the return), the walk call site (3094), the city-entry branch (3144-3155), the encounter gate `wmRndEncounterOccurred` (from 3322, read to 3341), and the structs `SubtileInfo`, `TileInfo`, `EntranceInfo`, `CityInfo` (227-370). Data half: the donor box has no data files (no worldmap or area text tables; only CMake files under `src/` and `third_party/`), so the table values per city and per tile are NOT in the box; only the loader's parser was read (`wmParseSubTileInfo`, from 1943). Not read: `wmAreaSlotInit` and `wmEntranceSlotInit` (the entrance loader body), `wmMatchEntranceFromMap`, `wmFindCurSubTileFromPos`, `wmTownMapFunc`, the walking loop beyond 3094, `wmRndEncounterPick`, the draw code for fills N, E and the diagonals. Confidence: high on the reveal and the fill rules; medium on what each visited-state number means for the city (only the transitions were read); high that the encounter gate is as quoted.

## 1. Mechanism

- The world map is a grid of map tiles, each tile 350 by 300 units (96, 99 and the tile comment at 364). Each tile holds 7 by 6 subtiles of 50 units (64, 65, 99). A subtile record has terrain, a fill direction, encounter chances for three day parts, an encounter type, and a state (356; state enum at 187).
- Walking (3094): each step of the walk loop calls `wmMarkSubTileRadiusVisited` with the party position. Order of steps inside it: (a) a known ring is marked around the walker, radius 1, or radius 2 when the Scout perk is held (5066-5068; 5092 inside the double loop); (b) the walker's own subtile becomes VISITED (5097); (c) a fill-direction corridor (5099-5110): fill_s marks every subtile above it in the same tile column as visited (5101-5103); fill_w marks every subtile to its left in the row, then the whole row of the tile to the west (5106-5112). No other fill has a case in this function.
- The state rule (5056): a KNOWN write only changes UNKNOWN; a VISITED write always wins, so a stood-on subtile is never downgraded to known. The offset helper wraps X and Y across tile edges (5025 and neighbours) and returns -1 at the map edge.
- Cities: `wmAreaMarkVisitedState` (5641) reveals a radius around a city's centre when the city is KNOWN (5650), then sets the city's visited value. The visited value is also set on entry: the first entry picks the first valid map and sets visited to 2 (3155); later entries with visited 2 and a map go to the town map directly (3144).
- Each city holds a name, a world position, a size (small, medium, large), state (UNKNOWN, KNOWN, VISITED), a lock state, a visited value, a map and label id, and up to 10 entrances. Each entrance holds state, x, y, map, elevation, tile and rotation (227-237; cap at 57).
- Encounters (from 3322, read to 3341): the roll is skipped if less than 1500 ms since the last stamp (3325); the stamp is written at 3329 before the distance gates; the roll is skipped when the move is under 3 units on the x axis (3331) or on the y axis (3335); it is skipped when the walker is inside a city area (3341).
- Day parts and frequencies: the subtile encounter chance is one of none, rare, uncommon, common, frequent, forced (604), parsed per day part (1957). A table of day-part modifiers has three values, 40, 30 and 0 (570; values on lines 571-573 are too short to receipt).

## 2. Key functions

- `wmMarkSubTileRadiusVisited`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 5064-5072. Radius choice (1, or 2 with Scout).
- `wmSubTileMarkRadiusVisited`: same file, from 5076. Known ring, walker visited, fill_s and fill_w corridors.
- `wmMarkSubTileOffsetVisitedFunc`: same file, from 5006. Cross-tile offset and the never-downgrade rule (5056).
- `wmAreaMarkVisitedState`: same file, from 5641. Reveal around a known city centre; visited value.
- Walk call site: same file, 3094 (inside the walk loop; the loop header was not read). Reveal every step.
- `wmRndEncounterOccurred`: same file, from 3322 (read to 3341). Rate limit, per-axis move gate, city gate.
- `wmParseSubTileInfo`: same file, from 1943. Subtile record parser (terrain, fill, three chances, type).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Known ring around the walker, stood-on subtile visited | Ring radius 1 (5066); radius 2 with Scout (5068) |
| Known never downgrades visited | Rule at 5056 |
| Directional corridor on fill | fill_s: rows above, same tile (5101); fill_w: row to the left, crosses into the western tile (5106-5112) |
| Map grid | Subtile 50 units (99); 7 by 6 subtiles per tile (64, 65); tile 350 wide (96) |
| Cities as data | Up to 10 entrances per city (57); city size enum small, medium, large (CitySize, worldmap.cc 225) |
| Encounter rate limit | 1500 ms (3325); stamped at 3329 before the gates |
| Encounter move gate | 3 units per axis (3331, 3335) |
| Encounter chance per day part | Frequency words (604); day-part modifiers 40, 30, 0 (570) |

## 4. TypeScript sketch

simplified: the sketch uses one flat subtile grid instead of tile records and tile-local indices, so the cross-tile wrap in the donor becomes a plain bounds check. It keeps the ring, the visited-wins rule, the scout radius and the corridor for fill s and fill w. It changes one thing on purpose: the donor's fill_s stops at the tile edge, while fill_w crosses into the next tile; the sketch runs fill_s to the grid edge (marked fix in the code). It also changes the encounter gate: the donor stamps its timer before the distance and city gates, and the sketch stamps only when a roll is allowed (fix). It omits the subtile terrain, the encounter chance table and the entrance and city records, the town map entry, all drawing, and the fill_n, fill_e and diagonal directions, which the donor does not act on in this function.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SUB = 50;             // subtile size in world units (donor: WM_SUBTILE_SIZE 50)
const SUB_PER_TILE_X = 7;   // subtiles per map tile across (donor: SUBTILE_GRID_WIDTH 7)
const SUB_PER_TILE_Y = 6;   // subtiles per map tile down (donor: SUBTILE_GRID_HEIGHT 6)
const RND_GAP_MS = 1500;    // minimum time between encounter rolls (donor: 1500)
const MIN_STEP = 3;         // minimum move on each axis before a roll (donor: 3)

enum Known { Unknown = 0, Known = 1, Visited = 2 }
type Fill = "none" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

class SubtileMap {
  readonly state: Uint8Array;
  constructor(readonly w: number, readonly h: number, readonly fill: Fill[]) {
    this.state = new Uint8Array(w * h);
  }
  private idx(x: number, y: number): number { return y * this.w + x; }
  private inside(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  // Known never downgrades Visited; Visited always wins.
  mark(x: number, y: number, s: Known): void {
    if (!this.inside(x, y)) return;
    const k = this.idx(x, y);
    if (s !== Known.Known || this.state[k] === Known.Unknown) this.state[k] = s;
  }

  // One walker step: a known ring around the walker, then the stood-on subtile becomes visited,
  // then a directional corridor for fills s and w (the only two fills the donor acts on).
  step(px: number, py: number, scout: boolean): void {
    const sx = Math.floor(px / SUB);
    const sy = Math.floor(py / SUB);
    const r = scout ? 2 : 1;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) this.mark(sx + dx, sy + dy, Known.Known);
    }
    this.mark(sx, sy, Known.Visited);
    const f = this.fill[this.idx(sx, sy)];
    if (f === "s") {
      // fix: the corridor runs to the grid edge; the donor stops at the tile edge here but crosses it for fill_w
      for (let y = sy - 1; y >= 0; y--) this.mark(sx, y, Known.Visited);
    } else if (f === "w") {
      for (let x = sx - 1; x >= 0; x--) this.mark(x, sy, Known.Visited);
    }
  }
}

// Encounter rolls: at most one per RND_GAP_MS, only after a move of MIN_STEP on both axes,
// and never while inside a city area.
class EncounterGate {
  private last = Number.NEGATIVE_INFINITY;
  // fix: the timer is stamped only when a roll is allowed (the donor stamps it before the distance and city gates)
  allow(nowMs: number, dx: number, dy: number, inCityArea: boolean): boolean {
    if (nowMs - this.last < RND_GAP_MS) return false;
    if (Math.abs(dx) < MIN_STEP || Math.abs(dy) < MIN_STEP) return false;
    if (inCityArea) return false;
    this.last = nowMs;
    return true;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/world/fog-subtiles.ts` (new, proposed path): the subtile known and visited grid, the corridor rule, and the encounter gate. The grid is client-side HUD state; the encounter roll is a server decision (one ledger).
- Parity row 23 (zone population): the encounter gate and the per-subtile encounter chance are the zone population hooks (spawn caps and cooldowns). The fog itself belongs under row 14 (HUD) if split.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: clean-room, shape only)
- Brief rule served: zones as data (subtile terrain, chances and entrances are per-zone records); server tick (the encounter cooldown is a tick rule, not a client timer).

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows internal business or non-commercial use only (LICENSE.md, line 15). Clean-room, shape only; no donor line is copied. Dom to rule whether shape-only reuse of a restricted-licence donor is acceptable.
- Data missing from the box: the donor has no worldmap or area data files, so the city positions, the subtile maps and the entrance tables cannot be read. The parser for subtile records was read (1943-1960); the values were not.
- Defect, fill_s: the corridor stops at the tile edge (5101-5103) while fill_w crosses into the western tile (5106-5112). Fix: one rule for both (done in the sketch: runs to the grid edge).
- Defect, encounter timer: the timer is stamped at 3329 before the distance gates (3331, 3335) and the city gate (3341). A refused step still uses up the 1500 ms window. Fix: stamp only on an allowed roll (done in the sketch).
- Fill directions: only fill_s and fill_w have effects in this function. fill_n, fill_e and the diagonals were not read in any other function, so their meaning in the draw code is unknown (not read). Do not assume symmetry without a data table.
- Visited values 0, 1 and 2 for cities: only the transitions were read (3073-3074 for the car location, 3144-3155 for entry, 5650 for the reveal). Their full meaning is not confirmed (not read).
- Frankendom rulings: the encounter roll must be decided on the server (server-verified, one ledger), and the fog is client-only HUD. The donor runs both in one process; the rate limit is wall-clock (`getTicks`), which is not a server tick. Frankendom should count the cooldown in server ticks.
- MAX_ATTACKERS = 3 does not apply to this topic.

Best transferable idea: a two-state subtile fog (a known ring around the walker, the stood-on subtile visited and never downgraded) with a corridor rule for directional fills, and encounter rolls gated by a cooldown and a per-axis move.

Decision (proposed): adapt — take the two-state fog, the never-downgrade rule and the corridor rule, written from scratch, with the fill_s edge defect and the stamp-before-gates quirk fixed; reject wall-clock cooldowns, which conflict with the server-tick ruling (count cooldowns in ticks).
Acceptance: a test player walking a zone reveals a 3x3 known ring (5x5 with a scout test perk), the stood-on subtile stays visited after the walker leaves, a fill_s corridor is visible to the grid edge after one step, and a server test shows no encounter roll inside a city area and at most one roll per cooldown in server ticks.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room, shape only)
Brief rule served: zones as data; server tick (cooldowns in ticks, roll decided on the server)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
