# Return-To-The-Roots-s25client (determinism-replay, cell 3)

Donor: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/network/GameClientGF_Game.cpp` | Licence: GPL-2.0-or-later (SPDX header at libs/s25main/AsyncChecksum.h:3; LICENSE:1 is the GPL v2 text) | C++ | symbol `GameClient::ExecuteNWF` (with `NWFInfo::isReady`, `NWFInfo::execute`, `GameServer::CheckForAsync`, `GameClient::ExecuteGameFrame`)

Checked: opened network/GameClientGF_Game.cpp (all), NWFInfo.h (all), NWFInfo.cpp (all), AsyncChecksum.h and .cpp (all), FramesInfo.h (all), GameClient.cpp 280-296 and 1292-1401, GameServer.cpp 300-375, 532-546, 716-800 and 1269-1290 (read), 1333-1345 (grep only), GameClientGF_Replay.cpp 1-70, Replay.cpp 331-383 (record writer and reader), random/Random.h (all), random/Random.cpp (all), random/XorShift.h and .cpp (all), ai/random.h and .cpp, common/include/helpers/random.h 1-70. Speed table read on the checker's pointer: SPEED_GF_LENGTHS = {80, 60, 50, 40, 30} ms (libs/s25main/gameData/GameConsts.h:15). Not read: AIPlayer command generation, the server's handling of AI commands sent by several clients, PlayerGameCommands serialisation body, SavedFile.cpp, the save path, most of GameClient.cpp and GameServer.cpp, the async-log writer body. Confidence: high for the NWF queue, the pacing and the checksum definition (read end to end, the donor's comments agree); medium for the replay record layout (writer read, reader only partly). Not a camera cell.

## 1. Mechanism

Lockstep with numbered frames. The sim runs in numbered game frames (GF). The local clock only decides when the next GF is due, and each GF advances by exactly one `gf_length` (GameClient.cpp:1310, 1321; the server uses the same accumulator at GameServer.cpp:716-720). Player commands only take effect at numbered network frames (NWF), which are a fixed number of GFs apart.

- Command delay: a command batch created at NWF n is for NWF n + cmdDelay (NWFInfo.cpp:45). The donor sets cmdDelay to 3 when the game starts (GameServer.cpp:542). The server pre-fills empty batches for NWFs 1 to cmdDelay-1 (GameServer.cpp:355-364), so the first NWFs can run before anyone has typed a command.
- Back-pressure: each player's queue holds at most 2 x cmdDelay batches (NWFInfo.cpp:49-50). A batch past the cap is dropped by the server (GameServer.cpp:1279-1280).
- Readiness: an NWF runs only when no player is lagging (every player has a batch queued) and the server has queued at least one `NWFServerInfo` (`serverInfos_` non-empty) (NWFInfo.cpp:71-80, `isReady`). If one is missing, the client skips the GF, sets a random pause of up to 4 GFs (`rand()`, pacing only, GameClient.cpp:1337-1344), and tries again.
- Running an NWF (client, `ExecuteNWF`): compute `AsyncChecksum` of the state before any command runs (GameClientGF_Game.cpp:17), write the replay record with it (26-31), run each player's commands (34), collect AI commands (39-46), and send the local batch with the checksum (50). The comment at line 28 says the checksum in a batch is the one from the previous NWF.
- Checksum (AsyncChecksum.h:12-17, .cpp:43-48): RNG checksum plus object count, object-id counter, active event count and event-instance counter. It is not a hash of the whole world; it is a few counters and a 32-bit RNG digest (see section 3).
- Server check (GameServer.cpp:728-746 and 773-792): at each NWF the server compares every player's checksum with the first player's. On a mismatch it pauses (SetPaused, line 732), asks for async logs, and still runs the NWF (754). The client shows "The Game is not in sync" when the server reports it (GameClient.cpp:869).
- Speed change: the server rescales the number of GFs per NWF so the real time per NWF stays the same (GameServer.cpp:760-769); clients apply the new length when they execute the NWF (NWFInfo.cpp:119-120; GameClient.cpp:1351-1352).
- Replay: each batch is written to the replay file with its GF index (Replay.cpp:337-343), flushed after every record (345-346). Playback executes the recorded batches at the recorded GF and recomputes the checksum (GameClientGF_Replay.cpp:16-40). The first mismatch pauses playback for investigation (56).
- Seed: the server picks the match seed from the high-resolution clock, cut to 32 bits (GameServer.cpp:540); savegames use 0 and read the seed from the file (537-538). Clients initialise the game RNG with it (GameClient.cpp:291) and reseed the AI generator with it (292). The replay header stores it (Replay.cpp:167, read at 279).

## 2. Key functions

- `GameClient::ExecuteNWF`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/network/GameClientGF_Game.cpp` 13-52. Checksum, replay record, run commands, AI commands, send batch.
- `NWFInfo::addPlayerCmds`, `isReady`, `execute`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/NWFInfo.cpp` 40-53, 71-80, 106-122. Queue, readiness, and applying the frame length.
- `GameServer::ExecuteNWF` and `CheckForAsync`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/network/GameServer.cpp` 725-792.
- `GameClient::ExecuteGameFrame`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/network/GameClient.cpp` 1292-1401. Pacing, NWF readiness, lag cap.
- `GameClient::ExecuteGameFrame_Replay`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/network/GameClientGF_Replay.cpp` 14-70.
- `Random::Rand`: `/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/random/Random.cpp` 37-44; `Random::CalcChecksum` 52-65.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (where) |
|---|---|
| Command delay in frames (three frames ahead) | 3 (GameServer.cpp:542). Engine constant set at start. |
| Back-pressure per player | 2 x cmdDelay batches (NWFInfo.cpp:49). Engine constant. |
| Empty batches pre-filled for the first frames | cmdDelay - 1 (GameServer.cpp:355). Engine constant. |
| Client pause on a missing batch | up to 4 GFs, random (GameClient.cpp:1343, `rand()`). Pacing only; engine constant. |
| Lag cap before simulation time is skipped | 5 GFs (GameClient.cpp:1390, 1396). Engine constant. |
| Frame length | one row per speed: 80, 60, 50, 40, 30 ms (GameConsts.h:15, `SPEED_GF_LENGTHS`, an EnumArray over GameSpeed; used at GameClient.cpp:287) |
| Replay history of RNG calls | 1024 entries (Random.h:82). Engine constant. |
| RNG default seeds | 123456789 for Random (Random.cpp:21); 0x1337 for XorShift (XorShift.h:33); 0 becomes 1 (XorShift.cpp:43) |

