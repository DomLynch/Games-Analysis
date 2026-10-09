# OpenRA-OpenRA (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` | Licence: GPL-3.0-or-later per OrderManager.cs header | C# | symbol `OrderManager.TryTick / ReceiveSync / ReceiveOrders`

Checked: Symbol `TryTick` at 300, closes at 328 (verified). `ReceiveSync` 161-170, `ReceiveOrders` 189-195, `SendOrders` 224-232, `ProcessOrders` 234-285 all read.

## 1. Mechanism

- A lockstep game: every client runs the same simulation, and the only input is the orders each client sends. Inputs per client: a queue of order packets, each tagged with the frame it is for. Output: on each net frame the simulation advances only when every client's packet is present; the orders are applied in the iteration order of the `pendingOrders` dictionary (whether that order is the same on every peer was not checked).
- Each host frame, `TryTick` (300-328). `IsNetFrame` is `LocalFrameNumber % NetFrameInterval == 0` (332; default 3, Session.cs 222). On a non-net frame it always ticks and just increments `LocalFrameNumber` (324-325). On a net frame it first checks that every client other than the local one has a packet queued (308); if so it calls `SendOrders` (313), which sends the local orders once per net frame, guarded by `sentOrdersFrame` and the game-save marker (226-231). It then requires `IsReadyForNextFrame` (every queue non-empty, game started, 202) before `ProcessOrders` (319-321). `ProcessOrders` dequeues one packet per client, throws if the packet's frame is not `NetFrameNumber` (244-245), handles a disconnect marker by queueing removal and calling `World.OnClientDisconnected` (247-253), applies each order (255-259), removes disconnected clients (262-263), sends the sync hash plus a defeat-state bitmask when `NetFrameNumber >= GameSaveLastSyncFrame`, otherwise a zero hash and zero state (265-275), and increments `NetFrameNumber` (284).
- `ReceiveOrders` (189) enqueues a client's packet; an unknown client throws. `ReceiveSync` (161) keeps the first hash and defeat state seen for a frame; a later report with a different value for the same frame calls `OutOfSync` (163-169).
- A client whose packet is late stalls the whole game at the next net frame (no tick), which is the lockstep cost.
- Tick: called every host frame; on net frames the simulation runs only if the readiness check passes. `SuggestedTimestep` (204-222, replay and game-save speed) and `ReceiveAllOrdersAndCheckSync` (197-200, which calls `Connection.Receive`) were read but are not modelled.

## 2. Key functions

- `OrderManager.TryTick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 300-328. Readiness check, send, process, advance the frame.
- `OrderManager.ReceiveSync`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 161-170. Compares the sync hash and defeat state per frame.
- `OrderManager.ReceiveOrders`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 189-195. Queues a client's packet for its frame.
- `OrderManager.SendOrders`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 224-232. Sends the local orders once per frame, marked with the frame number.
- `OrderManager.ProcessOrders`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 234-285. Dequeues one packet per client, checks the frame, applies orders, removes disconnected clients.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lockstep: tick only when every input for the frame has arrived | Readiness rule (mechanism) |
| Batch inputs over a net interval | `NetFrameInterval` (theirs, lobby setting, default 3, Session.cs 222) |
| Per-frame sync hash compared across peers; mismatch is a hard stop | Hash and defeat state values (theirs; defeat state is a 64-bit mask, 267-270) |
| Frame check on each dequeued packet, crash early on a mismatch | Rule (mechanism) |

## 4. TypeScript sketch

simplified: omits the net-frame interval (every host frame is treated as a net frame), the separate pre-check that excludes the local peer, `SendOrders`, the disconnect marker, the sync send and the frame-number increments; the sketch also omits the game-save and replay branches, the `GameStarted` test in the readiness check, and the defeat-state half of the sync comparison (`checkSync` compares the hash only and returns a flag instead of calling `OutOfSync`).

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Packet { frame: number; orders: string[]; }
interface Peer { id: number; queue: Packet[]; }

// Tick only when every peer has a packet for this frame; then apply in a fixed peer order.
function tryTick(frame: number, peers: Peer[], apply: (peer: number, orders: string[]) => void): boolean {
  if (!peers.every(p => p.queue.length > 0)) return false;     // a late peer stalls the game
  for (const p of peers) {
    const pkt = p.queue.shift()!;
    if (pkt.frame !== frame) throw new Error(`peer ${p.id}: frame ${pkt.frame} on ${frame}`);
    apply(p.id, pkt.orders);
  }
  return true;
}

// Sync check: every peer's hash for a frame must match the first one seen.
function checkSync(seen: Map<number, number>, frame: number, hash: number): boolean {
  const prev = seen.get(frame);
  if (prev === undefined) { seen.set(frame, hash); return true; }
  return prev === hash;
}
```

## 5. Lands in

- No Frankendom module is proposed for the lockstep input queue. The lockstep model conflicts with the server-verified rule (see gaps).
- The sync-hash comparison fits the fight record and replay work: TARGET `src/fight/record.ts` (digest check for determinism, not for play). Parity-checklist row 19 (fight record / replay; post-K item 3).
- today: `src/record.ts` (moving) holds the fight record; `src/net/verify-duel.ts` already compares hashes from both pages' records and `src/net/fixture.ts` folds a fingerprint chain for cross-engine determinism. The lockstep queue has no module (rollback is `src/net/rollback.ts`). (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea (the digest check only)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Conflict with a Frankendom ruling. Lockstep means every client runs the sim and the orders are the input. Frankendom's rule is that the engine is the whole fight and kills are server-verified; in a lockstep game the server does not own the outcome, each client does. This model cannot be used for the Pit client or for zones without breaking server-verified kills.
- A late client stalls every other client. A Pit duel is one player against the server's engine; a stall would be a visible freeze, not a fair pause.
- The order queue and the frame-number check solve a problem Frankendom does not have (peer input pacing). The frame check is useful; the queue is not.
- Desync detection by sync hash is the useful part. It needs a deterministic engine (one engine, per ruling); the donor's `World.SyncHash` (called at 272) was not read, so how it is computed is unknown here.
- `ProcessOrders` removes disconnected clients and calls a world hook mid-tick. Frankendom's disconnect rule (server ledger, one character per account) is different; do not copy the hook.
