# TrinityCore-TrinityCore (server-performance-scaling, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Maps/Map.cpp` (with `Maps/Map.h`, `Entities/Object/Object.cpp`, `Entities/Object/BaseEntity.cpp`, `Entities/Object/BaseEntity.h`, `Entities/Object/Updates/UpdateField.h`, `Entities/Object/Updates/UpdateData.cpp`, `Entities/Item/Item.cpp`, `Server/WorldSession.cpp`, `src/server/worldserver/Main.cpp`, `game/World/World.cpp`) | Licence: GNU GPL version 2 (COPYING line 2 "Version 2, June 1991"; source headers "either version 2 of the License, or (at your option) any later version", UpdateData.cpp:6); copyleft, clean-room only | C++ | symbol `Map::SendObjectUpdates`

Checked: Read: Object.cpp 3040-3100 (visitor and `WorldObject::BuildUpdate`), BaseEntity.cpp 655-720, BaseEntity.h 205-230, UpdateField.h 127-150 (setter), UpdateData.cpp (all 91 lines), Map.cpp 620-662 and 663-800 (`Map::Update`), 1974-2010 (`SendObjectUpdates`), WorldSession.cpp 352-372, 494-512, 1496-1572, 1655-1662, 1770-1830 (packet loop and per-opcode limits), worldserver/Main.cpp 535-580 (world loop), World.cpp 2126-2140 and 2300-2320. Map.h 577-584 and 830 and worldserver.conf.dist 368-372, 4273-4279 were read by grep only. Callers: `SendObjectUpdates` is called once, at Map.cpp:795 (grep of game/Maps); `BuildFieldsUpdate` has one caller (Object.cpp:3069); `AddUpdateObject` is reached through `BaseEntity::AddToObjectUpdateIfNeeded` (BaseEntity.cpp:660-663). Not read: the body of the friend function `SetUpdateFieldValue` (declared at UpdateField.h:127; the setter's own `SetValue` is read); the body of `WriteUpdate(changesMask, ...)` (declared at UpdateFields.h:63); `MapUpdater` (game/Maps/MapUpdater.cpp, exists, not read); `MapManager::Update`; `ViewerDependentValues.h`; other `BuildValuesUpdate` overrides besides Item (Item.cpp:1813-1822 read). Camera: not applicable (server topic). camera_scope: n/a. Confidence: high on the flush order and the change check; medium on the per-field mask (declaration only).

## 1. Mechanism

- Write-time change check. A field setter returns true only when the new value differs from the stored one (UpdateField.h:141-143). A write that changes a field calls `AddToObjectUpdateIfNeeded` (BaseEntity.h:223-224). That queues the object only if it is in the world and not already queued (BaseEntity.cpp:662-663). So a repeated write of the same value costs nothing, and an object changed five times in one map update is queued once.
- Dirty set. `Map::AddUpdateObject` inserts into `_updateObjects`, an unordered set (Map.h:579, 830). The set is the list of objects whose state changed since the last flush.
- Map update order (`Map::Update`, Map.cpp:663): session packets are processed first (678), then respawns, then cell marking (693), then object updates for the active cells (713, 720, 758), then the flush (795). So the flush sends state written earlier in the same map update, including the session packets of that update.
- Flush (`SendObjectUpdates`, Map.cpp:1974-1992). Drain the set (1978). For each object: `BuildUpdate` (1983). That builds the changes mask, visits the world objects within the object's visibility range (Object.cpp:3080), and for each player who already has the object and has not been served yet this flush (3068), appends the object's field block to that player's update data (3069). Then it clears the object's change mask (3082). After the drain, one packet per player is built and sent (1989-1990).
- Packet. `UpdateData::BuildPacket` writes the block count (UpdateData.cpp:64) and the destroy and out-of-range GUIDs as sets (50 for insert; the sets dedupe). One packet per player per map update, blocks batched inside.
- Field-level delta. The object's values carry a changes mask. The flag-based writers send that mask as the header and only the changed fields after it: `ObjectData` uses `_changesMask` (UpdateFields.cpp:49, header at 54); `ItemData` ANDs it with the fields the viewer may see (328, mask at 326). `Item::BuildValuesUpdate` first gates each type on its changed bit (Item.cpp:1817). Other object types' writers were not read individually.
- Active set. `VisitNearbyCellsOf` (Map.cpp:620-640) visits the cells in the activation range of an active object (627), skips a cell already marked in this map update (636), and marks each visited cell (639). Cells are reset each map update (693). So a cell is updated once per map update no matter how many players see it. Non-player active objects are visited separately (758).
- Input budget. `WorldSession::Update` counts a packet after processing it and breaks once the count is above 100 (369, 500-502), so up to 101 packets run per call; leftover packets are re-queued for the next update (501, 508). Per-opcode limits are counted per whole second: the counter resets when the second changes (1515) and a packet over the limit triggers the policy (1519). The default limit for an opcode with no entry is 100 (1798); 0 means no limit (1657, 1659). The default policy is kick (config `PacketSpoof.Policy = 1`, worldserver.conf.dist 4275-4279; World.cpp:890 default `POLICY_KICK`; kick call at WorldSession.cpp:1533).
- Loop (`WorldUpdateLoop`, worldserver/Main.cpp 535-580). Variable step. Each pass measures the real elapsed milliseconds (557) and sleeps only when less than `MinWorldUpdateTime` has passed (537, 564; default 1 ms). The world is then updated with the measured diff (568), which reaches `sMapMgr->Update(diff)` (World.cpp:2311). There is no target tick rate; timers advance by the real diff.
- Visibility classes. Per-object visibility distance is one of five values: tiny 25, small 50, normal 100, large 200, gigantic 400 yards; the largest is `MAX_VISIBILITY_DISTANCE = SIZE_OF_GRIDS` = 533.3333 (ObjectDefines.h 28-35; GridDefines.h 40; table at Object.cpp:54).

## 2. Key functions

- `Map::SendObjectUpdates` (Map.cpp 1974-1992): drain the dirty set, build once per object, one packet per player.
- `Map::Update` (Map.cpp 663-800): session packets, respawn check, active-cell visit, flush (795).
- `WorldObject::BuildUpdate` (Object.cpp 3073-3083): changes mask, visit within range, per-viewer block, clear mask.
- Change check and queue: `UF` setter (UpdateField.h 139-147) and `BaseEntity::AddToObjectUpdateIfNeeded` (BaseEntity.cpp 660-664); mask clear in `BaseEntity::ClearUpdateMask` (666-681).
- `UpdateData::BuildPacket` (UpdateData.cpp 58-82): header, destroy and out-of-range GUIDs, blocks.
- `WorldSession::Update` (WorldSession.cpp 352-512) and `DosProtection::EvaluateOpcode` (1503-1555).
- `WorldUpdateLoop` (worldserver/Main.cpp 535-580).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Only a real change queues the object, once | None (the compare, UpdateField.h:141) |
| One flush per map update, one packet per viewer | None (structure, Map.cpp 1978-1990) |
| Changes cleared after the build | None (Object.cpp:3082) |
| Visit each cell once per update | Cell mark bitset (Map.cpp 636-639) |
| Per-session packet budget per update | 100 (WorldSession.cpp:369); leftovers wait for next update (501) |
| Per-opcode limit per second | Default 100 (1798); zero = unlimited (1659); kick by default (World.cpp:890) |
| Loop floor | `MinWorldUpdateTime` default 1 ms (Main.cpp:537; worldserver.conf.dist 372) |
| Visibility classes | 25 / 50 / 100 / 200 / 400 yards (ObjectDefines.h 30-35); max 533.3333 (GridDefines.h:40) |

## 4. TypeScript sketch

simplified: the sketch keeps the write-time change check, the single queue entry per fighter, the changed-field-only delta, one delta list per viewer, and the clear after the flush (same order as the donor: build, then clear). It omits byte encoding, the create and destroy messages (the donor's out-of-range and destroy sets), the per-viewer values, the cell marking and activation range, the per-session packet budget, and the loop. It uses a plain distance check instead of the donor's cell visit.

```ts
// Licence: GPL-2.0-or-later (donor source headers; COPYING is version 2). clean-room: written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  id: number;
  x: number;
  y: number;
  range: number;                 // visibility distance for this fighter type, units
  fields: Map<string, number>;
  changed: Set<string>;          // fields changed since the last flush
  queued: boolean;               // already in the dirty set this tick
}

export interface Viewer {
  id: number;
  x: number;
  y: number;
  known: Set<number>;            // fighter ids this viewer already has a copy of
}

export interface Delta { id: number; fields: Record<string, number> }

export class SnapshotHub {
  private dirty = new Set<Fighter>();

  // Write-time check: only a real change marks the field and queues the fighter once.
  set(f: Fighter, field: string, value: number): void {
    if (f.fields.get(field) === value) return;
    f.fields.set(field, value);
    f.changed.add(field);
    if (!f.queued) {
      f.queued = true;
      this.dirty.add(f);
    }
  }

  // Once per server tick: build one delta list per viewer, changed fields only, then clear.
  flush(viewers: Viewer[]): Map<number, Delta[]> {
    const out = new Map<number, Delta[]>();
    for (const f of this.dirty) {
      const fields: Record<string, number> = {};
      for (const name of f.changed) fields[name] = f.fields.get(name) as number;
      for (const v of viewers) {
        if (!v.known.has(f.id)) continue;                  // no copy yet: a create message is sent elsewhere
        if (Math.hypot(v.x - f.x, v.y - f.y) > f.range) continue;
        let list = out.get(v.id);
        if (list === undefined) {
          list = [];
          out.set(v.id, list);
        }
        list.push({ id: f.id, fields: { ...fields } });
      }
      f.changed.clear();
      f.queued = false;
    }
    this.dirty.clear();
    return out;
  }
}
```

Typecheck: copied to the VPS at /tmp/SP001-trinity-dirty-flush.ts and run `npx -y -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/snapshot.ts` (proposed new module: the fight state delta built from the engine's dirty set; the engine is the only writer of fight fields).
- Parity-checklist row 18 (server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget"; the flush is the net-tick step). The packet budget belongs to row 5 (input intake), noted in section 6.
- today: no equivalent file known to this read (not checked against the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the snapshot is built only from engine writes); rule 6 (tick loop described in section 1)

## 6. Gaps and risks

- GPL-2.0 copyleft: clean-room only. The sketch is written from the mechanism.
- Variable step: the donor's world loop has no target rate and no per-tick work budget (Main.cpp 537-568). Frankendom's fight runs on a fixed server tick, so the flush must run once per fixed tick, after the hit and guard decisions of that tick (the donor's order is session input, objects, flush: Map.cpp 678, 713, 795). Test that a hit decided on tick N appears in the flush of tick N.
- Order: the dirty set is an unordered set (Map.h:830), so iteration order is not defined. Frankendom's one ledger must not depend on the order in which fighters are flushed.
- Per-viewer cost: the field block is built once per viewer in range (Object.cpp:3068-3069), so cost grows with viewers times changed objects. Frankendom has one player plus up to MAX_ATTACKERS = 3, so this is small; a crowd of spectators would multiply it.
- Input budget (row 5): the donor kicks a player who sends too many packets of one opcode in one second (WorldSession.cpp:1519, 1533; default kick). That is wrong for fight inputs (guard, dodge, attack) that come in bursts. Keep the idea of a per-session budget, but make it a queue that delays, not a kick.
- Defect in the donor's limiter (fix: token bucket): the counter is a fixed one-second window that resets when the second changes (WorldSession.cpp:1515). A player can send the full limit at the end of one second and the full limit again at the start of the next. Fix: a token bucket per opcode with a refill rate and a burst size, as data fields.
- Variable step, not a defect in itself: timers advance by the real measured diff (Main.cpp:557-568), so one long pass is applied as one large step. There is no fixed rate to reason about under load. Frankendom's rule is a fixed step; do not copy the real-diff loop.
- Out-of-range and destroy messages are sent in the same packet (UpdateData.cpp 50, 64); the code that decides when they are sent is not read. Frankendom must decide visibility in the engine, not in the sender.
- Constants: the visibility table (ObjectDefines.h 28-35) and the packet budget (WorldSession.cpp:369) are compile-time constants in the donor; only the policy and the loop floor are config (worldserver.conf.dist 372, 4279). Frankendom should expose the visibility distances as per-type data and keep the budget as an engine constant.

Best transferable idea: Queue an entity for the snapshot only when a write really changes a field, then once per fixed tick send each viewer one batch with only the changed fields and clear the marks after the build.

Decision (proposed): adapt - keep the write-time change check, the single queue entry, the changed-field delta and one packet per client, flushed at Frankendom's fixed tick; replace the donor's kick for input bursts with a delaying token bucket.

Acceptance: a test with one fighter's HP changing and three idle NPCs produces exactly one snapshot message per client per tick, containing only the changed HP field; an idle tick produces no fight message; a hit resolved on tick N appears in the flush of tick N.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; snapshot built only from engine writes); row 5 for the input budget (noted, not built here)
