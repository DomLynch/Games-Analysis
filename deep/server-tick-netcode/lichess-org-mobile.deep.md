# lichess-org-mobile (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` | Licence: GPL-3.0 | Dart | symbol `SocketClient (ping/reconnect/ack)`

Checked: (verified: `_sendPing` at 576-584, `_onPongTimeout` at 593-610, `_handlePong` at 612-632, `_reconnectDelay` at 662-669, `_resendAcks` at 691-698, `_handleEvent` at 482-512; all read in full).

## 1. Mechanism

- `SocketClient` holds one websocket to the server. Every ping delay (2.5 s, line 27; the default pooled client uses 25 s, line 739) it sends a ping. On every tenth ping (`_pongCount % 10 == 2`) it sends JSON with the average lag scaled by 0.1 instead of a bare `p` (577-581).
- Each ping starts a pong timer (9 s, theirs). A pong (`_handlePong`, 612-632) cancels the pong timer and any waiting reconnect timer, clears the failure run, schedules the next ping, and updates the lag average: the first four samples are a plain mean, after that an exponential mix of 0.1. A sample is the round trip, capped at 10 s. Both a `_pong` event and a topic-`n` event count as a pong (515-519).
- A missing pong (`_onPongTimeout`, 593-610) drops the channel now, not after the backoff, sets the average lag to zero, and reconnects (the reconnect timer also zeroes the average, 676). The first failure reconnects at once. Later failures wait `_reconnectDelay` (662-669): the base delay (3.5 s, line 29) for the first 60 s of failing (line 35), then the base times 2 to the number of whole grace periods failed (that power capped at 2^8), capped at 60 s (line 32).
- Acks the client sends are kept with a timestamp until the server acks them (`_onServerAck`, 684-689). A periodic timer (`_kResendAckDelay` = 1.5 s, lines 37 and 244) calls `_resendAcks` (691-698), which sends again any ack older than 2.5 s (hard-coded, 692).
- Versioned events (`_handleEvent`, 482-512): an event at or below the current version is ignored; an event more than one version ahead is retried after 200 ms (line 38), up to 10 retries, only the latest retry timer is kept (493); when the retries run out an `onEventGapFailure` callback fires, the error is logged and the event is dropped (498-508). Otherwise the version is advanced to the event's version.
- Inputs: websocket frames and timers. Outputs: pings, acks, reconnect calls, lag value, failure state.
- Tick: the ping timer and the pong timeout, per connection.

## 2. Key functions

- `SocketClient._sendPing`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` lines 576-584. Sends a ping, with lag on every tenth; starts the pong timer.
- `SocketClient._onPongTimeout`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` lines 593-610. Drops the channel, resets lag, starts or continues the failure run, schedules reconnect.
- `SocketClient._handlePong`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` lines 612-632. Ends the failure run, cancels the reconnect, updates the lag average.
- `SocketClient._reconnectDelay`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` lines 662-669. Base delay, then exponential growth per grace period, capped.
- `SocketClient._handleEvent`: same file lines 482-512. Version check, ignore old, retry gap, give up after 10.
- `SocketClient._resendAcks`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/network/socket.dart` lines 691-698. Resends acks older than the cutoff.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ping/pong liveness: a missing answer is a failure, not a slow answer | ping 2.5 s, max lag 9 s (theirs, 27-28) |
| Lag average: plain mean for the first samples, then exponential decay | 4-sample warm-up, mix 0.1, 10 s cap (theirs) |
| Failure run: immediate first retry, then backoff with a grace period | base 3.5 s, grace 60 s, cap 60 s (theirs, 29-35) |
| Un-acked messages resent after a cutoff | 2.5 s resend cutoff (theirs, 692); checked every 1.5 s (theirs, 37) |
| Versioned events: ignore old, hold future, retry short gaps | 200 ms retry (theirs, 38), 10 retries (theirs, 482) |

## 4. TypeScript sketch

simplified: the versioned-event gap check, the ack resend timer and the periodic ping send are not in the code (only `acksToResend` and a fixed ping constant); the lag report on every tenth ping and the `n` topic as a pong are omitted. Failure state is a timestamp, with the donor's disposal and online checks left out.

```ts
// Licence: GPL-3.0 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
const PING_EVERY = 2500, PONG_MAX = 9000, RECONNECT_BASE = 3500, GRACE = 60000, RECONNECT_CAP = 60000; // all placeholders

interface Sock { avgLag: number; pongs: number; failingSince: number | null; }

// A pong: the round trip is the lag sample, capped; the average warms up, then decays.
function onPong(s: Sock, roundTrip: number): void {
  const sample = Math.min(roundTrip, 10000);
  s.pongs++;
  const mix = s.pongs > 4 ? 0.1 : 1 / s.pongs;
  s.avgLag += (sample - s.avgLag) * mix;
  s.failingSince = null; // an answer ends the failure run
}

// Missing pong: drop the channel now; start a failure run, or continue one.
function onMissingPong(s: Sock, now: number): number {
  s.avgLag = 0;
  if (s.failingSince === null) {
    s.failingSince = now;
    return 0; // first failure: reconnect at once
  }
  return reconnectDelay(now - s.failingSince);
}

// Base delay for the first grace period, then doubled per grace period, capped.
function reconnectDelay(failingFor: number): number {
  if (failingFor <= GRACE) return RECONNECT_BASE;
  const doublings = Math.min(Math.floor(failingFor / GRACE), 8);
  return Math.min(RECONNECT_BASE * 2 ** doublings, RECONNECT_CAP);
}

// Acks that have waited past the cutoff are sent again.
function acksToResend(acks: { id: number; at: number }[], now: number, cutoff: number): number[] {
  return acks.filter(a => now - a.at >= cutoff).map(a => a.id);
}

// Ping interval is fixed; the pong timeout is what detects a dead link.
function nextPingDelay(): number {
  return PING_EVERY;
}
```

## 5. Lands in

- TARGET `src/fight/client-link.ts` (new), the client side of the fight socket. Both clients (Pit and zones) use it. Parity-checklist row 5 (controls / input, send side) and row 18 (post-K item 3: server tick).
- today: `src/net/reconnect-policy.ts` (which relay closes are final) and `src/net/backoff.ts` (full-jitter exponential delay, adapted from levy-street/world-of-claudecraft) already cover reconnect; this donor's useful extra is the failure run with an immediate first retry, the ping/pong-as-liveness rule, and the version-gap retry. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). Zone 1 steps the engine in-process.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- This is the client half only. The server side of ping, ack and version is not in this file.
- The donor is Flutter and the lag value is for display only. Frankendom's server-verified kills mean the client's lag report must not influence a hit result.
- The versioned-event gap check is the part that matters for a server-verified stream. It assumes one version counter per socket; zones as data would need one counter per fight instance. After 10 failed retries the donor only fires a callback and drops the event; a Frankendom client would need to resync from the server.
- Reconnect re-runs the handshake and resubscribes; those steps (`connect`, 250-380) were not read in full here.
