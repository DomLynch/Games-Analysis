# evennia-evennia (instancing-dungeons, cell 1)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` | Licence: BSD 3-Clause (`/mnt/frankendom-donors/evennia-evennia/LICENSE.txt`, first line "BSD 3-Clause License"; dungeon.py has no licence header of its own) | Python (Evennia) | symbol `EvAdventureDungeonBranch`

Checked: read dungeon.py end to end (489 lines), tests/test_dungeon.py (97 lines), build_techdemo.py 85-145 (how the start room and exits are wired), and the Evennia core lines the donor relies on (objects.py 3665-3690, lockfuncs.py 492-503). Candidates opened: dungeon.py, tests/test_dungeon.py, build_techdemo.py, objects.py, lockfuncs.py, LICENSE.txt; rooms.py only at its class list (EvAdventureRoom base, not read in full). camera_scope: not applicable. Confidence: high on the lifecycle and the constants; high on defects D1-D5 (checked by grep over the evadventure folder: the only `tags.add` calls are dungeon.py 107 and 391; `clear_room` has no caller in contrib/). Not read: Evennia's AttributeProperty default handling, Evennia's TagHandler.remove with no key (line 489), and whether the lock added at line 138 replaces the `traverse: true()` lock given at line 316 on the back exit. The test file covers only moving through start exits and back; it never tests party members, branch collapse, or out-exits.

Best transferable idea: a party that enters a zone through the same portal before its next reset shares one instance, and the instance is dropped after an idle limit that every traversal refreshes, with every member sent back to the hub.
Decision (proposed): adapt - keep the sentinel-portal and idle-collapse shape for per-party zone instances, but fix the donor defects (idle clock, untagged followers, rooms never released, budget overshoot, a clear gate nothing calls) before use, because Frankendom zones are data on one runtime and the instance must be server-owned.
Acceptance: a server test where three players enter the same portal in one window and share one instance; a fourth player entering after a reset gets a new instance; after the idle limit with no traversal, all members are back at the hub and no room of that instance remains.

## 1. Mechanism

- The start room is the only permanent part. Each start exit (north, east, south, west) points to itself at rest. That self-pointing is the sentinel. Walking through a sentinel opens a new instance (a "branch") and its first room. Walking through an exit that already points at a room puts you in that same room, so everyone who uses that exit before the next reset shares one instance.
- Start-room timers (EvAdventureDungeonStartRoom, class constants): a resetter every 300 s; each start exit is reset with a 0.5 roll per tick (439-440, sentinel set at 371). A deleter every 3600 s checks every branch and collapses any with `last_updated` older than 604800 s (459, 418).
- Entry (EvAdventureDungeonStartRoomExit.at_traverse, 373-393). If the target equals the exit's own room (378, the sentinel test), create a branch script `dungeon_branch_<exit>_<utc time>` holding `start_room` and `room_generator` (381-388); set the exit destination to `new_room(self)` (389); tag only the traversing character with the branch key in category `dungeon_character` (391). Otherwise just move through (393).
- Room generation (new_room, 276-347). Read the source room's `xy_coords` (default (0,0)), shift by the exit direction, refresh `last_updated` (284), set depth = int(sqrt(x*x + y*y)) (295), call `room_generator` (297; picks a name and description from depth 1-10, default "Dark rooms", 162-201). Add a back exit with `traverse: true()` (303-316). Then, if fewer than `max_unexplored_exits` exits are unvisited (322), n = min(2, 2), and if n > 1 pick randint(1, n) (324-326). Shuffle the non-back directions (327-331). For each new exit take the first direction whose target coordinate is not yet in the grid and is not (0,0) (332-340). Create the exit with no destination (341) and reserve the coordinate with None (344).
- Lazy first traversal (EvAdventureDungeonExit.at_traverse, 140-152). An exit whose target is still its own room calls new_room (149) and then `register_exit_traversed` (150), which removes the exit from `unvisited_exits` (235-236). `last_updated` is not touched on later traversals.
- Clear gate. Rooms get tag `not_clear` on creation (107). Every out-exit gets lock `traverse:not objloctag(not_clear, dungeon_room)` (138), so a room with that tag blocks its exits (the docstring says the way back stays open). `clear_room` removes the tag (110), but nothing in contrib/ calls it.
- Collapse (EvAdventureDungeonBranch.delete, 251-274). Find characters tagged with the branch key (257), send each to the start room with messages and a direct `character.location` set (259-267), remove the tag (268). Then find rooms tagged with the branch key in `dungeon_room` (270), delete them (271-272), delete the script (274). The start room removes all `dungeon_character` tags when anything arrives (484-489).

