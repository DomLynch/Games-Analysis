# ModernUO (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` (validation, credit, queue, rate verdict) with `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` (`Move`, clock) and `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Network/Packets/IncomingMovementPackets.cs` (packet entry) | Licence: GPL-3.0-or-later (per file headers: "either version 3 of the License, or (at your option) any later version"; LICENSE file is GPLv3) | C# | symbol `ValidateAndQueueMovement`

Checked: `MovementThrottle.cs` read in full (1-1139): validation entry (119-235), execute and queue (240-305), reject (310-314), queue drain (344-422), history (500-611), rate (620-673), verdict (781-951), staff signal (958-1077). `Mobile.Move` read (4323-4387) and `ComputeMovementSpeed` (4453-4461). `Movement.cs` config (20-37). `NetState.Movement.cs` read 1-260 (not the RTT response path past 260). `IncomingMovementPackets.cs` read 28-100 (line 24 and 26 seen in grep). `MovementDebugCommands.cs` read 10-40 (the event subscriber). `PlayerMobile.cs` read 1725-1760 and 3869-3893. Callers of `Mobile.Move` found by grep (AIMovement.cs, BaseCreature.cs, PathFollower.cs, PlayerMobile.cs); only their call lines were read. Confidence: high on the order of checks, the numbers and the verdict tree (read in full); medium on the RTT probe timing (read 1-260 only). camera_scope: not applicable.

## 1. Mechanism

- Entry: the only live movement packet is `0x02` (IncomingMovementPackets.cs 24) and it hands off to `ValidateAndQueueMovement` (97). The batched handler `NewMovementReq` is registered as a comment only (26), so it does not run.
- Order of checks in `ValidateAndQueueMovement` (119-235): (a) bail if the mobile is gone (121); (b) staff, or speed-hack detection off by flag, executes at once (127-131); (c) a sequence mismatch resets (134-137); (d) bookkeeping: packet rate, RTT probe, the cost of this move (149) and the history record (152); (e) every 2 s the rate verdict runs and sets the probe frequency (155-162); (f) `delta = now - nextMovementTime` (165); (g) if the queue is non-empty, the input joins the queue to keep order (168-172); (h) early input (delta < 0): if credit covers it, it spends the credit and executes (185-202), otherwise it queues (214); (i) on-time or late input refills credit by delta, capped at the dynamic limit (222), and executes (234).
- Credit and debt: credit can go negative down to `-dynamicCredit` (184-185), so a player may be early by up to the limit before any input waits. `dynamicCredit` = 200 ms + min(avgRtt / 2, 150) (77-78, 175), unless the link is stable and under 50 ms RTT (71-73), which keeps the base 200.
- Execute: `Mobile.Move` does the move, sends the ack, and advances the clock (4357-4383). The clock is clamped first: if the clock is more than 200 ms behind now, it is set to `now - 200` (4374-4376), so lateness cannot be banked. Then `cost` is added (4380). A turn in place (cost 0) sets the clock to now (4365-4368). The sequence number wraps from 255 + 1 to 1, never 0 (265-268; `ResetMovementState` sets it to 0, `NetState.Movement.cs` 99).
- Queue: a queued input is stored with its direction and sequence (289-293). At the hard limit of 10 (281-282) the input is rejected: `SendMovementRej` and `ResetMovementState` (284, 310-314), which clears the queue, credit (101), and the clock (100). Queues are drained from the network slice (`MovementThrottle.ProcessAllQueues`, 319-339, called by `NetState.Slice` before socket completions) by `ProcessMovementQueue` (344-422): an input runs only when `now - nextMovementTime >= 0` (366-370), and a failed move rejects and resets (384-396).
- Verdict (`AnalyzeMovement` 781-951): rate = total target cost / total actual interval over up to 20 history entries, at least 8 samples (`CalculateMovementRate` 621-673, `_movementHistorySize`, `_minSamplesForRate`). Confidence adds: rate above 1.15 (+0.5), above 1.10 (+0.35), above 1.05 (+0.2), above 1.02 (+0.1); packet rate above 15/s (+0.15) or above 12/s (+0.1); queue above 4 (+0.5), equal to 4 (+0.25), 2 or 3 (+0.1); a stable low-RTT link with rate above 1.02 (+0.2); a link with RTT variance above 10000 or average RTT above 300 ms multiplies confidence by 0.6 (lines 863-866). A burst of 3 or more packets within 15 ms after a gap above 1000 ms is forgiven (x0.3); a burst with rate under 1.05 is halved (x0.5). Sample count below 10 multiplies by 0.7; 20 or more multiplies by 1.1, capped at 1. Verdict order: Definite if rate above 1.10 and confidence above 0.6, or rate above 1.20, or queue above 4 (909-913); Likely with queue 4 on a stable low-RTT link, or queue 3 on a stable link, or rate above 1.05 with confidence above 0.4 on a stable link; Possible for rate above 1.03 with confidence above 0.2, packet rate above 14, or queue 2 on a stable link; otherwise Normal (898-950).
- Staff signal (`CheckAndNotifyStaff` 958-1022): every check (2 s) the sustained counter goes up by 2 for Likely or Definite, down by 1 otherwise (982-986). Definite notifies at once (HIGH). Likely notifies after the counter reaches 10 (MEDIUM). Possible after 30 (LOW) (993-1007). `NotifyStaff` logs and fires the event `OnSpeedHackDetected`, rate-limited to one notice per 300000 ms per player (1040-1076). The one subscriber (`MovementDebugCommands.cs` 14, 17-40) broadcasts a coloured line to Counselor and above.
- What the verdict changes: only the RTT probe frequency (`SetProbeFrequency`, 161; NetState.Movement.cs 185-193: 5000 ms normal, 2000 ms at Likely, 1000 ms at Definite) and the staff notice. Nothing in this file rejects, kicks or rolls back an executed input because of a verdict. The only rejects are the queue overflow, a failed move, and a sequence mismatch.

