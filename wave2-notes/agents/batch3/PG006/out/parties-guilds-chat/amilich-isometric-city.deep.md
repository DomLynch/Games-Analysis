# amilich-isometric-city (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/multiplayer/supabaseProvider.ts` (with `src/context/MultiplayerContext.tsx`, `src/hooks/useMultiplayerSync.ts`, `src/lib/multiplayer/database.ts`) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2025 amilich) | TypeScript | symbol `MultiplayerProvider.connect`

Checked: Read in full: `supabaseProvider.ts` (330 lines), `MultiplayerContext.tsx` (281), `useMultiplayerSync.ts` (359), `database.ts` (235), `games/isocity/types/game.ts` (a 50-line read around GameState, 150-200). `CoopModal.tsx` was grep only (create and join handler lines 98 and 122-131). Searched `src` for chat, guild, friend, party, permission, role, kick and ban: no chat, guild, friend or permission code exists, only UI copy and sprite code (drawPedestrians kick animation). Not read: the Supabase Realtime library, the save worker, and whether the game state changes while paused (affects section 6). Confidence high on the join and snapshot path (read end to end); medium on the peer-to-peer behaviour, which is from reading only, not run. Camera: not applicable.

## 1. Mechanism

A room is a Supabase row plus a realtime channel. The engine is the client; there is no server-side game logic.

- **Create.** The creator makes a 5-character code (`MultiplayerContext.tsx` 26-33), joins channel `room-<CODE>` with its own peer id as the presence key (`supabaseProvider.ts` 86-91), and inserts the city snapshot as the room row (`connect`, 98-103). It sets `hasReceivedInitialState` (100), so it never takes a peer snapshot.
- **Join.** The code is uppercased (`MultiplayerContext.tsx` 150). The joiner loads the stored snapshot first (`supabaseProvider.ts` 120-129), then subscribes and tracks its presence (220-222).
- **Roster.** Presence `sync` rebuilds the player map and writes the count to the room row (135-154, count at 153). Presence `join` adds one player (155-161) but does not write the count. Presence `leave` deletes the player and rewrites the count (183-190).
- **Snapshot handshake.** On a presence `join` for someone else, every peer that holds a `gameState` sends a `state-sync` broadcast addressed to the newcomer after `Math.random() * 200` ms (166-178). The newcomer accepts the first `state-sync` that is addressed to it, not from itself, and only if it is not the creator and has no peer snapshot yet (212-215). Later replies are ignored, so the first responder wins, not the newest.
- **Live actions.** Each peer broadcasts its own action (`dispatchAction`, 233-248). A receiver applies any action whose `playerId` differs from its own (199-200). Nothing else checks the sender. `fullState` and `tick` actions from peers are ignored (`useMultiplayerSync.ts` 156-165). Placements are batched: a 100 ms window or 100 entries, whichever comes first; bulldoze is sent at once (10-11, 221-240).
- **Save path.** `updateGameState` sets `gameState` at once (253-254). The database write runs at most once per 3000 ms, with a trailing save for the rest of the window (30-31, 259-275). The hook calls `updateGameState` at most once per 2000 ms (`useMultiplayerSync.ts` 271-279). When the throttle returns early, nothing is scheduled, so the last change of a burst is pushed only when a later change arrives.
- **Role.** There is no host. `isHost` is always false (`MultiplayerContext.tsx` 260). The UI infers "host" from the absence of `initialState` (`Sidebar.tsx` 477, read by grep).

## 2. Key functions

- `MultiplayerProvider.connect`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/multiplayer/supabaseProvider.ts` 94-231. Creator and joiner branches, channel listeners, subscribe and track.
- `on('presence', { event: 'join' })`: same file, 155-182. Stagger-and-reply.
- `on('broadcast', { event: 'state-sync' })`: same file, 204-217. First-wins guard.
- `MultiplayerProvider.dispatchAction`: same file, 233-248.
- `createGameRoom`, `loadGameRoom`, `updateGameRoom`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/multiplayer/database.ts` 91-198. Compressed snapshot in one row.
- `generateRoomCode`: `/mnt/frankendom-donors/amilich-isometric-city/src/context/MultiplayerContext.tsx` 26-33. (`types.ts` has a second copy; its callers were not checked.)

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Short join code, typed by hand | 5 characters from a 32-symbol set (27, 29): 32^5 = 33,554,432 codes. No collision check; a duplicate key makes the insert fail (the schema comment at `database.ts` 6 gives the primary key; `supabaseProvider.ts` 107-109 throws). |
| Reply jitter so N peers do not answer at once | `Math.random() * 200` ms (178). First reply still wins (212). |
| Database save throttle, leading plus trailing | 3000 ms (`supabaseProvider.ts` 31; trailing delay 273). |
| Client push throttle | 2000 ms (`useMultiplayerSync.ts` 275). No trailing call. |
| Saved-index refresh | 10000 ms (282). |
| Placement batch | 100 ms window (10), 100 entries (11). |
| Room size cap | 20 MB on the compressed string (`database.ts` 49, 71). |

