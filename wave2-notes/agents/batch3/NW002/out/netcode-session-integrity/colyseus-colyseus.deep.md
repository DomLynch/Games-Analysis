# colyseus-colyseus (netcode-session-integrity, cell 2)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Rewind.ts` | Licence: MIT (LICENSE line 1 "Copyright (c) 2015-2026 Endel Dreyer"; line 3 "MIT License:") | TypeScript | symbol `Rewind` (class), `RewindView`, `Rewind.lastSeenBy`, `Rewind._aim`
Also read: `packages/core/src/Room.ts` (1070-1125, 1405-1422), `packages/core/src/input/RoomInput.ts` (222-290), `packages/core/src/input/InputBuffer.ts` (36-47, 68-76), `packages/sdk/src/input/InputHandle.ts` (675-701), `packages/core/src/input/types.ts` (442-452), `packages/core/src/MatchMaker.ts` (283-299), `packages/sdk/src/Reconnection.ts` (1-40, options only), `PREDICTION.md` (92-124, 524-594).

Checked: Read end to end: `Rewind.ts` (all 572 lines: ring, view, attach, record, clamp, live fallback, reckon path). Read the whole stamp chain: client stamp sampling (InputHandle.ts 691-701), wire decode (RoomInput.ts 250-286), capture and sanitize (RoomInput.ts 227-245), server record hook (Room.ts 1411-1419) and the hit-side read (Room.ts 1102-1125). Confidence high on the server rewind and on the stamp arithmetic. Medium on the clock: the client's `serverNow()` and `smoothedRtt()` estimators (sdk RoomClock.ts) were not read. Not read: the client reconciler and rollback (`sdk/src/predict/rollback.ts`, `reconciler.ts`, `Predictor.ts`), the sanitizer compiler body at InputBuffer.ts 27-35, the simulation loop, the transports, and PREDICTION.md 616-633 (troubleshooting). So the client-side prediction and reconciliation half of this topic is NOT covered by this note. Camera: not applicable (camera_scope not used).

Best transferable idea: Record one ring of snapshot samples per target on each broadcast and let every shooter read the targets at its own render time, clamped into one short window with live fallback when the stamp is missing.
Decision (proposed): adapt — it gives the server-verified kill rule a fair hit test with one history per target shared by up to MAX_ATTACKERS = 3 shooters; the window is a fairness dial we must set, and the donor's reliable-channel delta-coded stamps need in-order delivery we must not assume (its unreliable path already carries an absolute anchor per packet, RoomInput.ts 288-345, which is the model to copy).
Acceptance: A server test: a target moves from x=100 to x=120 between broadcasts 100 ms apart; a shot stamped at the earlier render time hits at x=100; a shot stamped 800 ms back is clamped to the 500 ms edge and flagged; a stamp of 0 is judged on live positions.

## 1. Mechanism

Lag compensation as a chain of five steps. "Render time" below means the moment in the past the shooter was looking at.

1. Client stamps each input (InputHandle.ts 691-701). `rk` is its server-time estimate, `0` until the clock syncs (694). `renderDelta` = interpolation delay + half the smoothed RTT, rounded, clamped to 0..0xffff (696). A snapshot-timeline room sends `rk - renderDelta` (700); a reckon-timeline room sends `rk` and the delta travels beside it.
2. Server decodes the stamp (RoomInput.ts 258-275). The stamp is delta-coded against a per-client baseline (265). In "both" mode, `reckonTime = stamp` and `renderTime = stamp - renderDelta` (268-269), floored at 0.
3. Server captures the input (capture, RoomInput.ts 227-245): sanitizes the decoded frame in place first (229), drops an unreliable duplicate by sequence (235), then pushes a clone with its stamps (244). Sanitizing modifies values and never rejects them (PREDICTION.md 115).
4. Server records history on the broadcast path (Room.ts 1411-1419). Each time it sends a snapshot frame (time `sNow`), it writes every tracked entity's numeric fields into that entity's ring (Rewind.record, Rewind.ts 372-386; EntityHistory.record, 82-88). Recording is idempotent per `sNow` (1417).
5. Hit test reads the past (Rewind.ts 504-571). For a shooter, `lastSeenBy` takes the shooter's last consumed render stamp (Room.ts 1117, via 1108). `_aim` clamps it into `[newest - defaultMaxRewindMs, newest]` (505-508, 517). A stamp `<= 0` reads the newest sample, which is live (508). The view then interpolates each tracked field between the two ring samples around the time (EntityHistory.valueAt, 91-109). A field not in any ring reads the live value (201).

