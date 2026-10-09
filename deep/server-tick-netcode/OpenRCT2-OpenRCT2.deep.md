# OpenRCT2-OpenRCT2 (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` | Licence: GPL-3.0 | C++ | symbol `NetworkBase::Tick / TickServer / TickClient`

Checked: Symbol `NetworkBase::Tick` at 480-511, `TickServer` 540-579, `TickClient` 586-708, `CheckDesynchronizaton` 883-910, `ProcessConnection` 1799-1850, `DecayCooldown` 219-232, `CheckSRAND` 844-876, all read in full.

## 1. Mechanism

- A TCP client-server game. The server is authoritative for the game state; clients send commands; the server relays commands and state to clients; each client checks that its simulation matches the server's random state.
- `Tick` (480-511) is the entry point, called from the platform's update. It keeps its own delta time (never less than 1 ms), dispatches to the server or client tick, and then performs any close that was requested during the tick.
- `TickServer` (540-579): for each valid connection, process its inbound packets (`ProcessConnection`); a connection that fails is disconnected; a healthy one has its player's command cooldowns reduced by the elapsed milliseconds, with expired entries erased (`DecayCooldown`, 219-232). When more than 3000 ms have passed since the last ping, the server sends a ping and a ping list (562-567); `last_ping_sent_time` is set in the ping send (line 1649, not read in full). The advertiser is updated, and any new TCP connection is accepted and added.
- `TickClient` (586-708) has two live states. While `connecting`, it switches on the socket status: resolving and connecting each show a status window once (598-627); connected sets status to `connected`, sends the token and shows an authenticating window (630-641); any other status closes and shows an error (643-655). While `connected`, it calls `ProcessConnection`; on failure it shows a disconnect message (or only closes the status window if a password prompt was cancelled) and closes (661-691); otherwise it sends a client heartbeat every 3000 ms (694-699). Later states (map loading) are handled in packet handlers, not read here.
- Desync check (`CheckDesynchronizaton`, 883-910, client only, skipped once already desynced): `CheckSRAND` (844-876) compares the client's first scenario RNG word at the current tick with the value the server stored for that tick; it passes trivially until the map is loaded or if no server data exists for that tick, erases the stored entry, and also compares an entity checksum when the server sent one. On mismatch: status becomes desynced, `desyncTick` is recorded, a message is shown, and the connection is closed unless `stayConnected` is set. Requesting a snapshot is a separate call (`RequestStateSnapshot`, 912-917, not called from the check).
- Tick: network ticks are per platform update; the game's own tick is separate. The check uses the game's tick count.

## 2. Key functions

- `NetworkBase::Tick`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 480-511. Delta time, mode dispatch, deferred close and reconnect.
- `NetworkBase::TickServer`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 540-579. Per-connection packet processing, disconnect on failure, cooldown decay, pings, advertising, accept.
- `NetworkBase::TickClient`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 586-708 (connecting and connected states; read in full).
- `NetworkBase::CheckDesynchronizaton`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 883-910. Client-side random-state check per game tick; enters the desynced state and asks for a snapshot.
- `NetworkBase::DecayCooldown`: same file 219-232. Per-player cooldown map decremented by elapsed ms.
- `NetworkBase::ProcessConnection`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 1799-1850 (read in full). Reads up to `kMaxPacketsPerTick` = 100 packets (line 65) per call; a disconnect or an invalid connection after a packet returns false (1810-1824), and so does `receivedDataRecently` failing (1836-1847; the timeout is 40 s, NetworkConnection.cpp 26).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Server owns the state; clients send commands; desync is a check against the server's random state | Random state word (theirs, the scenario RNG) |
| Desync is a state, not a crash: mark, notify, ask for a snapshot | Message text and status window (theirs) |
| Per-connection processing with cooldown decay per player | Cooldown decays by elapsed ms (theirs, 226) |
| Heartbeat ping | 3000 ms interval (theirs, 563 and 695) |
| Per-tick packet cap and silence timeout | 100 packets (theirs, line 65); 40 s no-data timeout (theirs, NetworkConnection.cpp 26) |
| Delta time never zero | 1 ms minimum (mechanism) |

## 4. TypeScript sketch

simplified: omits the ping and ping list, the advertiser, accepting new sockets, the per-tick packet cap (100), the 40 s silence timeout, the entity-checksum comparison, the "map not loaded" and "no data for this tick" passes, and the client state machine. Cooldown here drops by a fixed 1 per tick instead of by elapsed milliseconds.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Conn { id: number; alive: boolean; cooldown: number; inbound: string[]; }
type Desync = { tick: number } | null;

// One server network tick: process each live connection, decay cooldowns, drop the failed ones.
function serverNetTick(conns: Conn[], process: (c: Conn) => boolean): Conn[] {
  return conns.filter(c => {
    if (!c.alive) return false;
    const ok = process(c);
    if (!ok) { c.alive = false; return false; }
    c.cooldown = Math.max(0, c.cooldown - 1);
    return true;
  });
}

// Client desync check: compare this client's random state with the server's for the same tick.
function checkDesync(state: Desync, tick: number, mine: number, server: number): Desync {
  if (state) return state;                 // already desynced; do not repeat
  if (mine === server) return null;
  return { tick };                         // mark, then ask for a snapshot for this tick
}
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new): per-connection read with a per-tick packet cap, disconnect on bad input or silence, cooldown decay per player. Parity-checklist row 5 (controls / input intake). The desync check is a client-side state, not a tick rule.
- The desync check fits fight record and replay: TARGET `src/fight/record.ts`, parity-checklist row 19 (post-K item 3). Use it for a determinism check on the fight snapshot, not as a play rule.
- today: `src/record.ts` (moving); `src/net/verify-duel.ts` already requires each page's record to replay to its reported hash, and `src/net/pvp.ts` has a `desync` message kind. No server intake module exists. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: adapt (the server-authority shape fits; the connection layer does not)
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only.
- The donor is a TCP session game with a live simulation on each client. Frankendom's fight is server-verified, with a Supabase and HTTP path, not a live socket. The connection state machine does not transfer.
- The desync check is a random-state word compared once per tick. It catches divergence only if the client runs the same simulation. The Pit is a client of the one engine; a desync check makes sense only if a client runs the engine, and then the server verdict still decides the kill.
- The desync response closes the connection unless a setting says otherwise. Frankendom must not close a player's fight on a client-side mismatch; the server verdict stands.
- The 3-second ping and the cooldown decay are per-connection timing choices with no Frankendom number to copy.
- `ProcessPacket` handlers, `ServerSendPing` and the snapshot request handlers were not read. The cooldown map is per player; Frankendom's one ledger would hold cooldowns server-side per character.