## 4. TypeScript sketch

simplified: the sketch keeps the code generator and the join order (stored snapshot first, then the first accepted peer snapshot; the creator never accepts one, and a peer never accepts its own). It omits the realtime channel and presence roster, the random 0-200 ms reply jitter, the lz-string compression, the 3 s save throttle, the placement batch, and the tick-based dedupe in the hook. It does not reorder anything the donor does.

```ts
// Licence: MIT (donor). Shape of the join handshake, written from the described mechanism.
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, no 0/O/1/I
const ROOM_CODE_LENGTH = 5;

export function newRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)];
  }
  return code;
}

export interface Snapshot { tick: number; state: unknown; }

export interface Joiner {
  id: string;
  isCreator: boolean;
  hasPeerSnapshot: boolean;   // set once a peer snapshot is accepted (first wins)
  snapshot: Snapshot | null;  // what the client currently holds
}

// Step 1 of a join: the stored room snapshot is the starting state (may be seconds old).
export function loadStoredSnapshot(j: Joiner, stored: Snapshot): void {
  j.snapshot = stored;
}

// Step 2: peers answer the join with a snapshot addressed to the joiner.
// Accept only if addressed to us, not from ourselves, not a creator, and no peer snapshot yet.
export function acceptPeerSnapshot(j: Joiner, msg: { to: string; from: string; snap: Snapshot }): boolean {
  if (msg.to !== j.id || msg.from === j.id) return false;
  if (j.isCreator || j.hasPeerSnapshot) return false;
  j.hasPeerSnapshot = true;
  j.snapshot = msg.snap;
  return true;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/party-room.ts` (new, only if Frankendom builds invite-code parties). The room code, roster and join snapshot would be server-held; the peer snapshot path is not carried over.
- Parity row: none fits. The join and roster are not in parity rows 1-23. The nearest row is 5 (input intake), and it covers only the placement batch (`useMultiplayerSync.ts` 10-11), which this note does not rest on.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch was written from the shape).
- Brief rule served: one ledger. The room snapshot is the only state a joiner may load; peer snapshots and peer actions are not authority.
- Best transferable idea: a short invite code plus one stored snapshot that a joiner loads once, with a first-wins guard and a creator guard, gives party join without any peer authority.
- Decision (proposed): adapt. Frankendom's party join should load only the server snapshot, with no peer state-sync and no peer actions; the code shape and the join order carry over. Why: our rulings give the server the kill and the ledger, and this donor gives the state to whoever answers first.
- Acceptance: a test joins by code, receives the server snapshot before any player action, and a second snapshot from another client is rejected while the server snapshot stands.

## 6. Gaps and risks

- **Peer authority.** Any peer can send any action with a `playerId` it chooses, and receivers apply it (`supabaseProvider.ts` 199-200; `useMultiplayerSync.ts` 99-166). No server checks it. A kill, loot or budget change sent by one client is applied as is. This breaks server-verified kills and one ledger. Do not copy the broadcast.
- **Stale joiner state.** The first snapshot can come from a peer whose state is up to about 2 s old (hook throttle at `useMultiplayerSync.ts` 275), and nothing compares snapshots. Frankendom should send a server tick and version with each snapshot.
- **Hook dedupe by tick.** The hook keys snapshots by `tick` only (`useMultiplayerSync.ts` 83-84). A peer snapshot with the same tick as the one already loaded is dropped even if the grid differs. The donor's `GameState` declares `tick` (`games/isocity/types/game.ts` 159, read; too short to receipt). Frankendom should key by a version, not a tick.
- **Trailing miss.** The 2000 ms push has no trailing call (`useMultiplayerSync.ts` 271-279). If the last change of a burst lands inside the window and nothing else changes, that state is not pushed. Whether `game.state` changes while the game is paused was not read. Frankendom should schedule a trailing push.
- **Code collision.** A duplicate code fails the insert, and `createRoom` reports an error with no retry (`supabaseProvider.ts` 102-109). Frankendom should retry with a new code or issue codes from the server.
- **Open access.** The example policy in the file's schema comment lets anyone read and write every room (`database.ts` 19). The room code is the only secret. Frankendom needs server-side auth.
- **No roles.** There is no owner, kick, ban or permission model. `isHost` is a constant false (`MultiplayerContext.tsx` 260), and the UI role is inferred from the join path (`Sidebar.tsx` 477). Party roles would have to be designed from scratch; this donor offers none.
- **Stale comment.** `useMultiplayerSync.ts` 58 says "Only the host runs the simulation tick", but there is no host and the `tick` case is empty (161-165).

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: none significant
