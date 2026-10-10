# geckosio-geckos.io (server-tick-netcode, cell 1)

Donor: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/reliableMessage.ts` (with `packages/server/src/geckos/channel.ts`, `packages/common/src/runInterval.ts`) | Licence: BSD-3-Clause (LICENSE line 1: "BSD 3-Clause License"; Copyright (c) 2021, Yannick Deubel) | TypeScript | symbol `makeReliable` (with `ServerChannel.emit`, `ServerChannel._emit`, `ServerChannel.on`)

Checked: confidence moderate. Read in full: `makeReliable` (reliableMessage.ts 1-12), `runInterval` (runInterval.ts 1-21), `ServerChannel` emit/_emit (channel.ts 188-221) and on() (252-288), the client twin emit (client channel.ts 69-80) and on() (142-175), bridge.ts 1-36, helpers.ts 38, and the donor tests test/common/runInterval.test.js and test/e2e/server.test.js. Callers of makeReliable: server channel.ts 162 and 190, client channel.ts 71 (grep on packages/). The donor has NO server tick: grep for tick, setInterval, runInterval and requestAnimationFrame in packages/ and test/ finds only the runInterval helper and `tick` (helpers.ts 38, a microtask helper, not a game tick). I rated STRONG because the reliable-delivery mechanism is real and I read it end to end, but it is a delivery and sync rule, not a tick loop. If Strategy reads this cell as tick-only, this is PARTIAL. Not read: `@yandeu/events` (the emitter; not in the donor), the client's connectionsManager and the client buffering path. camera_scope: not applicable (not a camera cell).

Best transferable idea: Send a reliable event with one random id and deliver only the first copy the receiver sees (id kept for a window); skip unreliable inputs while the outbound queue is non-empty and count the drop.
Decision (proposed): adapt — the id-keyed first-copy receive fits the one-ledger ruling (a kill credited once), but the 10-copy resend storm only helps on a lossy link, and the Frankendom transport was not read; ledger dedupe must be stored with the ledger entry, not in a 15 s window.
Acceptance: a server test sends the same kill-report id three times over the link and asserts the ledger credits the kill once (also after a reconnect); a second test asserts an unreliable input frame is counted as a drop while the outbound queue is non-empty, and a kill report still sends in that state.

## 1. Mechanism

- Reliable send over an unreliable link. A message marked `reliable` is not sent once. `makeReliable` gives it one random id and runs the send function immediately, then again every `interval` ms, for `runs` sends in total. Defaults are interval 150 and runs 10 (reliableMessage.ts 5-9). Each copy carries the same `RELIABLE: 1` and `ID`, so the receiver can tell copies apart (channel.ts 191-195). Per-call `options` can override both (types.ts 65-68 EmitOptions).
- Server order of steps for a reliable emit: `ServerChannel.emit` (channel.ts 188-199) calls `makeReliable`, and each run calls `_emit` with the envelope `{MESSAGE, RELIABLE: 1, ID}`. `_emit` (202-221) computes `buffering` (208). The gate on line 214, `if (isReliable || !buffering)`, lets reliable envelopes through even while the transport has queued bytes; unreliable messages go through only when not buffering, and otherwise drop (218).
- Receiver dedupe (channel.ts 252-288). For an envelope with RELIABLE 1 and an ID: purge entries whose expire time has passed (261-269, forEach with splice), then, if the ID is not already in this channel's array (274), store `{id, expire: now + 15000}` and deliver `data.MESSAGE` (275-280). Otherwise the copy is ignored (281-283). So the first arriving copy is delivered and later copies are dropped for 15 seconds.
- Unreliable gate on the server: `buffering = autoManageBuffering && bufferedAmount() > 0` (208). `autoManageBuffering` defaults to true (channel.ts 32-38). The server comment says it never buffers and sends as fast as possible (213).
- Timing: `runInterval` calls `cb()` synchronously once (18), then `setInterval` fires every `interval` ms (9-16). It clears itself when `counter === runs - 1` (12-14). With runs 10 that is one immediate send plus nine timed sends, the last at 9 x 150 = 1350 ms after the first (this arithmetic is mine). These are wall-clock timers, not a per-frame or per-tick loop.
- Client twin (client channel.ts 69-80 and 142-175): the same envelope, the same 15-second window (148), and `callback(data.MESSAGE)` on the first copy (168).

## 2. Key functions

- `makeReliable`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/reliableMessage.ts` 4-10. Reads interval and runs, makes one id, and hands it to runInterval.
- `runInterval`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/common/src/runInterval.ts` 1-19. One immediate call, then setInterval, self-clearing after runs-1 timed calls.
- `ServerChannel.emit` and `_emit`: `/mnt/frankendom-donors/geckosio-geckos.io/packages/server/src/geckos/channel.ts` 188-221. Reliable branch wraps in makeReliable (190); the send gate is 202-221.
- `ServerChannel.on`, dedupe block: `/mnt/frankendom-donors/geckosio-geckos.io/packages/server/src/geckos/channel.ts` 252-288 (dedupe 271-283).
- Client twin: `/mnt/frankendom-donors/geckosio-geckos.io/packages/client/src/geckos/channel.ts` 69-80 (emit), 142-175 (on).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Resend the same envelope N times at fixed spacing, first copy at once | Interval 150 ms and runs 10 (theirs, reliableMessage.ts 5). Span 1350 ms (arithmetic) |
| Random per-message id to dedupe on receipt | 24 characters (theirs, reliableMessage.ts 6) over a 62-character alphabet (theirs, makeRandomId.ts 2) |
| Receiver remembers seen ids for a window, then forgets them | 15 seconds (theirs, channel.ts 259) |
| Unreliable sends are skipped while outbound bytes are queued; reliable sends bypass the gate | Threshold "bufferedAmount > 0" (theirs, channel.ts 208 and 218); reliable bypass (214) |
| Timer stops after N runs | runs <= 1 never clears the timer (by reading runInterval.ts 12-14; not run) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order and numbers: the first copy goes out at once and then runs-1 copies at interval spacing; the receiver delivers the first copy of an id and ignores copies for 15 seconds; an unreliable send is skipped while bytes are queued. It omits the donor's readyState and maxMessageSize checks, the RELIABLE/ID envelope parsing, the client side, room and sender-id bookkeeping, and the donor's forEach-with-splice expiry (the sketch deletes through a Map iterator, which does not skip entries). Timers are injected through a Clock so the sketch can be tested. It does not reproduce the donor's runs <= 1 timer bug: the loop is bounded, so runs 1 sends once.

```ts
// Licence: BSD-3-Clause (donor). Sketch written from the mechanism, not a copy of the donor lines.
export interface Transport {
  bufferedBytes(): number; // bytes queued but not yet on the wire
  send(payload: string): void;
}

