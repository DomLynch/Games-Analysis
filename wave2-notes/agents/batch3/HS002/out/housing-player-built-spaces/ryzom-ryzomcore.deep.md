# ryzom-ryzomcore (housing-player-built-spaces, cell 2)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/building_manager.cpp` (pool, trigger/lift session), with `building_physical.cpp` 81-140 and 486-545 (instance per owner, owner deletion), `building_physical_inline.h` 185-240, `room_instance.cpp` 134-200 and `room_instance.h` 32-134 | Licence: AGPL-3.0 (root `COPYING` is AGPL v3; per-file headers not read) | C++ | symbols `CBuildingManager::allocateRoom`, `CBuildingManager::removePlayerFromRoom`, `IBuildingPhysical::addUser`, `CRoomInstancePlayer::removeUser`, `CBuildingManager::triggerTeleport`

Checked: read in full: `allocateRoom` and pool (building_manager.cpp 612-712); `removePlayerFromRoom` (618-650); trigger request build, page fill, removal (380-560); `triggerTeleport` head through the session check (712-760); `removePlayerBuilding` (581-586); `IBuildingPhysical::addUser` (building_physical.cpp 81-140); `CBuildingPhysicalPlayer::onPlayerDeletion` (486-545); `addPlayer`, `resetRoomCell` (building_physical_inline.h 185-240); `CRoomInstancePlayer::addUser/removeUser` (room_instance.cpp 134-200); `IRoomInstance::release` (249-256); `IRoomInstance` interface (room_instance.h 32-72, 108-134). Not read: the GPMS indoor-cell messages (inside `reallocRooms`); `CRoomInstanceGuild::create`; the teleport execution after the session check (triggerTeleport past line 760); `CTimer` internals; `isUserAllowed` bodies. Candidates opened: 9 files. Confidence: high on the instance lifecycle and the session rule; medium on defects 1 and 5 (reasoned from the code, not run). Licence line is from COPYING only.

## 1. Mechanism

- A player building is a template with rooms. Each room has one instance cell per owner: `Cells[roomIdx][ownerIdx]`. Owners are the players in `_Players`. Adding an owner appends one cell to every room and bumps the building state counter (building_physical_inline.h 185-200, `addPlayer`).
- Instancing is lazy and per (room, owner). A visitor's `addUser` (building_physical.cpp 81-140) checks the cell. Cell 0 means no instance yet: `allocateRoom` takes a slot and writes the cell (115-118), then `create` runs and the visitor is added (125-127). A non-zero cell looks the instance up (137).
- Slot encoding: the cell holds `-2 - (idx << 1)` (building_manager.cpp 659), so a room cell is always negative and never 0. `isRoomCell` and `getRoomIdxFromCell` decode it.
- Pool: `allocateRoom` pops the free list (`_FirstFreeRoomId` / `NextFreeId`, 652-658). When the list is empty it grows the vector by `_RoomAllocStep`, which is 128 in release and 1 under NL_DEBUG (building_manager.cpp 149-151; `reallocRooms` 679).
- Reference count = visitors inside (room_instance.h 64; `++` at room_instance.cpp 193 on enter; `--` at 152 on leave).
- Leave: `removePlayerFromRoom` (building_manager.cpp 618-650) calls the room's `removeUser` (640). When the count reaches 0 the room resets the owner cell (room_instance.cpp 158), then `release()` runs, which only removes the room's bots (249-256). Back in `removePlayerFromRoom`, if `isValid()` (refcount != 0, room_instance.h 134) is false, the object is deleted and the slot is pushed onto the free list (642-647).
- Lift/trigger menu: a user on a trigger gets a request (building_manager.cpp 380-430). For each destination, every owner the user is allowed to visit is appended. `Session` is a uint16 sum of each destination's state counter (420). The request has a timer of `TriggerRequestTimout` (default 300, egs_variables.cpp 431; the unit is the NeL game cycle, not converted here) and is removed when it fires (`CTriggerRequestTimoutEvent`, building_manager.h 234-252).
- The menu is paged 8 entries at a time (building_manager.h 36; page start at building_manager.cpp 479).
- Choice: `triggerTeleport` recomputes the session from the current counters (728-740). If it differs from the stored one, it sends `TELEPORT_BAD_SESSION` and drops the request (741-744). Otherwise it drops the request and checks `isUserAllowed` again.
- Owner deletion: `onPlayerDeletion` (486-545) teleports out anyone in that owner's cells (523), removes the owner from `_Players` by swapping with the last entry, swaps the last owner's cell into the same index in every room, and bumps the state counter (533-539).
- Guild option purchase: checks money (1104) and spends it (1127). Nothing else in the code read charges rent, upkeep or decay (a grep of building_manager for rent/upkeep/decay/expire returned no housing hits).
- Tick: none of this runs on a loop. Creation and release are event-driven (enter, leave, timeout, deletion).

## 2. Key functions

