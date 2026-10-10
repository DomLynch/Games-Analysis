# colyseus-colyseus (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/RoomInput.ts` (symbol `capture`, with `InputBuffer.ts` `push`, `accept`, `drain`, `next`, `compileSanitizer`) | Licence: MIT (`packages/core/package.json` "license": "MIT"; root LICENSE is the MIT License) | TypeScript | symbol `capture`

Best transferable idea: sanitize every decoded input field in place before anything reads it (clamp, never reject), dedupe packets by their sequence number, and keep a bounded per-client input ring, so a late or replayed packet cannot run an input twice.
Decision (proposed): adapt - take the clamp-then-dedupe-then-bounded-ring order, but change the overflow rule: the donor counts an overflowed input as acked, which would tell a duel client that a dropped attack was received; Frankendom must leave it unacked and report it, and must add a counter because the donor clamps silently.
Acceptance: a server test sends 40 unreliable input frames with seq 1 to 40 into a 32-slot intake ring: frames 1 to 8 are not acked (the client gets a dropped count), a steering value of 5 on a [-1, 1] field reaches the duel step as 1, and a replayed seq 17 changes nothing.

Checked: Read `packages/core/src/input/types.ts` 50-100 (the sanitize contract), `InputBuffer.ts` 20-100 (compileSanitizer, seedInputZeroValues), 262-370 (push, accept, drain, next, take), 480-495 (ackSeq); `RoomInput.ts` 218-250 (capture) and 280-352 (decodeUnreliable); `packages/admin/src-backend/auth/rate-limit.ts` (whole file, 103 lines), `packages/admin/src-backend/auth/endpoints.ts` 250-275, `packages/admin/src-backend/index.ts` 165-190, 255-275, 455-470, `packages/admin/test/rate-limit.test.ts` 1-70. The hint file `packages/admin/src-backend/index.ts` is the wrong file for this topic (it wires the admin REST endpoints). Confidence: high on the capture order and the ring behaviour (read end to end); medium on the unreliable packet path (read in full, but the transport that delivers the packet was not read). (not read): `effectiveIdle` and `resolveIdle` (the idle policy body), the `Room._onMessage` caller, the reliable decode path (`decodeReliable` at 285 was read only in part), the client SDK send side, any sanitizer test, and packet integrity (checksums or framing in the transport).

## 1. Mechanism

- Entry: a client input arrives as an unreliable packet, a redundancy ring of k recent inputs, each slot carrying its wire seq. `decodeUnreliable` (RoomInput.ts 304-352) optionally reads a TIMED stamp block first, then `decodeAll` yields each slot and calls `capture(client, renderTime, reckonTime, seq)` (346). The reliable path (`decodeReliable`) calls `capture` without a seq (285).
- Order inside `capture` (227-244), as the code runs:
  1. Sanitize the freshly decoded instance in place: `this.options.sanitize?.(client._input);` (229). This runs before the dedupe, so a duplicate's values are clamped too, on the shared decoded instance.
  2. If no buffer is registered for the client, return (231). No clone is made.
  3. Unreliable (seq given): `buf.accept(seq)`; a seq at or below the last seen is dropped (235; `accept` at InputBuffer.ts 306-308). Reliable: if the room sets a `seqField`, dedupe on that numeric field (237-241).
  4. Push a clone into the ring (244).
- Inside `push` (InputBuffer.ts 272-285): append the item and its stamps; if the ring is over `maxSize`, advance the head by one, bump `consumedCount`, and set the last-consumed seq to the dropped oldest entry (281-284). So an overflowed input is counted as acked (282). The default `maxSize` is 32 (RoomInput.ts 147).
- Consumption: `drain()` returns everything pending and marks the newest stamps as consumed (InputBuffer.ts 312-340); `next()` takes one (InputBuffer.ts 342-351); `take(n)` takes up to n (354). On an empty ring a configured idle policy may synthesize one frame, and that frame is not consumed, so the ack does not move (313 comment; the policy body is (not read)).
- Ack: `ackSeq` (492) returns the last consumed wire seq for unreliable inputs, or the consumed count for reliable ones, and the comment says it is "the reconciliation ack sent to the client" (487-490).
- Before anything is received, a field's value is its type's zero, not undefined (`seedInputZeroValues`, InputBuffer.ts 75 onward, zero-by-type at 85), so a sim does not read NaN. A never-received field is skipped by the sanitizer (44), so a delta-encoding client does not get a phantom held value.
- Tick: no timer in this path. Consumption happens when the game loop drains the ring; the rate of the loop is the room's (`setFixedTimestep`, Room.ts 1027 region; not read in full).

## 2. Key functions

