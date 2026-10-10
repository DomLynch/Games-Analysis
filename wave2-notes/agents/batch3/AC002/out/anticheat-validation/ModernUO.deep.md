# ModernUO (anticheat-validation, cell 3)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` (with `Projects/Server/Mobiles/Mobile.cs`, `Projects/Server/Mobiles/Movement.cs`, `Projects/UOContent/Mobiles/PlayerMobile.cs`, `Projects/Server/Network/NetState/NetState.Movement.cs`, `Projects/Server/Network/NetState/NetState.Network.cs`, `Projects/UOContent/Network/Packets/IncomingMovementPackets.cs`) | Licence: GPL-3.0-or-later (MovementThrottle.cs header lines 8-10: "either version 3 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/ModernUO/LICENSE` is GPL v3) | C# | symbol `MovementThrottle.ValidateAndQueueMovement`

Checked: The hint file `Projects/UOContent.Tests/Tests/Network/AutoDenylist/AutoDenylistTests.cs` was not used; it is a test for the auto-denylist, not the movement gate. The mechanism is `Projects/Server/Network/MovementThrottle.cs`, read in full (1-1139). Callers and inputs read: `IncomingMovementPackets.cs` 83-98 (the handler, whole); `Mobile.cs` 4323-4384 (the Move timing block, whole; the rest of Move read by line only); `Mobile.cs` 4451-4461 (base cost); `PlayerMobile.cs` 3869-3893 (player cost); `Movement.cs` 20-37 (delay defaults); `NetState.Movement.cs` 60-135 (fields and reset; `TrackMovementRate` at 123 read only to its first branch; the RTT probe 199 onward not read); `NetState.Network.cs` 713-740 (`Slice` calls `ProcessAllQueues` at 735; the slice frequency was not read). Not read: `AverageRtt`, `HasStableConnection`, `_rttVariance` (used as given by the verdict code); `SetProbeFrequency`; `SendMovementAck` and `SendMovementRej` bodies; other writers of `_nextMovementTime` (`Mobile.cs` 604 and 4664, by grep only); the `OnSpeedHackDetected` subscribers. Not read as candidates for the ban and connection pipeline: `AutoDenylist.cs`, `IPRateLimiter.cs`, `BanConfiguration.cs`. Confidence: high on the order of operations and the numbers (all in read lines); medium on how the RTT-gated branches behave (inputs not read). Not a camera cell.

## 1. Mechanism

- Entry: the client sends a movement request with a direction byte and a sequence byte; a third field is read and ignored (IncomingMovementPackets.cs 92-97). The handler calls `MovementThrottle.ValidateAndQueueMovement` (97).
- Bypass: staff (access level above player) or detection switched off executes the move at once (MovementThrottle.cs 127-131). A sequence mismatch with the server's sequence 0 rejects and resets (134-137).
- Per request, in order (lines 119-235):
  1. Packet-rate tracking and an RTT probe (143-146; bodies not read).
  2. Cost of the move: `mobile.ComputeMovementSpeed(dir)` (149). Defaults: walk on foot 400 ms, run on foot 200 ms, walk mounted 200 ms, run mounted 100 ms (Movement.cs 33-36). A direction-only turn returns the turn delay, which defaults to 0 (PlayerMobile.cs 3871-3873; Movement.cs 32).
  3. Record in the history before any decision (152). A cost of 0 is not recorded (558-565). A gap of 0 or less, or above 2000 ms, breaks the chain and is not recorded (509-512; the first move of a chain is also skipped). Otherwise the record keeps the interval, the cost as target speed, the queue depth and flags for running, mounted and was-queued (584-587), in a ring of 20 (39, 590-595).
  4. Every 2000 ms (155-162): run `CheckAndNotifyStaff`, then set the probe frequency from the verdict.
  5. `delta = now - nextAllowed` (165). Positive means late or on time; negative means early by `-delta`.
  6. If anything is already queued, the move joins the queue, to keep order (168-172).
  7. Early (delta < 0): if `credit - early >= -dynamicCredit`, spend the early amount from credit and execute now (185-188, 201). Otherwise queue (214-215). The credit may go into debt down to minus the dynamic credit.
  8. On time or late (delta >= 0): credit = min(credit + delta, dynamic credit) (222), then execute (234).
  9. Execute (`ExecuteMovement`, 240-270): `mobile.Move(dir)`. A failed move rejects and resets (242-250). A success advances the sequence, and it wraps to 1 when it would reach 256 (264-269).
