# OpenBW-openbw (determinism-replay, cell 2)

Donor: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` | Licence: unclear (no LICENSE or COPYING file in the donor folder; README.md is one line pointing to another repo; the only licence text in the box is `deps/asio/LICENSE_1_0.txt`, Boost, for asio; no licence header in the files opened) | C++ | symbols `sync_functions::sync`, `syncer_t::update_insync_hash`, `syncer_t::process_messages`, `syncer_t::kill_client`, `lcg_rand`, `replay_functions::load_replay`, `replay_saver_functions::add_action`

Checked: Opened: `sync.h` 18-530 and 575-1010 (lines 530-575 are unit-message senders, not read; 1010-1147 only by grep for function names); `sync_server_asio_socket.h` 155-242 plus grep; `replay.h` 108-130 and 185-240 plus grep (no hash or insync match); `replay_saver.h` lines 521, 544-550, 574-577 only (grep and line reads; the rest of the 657-line file not read); `bwgame.h` 237-239, 290-291, 2012-2018, 13088-13130, 13191-13204, 22373-22376 plus grep. Not read: the body of `update_units` and the rest of the unit logic; the record layout of each replay action after `replay_saver.h` 549; the layout of `hidden_units` membership; the tcp, local and posix transports; the pre-game branch of `sync` (968-985) only by a quick read. Confidence: high on the input latency, the wait gate, the RNG, the hash and the replay path; medium on the player-left path (read in the functions themselves; the transport was not traced end to end). Short numeric lines are cited by line and not receipted where the verifier needs 15-90 characters.

## 1. Mechanism

- Input-delay lockstep with a wait gate. Each tick the syncer first waits until every client's reported frame is within `latency` of the host's frame (`sync.h` 949-956 `all_clients_in_sync`, the wait at 987). Then it applies the actions due for this frame (995). Then the simulation advances one frame (`sync_functions::next_frame`, 210-213: `sync(server)` then `action_functions::next_frame()`).
- Latency: an action a client sends is scheduled at `client->frame + latency` (279; latency 2 at 25). It runs when the 8-bit sync frame equals that value (195). Every client reports its frame each sync frame (605-610; received at 380). The wait therefore keeps all clients within the latency window.
- Input buffer: each client has a byte buffer that grows by 1.5x (232-233) up to a cap of `1024 * 4 * latency` (231 = 8192 bytes at latency 2). When the grown size would reach the cap (`new_size >= max_size`) the action is rejected (240), so the usable size is just under 8192. Dead code: an unused hex string is built per byte (278).
- Join and start: a join is refused once the game has started or is counting down (580-582). Clients are kept sorted by uid while waiting (421-423). Start: the host draws eight words from `uid_t::generate()` and XORs them into one 32-bit seed (509-513). The countdown is 10 sync frames (915) and the start seed comes from the message (916). On start, every peer sets `lcg_rand_state = seed XOR crc32(concatenated client uid strings)` (685-690). Clients are then sorted by slot and uid (747-750). Slot shuffle and race choice draw from the same LCG with fixed source ids (727 source 33; 701 source 144).
- RNG: one shared state. `lcg_rand(source)` steps `state = state * 22695477 + 1` (uint32) and returns `(state >> 16) & 0x7fff` (`bwgame.h` 13197-13201). Ranged draws scale the 15-bit value into `[from, to]` (13203-13204). `source` is only a counter index: each call bumps `random_counts[source]` (13198; an array of 256, 237). Every draw site advances the same state.
- Frame step: `next_frame` increments `current_frame` (13192), runs `process_frame` (13193), then `process_triggers` (13194). `process_frame` runs `recede_creep`, a tile-visibility refresh every 100 frames (13091-13093), then `update_units`, `update_bullets`, `update_thingies` (13101-13103). Per-trigger wait timers subtract a step of 42 each frame (13107-13118); the global trigger timer reloads to 30 when it reaches zero (13122-13126).
- Insync hash: every 32 sync frames (943-944) the syncer computes FNV-1a (626-629) over: successful and failed action counts (631-632), the LCG state (633), minerals, gas and totals (634-637), active order, bullet and thingy counts (638-640), and for each unit in `visible_units` its shield plus hp and exact x and y (641-645). The value goes into a ring of four (110; 647-649). The check message carries the ring index and the value (652-659).
- Peer compare (not host-only): the check message is a scheduled action, and the `execute_scheduled_actions` lambda inside `process_messages` (795-800) runs on EVERY peer for every other client's check. Each peer reads the index and value, compares with its own ring entry (`.at(index)`, 798; throws if index >= 4) and on a mismatch kills the sender locally (799). So the kick is symmetric and local per peer; whether the others also drop that client depends on each peer's own hash.
- Stall kick: `timeout_func` runs every second (961, 611-622). It kills a client that has not been synced for 60 s (616) and whose frame lags the host by at least the latency (617). Each completed sync stamps every client's `last_synced` (990-993).
- Replay write: the host records each action before applying it (833-837, 836 `add_action`). `replay_saver` groups actions under a frame header (544-549) and starts a new block when the frame changes or the block would reach 256 bytes (546). Actions of 256 bytes or more are an error (550). The seed written is the start-game LCG state (759; written at 577). The frame count is written at 574.
- Replay read: `load_replay` checks the identifier (108), reads a 633-byte game-info block (110), takes the frame count (116) and the seed (119), and sets the LCG from the seed inside the map-load callback (221). The action stream is read with a 32-bit length (196-197). `next_frame` runs the recorded actions for the frame, then one simulation frame (229-232). `replay.h` has no hash or checksum compare.
- Player leave: a voluntary leave is a left action (opcode 87, value 0) sent through the normal path (458-459, 672). A kill by the server builds the same action with value 6 (459). `kill_client` records it and applies it at once at `st.current_frame` (466-469). No send is made in that function. The socket transport clears `on_kill` before a server-side close (215-218) and calls `on_kill` only on a read or write error (164, 238).

Numbers: latency 2 ticks (25); buffer cap 8192 bytes at latency 2 (231); checkpoint interval 32 ticks (943); ring of 4 values (110); start countdown 10 sync frames (915); stall kick 60 s (616); sync wait timer 1 s (961); trigger timer step 42 and reload 30 (13107, 13126); tile refresh 100 frames (13091).

## 2. Key functions

- `syncer_t::all_clients_in_sync` and `sync_functions::sync`: `/mnt/frankendom-donors/OpenBW-openbw/sync.h` 949-956 and 958-996. Wait gate, then apply due actions.
- `syncer_t::send_client_frame` and `recv`: same file, 605-610 and 375-435. Client frame reports and the uid join path.
- `syncer_t::update_insync_hash` and `send_insync_check`: same file, 625-659. The 32-frame checkpoint.
- `syncer_t::process_messages` (peer compare at 795-800, run by every peer; actions and kicks at 787-853).
- `syncer_t::kill_client`: same file, 463-484.
- `syncer_t::start_game`: same file, 685-776. Seed, slot shuffle, replay header fields.
- `lcg_rand`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 13197-13204.
- `replay_functions::load_replay` and `next_frame`: `/mnt/frankendom-donors/OpenBW-openbw/replay.h` 108-232.
- `replay_saver_functions::add_action`: `/mnt/frankendom-donors/OpenBW-openbw/replay_saver.h` 544-561 (only the first lines read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Input delay: an input sent now applies at tick + latency | latency 2 (sync.h 25) |
| Per-client input buffer that grows 1.5x to a hard cap, then rejects | cap 1024 * 4 * latency bytes (sync.h 231); grow 232-233; reject at 240 |
| Wait gate: advance only when every client is within latency | distance test with signed 8-bit frames (sync.h 951) |
| Checkpoint hash every N ticks, ring of K values, check by index | N = 32 (943), K = 4 (110) |
| FNV-1a fold over state words | offset 2166136261 and prime 16777619 (626, 629) |
| One LCG draw: state * a + c, output bits 16-30, ranged scale | 22695477, +1, mask 0x7fff (bwgame.h 13200-13204) |
| Seed = host seed XOR CRC of the client uid strings, in list order | crc32 of concatenated uid strings (sync.h 687-689) |
| Stall kick after no sync and lag >= latency | 60 s (616) |
| Start countdown in ticks | 10 (915) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (apply due inputs in owner order, do the frame's work, advance, checkpoint on the interval) and the replay check (rebuild from the seed, re-run recorded inputs, name the first recorded checkpoint that differs). It changes three things on purpose: eight named RNG streams instead of one shared LCG (donor defect), a checkpoint hash over all units, hidden ones included, in id order (donor walks only `visible_units`), and tick numbers without the donor's 8-bit wrap. It omits the join and handshake, the slot shuffle, the race draw, the transport, the 4-entry ring (the sketch keeps every checkpoint so a replay can compare all of them), the player-left action, the stall kick, and the replay file format.

```ts
// Licence: donor licence unclear (no LICENSE or COPYING file in the donor folder) -> restricted; clean-room shape only.
const STREAMS = 8;             // named RNG streams (fix: donor shares one LCG state for every draw site)
const LATENCY = 2;             // input delay in ticks
const CHECK_EVERY = 32;        // checkpoint interval in ticks
const MAX_BUFFER = 1024 * 4 * LATENCY; // per-client input buffer cap in bytes