export interface Clock {
  now(): number; // ms
  after(ms: number, fn: () => void): void; // one-shot timer
}

const RELIABLE_INTERVAL_MS = 150;
const RELIABLE_RUNS = 10;
const DEDUPE_WINDOW_MS = 15_000;

// Sender: the same envelope (same id) goes out `runs` times, `intervalMs` apart.
// The first copy goes out at once; the receiver drops the copies it has already seen.
export function sendReliable(
  t: Transport,
  clock: Clock,
  eventName: string,
  message: unknown,
  newId: () => string,
  intervalMs: number = RELIABLE_INTERVAL_MS,
  runs: number = RELIABLE_RUNS
): void {
  const payload = JSON.stringify({ eventName, reliable: 1, id: newId(), message });
  t.send(payload);
  for (let k = 1; k < runs; k++) clock.after(k * intervalMs, () => t.send(payload));
}

// Receiver: the first copy of an id is delivered; copies are ignored until the id is 15 s old.
export class ReliableInbox {
  private seen = new Map<string, number>(); // id -> time (ms) after which it may be forgotten

  constructor(private clock: Clock) {}

  accept(id: string, deliver: () => void): boolean {
    const t = this.clock.now();
    for (const [k, expiresAt] of this.seen) {
      if (expiresAt <= t) this.seen.delete(k);
    }
    if (this.seen.has(id)) return false;
    this.seen.set(id, t + DEDUPE_WINDOW_MS);
    deliver();
    return true;
  }
}

