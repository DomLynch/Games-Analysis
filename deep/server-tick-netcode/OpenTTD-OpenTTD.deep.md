# OpenTTD-OpenTTD (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` | Licence: GPL-2.0-only per network_server.cpp header | C++ | symbol `NetworkServer_Tick`

Checked: At 1739 (verified). Also read: `ServerNetworkGameSocketHandler::SendFrame` (648), `ReceiveClientAck` (1248), `ReceiveClientMapOk` (1064), `NetworkCalculateLag` (network.cpp 295).

## 1. Mechanism

- `NetworkServer_Tick(send_frame)` runs once per game tick on the server (1739-1870). A global `_last_sync_frame` decides once per call whether this tick is a sync tick (`sync_freq`, 1746-1749). Then for each client it refills the receive budget (`receive_limit + bytes_per_frame`, capped at `bytes_per_frame_burst`, 1757) and computes `lag = NetworkCalculateLag(cs)` (1761).
- The drop checks branch on client status. Only an `Active` client uses `max_lag_time`: drop if `lag > max_lag_time` (1764), or if `last_frame_server - last_token_frame >= max_lag_time` (1788, "fails to send valid acks"). Other states have their own limits: `max_init_time` (Inactive/Identify/NewGRFsCheck/Authorized, 1802), `max_download_time` (Map, 1826), `max_join_time` (DoneMap/PreActive, 1836), `max_password_time` (AuthGame, 1845). MapWait sends a wait packet every 2 s of silence (1813). Each drop is `SendError` then `continue`.
- Clients with status `>= PreActive` get `NetworkHandleCommandQueue(cs)`, then `SendFrame()` if `send_frame`, then `SendSync()` if this is a sync tick (1857-1868).
- `SendFrame` (648-668) writes `_frame_counter`, `_frame_counter_max` (and a sync seed only under `ENABLE_NETWORK_SYNC_EVERY_FRAME`), and appends a fresh random token (1..254) only when `last_token == 0` (661-664). `SendFrame` does not change client status. PreActive is set in `ReceiveClientMapOk` (1080), which then calls `SendFrame` and `SendSync` and sets `last_frame` and `last_frame_server` to the current frame (1087-1088).
- `ReceiveClientAck` (1248-1294): reads the frame. If status is PreActive, it returns early while `frame + DAY_TICKS < _frame_counter` (1262); otherwise status becomes Active and `last_token_frame = _frame_counter` (1266-1267). Then it reads the token; a match sets `last_token_frame` and clears `last_token` (1275-1286). Finally `last_frame = frame` and `last_frame_server = _frame_counter` (1290-1292).
- `NetworkCalculateLag` (network.cpp 295-305): `lag = last_frame_server - last_frame`; if `last_frame_server + DAY_TICKS + frame_freq < _frame_counter` (the ack is overdue by more than one day plus `frame_freq`), it adds `_frame_counter - (last_frame_server + DAY_TICKS + frame_freq)`, so lag grows by one per frame while the ack is missing.
- Inputs: client acks and the command queue. Outputs: frame, sync, wait and error packets, queued commands.
- Tick: the server frame counter. The sim is lockstep: the server sends commands and clients step frame by frame. No entity state is sent by these functions.

## 2. Key functions

- `NetworkServer_Tick`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` lines 1739-1870. Budget refill, per-status lag and token checks, drop, then command queue, frame and sync sends.
- `ServerNetworkGameSocketHandler::SendFrame`: same file, lines 648-668. Frame header packet; issues a token if none is outstanding. Does not set status.
- `ServerNetworkGameSocketHandler::ReceiveClientMapOk`: same file, lines 1064-1105. Sets PreActive (1080), sends first frame and sync, seeds `last_frame` and `last_frame_server`.
- `ServerNetworkGameSocketHandler::ReceiveClientAck`: same file, lines 1248-1294. Catch-up unpause (PreActive to Active), token check, updates `last_frame` and `last_frame_server`.
- `NetworkCalculateLag`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network.cpp` lines 295-305. Lag in frames, with growth once an ack is overdue by a day plus `frame_freq`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Frame pacing: server issues frame N, client acks N with a token | `frame_freq` (theirs, setting; used at network.cpp 301) |
| Lag = server frame at last ack minus the client's acked frame, plus per-frame growth when the ack is overdue | `Ticks::DAY_TICKS` as the overdue window (theirs; network.cpp 301, network_server.cpp 1262) |
| Per-status time limits | `max_lag_time` (1764, 1788), `max_init_time` (1802), `max_download_time` (1826), `max_join_time` (1836), `max_password_time` (1845) (theirs, settings) |
| Token round trip as a liveness check, separate from the lag clock | token range 1..254 (theirs, 662) |
| Per-client byte budget per frame, capped by a burst size | `bytes_per_frame`, `bytes_per_frame_burst` (theirs, settings, 1757-1758) |
| Periodic sync-check to catch divergence | `sync_freq` (theirs, setting, 1746) |
| Hold a joining client paused until it catches up | one-day catch-up rule (theirs, 1262) |