## 2. Key functions

- `EvAdventureDungeonStartRoomExit.at_traverse`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/dungeon.py` 373-393 (sentinel test 378, branch create 381-388, first room 389, opener tag 391).
- `EvAdventureDungeonStartRoomExit.reset_exit`: same file, 366-371.
- `EvAdventureStartRoomResetter.at_repeat`: same file, 432-440 (0.5 roll per exit per tick).
- `EvAdventureDungeonBranchDeleter.at_repeat`: same file, 409-420 (age check on `last_updated`).
- `EvAdventureDungeonBranch.new_room`: same file, 276-347 (generation, depth, budget, reservation).
- `EvAdventureDungeonBranch.delete`: same file, 251-274 (collapse).
- `EvAdventureDungeonExit.at_traverse`: same file, 140-152 (first traversal makes the room).
- `EvAdventureDungeonExit.at_object_creation`: same file, 133-138 (not_clear lock).
- `EvAdventureDungeonStartRoom.at_object_receive`: same file, 484-489.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Sentinel portal: first entrant opens an instance, later entrants through the same portal join it until a reset | Reset roll 0.5 per start exit per tick (439). Docstring says "every 5 mins" (448); the code is a 50% roll per 300 s tick, so the mean gap is about 10 min (derived: geometric, p = 0.5, mean 2 ticks). |
| Idle collapse by a slow sweep | Sweep every 3600 s (458, 479); max age 604800 s (459) |
| Lazy room generation with reserved coordinates | max_unexplored_exits = 2 (213); max_new_exits_per_room = 2 (214); reserved as None (344) |
| Difficulty from radial distance | depth = int(sqrt(x*x + y*y)) (295); name table 1-10 (room_generator, 162-201) |
| Room locked until cleared | not_clear tag (107), lock (138), clear_room (110, no caller in contrib/) |

Defects found while reading (each with fix):
- D1. `last_updated` is refreshed only in new_room (284). The class docstring says "inactive for a week" (451). A party that only walks existing rooms never refreshes it, so a live branch collapses one week after its last NEW room, checked hourly. fix: refresh on every successful traversal (the sketch does this).
- D2. Only the opener is tagged (391). The collapse finds only tagged characters (257). Later members who join through an existing hub exit are never tagged, so they are not sent back and stay in a room that is then orphaned. fix: record every entrant (sketch: `members`).
- D3. Rooms are never tagged with the branch key (only `not_clear` is added at 107), so the room loop at 270-272 finds nothing and rooms are never deleted. The module docstring (12) says rooms are tagged with the instance id. Also nothing resets the start exit when its branch collapses, so it still points at a dead room until a random reset. fix: tag each room with its instance id at creation; clear hub exits that point into a dead instance (sketch: `Room.instance`, and the sweep clears `entry`).
- D4. Budget overshoot. The check at 322 happens before up to two exits are added (324-326), so unexplored exits can reach 3 when the budget is 2. fix: clamp the number added to the remaining budget (sketch `growExits`).
- D5. `clear_room` has no caller anywhere in contrib/ (grep), so in this donor a room never gets cleared and its exits stay blocked. fix: the encounter code must call clear; in Frankendom that is the server-verified kill (sketch: `clearRoom`).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (sentinel check, first room, then reserved exits; idle sweep last). It omits Evennia exits, locks, messages, descriptions, the name table, and the wall-clock keys. It replaces the donor's pop-loop with a shuffle and a count, and it passes returns to the hub through a callback. It reorders three things on purpose, as fixes: `lastActivity` refreshes on every successful traversal (donor: only on new room, D1); every entrant is recorded (D2); the budget is clamped before exits are reserved (D4). The rooms carry their instance, so the sweep can drop them (D3). `clearRoom` is the call the donor never makes (D5). Constants are config data, not hard-coded.

```ts
// Licence: BSD-3-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Dir = "north" | "east" | "south" | "west";
type Dest = Room | "hub" | null; // null = out-exit whose room is not generated yet

