# geckosio-geckos.io (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/geckosio-geckos.io/packages/server/src/geckos/channel.ts` | Licence: BSD 3-Clause License (`/mnt/frankendom-donors/geckosio-geckos.io/LICENSE` line 1; code may be adapted) | TypeScript | symbol `ServerChannel` getters `room` and `broadcast`, method `forward`, with `makeReliable` (`common/src/reliableMessage.ts`)

Checked: confidence high on the room and reliable logic as written; medium on runtime behaviour (no test run, no transport read). Opened and read: `server/src/geckos/channel.ts` (whole, 289 lines), `server/src/geckos/server.ts` 95-140, `common/src/reliableMessage.ts` (whole), `common/src/runInterval.ts` (whole), `common/src/makeRandomId.ts` (whole), `packages/chatApp/src/server.ts` (whole), `packages/chatApp/src/client.ts` (whole), `LICENSE` line 1. Grep for `.join(` and `.leave(` across `packages/` (only a commented line in `client/src/wrtc/connectionsManager.ts`). Grep for party, guild, clan and friend across the donor's .ts and .js files: no hits. Not read: `webrtcConnection.ts` (the `connections` map), `connectionsManager.ts`, the client channel's reaction to repeats, the WebRTC transport. The hint file (`packages/chatApp/src/server.ts`) is the demo; the mechanism is in `channel.ts`. camera_scope: not applicable.

## 1. Mechanism

- A server channel (one per connected client) holds one room id, `_roomId`, undefined by default (`channel.ts` 15, 30). `join(roomId)` sets it and `leave()` clears it (93-100). Nothing in the packages calls them (grep above), so the shipped chat demo never joins a room.
- Three fan-out forms, each a loop over every connection (`this.webrtcConnection.connections`):
  - `room.emit` (103-121): sends to every channel whose room id equals the sender's own room id, the sender included (115-116). Because undefined equals undefined, every channel with no room forms one implicit lobby room.
  - `broadcast.emit` (124-142): the same test, plus `id !== this._id`, so the sender is excluded (136-137).
  - `forward(roomId).emit` (148-180): targets a named room and uses the sender id as the third argument (174). It delivers to the target channel's `eventEmitter`, which is the server-side listener bus that inbound client messages go to (43), not to its data channel. So `forward` is a message between server-side channel handlers; the client receives only what a receiving handler sends back. The chat demo never uses `forward`.
- Client-facing sends go through `channel.emit`, which calls `_emit` (188-200, 202-221). `_emit` calls `SendMessage` on the data channel (215).
- Reliable sends (`options.reliable`, 189-196): `makeReliable(options, cb)` (`common/src/reliableMessage.ts` 4-10) makes one random 24-character id and calls `runInterval(interval, runs, ...)` with the same id each time. Defaults: interval 150 ms, runs 10 (`reliableMessage.ts` 5). `runInterval` (`common/src/runInterval.ts` 1-19) calls the callback at once, then on a `setInterval`, and clears the timer when its counter reaches `runs - 1` (13). That gives `runs` sends in total: one now and nine on the 150 ms ticks, the last at about 1.35 s. There is no acknowledgement: the sender never learns whether a copy arrived.
- Receiver side (`on`, 252-288): a message whose `RELIABLE` flag is 1 and whose id is not `'undefined'` (257) first prunes old entries, which expire 15 s after receipt (259, 264-268), then is delivered only if no kept entry has the same id (274-285). Repeats of an id seen in the last 15 s are dropped.
- Pruning bug: the prune loop calls `splice` inside `forEach` (264-268). Removing an element shifts the next one into the current index, and `forEach` moves past it, so some expired entries survive the pass and are removed on a later call. This is a reading of JavaScript `forEach` semantics; not run.
- Buffering: `autoManageBuffering` is true by default (33-38). In `_emit`, if the data channel has bytes queued (208), a non-reliable send is dropped and a drop event fires (218). A reliable send bypasses that check (214). The comment at 213 says the server should never buffer.
- Dead conditions: `if (!this._roomId || this._roomId === this._roomId)` (203) and `if (!this._id || this._id === this._id)` (204) are always true except for NaN, so they do nothing.
- Demo behaviour (`packages/chatApp/src/server.ts` 57-69), derived from the code, not run: one chat line from client X produces `io.emit` "ALL:" to everyone (59), `channel.room.emit` "ROOM:" to everyone, because nobody has joined a room (62), `channel.broadcast.emit` of the raw text to everyone except X (65), and "SENT:" back to X (68). Every client therefore gets three lines per chat line.
- Tick and camera: not applicable. The fan-out runs when a message arrives; there is no per-frame loop.