## 2. Key functions

- `ValidateAndQueueMovement`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/MovementThrottle.cs` 119-235. Entry, order of checks, credit spend and refill.
- `ExecuteMovement`, `QueueMovement`, `RejectAndReset`: same file 240-314. Execute, queue with hard limit, reject and reset.
- `ProcessMovementQueue` and `ProcessAllQueues`: same file 319-422. Time-gated drain from the network slice.
- `AnalyzeMovement`: same file 781-951. Confidence and verdict tree.
- `CheckAndNotifyStaff` and `NotifyStaff`: same file 958-1077. Sustained counter, staff event, rate limit.
- `Mobile.Move`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 4323-4387. Clock clamp (drift 200) and advance by cost, then the ack.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Early input spends a credit buffer that may go into debt, up to a limit | Base credit 200 ms (theirs, MovementThrottle.cs 34); debt limit = the same dynamic credit (184-185) |
| Limit grows with measured latency, capped | Bonus = min(RTT / 2, 150) ms (theirs, 35, 77-78) |
| Stable, low-latency links keep the base credit | Under 50 ms RTT and stable (theirs, 71-73) |
| Queue for inputs that are too early, with a hard overflow reject | Hard limit 10 (theirs, 36, 281-282) |
| Lateness cannot be banked past the drift cap | 200 ms (theirs, Mobile.cs 4363, 4374-4376) |
| Cost advances the clock, a turn in place resets it | Walk foot 400 ms, run foot 200 ms, walk mount 200 ms, run mount 100 ms (theirs, Mobiles/Movement.cs 33-36); turn 0 (theirs, 32) |
| Rate ratio = total target / total actual over a window | Window 20 entries (theirs, 39), minimum 8 samples (theirs, 40), chain gap 2000 ms (theirs, 41) |
| Rate thresholds for the verdict | 1.02, 1.03, 1.05, 1.10, 1.15, 1.20 (theirs, 42-43, 808-824, 903-905) |
| Burst forgiveness after a lag gap | Burst threshold 15 ms (theirs, 733); burst 3 or more (theirs, 875, 881); gap above 1000 ms (theirs, 875) |
| Queue depth vs client's unacked limit | Client limit 5, so 4 is the unmodified-client maximum (theirs, 47-51, comment only; not checked against the client) |
| Staff notice escalation | Sustained 10 (Likely), 30 (Possible) (theirs, 998, 1003); +2 / -1 per 2 s check (982, 986); cooldown 300000 ms (theirs, 44) |
| RTT probe cadence | Normal 5000 ms, suspicious 2000, definite 1000, jitter 500, timeout 10000 (theirs, NetState.Movement.cs 158-161, 213) |

## 4. TypeScript sketch

simplified: rate and queue only in `verdict` (it keeps the queue-3-on-a-stable-link `likely` tier and drops the extra under-100-ms RTT test the donor puts on the queue-4 tier, which the queue-3 tier makes redundant). The donor also gates the middle tiers on confidence (0.2 to 0.6), RTT under 100 ms for some tiers, packet rate and burst forgiveness; those are dropped here. The gate keeps the donor's order: queue-first, then early-with-credit, then on-time refill, with the drift clamp applied inside `execute`, and it omits the history buffer, the donor's `ExecuteMovement` reject-and-reset when `Mobile.Move` fails (the sketch models it only through the `moveOk` argument; the donor also calls the move before advancing the clock), the packet-rate window, the RTT probe, the sequence number, the ack and the staff event. `staffSignal` never rejects input, as in the donor.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_CREDIT_MS = 200;     // base credit buffer (donor: _maxCredit)
const MAX_RTT_BONUS_MS = 150;  // extra credit for high latency (donor: _maxRttBonus)
const HARD_QUEUE_LIMIT = 10;   // reject and reset at this depth (donor: _hardQueueLimit)
const MAX_DRIFT_MS = 200;      // lateness that may be banked (donor: maxDrift in Mobile.Move)

type Decision = 'execute' | 'queued' | 'rejected';
type Verdict = 'normal' | 'possible' | 'likely' | 'definite';

interface Gate {
  credit: number;   // may go negative down to -limit (debt)
  clockMs: number;  // earliest time the next input is allowed
  queue: number[];  // deferred input ids, in arrival order
}

function creditLimit(avgRttMs: number): number {
  return MAX_CREDIT_MS + Math.min(Math.floor(avgRttMs / 2), MAX_RTT_BONUS_MS);
}

// Reject path shared by queue overflow and a failed move: clear the queue, credit and clock.
function rejectAndReset(g: Gate, now: number): Decision {
  g.queue = [];
  g.credit = 0;
  g.clockMs = now;
  return 'rejected';
}

// Server-side move: advances the clock by the cost, clamping banked lateness first.
// If the move itself fails (blocked, frozen), the donor rejects and resets instead of advancing.
function execute(g: Gate, now: number, costMs: number, moveOk = true): Decision {
  if (!moveOk) return rejectAndReset(g, now);
  if (costMs === 0) { g.clockMs = now; return 'execute'; } // turn in place resets the clock
  if (now - g.clockMs > MAX_DRIFT_MS) g.clockMs = now - MAX_DRIFT_MS;
  g.clockMs += costMs;
  return 'execute';
}

// Deferred input: reject and reset at the hard limit, otherwise queue.
function enqueue(g: Gate, now: number, id: number): Decision {
  if (g.queue.length >= HARD_QUEUE_LIMIT) return rejectAndReset(g, now);
  g.queue.push(id);
  return 'queued';
}

// One input. Queue order is kept; early inputs spend credit; late inputs refill it.
function admit(g: Gate, now: number, costMs: number, avgRttMs: number, id: number, moveOk = true): Decision {
  if (g.queue.length > 0) return enqueue(g, now, id);
  const delta = now - g.clockMs; // > 0 on time or late, < 0 early
  const limit = creditLimit(avgRttMs);
  if (delta < 0) {
    const early = -delta;
    if (g.credit - early >= -limit) { g.credit -= early; return execute(g, now, costMs, moveOk); }
    return enqueue(g, now, id);
  }
  g.credit = Math.min(g.credit + delta, limit);
  return execute(g, now, costMs, moveOk);
}

// simplified: rate and queue only. Donor also gates on confidence (0.2 to 0.6), RTT (under 100 ms for some
// tiers), packet rate and burst forgiveness; those are dropped here.
function verdict(rate: number, queueDepth: number, stable: boolean): Verdict {
  if (rate > 1.20 || queueDepth > 4) return 'definite';
  if (queueDepth >= 3 && stable) return 'likely';  // donor: 4 on a stable link under 100 ms RTT, or 3 on a stable link
  if (rate > 1.05 && stable) return 'likely';
  if (rate > 1.03 || (queueDepth >= 2 && stable)) return 'possible';
  return 'normal';
}

// Staff signal only: the caller updates `sustained` every check; nothing here rejects input.
function staffSignal(v: Verdict, sustained: number): 'HIGH' | 'MEDIUM' | 'LOW' | null {
  if (v === 'definite') return 'HIGH';
  if (v === 'likely' && sustained >= 10) return 'MEDIUM';
  if (v === 'possible' && sustained >= 30) return 'LOW';
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (new): the one function that accepts a timed player input (move, attack, dodge). It owns the credit gate, the bounded queue, and the reject-and-reset at overflow. Parity-checklist row 5 (controls/input, the input intake sub-line). The staff signal goes to the existing ops log, not into the fight.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: one intake for every input type); server-verified (the server decides when an input executes, not the client)
- Best transferable idea: Accept early timed inputs against a credit that can go into debt up to a latency-scaled limit, queue the rest in order, reject and reset only at a hard queue limit, and keep any rate-based cheat suspicion as a staff signal rather than a gate.
- Decision (proposed): adapt - keep the credit-debt gate, the bounded queue with reject-on-overflow, and the drift clamp for timed inputs; do not port the rate-based verdict as an enforcer, and do not port the RTT probe (the probe sends a client version request, which Frankendom would not need).
- Acceptance: Server test: an input 60 ms early with 200 ms of credit executes at once; with credit spent, 10 inputs queue in order and the 11th is rejected with a reject packet and the queue cleared; a sustained rate above 1.20 raises a HIGH staff signal and changes no executed input.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- The verdict is a detector, not an enforcer. `AnalyzeMovement` only feeds the probe frequency (`MovementThrottle.cs` 161) and the staff notice (1076, `MovementDebugCommands.cs` 14-40). Frankendom's server-verified rule needs a server-side reject or cooldown, which this donor does not provide. Do not copy the staff signal as if it stopped anything.
- `Mobile.Move` does not check the clock itself (`Mobile.cs` 4323-4387). Only the throttle checks it. Every other caller of `Move` skips timing: AI movement (`UOContent/Mobiles/AI/BaseAI/AIMovement.cs` 178, 208, 317), the path follower (`UOContent/Engines/Pathing/PathFollower.cs` 33), `BaseCreature.cs` 2662 and the `PlayerMobile.cs` 1741 override. This is correct for NPCs (no NetState), but Frankendom needs one intake for every player input so no caller can skip it.
- The batched handler `NewMovementReq` (`IncomingMovementPackets.cs` 30-60) calls `from.Move(dir)` directly and bypasses the throttle. Its registration is commented out (26), so it is dormant. If it is ever enabled it removes all timing checks. Record this as a trap: one intake only.
- Dead code in the donor: the rate skip for `DirectionChangeOnly` (`MovementThrottle.cs` 655) can never fire, because nothing sets that flag (`NetState.Movement.cs` 64 defines it; `MovementThrottle.cs` 558-587 builds flags without it, and cost-0 moves return at 558-565 before the write). The rate analysis is therefore not affected by turns, but the code suggests it was meant to be.
- The queue limit of 5 unacked and the 4-queue "modified client" rule (`MovementThrottle.cs` 47-51, 910-913) rest on a comment about the UO client, which was not checked. Frankendom's client is its own; derive its limit from its own input protocol.
- `ResetAllMovementTiming` (`MovementThrottle.cs` 482-492) gives every player full credit after a world save. Frankendom has no save-driven timing reset; if it adds one, it must not grant credit that the cheat rule would then ignore.
- Thresholds (1.02 to 1.20) and the confidence weights are hand-set. They are server configuration in the donor (`movementThrottle.*` settings, 83-112). Frankendom should expose them as data fields and test them on recorded traces, not trust the donor's numbers.
- `NetState.Movement.cs` RTT response handling past line 260 was not read. The probe timing used by `CurrentMovementRate` and the RTT stability flag depends on it.
- The `key` field read at `IncomingMovementPackets.cs` 94 is commented as unused (FastWalkStack).
- Fight rulings: the donor has no duel, guard or attack-cadence rule. Its shape transfers to input timing (row 5); the guard and stamina rules (row 3) need their own design.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Mechanism verified line by line (validation order 119-235, credit/debt 185, dynamic credit 60-79, Mobile.Move clamp 4361-4380, queue 275-295, reject/reset 310-314 + NetState.Movement ResetMovementState 96-106, drain 344-422, rate 621-673, AnalyzeMovement confidence weights and verdict tree 781-951, staff counter and cooldown 958-1077, probe intervals 158-161/185-193, packet 0x02 only, NewMovementReq dormant). Errors: (1) Sketch verdict() omits the donor tier 'queueDepth >= 3 && stable -> Likely' (925-928): the sketch only gives Likely at queue>=4, so queue 3 on a stable link comes out 'possible'; the note's own mechanism text lists the queue-3 rule, the sketch does not and does not declare it. (2) Sketch execute() always returns 'execute'; donor ExecuteMovement/queue drain reject+reset when Mobile.Move fails (242-251, 384-396); not in the omit list. (3) 'Sequence advances modulo 256' is really wrap 255+1 -> 1 (265-268). (4) ResetMovementState also sets Sequence=0 (99), unmentioned.

**Missed:** Staff drain: ProcessMovementQueue drains instantly for staff (355-358). GetDynamicCredit returns base 200 when no RTT data yet (65-68).
