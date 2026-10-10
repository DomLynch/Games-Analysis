# levy-street-world-of-claudecraft (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/msg_rate_limit.ts` (with `server/game.ts`) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2026 Levy Street) | TypeScript | symbol `consumeInboundFrame`, `tallyDrop`

Checked: The list hint `src/sim/move_input.ts` (75 lines) was read in full; it is the input sanitizer, which sits behind the gate. Also read in full: `server/msg_rate_limit.ts` (155 lines), the gate call site `server/game.ts` 5921-5950 and the post-parse `shed` path 6030-6036, and `server/movement_input_timeline_v2.ts` (234 lines). Also read: the fixed-step loop around `server/game.ts` 2541-2626 (accumulator with `DT = 1 / TICK_RATE`, `TICK_RATE = 20`, read in `src/sim/types.ts` 32-33), and the bot-detector contract and stub. I chose the inbound rate gate for this note because it is the only candidate that is a complete, self-contained rule set (frame bucket, byte bucket, drop accounting, kick verdict) and it answers the "rate limits" part of the topic. The sanitizer and the input timeline are covered in section 6 with receipts. Confidence: high on the gate arithmetic (every line of the gate was read); high on the sanitizer and timeline facts; the donor's claim that legitimate stall-then-flush traffic never kicks is the author's stated intent in comments, which I did not test (no test was run). Not read: the rest of `server/game.ts`, the movement physics that turns an input into motion (so I cannot say what the sim caps), `server/msg_lanes.ts` beyond a comment grep, and the test bodies. Donor finding: the real bot detector is not in this donor (only a contract and a no-op stub). camera_scope: not applicable (not a camera topic).

## 1. Mechanism

- Where it runs: per connection, before any parse. `handleMessage` (game.ts 5921) first checks the session is live and not draining (5926-5929), then calls `consumeInboundFrame(session.msgRate, receivedAtMs / 1000, raw.length)` (5932). Only an `allow` verdict reaches `JSON.parse` (5945). The comment at msg_rate_limit.ts 6 says exactly this: every verdict lands before JSON.parse.
- Order inside `consumeInboundFrame` (msg_rate_limit.ts 114-130):
  (a) refill: elapsed = max(0, now - lastRefill); frame tokens += elapsed x 120, capped at 180 (120); byte tokens += elapsed x 65,536, capped at 131,072 (119-124);
  (b) if fewer than 1 frame token: drop, cause `rate` (126);
  (c) if fewer byte tokens than the frame's length: drop, cause `bytes` (127). `raw.length` is the length of the raw string, a UTF-16 code-unit proxy for bytes, per the comment at msg_rate_limit.ts 44-47;
  (d) otherwise spend one frame token (128) and the byte count (129), and allow (130).
  A dropped frame spends nothing (comment 111-112). Frames are allowed or dropped, never queued (msg_rate_limit.ts 7-8: queueing would shift receive time).
- Every drop, whatever its cause, goes into `tallyDrop` (136-156). The drop is tallied into the one-second bucket for floor(now) (142, monotonic clamp so a backwards clock cannot reopen an old second). When that second's drop count reaches exactly 30 (149), the second is pushed onto `abusiveSeconds` once. Seconds at or before (now - 10) are pruned. If 5 or more abusive seconds remain, the verdict is `kick`; otherwise `drop` (154).
- Kick path: `gate.verdict === 'kick'` sends `kickSession(session, 'message rate exceeded', 'message flood')` (game.ts 5937-5939); the reason text is a fixed constant (msg_rate_limit.ts 69). Post-parse lanes use the same tally (game.ts 6030-6034): a lane drop calls `tallyDrop` on the same bucket, so a flood through a lane reaches the same kick verdict.
- The numbers are sized from the measured client cadence, not from a documented rate (msg_rate_limit.ts 11, and the block at 36-43): the client's input stream is about 60-64 per second steady, with a hard cap near 82.5 per second; the refill of 120 is set about 1.45 times above that to leave room for commands, chat and telemetry on the same socket.
- The server's own loop is a fixed-step accumulator: `acc += dt` on wall time, then `while (acc >= DT)` runs one sim tick and subtracts `DT` (game.ts 2541-2626), with `DT = 1 / 20` (types.ts 32-33). Input frames are consumed once per tick (game.ts 2587).

## 2. Key functions

