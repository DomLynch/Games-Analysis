# beyond-all-reason-Beyond-All-Reason (determinism-replay, cell 3)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/dbg_synctest.lua` | Licence: GNU GPL v2 or later (per the gadget header, line 9; repo `LICENSE.md` line 2: "BAR game code is released under the GPL v2 licence, though individual files can have their own license") | Lua (Recoil/Spring gadgets) | symbols `beginRun`, `gadget:GameFrame`, `initrandom`, `getrandom`, `writeSynchash`; also `game_restart_with_state.lua` (`collectUnitState`, `restoreUnits`) and `dbg_replay_data.lua`

Checked: Opened: `dbg_synctest.lua` 1-262, 278-330, 352-500, 540-739 (not read: 262-278, 330-352, 500-540). `game_restart_with_state.lua` 1-40, 105-345, 486-499 (not read: 40-104 serializer body, 345-485 command-queue restore, 500-539 unsynced). `dbg_replay_data.lua` 1-114, all. Grep only: the repo `changelog.md` (780 lines) for sync, replay, desync, restart, checksum and random (no matching entry); no `.git` folder, so no history. Not in the box: the Recoil engine itself (the checksum function, the replay file format and the lockstep code). So the desync mechanism is described from its call sites only. Confidence: high on the harness order of operations, the anchor, the draw order and the digest; high on the save schema; medium on the restore (pass 2 not read). Depth is thin because the engine half is absent.

## 1. Mechanism

- A seeded synthetic run. Synced code (the gadget) spawns and moves units from a fixed seed; unsynced code (the same file, the `else -- UNSYNCED` branch at 568) collects one engine checksum per frame and writes a digest file at the end. Two machines or two builds that run the same seed should give the same digest. Constants: `RUN_SEED = 7654321` (19); `totalFrames = 2000` (83).
- Anchored start. A run can start now (`beginRun(now)`, 195-197) or on a future frame given in the chat words. The comment says why: "The command to start arrives over the network, so its exact arrival frame is non-deterministic. So we want to anchor to a specific frame." (151-154). A start frame not after the current frame is refused (202-211). An armed start is held in `pendingStartFrame` (213) and begins in synced `GameFrame` when `n == pendingStartFrame` (279-280).
- Begin. `beginRun` sets `runStartFrame` and `runEndFrame = start + totalFrames` (217-219), calls `initrandom(RUN_SEED)` (222), scans anchors, builds categories (223-224), then tells unsynced to start capture (244).
- Draw table. `initrandom(seed)` calls `math.randomseed(seed)` (551) and fills a 5000-entry table with `math.random()` (552-554). `getrandom()` returns the next entry and wraps at 5000 (558-566). So the sequence is fixed by the seed and repeats every 5000 draws.
- Order inside one synced frame (`GameFrame`, 278-310): (1) start a pending run if this is its frame (279-281); (2) return if no run is active (282); (3) `runFrame = n - runStartFrame` (286); (4) every `feedMod = 3` run frames, spawn one burst for each enabled category in table order (288-291); (5) on run frames where `runFrame % 3 == 1`, destroy expired wreckage (296-305); (6) when `n >= runEndFrame`, end the run (307-309), which removes all spawned units and features (257, 475-496) and tells unsynced to write (258).
- Burst. For each category and each team: stop at the team cap (363-365, before any draw); draw two values for the burst centre, each offset from the anchor by `placementRadius * (draw - 0.5)` (371-372; radius 400 at 84, so about plus or minus 200); spawn up to `effectiveStep` units in a square grid (373-386); then give the new units a repeat order, three fight orders to destination anchors chosen by draws (393-398; draw at 394), and a final fight order to the anchor (399-400). Anchors are picked round-robin by a counter (410-411), so only placement and destinations use draws.
- Effective counts. Without the opt-out, `effectiveMax = max(1, floor(max * mult / 2))` and `effectiveStep` the same (436-437). Rows with `noMultiplier` take the raw values (432-434). The category table is at 101-119: bots 400 max and 28 step (102); tanks 280 and 14 (103); fighters 280 and 14 (104); bombers 140 and 7 (105); hover, subs, ships and spiders 200 and 14 (106-109); commanders 3 and 1, with `noMultiplier` (110-118).
- Digest. Unsynced `GameFrame` (675-699) samples `Spring.GetPrevFrameSyncChecksum()` for each frame in the window `n > start and n <= end` (682-692), but only if `Platform.hasSyncChecksums` is set (682; without it the file is written empty, 629-633). At the end it writes a digest of the checksum values in order (636-638), the per-frame checksums with their run frame (640-643), and the first and last frame, as JSON to `synctest_synchash.json` (645-652, 654-660). The digest is over the values only, so frame numbers are not part of it (636-637). The log line calls the digest "md5" (663).
- Unit state save (`game_restart_with_state.lua`). `collectUnitState` (105-224) walks all units. It skips units with no position, units inside a transport (133; `transporter`, 128), and nanoframes that have an active builder (111-121), because the builder's queue recreates them. Each kept unit becomes one row (section 7).
- Unit state restore. The state arrives as LuaRules chunk messages (245-251), is joined and parsed with `loadstring("return " .. content)` (258), and is checked for shape (264). The restore is anchored: `restoreFrame = (Game.spawnWarpInFrame or 90) + 10` (270), applied in `GameFrame` when `n >= restoreFrame` (487-489). New units are created before old ones are removed, "so the engine never sees zero units" (289-291). Each unit is created under `pcall` (312-321), then health and build progress are set together (329), then experience (332), then the saved orders (338-344).
- Spectator event feed. `dbg_replay_data.lua`: the unsynced gadget drops the `UnitDamaged` callin for players who are neither replaying nor spectating (22-24, 26-29). When it is kept, it forwards the full event to LuaUI (54-66). The widget that prints the events is in a block comment (71-113).

