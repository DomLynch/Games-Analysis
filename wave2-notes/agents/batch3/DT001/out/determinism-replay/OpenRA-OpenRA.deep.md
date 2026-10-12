# OpenRA-OpenRA (determinism-replay, cell 1)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` | Licence: GPL-3.0 (COPYING is GPL v3; file headers say "version 3 of the License, or (at your option) any later version") | C# | symbols `OrderManager.TryTick`, `OrderManager.ProcessOrders`, `OrderManager.ReceiveSync`, `World.SyncHash`, `Server.HandleSyncOrder`, `ReplayConnection`, `ReplayRecorder`

Checked: Opened in full: `Network/OrderManager.cs`, `Sync.cs`, `Network/ReplayConnection.cs`, `Network/ReplayRecorder.cs`, `Network/TickTime.cs`. Opened in part: `World.cs` (33, 85, 190-225, 386-520, 615-628), `Network/SyncReport.cs` (1-130 of 344), `Server/Server.cs` (307, 329, 797, 813-856, 862-873, 920-935, 1362-1372), `Network/Order.cs` (230-246), `Game.cs` (636-668), `GameSpeed.cs` (12-60), `FileFormats/ReplayMetadata.cs` (12-80), `Support/MersenneTwister.cs` (17-60), `mods/ts/mod.yaml` (281-306). Not read: `Network/Connection.cs`, `SyncReport.cs` 130-344 (dump body), the trait tick order inside `ApplyToActorsWithTraitTimed`, the value of `Game.TimestepJankThreshold`, the `NetFrameInterval` default, and any `[VerifySync]` field in the mods. Short numeric lines (Timestep values) are cited by line, not receipted, because the verifier needs 15-90 characters. Confidence: high on the hash, the lockstep order of operations, the server compare and the replay path; medium on how a replay restores the lobby settings (only the SyncInfo read in ReplayConnection.cs 69-72).

## 1. Mechanism

