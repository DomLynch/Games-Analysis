# STJr-SRB2 (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c | Licence: GPL-2 | C | symbol P_RemoveMobj (queue push) / P_RespawnSpecials (opened: P_RemoveMobj 11180-11283, P_RespawnSpecials 11548-11583, P_SpawnMapThing 13533-13567; P_Ticker 715-917 and P_PreTicker 920-983 in /mnt/frankendom-donors/STJr-SRB2/src/p_tick.c)

## 1. Mechanism

- When a respawnable item (ring, coin, NiGHTS star, red or blue team ring, weapon or panel pickup, and only if it has a `spawnpoint`) is removed, `P_RemoveMobj` (11180-11283; the queue push is 11189-11205, the rest of the function removes overlays and followers and was not read) stores a pointer to that item's original map spawn record (`mobj->spawnpoint`) and `leveltime` in two parallel 1024-slot arrays used as a FIFO ring (`itemrespawnque`, `itemrespawntime`, 11173-11175; `ITEMQUESIZE` 1024 in p_local.h line 276). Items flagged `MF2_DONTRESPAWN` are never queued. `P_SpawnMobj` sets that flag on a monitor when not in a netgame / multiplayer, or in co-op for 1up and score monitors (10736-10744).
- If the queue is full, the oldest entry is dropped (the tail advances, 11203-11204).
- `P_RespawnSpecials` (11548-11583) runs once per tic in the thinker pass: `P_Ticker` line 818 and `P_PreTicker` line 970 (p_tick.c), each directly after `P_UpdateSpecials`.
- It returns early unless: the session is netgame or multiplayer, the map is not a NiGHTS map (`maptol & TOL_NIGHTS`), the `respawnitem` cvar is on (default On, line 11343), and the map is not a special stage (`G_IsSpecialStage`). The queue must be non-empty.
- Only the oldest entry (the tail) is considered. It is released when `leveltime - removedAt >= respawnitemtime * TICRATE`. The cvar `respawnitemtime` defaults to 30 (line 11342; its allowed range was not read); `TICRATE` is 35 (doomdef.h line 464).
- Release calls `P_SpawnMapThing` (13533-13567) on the stored record. That function returns without a mobj for type 0, the 3D-mode start thing, non-mobj map things, a refusal by `P_AllowMobjSpawn`, or a substitution to `MT_NULL`; otherwise it computes position and height and calls `P_SpawnMobjFromMapThing` (not read). The tail advances in every case, so at most one record leaves the queue per tic whether or not an object appeared.
- Output: normally a new mobj at its home position. Whether the spawn writes anything back to the record (`P_SpawnMobjFromMapThing` was not read) is unknown; the same record can be queued again each time the item is removed.
- The queue is file-scope globals in p_mobj.c (11173-11175); when it is cleared on level change was not read. How the spawn reaches other players was not traced.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| P_RemoveMobj | /mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c | 11180-11283 (queue push 11189-11205) | Pushes a removed respawnable item's spawn record and tick onto the ring queue, then does unrelated removal work |
| P_RespawnSpecials | /mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c | 11548-11583 | Per tic: gates on mode and cvars, releases the queue head after the delay, rebuilds the item |
| P_SpawnMapThing | /mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c | 13533-13567 | Builds a mobj from a map thing record (type lookup, substitution, placement) |
| P_SpawnMobj | /mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c | 10627-11088 (DONTRESPAWN at 10736-10744; the rest not read) | Allocates and initialises a mobj; sets DONTRESPAWN for monitors in some modes |
| P_Ticker (call at 818) / P_PreTicker (call at 970) | /mnt/frankendom-donors/STJr-SRB2/src/p_tick.c | 715-917 (call at 818); 920-983 (call at 970) | Runs P_RespawnSpecials once per tic in both thinker paths |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Timed respawn of a removed spawn-point record, released head-first from a bounded FIFO | Queue size 1024 (theirs, ITEMQUESIZE in p_local.h) |
| Delay compared in ticks against a seconds cvar times a ticks-per-second constant | Default delay 30 seconds (theirs); 35 tics per second (theirs, TICRATE) |
| One release per tic | Single pop per tic (theirs) |
| Gate by mode (multiplayer only) | Multiplayer-only, NiGHTS excluded, special stages excluded (theirs) |

