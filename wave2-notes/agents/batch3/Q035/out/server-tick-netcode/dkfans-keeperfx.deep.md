# dkfans-keeperfx (server-tick-netcode, cell 3)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` (turn clock and sync 51-132, sample 220-241, lockstep wait 352-372 and 444-563) with the clock rate in `/mnt/frankendom-donors/dkfans-keeperfx/src/game_loop.c` (437-465, 484-490) | Licence: GNU GPL version 2 (`/mnt/frankendom-donors/dkfans-keeperfx/LICENSE` line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 2, June 1991"; no "or later" wording read in the project's own notice) | C | symbol `update_turn_speed_adjustment`

Checked: The hint file `tests/tst_enet_server.cpp` is an ENet connection test (first 12 lines read), not the mechanism. The real mechanism was read in full: `net_exchange_gameplay.c` 51-134, 220-241, 352-372, 444-563; `game_loop.c` 437-465 and 484-490 (the input-lag branch is read; the one-line no-lag branch is read but its driver is not). Callers checked: `update_turn_speed_adjustment` has three callers (`net_exchange_gameplay.c` 239, 502, 551; grep). Not read: `GetPing` (transport), where `host_packet_received` is set, the callers of `update_multiplayer_clock_adjust`, the repair-history send and receive bodies (280-350, 393-443; only their names and the resend interval were read), `net_input_lag.c` beyond line 112, and the default of `turns_per_second` (set at `console_cmd.c` 559 when changed). Confidence: high on the nudge arithmetic, the staleness guard and the callers; medium on the consumer (only the input-lag branch is covered in section 1). Clean-room: copyleft (GPL-2.0), shape only.

Best transferable idea: a client estimates the server's turn position from a 250 ms broadcast plus half the ping, extrapolates it by sample age, and nudges its own clock rate by the error divided by 64, clamped to 1 ms, dropping the sample after 750 ms.

Decision (proposed): adapt - take the client clock nudge (rate-only, clamped, staleness-guarded) for input timing and the hit-window display, but reject the lockstep wait: the server is authoritative and must never wait on a client.
Acceptance: a client test with a synthetic 80 ms ping and a 5 ms clock error converges to within 2 ms in under 2 s, never changes its rate by more than 1 ms per turn, and falls back to zero rate change when no server sample arrives for 750 ms; no server test ever depends on a client nudge.

## 1. Mechanism

- Turn clock. Local turn position is the turn number times the ns per turn (`nanoseconds_per_turn` = (1e9 + tps/2) / tps, rounded, `net_exchange_gameplay.c` 89), plus the phase inside the turn when delta-time is on (84-98, phase added at 96).
- The server sends its own turn position every 250 ms (`send_turn_sync_if_due`, 115-132: interval check at 122, unsequenced send to all active peers at 131). Non-server peers do nothing there. The server sets its nudge to 0 (120), and `update_turn_speed_adjustment` returns 0 for the server (106).
- Client receives the sample (`process_network_turn_sync_message`, 220-241). Server position = sample + one-way latency, where one-way latency is half of `GetPing(source)` (236-237). It records the receive time (238) and recomputes the nudge at once (239).
- Nudge (`update_turn_speed_adjustment`, 101-113). The nudge is 0 when: the client is fast-forwarding, the client is the server, there is no sample yet, `turns_per_second` is 0, or the sample is older than 3 x 250 ms (104-106). Otherwise: extrapolate the server position by the sample age (109, `server_position_now_ns = server_turn_position_ns + sync_age_ms * 1000000`); error = local position minus that (110); divide by 64 (`TURN_SYNC_ADJUST_FACTOR`); clamp to plus or minus 1 ms (111, `TURN_SYNC_MAX_ADJUSTMENT_NS`); store (112).
- Use in the clock rate (`game_loop.c` 437-465, input-lag branch). With input lag, the adjusted turn period is one turn plus the nudge (462), and the clock rate scale is one turn over the adjusted period (464). Turns per millisecond are the turns per second times that scale times the fast-forward factor (487). A local clock ahead of the server gets a positive nudge, so its scale falls below 1 and its turns slow. A behind clock is sped up.
- No-input-lag branch (456): `multiplayer_clock_adjust = 1 + (1 - host_packet_received) / 20`, reset each call. Not sketched; the setter of `host_packet_received` was not read.
- Recompute points. The nudge is recomputed when a sample arrives (239), inside the packet-wait loop (502), and after the network update in each gameplay exchange (551).
- Lockstep, for contrast (not sketched, rejected below). Each turn the peer waits until every present user has a packet for `get_gameturn() - input_lag_turns` (`have_all_turn_packets` 364; `wait_for_missing_packets` 467-519), except while initial input turns are skipped or a resync is pending (`LbNetwork_ExchangeGameplay` 535-563). A repair resend goes out every 200 ms (52), or every 50 ms (`REPAIR_HISTORY_RECOVERY_INTERVAL`) while initial input turns are skipped and inside the wait loop. A wait that runs past 10000 ms (54, 496) is marked as a timeout and the game continues so a resync can recover.