Defects and gaps, each with the fix (keep the idea, fix the defect):
1. The RNG checksum is a plain sum of the serialized 32-bit words (Random.cpp:55-61; XorShift.cpp:24-27): two 32-bit words, added. Different states can give the same digest, and swapping the words gives the same digest. The comment says this is kept for compatibility with an old LCG (Random.cpp:55-56). fix: keep the counter fields, and hash the full 64-bit state (or serialise and hash bytes) for the per-frame check.
2. The async check covers counters and an RNG digest, not object contents (AsyncChecksum.h:15-17). A divergence that keeps the counts and the digest is missed. fix: add a per-frame hash of the fields that matter (position, hp, cooldown).
3. AI draws use `std::minstd_rand` (ai/random.cpp:11, ai/random.h:12) through `std::uniform_int_distribution` (helpers/random.h:20-23). The distribution algorithm is implementation-defined, so two platforms can draw different values from the same state. The game RNG avoids this by taking `rng() % maxExcl` (Random.cpp:15). fix: use the game RNG's modulo draw for anything that must agree across machines.
4. AI draws are not in the async checksum (the checksum uses only `RANDOM`). A divergence in AI decisions is not caught by the check. fix: count AI draws in the checksum, or keep AI out of the lockstep stream.
5. The match seed is a 32-bit cut of a high-resolution clock (GameServer.cpp:540). Only 32 bits of seed entropy. fix: a 64-bit seed, recorded in the replay header.
6. The RNG history ring stores source file, line and object id per call (Random.h:82; Random.cpp:40). This is useful for async logs; it costs a state copy per draw. fix: keep it in debug builds only.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's queue rules (command delay, back-pressure cap of 2 x delay, readiness only when every player has a batch, one batch per player per NWF, mismatch detection against the first player's checksum, and the one-GF-per-call pacer with a 5-GF lag cap that skips simulation time). Differences: (a) `execute` reports the mismatch and still returns the commands, as the donor does, but the sketch does not pause (the caller decides; the donor pauses through SetPaused); (b) integer milliseconds replace the steady clock; (c) the random pause of up to 4 GFs, the replay record, the RNG and the async log are omitted. The sketch does not include the replay record; section 1 describes it.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export interface Checksum { rng: number; objs: number; objIds: number; events: number; evIds: number }
export interface Batch { checksum: Checksum; cmds: string[] } // cmds are opaque command strings; checksum taken before they run
export interface Lane { id: number; batches: Batch[] }        // batches queued for future NWFs, oldest first

