# geckosio-geckos.io (netcode-session-integrity, cell 1)

Donor: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/reliableMessage.ts` | Licence: BSD 3-Clause (LICENSE line 1: "BSD 3-Clause License", Copyright 2021 Yannick Deubel) | TypeScript | symbol `makeReliable`
Also read: `packages/common/src/runInterval.ts`, `packages/common/src/makeRandomId.ts`, `packages/common/src/sendMessage.ts`, `packages/client/src/geckos/channel.ts`, `packages/client/src/wrtc/connectionsManager.ts`, `packages/server/src/geckos/channel.ts`, `packages/server/src/wrtc/connectionsManager.ts`, `README.md` (sections on buffering and reliable messages).

Checked: Read end to end: reliableMessage.ts, runInterval.ts, makeRandomId.ts, sendMessage.ts, the emit and receive paths of the client and server channel.ts files, the channel config and teardown in server connectionsManager.ts (lines 49-113), and client connectionsManager.ts emit (lines 14-24). Confidence high on the repeat and dedup mechanism (every line read). Medium on the buffer-drop effect: `bufferedAmount()` is a call into the native node-datachannel wrapper, which was not read (not read: `packages/server/src/wrtc/nodeDataChannel.ts`). Not read: the room and broadcast code outside lines 150-200 and the WebRTC setup in `webrtcConnection.ts`. A grep for reconnect, resume, rate, throttle, limit, cooldown, budget, kick and ban over `packages/server/src`, `packages/common/src` and `packages/client/src` returned only comment text on "limit" (no resume and no rate-limit code). No changelog or git history in the donor copy (root listing read). Camera: not applicable.

Best transferable idea: Give every client command a client-generated id that the server applies at most once inside a 15 s window, and skip (do not queue) unreliable state while the send queue is busy.
Decision (proposed): adapt — the command-id window gives a safe retry after a reconnect; the blind 10x repeat is rejected for outcomes because it has no acknowledgement and kills are server-verified.
Acceptance: A server test sends one attack command with the same id 10 times within 1.35 s and sees it applied once; with a busy send queue an unreliable snapshot is skipped and counted, while a reliable event still queues.

## 1. Mechanism

- Reliable messages travel over the same unreliable data channel. `makeReliable` (reliableMessage.ts 4-10) draws one random 24-character id and sends the same payload `runs` times, `interval` ms apart. Defaults: interval 150 and runs 10 (reliableMessage.ts 5). The first copy goes out at once, then `runInterval` (runInterval.ts 1-19) repeats the callback on a `setInterval` (line 9) and stops it when `counter === runs - 1` (line 13). Result: 10 copies at 0, 150, ... 1350 ms. Nothing is acknowledged; the sender never learns whether a copy arrived.
- Receiver (client channel.ts 142-176; server channel.ts 252-288, same logic): a message with `RELIABLE === 1` and an id is looked up in a per-channel list. If the id is absent, it is stored with an expiry 15 s ahead and the handler is called with `MESSAGE`. If the id is present, the copy is dropped by an empty `else` branch. Expired entries are swept on every reliable arrival.
- Unreliable path: the server channel is created with `unordered: !ordered`, `ordered = false`, and `maxRetransmits = 0` (server connectionsManager.ts 57, 64, 72). In server `_emit` (channel.ts 202-221), an unreliable message is dropped, with a DROP event carrying `DROPPED_FROM_BUFFERING`, when `autoManageBuffering` is on (default true, channel.ts 33) and `bufferedAmount()` is above zero. A reliable message always goes to `SendMessage` (channel.ts 214). The author's comment at 213 says the server never buffers.
- Oversize: `SendMessage` (sendMessage.ts 5-46) throws inside its `send` helper when the byte count exceeds `maxMessageSize` (line 14), catches it, logs it (line 42) and returns the error. The server turns the returned error into a MAX_MESSAGE_SIZE_EXCEEDED drop (server channel.ts 215-216). The client's `emit` (client connectionsManager.ts 19-21) does not use the return value, so a client-side oversize send is only logged.
- Silent no-op: `SendMessage` sends only when the channel is `'open'` (sendMessage.ts 34). Otherwise nothing happens and no error is raised.
- Teardown: the server deletes the connection when the peer connection state becomes 'disconnected', 'failed' or 'closed' (server connectionsManager.ts 101-103). There is no code path that reattaches a new socket to old state.

## 2. Key functions

- `makeReliable`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/reliableMessage.ts` 4-10 (id, repeat, defaults).
- `runInterval`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/runInterval.ts` 1-19 (timer, stop test at 13).
- Client reliable emit: `/mnt/frankendom-donors/geckosio-geckos.io/packages/client/src/geckos/channel.ts` 69-81; client receive and dedup: same file 142-176.
- Server reliable emit: `/mnt/frankendom-donors/geckosio-geckos.io/packages/server/src/geckos/channel.ts` 188-200 (room-scoped form 155-178); server `_emit` with buffer drop: same file 202-221; server receive and dedup: same file 252-288.
- `SendMessage`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/sendMessage.ts` 5-46.
- Channel config: `/mnt/frankendom-donors/geckosio-geckos.io/packages/server/src/wrtc/connectionsManager.ts` 56-73.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where it lives) |
|---|---|
| Send a critical message several times with one id; receiver keeps the first copy | interval 150 ms, runs 10 (reliableMessage.ts 5). Burst length (runs - 1) x interval = 1350 ms |
| Receiver dedup window for that id | 15 s (client channel.ts 148; server channel.ts 259) |
| Unreliable state: never retransmit, unordered | maxRetransmits 0 (connectionsManager.ts 64); unordered (57, 72) |
| Drop unreliable state while the send queue is busy; reliable still queues | autoManageBuffering true (channel.ts 33); test at 208 |
| Oversize payload refused | maxMessageSize from the SCTP negotiation (client channel.ts 119-121) |
| Connection-setup retry spacing (not session resume) | 10 attempts, start 50 ms, factor 1.8, jitter up to 20 ms (client connectionsManager.ts 144-149) |