## 2. Key functions

- `get_current_turn_position_ns`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 84-99.
- `update_turn_speed_adjustment`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 101-113.
- `send_turn_sync_if_due`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 115-132.
- `process_network_turn_sync_message`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 220-241.
- `wait_for_missing_packets` (lockstep wait, rejected): `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 467-519.
- `LbNetwork_ExchangeGameplay` (exchange order): `/mnt/frankendom-donors/dkfans-keeperfx/src/net_exchange_gameplay.c` 535-563.
- Clock-rate update with input lag: `/mnt/frankendom-donors/dkfans-keeperfx/src/game_loop.c` 437-465 (the input-lag branch at 459-464) and the rate at 484-490.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Server broadcasts its position on a fixed interval | 250 ms (theirs, `net_exchange_gameplay.c` 55) |
| Client position estimate = sample + half ping | Ping halved (theirs, 236); the ping source (`GetPing`) not read |
| Extrapolate the sample by its age | Age in ms x 1e6 (theirs, 109) |
| Proportional correction with a gain | Divide by 64 (theirs, 57) |
| Slew-rate limit on the correction | 1 ms per recompute (theirs, 56); the source comment says a higher limit causes stutters (theirs, 51) |
| Drop a stale sample | 3 x 250 ms = 750 ms (theirs, 106) |
| Lockstep wait timeout (rejected) | 10000 ms (theirs, 54) |
| Repair resend interval (lockstep, not adopted) | 200 ms (theirs, 52); 50 ms in recovery (theirs, 53) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's estimate (sample plus half ping, extrapolated by age), the 64 gain, the +/-1 ms clamp and the 750 ms staleness guard, and it returns the clock rate scale the same way the donor's input-lag branch does. It omits the sender side (the 250 ms broadcast and its interval check), the fast-forward and server guards (the sketch takes the caller's word for them), the delta-time phase term in the local position (the sketch takes the local position as an input), the donor's integer ns rounding, the no-input-lag branch (5 lines in the donor, driver not read), the lockstep wait, the repair history and the spectator path. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0). The sketch was written from the mechanism and is not a line-by-line translation (GPL-2.0).

```ts
// Licence: GPL-2.0 (donor KeeperFX, LICENSE). Clean-room sketch of the shape, written from the mechanism, not a translation of the donor lines.
const SYNC_INTERVAL_MS = 250; // donor TURN_SYNC_INTERVAL_MS, net_exchange_gameplay.c:55
const STALE_AFTER_MS = 3 * SYNC_INTERVAL_MS; // donor drops a sample older than TURN_SYNC_INTERVAL_MS * 3
const MAX_NUDGE_NS = 1000000; // donor TURN_SYNC_MAX_ADJUSTMENT_NS, net_exchange_gameplay.c:56 (1 ms)
const NUDGE_DIVISOR = 64; // donor TURN_SYNC_ADJUST_FACTOR, net_exchange_gameplay.c:57

