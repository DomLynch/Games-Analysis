# diasurgical-DevilutionX (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/towners.cpp` | Licence: Sustainable Use License 1.0 (`/mnt/frankendom-donors/diasurgical-DevilutionX/LICENSE.md`: use and distribution only for non-commercial purposes; not an OSI licence) | C++ | symbol `InitTowners`

Checked: `InitTowners` (760-801), `IsTownerPresent` (735-749), `InitTownerInfo` (92-105), `InitTownerFromData` (117-138), the `TownersData` behaviour table (684-701), the table loader `Source/tables/townerdat.cpp` (98-130, read in full), the caller `LoadGameLevelTown` in `Source/diablo.cpp` (3238-3250), and the data file `assets/txtdata/towners/towners.tsv` (read in full: 12 data rows). Also read in full: `Source/levels/town.cpp` (389 lines; the town layout, used in section 2 and section 6). Callers: `InitTowners` has one caller in the code I read (`diablo.cpp:3246`); I did not grep for other callers. Camera scope: not applicable. Confidence: high on the placement order and the presence gate (read end to end); medium on whether the gates are re-checked during play (not read: `ProcessTowners` at 811-840 and the quest-done path in `TownDead` at 191-204 only partly read). Not read: the talk handlers (names only), `InitCows` (148-177), `InitCowFarmer` (178-190), the minimap in `Source/automap.cpp` (function list only).

## 1. Mechanism

- The town's service NPCs (blacksmith, healer, tavern keeper, witch, barmaid, storyteller, drunk, boy, a dead man, cows) are not placed in code. They come from a table, and one pass places them when the town loads.
- Order of steps, as the code runs: (a) load the table (765; the loader reads rows in file order, `tables/townerdat.cpp:107`). (b) build a lookup from the engine's own behaviour list, keyed by NPC type (767-772): each entry has a talk handler and an optional custom init. (c) take the first table name for each type (774-778); load the cow sprite sheet (780). (d) walk the table rows in file order (785). For each row: (i) presence gate `IsTownerPresent(type)` (786): a switch whose default is "present" (747), with a few special cases. The dead man is present unless the butcher quest is "not available" or "done" (738-739). The Hellfire farmer, cow farmer and girl depend on game flags and quest state (741-745). (ii) skip the row when the behaviour lookup fails or its entry is null (789-791). (iii) claim the tile: `dMonster[x][y] = i + 1` (795), where `i` is the count placed so far. (iv) create the towner: `InitTownerInfo` (798) sets type, name and position (97) and the talk handler; then the custom init runs if the entry has one (100-101, cows), otherwise the default (103): load the row's animation (path, frames, delay) and pick one gossip line at random from the row's list (135).
- Why the claim comes first: the comment at 793-794 says the value must be set before the init, "specifically for the cows that need to read this value to fill adjacent tiles". The cow comment (145) says cows occupy several tiles.
- Load order: `LoadGameLevelTown` calls `InitTowners` (diablo.cpp 3246) before the stash, the visual store, items and missiles (3247-3250).
- Tick: none. The pass runs once per town load. Per-frame animation is `ProcessTowners` (811), not read in full.

## 2. Key functions

