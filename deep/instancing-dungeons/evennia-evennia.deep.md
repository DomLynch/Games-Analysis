# evennia-evennia (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` | Licence: BSD-3 | Python | symbol `room_generator / EvAdventureDungeonBranch` | input line 162 verified: `room_generator` at 162 (closes at 202). `EvAdventureDungeonBranch` class at 204 (its `new_room` at 276-347, `delete` at 251-274). The input's line 162 matches `room_generator`.

## 1. Mechanism

- A dungeon is built lazily, one room at a time, as players walk into it. Each dungeon "branch" is a script with a grid of (x, y) coordinates. Inputs: the exit a player just walked through (its direction and the room it leads from), the branch's grid, and a budget of unexplored exits. Output: one new room at the next grid cell, a return exit back to where the player came from, and a few new open exits (placeholders) for rooms not yet made.
- Trigger: a player traverses an exit whose destination still points back to its own room. That exit calls `new_room` on the branch and registers the exit as traversed (`at_traverse` at 140-152; `register_exit_traversed`, 229-236, drops it from the unvisited list). The first traverse of a start-room exit creates the branch script and its first room, and tags the traversing character with the branch key (`at_traverse`, 373-393). The tag is added inside the create-branch block (378-391), so a later character passing through the same start exit after the branch exists is not tagged (read from the code, not run).
- Gating: a dungeon exit can be traversed only when the room is clear (a `not_clear` tag set at room creation, lock at 138, tag at 107; `clear_room` 109-110); a failed traverse says "You can't get through this way yet!" (154-159). The back exit is always traversable (lock `true()`, 316).
- `new_room` (276-347): sets the branch's last-updated time (284), then the new cell is the source cell plus the exit's grid shift (eight directions, 68-77; unknown key defaults to north). Depth = the integer radial distance of the new cell from the entrance (0, 0) (295). The room generator (`room_generator`, 162-202) turns depth into a name and description from a fixed table (ten named depths, 178-189, then a default, 190). The room is created with the depth-appropriate name, its coordinates and the branch as attributes.
- Exits: always a back exit to the source room (301-317). Then, if the branch has fewer unvisited exits than its budget (2, line 213), it opens a random 1 to 2 new exits (`max_new_exits_per_room`, 214) in shuffled directions, skipping the back direction and any cell already used or the entrance (319-345). The budget is a soft cap: with one exit unvisited it can still open two, giving three. Each new open exit reserves its target cell (set to none) so no two rooms link to the same cell (342-344).
- Collapse: the branch deleter runs on a timer and deletes any branch not updated for its maximum life (`at_repeat`, 409-420). `delete` (251-274) first sends every tagged character back to the start room with a message (256-268), then deletes the rooms (and with them the exits) and the branch (269-274).
- Tick: on demand (per traverse) for creation; a timer for the deleter and the start-room exit resetter (`EvAdventureStartRoomResetter.at_repeat`, 432-440: 50 % chance per start-room exit per interval to reset it so the next traverse makes a new branch).

## 2. Key functions

- `room_generator`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 162-202. Depth to name and description; creates the room object with coordinates and branch attributes.
- `EvAdventureDungeonBranch.new_room`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 276-347. Next cell, depth, room creation, back exit, budgeted open exits with reserved cells.
- `EvAdventureDungeonExit.at_traverse`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 140-152. On a not-yet-made destination, asks the branch for a room.
- `EvAdventureDungeonStartRoomExit.at_traverse` / `reset_exit`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 373-393 / 366-371. Creates the branch and tags the first character; resets an exit so the next traverse makes a new branch.
- `EvAdventureDungeonBranch.delete`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 251-274. Sends characters to the start room, deletes rooms, deletes the branch.
- `EvAdventureDungeonBranchDeleter.at_repeat`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 409-420. Finds branches not updated within the max life; deletes them.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lazy grid: create a cell when first entered; reserve neighbours without creating them | None (the rule) |
| Depth = integer radial distance from the entrance; depth sets difficulty and name | Depth table of ten names and descriptions (theirs, lines 178-189) |
| Exit budget: cap the number of open unexplored exits | `max_unexplored_exits` = 2 (theirs, line 213) |
| Open 1 to `max_new_exits_per_room` exits per room, random direction order | `max_new_exits_per_room` = 2 (theirs, line 214) |
| Collapse after idle time; eject players first, then delete | `branch_max_life` set at start-room creation (theirs, a setting; the attribute is at line 404, the setting site was not read) |
| Start-room exit resetter: 50 % chance per exit per interval | 0.5 (theirs, line 439) |

## 4. TypeScript sketch

simplified: the sketch uses four directions where the donor has eight (68-77), and a counter `unvisited` where the donor keeps a list of exit ids that is shortened when an exit is traversed (the sketch has no traversal step). It omits the room object and its attributes, the room-clear lock and tag, the back-exit object, the depth table, the branch script and its timestamp, the start-room exit, the collapse and ejection, and the start-room resetter. The donor's loop over `n_exits` pops directions until a free cell is found; the sketch does the same with `k` and the remaining list. The entrance exclusion (line 339) is in the sketch.

