# xu4-engine-u4 (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` (with `src/game.cpp`, `src/location.cpp`, `src/death.cpp`, `src/dungeon.cpp`, `src/dungeon.h`, `src/direction.cpp`) | Licence: GPL-3.0 (top-level COPYING opens "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; clean-room only) | C++ | symbol `CombatController::engageDungeon`

Checked: The dungeon room is an instanced encounter: each room has one persistent map, entered by stepping onto a room token. It is pushed as a new location over the dungeon position, and it is cleared and reset when the party leaves. Read in full or in the relevant part: `engageDungeon` and `initDungeonRoom` (combat.cpp 46-164), `endCombat` (232-302; the rest of the function not read), the win/lose checks (396-411, 766-779, 836-850), room exit in `movePartyMember` (location.cpp 360-400), `setMap` and `exitToParentMap` (game.cpp 421-512), save and load of the parent position (game.cpp 230-240, 316-332), the death path (death.cpp 45-70), `unloadRooms` (dungeon.cpp 14-45), the `DngRoom` record (dungeon.h 20-40), and `dirNormalize` (direction.cpp 98-105). Not read: `AREA_PLAYERS` and `AREA_CREATURES` (sizes inferred from the `[8]` and `[16]` arrays in dungeon.h, not from the macros), the room trigger tiles (`DNGROOM_NTRIGGERS`, dungeon.h 20-24), the room loader (maploader.cpp 318-350), the altar-room portal path (`usePortalAt`), and the combat turn loop beyond the win and lose checks. Confidence: high on the stack, entry, exit and reset mechanics; medium on the exact party-size numbers.
Best transferable idea: An encounter room is a stacked instance: entering pushes the room over the saved parent position, the party is placed on the side it came from, foes are spawned fresh from the room record on every entry, the first member to leave picks the exit edge, and leaving pops back to the parent and clears the room.
Decision (proposed): adapt - keep the stack-with-parent and the reset-on-entry spawn; drop the single-party exit-edge rule unless Frankendom gets groups; keep the room flag that stops a clear from ending the fight, as data.
Acceptance: A test enters a room from the south and asserts the player starts on a south slot; clearing every foe in a room flagged no-auto-end does not end the room until the player steps off an edge; leaving and re-entering spawns the same foe list again from data; a second member leaving by another edge is refused.

## 1. Mechanism

- Location stack. Each `Location` holds coords, map, context and a `prev` pointer (`location.h` 51-67; `location.cpp` 459-471). `setMap(map, saveLocation=true)` pushes a new location whose `prev` is the current one (`game.cpp` 467). `locationFree` pops it (`location.cpp` 475-480; `game.cpp` 507).
- Enter. Walking onto a `DUNGEON_ROOM` token calls `engageDungeon(dng, room, dirReverse(realDir))` (`game.cpp` 2325, 2338). The direction is reversed, so the party arrives from the side it walked in from (walking north gives entry from the south, `combat.cpp` 148). `engageDungeon` (`combat.cpp` 49-55) sets the current room on the dungeon, builds a controller on the room's persistent map (51), and runs `initCreature(NULL)` (52) then `initDungeonRoom` (53) then `beginCombat` (54).
  - The controller's constructor calls `setMap(cmap, true, ...)` (`combat.cpp` 70), which pushes the room location over the dungeon position.
  - `initCreature(NULL)` sets `winOrLose = true` (86) and clears the room flag (87).
  - `initDungeonRoom` then sets `winOrLose = false` (118), sets the room flag (119), marks the altar room for room 0xF outside the abyss (123-131), reads foes from the room record on every entry (134-141), and sets party start slots from the entry side (144-162).