## 2. Key functions

- `ServerChannel.room` (getter): `channel.ts` 103-121. Filters by room id and calls `channel.emit` on each match (115-116).
- `ServerChannel.broadcast` (getter): `channel.ts` 124-142. Same filter plus the sender exclusion (136-137).
- `ServerChannel.forward`: `channel.ts` 148-180. Targets the named room; reliable path via `makeReliable` (161-172); otherwise direct to the target's `eventEmitter` (174).
- `ServerChannel._emit`: `channel.ts` 202-221. The buffering drop (208-218) and the `SendMessage` call (215).
- `ServerChannel.on`: `channel.ts` 252-288. Reliable dedupe window (259, 264-280).
- `makeReliable`: `common/src/reliableMessage.ts` 4-10.
- `runInterval`: `common/src/runInterval.ts` 1-19.
- `Server.room`: `server/src/geckos/server.ts` 109-122. Same room filter on the server object (116), with `channel.emit` (117).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One room id per connection; leave clears it | Default undefined (`channel.ts` 30); none other |
| Room send reaches the room, sender included; broadcast excludes the sender | None (the equality test 115; the id test 136) |
| Reliable = same id, several sends spaced in time, no ack | Interval 150 ms and runs 10 (`reliableMessage.ts` 5) |
| Receiver keeps ids and drops repeats | Window 15 000 ms (`channel.ts` 259) |
| Unreliable sends dropped while the channel has queued bytes | `autoManageBuffering` default true (33-38); drop when `bufferedAmount()` > 0 (208) |

## 4. TypeScript sketch

simplified: keeps the per-connection room id, the room send (sender included) and broadcast (sender excluded), the repeat schedule (one immediate send plus runs - 1 spaced sends, mirroring `runInterval`) and the 15 s dedupe window. It omits the transport (WebRTC data channel), the buffering drop, `forward` (the server-side bus), the sender-id argument, the wrapper that actually times the repeats (the schedule is returned, not run) and disconnect handling. It fixes the donor's splice-inside-forEach pruning by filtering all expired entries at once. The sketch passes the room to `roomEmit` explicitly; the donor reads the sender's own room.

```ts
// Licence: BSD-3-Clause (donor). Clean-room sketch of the shape: one room per connection, room and broadcast fan-out, repeat-send reliable events with a receiver-side dedupe window. Not a translation.
export {};

type RoomId = string | undefined;
type Inbox = (event: string, data: unknown, from?: string) => void;

interface Conn {
  id: string;
  room: RoomId;
  inbox: Inbox;
}

const REPEAT_RUNS = 10;     // donor default: makeReliable runs
const REPEAT_MS = 150;      // donor default: makeReliable interval
const DEDUPE_MS = 15_000;   // donor: a receiver keeps reliable ids for 15 s

// Send offsets for one reliable event: one send now, then one per interval (runs in total).
function repeatOffsets(runs: number = REPEAT_RUNS, intervalMs: number = REPEAT_MS): number[] {
  const out: number[] = [];
  for (let k = 0; k < runs; k++) out.push(k * intervalMs);
  return out;
}

// Receiver side: a repeated message is accepted once per id inside the window.
class Dedupe {
  private seen: { id: string; expire: number }[] = [];

  accept(id: string, now: number): boolean {
    this.seen = this.seen.filter((s) => s.expire > now); // prune every expired entry at once
    if (this.seen.some((s) => s.id === id)) return false;
    this.seen.push({ id, expire: now + DEDUPE_MS });
    return true;
  }
}

class Hub {
  private conns = new Map<string, Conn>();

  add(c: Conn): void { this.conns.set(c.id, c); }
  remove(id: string): void { this.conns.delete(id); }
  join(id: string, room: RoomId): void {
    const c = this.conns.get(id);
    if (c) c.room = room;
  }
  leave(id: string): void { this.join(id, undefined); }

  // Donor room.emit: everyone whose room equals `room` (the donor passes the sender's own room), sender included.
  roomEmit(room: RoomId, event: string, data: unknown): void {
    for (const c of this.conns.values()) if (c.room === room) c.inbox(event, data);
  }

  // Donor broadcast.emit: everyone in the sender's room except the sender.
  broadcast(senderId: string, event: string, data: unknown): void {
    const s = this.conns.get(senderId);
    if (!s) return;
    for (const c of this.conns.values()) {
      if (c.room === s.room && c.id !== senderId) c.inbox(event, data, senderId);
    }
  }
}

// Usage: a party of two (a and b) and a third player (c) who is not in it.
const hub = new Hub();
const got: string[] = [];
const mk = (id: string): Conn => ({ id, room: undefined, inbox: (ev, d) => { got.push(`${id}:${ev}:${String(d)}`); } });
hub.add(mk("a"));
hub.add(mk("b"));
hub.add(mk("c"));
hub.join("a", "party-1");
hub.join("b", "party-1");
hub.broadcast("a", "party chat", "hi");        // b only
hub.roomEmit("party-1", "party state", "x");    // a and b
console.log(got, repeatOffsets(), new Dedupe().accept("id1", 0));
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/pg010-geckos-rooms.ts` on the VPS, exit 0.