- `Mobile.Move` charges the cost to the baseline (Mobile.cs 4355-4384): a turn sets the baseline to now (4365-4369); otherwise a baseline more than 200 ms behind now is clamped to now minus 200 (4374-4377), then the cost is added (4380); then the ack is sent (4383). So a late walking move (cost 400) sets the next allowed time to 200 ms after this move, not 400: a 200 ms catch-up. A late run move (cost 200) sets it to the move time itself.
- Queue: capacity 10 (`_hardQueueLimit`). When full, the newest move is rejected, the overflow is logged and the state is reset (281-284). `ProcessAllQueues` (319-339), called once per network slice (NetState.Network.cs 735), drains each queue while `now >= nextAllowed` (363-370). A failed move or a sequence mismatch rejects and resets (376-380, 395-396). Staff drain at once (355-358).
- Rate: `CalculateMovementRate` = sum of recorded costs over sum of recorded intervals across the ring (621-672), at least 8 samples (631), otherwise 1.0. A ratio above 1 means moves are charged less time than they took, i.e. faster than allowed.
- Verdict (`AnalyzeMovement`, 781-951), in the order the code runs:
  - Confidence is a sum of signals: rate above 1.02, 1.05, 1.10 or 1.15 adds 0.1, 0.2, 0.35 or 0.5 (808-823); packet rate above 12 or 15 per second adds 0.1 or 0.15 (826-834); queue depth 2, 4 or above 4 adds 0.1, 0.25 or 0.5 (840-852); a stable link under 100 ms RTT adds 0.2 when the rate is above 1.02, otherwise, variance above 10000 or RTT above 300 multiplies by 0.6 (863-867). A lag-recovery burst after a large gap multiplies by 0.3 (875-879); a burst with a normal rate multiplies by 0.5 (881-885); a sample count under 10 multiplies by 0.7, 20 or more multiplies by 1.1 capped at 1 (888-895).
  - Verdict, first match: rate above 1.10 with confidence above 0.6 is Definite (898-901); rate above 1.20 is Definite (903-906); queue depth above 4 is Definite (910-913); queue of 4 or more on a stable link under 100 ms RTT is Likely (919-923); queue of 3 or more on a stable link is Likely (925-928); rate above 1.05 with confidence above 0.4 on a stable link is Likely (930-933); rate above 1.03 with confidence above 0.2 is Possible (935-938); packet rate above 14 is Possible (940-943); queue of 2 or more on a stable link is Possible (945-948); otherwise Normal (950).
- `CheckAndNotifyStaff` (958-1021), every check: a Likely or Definite verdict adds 2 to the sustained counter; any other verdict takes 1 off, down to 0 (980-987). Notify: Definite at once (993-996); Likely when the counter is 10 or more (998-1001), which is five consecutive checks, about 10 s; Possible when it is 30 or more (1003-1006).
- `NotifyStaff` (1028-1077): a per-player cooldown of 300000 ms (1040-1046); a warning log line with the full state; then the `OnSpeedHackDetected` event (1076). No kick, ban or reject is taken in this path. The only enforcement is the timing gate and the reject-and-reset.
- Reset (`ResetMovementState`, NetState.Movement.cs 96-117, called by `RejectAndReset`, MovementThrottle.cs 310-314): queue cleared (98), sequence 0, baseline now, credit 0 (101), history cleared, sustained counter 0 (110), packet window reset.
- After a world save, `ResetAllMovementTiming` (482-492) gives each connected player the full credit and the current time as baseline.

## 2. Key functions