- `CBuildingManager::allocateRoom`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/building_manager.cpp` 652-666. Pops the free list, writes the encoded cell, creates the object by type.
- `CBuildingManager::removePlayerFromRoom`: same file 618-650. Leave, then delete and free-list push when the room is empty.
- `IBuildingPhysical::addUser`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/building_physical.cpp` 81-140. Lazy create or lookup, then `addUser` on the room.
- `CRoomInstancePlayer::removeUser`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/room_instance.cpp` 134-162. Decrement; reset cell and release at zero.
- `CBuildingManager::triggerTeleport`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/building_manager.cpp` 712-760 (session check 728-746).
- `CBuildingPhysicalPlayer::onPlayerDeletion`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/building_manager/building_physical.cpp` 486-545.

## 3. Numbers vs mechanism (table)

| Rule | Formula / value | Range or value seen | file:line |
|---|---|---|---|
| Room cell encoding | cell = -2 - (poolIdx << 1) | always <= -2 for a live room | building_manager.cpp 659 |
| Pool growth | grow by `_RoomAllocStep` when free list empty | 128 release, 1 debug | building_manager.cpp 149-151, 679 |
| Instance lifetime | exists while refcount > 0 | refcount is the visitor count (uint16) | room_instance.h 64, 65; room_instance.cpp 152, 193 |
| Lift menu page | 8 entries per page | page start = page x 8 | building_manager.h 36; building_manager.cpp 479 |
| Lift request timeout | fires after `TriggerRequestTimout` game cycles | default 300 | egs_variables.cpp 431; building_manager.cpp 428 |
| Session token | sum over destinations of state counter, uint16 | wraps at 65536 | building_manager.cpp 420, 728, 741 |
| State counter bump | +1 on owner add, owner delete, building change | +1 each event | building_physical_inline.h 193, 214; building_physical.cpp 341, 539 |
| Guild option cost | pay MoneyCost, refused if money < cost | value not read (data) | building_manager.cpp 1104, 1127 |

## 4. TypeScript sketch

simplified: keeps the donor's order (lazy create on first visit, refcount up on enter, cell reset and slot free at zero, free-list reuse, and the menu session as a 16-bit sum checked at choice time). It differs in three places: it resets the cell by the room's owner index (the donor passes the leaver's id, which can miss, see Section 6), it has no bots or GPMS registration, and it has no page list or timer. The 16-bit wrap is kept to match the donor, and flagged in Section 6.
```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RoomInstance {
  roomIdx: number;
  ownerIdx: number;
  refCount: number; // number of visitors inside
}

// One building: rooms x owners. A cell is 0 until the first visitor arrives, then holds pool index + 1.
class BuildingInstancer {
  private cells: number[][];
  private pool: (RoomInstance | null)[] = [];
  private free: number[] = [];
  stateCounter = 0; // bumped whenever an owner or room set changes

  constructor(roomCount: number, ownerCount: number) {
    this.cells = Array.from({ length: roomCount }, () => new Array<number>(ownerCount).fill(0));
  }

  // Visitor enters room roomIdx of owner ownerIdx; the instance is created on first visit.
  enter(roomIdx: number, ownerIdx: number): number | null {
    if (roomIdx >= this.cells.length || ownerIdx >= this.cells[roomIdx].length) return null;
    if (this.cells[roomIdx][ownerIdx] === 0) {
      const idx = this.free.length > 0 ? (this.free.pop() as number) : this.pool.push(null) - 1;
      this.pool[idx] = { roomIdx, ownerIdx, refCount: 0 };
      this.cells[roomIdx][ownerIdx] = idx + 1;
    }
    const inst = this.pool[this.cells[roomIdx][ownerIdx] - 1];
    if (!inst) return null;
    inst.refCount += 1;
    return this.cells[roomIdx][ownerIdx] - 1;
  }

  // Visitor leaves. The cell is reset by the room's OWNER index (not by the leaver's id), so the last
  // visitor can be anyone. The instance is released when the last visitor leaves.
  leave(poolIdx: number): void {
    const inst = this.pool[poolIdx];
    if (!inst) return;
    inst.refCount -= 1;
    if (inst.refCount === 0) {
      this.cells[inst.roomIdx][inst.ownerIdx] = 0;
      this.pool[poolIdx] = null;
      this.free.push(poolIdx);
    }
  }

  // Session token for a menu: sum of state counters, kept to 16 bits like the donor.
  sessionToken(counters: number[]): number {
    let s = 0;
    for (const c of counters) s = (s + c) & 0xffff;
    return s;
  }

