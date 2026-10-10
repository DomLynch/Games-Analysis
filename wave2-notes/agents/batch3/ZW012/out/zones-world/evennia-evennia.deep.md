# evennia-evennia (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` (class `EvAdventureDungeonBranch`, method `new_room` 276-347; lifetime in `EvAdventureDungeonBranchDeleter` 396-420; start room 443-489) | Licence: BSD 3-Clause (LICENSE.txt line 1: "BSD 3-Clause License"; code may be adapted, the sketch below is a re-expression) | Python | symbol `EvAdventureDungeonBranch.new_room`

Checked: The hint was INFERRED (no hint file). Candidate files read: 3 (`evadventure/dungeon.py` read in pieces covering 1-489, including the constants 30-84, the generator 162-201, the branch 204-347, the exit 127-160, the deleter and resetter 396-442 and the start room 443-489; `grid/wilderness/wilderness.py` 190-470, 508-590 and 665-760, read in part, a second streaming mechanism, see below, not written up; `typeclasses/attributes.py` line 268). Grep only: `evadventure/rooms.py` (no tag calls in the file) and `grid/xyzgrid/*.py` (no "zone" match). Not read: the build script that creates the start room, `rooms.py` beyond the grep, the `EvAdventureDungeonStartRoom` build hooks beyond 443-489. Confidence: high on the generation and budget order (read end to end); high on the cleanup gap (checked by grep for every tag call; not run); medium on lifetime behaviour (read, not run). camera_scope: not a camera cell. Second mechanism noted but not written up: `grid/wilderness/wilderness.py` keeps each object's coordinate in a map and recycles a pool of room objects as views (`WildernessScript._create_room` 363-410, `_destroy_room` 411-452, `WildernessRoom.set_active_coordinates` 547-590); a good candidate for a later pass on streaming.

Best transferable idea: Generate a zone chain lazily as players step through its exits, keep a fixed budget of unexplored exits and reserve every coordinate, lock each area's onward exits until its encounter is cleared, and collapse an instance after it has been idle.
Decision (proposed): adapt — the lazy layout with a budget and reserved coordinates fits instanced zones, and the lock-until-cleared exit fits server-verified clears; but the donor's collapse is age-based, and its cleanup removes no rooms, so Frankendom takes the generator and the lock, and writes its own empty-with-grace despawn that really removes the instance's areas.
Acceptance: A player sees new areas only as they step through exits; the onward exit stays locked until the server confirms the encounter is cleared; once the instance has been empty for the grace period the server removes its areas and returns any stragglers to the entrance, and a server test asserts that the removed areas are gone, not only unreachable.

## 1. Mechanism