- `MovementThrottle.ValidateAndQueueMovement`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 119-235. Gate: bypass, sequence check, cost, record, verdict cadence, credit, execute or queue.
- `MovementThrottle.ProcessMovementQueue`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 344-422. Drain while the next allowed time has come.
- `MovementThrottle.RecordMovement`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 500-611. Chain and direction filters and the history ring.
- `MovementThrottle.CalculateMovementRate`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 621-673. Sum of costs over sum of intervals.
- `MovementThrottle.AnalyzeMovement`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 781-951. Confidence signals and the verdict order.
- `MovementThrottle.CheckAndNotifyStaff`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 958-1021. Sustained counter and notify gates.
- `Mobile.Move` timing block: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 4355-4384. Baseline clamp and cost charge.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Credit buffer for early input, with a debt limit | 200 ms base (MovementThrottle.cs 34); RTT bonus is half the average RTT, capped at 150 (35, 77) |
| Credit rebuilt by lateness, capped | same cap (222) |
| Burst queue and reject when full | 10 (36, 281) |
| Expected queue for an unmodified client | at most 4, from the UO client's 5 unacknowledged movements (49-51) |
| Late baseline clamp, so lateness cannot be banked | 200 ms (Mobile.cs 4363, 4374-4376); the comment says it should match the credit buffer |
| Rolling rate window | 20 samples (39); at least 8 for a rate (40); chain gap 2000 ms (41) |
| Rate thresholds | 1.05 suspicious (42); 1.10 definite with confidence (43); 1.20 definite (903); 1.15 strongest rate signal (808) |
| Burst size | 15 ms per packet counts as simultaneous (733) |
| Packet-rate expectation | 12 per second (460); 14 for Possible (940) |
| Sustained counter | +2 per 2000 ms check at Likely or above; Likely notifies at 10, Possible at 30 (982, 998, 1003) |
| Notify cooldown | 300000 ms per player (44) |
| Movement cost, defaults | walk foot 400, run foot 200, walk mounted 200, run mounted 100, turn 0 ms (Movement.cs 32-36) |
| Verdict cadence | 2000 ms (155) |

All intervals and costs are ms. The rate is a dimensionless ratio of cost to interval.

## 4. TypeScript sketch

simplified: keeps the credit-and-queue timing gate (early packets spend credit, late packets rebuild it, a queue behind a pending move, reject-and-reset on overflow), the late-baseline clamp, the rate ratio over a bounded history with a minimum sample count, the queue-depth signal, and the sustained counter with a per-player notify cooldown. Omits: the RTT-based credit bonus and stable-connection test (the stable flag is a plain input), the confidence score and its forgiveness rules (so the donor's definite rule with confidence above 0.6, and the definiteRate field, are not used here), the packet-rate signal, the burst detection, the chain-gap history reset, the RTT probe, the sequence check, the staff bypass, the donor's per-step recomputed cost (the sketch stores cost on the queued item), and the 'now' refresh inside the drain loop (one time value per call). The queue rules are reduced: a queue of 3 or more on a stable link stands in for the donor's queue-likely rules, and above 4 is definite as in the donor. Flags go to an in-memory ledger; nothing is kicked or banned.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: keeps the credit-and-queue timing gate (early packets spend credit, late packets rebuild it, a queue behind a pending move, reject-and-reset on overflow), the late-baseline clamp, the rate ratio over a bounded history with a minimum sample count, the queue-depth signal, and the sustained counter with a per-player notify cooldown. Omits: the RTT-based credit bonus and stable-connection test (the stable flag is a plain input), the confidence score and its forgiveness rules (so the donor's definite rule with confidence above 0.6, and the definiteRate field, are not used here), the packet-rate signal, the burst detection, the chain-gap history reset, the RTT probe, the sequence check, the staff bypass, the donor's per-step recomputed cost (the sketch stores cost on the queued item), and the 'now' refresh inside the drain loop (one time value per call). The queue rules are reduced: a queue of 3 or more on a stable link stands in for the donor's queue-likely rules, and above 4 is definite as in the donor. Flags go to an in-memory ledger; nothing is kicked or banned.

export interface Cfg {
  maxCredit: number;          // ms of early arrival that credit can cover (donor 200 before RTT bonus)
  maxDrift: number;           // ms; a late baseline is clamped to this far behind now (donor 200)
  hardQueueLimit: number;     // queue length that triggers reject-and-reset (donor 10)
  unmodifiedQueueMax: number; // queue depth an unmodified client cannot exceed (donor 4)
  minSamples: number;         // history samples needed before a rate is used (donor 8)
  historySize: number;        // ring size (donor 20)
  suspiciousRate: number;     // donor 1.05
  definiteRate: number;       // donor 1.10
  cooldownMs: number;         // notify cooldown per player (donor 300000)
}

export interface Queued {
  cost: number;   // ms this move charges to the baseline (donor recomputes it at execution)
  seq: number;
}

export interface Sample {
  target: number;   // cost of the move
  interval: number; // actual gap since the previous recorded move
}

export interface Conn {
  nextAllowedMs: number;
  credit: number;
  queue: Queued[];
  history: Sample[];
  lastMoveMs: number | null;
  highSeconds: number;      // sustained counter: +2 per check at likely or above, -1 otherwise
  lastNotifyMs: number | null;
  stable: boolean;          // stands in for the donor's stable-connection test
}