const DIRS: Dir[] = ["north", "east", "south", "west"];
const SHIFT: Record<Dir, [number, number]> = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
const BACK: Record<Dir, Dir> = { north: "south", east: "west", south: "north", west: "east" };

interface Config {
  maxUnexplored: number; // donor: 2
  maxNewPerRoom: number; // donor: 2
  idleMs: number;        // donor: 7 days, but measured from the last NEW room (fix: any traversal)
  resetChance: number;   // donor: 0.5 per recycle tick, per hub exit
}

interface Room {
  x: number;
  y: number;
  depth: number;
  cleared: boolean;
  instance: Instance;    // fix: each room knows its instance, so cleanup can find it
  exits: Map<Dir, Dest>;
}

interface Instance {
  lastActivity: number;  // ms
  members: Set<string>;  // fix: every entrant, not only the opener
  grid: Map<string, Room | null>;
  unexplored: number;
  rooms: Room[];
}

interface HubExit {
  entry: Room | null;    // null = sentinel: the next entrant opens a new instance
}

interface World {
  cfg: Config;
  hub: Map<Dir, HubExit>;
  instances: Instance[];
  rnd: () => number;
}

const key = (x: number, y: number): string => `${x},${y}`;

function makeRoom(inst: Instance, x: number, y: number): Room {
  const room: Room = {
    x,
    y,
    depth: Math.floor(Math.sqrt(x * x + y * y)),
    cleared: false,
    instance: inst,
    exits: new Map<Dir, Dest>(),
  };
  inst.rooms.push(room);
  inst.grid.set(key(x, y), room);
  return room;
}