- Lockstep with a relay. Each client sends its orders for net frame N; the server relays them. A client advances the world only when every client queue holds a packet for that frame (`OrderManager.cs` 202, 300-328; the `IsReadyForNextFrame` check at 202 and `TryTick` at 300-328).
- Order inside one loop pass (`Game.cs` 645-662): advance the tick clock (645), run immediate orders and receive packets (649), and only if `TryTick()` succeeds (658) run the order generator and `world.Tick()` (660-662).
- Inside `ProcessOrders` (`OrderManager.cs` 234-285): dequeue one packet per client, check its frame equals `NetFrameNumber` (244-245), apply each order through `UnitOrders.ProcessOrder` (255-258), then compute `World.SyncHash()` plus a defeat bitmask (265-272) and send it (272), then `++NetFrameNumber` (284). The hash is taken after frame N's orders and before frame N's world tick.
- The hash (`World.cs` 482-507): `n` is a running index. For each actor in ascending `ActorID` (the actor dictionary is a `SortedDictionary`, 33; the loop at 490-491) add `n++ * (1+ActorID) * HashActor`. Then each `ISync` trait hash with the same weighting (494-496), then synced effects (499-500), then `SharedRandom.Last` (503).
- Per-trait hashes come from a reflection-built function that folds every field or property marked `[VerifySync]` (`Sync.cs` 24, 78-107, the field filter at 89). Accepted types: int, bool (a fixed pattern, 0xaaa or 0x555, at 66-69), and a short list of custom types (44-57). Any other type throws (72-73).
- Compare: `OrderManager.ReceiveSync` (161-170) stores the first (frame, hash, defeat) per frame and calls `OutOfSync` if a later one differs (165-166). The server does the same in `HandleSyncOrder` (`Server.cs` 813-849): it compares the full packet bytes (825), flags out-of-sync on any difference (827), otherwise stores the first packet (849) and applies the defeat state from the first client (834-847, paraphrased).
- Out of sync: `OutOfSync` dumps the sync report (`OrderManager.cs` 91), calls `World.OutOfSync()` (92), which ends the game and pins `ReplayTimestep` to 0 (`World.cs` 621-626).
- Sync report: when `EnableSyncReports` is on and the connection is not a replay (`OrderManager.cs` 109), each frame keeps its orders and every non-zero trait hash with field values in a ring of 7 frames (`SyncReport.cs` 25, 59, 62-105). On desync the report for the failing frame is written to a log (107-130, body partly read).
- Replay write: `ReplayRecorder.Receive` (74-90) writes each packet as an int32 client id (87), an int32 length (88) and the bytes. Recording starts at the StartGame order (79). The server records every packet before it filters sync orders (`Server.cs` 866), so the replay contains the sync hashes too. On dispose it appends metadata (112).
- Metadata: start marker -1, version 1, a length-prefixed game-info string, a length, end marker -2 (`ReplayMetadata.cs` 21-23, 53-70; end marker 22). The game info holds `FinalGameTick` (`World.cs` 85).
- Replay playback: `ReplayConnection` parses the whole file into chunks (37-88). It takes the lobby settings, including the seed and game speed, from the `SyncInfo` order (69-72). A chunk is released when its frame is at most `NetFrameNumber + orderLatency` (111). Recorded sync packets go to `ReceiveSync` (117-118). The replay's own `SendSync` enqueues the locally computed hash (101-104), which is passed to `ReceiveSync` on the next receive (108-109). So a replay checks itself with the same compare as live play.
- Replay pacing: `SuggestedTimestep` returns `World.ReplayTimestep` while the net frame is below the replay tick count (`OrderManager.cs` 214-215).
- Seed: the server draws `randomSeed` from `DateTime.Now` (`Server.cs` 307) and puts it in the lobby global settings (329; `Session.cs` 212). `World` builds `SharedRandom` from it (`World.cs` 199) and a separate player RNG with the same seed for faction and spawn (214-216). The default `LocalRandom` (200) is seeded from `Environment.TickCount` (`MersenneTwister.cs` 26), so it is not part of the lobby seed.
- Tick clock (`TickTime.cs` 16-49): `ShouldAdvance` is true when `tick - Value >= timestep` (35-36). `AdvanceTickTime` rounds the delta down to whole timesteps (45). If that rounded amount is at or above `Game.TimestepJankThreshold` (value not read), it jumps by that amount. Otherwise it moves one timestep (46-48).
- Speeds: the ts mod has a `GameSpeeds` table (`mods/ts/mod.yaml` 281-306). The default row has Timestep 40 (294) and OrderLatency 3 (295). Timesteps run from 80 (slowest) to 20 (fastest, 306).

## 2. Key functions

- `OrderManager.TryTick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 300-328. Decides whether this loop pass ticks the world.
- `OrderManager.ProcessOrders`: same file, 234-285. Applies one frame's orders in client-index order, sends the hash, advances the frame.
- `OrderManager.ReceiveSync` and `OutOfSync`: same file, 161-170 and 86-96.
- `World.SyncHash`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/World.cs` 482-507. The whole-world fingerprint.
- `Sync.GenerateHashFunc`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sync.cs` 78-107. Reflection-built hash of `[VerifySync]` members.
- `Server.HandleSyncOrder`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Server/Server.cs` 813-849. Server-side first-writer-wins compare.
- `ReplayRecorder.Receive`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/ReplayRecorder.cs` 74-90.
- `ReplayConnection` constructor and `Receive`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/ReplayConnection.cs` 37-93 and 106-130.
- `TickTime.ShouldAdvance` and `AdvanceTickTime`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/TickTime.cs` 28-49.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-tick hash: position-weighted sum over entities in id order, plus the RNG output | Weight `n++ * (1 + id)` (World.cs 491); per-field XOR; bool masks 0xaaa and 0x555 (Sync.cs 66-69) |
| Compare the first stored hash with each later one; flag on any byte difference | None (byte compare, Server.cs 825) |
| Replay = recorded packets + seed + metadata | Metadata markers -1 and -2, version 1 (ReplayMetadata.cs 21-23, 22) |
| Order latency: frame N's orders apply at N + latency | OrderLatency 3 at default speed (mods/ts/mod.yaml 295) |
| Fixed tick step | Timestep 40 ms at default; 80 slowest to 20 fastest (mods/ts/mod.yaml 286-306; not receipted, line too short) |
| Desync report ring | 7 frames (SyncReport.cs 25) |
| Clock catch-up after a stall | Jank threshold: value not read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of operations (apply orders, advance the RNG once, hash in id order, compare per tick) and the replay check (rebuild from the seed, re-run recorded orders, name the first differing tick). It omits: the MT19937 generator (xorshift32 instead), the 7-frame sync report ring, the defeat-state bits, the reflection over `[VerifySync]` fields (fields are hand-listed), synced effects, the lockstep wait for all clients, the jank-threshold tick clock, and the lobby settings. One defect is fixed on purpose: the donor folds only `SharedRandom.Last` into the hash; the sketch also folds the generator state.

```ts
// Licence: donor GPL-3.0 (OpenRA). Clean-room sketch of the mechanism shape only, written from the described steps.
// Integer-only state and replay; no donor code is translated.
interface Entity { id: number; x: number; y: number; hp: number; }
interface SimState { entities: Entity[]; rng: number; rngLast: number; }
interface Order { actor: number; dx: number; dy: number; }
interface ReplayFrame { tick: number; orders: Order[]; hash: number; }
interface Replay { seed: number; frames: ReplayFrame[]; }