Arithmetic note (inference, not a donor claim): if each copy were lost independently with probability p, a message would be lost only when all 10 copies are lost, probability p^10. Real loss is bursty, and a 1.35 s burst is shorter than most outages, so the true failure rate is higher than p^10 suggests.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three rules: one id per message repeated on a fixed spacing (the caller puts the id in the payload, `repeatSend` only repeats the send), a 15 s receiver window keyed by id, and a drop of unreliable sends while the channel has queued bytes. It changes two donor defects: the expiry sweep collects dead ids first and deletes them after, so no neighbour is skipped (the donor's forEach with splice skips one per removal); and `runs` is clamped to at least 1 so the timer always stops (the donor's stop test never matches when runs is 1). It omits the RTCDataChannel transport, the maxMessageSize check, the DROP event, the room and id guards, and the unreliable-path ordering flags.

```ts
// Licence of donor: BSD-3-Clause (LICENSE). This is a clean-room sketch of the mechanism, written from the described order of steps, not a translation.
// Frankendom target (proposed): origins/server/net-intake.ts. Donor defects fixed here: expiry sweep skips no entries; runs below 1 still terminates.

// 1. Command dedup: the server applies a client command at most once per id inside ttlMs.
export class DedupWindow {
  private expiry = new Map<string, number>();

  constructor(private readonly ttlMs: number = 15_000) {}

  // true = unseen id, apply it; false = seen inside the window, drop it.
  accept(id: string, now: number): boolean {
    this.sweep(now);
    if (this.expiry.has(id)) return false;
    this.expiry.set(id, now + this.ttlMs);
    return true;
  }

  // Collects expired ids first, then deletes them, so no neighbour is skipped.
  private sweep(now: number): void {
    const dead: string[] = [];
    for (const [id, exp] of this.expiry) {
      if (exp <= now) dead.push(id);
    }
    for (const id of dead) this.expiry.delete(id);
  }
}

// 2. Repeat sender: the same payload `runs` times, `interval` ms apart, first copy immediate.
// Returns a cancel function. runs is clamped to at least 1 so the timer always stops.
export function repeatSend(send: () => void, interval: number = 150, runs: number = 10): () => void {
  const total = Math.max(1, Math.floor(runs));
  let sent = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };

  const tick = (): void => {
    send();
    sent += 1;
    if (sent >= total) stop();
  };

  tick();
  if (sent < total) timer = setInterval(tick, interval);
  return stop;
}

// 3. Unreliable send drops when the channel already has bytes queued; reliable sends always queue.
export interface BufferedChannel {
  bufferedAmount(): number;
  send(data: string): void;
}

export type SendResult = 'sent' | 'dropped-buffer';

export function sendState(
  ch: BufferedChannel,
  data: string,
  opts: { reliable: boolean; autoManageBuffering: boolean }
): SendResult {
  const busy = opts.autoManageBuffering && ch.bufferedAmount() > 0;
  if (opts.reliable || !busy) {
    ch.send(data);
    return 'sent';
  }
  return 'dropped-buffer';
}

export {};
```