Numbers: run length 2000 (83); spawn every 3 run frames (85, 288); wreck cleanup every 3 frames at offset 1 (86, 296); wreck life 150 frames (87, 471); placement radius 400 (84); draw table 5000 (552); burst centre offset `radius * (draw - 0.5)` (371-372); destination draws per burst 3 (393); restore at warp-in + 10 (270); save chunk 8000 bytes (76); unsynced chunk 4000 (498).

## 2. Key functions

- `beginRun` and `armRun`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/dbg_synctest.lua` 155-246. Anchor and seed.
- `gadget:GameFrame` (synced): same file, 278-310. Per-frame order.
- `spawnBurstForCategoryAtAnchor`: same file, 362-403. Draw order and team cap.
- `initrandom` and `getrandom`: same file, 550-566. The seeded table.
- Unsynced `writeSynchash` and `GameFrame`: same file, 623-699. The digest artifact.
- `collectUnitState`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_restart_with_state.lua` 105-224. Save schema.
- `gadget:RecvLuaMsg` (restore path): same file, 235-280.
- `restoreUnits` and `gadget:GameFrame`: same file, 282-345 and 486-491.
- Spectator gate: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/dbg_replay_data.lua` 16-38 and 41-68.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed seed, fixed draw order, anchored start frame | `RUN_SEED` 7654321 (dbg_synctest.lua 19); start frame from chat (200-213) |
| Pre-drawn table with wrap-around | 5000 entries (552); period 5000 draws (563-566) |
| Per-tick sample of an engine checksum, digest over values in order | window (n > start, n <= end) (682); digest over values only (636-638) |
| Table-driven spawn categories with a multiplier that is halved and floored, minimum one | `max * mult / 2`, `step * mult / 2`, min 1 (436-437); opt-out (117, 433-434) |
| Pacing by frame modulus | 3 (85, 288); wreck cleanup 3 at offset 1 (86, 296) |
| Expiry by frame | 150 (87, 471) |
| Anchored restore after a warm-up | `(Game.spawnWarpInFrame or 90) + 10` (270) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's start-and-anchor logic, the draw table and its wrap, the order of the synced frame (start, pace the spawns, sample, end), the table-driven effective counts and the digest over values only. It changes three things on purpose: the draw table is built from a private generator and never touches the global Lua RNG (donor defect: `math.randomseed` at 551); the table length is the only period, documented; and the spawn itself, the wreck cleanup, the unit placement and the unsynced file writer are left as callbacks. It omits the anchor scan, the team cap early return (the sketch draws regardless, see section 6), the save and restore path, and the spectator gate.

```ts
// Licence: donor GPL v2 or later (per gadget header and repo LICENSE.md). Clean-room sketch of the shape only.
const RUN_SEED = 7654321;   // fixed seed for a reproducible run
const DRAW_TABLE = 5000;    // precomputed draw table size (donor cycles this table)
const SPAWN_EVERY = 3;      // spawn burst every 3 ticks
const RUN_TICKS = 2000;     // default run length

