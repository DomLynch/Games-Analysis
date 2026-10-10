# hedgewars-hw (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/handlers/inroom.rs` (EngineMessage arm of `handle`, lines 411-436) | Licence: GPL-2.0 (repo-root `COPYING`, GNU GPL version 2 text; no per-file licence header found in `rust/hedgewars-server/src`) | Rust | symbol `handle`

Checked: The list hint `server/haskell.rs` is the WRONG file: it is a nom parser and printer for Haskell-style values (`HaskellValue`, line 18), not netcode. The real path is `handle` in `handlers/inroom.rs`, arm `EngineMessage` (411-436), with helpers `is_msg_valid` (55-68), `is_msg_empty` (70-72), `is_msg_timed` (74-78), `ByMsg::next` (36-44), `HwRoom::mark_left_teams` (`core/room.rs` 68-82), `HwRoomControl::leave_game` (`core/server.rs` 1103-1120), `HwRoomControl::log_engine_msg` (`core/server.rs` 1163-1171), late-joiner replay (`handlers/common.rs` 196-232), idle timeout (`server/network.rs` 28-34 and 160-200, `protocol.rs` 100-125). Files opened for this note: all seven of those, plus `rust/hedgewars-network-protocol/src/types.rs` line 3 and `COPYING` line 2. Grep for `tick|timeout|sleep|interval` over `rust/hedgewars-server/src` found only timeouts: the server has NO fixed-step tick loop. Confidence: high on the server-side relay path (read end to end). Not read: the engine (the simulation that builds the batches and gives the `+` message its meaning), and the client side. So the time meaning of the sync marker is unverified. Camera: not applicable. Category: server-tick-netcode.

Best transferable idea: The server does not simulate; it validates each client batch by message type and unit ownership, relays only the valid messages, and appends the non-empty ones to an ordered replay log that a late joiner receives in full.

Decision (proposed): adapt - keep the intake gate (type whitelist, unit-to-owner check, invalid dropped and never relayed) and the ordered append-only fight log for replay; reject the raw relay of engine batches to clients, because Frankendom's server is the only authority and clients must not apply each other's inputs.
Acceptance: a server test sends a hit for a character the sending client does not own and asserts it is dropped (not broadcast, not logged); a second test replays the fight log to a late joiner and asserts the same final HP for every character.

## 1. Mechanism

- Not a tick loop. Input arrives as one `EngineMessage`: a batch of length-prefixed messages from one client, base64-wrapped. The order of steps in the arm (`handlers/inroom.rs` 411-436):
  (a) Gate: nothing happens unless the client has teams in game (412).
  (b) Decode the base64 and split the batch by each message's length byte (413; `ByMsg::next`, 38).
  (c) Validate each message (`is_msg_valid`, 55-68). The type byte must be in the whitelist string (51-52). For type `h` the body must start with a unit index 1 to 8 and then a team index, and that team must be one the client owns (60-61). Any other whitelisted type passes; the owner check is applied only to `h` (63).
  (d) Relay the valid messages to the other clients in the room, not back to the sender (425-431, `but_self`).
  (e) Log: the non-empty valid messages are re-encoded and appended to the room's ordered `msg_log` (434; `log_engine_msg` pushes them first, `core/server.rs` 1164-1167). Empty messages (type `+`, `is_msg_empty`) are never logged.
  (f) Sync marker: if the batch had any timed message (not in `M#hb`, lines 53 and 76), the last timed message is kept as `sync_msg` only when it was empty; if the last timed message was not empty, the stored marker is cleared (417-422; `core/server.rs` 1168-1169).
- Team leave: `leave_game` (`core/server.rs` 1103-1116) calls `mark_left_teams`. That first pushes the stored sync marker into the log, then appends one `F<team name>` removal message per team (`core/room.rs` 72-81). The removal therefore sits at the last sync point in the log.
- Late join: the joiner gets `e$spectate 1`, then the whole `msg_log` in order, then team and pause state (`handlers/common.rs` 196-232; the log is chained at 212).
- Idle timeout: `PING_TIMEOUT` is 15 s (`server/network.rs` 31), used as the read timeout. It applies (`protocol.rs` 113-115) only when no complete message is already buffered. On timeout the server sends `Bye` with "Ping timeout" (`server/network.rs` 194-195).

## 2. Key functions