// Client-side estimate of the server's turn position, from its latest sample.
class TurnClock {
  private serverPosNs = 0;
  private receivedAtMs = 0; // 0 = no sample yet

  constructor(
    private nowMs: () => number,
    private localPosNs: () => number,
  ) {}

  // A server sample is its turn position plus half the ping (one way). Donor: net_exchange_gameplay.c:236-238.
  onServerSample(positionNs: number, pingMs: number): void {
    this.serverPosNs = positionNs + Math.floor((pingMs * 1000000 + 1) / 2);
    this.receivedAtMs = this.nowMs();
  }

  // Nudge in ns added to one turn's period. Zero when there is no fresh sample.
  nudgeNs(): number {
    if (this.receivedAtMs === 0) {
      return 0;
    }
    const ageMs = this.nowMs() - this.receivedAtMs;
    if (ageMs > STALE_AFTER_MS) {
      return 0;
    }
    const serverNowNs = this.serverPosNs + ageMs * 1000000; // extrapolate the server position by the sample age
    const raw = Math.trunc((this.localPosNs() - serverNowNs) / NUDGE_DIVISOR);
    return Math.max(-MAX_NUDGE_NS, Math.min(MAX_NUDGE_NS, raw));
  }
}

// Multiplier on the turn rate. A positive nudge (local clock ahead) lengthens the turn, so the local clock slows.
function clockRateScale(turnPeriodNs: number, nudgeNs: number): number {
  return turnPeriodNs / (turnPeriodNs + nudgeNs);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): the client clock nudge for input timing and hit-window display only. Parity-checklist row 18 (loot roll and XP award) with the sub-line "server tick: fixed step, input intake, per-tick NPC budget". The server tick and its fixed step stay on the server.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room only; the sketch is written from the mechanism and must not be translated).
- Brief rule served: 1 (one engine: the server is the single clock reference); rule 8 (server-verified kills) noted in section 6.

## 6. Gaps and risks

- The nudge changes client timing only, never a result. The server stays the referee for kills; the nudge may affect when an input is stamped or sent, nothing else. The acceptance test must check that a server result does not depend on a client nudge.
- Reject the lockstep. `wait_for_missing_packets` (467-519) stops every peer until all packets arrive, and only gives up after 10000 ms (54, 496). One slow peer stalls the whole game. Frankendom is server-authoritative with MAX_ATTACKERS = 3 and must never wait on a client.
- The estimate needs a ping source. The donor halves `GetPing` (236). Whether that value is a round trip or something else was not read (the transport was not read). Frankendom should measure its own round trip before using half of it.
- Stale data still drives a nudge. A sample up to 750 ms old still produces a nudge, extrapolated by its age. Under jitter the error grows with age. The 1 ms clamp per recompute limits the damage, but the donor's own comment says a higher clamp stutters (51). Test with jitter before use.
- Recompute happens on samples and in waits, not on a fixed clock. Between samples the nudge is the last value computed (for up to 750 ms), so the clock rate can change in steps. Frankendom should compute the nudge on its own fixed step.
- Repair history (lockstep resends, 200 ms, and 50 ms in recovery) is a reliable-input idea, not adopted here. It could inform how a reliable input resend works, but it was not read in full.
- Zones as data: 250 ms, the 1 ms clamp, the divisor 64 and the 750 ms guard are donor macros. Keep them as engine constants.
- Not a camera cell. The fixed-clock rendering in `game_loop.c` is outside this cell.

Reuse tag: rewrite-from-idea (GPL-2.0, clean-room only)
Brief rule served: 1 (one engine: the server is the single clock reference); rule 8 noted in section 6