// xorshift32 stands in for the donor's MT19937. Integer only; the state never leaves integer math.
function nextRng(state: number): number {
  let x = (state | 0) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x | 0;
}

// Position-weighted sum over entities in ascending id order, plus the RNG output AND the RNG state.
// Mirrors the shape of the donor's SyncHash; the donor folds only the last output (defect fixed here).
function syncHash(s: SimState): number {
  const sorted = [...s.entities].sort((a, b) => a.id - b.id);
  let n = 0;
  let ret = 0;
  for (const e of sorted) {
    const h = ((e.x * 5) ^ (e.y * 3) ^ (e.hp * 7)) | 0;
    const weight = Math.imul(n, 1 + e.id);
    ret = (ret + Math.imul(weight, h)) | 0;
    n++;
  }
  return (ret + s.rngLast + Math.imul(s.rng, 0x9e3779b1)) | 0;
}

// One fixed simulation step: apply this tick's orders, then advance the RNG once.
function step(s: SimState, orders: Order[]): void {
  for (const o of orders) {
    const e = s.entities.find((en) => en.id === o.actor);
    if (e !== undefined) {
      e.x = (e.x + o.dx) | 0;
      e.y = (e.y + o.dy) | 0;
    }
  }
  s.rng = nextRng(s.rng);
  s.rngLast = s.rng;
}

