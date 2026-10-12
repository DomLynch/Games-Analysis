# teeworlds-teeworlds (server-performance-scaling, cell 3)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` (CServer::DoSnapshot, tick loop) with `src/engine/shared/snapshot.cpp` (CSnapshotDelta::CreateDelta, DiffItem) and `src/game/server/entity.cpp` (NetworkClipped), `src/game/server/entities/character.cpp` (CCharacter::Snap) | Licence: zlib-style notice (license.txt: "Permission is granted to anyone to use this software for any purpose," with the altered-source marking rule; code may be adapted if the notice is kept; data under CC-BY-SA 3.0 not used). Treated as permissive; if Dom's list is strict on zlib, flag it | C++ | symbol `CServer::DoSnapshot`

Checked: Read in full: `CServer::DoSnapshot` (server.cpp 502-640), the tick loop and snap gate (1380-1425), `CSnapshotDelta::CreateDelta` (snapshot.cpp 198-260), `DiffItem` (139-153), `CEntity::NetworkClipped` (entity.cpp 30-48), `CCharacter::Snap` start (806-810), the view-position update in `player.cpp` 74-100. Read in part: `CSnapshotBuilder::NewItem` (snapshot.cpp 651-668), `protocol.h` 81 and 91, `snapshot.h` 40-45 and 130, the ack handler (server.cpp 913-922). Not read: the gamecontext `OnSnap` bodies (which entities each client is offered), the callers of `NewItem` and how they handle a null return, the SNAPEMPTY branch in detail, the client's ack sender, `CVariableInt`, the demo recorder, the unpack side of the delta. Confidence: high on the snap-rate state machine and the delta; high on the interest clip; medium on the drop path (callers unread). camera_scope: not applicable (server cell); the spectator free-view (player.cpp:82) is a server view state that this note rejects for Frankendom (see section 6).

Best transferable idea: keep one snapshot state per client with three send rates (INIT, FULL, RECOVER), diff each snapshot against the last tick the client acknowledged, and test interest per entity before writing it, so a far or hidden entity is simply absent and the delta reports it as removed.
Decision (proposed): adapt — take the per-client rate state machine, delta-from-acked-base and per-entity interest test; reject the even-tick parity coupling of the snap clock (a defect, section 6) and the bare-null item overflow (a weak point, section 6); reject the spectator free-view clamp because the camera stays client-only.
Acceptance: a server test asserts that a viewer who never acked gets a snapshot every 10 ticks (200 ms at 50 ticks/s), gets one every 2 ticks after its first ack, falls back to once per second when its base is lost, and that an entity 1001 units to the side of its view is absent from its snapshot and reported as removed.

## 1. Mechanism

- Tick: 50 ticks per second (SERVER_TICK_SPEED = 50, protocol.h:81), so one tick is 20 ms. The tick time is `GameStart + Tick x freq / 50` (server.cpp:332).
- The loop (server.cpp 1383-1405): while the clock is past the next tick time, advance one tick (1385); a snap is flagged on every even tick (1387-1388); for each client, scan its 200-slot input buffer for the input whose game tick equals the current tick and apply it (1395-1397); then `OnTick`. The loop has no cap on how many ticks it catches up (1383).
- After the tick loop, if new ticks happened and either the high-bandwidth config is set or a snap was flagged, `DoSnapshot()` runs (1410-1413). The loop then waits, clamped to 1-10 ms (1425).
- `DoSnapshot` (502-640): per client in game, two skip rules come first. A client in RECOVER is skipped unless the tick is a multiple of 50 (529-530, once per second). A client in INIT is skipped unless the tick is a multiple of 10 (533-534).
- For each client that passes, the server builds that client's snapshot from scratch by calling `OnSnap(i)` (551), finishes it, computes a CRC, stores it in the client's history (559-562, history pruned to 3 seconds of ticks at 559).
- Delta base: the client's last acknowledged snapshot tick (568-570). If there is none, a FULL client drops to RECOVER (574-575).
- `CreateDelta(base, current)` (580). If the delta is non-empty it is variable-int compressed (589), cut into packets of at most 900 bytes (586-590), and sent as one SNAPSINGLE message or as a numbered SNAP chunk series. If the delta is empty, an empty-snapshot message is sent instead (the else branch).
- Ack: the client's ack sets `m_LastAckedSnapshot` (913). A positive ack sets the client to FULL (921-922).
- Delta content (`CreateDelta`, snapshot.cpp 198-260): first the base items whose key is absent from the current snapshot are listed as deleted (the pass at 214-224; 207 is only the counter reset). Then the base is hashed by item key (227), and for each current item the base item with the same key is looked up (past-index array at 228, loop after it). If found, `DiffItem` subtracts int by int and the item is written only if any int differs (139-153, 257). If not found, the whole item is written. Unchanged items cost zero bytes.
- Interest: `CCharacter::Snap` returns before writing anything when `NetworkClipped(SnappingClient)` is true (806-809). `NetworkClipped` (entity.cpp 40-47) compares the entity with the viewer's view position: clipped if |dx| > 1000 or |dy| > 800, and then also clipped if the distance is over 1100. A clipped entity is simply not in the snapshot, so the delta lists it as deleted.
- View position: for an alive player it is the character position (player.cpp:98). Free-view spectators move their view toward the client's target with a per-tick clamp of 500 on x and 400 on y (player.cpp:82).
- Units: the game layer test divides world coordinates by 32 (entity.cpp:53), so 32 units is one tile. The clip box is therefore about plus or minus 31 by 25 tiles, and the circle about 34 tiles (arithmetic from those numbers).