- Entrance (EvAdventureDungeonStartRoomExit.at_traverse, 373-395): if the exit still loops to its own room, the start exit creates a new branch script (key includes a timestamp, 381-383), generates its first room with `new_room`, and tags the traversing character with the branch key (391). Otherwise the exit already leads into an existing branch room.
- Lazy generation (Branch.new_room, 276-347): a player walks an exit whose destination is still the exit itself (a placeholder). `EvAdventureDungeonExit.at_traverse` (140-151) calls `new_room(self)` (149) and then `register_exit_traversed` (150), which removes the exit from the unvisited list (235). Coordinates: the source room's `xy_coords` plus the direction shift (`_EXIT_GRID_SHIFT`, 68-76). Depth = `int(sqrt(x*x + y*y))` (295), the radial distance from the entrance, used as difficulty. `room_generator` (162-201) gives a name and description from a depth table of 1-10, else "Dark rooms" (190).
- Grid: the new room is stored by coordinate (299). Its back exit (to where the player came from) is created with lock `traverse: true()` (so it is never locked; from 302).
- Budget: if fewer than `max_unexplored_exits` (2, 213) unvisited exits exist in the whole branch (322), the room opens `n = min(max_new_exits_per_room, max_unexplored_exits)` = 2 exits, and if `n > 1` it draws `randint(1, n)` (324-326). Directions are a shuffled list of the cardinal directions minus the back one (328-331). For each new exit it takes the first direction whose target coordinate is not already in the grid and is not the entrance (339), creates an unvisited exit (249), and reserves the target coordinate with `None` (344), so no other room can claim it.
- Locks: every generated room gets the tag `not_clear` (107). Its exits other than the way back are locked with `traverse:not objloctag(not_clear, dungeon_room)` (138). `clear_room` removes the tag (109-110) and the footer shows "The path forwards is blocked!" until then (116-125). The donor leaves what clears a room to each room type ("whatever problem the room offers", 98-107).
- Resetter (EvAdventureStartRoomResetter, 423-442): every 5 minutes (`recycle_time = 60 * 5`, 457) it visits each start-room exit and, with probability 0.5 (439), flushes it (`reset_exit`, 366-371), so the next traverser opens a fresh branch.
- Lifetime: the branch's `last_updated` is set in `new_room` only (284). The deleter (396-420) runs every hour (the start room sets the interval, 473-482; the docstring says so, 450) and calls `delete()` on any branch whose `last_updated` is older than `branch_max_life` (one week, 459; check at 418-420).
- Intended cleanup (Branch.delete, 251-274): send the tagged characters back to the start room (257-268), then search for rooms tagged with the branch key in category `dungeon_room` (270) and delete them (272), then delete the script (274). As read, step 270 never finds a room: the only `dungeon_room` tag added anywhere is `not_clear` (107), and `rooms.py` adds no tags (grep). So the rooms are left behind; the characters and the script are removed.
- Tick: no per-frame loop. Generation is event-driven (on traversal); the cleanup and resetting are scheduled scripts.

## 2. Key functions

