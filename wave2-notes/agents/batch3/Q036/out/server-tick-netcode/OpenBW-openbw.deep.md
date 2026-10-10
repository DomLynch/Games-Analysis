# OpenBW-openbw (server-tick-netcode, cell 3)

Donor: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` | Licence: unclear (the donor has no LICENSE or COPYING file and no licence or copyright header; a grep for licen, copyright and GNU across the donor, excluding deps/, found nothing; README.md only points to the bwapi repo) | C++ | symbol `syncer_t::sync` (sync.h 958-996)

Checked: Read: sync state (sync.h 18-112), scheduling and buffer (184-290, incl. `schedule_action` 223-281), `recv` (375-437), `send` (363-370), client-frame, timeout, insync hash and insync send (594-660), `process_messages` lines 778-800 and 840-870, the barrier (928-1012), and the public wrappers (1075-1115). Not read: the byte writers (290-360), `kill_client` and the game-start path (456-776), `process_messages` lines 800-840 and 870-930, `action_functions::next_frame` (the world step), and the asio backends. Callers: `sync_functions::next_frame(server)` (210-213: sync, then the world step) has no caller inside this donor (grep); the public `sync(server)` (1078-1079) has none either, so the host loop that drives the frame is not in the donor. The frame order is therefore read from the code, not from a host loop. `bwgame.h:22375` calls `funcs().next_frame()`; which overload it reaches was not read. Confidence: high on the input stamping, the barrier, and the hash schedule; medium on the peer-kill direction (inferred from who sends and who compares, see section 6). Not a camera cell (no camera_scope).

## 1. Mechanism

- This is deterministic lockstep: peers exchange inputs (called "actions" in the code) and a frame counter, and every peer runs the same world. Inputs are not applied when they arrive. Each arriving input is stamped with the frame it is due: the sender's last reported frame plus `latency` (sync.h 279, `client->frame + sync_st.latency`), with `latency = 2` by default (25). Each client has its own byte buffer capped at `1024 * 4 * latency` bytes (231).
- Frame counter: `sync_frame` increments once per sync (940). Each peer broadcasts its own counter (`send_client_frame`, 605-609, called at 941), and the receiver stores it as `client->frame` (380). The counter is `uint8_t` in the queue check (195), so it wraps every 256 frames.
- Barrier: `sync()` (958-996) runs `sync_next_frame` (increment, broadcast, insync check every 32 frames), then waits in the event loop until every client satisfies `(int8_t)(sync_frame - c->frame) < latency` (the predicate at 949-955 and 964). Only after that does it stamp `last_synced` for all clients (992) and call `process_messages` (995). So a client that is `latency` frames behind holds the whole game at the barrier.
- The only exit from a stalled barrier is `timeout_func` (611-623), a 1-second timer (622): it kills a client only if that client has not completed a sync for 60 seconds (616) and is `latency` frames behind (617). Nothing else releases the barrier in the code read. (inferred from 616 and 958-996; not run.)
- Execution: in `process_messages` (778-), once the game has started, `execute_scheduled_actions` runs every action whose stamped frame equals the current `sync_frame` (788; the check at 195). Actions are then applied in the world step, which `next_frame(server)` runs after `sync()` (210-213).
- Desync check: every 32 frames after the game starts (943), each peer computes an FNV-1a 32-bit hash over the counters and state fields in `update_insync_hash` (625-650). The fields are the successful and failed action counts, the RNG state, minerals and gas, the gathered totals, the active order, bullet and thingy counts, and for each visible unit its HP plus shields and its exact x and y (633-646). The hash goes into a ring of 4 slots (110, 647) and is sent as an input (`send_insync_check`, 652-659).
- When a peer's insync input is executed, the receiving peer compares the hash it carries with its own slot at the same index and kills that client on mismatch (798-800).

## 2. Key functions

- `syncer_t::sync`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 958-996. Frame advance, barrier, last-synced stamp, message processing.
- `sync_functions::schedule_action`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 223-281. Buffer grow and stamp (frame + latency).
- `sync_functions::execute_scheduled_actions`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 191-205. Runs actions whose stamp equals the current frame.
- `syncer_t::update_insync_hash`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 625-650. FNV-1a over state, ring of 4.
- `syncer_t::timeout_func`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 611-623. 60-second stall kill, 1-second timer.
- `sync_functions::next_frame(server)`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 210-213. Sync, then world step.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stamp an input with the tick it is due: last reported tick plus a fixed delay | Delay 2 frames (sync.h 25, 279) |
| Bounded per-client input buffer | 1024 * 4 * latency bytes = 8192 bytes at latency 2 (231) |
| Apply inputs only on their due tick | Equality test on the 8-bit counter (195) |
| State checkpoint every N ticks, small ring of recent hashes | Interval 32 (943), ring of 4 (110) |
| Drop a stalled peer after a long silence | 60 s (616), checked each 1 s (622) |
| Pre-start wait for a first scheduled action | 50 ms (976) |
| Frame counter wrap | 256 frames (uint8, 195, 940) |

## 4. TypeScript sketch

simplified: the sketch keeps the input stamping (last acknowledged tick plus latency), the bounded queue, the apply-when-due drain, and the 32-tick checkpoint ring with 4 slots (FNV-1a with `Math.imul`). It drops the lockstep barrier (a server here does not wait for clients), the 8-bit counter, the byte buffers and grow logic, the start-game gate, the peer kill, the uid and greeting handshakes and the game-start branch. It differs from the donor in one place: a late input (due tick already past) is counted and dropped, while the donor leaves it at the front of its client's queue until the 8-bit counter comes round again (inferred from 195; not run). The ring starts at index 0 as the donor's counter does.

```ts
// Licence: unclear (donor has no licence file or header). Clean-room sketch written from the described mechanism; shape only, not a translation of the donor lines.
// clean-room
export interface Scheduled {
  tick: number;                  // tick the input is due on
  playerId: string;
  input: Uint8Array;
}