- `handle`, arm `EngineMessage`: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/handlers/inroom.rs` 411-436. The whole intake path, from gate to log.
- `is_msg_valid`: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/handlers/inroom.rs` 55-68. Whitelist plus unit-owner check. Its only caller read is the EngineMessage arm (417, 425).
- `is_msg_empty` and `is_msg_timed`: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/handlers/inroom.rs` 70-78.
- `mark_left_teams`: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/core/room.rs` 68-82. Flushes the sync marker, then appends removal messages. Callers read: `leave_game` (`core/server.rs` 1115) and one more call at `core/server.rs` 689, read in the 680-692 range only; the rest of that function was not read.
- `log_engine_msg`: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/core/server.rs` 1163-1171.
- Late-joiner replay: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/handlers/common.rs` 196-232.
- Idle timeout: `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/server/network.rs` 31 and 194-195; `/mnt/frankendom-donors/hedgewars-hw/rust/hedgewars-server/src/protocol.rs` 113-115.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Whitelist of message types; anything else is dropped | The type string (`VALID_MESSAGES`, `inroom.rs` 51-52); non-timed set `M#hb` (53) |
| Unit-owner check: unit index in range and team owned by the sender | `MAX_HEDGEHOGS_PER_TEAM` = 8 (`hedgewars-network-protocol/src/types.rs` 3). Not Frankendom's MAX_ATTACKERS = 3; do not copy |
| Idle read timeout, drop the client with a reason | `PING_TIMEOUT` = 15 s (`server/network.rs` 31) |
| Sync marker: keep the last timed message only if empty | Rule only (no number) |
| Log order: non-empty messages first, then the sync marker | Rule only (`core/server.rs` 1166-1169) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (gate, validate, relay, log, then the sync marker) and the owner check for type `h` only, as in the donor. It omits the length-byte framing, the base64 wrapping and the donor's `unwrap` and `split_at` panic paths, the literal whitelist (passed in as data here, including the 0x80-0x8A types), the `but_self` routing, and the team-leave path beyond the log order in `onTeamLeft`. The donor's `+` meaning is not read, so `empty` is an input flag, not a claim about what the engine means.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface EngineMsg {
  type: string;        // one-character message type
  hedgehog?: number;   // unit index for 'h' messages
  team?: number;       // team index that owns the unit
  empty: boolean;      // empty message (type '+' in the donor)
  timed: boolean;      // true unless the type is in the non-timed set
  raw: string;         // encoded message, kept for relay and log
}

export interface FightLog {
  entries: string[];   // ordered, append-only replay log
  sync: string | null; // last timed message of the latest batch, only if it was empty
}

const MAX_UNITS_PER_TEAM = 8; // donor constant, passed here as data

export function isValid(m: EngineMsg, allowed: ReadonlySet<string>, ownedTeams: ReadonlySet<number>): boolean {
  if (!allowed.has(m.type)) return false;
  if (m.type === "h") {
    return (
      m.hedgehog !== undefined &&
      m.hedgehog >= 1 &&
      m.hedgehog <= MAX_UNITS_PER_TEAM &&
      m.team !== undefined &&
      ownedTeams.has(m.team)
    );
  }
  return true;
}

export function ingestBatch(
  batch: EngineMsg[],
  inGame: boolean,
  allowed: ReadonlySet<string>,
  ownedTeams: ReadonlySet<number>,
  log: FightLog,
  relay: (msgs: EngineMsg[]) => void,
): void {
  if (!inGame) return;
  const valid = batch.filter((m) => isValid(m, allowed, ownedTeams));
  if (valid.length > 0) relay(valid);
  for (const m of valid) {
    if (!m.empty) log.entries.push(m.raw);
  }
  const timed = valid.filter((m) => m.timed);
  if (timed.length > 0) {
    const last = timed[timed.length - 1];
    log.sync = last.empty ? last.raw : null;
  }
}

export function onTeamLeft(log: FightLog, teamName: string): void {
  if (log.sync !== null) {
    log.entries.push(log.sync);
    log.sync = null;
  }
  log.entries.push("F" + teamName);
}
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module: input intake gate and the ordered fight log, engine side). Parity-checklist row 18 (loot roll and XP award; the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget"). This donor covers only the intake and the log of that sub-line; it has no fixed-step tick.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine, server-verified kills; intake validated on the server); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0 with no per-file header found: clean-room only. The sketch is written from the mechanism.
- The donor relays raw engine batches so clients act on each other's input. That makes the clients part of the authority. Reject for Frankendom: the server computes HP and kills, and clients receive results only.
- The owner check covers only type `h` (`inroom.rs` 60-63). Other whitelisted types, including the key and action types, pass with no check of whose turn or whose unit it is, in the lines read. The engine may gate them; that was not read. Frankendom must check the owning character and the current fight step on every intake message.
- Panics on malformed input: `decode(&em[..]).unwrap()` (`inroom.rs` 413) and `split_at(*size as usize + 1)` (38), which panics if the length byte runs past the buffer. Reads as written; not tested. Frankendom's intake must return a parse error, never panic.
- The late-join replay sends the whole log from match start, with no snapshot (`handlers/common.rs` 212). Fine for a short match; a zone-wide log needs a cap or a snapshot. Size not measured.
- The sync marker's meaning in time depends on the engine's `+` message, which was not read. This note does not claim what it marks.
- No tick loop in the server, so this donor gives no guidance on a fixed-step server tick or a per-tick NPC budget. Those need another donor.
- The unit count (8 per team) is a donor number. Frankendom's MAX_ATTACKERS = 3 governs; do not copy 8.