export function sameChecksum(a: Checksum, b: Checksum): boolean {
  return a.rng === b.rng && a.objs === b.objs && a.objIds === b.objIds && a.events === b.events && a.evIds === b.evIds;
}

export class NwfQueue {
  private lanes: Lane[] = [];

  // cmdDelay: a batch sent during NWF n runs at NWF n + cmdDelay (donor: 3, GameServer.cpp:542)
  constructor(readonly cmdDelay: number) {
    if (cmdDelay < 1) throw new Error("command delay must be at least 1");
  }

  addPlayer(id: number): void {
    if (!this.lanes.some((l) => l.id === id)) this.lanes.push({ id, batches: [] });
  }

  // Back-pressure: at most 2 * cmdDelay batches queued per player (donor: NWFInfo.cpp:49-50).
  offer(id: number, batch: Batch): boolean {
    const lane = this.lanes.find((l) => l.id === id);
    if (lane === undefined) throw new Error("unknown player");
    if (lane.batches.length >= 2 * this.cmdDelay) return false;
    lane.batches.push(batch);
    return true;
  }

  // An NWF may run only when every player has a batch for it; a missing batch means that player is lagging.
  ready(): boolean {
    return this.lanes.length > 0 && this.lanes.every((l) => l.batches.length > 0);
  }

  // Runs one NWF: takes one batch per player. A player whose checksum differs from the first player's is reported.
  execute(): { cmds: Map<number, string[]>; mismatched: number[] } {
    if (!this.ready()) throw new Error("NWF not ready");
    const ref = this.lanes[0].batches[0].checksum;
    const cmds = new Map<number, string[]>();
    const mismatched: number[] = [];
    for (const lane of this.lanes) {
      const b = lane.batches.shift();
      if (b === undefined) throw new Error("unreachable: ready() checked");
      if (!sameChecksum(b.checksum, ref)) mismatched.push(lane.id);
      cmds.set(lane.id, b.cmds);
    }
    return { cmds, mismatched };
  }
}

export interface Pacer { lastMs: number; gfMs: number }

// Returns true when one game frame should run now. Advances by exactly one GF, not to "now" (donor: GameClient.cpp:1321).
export function paceOneGf(p: Pacer, nowMs: number): boolean {
  if (nowMs - p.lastMs < p.gfMs) return false;
  p.lastMs += p.gfMs;
  return true;
}