## 5. Lands in

- Parity row: none. Rows 1-23 do not cover chat rooms or delivery of social events. The nearest, the server tick sub-line in row 18, is about the tick loop, not chat.
- TARGET `origins/server/chat-rooms.ts` (proposed new file; existence not checked). The room membership and the room and broadcast sends for party, guild and zone chat live here; the repeat-send helper for social events sits beside them.
- Reuse tag: adapt (BSD-3-Clause allows adapting the shape; the sketch above is clean-room).
- Brief rule served: server-verified (the server sets room membership; a client cannot pick its room by sending a message); rules 7-9 n/a.

## 6. Gaps and risks

- A repeated reliable message is a delivery nudge, not state. The party roster, guild ranks and friend list must be re-read from the server ledger after a miss; the repeats are not the truth.
- No acknowledgement and no resync: the sender sends 10 copies over about 1.35 s and stops. A client offline longer than that misses the event, and the donor has no catch-up path.
- The 15 s dedupe window ends. A copy arriving after 15 s is accepted again, so an invite or a rank change could apply twice. Make the Frankendom handler idempotent (apply by id or by version); do not rely on the window.
- An unreliable chat line is dropped silently while the channel has queued bytes (`channel.ts` 208-218). Chat that must arrive has to be sent reliable. The drop event (`onDrop`) exists for logging.
- Undefined is one implicit lobby: every unjoined channel gets every `room.emit` from another unjoined channel. Frankendom must not use the default room as "everyone".
- One room id per connection: a player cannot be in a party room and a guild room at the same time with this shape. Frankendom needs one membership set per chat kind.
- `forward` is a server-side bus into other channels' handlers, not a send to clients. Do not use it for client chat; it would look like a broadcast in code and deliver nothing to the client.
- The prune loop skips some expired entries (`channel.ts` 264-268). Do not copy that loop; the sketch filters.
- Dead guards at 203-204. Do not copy.
- Disconnect cleanup is not read: whether a dropped channel leaves its room automatically depends on `connections` and `onDisconnect` code not opened here.
- The demo never calls `join`, so its "ROOM:" line reaches everyone. A room-isolation test is needed before any party chat is trusted.
- No party, guild, clan or friend-list code exists in this donor's .ts and .js files (grep above).

Best transferable idea: a party or guild chat is one room id per connection, where a room send reaches everyone in the room and a broadcast reaches everyone except the sender, and a social event is re-sent with one id that the receiver dedupes.

Decision (proposed): adapt — take the room id per connection and the room-versus-broadcast split for party, guild and zone chat; take the same-id repeat only as a delivery nudge for social events, with an idempotent handler and a server re-read; reject the implicit lobby as the default room and the no-ack repeat as a guarantee.
Acceptance: a server test joins two players to one party room and leaves a third outside it, sends a party message from one, and asserts the two members receive it once and the third receives nothing; a party-invite event sent 10 times is applied once.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: none significant
