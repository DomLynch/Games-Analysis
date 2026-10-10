# dkfans-keeperfx (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_checksums.c` | Licence: GPL-2.0-or-later (per file headers: "version 2 of the License, or (at your option) any later version"; the repo `LICENSE` file is the GPL v2 text) | C | symbol `update_turn_checksums` (with `checksums_different`, `compare_desync_history_from_host`, and the resync gate `resync_game_allowed` in `packets.c`)

Checked: read in full: `net_checksums.c` 1-420 and 522-599 (per-turn checksum, snapshot ring, host compare, desync log); `packets.c` 120-130, 262-310, 1700-1790 and 1826-1845 (turn gate, mismatch flag, resync gate and its one caller; 1791-1825 not read); `net_game.c` 248-255 (`user_cheats_allowed`); `packets_cheats.c` 60-81 (cheat-packet entry gate); `thing_data.c` 45-48; `bflib_basics.h` 101. Not read: the body of `resync_game()` (net_resync.cpp beyond line 60), the setter of `netstate.resync_pending`, the outer loop that calls `process_packets` (one turn per call assumed from the call site only), and the callers of `packets_process_cheats` (one caller-side check only). Confidence high on the detection and compare order and on the resync gate counts; medium on what a resync does, because that body was not read. Camera cell: not applicable (`camera_scope` not set).

Best transferable idea: Each turn, both sides fold the synchronised state into one integer digest; the server compares each client's digest to its own, a missing or different digest is a mismatch, and any corrective action is rate-limited by a free-attempts count plus a cooldown.

Decision (proposed): adapt - the peer compare and the resync action assume lockstep between peers, and Frankendom is server-authoritative, so there is no second simulation to disagree with. Keep the per-turn integer digest of fight state and use it for replay checks (row 19): a stored fight record replayed through `src/fight` must give the same digest every turn, and live use only logs.
Acceptance: a server test replays a recorded 3-vs-1 fight through `src/fight` and asserts the digest of every turn matches the stored digest; changing one recorded hp value fails the test at that turn and names the turn.

## 1. Mechanism

- Once per game turn, `process_packets` (packets.c 1713-1718) calls `update_turn_checksums()` before the packet exchange. The checksum covers the synchronised game state, as summed in `update_turn_checksums` (net_checksums.c 376-393):
  - Thing lists: creatures, traps, shots, objects, effects, dead creatures, effect generators, doors are each summed (order-independent) over per-thing checksums (`compute_things_list_checksum`, 139-158; per-thing `get_thing_checksum`, 55-111). A thing in a non-synchronised class returns 0 (56-58; classes at thing_data.c 47: effect elems, ambient sound, effect).
  - Rooms: each room's checksum is folded with the rotate-XOR macro (169-174).
  - Players: each player's checksum is summed (176-181). For a player not controlled by the computer and still undecided, the dungeon camera x and y are folded in (`compute_player_checksum`, 113-126; 121-122).
  - Dig tasks: kind and coords are folded per task (182-189).
  - RNG seeds: action, AI and player seeds are added directly (190-192).
  - The packet checksum is the sum of: things total, rooms, players, dig tasks, action seed, player seed, AI seed (385-393). The game turn is stored in `checksums` (193) but is not added to the packet sum.