- `InitTowners`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/towners.cpp` 760-801. The placement pass: load, behaviour lookup, name lookup, cow sprites, then the gated, claim-first loop.
- `IsTownerPresent`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/towners.cpp` 735-749. The presence gate, one case per special NPC; default present.
- `InitTownerInfo` and `InitTownerFromData`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/towners.cpp` 92-105 and 117-138. Per-towner setup from the row and the behaviour entry.
- Data: `/mnt/frankendom-donors/diasurgical-DevilutionX/assets/txtdata/towners/towners.tsv`. Columns: type, name, position x and y, direction, animation width, animation path, frames, delay, gossip list, animation order. Rows: one each for the blacksmith, healer, dead man, tavern keeper, storyteller, drunk, witch, barmaid and boy, plus three cow rows. The TSV has no rows for the Hellfire farmer, cow farmer or girl, although the code gates them (section 6).
- Context, town layout: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/levels/town.cpp`. `DrlgTPass3` (191-247) fills the town from four sector files at fixed offsets (202-205), places an automap layout over them (207-208), then writes closed or open landmark variants by state: warp gates (210-220, 228-238), the water quest fountain (240-244). `TownOpenHive` (283-333) overwrites the same tiles in place when the hive opens. `OpensHive` (251-256) is a bounding-box test on the tile position.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Placement table read in file order; each row is a service slot | 12 data rows in this table (count of the file's rows; theirs) |
| Presence gate before anything is created | Dead man: present unless the butcher quest is NOT_AVAILABLE or DONE (739). Theirs. |
| Claim the tile with (placed index + 1) before creating the NPC | Claim value = index + 1 (795). Theirs. |
| Skip a row with no behaviour, silently | Behaviour table is code (767-772) and the rows are data. Theirs. |
| One random pick from the row's gossip list | Random draw from a global generator (135). Theirs; not seeded per town. |
| Multi-tile NPC (cows) | "4 tiles for collision purposes" (145, comment; the cow code was not read) |
| Landmark variants by state | Warp gates and quest flags pick closed or open tiles (210, 240). Theirs. |

## 4. TypeScript sketch

simplified: keeps the donor order: rows in file order, presence gate first, then the behaviour check, then the tile claim (index + 1), then the NPC is created. It omits the animation load, the name lookup, the cow sprite sheet, the multi-tile cow case, the debug position lookup and the translated name. It changes one thing on purpose: the gossip draw is a passed-in seeded function instead of a global random draw, so every client agrees. It does not reject duplicate tiles; that is a gap (section 6), not in the sketch.

```ts
// Licence: Sustainable Use License 1.0 (donor, non-commercial use only). Clean-room sketch of the shape, not a translation.

export {};

type TownerType = 'smith' | 'healer' | 'tavern' | 'witch' | 'cow';

interface PlacementRow {               // one row of the data table, in file order
  type: TownerType;
  name: string;
  x: number;
  y: number;
  gossip: string[];
}

interface PlacedTowner {
  index: number;
  type: TownerType;
  name: string;
  x: number;
  y: number;
  gossip: string;
}

interface Hub {
  placed: PlacedTowner[];
  occupant: Map<string, number>;       // "x,y" -> placed index + 1 (claim)
}

// Place hub services in table order. A row is skipped when its presence gate is closed
// or the engine has no behaviour for its type. The tile is claimed before the towner is
// created, so later steps (for example a multi-tile animal filling its neighbours) can see it.
function placeHubServices(
  rows: PlacementRow[],
  isPresent: (type: TownerType) => boolean,
  hasBehaviour: (type: TownerType) => boolean,
  pickIndex: (n: number) => number,    // seeded draw, so every client agrees
): Hub {
  const hub: Hub = { placed: [], occupant: new Map<string, number>() };
  for (const row of rows) {
    if (!isPresent(row.type)) continue;
    if (!hasBehaviour(row.type)) continue;
    const key = `${row.x},${row.y}`;
    const index = hub.placed.length;
    hub.occupant.set(key, index + 1);
    const gossip = row.gossip.length > 0 ? row.gossip[pickIndex(row.gossip.length)] : '';
    hub.placed.push({ index, type: row.type, name: row.name, x: row.x, y: row.y, gossip });
  }
  return hub;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm012-place-hub-services.ts`: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: the zone population step (engine logic). Hub service NPCs would be placed there, on the server, from the zone's table (zone data), in the same pass that places the population. Parity-checklist row 23 (zone population).
- Frankendom module for hub NPC placement: not read in this pass (not read).
- Reuse tag: clean-room (Sustainable Use License 1.0 is non-commercial only; shape only, the sketch is written fresh)
- Brief rule served: addendum rules 1-6 (judged the idea: table-placed slots with a presence gate and a claim-first tile); Frankendom rulings: zones as data, server-verified, one ledger (the claim lives in server zone state). Camera and tick rules not applicable.

## 6. Gaps and risks

- Presence gates read quest state, and the donor evaluates them in one pass at town load (`InitTowners` runs only from `LoadGameLevelTown`, diablo.cpp 3246). Whether anything re-runs the gates during play was not read. Frankendom: re-check presence on zone entry, reading the server ledger. Do not let the client decide presence.
- The claim is a shared engine array (`dMonster`) written during placement. Frankendom: the claim belongs in the zone's server state, and the client never writes it.
- Duplicate tiles are not checked. Two rows on the same tile: the second claim overwrites the first (795), and nothing reports it. Fix: reject duplicate tiles at zone load, and fail loudly.
- A row with no behaviour is dropped without a message (789-791). A typo in the table silently removes a service. Fix: report it at load.
- The gossip pick uses the global generator (135), so clients can disagree. Fix: a seeded draw per zone and row, with the server sending the chosen line.
- The Hellfire farmer, cow farmer and girl are gated in code (741-745), but this table has no rows for them, and where they come from was not read. Do not copy the gates without rows.
- Multi-tile cows: "4 tiles" is a comment (145); the cow code was not read. Frankendom has MAX_ATTACKERS = 3, but towners do not attack, so that rule does not apply here.
- Adjacent landmark idea (not written as a note): `town.cpp` writes a closed landmark first and overwrites the same tiles with the open variant when a warp or quest flips (210-244, 283-333). Frankendom could use the same shape for a landmark that changes with quest state (zone data: closed tile set and open tile set). The donor does this in place without re-running the stitch; the open path also sends a network command (267), so the flip is authored by one side. Not built here.

Reuse tag: clean-room (Sustainable Use License 1.0; shape only)
Brief rule served: addendum rules 1-6; Frankendom rulings zones as data, server-verified, one ledger

Best transferable idea: Place hub services from a table in file order, skip rows whose presence gate is closed or whose behaviour is missing, and claim the tile before creating the NPC so multi-tile and neighbour logic can see it.
Decision (proposed): adapt - the table-placed, gated, claim-first shape fits zones as data; move the presence gate onto the server ledger, re-check it on zone entry, and reject duplicate tiles at load instead of overwriting.
Acceptance: Walking into the town shows the smith, healer and tavern keeper on their zone-data tiles; closing a quest's gate removes its NPC on the next zone entry; a server test asserts a duplicate tile fails at load and a row with no behaviour is reported.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