Shape of the rewind: history is per target, not per shooter. Many shooters share one ring, and each shooter gets its own view (`RewindView`, 167-220; or a fresh one passed as `out`). That fits a many-on-one fight: N attackers cost N reads, not N histories.

## 2. Key functions

- `EntityHistory.record` and `valueAt`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Rewind.ts` 50-110 (ring write 82-88; interpolation 91-109).
- `Rewind.attachAll` and `attach`: same file 349-363 (window and interpolation are stored per group).
- `Rewind.record`: same file 372-386. `createHistory` 391-405 sizes the ring from the group window.
- `Rewind._aim`: same file 504-533 (clamp 505-508, direct reckon stamp 514-517, midpoint fallback 518-531).
- `Rewind.lastSeenBy`: same file 558-571.
- `Room.allowRewindState` (wiring): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 1102-1125. Broadcast-time record: same file 1411-1419.
- `RoomInput.decodeReliable`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/input/RoomInput.ts` 250-286 (stamp decode 258-275). `capture`: same file 227-245.
- Client stamp: `/mnt/frankendom-donors/colyseus-colyseus/packages/sdk/src/input/InputHandle.ts` 691-701.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Rewind window, the most a shooter can look back | 500 ms default (Rewind.ts 4, `DEFAULT_MAX_REWIND_MS`) |
| Ring size per target | `ceil(maxRewindMs / sampleIntervalMs) + 4` samples (Rewind.ts 75). Example, my arithmetic: 500 ms window at a 20 Hz patch rate (50 ms) gives ceil(10) + 4 = 14 samples |
| Sample interval when no patch rate is given | 1000/60 ms (Rewind.ts 8). Room.ts 1418 passes the patch rate, not the sim interval (see Gaps) |
| Render-delay wire cap | 0xffff ms, uint16 on the wire (InputHandle.ts 696; RoomInput.ts 268) |
| Render stamp | server-time estimate minus (interp delay + smoothed RTT / 2), rounded, floored at 0 (InputHandle.ts 694-700) |
| Live fallback | stamp <= 0 reads newest sample (Rewind.ts 508) |
| Interpolation | linear by default; `step` holds the previous sample for teleports (Rewind.ts 101, 103) |

## 4. TypeScript sketch

simplified: the sketch keeps the chain: a per-target ring of snapshot samples (recorded once per broadcast), a render stamp computed on the client from a server-time estimate minus interpolation delay and half the RTT, a server clamp into one window with live fallback for stamp 0, and linear interpolation inside the ring. It changes three donor points: one window is used for the clamp and the ring (the donor clamps with its default window while rings use per-attach windows); the clamp reports `clamped` so the caller can count it; and a missing stamp goes live rather than through the donor's midpoint reconstruction, which inherits the RTT error. It omits: delta coding of stamps on the wire, the `step` interpolation mode, the typed-array ring and per-field columns, the reckon timeline, the sanitizer, and the framework wiring (the record hook and the input API).