- `consumeInboundFrame`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/msg_rate_limit.ts` 114-130. Refill, the two drop checks, then spend.
- `tallyDrop`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/msg_rate_limit.ts` 136-156. The one-second tally, the once-per-second abusive mark, the window prune, the kick count.
- `handleMessage` gate call: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts` 5921-5945.
- `shed` (post-parse drop path that shares the tally): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts` 6030-6036.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Token bucket: refill by elapsed time, cap at burst, spend one token per allowed frame | Frame refill 120 per second, burst 180 (theirs, msg_rate_limit.ts 41-42); sized from measured client cadence (comment 11) |
| Second bucket beside the frame bucket, measured in bytes | Byte refill 64 KB per second, burst 128 KB (theirs, msg_rate_limit.ts 49-50) |
| A drop spends nothing and is tallied by cause | Causes `rate` and `bytes` (msg_rate_limit.ts 126-127) |
| Abuse is counted per whole second, not per dropped frame | Floor of 30 drops in one second marks it abusive (theirs, msg_rate_limit.ts 59) |
| Kick only after several abusive seconds inside a sliding window | Window 10 s (theirs, 57); kick at 5 abusive seconds (theirs, 58) |
| Fixed reason text for the kick, so the client can match it | 'message rate exceeded' (theirs, msg_rate_limit.ts 69) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one frame (refill both buckets, frame check, byte check, spend on allow, tally on every drop, kick only from the window count), and the monotonic second clamp. It omits the Map of lanes and the post-parse lane tokens, the metrics counters, the kick call (the sketch returns the verdict and the caller acts on it), the session-resume rule that keeps the existing bucket, the sequence-gap cap (`MSG_SEQ_GAP_SANITY`), and the parse itself. The byte cost is passed in as a number, not measured from a string.