- The snapshot ring keeps the last 15 turns (42, 372). The detailed per-field log is built only when the network is active (285-371) and is for diagnosis, not for the decision.
- After the exchange, `checksums_different()` (205-247) makes the host packet the reference. For each present user other than the host, with a player entity, and not quitting: an empty packet is a mismatch (230-236), and a checksum different from the host's is a mismatch (238-244). It does not stop at the first mismatch and records the host turn as `desync_turn`.
- `process_packets` (1758-1771): when input-lag processing is not skipped, a mismatch sets `GSF_NetGameNoSync` and clears `GSF_NetSeedNoSync`; a clean turn clears both.
- Reaction (1834-1838): while a no-sync flag is set, and the local side is not a spectator, the host calls `resync_game_allowed()`. If it returns true, `resync_game()` runs. A client runs it only when `netstate.resync_pending` is set (body not read).
- Resync gate (279-301): if the game turn went backwards, the counters reset (286-289). The first 5 allowed calls are never cooled down: the count goes up and the cooldown is re-armed to now + 5 minutes (292-299). After 5, a call is allowed only once the cooldown has passed, and each allowed call re-arms it. `is_desync_warning_active` (271-277) returns true once the count reaches 5 while a flag is set (its only caller was not checked).
- Cheat gate (separate, `packets_cheats.c` 77-81; `net_game.c` 248-255): a cheat packet is consumed and the player is put back in dungeon control when `user_cheats_allowed(user)` is false. That function is false when the server's own cheat pref is 0 (250-251); it is true when the user is not present (252-253); otherwise it is the user's own cheat pref (254).
- Tick: one turn per `process_packets` call, lockstep between peers. Not a per-frame loop; the outer loop was not read.

## 2. Key functions

- `update_turn_checksums`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_checksums.c` 275-396. Builds the snapshot, the detail log, and the packet sum.
- `compute_checksums`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_checksums.c` 160-194. Per-category totals, RNG seeds, game turn.
- `get_thing_checksum`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_checksums.c` 55-111. Fixed field list per thing (index, class, model, owner, position, health, animation, movement, velocity), plus digger fields.
- `checksums_different`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_checksums.c` 205-247. Host-reference compare; empty or different is a mismatch.
- `resync_game_allowed`: `/mnt/frankendom-donors/dkfans-keeperfx/src/packets.c` 279-301. The gate.
- `process_packets` desync section: `/mnt/frankendom-donors/dkfans-keeperfx/src/packets.c` 1713-1771 and 1834-1838.
- `user_cheats_allowed`: `/mnt/frankendom-donors/dkfans-keeperfx/src/net_game.c` 248-255.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-field rotate-left-5 then XOR fold into one integer | Shift 5 and 27 (net_checksums.c 41) |
| Order-independent sum over a list of per-entity digests | None (sum of the per-thing values) |
| Ring of recent turn digests, looked up by turn | 15 turns (net_checksums.c 42) |
| Exact equality against the host; a missing packet is a mismatch | No tolerance (net_checksums.c 230, 238) |
| Corrective action gated by a free-attempts count, then a cooldown | 5 free attempts (packets.c 126); cooldown 5 * 60 * 1000 ms (packets.c 127) |
| Cooldown re-armed on each allowed attempt | now + cooldown (packets.c 299) |
| Gate reset when the turn goes backwards | Turn comparison (packets.c 286-289) |
| Per-user permission: server pref, then user pref, unknown user passes | Pref value 0 means off (net_game.c 250-254) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: per-entity fold, order-independent sum, one seed added, host reference with a missing packet as a mismatch, a 15-slot ring, and a gate with free attempts, cooldown re-arm and turn-reset. It omits the room, dig-task and player checksums, the per-field list, the detailed log, the millisecond clock wraparound that the donor handles with a signed difference, the spectator path, and `resync_game()` itself. The fold, ring and gate are re-expressed in clean-room form.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Digest = number; // unsigned 32-bit

// Rotate-left-5 then XOR, the same shape as the donor's per-field fold.
function fold(d: Digest, v: number): Digest {
  const rot = ((d << 5) | (d >>> 27)) >>> 0;
  return (rot ^ (v >>> 0)) >>> 0;
}

interface Entity { id: number; x: number; y: number; hp: number; }

// Per-entity fold, then an order-independent sum over the list.
function digestEntities(list: Entity[]): Digest {
  let sum = 0;
  for (const e of list) {
    let d = 0;
    d = fold(d, e.id);
    d = fold(d, e.x);
    d = fold(d, e.y);
    d = fold(d, e.hp);
    sum = (sum + d) >>> 0;
  }
  return sum;
}

interface TurnState { turn: number; entities: Entity[]; actionSeed: number; }
interface PeerPacket { turn: number; checksum: number; empty: boolean; }

// Turn checksum: entity digest plus one RNG seed. Game turn itself is not folded in.
function turnChecksum(s: TurnState): Digest {
  return (digestEntities(s.entities) + s.actionSeed) >>> 0;
}