- `capture` (sanitize, dedupe, push): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/RoomInput.ts` 227-244.
- `decodeUnreliable` (seq-carrying ring, timed stamp block): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/RoomInput.ts` 304-352 (read in full).
- `InputBuffer.push` (bounded ring, overflow counted as acked): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/InputBuffer.ts` 272-285.
- `InputBuffer.accept` (seq dedupe): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/InputBuffer.ts` 306-309.
- `compileSanitizer` (map form to dense min/max walk, NaN to floor, callback form passes through): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/InputBuffer.ts` 27-47.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Clamp each declared field to [min, max]; NaN lands on min | The ranges are per room and per field (the doc example is `moveF: [-1, 1]`, types.ts 88; a doc example, not a donor game value) |
| Skip fields that were never received | None (InputBuffer.ts 44) |
| Dedupe by a monotonic wire seq: accept only seq above the last seen | Last-seen marker starts at -Infinity (InputBuffer.ts 116) |
| Bounded per-client ring; oldest dropped on overflow | `bufferMaxSize` default 32 (RoomInput.ts 147) |
| Overflow counted as acked | None; the drop bumps the consumed count and the ack (InputBuffer.ts 282-284) |
| Zero-value seeding before first input | Zero per type: "" / false / 0 (InputBuffer.ts 85) |

## 4. TypeScript sketch

simplified: keeps the donor's order (clamp, then dedupe by seq, then a bounded push that drops the oldest on overflow), the unseeded-field skip, and the donor's rule that an overflowed input is counted as acked (InputBuffer.ts 282-284). It omits the reliable `seqField` path, the TIMED stamps, the clone of a whole schema instance (it copies a plain record), the idle policy, the callback sanitizer form, and the per-client registry. The sketch keeps the overflow ack on purpose so it matches the donor; section 6 and the decision line argue against it.

```ts
// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Range = readonly [number, number];
export type InputFrame = Record<string, number>;

export interface Slot {
  frame: InputFrame;
  seq: number;
}

// Clamp each ranged field in place. A missing field is left alone; NaN fails both
// comparisons and lands on the floor. Sanitizers modify values, they never reject a frame.
export function clampFrame(frame: InputFrame, ranges: Record<string, Range>): void {
  for (const name of Object.keys(ranges)) {
    const v = frame[name];
    if (v === undefined) continue;
    const [lo, hi] = ranges[name];
    frame[name] = v >= lo ? (v <= hi ? v : hi) : lo;
  }
}

export class IntakeRing {
  private lastSeq = -Infinity;
  private slots: Slot[] = [];
  private lastAckedSeq = 0;

  constructor(
    private readonly maxSize: number,
    private readonly ranges: Record<string, Range>,
  ) {}

  // One decoded packet slot. Order: clamp first, then dedupe by seq, then bounded push.
  offer(frame: InputFrame, seq: number): boolean {
    clampFrame(frame, this.ranges);
    if (seq <= this.lastSeq) return false; // duplicate or older: drop
    this.lastSeq = seq;
    this.slots.push({ frame: { ...frame }, seq });
    if (this.slots.length > this.maxSize) {
      const dropped = this.slots.shift()!; // overflow drops the oldest unconsumed input
      this.lastAckedSeq = dropped.seq;     // and counts it as acked
    }
    return true;
  }

  // Consume the oldest input for this tick. Empty returns undefined and does not move the ack.
  next(): Slot | undefined {
    const s = this.slots.shift();
    if (s !== undefined) this.lastAckedSeq = s.seq;
    return s;
  }

  get ackSeq(): number {
    return this.lastAckedSeq;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/AC006-input-intake.ts` on the VPS, exit 0 (the same code as the block above, saved as `work/input-intake.ts`). The adapted version differs by one behaviour: on overflow it does not set `lastAckedSeq` and it reports the dropped seq instead (decision line above).

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module): the engine's input intake for the duel. Clamp, seq dedupe and the bounded ring run here, before the duel step reads a frame. The value domains are per field and are data; semantic checks ("can this attack land") stay in the duel step.
- Parity-checklist row 5 (controls / input intake). The server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3) is the tick-side home of the same ring. Row 5 is the closest exact row.
- Reuse tag: rewrite-from-idea (MIT: adaptation is allowed; this sketch is still written from the mechanism)
- Brief rule served: server-verified actions (the engine owns intake); no numbered brief rule applies directly.

## 6. Gaps and risks

- Overflow is acked by the donor (InputBuffer.ts 282-284). For a duel that tells the client a dropped attack or guard was received. Frankendom must not ack an overflowed input and must report the drop.
- The clamp is silent. `capture` (227-244) has no counter, flag or log for an out-of-range value, so a client sending impossible values is corrected without a trace. Frankendom needs a per-identity counter that feeds the flag pipeline (the one ledger), not only the clamp.
- Sanitize runs before dedupe (229 before 235), so a duplicate packet is clamped too. Harmless here, but the test should cover it.
- The donor's rule (types.ts 67) keeps semantic checks out of the sanitizer. That fits our rulings: "can this attack land" (range, stance, stamina, cooldown) is engine logic, not a clamp.
- The TIMED stamps (`renderTime`, `reckonTime`, RoomInput.ts 336-343) come from the client and are used as time values by the consumer. If a hit check ever reads them to rewind the target, the client controls the rewind time. Frankendom's hit checks must use the server tick only. (Whether the donor's consumer uses them for hits: (not read).)
- Idle policy (`effectiveIdle`, `resolveIdle`): a synthesized idle frame is the server guessing what the player did. For a duel that is a choice to make explicitly (hold guard versus stand), not a default. Not read beyond the comment.
- Secondary candidate in the same donor: the admin login limiter (`packages/admin/src-backend/auth/rate-limit.ts` 52-85, token bucket keyed by `login:<ip>:<email>`, endpoints.ts 262-263). It spends a token before the password check, so correct logins also count, and its key uses the leftmost `X-Forwarded-For` (rate-limit.ts 95-97), which a client can set unless the edge proxy overwrites it. The bucket map grows with unique keys (the file's own comment, lines 46-49). Frankendom's game intake should key on the authenticated identity, not an IP, and use a token bucket only for bursts such as combos.
- Packet integrity (checksum, framing, replay of whole packets) is not in this path; the transport was not read.

Reuse tag: rewrite-from-idea (MIT; adaptation allowed, sketch clean-room)
Brief rule served: server-verified actions (intake in the engine); no numbered brief rule applies directly.