// Replay check: rebuild from the seed, re-run the recorded orders, compare the hash each tick.
// Returns the first tick whose hash differs, or null when the whole replay matches.
function firstDesyncTick(rep: Replay, initial: Entity[]): number | null {
  const s: SimState = {
    entities: initial.map((e) => ({ ...e })),
    rng: rep.seed | 0,
    rngLast: 0,
  };
  for (const f of rep.frames) {
    step(s, f.orders);
    if (syncHash(s) !== f.hash) return f.tick;
  }
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (tsc 7.0.2), exit 0.

## 5. Lands in

- TARGET `src/fight/sync-hash.ts` (new, proposed): the per-tick state hash over duel and many-on-one state, in id order, with the RNG state folded in. Replay check in `src/fight/record.ts` (proposed, same row).
- Parity row 19 (fight record/replay). Server tick sub-line not needed here.
- Reuse tag: adapt (shape only; GPL-3.0 copyleft, clean-room)
- Brief rule served: 1 (one engine: the hash and replay run in the engine, not in a client); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft: GPL-3.0. Shape only. The sketch is written from the mechanism, not translated.
- The lockstep wait (`OrderManager.cs` 202, 300-328) means one slow client stalls every client. Our server is the authority and must not wait on clients. Reject the wait; keep the hash and the replay.
- Defect: the hash folds only `SharedRandom.Last` (`World.cs` 503), not the generator state, so two streams in different states can agree on one tick. Fix: fold the state too (in the sketch).
- Defect: a malformed order is swallowed (`Order.cs` 240-244, HACK comment). If decoding differed between clients it would appear only as a later desync. Fix: reject the packet on the server, count it, and log it. Never silent.
- Wall-clock seed (`Server.cs` 307). Fix for us: the server draws the seed once, stores it on the fight record with the rule version.
- Floats: the donor's world positions are integers (`WPos.cs` 23). Our fight state must be integer or fixed-point before it is hashed. The Three.js client never writes sim state (kills are server-verified).
- Every object that changes HP, kill state or loot ownership must be in the hash, or it is a silent desync. The donor hashes synced effects separately (`World.cs` 499-500); we have to decide which of our objects count.
- Replay version: the donor stores replays per mod and version (`ReplayRecorder.cs` 48) and checks metadata version 1 (`ReplayMetadata.cs` 45). Fix for us: refuse to replay a fight recorded under another rule version.
- The desync dump is off by default and expensive (`OrderManager.cs` 107-109). For us: full per-tick reports only in tests; production keeps the hash only.
- A server-side replay on desync is a donor TODO (`Server.cs` 797). For us the server is the recorder, so the replay exists by construction.
- Not read: `Connection.cs`; the value of `TimestepJankThreshold`; the `NetFrameInterval` default; the `[VerifySync]` field list in the mods.

## 7. As-data shape

- Replay file (binary): records of `[int32 client id][int32 byte length][bytes]`. The bytes start with an int32 frame, and byte 4 is the order type (`ReplayConnection.cs` 50-60; `ReplayRecorder.cs` 87-89). Then a metadata block (`ReplayMetadata.cs` 53-70). Row fields: `client_id: int32`, `frame: int32`, `type: byte`, `payload: bytes`; metadata: `game_info: string`, `version: int32`.
- Game speed row (`mods/ts/mod.yaml` 281-306; `GameSpeed.cs` 24, 27): `name` (fluent key), `Timestep: int` (ms), `OrderLatency: int` (ticks). The default speed name is at `DefaultSpeed` (282).
- Synced field: a C# field or property with `[VerifySync]` (`Sync.cs` 24, 89). Types limited to int, bool and a short list.
- A new game speed is one row: yes (one YAML block with Timestep and OrderLatency). A new synced field: no (it is a C# member with an attribute; the hash function is generated from reflection). A new replay packet type: no (an enum value and code). A new replay file: yes (one record set per match, written by the recorder).

## 8. Provenance

- Repo: OpenRA (donor folder `/mnt/frankendom-donors/OpenRA-OpenRA`). Licence: GPL-3.0, from `COPYING` ("Version 3, 29 June 2007") and the file headers (`Sync.cs` 4-8, `OrderManager.cs` 4-8). Copyleft: the code is not reusable as contract; shape only.
- Files and lines as in section 2 and the receipts file.

## 9. What they patched later

No history available: the donor has no `.git` directory and no changelog file. Hidden rules that live in comments:
- `Order.cs` 240-241: HACK. A malformed order is ignored "that would have crashed the game" (decode-error workaround).
- `Server.cs` 1367: HACK. Non-playable players are set to null so that player indexes line up for replay tracking.
- `Server.cs` 797: TODO. A server-side replay on desync is wanted and not built.
- `Server.cs` 836: comment. The first client's defeat state is applied; any other disagreement is a desync.
- `OrderManager.cs` 243-244: comment. The frame sanity check is there "so we can crash early instead of desyncing."

## 10. Rulings for Dom

1. Should each fight be stored as seed, input log and rule version, so the server can re-run any fight and name the first tick where it differs? Recommend yes: the storage is small and it is row 19.
2. Should CI replay a fixed set of golden fights on every rule change and fail on the first differing tick? Recommend yes.
3. Should a fight replay be refused when its stored rule version differs from the current one? Recommend yes.

Best transferable idea: record each fight as seed, input log and rule version, and re-run it on the server in tests with a per-tick hash over id-ordered state, so the first divergent tick is named.

Decision (proposed): adapt. Keep the per-tick hash over id-ordered state and the replay-from-seed-and-inputs check for row 19, reject the lockstep wait (our server is the authority and must not wait for clients), and fold the RNG state (the donor's defect, fixed).
Acceptance: a server test records a 3-on-1 fight from one seed and an input log, re-runs it from the seed, and asserts the hash matches every tick; changing one damage constant makes the test name the first differing tick.