- Inside. A member who steps off the map edge is checked against the room's exit side (`location.cpp` 374). The first leaver sets the exit side (384) and is removed from the room (385). A later leaver on another side is refused with "must use same exit" (391). Other moves are checked against valid moves and can be blocked (396-398).
- Turn end (`combat.cpp` 766-779 and 836-850). `isWon()` is true when the room has no foes (396-401). `isLost()` is true when no party member is left on the map (406-411). In the turn step at 836-850 (enclosing function not read), `isLost()` ends the fight (841-842). A foe-free room ends the fight only if `winOrLose` is set (847). So a room, with `winOrLose` false, does not end when its foes are gone; the party must leave.
- Exit (`endCombat`, 232-302). The party-dead branch calls `deathStart(5)` and does not pop the room (238-243). Otherwise: `won` is read before the pop (247), then `exitToParentMap()` pops the room (249). Loot and karma run only if `winOrLose` (252). For a room, the avatar faces the exit side (297) and then steps one space out with `move(DIR_NORTH)` (299).
- Reset. `exitToParentMap` clears the room's annotations and objects when the map changes (494-496). Dungeon maps call `unloadRooms` only when the dungeon itself is left (498-500). `unloadRooms` frees the map data and the room maps so they reload on re-entry (dungeon.cpp 23-45).
- Save and load. Inside a dungeon the save writes both the dungeon position and the parent position (`game.cpp` 321-326), and load restores both (237-239).
- Death. `deathRevive` pops every location until the world map (`death.cpp` 55-56), places the world position on the castle portal (63), and sets the castle map (67).

## 2. Key functions

- `CombatController::engageDungeon`: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` 49-55. Order: build the controller on the room map, `initCreature(NULL)`, `initDungeonRoom`, `beginCombat`.
- `CombatController::initDungeonRoom`: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` 109-164. Sets `winOrLose = false`, the room flag, altar state, foes from the room record, and party slots by side.
- `CombatController::endCombat`: `/mnt/frankendom-donors/xu4-engine-u4/src/combat.cpp` 232-302 (read to 302). Dead branch at 238-243; live branch reads `won`, pops the room, applies loot and karma when `winOrLose`, then exits.
- `movePartyMember` (room exit): `/mnt/frankendom-donors/xu4-engine-u4/src/location.cpp` 360-400. Same-exit check at 374, exit side at 384, removal at 385.
- `GameController::setMap` and `exitToParentMap`: `/mnt/frankendom-donors/xu4-engine-u4/src/game.cpp` 421-512.
- `deathRevive`: `/mnt/frankendom-donors/xu4-engine-u4/src/death.cpp` 54-70.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Foe table per room, respawned from data on each entry | 16 creature slots per room (`dungeon.h` 28) |
| Party start slots per entry side | 8 slots per side (`dungeon.h` 31-38, arrays of 8); side offset is side x `AREA_PLAYERS` x 2 (`combat.cpp` 155), with `AREA_PLAYERS` not read |
| Rooms per dungeon level | 16 per level pair (comment at `game.cpp` 2331) |
| Altar room is room index 0xF, not in the abyss | 0xF (`combat.cpp` 123) |
| Death delay before the death screen | 5 s (`combat.cpp` 243; the wait is in `death.cpp` 46-47) |
| Room win flag | false for rooms (`combat.cpp` 118): no loot, no karma (252-271 gated by `winOrLose`) |
| Pop to parent | No timer; turn based |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters for a single-level room: place on entry, the first leaver picks the exit edge, the turn-end test (no member left, or a foe-free room with the win flag set), then read the win flag, clear foes and step out. It differs in four ways. It keeps one run object, not a stack of locations, so the parent pop is implicit. It computes the step out directly from the exit side, instead of setting the facing and moving "NORTH" as the donor does (`combat.cpp` 297-299). It omits loot and karma, altar-room portal exits, room trigger tiles, the death path, creature tile effects, and camping. It assumes an edge step has already been detected by the caller.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Side = "north" | "east" | "south" | "west";
export interface Pt { x: number; y: number; }

const MAX_FOES = 16;      // data: room foe table size
const SLOTS_PER_SIDE = 8; // data: party start slots per entry side
const STEP: Record<Side, Pt> = {
  north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 },
};

export interface RoomData {
  id: string;
  foeKinds: string[];                // at most MAX_FOES; spawned again on every entry
  foeStarts: Pt[];                   // same length as foeKinds
  partyStarts: Record<Side, Pt[]>;   // SLOTS_PER_SIDE entries per side
}
export interface Member { id: number; alive: boolean; pos: Pt | null; } // pos null = not in the room
export interface Foe { kind: string; pos: Pt; }
export interface RoomRun {
  data: RoomData;
  parentPos: Pt;          // where the party stands on the parent map (kept while inside)
  winOrLose: boolean;     // false for rooms: clearing the foes does not end the fight
  exitSide: Side | null;  // set by the first member to leave
  members: Member[];
  foes: Foe[];
}