- `EvAdventureDungeonBranch.new_room`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 276-347. Coordinates, depth, room, back exit, budget, placeholders.
- `EvAdventureDungeonExit.at_traverse`: `.../dungeon.py` 140-151. Placeholder to real room, then mark traversed.
- `EvAdventureDungeonBranch.delete`: `.../dungeon.py` 251-274 (cleanup; room step does not find rooms, see above).
- `EvAdventureDungeonBranchDeleter.at_repeat`: `.../dungeon.py` 409-420. Age test on `last_updated`.
- `EvAdventureDungeonStartRoomExit.at_traverse`: `.../dungeon.py` 373-395. Creates a branch on first use.
- `EvAdventureStartRoomResetter.at_repeat`: `.../dungeon.py` 432-442. 50 percent exit reset every interval.
- `room_generator`: `.../dungeon.py` 162-201. Depth to name and description.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lazy zone chain: a room exists only after a player walks to it | Entrance-exit reset every 5 min, 50 percent per exit (dungeon.py 457, 439) |
| Unexplored-exit budget per instance, 1 to 2 new exits per room | `max_unexplored_exits = 2` (213), `max_new_exits_per_room = 2` (214), `randint(1, n)` (326) |
| Reserved coordinates prevent overlap | Grid step 1 in each cardinal direction (`_EXIT_GRID_SHIFT`, 68-76) |
| Difficulty by radial depth | `int(sqrt(x*x + y*y))` (295); name table depths 1-10 (178-189); fallback "Dark rooms" (190) |
| Lock the onward exits until the area is cleared | Lock string (138); tag `not_clear` (107) |
| Idle collapse of an instance | Check every hour (docstring 450); one week (459); age test (418) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of operations in `new_room` (create the room and its back exit, then open placeholders only under the budget, shuffled and not into a reserved cell or the entrance) and the traversal rule (back exit always open, other exits locked until cleared, placeholders generated on first walk). It changes these things on purpose: it has no Evennia objects, tags, scripts or messages; coordinates are string keys in a Map; the RNG is a caller-supplied integer function (the donor uses Python's global random); the collapse clears every room, which the donor's cleanup does not do (see Gaps); and it omits the start room, the resetter, the room-name table and the character return. The file typechecks on the VPS with `tsc --strict --target es2020` (exit 0; md5 matches the local copy).

```ts
// Licence: BSD-3-Clause (donor, Evennia). Re-expression of the described mechanism in TypeScript, not a line copy.
// clean-room
export type Dir = "north" | "east" | "south" | "west";

const SHIFT: Record<Dir, [number, number]> = {
  north: [0, 1],
  east: [1, 0],
  south: [0, -1],
  west: [-1, 0],
};
const REVERSE: Record<Dir, Dir> = { north: "south", east: "west", south: "north", west: "east" };
const DIRS: Dir[] = ["north", "east", "south", "west"];

export interface Room {
  id: number;
  x: number;
  y: number;
  depth: number;                 // radial distance from the start; drives difficulty
  cleared: boolean;              // false = exits other than the way back are locked
  backDir: Dir;                  // the exit back the way the player came; never locked
  exits: Map<Dir, number | null>; // null = placeholder, the room is not generated yet
}

export interface Branch {
  maxUnexplored: number;         // unexplored exits allowed in the whole branch (2 in donor)
  maxNewPerRoom: number;         // new exits opened per generated room (2 in donor)
  rooms: Map<number, Room>;
  grid: Map<string, number | null>; // "x,y" -> room id, or null when reserved
  unvisited: Set<string>;        // "roomId:dir" of placeholder exits not yet walked
  lastGenerated: number;         // ms; set only when a room is generated (donor behaviour)
}

const key = (x: number, y: number): string => `${x},${y}`;

// Fisher-Yates shuffle driven by a caller-supplied integer RNG (rand(n) gives 0..n-1).
function shuffle<T>(xs: T[], rand: (n: number) => number): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const t = xs[i];
    xs[i] = xs[j];
    xs[j] = t;
  }
}

// Generate one room at the far side of `from` in direction `dir`.
export function newRoomAt(
  b: Branch,
  from: Room,
  dir: Dir,
  now: number,
  rand: (n: number) => number,
  nextId: () => number,
): Room {
  const [dx, dy] = SHIFT[dir];
  const x = from.x + dx;
  const y = from.y + dy;
  const back = REVERSE[dir];
  const room: Room = {
    id: nextId(),
    x,
    y,
    depth: Math.floor(Math.sqrt(x * x + y * y)),
    cleared: false,
    backDir: back,
    exits: new Map<Dir, number | null>(),
  };
  b.rooms.set(room.id, room);
  b.grid.set(key(x, y), room.id);
  b.lastGenerated = now;
  room.exits.set(back, from.id);

  // Open new placeholder exits only while the branch is under its unexplored budget.
  if (b.unvisited.size < b.maxUnexplored) {
    let n = Math.min(b.maxNewPerRoom, b.maxUnexplored);
    if (n > 1) n = 1 + rand(n); // 1..n inclusive
    const options = DIRS.filter((d) => d !== back);
    shuffle(options, rand);
    for (let i = 0; i < n; i++) {
      while (options.length > 0) {
        const d = options.shift() as Dir;
        const [ex, ey] = SHIFT[d];
        const tx = x + ex;
        const ty = y + ey;
        if (!b.grid.has(key(tx, ty)) && !(tx === 0 && ty === 0)) {
          room.exits.set(d, null);
          b.unvisited.add(`${room.id}:${d}`);
          b.grid.set(key(tx, ty), null); // reserve the coordinate so no other room claims it
          break;
        }
      }
    }
  }
  return room;
}

// Walk an exit. Locked unless the room is cleared, except the way back.
export function traverse(
  b: Branch,
  from: Room,
  dir: Dir,
  now: number,
  rand: (n: number) => number,
  nextId: () => number,
): Room | null {
  if (!from.exits.has(dir)) return null;
  if (!from.cleared && dir !== from.backDir) return null;
  const target = from.exits.get(dir);
  if (target !== null && target !== undefined) return b.rooms.get(target) ?? null;
  b.unvisited.delete(`${from.id}:${dir}`);
  return newRoomAt(b, from, dir, now, rand, nextId);
}

// Age rule as the donor has it: idle time since the last generated room, not player presence.
export function isStale(b: Branch, now: number, maxLifeMs: number): boolean {
  return now - b.lastGenerated > maxLifeMs;
}

// Collapse: drop every room. The caller moves any players back to the start first.
// The donor's delete() looks rooms up by a tag that is never set, so it removes none.
export function collapse(b: Branch): number[] {
  const ids = [...b.rooms.keys()];
  b.rooms.clear();
  b.grid.clear();
  b.unvisited.clear();
  return ids;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the instance lifetime and despawn). The lazy area generator is zone layout (streaming) and would sit with the zone data; the Frankendom zone format was not read (not read).
- Parity-checklist row 23 (zone population: despawn on empty with a grace timer). The fit is partial. The donor's collapse is an idle-age rule (last generated room more than a week ago), not empty-with-grace, and its cleanup does not remove rooms (see Gaps). The budget and lock parts are not population rules at all; they are closest to row 23 only because they bound how many areas one instance holds. Say plainly: no donor row fits the generator itself; row 23 fits the despawn only, and only after the fix below.
- Sub-line "server tick: fixed step" (row 18 / post-K item 3): the donor's timers are wall-clock (`datetime.utcnow`, 284, 415) and its randomness is global. Frankendom should count the grace in server ticks and draw from the server's seeded stream.
- Reuse tag: rewrite-from-idea (BSD-3-Clause; the code may be adapted, but the sketch is a clean re-expression)
- Brief rule served: zones as data (the depth-to-area table and the budget are zone fields); server-verified clears (the lock opens only when the server confirms the encounter, not on a client call; the donor's `clear_room` is a plain method call, 109-110); one ledger (a collapse returns each player to the entrance through one code path).

## 6. Gaps and risks

- BSD-3-Clause: the code may be adapted. Frankendom still writes its own sketch; no line is copied.
- Docstring says rooms are tagged with the branch id and the branch is deleted "when no characters remain" (dungeon.py 12-14). Neither is true in the code. Rooms get only the `not_clear` tag (107); the deleter checks age only (418). Treat the docstring as wrong.
- Cleanup removes no rooms: `delete()` searches rooms by the branch key in category `dungeon_room` (270), and nothing sets that tag. So every collapsed branch leaves its rooms behind (as read; the search was checked by grep, not run). Frankendom must tag or track the instance's areas at creation and delete them by that record.
- The age clock is refreshed only when a new room is generated (284). A branch whose players keep walking already-generated areas still collapses a week after its last new area (418-420), and the collapse sends them back to the entrance (257-268). Frankendom's rule is empty-with-grace, so use a presence clock, not the generation clock.
- Docstring for the start room says each exit is reset every 5 minutes (448); the code resets each exit with probability 0.5 on each run (439, 457). Use the code's rule and fix the docstring.
- `clear_room` is a plain method (109-110). Whether a room is cleared is decided by each room type (the donor leaves it open). Frankendom must set "cleared" only from a server-verified encounter result.
- Randomness: `randint`, `random` and `shuffle` come from Python's global RNG (dungeon.py 25). The server needs one seeded stream so that a given seed gives the same layout.
- Depth is a Euclidean radial distance (295), so diagonal-looking rooms can share a depth. The name table stops at depth 10 (fallback at 190). Frankendom's depth table should be explicit zone data.
- Only the four cardinal directions are used (`_AVAILABLE_DIRECTIONS`, 36-42). Diagonals are commented out in the donor; the grid logic is written for them, so the cost of adding them is low.
- Not read: the build script that creates the start room, `rooms.py` beyond the tag grep, the wilderness module's create and destroy bodies (grep and partial reads only, see Checked), and any caller of `clear_room` in the tutorial.