## 4. TypeScript sketch

simplified: only the Active-state lag and token drops are modelled (the other per-status limits, the 2 s MapWait ping, the byte budget, the sync packet, the `send_frame` flag, the command-queue call and the slow-client console warning (`lag_test`) are omitted; the sketch also issues a token to every status, where the donor sends frames only to PreActive and later); PreActive is entered by the join handler, not by the frame send; packets are shown as comments.

```ts
// Licence: GPL-2.0 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
type Status = "preActive" | "active";

interface ClientLink {
  id: number;
  status: Status;
  lastFrame: number;        // newest frame the client reported reaching
  lastFrameServer: number;  // server frame when that ack arrived
  lastTokenFrame: number;   // server frame when the last valid token came back
  token: number;            // 0 = none outstanding
}

// Called by the join handler when the client has the map.
function onJoinReady(serverFrame: number, c: ClientLink): void {
  c.status = "preActive";
  c.lastFrame = serverFrame;
  c.lastFrameServer = serverFrame;
}

// Lag in frames: gap at the last ack, plus one per frame once the ack is overdue.
function lagFrames(serverFrame: number, c: ClientLink, dayTicks: number, frameFreq: number): number {
  let lag = c.lastFrameServer - c.lastFrame;
  const overdueAt = c.lastFrameServer + dayTicks + frameFreq;
  if (overdueAt < serverFrame) lag += serverFrame - overdueAt;
  return lag;
}

// Called once per server frame. Returns the ids to drop.
function serverFrameTick(
  serverFrame: number, clients: ClientLink[],
  maxLag: number, dayTicks: number, frameFreq: number,
): number[] {
  const dropped: number[] = [];
  for (const c of clients) {
    if (c.status === "active") {
      if (lagFrames(serverFrame, c, dayTicks, frameFreq) > maxLag) { dropped.push(c.id); continue; }
      if (c.lastFrameServer - c.lastTokenFrame >= maxLag) { dropped.push(c.id); continue; }
    }
    // preActive has its own join limit in the donor (omitted here)
    if (c.token === 0) c.token = 1 + Math.floor(Math.random() * 254);
    // send { frame: serverFrame, maxAhead: ..., token (only when newly issued) } to this client
  }
  return dropped;
}

// Client ack: `frame` is what the client reached; `token` echoes the one issued.
function onAck(serverFrame: number, frame: number, token: number, c: ClientLink, dayTicks: number): void {
  if (c.status === "preActive") {
    if (frame + dayTicks < serverFrame) return; // still too far behind
    c.status = "active";
    c.lastTokenFrame = serverFrame;
  }
  if (token === c.token) {
    c.lastTokenFrame = serverFrame;
    c.token = 0; // next frame issues a new token
  }
  c.lastFrame = frame;
  c.lastFrameServer = serverFrame;
}
```

## 5. Lands in

- Target: `src/fight/net-tick.ts` (new), the fight engine's server tick. Parity-checklist row 18 (post-K item 3: the server tick unifies loot and XP award); the frame-and-token pacing also serves row 19 (fight record/replay).
- today: peer rollback and a headless verifier already exist: `src/net/rollback.ts` (both pages run the duel, each schedules its intents `delay` ticks ahead, re-steps on a late packet), `src/net/pvp.ts` (handshake, ping, 60 Hz driver), `src/net/transport.ts` (direct WebRTC then relay) and `src/net/verify-duel.ts` (replays both pages' records). No server frame-and-token liveness or lag clock exists. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). Zone 1 steps the engine in-process through `main.ts` -> `world-combat.ts` -> `zone1.ts` -> `open-fight.ts`.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor is lockstep: the server forwards commands and every client runs the same simulation. Frankendom's ruling is one engine with server-verified kills, so the server runs the authoritative sim and ships state. The frame-and-token liveness and lag-clock pattern transfers; the command-replay model does not.
- Lockstep trusts identical clients. The sync packet detects a desync but nothing here repairs it. That conflicts with server-verified kills unless the client never decides a kill.
- A lag breach is a hard disconnect with no reconnect grace in this code. A Pit client or zone client dropping mid-fight would need a grace rule; the lichess mobile note in this batch has one.
- The thresholds are in donor game ticks. Frankendom's tick length is not stated in these notes, so `max_lag_time` and the day window cannot be copied as numbers.
- Nothing here limits attackers per target (MAX_ATTACKERS = 3) or relevance per zone; zones as data would need that layered on top.