function shuffled<T>(xs: T[], rnd: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// Reserve up to `want` new out-exits, never more than the budget left.
// fix: donor checks the budget before adding up to maxNewPerRoom exits, so it can overshoot.
function growExits(inst: Instance, room: Room, back: Dir, cfg: Config, rnd: () => number): void {
  const budget = cfg.maxUnexplored - inst.unexplored;
  if (budget <= 0) return;
  let want = Math.min(cfg.maxNewPerRoom, budget);
  if (want > 1) want = 1 + Math.floor(rnd() * want); // donor: randint(1, n)
  let made = 0;
  for (const d of shuffled(DIRS, rnd)) {
    if (made >= want) break;
    if (d === back) continue;
    const [dx, dy] = SHIFT[d];
    const tx = room.x + dx;
    const ty = room.y + dy;
    if (inst.grid.has(key(tx, ty)) || (tx === 0 && ty === 0)) continue; // taken, or the hub
    room.exits.set(d, null);
    inst.grid.set(key(tx, ty), null); // reserve the coordinate so no other room links to it
    inst.unexplored += 1;
    made += 1;
  }
}

// The donor blocks every exit except the way in while a room is not cleared.
function canTraverse(from: Room, dir: Dir, cameFrom: Dir | undefined): boolean {
  return from.cleared || dir === cameFrom;
}

function clearRoom(room: Room): void {
  room.cleared = true;
}

// Walk one exit. Returns the next room, "hub", or undefined when blocked or absent.
function traverse(
  inst: Instance,
  from: Room,
  dir: Dir,
  cameFrom: Dir | undefined,
  now: number,
  cfg: Config,
  rnd: () => number,
): Dest | undefined {
  if (!from.exits.has(dir) || !canTraverse(from, dir, cameFrom)) return undefined;
  inst.lastActivity = now; // fix: any successful traversal keeps the instance alive
  const cur = from.exits.get(dir);
  if (cur) return cur; // already generated: the whole party shares it
  // cur is null: an unvisited out-exit. Generate its room on first use.
  inst.unexplored -= 1;
  const [dx, dy] = SHIFT[dir];
  const room = makeRoom(inst, from.x + dx, from.y + dy);
  room.exits.set(BACK[dir], from);
  from.exits.set(dir, room);
  growExits(inst, room, BACK[dir], cfg, rnd);
  return room;
}

// Hub exit. The entrant who finds the sentinel opens a new instance; later entrants join it until the next recycle.
function enterHub(w: World, dir: Dir, player: string, now: number): Room | undefined {
  const ex = w.hub.get(dir);
  if (!ex) return undefined;
  let entry = ex.entry;
  if (entry === null) {
    const inst: Instance = {
      lastActivity: now,
      members: new Set<string>(),
      grid: new Map<string, Room | null>(),
      unexplored: 0,
      rooms: [],
    };
    w.instances.push(inst);
    entry = makeRoom(inst, SHIFT[dir][0], SHIFT[dir][1]);
    entry.exits.set(BACK[dir], "hub");
    growExits(inst, entry, BACK[dir], w.cfg, w.rnd);
    ex.entry = entry;
  }
  entry.instance.members.add(player); // fix: every entrant is recorded
  entry.instance.lastActivity = now;
  return entry;
}

// Donor: on each recycle tick every hub exit is reset with probability resetChance.
function recycleHub(w: World): void {
  for (const ex of w.hub.values()) {
    if (w.rnd() < w.cfg.resetChance) ex.entry = null;
  }
}

// Idle collapse, run on a slow tick.
function sweep(w: World, now: number, returnToHub: (player: string) => void): void {
  for (const inst of w.instances.slice()) {
    if (now - inst.lastActivity < w.cfg.idleMs) continue;
    for (const p of inst.members) returnToHub(p); // fix: every member goes back, not only the opener
    for (const ex of w.hub.values()) {
      if (ex.entry !== null && ex.entry.instance === inst) ex.entry = null; // fix: no stale hub exit into a dead instance
    }
    inst.grid.clear();
    inst.rooms.length = 0; // fix: rooms are dropped by their instance id, not by an unset tag
    inst.members.clear();
    w.instances.splice(w.instances.indexOf(inst), 1);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ID003-evennia-instance-lifecycle.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (instance lifecycle for per-party zones: sentinel entry, idle collapse with return to hub, room release by instance id). Parity-checklist row 23 (zone population: despawn with a timer). The donor's despawn is idle-based, not empty-based, so it does not cover row 23's grace-on-empty rule as written. A new module is likely needed for the instance record itself (not decided here).
- today: zone spawn logic in `origins/server/world-spawns.ts` (not read in this pass; named from the addendum).
- Reuse tag: adapt-idea (BSD-3-Clause; code may be adapted, keep the copyright notice if source is copied).
- Brief rule served: rule 4 (idea kept, defects fixed, per the 2026-10-10 addendum); rule 8 (named target file and row 23).

## 6. Gaps and risks

- One engine: the donor's instance is an Evennia script plus room objects, which is a second runtime. Frankendom keeps one runtime, so the instance should be a zone-data record plus engine state, not a new script type.
- Zones as data: the name table and `room_generator` are code (162-201, and a per-class hook at 462). In Frankendom the room layout and difficulty table belong in zone data, not a function passed at creation.
- Server-verified: the donor moves characters with a direct `character.location = start_room` (263), with no server check. Frankendom's entry, return and removal must go through the server ledger.
- One ledger: party membership is a string tag on each character (391). Frankendom's members should live on the instance record, and the instance should be the one source of party state.
- MAX_ATTACKERS = 3: the donor sets no party limit at all. This mechanism does not justify or set MAX_ATTACKERS.
- Pit as client: an instance is a zone concept. It must not be used for the Pit, which is a client of the engine.
- Timers: the donor uses wall-clock `datetime.utcnow()` (284, 415) and ticker scripts. Frankendom's sweep should run on the server fixed step with the per-tick budget (server tick sub-line, row 18 / post-K item 3), not on a separate ticker.
- No grace timer: the donor collapses only after a week with no new room (with D1 fixed: no traversal), not when the instance empties. Row 23 needs an empty-plus-grace rule, which the donor does not give.
- Clear gate: once D5 is fixed, the gate needs a server-side clear call, not a client flag.
- Untested: the donor's test file (tests/test_dungeon.py) covers no party, no collapse, no out-exit traversal and no room release. Every defect above is from reading, not from running the donor.