export type Verdict = "normal" | "possible" | "likely" | "definite";

export interface Flag {
  atMs: number;
  verdict: Verdict;
  ratio: number;
}

export const ledger: Flag[] = [];

// Execute one move: late baselines are clamped, then the move's cost is charged. Cost zero (a turn) resets the baseline to now.
function execute(c: Conn, cfg: Cfg, now: number, cost: number): void {
  if (cost === 0) {
    c.nextAllowedMs = now;
    return;
  }
  if (now - c.nextAllowedMs > cfg.maxDrift) c.nextAllowedMs = now - cfg.maxDrift;
  c.nextAllowedMs += cost;
}

function recordHistory(c: Conn, cfg: Cfg, now: number, cost: number): void {
  if (cost === 0) return; // turns do not change the rate
  const interval = c.lastMoveMs === null ? -1 : now - c.lastMoveMs;
  c.lastMoveMs = now;
  if (interval <= 0 || interval > 2000) return; // chain break (donor chain gap 2000 ms)
  c.history.push({ target: cost, interval });
  if (c.history.length > cfg.historySize) c.history.shift();
}

function enqueue(c: Conn, cfg: Cfg, now: number, m: Queued): "queued" | "rejected" {
  if (c.queue.length >= cfg.hardQueueLimit) {
    resetMovement(c, now);
    return "rejected";
  }
  c.queue.push(m);
  return "queued";
}

// Donor ResetMovementState: queue cleared, baseline set to now, credit zeroed, history and sustained counter cleared.
export function resetMovement(c: Conn, now: number): void {
  c.queue = [];
  c.nextAllowedMs = now;
  c.credit = 0;
  c.history = [];
  c.lastMoveMs = null;
  c.highSeconds = 0;
}

// One incoming move. Recording happens first, before any decision.
export function onMove(c: Conn, cfg: Cfg, now: number, m: Queued): "executed" | "queued" | "rejected" {
  recordHistory(c, cfg, now, m.cost);
  if (c.queue.length > 0) return enqueue(c, cfg, now, m);

  const delta = now - c.nextAllowedMs;
  if (delta < 0) {
    const early = -delta;
    if (c.credit - early >= -cfg.maxCredit) {
      c.credit -= early; // debt may go down to -maxCredit
      execute(c, cfg, now, m.cost);
      return "executed";
    }
    return enqueue(c, cfg, now, m);
  }
  if (delta > 0) c.credit = Math.min(c.credit + delta, cfg.maxCredit);
  execute(c, cfg, now, m.cost);
  return "executed";
}

// Run queued moves whose time has come. Returns how many ran.
export function drain(c: Conn, cfg: Cfg, now: number): number {
  let ran = 0;
  while (c.queue.length > 0) {
    if (now - c.nextAllowedMs < 0) break;
    const m = c.queue.shift();
    if (m === undefined) break;
    execute(c, cfg, now, m.cost);
    ran++;
  }
  return ran;
}

export function rate(c: Conn, cfg: Cfg): { ratio: number; samples: number } {
  const n = c.history.length;
  if (n < cfg.minSamples) return { ratio: 1, samples: n };
  let target = 0;
  let actual = 0;
  for (const s of c.history) {
    target += s.target;
    actual += s.interval;
  }
  return { ratio: actual > 0 ? target / actual : 1, samples: n };
}

export function verdict(c: Conn, cfg: Cfg): Verdict {
  const { ratio, samples } = rate(c, cfg);
  if (samples < cfg.minSamples) return "normal";
  if (ratio > 1.2) return "definite";
  if (c.queue.length > cfg.unmodifiedQueueMax) return "definite";
  if (c.stable && (c.queue.length >= cfg.unmodifiedQueueMax - 1 || ratio > cfg.suspiciousRate)) return "likely";
  if (ratio > 1.03) return "possible";
  if (c.stable && c.queue.length >= 2) return "possible";
  return "normal";
}