Typecheck: the block is saved as `work/geckos-sketch.ts` and run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2 on the VPS); exit 0. The local PostToolUse hook reported that local tsc and eslint are not installed on this Mac; that is a local tooling gap, not a sketch error, and the VPS run is the check.

## 5. Lands in

- TARGET `origins/server/net-intake.ts` (proposed new module; no such file exists in Frankendom at this read). Parity-checklist row 5 (controls/input: intake). The unreliable-drop rule would sit under the row 18 server-tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget") and is not claimed separately here.
- Current Frankendom intake code was not read in this pass.
- Reuse tag: rewrite-from-idea (BSD-3-Clause: code may be adapted; this sketch is clean-room)
- Brief rule served: Frankendom rulings "kills are server-verified" and "one ledger": a retried command must apply once. Brief rule served per BRIEF-ADDENDUM "Frankendom context".

## 6. Gaps and risks

- No ack: a reliable message is a burst of copies, not a delivery guarantee. A kill, loot or XP award must not depend on it. The server state is the ledger and the client re-reads it. The burst is only a safe retry for client commands, because the receiver dedups them.
- No validation at all on receive: `ParseMessage` (server channel.ts 42) is applied to every incoming message and the handler gets the object (channel.ts 252-288). There is no size check, no schema and no sender check. Frankendom must validate every command (kind, range, cooldown, target in range) before the duel step.
- No rate limit on receive. No cap on messages per client per second exists in the code read. The dedup list (channel.ts 274-279) has no size cap, so a client that sends reliable messages with fresh ids grows the list for 15 s. Frankendom needs a per-client command budget. The donor gives no number and no mechanism to copy.
- No session resume. A failed or closed peer connection deletes the connection (server connectionsManager.ts 101-103). Frankendom's reconnect must re-attach a new socket to server-held character state by a server-issued session id. Nothing here can be reused for that.
- Defects found (keep the idea, fix the port):
  - (a) runs = 1 never stops the timer: `counter === runs - 1` is 0 and the counter starts at 1 after the first tick (runInterval.ts 13). Fix: clamp runs to at least 1 (sketch).
  - (b) expiry sweep skips the neighbour after each removal: forEach plus splice (client channel.ts 152-154; server channel.ts 264-266). Fix: collect, then delete (sketch).
  - (c) `data.ID !== 'undefined'` compares to the string, not to undefined (client channel.ts 146; server channel.ts 257). Fix: check `typeof data.ID === 'string'`.
  - (d) guards that compare a value to itself never filter: `this._roomId === this._roomId` and `this._id === this._id` (server channel.ts 203-204). Fix: compare to the intended target.
  - (e) client oversize sends are silent after a console log (client connectionsManager.ts 20). Fix: return or surface the error to the caller.
- Donor exploit or dupe history: no history available (no changelog or git history in the copy). The one dated patch is in README line 279: "In version 1.5.0, the option autoManageBuffering was added." That patch is the drop rule above. The one known open item is the TODO at server connectionsManager.ts 111: "This does not work :/" on the server's onDataChannel.
- Data shape (as-data, PASS2 item 1): the donor's table is the `EmitOptions` type (common/src/types.ts 65-69): `interval?: number`, `reliable?: boolean`, `runs?: number`. The channel options are `ordered`, `maxRetransmits`, `maxPacketLifeTime`, `autoManageBuffering` (server connectionsManager.ts 56-66, channel.ts 33). A new reliable event is one row: yes for the send side (the wrap is generic: emit(event, data, options)); no for validation, because there is no schema table, so each new command still needs handler code in Frankendom.
- Licence provenance: BSD-3-Clause (LICENSE line 1). Code may be adapted; this sketch is still clean-room.

Rulings for Dom:
1. Should every client command (engage, guard, attack, use item) carry a client-generated id that the server applies at most once inside 15 s? Recommend yes: retries after a reconnect cannot double-hit or double-spend.
2. Should any outcome (loot, XP, kill) ever be sent as a repeated burst? Recommend no: outcomes come from server state, and the burst is for idempotent commands only.
3. What per-client command cap (commands per second) should the server intake enforce? Recommend choosing the number after we measure a real client; the donor has no number.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- All claims held (makeReliable defaults, 10 copies, runInterval stop test, 15 s dedup, string compare of data.ID, self-compare guards, buffering default, unordered/maxRetransmits 0, ignored SendMessage error, TODO, README note, backoff, licence, EmitOptions as-data).
- Checker missed-items (not added to the note body): reliable IDs come from Math.random (makeRandomId.ts) and are client-chosen, so guessable but only used for dedup; copies can arrive out of order on an unordered channel, so the burst gives no ordering between different commands.