## 2. Key functions

- `CServer::DoSnapshot` at `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 502-640: per-client snap, delta and packetisation. Read in full.
- The tick loop at `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 1383-1425: catch-up ticks, even-tick snap flag, input match, wait clamp. Read in full.
- `CSnapshotDelta::CreateDelta` at `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/shared/snapshot.cpp` 198-260: deleted list, key hash, per-item diff. Read in full.
- `DiffItem` at `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/shared/snapshot.cpp` 139-153: per-int subtraction and the change flag. Read in full.
- `CEntity::NetworkClipped` at `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/entity.cpp` 35-48: box and circle clip. Read in full.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed tick clock | 50 ticks per second (protocol.h:81); tick time at server.cpp:332 |
| Snap on a parity gate, then per-client rate | snap flag on even ticks (server.cpp 1387-1388); about 25 snapshots per second when one tick runs per loop |
| INIT rate (no ack yet) | every 10 ticks, about 200 ms (server.cpp:533) |
| RECOVER rate (base lost) | every 50 ticks, once per second (server.cpp:529) |
| FULL rate (acked) | on every snap tick (server.cpp 921-922) |
| Delta history | 3 seconds, 150 ticks (server.cpp:559) |
| Packet payload | 900 bytes (protocol.h:91, server.cpp:586) |
| Snapshot size and item cap | 64 x 1024 bytes (snapshot.h:43); 1024 items with a `+1 >=` guard, so 1023 usable (snapshot.h:130, snapshot.cpp:654) |
| Interest clip | box +-1000 by +-800 and circle 1100 (entity.cpp:43, 46), in units of 32 per tile (entity.cpp:53) |
| Input buffer | 200 slots per client, matched by game tick (server.cpp 1395-1397) |
| Wait clamp | 1 to 10 ms (server.cpp:1425) |

Numbers for a phone and a small Node server, as arithmetic only (not measured): 25 snapshots per second with 900-byte packets is a reasonable phone budget. The clip box is far larger than a 375-wide phone view, so it is a coarse server-side cull, and the phone viewport would be a tighter one for Frankendom.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rate state machine (INIT every 10 ticks, RECOVER once per second, FULL on each snap tick, ack moves to FULL), the box-then-circle clip, the per-int diff with the change flag, the packet cut at 900 bytes and the item cap. It omits the snap-history ring, the CRC, the deleted-key list and the hash lookup of the base, the variable-int compression, the input buffer, and the spectator view. It reorders one thing on purpose: `ItemBudget` counts a dropped item instead of returning a bare null (section 6, D1), and uses the donor's exact guard (`items + 1 >= 1024`, so 1023 usable). It does not model the even-tick parity gate; the caller is assumed to call `dueOnSnapTick` only on snap ticks.