## 4. TypeScript sketch

Licence: GPL-2. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the mode gates (netgame / multiplayer, NiGHTS, special stage, cvar) are one `enabled()` callback; which item types are respawnable and the DONTRESPAWN flag are one `respawnable` argument; the spawn callback hides `P_SpawnMapThing`'s early returns (the tail still advances); the ring uses modulo instead of the donor's mask.

```ts
// clean-room sketch of a timed respawn queue for removed spawn records.
// Licence line: GPL-2 donor; this sketch is clean-room, written from mechanism only.
interface SpawnRecord { id: number; kind: string; x: number; y: number; }
interface RespawnSlot { record: SpawnRecord; removedAt: number; }
const QUEUE_SIZE = 1024;          // theirs: queue capacity
const TICKS_PER_SECOND = 35;      // theirs: tic rate
const DEFAULT_DELAY_SECONDS = 30; // theirs: delay
class RespawnQueue {
  private slots: (RespawnSlot | undefined)[] = new Array(QUEUE_SIZE);
  private head = 0;
  private tail = 0;
  constructor(private enabled: () => boolean, private delaySeconds = DEFAULT_DELAY_SECONDS) {}
  // Called when a respawnable object is removed.
  onRemoved(record: SpawnRecord | undefined, nowTick: number, respawnable: boolean): void {
    if (!record || !respawnable) return;
    this.slots[this.head] = { record, removedAt: nowTick };
    this.head = (this.head + 1) % QUEUE_SIZE;
    if (this.head === this.tail) this.tail = (this.tail + 1) % QUEUE_SIZE; // drop oldest
  }
  // Called once per tick. Returns the record to rebuild, or undefined.
  tick(nowTick: number, spawn: (r: SpawnRecord) => void): void {
    if (!this.enabled()) return;
    if (this.head === this.tail) return;
    const front = this.slots[this.tail];
    if (!front) return;
    if (nowTick - front.removedAt < this.delaySeconds * TICKS_PER_SECOND) return;
    spawn(front.record);
    this.slots[this.tail] = undefined;
    this.tail = (this.tail + 1) % QUEUE_SIZE;
  }
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (exists: the server already holds each spawn's alive / respawn state and a per-row respawn window, `respawnSeconds`, origins/mobs/row.ts line 37). Creatures there each carry their own timer, so the donor's shared FIFO queue is not needed for creatures; the only new idea is a bounded head-first queue with one release per tick, which would matter only for ground pickups or gathering nodes if Frankendom adds them (none located in origins/ for this note). Not src/fight/ai.ts: a respawn timer is not the brain.
- Parity-checklist row: 4 (fight loop: what is alive near the player); also row 17 (death / respawn is open-world respawn by design). Feature map: zones as data.
- Reuse tag: rewrite-from-idea
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills / one ledger: the respawn clock must be the server's (origins/server/world-spawns.ts and the per-account respawn window in origins/server/mob-rewards.ts), never a client queue like the donor's. A donor-style global queue would be a second clock.
- Zones as data: the donor's gating (multiplayer only, no NiGHTS, no special stage) is by mode flags in code; in Frankendom it would be zone fields (`rules.safe` exists today), and the 30 s default must be a row / zone field, not a literal (no hidden numbers).
- The donor respawns pickups, not fighters; the 1v1 duel loop has no consumer. MAX_ATTACKERS = 3 is unaffected: a respawned creature joins the ring queue (src/fight/world.ts).
- Overflow drops the oldest entry silently and release is one per tick; those are throughput choices for item drops. Whether overflow is acceptable for creature camps is for Lead to decide.
- Conflict check: one queue only, in the server tick; not both client and server.