interface Category { name: string; max: number; step: number; noMultiplier: boolean; }
interface Run {
  table: number[];          // private table: no global RNG is touched (fix: donor calls math.randomseed)
  cursor: number;
  pendingStart: number | null;
  start: number;
  end: number;
  digests: { frame: number; sum: number }[];
}

// Deterministic private generator mapped into [0, 1). Same seed, same table, on every peer.
function makeTable(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(s / 4294967296);
  }
  return out;
}

function nextDraw(run: Run): number {
  const v = run.table[run.cursor];
  run.cursor = (run.cursor + 1) % run.table.length; // period is the table length (donor behaviour, kept and documented)
  return v;
}

function begin(run: Run, frame: number): void {
  run.table = makeTable(RUN_SEED, DRAW_TABLE);
  run.cursor = 0;
  run.start = frame;
  run.end = frame + RUN_TICKS;
  run.pendingStart = null;
  run.digests = [];
}

// Arm a run now, or anchor it to a future frame so every peer starts on the same tick.
function arm(run: Run, now: number, startFrame: number | null): boolean {
  if (startFrame === null) {
    begin(run, now);
    return true;
  }
  if (startFrame <= now) return false;
  run.pendingStart = startFrame;
  return true;
}

// One tick: start an anchored run, spawn on the pacing interval, and sample the checksum in the window.
function onTick(run: Run, n: number, checksum: (frame: number) => number, spawn: (draw: number) => void): void {
  if (run.pendingStart !== null && n === run.pendingStart) begin(run, n);
  if (n >= run.start && n < run.end && (n - run.start) % SPAWN_EVERY === 0) spawn(nextDraw(run));
  if (n > run.start && n <= run.end) run.digests.push({ frame: n - run.start, sum: checksum(n) });
}