// Unreliable send: skipped while the transport still has queued bytes (the caller counts a drop).
// Reliable sends do not go through this gate.
export function sendUnreliable(t: Transport, payload: string): boolean {
  if (t.bufferedBytes() > 0) return false;
  t.send(payload);
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/net-events.ts` (new module: reliable-event envelope, receiver id window, unreliable congestion gate, drop counter). Parity-checklist row 18, post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget". The donor supplies only the event-delivery part of that sub-line, not the tick itself.
- Reuse tag: adapt-allowed (BSD-3-Clause; code may be adapted with the copyright notice kept; this sketch is clean-room, written from the mechanism)
- Brief rule served: server-verified kills and one ledger (a kill is credited once, keyed by id); rule 1 (one engine)
- Decision (proposed): adapt. Take the id-keyed first-copy-only receive and the drop-and-count rule for unreliable input. Reject the 10-copy time-based resend storm for ledger events. Why: the one-ledger ruling needs a kill credited exactly once, and an id-keyed receive gives that. The resend storm only helps on a lossy, unordered link. The Frankendom transport was not read in this pass, so whether it is lossy is unknown.
- Acceptance: a server test sends the same kill-report id three times over a link and asserts the ledger credits the kill once. A second test asserts that an unreliable input frame is counted as a drop while the outbound queue is non-empty, and that a kill report still sends in the same condition.

## 6. Gaps and risks

- No server tick here. The donor has no fixed step, no input-intake loop and no per-tick NPC budget. The row-18 tick sub-line is still unsourced.
- The dedupe window is 15 seconds and lives in memory, per channel (channel.ts 21, 259). A kill credited to the ledger must not be credited again by a copy that arrives after 15 seconds or after a reconnect, when the channel is new and the array is empty. The ledger needs the kill id stored with the ledger entry, not in this window.
- The retransmit storm sends ten copies 150 ms apart. On a reliable-ordered transport (for example WebSocket or TCP) those copies are pure duplicates. Whether Frankendom's transport is reliable-ordered was not read in this pass.
- Dedupe cost: each message scans the array (channel.ts 274 filter, 264 forEach). The cost grows with the number of reliable messages in 15 seconds. A Map keyed by id would avoid that.
- Expiry bug (read, not run): forEach with splice skips the entry after each one it removes (channel.ts 264-268). Expired ids linger one extra cycle. For dedupe this only means a late copy is still ignored; it is not a correctness fix to copy.
- Multi-listener starvation (read, not run): the dedupe array is per channel and is shared by every `on()` call (bridge.ts 24 wraps each call in one emitter listener; channel.ts 253 registers the listener). If the emitter calls every listener, the second listener for a reliable event sees the id already stored and drops it. The emitter library `@yandeu/events` 0.0.7 is not in the donor and was not read, so this depends on its emit semantics (not read). Frankendom must register one handler per event.
- runInterval with runs <= 1 never clears its timer (runInterval.ts 12-14, by reading; the donor test covers runs 5 only, test/common/runInterval.test.js 6-15). Not run.
- Congestion drops are reported through a DROP event (channel.ts 209-211) and are not retried. Frankendom should count drops and show them in the fight record, not hide them.
- Licence BSD-3-Clause: adapting is allowed with the notice kept. The sketch is clean-room; no donor line is copied.

Reuse tag: adapt-allowed (BSD-3-Clause)
Brief rule served: server-verified kills and one ledger; rule 1 (one engine)