// Enter: the party is placed on the side it came in from.
export function enterRoom(data: RoomData, parentPos: Pt, members: Member[], from: Side): RoomRun {
  const living = members.filter(m => m.alive);
  if (data.foeKinds.length > MAX_FOES || living.length > SLOTS_PER_SIDE) {
    throw new Error("bad room data or party size");
  }
  let slot = 0;
  for (const m of members) {
    m.pos = m.alive ? { ...data.partyStarts[from][slot++] } : null;
  }
  return {
    data, parentPos, winOrLose: false, exitSide: null, members,
    foes: data.foeKinds.map((kind, i) => ({ kind, pos: { ...data.foeStarts[i] } })),
  };
}

// A member steps off the room edge. The first leaver picks the side; later leavers must use the same side.
export function leaveByEdge(run: RoomRun, m: Member, side: Side): "left" | "must-use-same-exit" {
  if (run.exitSide !== null && run.exitSide !== side) return "must-use-same-exit";
  run.exitSide = side;
  m.pos = null;           // removed from the room
  return "left";
}

// Turn end, in donor order: no member left in the room ends it; a foe-free room ends it only when winOrLose is set.
export function turnEnd(run: RoomRun): "continue" | "end" {
  if (run.members.every(m => m.pos === null)) return "end";
  if (run.winOrLose && run.foes.length === 0) return "end";
  return "continue";
}

// Exit: read the win flag first, clear the room's foes, then return the side to face and the step out.
export function exitRoom(run: RoomRun): { won: boolean; facing: Side | null; step: Pt | null } {
  const won = run.foes.length === 0;
  run.foes = [];          // the room is reset on exit; the next entry spawns foes from data again
  if (run.exitSide === null) return { won, facing: null, step: null };
  const s = STEP[run.exitSide];
  return { won, facing: run.exitSide, step: { x: run.parentPos.x + s.x, y: run.parentPos.y + s.y } };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/zone-instances.ts` (new): encounter rooms as zone data (foe list, party slots per side, a win flag), one run object per entry, reset on exit. Parity row 23 (zone population: spawn on entry from data, despawn on exit).
- today: (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data on one runtime; the room state and the reset live in the server, not the client.

## 6. Gaps and risks

- Single party in the donor. Ultima IV has one party, so "instanced per party" is not modelled; each room is one shared map reset on exit. Frankendom's one character and one ledger rule means the room run must hang off the character's zone position, not a party object. The exit-edge rule only matters if Frankendom ever has groups; drop it for solo play.
- Win flag. The donor's room flag (`combat.cpp` 118) stops a clear from ending the fight, so the party must leave. This suits an optional room, not a fast duel. Keep it as a data flag per room and default it to auto-end.
- Respawn on entry. Foes come back from the room record on every entry (`combat.cpp` 134-141). This is a respawn-on-entry rule, not a per-room kill record. Frankendom's population rule (row 23) must decide whether a cleared room stays cleared.
- Defect, keep the idea: party start pointer arithmetic. `combat.cpp` 156-157 offsets from `party_north_start_x` into the arrays that follow it in the struct (`dungeon.h` 31-38). That relies on declaration order and no padding and is out of bounds as written. Fix: `partyStarts[side][slot]` as a 4 x 8 table, as the sketch does.
- Defect, keep the idea: altar-room detection is a FIXME (`combat.cpp` 122). It keys on room 0xF and the entry column. Fix: flag altar rooms in the room data.
- Defect, keep the idea: the win flag is set in two calls, `initCreature(NULL)` (true) and then `initDungeonRoom` (false). The result depends on call order. Fix: pass the flag once at construction.
- Defect, keep the idea: the exit step is a "NORTH" move after facing is changed (`combat.cpp` 297-299; the author flags it "XXX: why north", 298). Fix: step along the exit side directly, as the sketch does.
- Death. The death path (`combat.cpp` 238-243, `death.cpp` 54-70) unwinds every location to the world map and resets the avatar to the castle. Frankendom's death and respawn (row 17) must choose one rule for the whole stack; the donor's is a full reset to the castle.
- Clean-room only: GPL-3.0. The sketch is written from the mechanism, not translated.