// Digest over checksum values in order only; frame numbers stay in the record, not in the digest.
function digestOf(run: Run): number {
  let h = 2166136261;
  for (const d of run.digests) {
    h = Math.imul((h ^ (d.sum | 0)) >>> 0, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Table-driven categories: effective counts scale with the multiplier unless the row opts out.
function effective(c: Category, mult: number): { max: number; step: number } {
  if (c.noMultiplier) return { max: c.max, step: c.step };
  return {
    max: Math.max(1, Math.floor((c.max * mult) / 2)),
    step: Math.max(1, Math.floor((c.step * mult) / 2)),
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (tsc 7.0.2), exit 0.

## 5. Lands in

- TARGET `src/fight/record.ts` (new, proposed): the seeded soak run and the per-tick digest for fingerprint receipts; the anchored start and the draw table live with it.
- Parity row 19 (fight record/replay).
- Reuse tag: adapt (shape only; GPL v2 or later, clean-room)
- Brief rule served: 1 (one engine: the soak run and the digest live in the engine; the client only draws); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft GPL v2 or later: shape only. The sketch is written from the described steps.
- Defect: `math.randomseed(seed)` (551) reseeds the global Lua RNG, so any other code that calls `math.random` after a run starts gets a different stream. Fix: a private generator (in the sketch).
- Defect: the draw table repeats every 5000 draws (552, 563). A long run with many bursts can wrap it. The sketch keeps the period but makes it a named constant; whether a 2000-tick run wraps was not measured.
- Hazard: the team-cap early return (363-365) happens before any draw. So the draw sequence depends on unit counts. If a count ever differs between peers, every later draw shifts and the digest breaks from that tick on. This is useful for a test, risky for a game. Fix for us: draw before the cap check, so the sequence does not depend on counts.
- Hazard: wreck removal walks `featurestoremove` with `pairs` (297). Lua does not define that order. Whether the order of `DestroyFeature` matters for synced state is engine-side and not read. Fix: sort the ids before destroying.
- Hazard: restore parses saved text with `loadstring("return " .. content)` (258). Saved data is executed as Lua in synced code. Fix: parse as data with a whitelist of fields, never execute.
- Doc defect: the header (24) says the synced part "reads the file at Initialize". The code does not read a file; it takes chunk messages (245-251). Read the code, not the header.
- Gap: the save skips units inside transports (128-133) and nanoframes whose builder is busy (111-121), and rules other than builder priority and wantcloak are not saved (203-217). A fight record must include carried state, or it cannot restore a fight in progress.
- Gap: after a restore nothing compares the digest before and after (the restore is not hashed). Fix: take a digest before the save and after the restore, and fail the test on a difference.
- Gap: this harness samples only the engine checksum. The engine checksum and the replay format are not in the box, so we cannot say what it covers. Frankendom must hash its own state (HP, kill state, loot ownership, RNG streams).
- Restore is singleplayer only (3), and the header warns about multiplayer (27). Keep it out of fights.

## 7. As-data shape

- Category row (dbg_synctest.lua 101-119): `name: string`, `t1: unit-def name`, `t2: unit-def name`, `max: int`, `step: int`, `class: land | water | air`, `noMultiplier: bool` (optional). Effective values are derived (436-437). A new category is one row: yes (one table entry; the loop at 425-446 picks it up). Only if its unit defs exist (426).
- Saved unit row (game_restart_with_state.lua 193-219): `unitID`, `unitDefID`, `teamID`, `canFly: bool`, `x`, `y`, `z`, `heading`, `facing`, `health`, `maxHealth`, `buildProgress`, `experience`, `states: {firestate, movestate, repeat, cloak, active, trajectory}`, `builderPriority`, `wantCloak`, `commands: [{id, params, coded}]`, `factoryCommands: [...]`. A new saved field: no (it is a code edit in `collectUnitState` and in `restoreUnits`).
- Restore message: `rws_restore_begin`, then `rws_restore_chunk:<text>` messages, then `rws_restore_commit` (241-252, 252-277). Chunk size 8000 on the way out (76).
- Spectator gate: two booleans from the engine (`IsReplay`, `GetSpectatingState`, 22). A new viewer role: no (code in the gate).
- Draw table and seed: one seed row per run (`RUN_SEED`); table length a constant (552).

## 8. Provenance

- Repo: beyond-all-reason-Beyond-All-Reason (donor folder `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason`). Licence: GPL v2 for the game code (`LICENSE.md` line 2), per-file licence in the gadget header (`dbg_synctest.lua` 9, `game_restart_with_state.lua` 13, `dbg_replay_data.lua` 9: "GNU GPL, v2 or later"). Copyleft: shape only.
- The engine (Recoil) is GPL v2 or later per `LICENSE.md` and is not in this donor folder.

## 9. What they patched later

No history available: the donor folder has no `.git` directory. The changelog has no entry about sync, replay, desync, restart or checksum (grep of `changelog.md`). Hidden rules in code and comments:
- `dbg_synctest.lua` 6: the harness exists to collect "a per-frame sync-hash artifact for RecoilEngine#2910", and 2928 is named in the same description (6, the "See RecoilEngine#2928" sentence). Date line: 2026-04-13 (8).
- `dbg_synctest.lua` 631: the writer names the failure when the engine is built without SYNCCHECK, so an empty artifact is reported, not silently skipped (the gate at 682 is deliberate for that case).
- `dbg_synctest.lua` 151-154: the anchored start was added because a networked start command arrives on a non-deterministic frame.
- `game_restart_with_state.lua` 289-291: the restore creates new units before old ones are removed, so the engine never sees zero units (which would trigger a defeat).
- `game_restart_with_state.lua` 27: the multiplayer warning.

## 10. Rulings for Dom

1. Should Frankendom ship a seeded fight soak test (a fixed fight script, a digest per tick, run twice in CI on the GitHub runners)? Recommend yes; it is cheap and it is the fingerprint receipt.
2. Should the digest cover only Frankendom's own state values in tick order, with the tick list stored beside it (the donor's split)? Recommend yes.
3. Should save and restore of a live fight be refused in multiplayer and kept as a developer tool behind the dev permission? Recommend yes; the donor itself restricts it to singleplayer.

Best transferable idea: start every seeded run on an agreed future tick, draw from one private seeded table in a fixed order, and compare a per-tick digest of ordered state, so a replay names its first mismatch.

Decision (proposed): adapt. Take the anchored start, the fixed draw order and the per-tick digest into the fight record for row 19; reject the global `math.randomseed` (defect, fixed with a private table), the `loadstring` restore (parse data only) and any save or restore in multiplayer.
Acceptance: a server test runs a seeded 2000-tick fight script twice and asserts identical per-tick digests; inserting one extra draw in one category changes the digest from that tick on, and the test names the first differing tick.