export class ScheduledIntake {
  private queue: Scheduled[] = [];

  constructor(private readonly latencyTicks: number, private readonly maxQueued: number) {}

  // ackedTick is the last tick this client reported. The input is due latencyTicks later.
  accept(playerId: string, ackedTick: number, input: Uint8Array): boolean {
    if (this.queue.length >= this.maxQueued) return false;   // bounded buffer
    this.queue.push({ tick: ackedTick + this.latencyTicks, playerId, input });
    return true;
  }

  // Run once per server tick, before the world step. Applies only the inputs due now.
  applyDue(tick: number, apply: (playerId: string, input: Uint8Array) => boolean): { applied: number; late: number } {
    let applied = 0;
    let late = 0;
    const keep: Scheduled[] = [];
    for (const s of this.queue) {
      if (s.tick === tick) {
        if (apply(s.playerId, s.input)) applied++;
      } else if (s.tick < tick) {
        late++;                  // missed its tick: dropped, not replayed
      } else {
        keep.push(s);
      }
    }
    this.queue = keep;
    return { applied, late };
  }
}

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

// Every `interval` ticks, hash the fields that must agree and keep the last 4 hashes.
export class CheckpointRing {
  private slots: number[] = [0, 0, 0, 0];
  private index = 0;

  constructor(private readonly interval: number) {}

  maybeRecord(tick: number, fields: number[]): boolean {
    if (tick % this.interval !== 0) return false;
    let h = FNV_OFFSET;
    for (const v of fields) {
      h ^= v >>> 0;
      h = Math.imul(h, FNV_PRIME) >>> 0;
    }
    this.index = (this.index + 1) % this.slots.length;
    this.slots[this.index] = h;
    return true;
  }

  at(i: number): number {
    return this.slots[i];
  }
}
```

Typecheck: the same block with `export {}` appended, run with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS: exit 0.

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module, same as cells 1 and 2): the server tick's input intake, which stamps each input with its due tick and applies it only on that tick. Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The checkpoint ring is a candidate for row 19 (fight record and replay), not row 18.
- Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
- Brief rule served: 1 (one engine: the server applies inputs on the tick the engine runs); server-verified kills (the server, not a peer, decides).

## 6. Gaps and risks

- Licence unclear: clean-room, shape only. The FNV-1a offset and prime are the public FNV constants, not donor-specific; the sketch uses them as such.
- The lockstep barrier is wrong for us. The server steps on its own clock. A barrier would let one laggy phone hold a duel, and here that hold lasts until a 60-second kill (616). Reject the barrier.
- The peer kill on hash mismatch conflicts with server-verified kills: a peer must not decide a kill. The direction (each peer checks the other's hash) is inferred from the code and was not run. Reject as a kill rule. If kept, it is a server-side replay check only (row 19).
- The hash covers minerals, gas, RNG state, and visible unit HP and position, not the whole state. Frankendom would need its own field list (ledger totals, HP, positions, RNG) and a rule that says which fields are in it.
- Dead code: sync.h 277-278 builds an unused hex string for every scheduled action. Do not copy it.
- The 8-bit counter wraps every 256 frames. The donor compares it with signed subtraction, which works only while the gap stays under 128. Use a wider counter.
- Not read: the byte writers (290-360), `kill_client` and the game-start path (456-776), `process_messages` 800-840 and 870-930, the world step (`action_functions::next_frame`), and the asio backends. So the exact game-start gate and the per-frame world step are not verified here.

Reuse tag: rewrite-from-idea (licence unclear; clean-room, shape only)
Brief rule served: 1 (one engine on the server); post-K item 3 (server tick, input intake) for the input stamping; row 19 for the checkpoint ring.

Best transferable idea: Stamp each client input with the tick it is due (last acknowledged tick plus a fixed delay), apply it only on that tick from a bounded queue, and checkpoint a small state hash every 32 ticks for desync checks.

Decision (proposed): adapt. Take the stamped, bounded input intake for the server tick (row 18) and the 32-tick checkpoint ring as a replay check (row 19); reject the lockstep barrier, the 60-second stall kill and the peer kill on mismatch, because the server steps on its own clock and decides kills.
Acceptance: Server test: an input acknowledged at tick 100 with a 2-tick delay is applied at tick 102 only; a client that stops acknowledging does not stop the server from stepping; a stored checkpoint at tick 64 equals the replayed checkpoint at tick 64.