// Called about every 2 seconds. Notifies at most once per cooldown, with the sustained gates the donor uses.
export function check(c: Conn, cfg: Cfg, nowMs: number): Verdict {
  const v = verdict(c, cfg);
  if (v === "likely" || v === "definite") c.highSeconds += 2;
  else c.highSeconds = Math.max(0, c.highSeconds - 1);

  const notify =
    v === "definite" ||
    (v === "likely" && c.highSeconds >= 10) ||
    (v === "possible" && c.highSeconds >= 30);

  if (notify && (c.lastNotifyMs === null || nowMs - c.lastNotifyMs >= cfg.cooldownMs)) {
    c.lastNotifyMs = nowMs;
    ledger.push({ atMs: nowMs, verdict: v, ratio: rate(c, cfg).ratio });
  }
  return v;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/modernuo-movement-throttle.ts`): exit 0, no output.

## 5. Lands in

- TARGET `origins/server/movement-throttle.ts` (new; proposed): the per-player movement clock and rate ratio, run from the server's movement intake and drained each server tick. It is not in `src/fight/`; fights use the same clock only where a hero moves inside a fight.
- Parity-checklist row 5 (controls/input, intake): this is the validation of movement input. The queue drain at a fixed interval is the server-tick sub-line of row 18 ("server tick: fixed step, input intake, per-tick NPC budget"). Row 5 is the closest single row; no row is written for anticheat.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
- Brief rule served: server-verified movement (the server owns the clock and rejects input that arrives out of time) and one ledger (verdicts go to the one per-player record, not a side log)

Best transferable idea: a per-player movement clock where early input spends a capped credit, late input rebuilds it, a short queue absorbs bursts, and a rolling ratio of charged cost to real interval flags sustained speed without kicking anyone by itself.

Decision (proposed): adapt — take the clock (credit with a debt limit, a 10-move queue, the late-baseline clamp at 200 ms), the rolling ratio over 20 samples with the 8-sample minimum, the sustained counter and the notify cooldown; reject the UO-specific queue-of-4 signal, because it depends on the UO client's 5-unacknowledged window, which Frankendom's protocol does not have, and reject the RTT-based credit bonus in the first version (the simple cap is enough to start).
Acceptance: A server test sends one hero's move intents at 1.12 times the walk cost for 20 s and asserts a Likely or Definite ledger entry within about 10 s of the sustained counter reaching 10, and that the server position never gets ahead of the walk cost by more than the 200 ms clamp; a second test at walk pace for 60 s asserts no ledger entry and no queued move.

## 6. Gaps and risks

- Protocol-specific constant: the queue-of-4 signal assumes the UO client keeps at most 5 movements unacknowledged (MovementThrottle.cs 46-49, 837-848). Frankendom needs its own ack window, or it should drop that signal.
- A rejection clears detection: `ResetMovementState` zeroes credit (NetState.Movement.cs 101) and the sustained counter (110), and clears the queue (98). A rejection therefore wipes the suspicion built up before it. Frankendom's one ledger must keep the counter across rejections. The sketch copies the donor's reset, so do not copy that part.
- Turn cost depends on configuration: a turn counts as free only because the turn delay defaults to 0 (Movement.cs 32). If an operator sets a turn delay, a turn returns a non-zero cost (PlayerMobile.cs 3873), is charged to the baseline and is recorded as a move in the rate (MovementThrottle.cs 152, 558-565). Frankendom should decide turns in the engine, not with a tunable.
- Dead branch: `DirectionChangeOnly` is declared (NetState.Movement.cs 64) and skipped in the rate (MovementThrottle.cs 655), but `RecordMovement` returns before it sets any flag for a cost of 0 (558-565). The branch can never run. Harmless, but do not rely on it.
- Overflow clears everything: when the queue is full, the newest move is rejected and the whole queue is cleared (281-284, 310-314, NetState.Movement.cs 98). Moves the player already sent are dropped. Frankendom should decide per move, not per queue.
- The verdict depends on RTT inputs that were not read (`AverageRtt`, `HasStableConnection`, `_rttVariance`). The stable-link branches (MovementThrottle.cs 855-867, 919-933) cannot be fully assessed until those are read. The sketch takes `stable` as a plain flag.
- No enforcement in the donor: the path notifies staff and raises an event (1018, 1076). Frankendom needs an explicit action policy in the one ledger (flag, soft block, kick, human review for bans). The donor does not show one.
- Save reset is a fairness step: after a world save, every connected player gets full credit and the current time as baseline (482-492). Frankendom's zone change or respawn should do the same on purpose, with a receipt in the ledger.
- Lag forgiveness is useful but untuned: a large gap followed by a burst scales confidence by 0.3 (875-879). The sketch omits it; the numbers have no source in the donor beyond the code.
- Not read: `AutoDenylist.cs`, `IPRateLimiter.cs` and `BanConfiguration.cs` (the ban and connection pipelines, a separate mechanism); the RTT probe; the send functions for acks and rejections.