```ts
// Licence of donor: MIT (LICENSE line 1 copyright 2015-2026 Endel Dreyer; MIT License text line 3). Clean-room sketch of the mechanism, not a translation.
// Frankendom target (proposed): src/fight/lagcomp.ts. Donor points fixed here: one window for the clamp and the ring; the clamp reports when it moved a stamp; no midpoint reconstruction when the stamp is missing (go live instead).

export interface Sample { t: number; x: number; y: number }

// Per-target ring of recorded snapshots (one ring per tracked target, shared by every shooter).
export class Ring {
  private buf: Sample[] = [];

  constructor(private readonly cap: number) {}

  push(s: Sample): void {
    if (this.buf.length >= this.cap) this.buf.shift();
    this.buf.push(s);
  }

  newest(): number | undefined {
    return this.buf.length > 0 ? this.buf[this.buf.length - 1].t : undefined;
  }

  // Linear interpolation at time t, held at the ends of the retained range.
  at(t: number): { x: number; y: number } | undefined {
    const b = this.buf;
    if (b.length === 0) return undefined;
    if (t <= b[0].t) return { x: b[0].x, y: b[0].y };
    const last = b[b.length - 1];
    if (t >= last.t) return { x: last.x, y: last.y };
    for (let i = 1; i < b.length; i++) {
      if (b[i].t >= t) {
        const p = b[i - 1];
        const n = b[i];
        const a = n.t > p.t ? (t - p.t) / (n.t - p.t) : 0;
        return { x: p.x + (n.x - p.x) * a, y: p.y + (n.y - p.y) * a };
      }
    }
    return { x: last.x, y: last.y };
  }
}

export interface Aim { atMs: number; clamped: boolean; live: boolean }

// Clamp a shooter's render stamp into [newest - windowMs, newest].
// stamp <= 0 means the shooter has not synced its clock: aim at the newest sample (live).
export function aimAt(stamp: number, newest: number, windowMs: number): Aim {
  if (stamp <= 0) return { atMs: newest, clamped: false, live: true };
  const oldest = newest - windowMs;
  if (stamp < oldest) return { atMs: oldest, clamped: true, live: false };
  if (stamp > newest) return { atMs: newest, clamped: true, live: false };
  return { atMs: stamp, clamped: false, live: false };
}

// Client side: the render stamp it sends = its server-time estimate minus (interp delay + half the smoothed RTT).
// Unsynced clock sends 0. The delay is capped to a uint16 on the wire.
export function renderStamp(synced: boolean, serverNowMs: number, interpDelayMs: number, smoothedRttMs: number): number {
  if (!synced) return 0;
  const now = Math.max(0, Math.round(serverNowMs));
  const delta = Math.min(0xffff, Math.max(0, Math.round(interpDelayMs + smoothedRttMs / 2)));
  return now > delta ? now - delta : 0;
}

export {};
```

Typecheck: saved as `work/colyseus-sketch.ts`; run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2); exit 0. The local PostToolUse hook again reported that local tsc and eslint are missing on this Mac; the VPS run is the check.

## 5. Lands in

- TARGET `src/fight/lagcomp.ts` (proposed new module, engine side). It is the server half of the duel's hit test, so it sits under parity-checklist row 1 (duel step / sim). The stamp is input (row 5) and the once-per-broadcast record is server tick (row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget"); neither is claimed separately here.
- Current Frankendom hit-test code was not read in this pass.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is clean-room)
- Brief rule served: Frankendom rulings "kills are server-verified" and "one engine": one hit test, one history per target, run in the engine, not in the client.

## 6. Gaps and risks

- Fit with the rulings: lag comp only changes WHERE a hit test looks. It must not change engage, which stays a server state change (rulings: "engage is a state change"). Rewind only the hit check.
- Window size is a fairness dial. The donor's 500 ms default (Rewind.ts 4) is a ceiling on how far back any shooter can look (anti-spoof bound, Rewind.ts 482). That is the trade: a shooter on a bad link is favoured up to 500 ms, and so is a target that moved. Frankendom needs one number chosen from measured phone latency (ruling 1 below).
- Client-chosen values are bounded, not verified: the render delta is a uint16 the client fills (InputHandle.ts 696), and the server clamps the resulting time into the window (Rewind.ts 505-508). A cheating client can therefore pick any moment inside the window. The server never checks that the stamp matches the client's real render. Frankendom should treat the stamp as a hint inside a fixed window and keep the window small.
- Per-target cost, not per-shooter: one ring per tracked target per group (Rewind.ts 404). With MAX_ATTACKERS = 3, a target carries one ring and up to three views. Track only fight participants (attach each fight's entities, not the whole zone). That keeps zone population (row 23) out of the record loop.
- Delta-coded stamps on the reliable channel need in-order delivery. The server keeps a per-client baseline and says so: "reliable+in-order keeps the mirror locked" (RoomInput.ts 264, 265). A lost or re-ordered reliable input shifts every later stamp. The donor already solves this on the unreliable path: `decodeUnreliable` (RoomInput.ts 288-345) carries an absolute uint32 anchor plus in-packet deltas per redundancy-ring slot, one stamp per slot, and the comment states that no loss or reordering can desync it (298-300). Frankendom should copy that shape: an absolute anchor per packet, never a running baseline across packets.
- Defects found (keep the idea, fix the port):
  - (a) The clamp uses the default window only (Rewind.ts 506), while each group's ring is sized from its own `maxRewindMs` (75, 354, 404). A per-attach window larger than the default is clamped to 500 ms anyway. A smaller one makes reads older than the ring return the oldest retained sample silently (94). Fix: one window for both, and the clamp reports `clamped` (sketch).
  - (b) The doc on `record` says the framework passes the sim interval (Rewind.ts 367-368). The broadcast path passes the patch rate (Room.ts 1418). The effect: if no patch rate is set, the ring is sized with 1000/60 ms (Rewind.ts 8), so it is larger than needed (harmless, more memory). Fix: pass the interval actually used, and test the ring size.
  - (c) The midpoint fallback for an un-stamped reckon read inherits the client's RTT error (Rewind.ts 526, the author's own note). Fix: no fallback. A missing stamp means live (sketch).
  - (d) The donor notes the lastRecordedAt anchor was one tick stale and biased aim (Rewind.ts 456-460), fixed by the `bindNow` resolver. Port the fix from the start: anchor the reckon midpoint on the server's current time.
