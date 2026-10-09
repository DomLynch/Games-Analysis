# Warzone2100-warzone2100 (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` | Licence: GPL-2 | C++ | symbol `NETsend` / `NETrecvNet` / `NETplayerDropped`

Checked: (verified at 1610, 2927, 1139; all three read in full). The pending-disconnect resolver just above `NETsend` (1585-1606) was also read.

## 1. Mechanism

- A star topology. Clients talk to the host; the host relays to the other players. The host is also a player.
- `NETsend` (1610-1724) takes a queue descriptor (broadcast to all, one player, or a temporary pre-join socket) and a message. Returns early if comms are off (1614). On the host it writes the message to each non-null connected socket in range, skipping `queue.exclude` (1643-1678). A write error is logged and, for non-temporary queues, the player is added to `netSendPendingDisconnectPlayerIndexes` (1674); that set is consumed in a separate function (1585-1606) that logs and calls `NETplayerClientsDisconnect`. On a client sending to the host, it writes to the host socket only if the host is alive, and a write error calls `NETclientHandleHostDisconnected` (1681-1708). A client sending to any other player wraps the message in `NET_SEND_TO_PLAYER` and asks the host to relay it (1711-1721).
- `NETrecvNet` (2927-3009) is called by the game loop and returns true when there is a non-system message for the caller. On the host it first fixes the player count, accepts incoming connections, admits joiners, runs the lobby handler and checks players are alive (2939-2949). It polls the readable sockets with a zero timeout (`NET_READ_TIMEOUT` = 0 ms, line 103; 2952), then for each slot reads into a fixed buffer and appends bytes to that player's queue (`NETinsertRawData`, 2959-2978). A slot that returns no data and whose socket pointer has been cleared is a dropped player: the host calls `NETplayerDropped` and nulls the slot (2979-2990). Finally it walks all queues; system messages are handled inside (`NETprocessSystemMessage`), and the first message it cannot handle is returned to the caller (2994-3006).
- `NETplayerDropped` (1139-1173), host only: counts the drop (`sync_counter.drops++`), does the leave cleanup (`MultiPlayerLeave`) for every drop, and marks the connection status as dropped (1172). Only while the game has not started yet (`ingame.localJoiningInProgress`, 1155) does it also broadcast `NET_PLAYER_DROPPED`, clear the slot, reset ready status for everyone unless the dropped player was a spectator, and re-check the ready state (1155-1170). After the game starts there is no broadcast here.
- Inputs: outgoing messages and sockets. Outputs: per-player inbound queues, relayed messages, drop notices.
- Tick: once per netplay poll in the game loop. The game-state sim is not in these functions; they move messages only.

## 2. Key functions

- `NETsend`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` lines 1610-1724. Queue dispatch, host fan-out, write-error bookkeeping, client send to host.
- `NETrecvNet`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` lines 2927-3009. Host admission and checks, socket poll, per-player buffering, drop detection.
- `NETplayerDropped`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` lines 1139-1173. Host-only drop cleanup; the broadcast and ready-state recheck run only pre-start.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Host-authoritative relay: clients send to the host, the host fans out | `MAX_CONNECTED_PLAYERS` = player slots + spectator slots (theirs, nettypes.h 51) |
| Queue descriptor: all, one, or pre-join | queue type enum (theirs) |
| Write errors marked and resolved later, never mid-loop | pending-disconnect set (theirs) |
| Per-player inbound byte queue, parsed by type | `NET_BUFFER_SIZE` = `MaxMsgSize * 8`, about 256K (theirs, netplay.cpp 112) |
| Poll with a timeout, then process | `NET_READ_TIMEOUT` = 0 ms, so the poll never blocks (theirs, netplay.cpp 103) |
| Drop = socket cleared, announced once by the host | drop message type (theirs) |

## 4. TypeScript sketch

simplified: the sketch omits the client-to-host-to-player relay (`NET_SEND_TO_PLAYER`), temporary pre-join sockets, the zero-timeout poll, the system-message handling in `NETrecvNet`, the ready-state reset on a pre-start drop, `MultiPlayerLeave`, and compression and stats. The notice excludes the dropped peer, which the donor does by clearing the slot.

```ts
// Licence: GPL-2 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Msg { type: number; body: string; }
interface Peer { id: number; alive: boolean; outbox: Msg[]; inbox: Msg[]; pendingDrop: boolean; }

// Host relay: deliver to one peer or to all, skipping the sender and dead peers.
function relay(peers: Peer[], msg: Msg, to: number | "all", exclude?: number): void {
  for (const p of peers) {
    if (to !== "all" && p.id !== to) continue;
    if (p.id === exclude || !p.alive) continue;
    if (!send(p, msg)) p.pendingDrop = true; // record now, resolve at a safe point
  }
}

// One write. A failure is reported to the caller, not acted on here.
function send(p: Peer, msg: Msg): boolean {
  if (!p.alive) return false;
  p.outbox.push(msg); // stand-in for the socket write
  return true;
}

// Host only: a closed socket is a drop; before the match starts, announce it once to everyone else.
function dropPeer(peers: Peer[], id: number, preStart: boolean): void {
  const p = peers.find(x => x.id === id);
  if (!p || !p.alive) return;
  p.alive = false;
  // The notice goes out only while the match has not started (lobby phase); in-match drops are handled elsewhere.
  if (preStart) relay(peers, { type: 255, body: String(id) }, "all", id); // drop notice
}

// At a safe point: resolve every pending write failure.
function resolvePending(peers: Peer[], preStart: boolean): void {
  for (const p of peers) {
    if (p.pendingDrop) { p.pendingDrop = false; dropPeer(peers, p.id, preStart); }
  }
}
```

## 5. Lands in

- TARGET `src/fight/relay.ts` (new), the host relay under the fight engine. Parity-checklist row 18 (post-K item 3: server tick). Frankendom's server verifies and fans out results to clients of the one engine; a relay between clients is not needed for the Pit.
- today: no host relay module in `src/`; the relay is a script, `scripts/duel-relay.mjs`, used as the fallback path by `src/net/transport.ts`, and it caps a room's rate (per `pvp.ts` and `reconnect-policy.ts` comments). (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The host process is also a player (`NetPlay.hostPlayer`, listen-server model; 1681 and 2963). Who owns the game outcome is decided in handlers that were not read. If the host client held kill authority it would conflict with server-verified kills.
- The lockstep or state model is not in these functions. Only message transport is. Whether the game messages are commands (lockstep) or state is not read here.
- Drop handling is at the transport layer; there is no reconnect or grace period in these functions. A drop mid-match only marks the connection status (1172); Frankendom's one ledger needs an explicit rule for an in-flight fight.
- No validation of message contents happens in `NETsend` or `NETrecvNet`. Validation, if any, sits in the handlers that were not read.