// Lag cap after a frame: up to maxLagGf frames of lag are carried; beyond that, simulation time is dropped (donor: GameClient.cpp:1390-1397).
export function capLag(p: Pacer, nowMs: number, maxLagGf = 5): void {
  const frame = nowMs - p.lastMs;
  if (frame >= p.gfMs && frame > maxLagGf * p.gfMs) {
    p.lastMs += frame - (p.gfMs - 1); // skip simulation time so the lag is just under one GF
  }
}
```

Typecheck and run on the VPS: `tsc --noEmit --strict --target es2020` exit 0 (npx typescript@5.6.3). Compiled to CommonJS and run with node: back-pressure accepted 6 of 7 offers (cap 2 x 3); not ready until both players have a batch, then ready; equal checksums give no mismatch; a different checksum for player 2 reports `[2]`; the pacer runs at 100 ms and not at 99 ms; after a 900 ms stall the lag is 99 ms (capped under one GF); a 300 ms gap with 100 ms GFs keeps the lag (no skip). The check drives this sketch only.

## 5. Lands in

- TARGET `src/fight/record.ts` (proposed new module: the fight's command record, its per-tick checksum, and the replay driver; no Frankendom file was read for this note). The queue above is the shape; Frankendom's server would own the state and the clients would send intent only.
- Parity row 19 (fight record/replay).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape not code)
- Brief rule served: 1 (one engine: the server runs every tick); rules 7-9 n/a

Decision (proposed): adapt - keep the checksum taken before each tick's commands, the per-tick record of commands with a seed, and the replay that names the first tick that differs; drop peer lockstep and the fixed command delay, because the server owns the state and a delay would add latency to fast duels.
Acceptance: a server test records a fight (seed + commands per tick), replays it and asserts the per-tick checksums match; a replay with one command changed at tick k reports the first mismatch at tick k; a duel input sent during a tick is applied on the next server tick, not three ticks later.

Best transferable idea: schedule each player's commands a fixed number of frames ahead and run a frame only when every player's batch is in, carrying a state checksum with each batch, so a divergence is caught at the frame where it happened.

## 6. Gaps and risks

- Peer lockstep is the wrong model for Frankendom's server-authoritative rulings. The donor needs the three-frame delay because every client must agree before a frame runs. Frankendom's server applies inputs itself; a delay would add latency to duels without a matching benefit.
- The donor's checksum is weak (defects 1-2). A replay that matches on the donor's checksum alone can still differ. Frankendom must hash the fields that matter, not counters.
- AI decisions use implementation-defined distributions (defect 3) and sit outside the checksum (defect 4). Any AI in a Frankendom fight must use the engine RNG and be in the record.
- Whether AI commands from several clients are deduplicated was not resolved: every client fetches AI commands (GameClientGF_Game.cpp:39-46), and the server queues every batch it receives for a player, ignoring only a full queue (GameServer.cpp:1279-1280). Not read: the server's AI deduplication, and whether `aiPlayers_` is filled on every client.
- Pauses use libc `rand()` (GameClient.cpp:1343). This is pacing, not simulation, so it does not change the state, but it means two clients' pauses differ; any Frankendom port must keep pacing out of the record.
- Speed changes are applied at NWF boundaries (GameServer.cpp:754-768), which is good, and the frame-length table is one row per speed (80, 60, 50, 40, 30 ms; GameConsts.h:15).
- Savegames carry no seed: the seed is 0 and comes from the file (GameServer.cpp:537-538). Frankendom should store the seed with every save as well as in each replay.

## 7. As-data shape, provenance, patch history, rulings

As-data shape:
- Table: the NWF schedule is a queue of rows `NWFServerInfo { gf: unsigned; newGFLen: milliseconds; nextNWF: unsigned }` (`/mnt/frankendom-donors/Return-To-The-Roots-s25client/libs/s25main/NWFInfo.h` 14-25). Per player: a queue of `PlayerGameCommands` (checksum + command list; NWFInfo.h 27-37).
- Replay record (Replay.cpp 331-347): uint32 GF, one byte type (game command), one byte player, then the serialised PlayerGameCommands (checksum fields, then the commands).
- Speed table: `SPEED_GF_LENGTHS[speed]` = {80, 60, 50, 40, 30} ms (libs/s25main/gameData/GameConsts.h:15; looked up at GameClient.cpp:287).
- A new speed is one row in SPEED_GF_LENGTHS: yes, one value in the table (plus one entry in the GameSpeed enum, since it is an EnumArray). A new game command type is one class (gc:: types), not a row: no.

Provenance per claim: donor repo Return-To-The-Roots-s25client; file and line as in the receipts. Licence GPL-2.0-or-later (SPDX header and LICENSE), copyleft class, clean-room only.

What they patched later (from the donor's own changelog in data/RTTR/texte/readme.txt; no git history in the donor):
- "Fix some bugs, crashes and asyncs" (readme.txt:255, 0.9.1 section).
- "Many async fixes" (readme.txt:261, 0.8.2 section).
- "Kicking asynchron players now" (readme.txt:365, 0.2 section): the 0.2 section is dated 15.07.2007 and is the second version, so the kick on mismatch came early in the project, not late.
- The RNG checksum comment (Random.cpp:55-56) says it is kept equal to the old LCG state for compatibility; no history line explains the change to the sum.

Rulings for Dom (answer each in one line):
1. For fight inputs, should Frankendom apply each input on the next server tick (recommended, server owns state) rather than wait a fixed number of ticks as the donor does (three frames)?
2. Should every fight record store a per-tick state hash on the server (cheap: hp, position, cooldown), so a bad replay names its first bad tick? Recommend yes.
3. Should the fight seed be 64 bits and stored with each replay and each save (the donor cuts a clock to 32 bits and stores 0 for saves)? Recommend yes.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Patch-history line said kick-on-mismatch came late (readme.txt:365); it is the 0.2 section, 15.07.2007, so early. Confirmed.
- isReady (NWFInfo.cpp:71-80) also requires a queued NWFServerInfo; note omitted it. Confirmed.
- Missed: speed table is readable (GameConsts.h:15, {80,60,50,40,30} ms); supports "a new speed is one row". Confirmed.
Fixed 2026-10-12: patch-history line (early, not late); isReady condition; speed table values filled in section 1/3/6/7 and the header "Not read" list; "new speed is one row" now supported by the table (also needs a GameSpeed enum entry). Decision, Acceptance, Rulings and sketch did not rest on the wrong claims; no TypeScript changed.