interface Unit { id: number; x: number; y: number; hp: number; hidden: boolean; }
interface Action { owner: number; size: number; dx: number; }
interface Checkpoint { tick: number; value: number; }
interface SimState {
  tick: number;
  units: Unit[];
  rng: Uint32Array;
  draws: Int32Array;
  pending: Map<number, Action[]>;
  successful: number;
  checkpoints: Checkpoint[];
}
interface Fight { seed: number; endTick: number; actions: Map<number, Action[]>; checkpoints: Checkpoint[]; }

function lcgNext(s: number): number {
  return (Math.imul(s, 22695477) + 1) >>> 0;
}

// Draw from one named stream: the state advances once per call; the 15-bit output is scaled into [from, to].
function draw(st: SimState, stream: number, from: number, to: number): number {
  const next = lcgNext(st.rng[stream]);
  st.rng[stream] = next;
  st.draws[stream]++;
  const out = (next >>> 16) & 0x7fff;
  return from + Math.floor((out * (to - from + 1)) / 32768);
}

// FNV-1a over 32-bit words (shape of the donor's insync hash).
function fnv(words: number[]): number {
  let h = 2166136261;
  for (const w of words) {
    h = Math.imul((h ^ (w | 0)) >>> 0, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Hash every unit, hidden or not, in id order, plus every stream state and the action count.
// Fix: the donor walks only the visible units list.
function stateHash(st: SimState): number {
  const words: number[] = [st.successful];
  for (const s of st.rng) words.push(s);
  for (const u of [...st.units].sort((a, b) => a.id - b.id)) {
    words.push(u.id, u.hp, u.x, u.y, u.hidden ? 1 : 0);
  }
  return fnv(words);
}

// Accept a client's action for LATENCY ticks ahead, or reject it when the client buffer is full.
function acceptAction(st: SimState, clientTick: number, a: Action, buffered: number): boolean {
  if (buffered + a.size >= MAX_BUFFER) return false;
  const at = clientTick + LATENCY;
  const list = st.pending.get(at) ?? [];
  list.push(a);
  st.pending.set(at, list);
  return true;
}

// One fixed tick: apply due actions in owner order, do the work, advance, and checkpoint on the interval.
function tick(st: SimState): void {
  const due = [...(st.pending.get(st.tick) ?? [])].sort((a, b) => a.owner - b.owner);
  st.pending.delete(st.tick);
  for (const a of due) {
    const u = st.units.find((x) => x.id === a.owner);
    if (u !== undefined) {
      u.x = (u.x + a.dx) | 0;
      st.successful++;
    }
  }
  st.units.sort((a, b) => a.id - b.id);
  for (const u of st.units) {
    if (u.hp > 0 && draw(st, 0, 0, 3) === 0) u.y++;
  }
  st.tick++;
  if (st.tick % CHECK_EVERY === 0) st.checkpoints.push({ tick: st.tick, value: stateHash(st) });
}

function makeState(seed: number, units: Unit[]): SimState {
  const rng = new Uint32Array(STREAMS);
  for (let i = 0; i < STREAMS; i++) {
    rng[i] = ((seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0) || 1;
  }
  return { tick: 0, units, rng, draws: new Int32Array(STREAMS), pending: new Map(), successful: 0, checkpoints: [] };
}

// Replay: rebuild from the seed, re-run the recorded actions, and name the first recorded checkpoint that differs.
function firstDivergence(fight: Fight, make: (seed: number) => SimState): number | null {
  const st = make(fight.seed);
  st.pending = new Map(fight.actions);
  while (st.tick < fight.endTick) tick(st);
  for (let i = 0; i < fight.checkpoints.length; i++) {
    const want = fight.checkpoints[i];
    const got = st.checkpoints[i];
    if (got === undefined || got.tick !== want.tick || got.value !== want.value) return want.tick;
  }
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (tsc 7.0.2), exit 0. Note: the sketch uses `acceptAction` and `makeState` as the entry points; neither is exercised by a test in this pass.

## 5. Lands in

- TARGET `src/fight/record.ts` (new, proposed): the fight record (seed, rule version, input log per tick, checkpoints every 32 ticks) and the replay check that names the first divergent checkpoint. Named RNG streams go in `src/fight/rng.ts` as part of the same row (proposed).
- Parity row 19 (fight record/replay). The input intake (`acceptAction`) is row 5 and is noted, not targeted.
- Reuse tag: adapt (shape only; licence unclear, so no code is taken)
- Brief rule served: 1 (one engine: the record, the RNG streams and the checkpoint run in the engine, not in a client); rules 7-9 n/a

## 6. Gaps and risks

- Licence unclear and no LICENSE file in the donor box. Treat as restricted: shape only. The sketch is written from the described steps.
- The wait gate (sync.h 949-956, 987) stalls the whole game on one slow client until the 60 s kick (616). Our server is the authority and must not wait for clients. Reject the wait; keep the input latency and the record.
- Defect: one shared LCG (bwgame.h 13197-13204). An extra draw at any site shifts every later draw, so a change in one system changes another's results and the replay of old fights. Fix: named streams (in the sketch), each seeded from the fight seed and a stream id.
- Defect: the checkpoint walks only `visible_units` (sync.h 641), so units on the hidden list are not checked (`bwgame.h` 291 holds that list). Fix: hash every unit in id order (in the sketch).
- Candidate defect, not run: a server-side kick applies the player-left action at once and locally (sync.h 466-469). I found no send in `kill_client` and `get_player_left_action` is used only at 466 and 672, so the other peers may not apply it at the same tick. Every peer runs the insync compare on every sender (795-800) and kills a mismatching sender locally, so the next check would make the peers that applied the leave kick the ones that did not (or the reverse), splitting the group. Fix: schedule the leave as a tick action at tick + latency and broadcast it, like any input.
- Frame counters are 8-bit (380; 195; 951 with a signed distance). The signed compare is safe only while a client is less than 128 frames away. Fix: 32-bit ticks in our engine.
- The replay path (replay.h 229-233) runs no hash check. A replay can silently diverge. Fix: store the checkpoints in the record and compare them at playback (the acceptance below).
- The insync checkpoint is every 32 ticks (943). Divergence between checkpoints is invisible. Fix: keep the interval as a data field and run a per-tick compare in tests only.
- Unused work on the input path (sync.h 278 builds a hex string per byte and throws it away). Fix: delete it.
- Pre-game: `sync` (968-985) waits on scheduled actions with a 50 ms timeout. A peer-supplied ring index is used with `.at(index)` (798) and throws on index >= 4, so a bad check message can crash the process instead of being rejected. Fix: validate the index before use.
- Dead code on join (sync.h 587-589 saves and restores `sync_frame`, a net no-op). Fix: delete it.
- Frankendom's fight state must be integer or fixed-point before it is hashed (OpenBW hashes raw fixed-point positions, 643-644). The Three.js client never writes sim state.

## 7. As-data shape

- Replay file (binary): an identifier (108, 0x53526572), then a 633-byte game-info block (110). Inside the block, the frame count is a uint32 at byte 1 (116), the random seed a uint32 at byte 8 (119), the campaign id a uint16 at byte 5 (117). Then a uint32 length and the action stream (196-197). Row fields for the stream: frame (uint32 header, `replay_saver.h` 549), then per action: owner (player slot), size (uint8, max 255; `replay_saver.h` 550), payload bytes. The payload's command layout was not read.
- Game speed or tuning: none found as a table. The constants above are in code (sync.h 25, 231, 943, 915, 616; bwgame.h 13107, 13126, 13091).
- A new input type: no. It is a case in the `switch` in `process_messages` (sync.h 795-852) plus engine code. A new fight record: yes, if we keep the fields above in one row per fight.
- A new named RNG stream: yes in our design (a row with a stream id and a seed rule); in the donor it is no (a source index into one shared state).

## 8. Provenance

- Repo: OpenBW (donor folder `/mnt/frankendom-donors/OpenBW-openbw`). Licence: unclear. No LICENSE, COPYING or NOTICE file; the README points to another repository (`README.md`, one line). Treat as restricted: shape only.
- Files and lines as in section 2 and the receipts file (receipts `note` = `OpenBW-openbw`).

## 9. What they patched later

No history available: the donor folder has no `.git` directory and no changelog. Hidden rules that live in comments and flags:
- `bwgame.h` 2016-2017: "This is an original bug. Don't fix", and the expression below it keeps the extra `dimensions.from.y` term. The comment says the bug is kept on purpose; the reason is not written in the code.
- `sync.h` 26 and 217-218: a flag makes the first BWAPI-compatible step skip the frame advance. Why is not stated in the code (not read further).
- `sync.h` 239: the "action buffer is full" error is commented out, so a full buffer is now a silent reject (240).
- `bwgame.h` has 35 comments of the form "todo: callback for sound/error". Errors and sounds are not wired in those paths (grep count).

## 10. Rulings for Dom

1. Should every fight draw from named RNG streams (combat, loot, AI, spawn) seeded from the fight seed, so a change in one system cannot shift another system's results? Recommend yes.
2. Should each fight record hold the seed, the per-tick input log and a checkpoint hash every 32 ticks, so a dispute can be replayed and the first divergent checkpoint named? Recommend yes (row 19).
3. Should a player's leave or a kick be a scheduled tick action that every peer applies at the same tick, not an immediate local effect? Recommend yes.

Best transferable idea: give every fight named RNG streams and a checkpoint hash every 32 ticks over all units in id order, so a replay that diverges names the first bad checkpoint, and so one new random draw cannot shift another system.

Decision (proposed): adapt. Keep the input latency, the checkpoint hash and the first-divergent-checkpoint replay check for row 19; reject the lockstep wait (our server is the authority and must not wait for clients); add named RNG streams and hash all units (the donor's defects, fixed).
Acceptance: a server test records a fight from one seed and an input log, re-runs it, and asserts every 32-tick checkpoint matches; adding one extra draw to the combat stream makes the test name the first differing checkpoint, and an extra draw on the loot stream leaves every combat checkpoint unchanged.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: 'Host compare' at sync.h 795-800 was mislabelled; the code runs on every peer, so the 'Not read: peer-side insync compare' gap was false.
- Error: 'rejected, not grown' (231-240) was wrong; buffer grows 1.5x (232-233) and is rejected only when new_size >= max_size.
- Missed: insync kill is symmetric and local per peer, strengthening the kick-desync defect.
- Missed: pre-game branch of sync (968-985) uses a 50 ms timeout; peer ring index used with .at(index) (798) throws on index >= 4.

Fixed 2026-10-12: peer-compare wording, buffer growth wording (mechanism, table), Not-read gap removed, kick-desync defect strengthened, ring-index crash risk added. Sketch unchanged (acceptAction already models a cap; no code change).