```ts
// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const REFILL_FRAMES_PER_S = 120;
const BURST_FRAMES = 180;
const REFILL_BYTES_PER_S = 64 * 1024;
const BURST_BYTES = 128 * 1024;
const ABUSE_WINDOW_S = 10;
const ABUSE_KICK_SECONDS = 5;
const ABUSE_SECOND_DROP_FLOOR = 30;

interface GateState {
  frames: number;
  bytes: number;
  lastRefillS: number;
  dropSecond: number;
  dropsThisSecond: number;
  abusiveSeconds: number[];   // seconds whose drop count reached the floor, pruned to the window
}

type Verdict = { kind: "allow" } | { kind: "drop" | "kick"; cause: "rate" | "bytes" };

function newGate(nowS: number): GateState {
  return {
    frames: BURST_FRAMES,
    bytes: BURST_BYTES,
    lastRefillS: nowS,
    dropSecond: Math.floor(nowS),
    dropsThisSecond: 0,
    abusiveSeconds: [],
  };
}

// Every drop, whatever its cause, lands in the same one-second tally.
function tallyDrop(g: GateState, nowS: number): "drop" | "kick" {
  const sec = Math.max(Math.floor(nowS), g.dropSecond); // monotonic: a backwards clock cannot reopen a second
  if (sec !== g.dropSecond) {
    g.dropSecond = sec;
    g.dropsThisSecond = 0;
  }
  g.dropsThisSecond++;
  if (g.dropsThisSecond === ABUSE_SECOND_DROP_FLOOR) g.abusiveSeconds.push(sec); // once per second
  const cutoff = sec - ABUSE_WINDOW_S;
  while (g.abusiveSeconds.length > 0 && g.abusiveSeconds[0] <= cutoff) g.abusiveSeconds.shift();
  return g.abusiveSeconds.length >= ABUSE_KICK_SECONDS ? "kick" : "drop";
}

// Runs before any parse. Allow spends tokens; a drop spends nothing.
function consumeFrame(g: GateState, nowS: number, approxBytes: number): Verdict {
  const elapsed = Math.max(0, nowS - g.lastRefillS);
  g.frames = Math.min(BURST_FRAMES, g.frames + elapsed * REFILL_FRAMES_PER_S);
  g.bytes = Math.min(BURST_BYTES, g.bytes + elapsed * REFILL_BYTES_PER_S);
  g.lastRefillS = nowS;
  if (g.frames < 1) return { kind: tallyDrop(g, nowS), cause: "rate" };
  if (g.bytes < approxBytes) return { kind: tallyDrop(g, nowS), cause: "bytes" };
  g.frames -= 1;
  g.bytes -= approxBytes;
  return { kind: "allow" };
}

export { newGate, consumeFrame, tallyDrop };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac009-lv-gate.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/msg_rate_gate.ts` (new): the per-connection gate in front of the message parser. It is transport hygiene, not engine logic, so it sits outside `src/fight`.
- Parity-checklist row 5 (controls/input; intake). The gate is the outer ring of the input intake, and the server tick sub-line "input intake" (post-K item 3) is where the frame consumption belongs. Row 18 is not a fit: nothing here is a loot roll or XP award.
- Reuse tag: rewrite-from-idea (MIT: adaptation permitted; this note still writes the sketch clean-room and keeps the donor's numbers as a reference, not as our values)
- Brief rule served: 1 (one engine: the gate only decides whether a frame reaches the one intake); the kill and damage rules are not touched

Best transferable idea: Gate every inbound frame before parse with a frame bucket and a byte bucket, spend nothing on a drop, and kick only when several separate seconds were each abusive, so a stall-then-flush burst does not kick a legitimate player.
Decision (proposed): adapt — take the two-bucket shape and the abusive-second counting, but retune the numbers from our own measured client cadence (the donor's 120 and 180 come from its 20 Hz timer plus a per-frame flush), because our client sends differently.
Acceptance: A server test sends 300 frames from one socket inside one second; about 180 pass, the rest are dropped and counted by cause, and the socket is closed with 'message rate exceeded' only after five abusive seconds inside ten; a 1.5 s stall followed by a flush of about 120 frames is never kicked.

## 6. Gaps and risks

- Scope: this is flood control and transport hygiene. It does not check whether an input is plausible, so it is not cheat detection and must not be described as one.
- The donor's own bot detector is absent here. `server/bot_detector/` holds only `contract.ts` and `stub.ts`. The stub's `handleTick` returns `'none'` (stub.ts 15) and its observers are no-ops (stub.ts 11-14). The loop still calls `runAntibotTick` every tick (game.ts 2622) and kicks only on a `'kick'` verdict (game.ts 3121-3122, with the vague reason 'rejected by server'). So the flag and ban pipeline is an interface, and the real detector is not in this donor. Frankendom must build its own; do not read this donor as proof of a working one.
- Input sanitizer (`src/sim/move_input.ts`, the hint file): booleans accept only `true` or `1` (23); the swim-steer value is clamped to 0..1 (32) and glider pitch to -1..1 (45); facing is rejected, not clamped, when its magnitude is over 1000 (14, 51). A clamp keeps the input and a reject drops it. Frankendom should pick one rule per field and write the choice as data. Non-finite swim-steer and pitch values become `undefined` (`Number.isFinite` guards in the same file).
- Input timeline (`server/movement_input_timeline_v2.ts`): frames are keyed by a client tick `ct`. A duplicate `ct` is refused (158); a tick behind the cursor is discarded as late (161); a tick more than 1200 ahead is refused (165; the comment at 17 says 60 s at 20 Hz, twice the keepalive); a tick more than 6 ahead is refused (177), except that the starve-resync branch above it (168-175) lets a far tick through once the timeline has starved for the resync threshold; when more than 6 are buffered the oldest is dropped (182). When the buffer is empty, a starved tick extrapolates the last consumed input (216) for up to two ticks, and the third consecutive starved tick resyncs to the oldest buffered tick (206). Frankendom's input intake should copy the duplicate, late and window checks; the sanity bound is a tuning value.
- The server sends no positions from the client: the frame carries booleans, facing and two continuous values (sanitizer above). Whether the movement sim caps speed was not read, so I make no claim about speed or teleport checks.
- No replay check: the duplicate-`ct` refusal blocks a re-sent frame from being applied twice in the window, but there is no signature and no compare of replayed fight records.
- No server-verified kills in this path: the gate and the timeline only pick which input the sim applies. Frankendom's kill rule is not covered by this donor.
- Byte budget is a string-length proxy (`raw.length`, see 34-36), not a true byte count. Frankendom should measure bytes at the socket layer if the budget matters.
- Kick text is deliberately vague toward bots (the bot kick says 'rejected by server'); the flood kick is specific. Choose one policy and document it.
- MIT: adaptation is allowed. The sketch is still written from the mechanism and not copied.