  // A choice from a lift-style menu is valid only if the building state has not changed since the menu was built.
  choiceIsFresh(offeredSession: number, counters: number[]): boolean {
    return this.sessionToken(counters) === offeredSession;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ryzom-room-instances.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/housing-instances.ts` (new). Each house or guild hall is a zone row with an owner key; a visit creates the instance on first entry and releases it at zero visitors (the donor's pattern, with stable owner ids instead of list indices).
- Parity-checklist row 23 (zone population: caps, respawn, despawn on empty). The donor's despawn-on-empty is immediate; it has no grace timer. Row 23 is the closest row; the menu session check is a server rule (row 5 intake is the input side).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: zones as data (rooms and owners are rows); server-verified choices (the session is checked on the server at choice time); row 23 despawn on empty.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect 1, last-out reset uses the leaver's id: room_instance.cpp 158 calls `resetRoomCell(_RoomIdx, user->getId())`. `resetRoomCell` only clears a cell when the id matches an owner in `_Players` (building_physical_inline.h 237-240). If the last person out is a visitor, the cell stays set. The room object is then deleted and its slot freed (building_manager.cpp 642-647). The next visitor finds a non-zero cell: either the lookup returns NULL (building_physical.cpp 130-134, "invalid room cell") or, once the slot is reused, the cell points at another room. Fix: clear the cell by the room's owner index (the room already stores `_OwnerIndex`), not by the leaver's id. Status: reasoned from the code; not run. The `RYZOM_FORGE_ROOM` branch (room_instance.cpp 155-159) passes the owner id instead, but the flag is not defined in the CMake or config files searched (cmake/, CMakeLists.txt, config.h.cmake, ryzom/server), so the default build is assumed to take this path.
- Defect 2, indices move on delete: `onPlayerDeletion` swaps the last owner into the deleted owner's index in `_Players` and in every room's `Cells` (building_physical.cpp 533-535). Any stored owner index, including a live room's `_OwnerIndex`, goes stale. Fix: keep stable owner ids; never store list positions.
- Defect 3, allocation before the template check: `addUser` allocates and writes the cell (118), then checks `roomIdx >= _Template->Rooms.size()` (119) and returns false without freeing the slot. Fix: validate before allocating.
- Defect 4, timer leak on the choice path: `triggerTeleport` erases the request at 744 (bad session) and in the cleanup loop at 752 and 762 without deleting `Timer`. `removeTriggerRequest` deletes it (building_manager.cpp 524-525). Whether the pending CTimer keeps firing is not read. Fix: one erase helper that deletes the timer.
- Defect 5, session is a 16-bit sum: `uint16 session` (728) can wrap and collide with a stale menu. Fix: a 32-bit per-building version counter, bumped on every owner or room change.
- Defect 6, delete while occupied: the STOP_IF at building_physical.cpp 533 asserts the deleted owner's cells are zero. The teleport-out at 523 is queued, so the cell is still set when the check runs. The donor's own warning (building_manager.cpp 585) says the room should be flagged "to be destroyed" and freed when empty. Status: reasoned, not run. Fix: flag, then release at refcount zero.
- Frankendom ruling gap: the only charge in the code read is the guild option cost, paid by a direct `spendMoney` (building_manager.cpp 1127). In Frankendom that spend must be a ledger row through `settle()`. No rent or decay exists in this code, so upkeep is a design gap, not something to copy.
- Visitors reach an instance through `isUserAllowed` at both the request (building_manager.cpp 412) and the choice (766). The client's menu is only a view; the server decides.
- `getOwnerIdx` (building_physical_inline.h 204-222) adds an unknown user to `_Players` as a side effect of the lookup (state bump at 214, cells appended). Its callers were not read, so whether a plain visit can add an owner is unverified.

Best transferable idea: a per-owner room instance created on first visit, reference-counted by visitors, reclaimed at zero from a free-list pool, with a session token that rejects a menu choice made after the building changed.

Decision (proposed): adapt - keep lazy per-owner instances with refcount and free-list reuse, and the session token for choices; fix defects 1-6 (owner-keyed reset, stable ids, validate-before-allocate, timer delete, 32-bit version, flag-then-release). Reject the donor's unused guild-option cost path as written; route any spend through the one ledger.
Acceptance: a player enters a friend's house and the instance is created; the friend leaves last and a third player enters the same house and sees the same room; a server test asserts that a lift-style choice made after the house layout changed is refused with the stale message, and that an entry after a visitor-last exit succeeds.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified choices; parity row 23 (despawn on empty)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: allocateRoom 652-672 (cell = -2-(idx<<1) at 659), pool step 128/1 at 149-151, reallocRooms resize at 679, removePlayerFromRoom 618-649 (free-list push 642-647), addUser 81-140 (alloc 118, template check 119, lookup 131-137), CRoomInstancePlayer::removeUser 134-165 (--_RefCount 152, resetRoomCell with user->getId() at 158 under non-FORGE build, release 160), release 249-256 only removes bots, isValid refcount!=0 (room_instance.h 132-134), onPlayerDeletion 486-540 (tp at 523, swap at 528-535, STOP_IF 533, state++ 539), addPlayer 185-201, getOwnerIdx side effect 214-223, resetRoomCell 228-242, triggerTeleport uint16 session 728-746, erases at 744/752/762 without timer delete vs removeTriggerRequest 524-525, TriggerRequestTimout 300 (egs_variables 431), MaxEntryPerLiftPage 8, AGPL COPYING. RYZOM_FORGE_ROOM only appears in source files (not cmake) as stated. Defect 1 is real. Acceptance is satisfiable by the sketch. Minor note: sketch/Decision keep 16-bit wrap but Defect 5 says use 32-bit; test passes either way.
Missed: addUser rejects a dead visitor (building_physical.cpp 96-100, currentHp<=0); note never mentions it and the sketch has no alive check. Also addUser rejects owner index >= Cells.size (89-93).