// Host packet is the reference. A missing peer packet is a mismatch, as is any checksum that differs.
function mismatchTurn(host: PeerPacket, peers: PeerPacket[]): number | null {
  for (const p of peers) {
    if (p.empty || p.checksum !== host.checksum) return host.turn;
  }
  return null;
}

// Ring of recent turn checksums, kept so a later compare can look up the desync turn.
class DigestRing {
  private slots: { turn: number; checksum: number }[] = [];
  constructor(private readonly size = 15) {}
  push(turn: number, checksum: number): void {
    const entry = { turn, checksum };
    if (this.slots.length < this.size) this.slots.push(entry);
    else this.slots[turn % this.size] = entry;
  }
  find(turn: number): { turn: number; checksum: number } | undefined {
    return this.slots.find((s) => s.turn === turn);
  }
}

// Resync gate: the first `limit` attempts are not cooled down. After that, one attempt per cooldown window.
// Every allowed attempt re-arms the cooldown. A game turn going backwards resets the gate.
class ResyncGate {
  private attempts = 0;
  private cooldownEnd = 0;
  private lastTurn = 0;
  constructor(private readonly limit = 5, private readonly cooldownMs = 5 * 60 * 1000) {}
  allow(nowMs: number, turn: number): boolean {
    if (turn < this.lastTurn) { this.attempts = 0; this.cooldownEnd = 0; }
    this.lastTurn = turn;
    if (this.attempts >= this.limit && nowMs < this.cooldownEnd) return false;
    if (this.attempts < this.limit) this.attempts += 1;
    this.cooldownEnd = nowMs + this.cooldownMs;
    return true;
  }
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/dkfans-keeperfx-digest.ts`: passed (exit 0).

## 5. Lands in

- TARGET `src/fight/replay-digest.ts` (new, proposed): a per-turn integer digest of the fight state, with a replay check. Parity-checklist row 19 (fight record / replay). The digest is an engine function, not a client function.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 5 (server-verified: the server is the referee for the digest); 1 (one engine: the digest lives with the fight, not in a client)

## 6. Gaps and risks

- Lockstep does not fit. Frankendom is server-authoritative, so the peer compare and the host-run resync that rewinds the game have no equivalent. Only the digest and the replay check transfer. Do not port `resync_game()`; a rejected client input should get a state correction instead (not read in the donor).
- The camera is in the digest. `compute_player_checksum` folds `dungeon_camera.x` and `.y` into the player checksum (net_checksums.c 121-122), so a camera difference counts as a desync. Frankendom's camera is client-only, so the digest must exclude it; a test should fail if a camera field is added to the digest.
- Exact equality with no tolerance. The donor's positions are integer fixed-point (`mappos.x.val`, 66-68). Frankendom's digest inputs must stay integers; a float in the digest would drift between runs.
- Non-synchronised things are excluded (net_checksums.c 56-58; thing_data.c 47). Effects and ambient sound are cosmetic, so they stay out of the digest, matching the one-ledger rule: only ledger state is digested.
- The donor's cheat gate is not fail-closed for an unknown user: `user_cheats_allowed` returns true when `user_present` is false and the server allows cheats (net_game.c 252-253). Whether such a packet can reach `packets_process_cheats` was not read. Frankendom's ledger writes must reject an unknown user, not pass it.
- The desync warning (`is_desync_warning_active`, packets.c 271-277) reads the same counter that caps resyncs, so the player-facing warning and the resync cap cannot disagree. A resync storm is capped at 5 free attempts, then one per 5 minutes (packets.c 126-127). Frankendom needs the same cap on any corrective action, or a flapping digest can spam the client.
- The donor's 5-minute cooldown is tuned for a game that runs for hours. A Frankendom fight is much shorter, so a 5-minute cooldown would block any retry for the whole fight. The free-attempt cap transfers; the cooldown length must be set from fight length.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 5 (server-verified kills: the server computes the digest and the test is the referee); 1 (one engine); rules 7-9 n/a