```ts
// Licence: zlib-style notice (donor teeworlds-teeworlds, license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

export const TICKS_PER_SECOND = 50;                 // donor SERVER_TICK_SPEED = 50; one tick = 20 ms
export const PAYLOAD_BYTES = 900;                   // donor MAX_SNAPSHOT_PACKSIZE = 900
export const HISTORY_TICKS = 3 * TICKS_PER_SECOND;  // donor keeps 3 s of snapshots per client
export const ITEM_CAP = 1024;                       // donor CSnapshotBuilder MAX_ITEMS; guard is items + 1 >= cap, so 1023 usable

export enum SnapRate { INIT = 0, FULL = 1, RECOVER = 2 }

export interface Viewer {
  snapRate: SnapRate;
  lastAckedTick: number; // -1 when nothing acknowledged yet
  viewX: number;
  viewY: number;
}

// Donor gate (server.cpp 529-533). The caller only runs this on snap ticks (even ticks, server.cpp 1387).
export function dueOnSnapTick(v: Viewer, tick: number): boolean {
  if (v.snapRate === SnapRate.RECOVER) return tick % TICKS_PER_SECOND === 0; // once per second
  if (v.snapRate === SnapRate.INIT) return tick % 10 === 0;                  // every 10 ticks until first ack
  return true;                                                               // FULL
}

// Donor 921-922: a positive ack moves the client to FULL and becomes the delta base.
export function onAck(v: Viewer, ackedTick: number): void {
  v.lastAckedTick = ackedTick;
  if (ackedTick > 0) v.snapRate = SnapRate.FULL;
}

// Donor 574-575: a FULL client with no usable base falls back to RECOVER.
export function onNoBase(v: Viewer): void {
  if (v.snapRate === SnapRate.FULL) v.snapRate = SnapRate.RECOVER;
}

// Donor NetworkClipped (entity.cpp 40-47): a box of +-1000 by +-800 around the viewer, then a 1100 radius circle.
export function clipped(v: Viewer, x: number, y: number): boolean {
  const dx = v.viewX - x;
  const dy = v.viewY - y;
  if (Math.abs(dx) > 1000 || Math.abs(dy) > 800) return true;
  return Math.hypot(dx, dy) > 1100;
}

// Donor DiffItem (snapshot.cpp 139-153): per-int subtraction; the item is sent only if any int differs.
export function diffItem(past: number[], cur: number[]): { changed: boolean; diff: number[] } {
  let needed = 0;
  const diff = cur.map((value, i) => {
    const d = value - past[i];
    needed |= d;
    return d;
  });
  return { changed: needed !== 0, diff };
}

// Donor 586-590: the compressed delta is cut into payload-sized packets.
export function chunk(bytes: Uint8Array, payload: number = PAYLOAD_BYTES): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let off = 0; off < bytes.length; off += payload) {
    out.push(bytes.subarray(off, Math.min(off + payload, bytes.length)));
  }
  return out;
}

// Counts a drop instead of a bare null (donor snapshot.cpp 651-668 returns null at its guard): report it.
export class ItemBudget {
  private items = 0;
  dropped = 0;

  tryAdd(bytes: number, maxBytes: number, used: number): boolean {
    if (this.items + 1 >= ITEM_CAP || used + bytes > maxBytes) {
      this.dropped++;
      return false;
    }
    this.items++;
    return true;
  }
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run this turn). The local Quality Floor hook could not find tsc on the Mac; the VPS run is the check used here.

## 5. Lands in

- TARGET `src/fight/snapshot.ts` (the server's per-viewer snapshot: rate state, delta base and interest test; the engine decides what is sent, the client applies it).
- Parity-checklist row 18 (server tick), sub-line "server tick: fixed step, input intake, per-tick NPC budget"; post-K item 3. The 50-tick fixed clock and the input match by game tick (server.cpp 1383-1397) are the part of this note that belongs to that sub-line.
- Reuse tag: rewrite-from-idea (zlib-style; code may be adapted with the notice kept; this sketch is clean)
- Brief rule served: rule 1 (one engine; the server decides what each viewer gets); no camera or client rule touched.

## 6. Gaps and risks

- Frankendom rulings, kills are server-verified: the donor sends state through snapshots and events through separate messages (the reliable VITAL path is used in server.cpp, for example 708-784; not read in detail). A hit or kill must go on the reliable event path. The interest clip and the rate gate may only cull presence and state, never a hit confirmation.
- Interest versus the camera rule: the donor's interest centre is the character's server-side position (player.cpp:98), not a client camera. That fits Frankendom's rule that the camera is client-only. The spectator free-view (player.cpp:82) is a server-side view that moves toward the client's aim with a clamp; reject it for Frankendom because the camera stays client-only.
- One ledger: the snap history and the per-client rate are send bookkeeping, not game state. Keep them out of the duel record.
- MAX_ATTACKERS = 3: a duel's snapshot is small and the 1000 by 800 clip never bites inside a duel. The clip matters for zones (parity row 23 follow-up).
- Weak point D1 (overflow handling, overstated in the first draft): `CSnapshotBuilder::NewItem` returns null when the item cap or byte cap guard fires (snapshot.cpp 653-660). Inside the guard two `dbg_assert` calls run first, and `dbg_assert` is always compiled in (it logs and breaks, system.c 107-113), so a real overflow past the asserted limits stops the server rather than dropping quietly. The silent `return 0` only happens in the narrow band where the guard fires but the asserts still pass (for example exactly 1023 items). Callers do null-check and return (character.cpp 812-813). So this is a hard-limit design, not a proven silent loss. Frankendom should still count and rank items before the budget: `ItemBudget` in the sketch counts a drop, and the server should rank items nearest first. The delta code also keeps a fixed 1024-entry index array (`aPastIndecies`, snapshot.cpp 228) that is coupled to the item cap, and the first guard also counts the per-item key and offset bytes (653).
- Defect D2 (catch-up with no cap): the loop at server.cpp:1383 runs every missed tick in one pass, so a long stall runs many `OnTick` calls back to back and then a burst of snapshots. Fix: cap ticks per loop iteration and reset the clock when far behind.
- Defect D3 (parity coupling): snapshots are gated on even ticks (server.cpp 1387-1388, 1412), not on a time schedule, so the send rate depends on how many ticks a loop iteration ran. Fix: a time-based snap scheduler with the same rate states.
- Gap G1 (no encode-once fan-out): `DoSnapshot` calls `OnSnap(i)` once per client (server.cpp:551), so the world is re-serialised for every client every snap tick. Contrast LostCityRS-Engine-TS, which caches each mask once per entity (its renderer.ts:100-106). Not measured; at 1k players this is the first cost to move.
- Gap G2 (input scan): the input match scans 200 slots per client per tick (server.cpp 1395-1397). Fix: index the buffer by game tick. Not measured.
- Not read: the `OnSnap` bodies, the `NewItem` callers, the SNAPEMPTY branch, the client ack sender, `CVariableInt`, the demo recorder, and the delta unpack side (snapshot.cpp 294 onward). No load test or bot harness was read in this donor, so no 1k or 10k claim is checked.

Reuse tag: rewrite-from-idea (zlib-style, clean sketch)
Brief rule served: rule 1 (one engine; server decides the send); no camera or client rule touched.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: zlib licence; SERVER_TICK_SPEED 50 and MAX_SNAPSHOT_PACKSIZE 900 (protocol.h 81/91); TickStartTime server.cpp 332; DoSnapshot skip rules 529-534 (RECOVER %50, INIT %10); OnSnap 551; history purge 3 s at 559; base/RECOVER fallback 568-576; CreateDelta 580; chunking 586-600; ack 913/921-922; tick loop 1383-1413 (even-tick snap 1387, input scan 200 slots 1395-1397, uncapped catch-up); wait clamp 1..10 ms at 1425; NetworkClipped 40-47 (1000/800 box, 1100 circle); view pos player.cpp 98 and spectator clamp 82; DiffItem 139-153; Character::Snap 806-809. Errors: (1) Defect D1 says the only signal on item overflow is 'a debug assert' so in release the item is silently lost. Real: dbg_assert is always active (system.h:38 -> system.c:107-113 dbg_msg + dbg_break/__builtin_trap; only swapped to assert() under __clang_analyzer__), so overflow past the guard crashes the server; the silent return 0 only occurs in the narrow band where the guard fires but the asserts still pass (e.g. NumItems == 1023 or the Size term). Callers (Character::Snap 812-813) do null-check and return. D1 is overstated and the ItemBudget rationale is weaker than claimed. (2) 'deleted list from line 207' - the deleted-items pass is at snapshot.cpp 214-224 (207 is the counter reset). (3) ItemBudget uses items+1 > 1024 whereas donor guard is NumItems+1 >= 1024 (cap 1023). Core claims (rate state machine, delta from acked base, interest clip) are right.
Missed: Not covered: first condition in NewItem also counts per-item key/offset bytes (snapshot.cpp 653), and CreateDelta uses a fixed aPastIndecies[1024] array that equals the item cap - a coupled limit. Minor.

Fixed 2026-10-12 (Sonnet fixer): D1 rewritten (the asserts always run, so overflow is mostly a hard stop and only a narrow band returns null; callers null-check), softened from 'silent drop defect' to 'weak point'; deleted-list line corrected to 214-224; ItemBudget now uses the donor's guard (items + 1 >= 1024); noted the coupled 1024 index array and key/offset byte count. Sketch changed, typecheck below.