```ts
// Licence: BSD-3 (donor). Logic lifted in TypeScript from evennia/contrib/tutorials/evadventure/dungeon.py (new_room, room_generator); no imports.
type Cell = { x: number; y: number };
const SHIFT: Record<string, Cell> = { north: { x: 0, y: 1 }, east: { x: 1, y: 0 }, south: { x: 0, y: -1 }, west: { x: -1, y: 0 } };
const REVERSE: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east' };

interface Branch { grid: Map<string, boolean>; unvisited: number; maxUnvisited: number; maxNew: number; lastUpdated: number; }

const key = (c: Cell) => `${c.x},${c.y}`;

// Create the room at the cell an exit points to; open a budgeted number of new exits.
function newRoom(b: Branch, from: Cell, exitDir: string, rand: () => number): Cell {
  const d = SHIFT[exitDir] ?? { x: 0, y: 1 };
  const cell = { x: from.x + d.x, y: from.y + d.y };
  b.grid.set(key(cell), true);                       // room now exists
  const back = REVERSE[exitDir] ?? 'south';
  if (b.unvisited < b.maxUnvisited) {
    let n = Math.min(b.maxNew, b.maxUnvisited);
    if (n > 1) n = 1 + Math.floor(rand() * n);
    const dirs = Object.keys(SHIFT).filter(x => x !== back);
    for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
    for (let k = 0; k < n && dirs.length; ) {
      const dir = dirs.shift()!;
      const t = { x: cell.x + SHIFT[dir].x, y: cell.y + SHIFT[dir].y };
      if (!b.grid.has(key(t)) && !(t.x === 0 && t.y === 0)) { b.grid.set(key(t), false); b.unvisited++; k++; }   // reserve, not created; never back onto the entrance
    }
  }
  return cell;
}

// Depth = integer radial distance from the entrance (0, 0).
function depthOf(c: Cell): number { return Math.floor(Math.sqrt(c.x * c.x + c.y * c.y)); }
```

## 5. Lands in

- Frankendom target: `origins/zones/loader.ts` (the one place a zone's data package is read; `docs/specs/zone-runtime.md` takes the "static prototype versus live instance" model from FOnline: `loadZone(id)` returns the validated prototype and instances are created and destroyed on demand) for the lazy-grid generator, and `origins/presence/interest.ts` (`World.join`, layers with `softCap` 80, `hardCap` 100, `maxLayers` 8, and `emptyLayerMs` 5 minutes before an empty layer closes) for the collapse and assignment side. A grown-on-demand dungeon would be a NEW `origins/zones/grow.ts` (does not exist today) that returns a zone package from a template and a seed (`origins/world/generate.ts`). Files on the VPS snapshot /root/work-k7 (not main); headers, the README and `interest.ts` lines 8-70 read only.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: zones as data and instancing (`docs/specs/zone-runtime.md`; `docs/specs/origins/one-shard.md` §5 on layers), brief rule 10 (zone copies with soft cap and seeding).
- Reuse tag: adapt
- Brief rule served: 10 (zone copies with soft cap and seeding); rules 7-9 n/a

## 6. Gaps and risks

- BSD-3: the logic is lifted in the sketch with its path; the licence notice stays with the source.
- The donor's dungeon is a text-adventure grid of rooms, one room per exit. Frankendom's zones are pre-built maps with spawns; the lazy-room generator does not map to a Pit duel. It maps only to a procedurally grown zone copy, if one is ruled. Presence layers (same zone, separate visibility) already cover the crowd case.
- Collapse ejects tagged players to the start room, with a message. Frankendom's one-ledger and server-verified rules mean an eject must go through the server, and a zone copy must not lose a player's inventory on collapse. The donor tags only the character who creates the branch (391), so an untagged character inside a collapsing branch would be deleted along with the rooms; Frankendom must track membership from the server's zone-copy table.
- The depth table is a text-adventure theme (178-189). Frankendom must write its own depth-to-content data, under the zone-schema rule with defaults.
- The donor stores the grid in a database attribute with a `last_updated` timestamp and has no cap on the number of branches. Frankendom's copy store must be a server table with a soft cap and a hard cap, as `World.join` already does for layers.
- The reserved-cell trick (mark a cell before creating it) avoids two rooms linking to one cell. It is a sound pattern to keep if a grid is ever generated.
- Randomness is Python's `randint` and `shuffle` (326, 331), unseeded; Frankendom generation must be seeded per copy (rule 10) so every client and the server agree on the layout.
- Pit is a client only; MAX_ATTACKERS = 3 applies to any fight in a grown room, not to growth.
- Not read: lines 1-59 of dungeon.py (imports, aliases), the start room class and its creation (after 440), and where `branch_max_life` is set.