- Donor exploit or dupe history: no history available. The copy has no git history and no changelog. The patched defects visible in code comments are: a never-received field being clamped into a "held stick" (InputBuffer.ts 41-43, "clamping would INVENT one"); a range clamp turning an unset field into a phantom held input (RoomInput.ts 171-172); and a reckon fallback that rooms used to hand-write (types.ts 448-451, "the fallback rooms previously"). Each is a rule for Frankendom's input path: unset fields are not clamped, and a missing value is not invented.
- Reconnect (side fact, not the mechanism of this note): the match maker checks a reconnection token inside the room and rebuilds the seat for that session (MatchMaker.ts 284-290); an invalid token raises "reconnection token invalid or expired." (297). The client retry policy has a max-attempts option (sdk Reconnection.ts 12); its loop was not read. Frankendom's own reconnect plan is not compared here.
- Input validation (side fact): sanitizers clamp and never reject (PREDICTION.md 115); the map form is NaN-safe (116); semantic checks ("slot must name an owned weapon") stay in the sim (122). The donor does have a per-client rate limit: `Room.maxMessagesPerSecond` (Room.ts 330, default Infinity; the client is disconnected when it sends more, enforced at 2284-2290) and a separate `maxInputsPerSecond` for ROOM_INPUT_* packets with per-client counters in Transport.ts (326-330, 363-368). It is off by default and a disconnect-only model. Frankendom still needs its own per-client command budget, but can adapt this shape (counter per second, limit per message class, drop or disconnect on breach).
- Data shape (as-data, PASS2 item 1): the donor's "table" is the options object. `allowRewindState({ maxRewindMs })` (Rewind.ts 23-27). Each tracked group is a row of `{ collection, fields: string[], maxRewindMs?: number, interpolate: "linear" | "step", mode: "snapshot" | "reckon" }` (AttachOptions, Rewind.ts 245-267). A new tracked entity TYPE is one row: yes, as long as its numeric fields are named in the row. A new hit TEST is not a row: no, the donor leaves it to user code (PREDICTION.md 548-550 example).
- Licence provenance: MIT (LICENSE). Code may be adapted; this sketch is clean-room.

Rulings for Dom:
1. What is the hit window (the most a shooter can look back)? The donor uses 500 ms. Recommend starting at 500 ms and tuning from measured phone pings: a tighter window favours the target, a looser one favours the shooter.
2. Should lag comp apply to melee hits as well as ranged shots? Recommend yes for both, with engage left as a live state change.
3. Should the Pit (client-only arena) run any rewind? Recommend no, unless the Pit runs its fights on the server; if it does, use the same engine.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- FALSE claim in Gaps: 'no rate limit anywhere in packages/core/src'. Room.ts:330 defines maxMessagesPerSecond (disconnect on breach, enforced Room.ts ~2288) and Transport.ts 326-330, 363-368 carry per-client counters including maxInputsPerSecond for ROOM_INPUT_* packets. The recommendation for a per-client command budget stands.
- Stamp-delivery gap understated: the donor already uses an absolute uint32 anchor plus in-packet deltas on the unreliable path (RoomInput.decodeUnreliable 288-345; 'no amount of loss or reordering can desync it'); only the reliable channel (265) uses the running baseline.
- Everything else verified (Rewind.ts, Room.ts, RoomInput, InputHandle, InputBuffer, MatchMaker, MIT, as-data shape, honest no-history).

Fixed 2026-10-12: rate-limit gap rewritten with the donor's maxMessagesPerSecond / maxInputsPerSecond model; stamp-delivery gap and the Decision line now point at the unreliable-path absolute anchor. TypeScript sketch unchanged (no stamp delta coding in it), so no typecheck needed.
