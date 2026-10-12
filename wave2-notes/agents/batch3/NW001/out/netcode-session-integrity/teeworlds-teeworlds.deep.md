# teeworlds-teeworlds (netcode-session-integrity, cell 1)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` (server intake: `CServer::ProcessClientPacket` (803-1072), NETMSG_INPUT branch 907-962; tick loop: `CServer::Run` (1271-1442), input apply 1385-1402) | Licence: zlib-style permission text (`/mnt/frankendom-donors/teeworlds-teeworlds/license.txt`, read in full; the file names the copyright holder and states "The origin of this software must not be misrepresented"; it does not name MIT, Apache or BSD; data under CC-BY-SA 3.0 is not used) | C++ | symbol `CServer::ProcessClientPacket` (NETMSG_INPUT branch, 907-962)

Checked: Read end to end: server input branch (server.cpp 907-962), server tick loop input apply (1385-1402), `CGameContext::OnClientDirectInput` and `OnClientPredictedInput` (gamecontext.cpp 641-674), `CCharacter::OnPredictedInput` and `OnDirectInput` (character.cpp 480-511), `CPlayer::OnDirectInput` (player.cpp 235-265), client `SendInput` (client.cpp 380-417), client NETMSG_INPUTTIMING handler (client.cpp 1328-1346), `CSmoothTime` Init/Get/Update (client.cpp 136-231), `PREDICTION_MARGIN` and `CClient` enums (client.h 25-80), `SERVER_TICK_SPEED` (protocol.h 81), the validator generator and the schema (datasrc/compile.py 180-300, datasrc/datatypes.py 230-360, datasrc/network.py 85-105). Candidate files opened: 11 (server.cpp, gamecontext.cpp, character.cpp, player.cpp, client.cpp, client.h, protocol.h, compile.py, datatypes.py, network.py, network.cpp 318-335). Camera: not a camera cell. Confidence: high on the server intake and validation (read end to end, callers checked: the direct hook has one caller in the receive branch, the predicted hook one caller in the tick loop). Medium-high on the client smooth-time controller (Init, Get, Update read; the only caller read is the INPUTTIMING handler). Not read: `CCharacter::Tick` and `HandleWeapons` (what the character does with m_Input each tick), `CServer::DoSnapshot` and snapshot delta encoding beyond the ack field, `CClient` input-timing tuning in play, and the connection-token handshake beyond network.cpp 318-335.

## 1. Mechanism

- One intake point per client packet. Input arrives as NETMSG_INPUT with five parts: the snapshot the client last acknowledged (`m_LastAckedSnapshot`), the game tick the client intends the input for (`IntendedTick`), the payload size, the input ints, and a client-reported ping correction. (server.cpp 913-915, 948; client side writes them in that order at client.cpp 395-410.)
- Order of steps on the server, as the code runs:
  (a) Read the ack, the intended tick and the size (913-915). Reject the packet if the unpacker failed (checked here, before the payload and ping reads; the error flag is not re-checked after them, so a short packet silently yields zeros, 945-948) or the payload is larger than `MAX_INPUT_SIZE` (918-919; a negative `Size` passes this test). The ack is stored at 913 before this check and is never validated against issued snapshots. No rate check and no upper bound on `IntendedTick` is made here.
  (b) If the ack is above zero, set the snapshot rate to full (921-922).
  (c) If `IntendedTick` is above the client's watermark `m_LastInputTick`, send a timing reply: ms left until that tick starts, `TimeLeft = ((TickStartTime(IntendedTick)-Now)*1000) / time_freq()` (926-934). The comment at 925 says "skip packets that are old": that comment is only about this reply.
  (d) Set the watermark to `IntendedTick` unconditionally (936). An older packet therefore moves the watermark backwards.
  (e) If `IntendedTick <= Tick()`, move it to `Tick()+1` (940-941). A late input is not dropped; it runs one tick later.
  (f) Store the input in the client's 200-slot ring with its game tick (943, 958 wraps with `% 200`). Clamp the reported ping correction to 0..50 and derive latency from the acked snapshot time minus that correction, floored at zero (948-952).
  (g) Copy the input to `m_LatestInput` and call `OnClientDirectInput` (955, 962).
- `CGameContext::OnClientDirectInput` (641-655) validates the object with the generated validator and forwards it to `CPlayer::OnDirectInput` only if valid (644, 654). On the direct path, `CCharacter::OnDirectInput` (495-511) updates the latest input and, after two inputs (`m_NumInputs > 2`, line 504), runs weapon switch and fire immediately on receipt, but only for a non-spectator player (character.cpp 504). So a shot can land between ticks.
- Server tick loop (`CServer::Run`, 1271-1402): each game tick increments the tick (1385), then for every connected client scans its 200 slots for the first slot whose `m_GameTick == Tick()` (1397) and, if the client is in game, calls `OnClientPredictedInput` (1400). If no slot matches, nothing is called for that client on that tick.
- `OnClientPredictedInput` (657-674) does nothing at all while the world is paused (`m_World.m_Paused`, 659); otherwise it validates the same object again and forwards it to `CCharacter::OnPredictedInput` (672) only if valid. That function (480-493) updates `m_LastAction` when the input changed, copies the input into `m_Input` (487), increments `m_NumInputs` (488), and rewrites a zero aim vector to aim up (491-492).
- Validation is generated from a schema table in Python (datasrc/network.py 85-105). Each field is a range (`NetIntRange`), any value (`NetIntAny`), a bool, or a flag mask (`NetFlag`). The generator emits `CheckInt` and `CheckFlag` calls that return -1 on the first failing field (datatypes.py 338, 356; compile.py 187, 194). The object size must also equal the struct size (datatypes.py 236). A failure rejects the whole object; nothing is clamped.
- Client side. `CClient::SendInput` (380-417) skips until `m_PredTick > 0` (384), sends the ack tick, predicted tick, size, input and ping correction (395-411), and stores each input with its tick and predicted time (399-401). On the NETMSG_INPUTTIMING reply (1328), the client finds the stored input for that tick, computes a target (1339-1340: stored predicted time plus elapsed, minus `(TimeLeft - PREDICTION_MARGIN)`), and feeds it into `m_PredictedTime.Update(...)` (1346).
- `CSmoothTime::Update` (184-231) classifies each reply. A negative `TimeLeft` below -50 ms is a spike: the spike counter goes up 5 (capped at 50), and while the counter is under 15 the update is ignored and the badness score rises by 10 (191-205). Other late replies raise badness by 50 and double the adjust speed for that direction, up to 30 (210-212). On-time replies lower the spike counter, scale the adjust speed by 0.95 with a floor of 2.0 (217-224). Badness decays each call by `1 + badness/100` (230).
- `CSmoothTime::Get` (153-174) moves the displayed time toward the target a fraction per call: elapsed seconds times the adjust speed, capped at 1. The speed used is index 1 when the target is ahead, index 0 otherwise (161-169).

## 2. Key functions

- `CServer::ProcessClientPacket`, NETMSG_INPUT branch: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 907-962.
- `CServer::Run`, input apply in the tick loop: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/server/server.cpp` 1385-1402.
- `CGameContext::OnClientDirectInput` / `OnClientPredictedInput`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/gamecontext.cpp` 641-655 and 657-674.
- `CCharacter::OnPredictedInput` / `OnDirectInput`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/entities/character.cpp` 480-493 and 495-511.
- `CClient::SendInput`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/client/client.cpp` 380-417.
- `CClient::ProcessServerPacket`, INPUTTIMING branch: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/client/client.cpp` 1328-1346.
- `CSmoothTime::Update` and `Get`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/engine/client/client.cpp` 153-174 and 184-231.
- Validator generator: `/mnt/frankendom-donors/teeworlds-teeworlds/datasrc/compile.py` 185-196 and 266; per-field emitters `/mnt/frankendom-donors/teeworlds-teeworlds/datasrc/datatypes.py` 338 and 356.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-field schema check on every client input; reject the whole input, never clamp | Field ranges from the schema table: direction -1..1 (network.py 89), wanted weapon 0..NUM_WEAPONS-1 (101), player flags as a mask (97). The NUM_WEAPONS value is not read. |
| Input ring indexed by the tick the client intends | 200 slots (server.cpp 958; client.cpp 414 uses the same 200). |
| Late input runs on the next tick, not dropped | Rule: `IntendedTick <= Tick()` becomes `Tick()+1` (server.cpp 940-941). |
| Client-reported ping correction, clamped | 0..50 ms (server.cpp 948). |
| Server tick rate that the timing is measured against | `SERVER_TICK_SPEED = 50` ticks per second (protocol.h 81). |
| Client prediction margin | `PREDICTION_MARGIN = 1000/50/2`, which is 10 ms (client.h 75; the source calls it a "magic network prediction value"). |
| Spike filter for timing replies | Spike below -50 ms (client.cpp 191); counter step 5 (195), cap 50 (196-197), ignore while below 15 (200). |
| Badness score for timing quality | +10 per ignored spike (205), +50 per late reply (210), decay `1 + badness/100` (230). |
| Adjust speed for the smooth-time approach | Initial 0.3 (client.cpp 141), doubling cap 30 (211), decay 0.95 (222), floor 2.0 (223). |

## 4. TypeScript sketch

simplified: validates at receipt, not at tick time (the donor validates on both the direct and the predicted path). It drops the fire-on-receipt path entirely, because a fire that lands between ticks breaks one ledger. It omits the client smooth-time controller, the snapshot rate and snapshot delta bookkeeping, and the INPUTTIMING packet encoding. It keeps the watermark as a maximum (the donor assigns it unconditionally, so an older packet can move it backwards), and adds a `maxAheadTicks` bound on the intended tick (the donor has none). Time values are in ms in the sketch (the donor converts from `time_freq()` units). Every constant is taken from the donor, with the donor line in a comment.

```ts
// Licence: zlib-style (donor license.txt). Clean-room sketch of the mechanism, not a translation of the donor lines.
type Rule =
  | { kind: "range"; name: string; min: number; max: number }
  | { kind: "mask"; name: string; mask: number };

type RawInput = Record<string, number>;

interface Slot { gameTick: number; data: RawInput }

interface Intake {
  slots: (Slot | undefined)[];   // ring of input slots
  next: number;                  // next write index
  lastIntendedTick: number;      // watermark used to decide timing replies
  rejects: number;               // counted per client, not logged per packet
}

const RING_SLOTS = 200;            // donor: server.cpp:958 (% 200)
const PING_CORRECTION_MAX_MS = 50; // donor: server.cpp:948 clamp(..., 0, 50)

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function newIntake(): Intake {
  return { slots: new Array<Slot | undefined>(RING_SLOTS).fill(undefined), next: 0, lastIntendedTick: -1, rejects: 0 };
}

// Returns the first field that breaks its rule, or null. Reject the whole input; never clamp.
function firstFailure(rules: Rule[], input: RawInput): string | null {
  for (const r of rules) {
    const v = input[r.name];
    if (v === undefined || !Number.isInteger(v)) return r.name;
    if (r.kind === "range" && (v < r.min || v > r.max)) return r.name;
    if (r.kind === "mask" && (v & r.mask) !== v) return r.name;
  }
  return null;
}

interface Packet {
  intendedTick: number;
  data: RawInput;
  pingCorrectionMs: number;   // client-reported, clamped below
  ageMs: number;              // now minus send time of the snapshot the client acked
  msUntilTickStart: number;   // server-side timing for the reply
}

interface Outcome {
  timingReplyMs: number | null;
  accepted: boolean;
  latencyMs: number;
  rejectedOn: string | null;
}

// simplified: validates at receipt (donor validates at receipt for the direct path and again at tick time for the predicted path),
// drops the fire-on-receipt path entirely (donor calls OnDirectInput on receipt), omits the client-side smooth-time
// controller, the snapshot-rate and snapshot-delta bookkeeping, and the INPUTTIMING packet encoding. The watermark keeps the
// maximum (donor assigns it unconditionally, so an older packet can move it backwards).
// maxAheadTicks is zone data (our number; the donor has no bound at all, so a client could queue inputs arbitrarily far ahead).
function receive(c: Intake, p: Packet, currentTick: number, rules: Rule[], maxAheadTicks: number): Outcome {
  const timingReplyMs = p.intendedTick > c.lastIntendedTick ? p.msUntilTickStart : null;
  c.lastIntendedTick = Math.max(c.lastIntendedTick, p.intendedTick);

  const latencyMs = Math.max(0, p.ageMs - clamp(p.pingCorrectionMs, 0, PING_CORRECTION_MAX_MS));

  const bad = p.intendedTick > currentTick + maxAheadTicks ? "intendedTick" : firstFailure(rules, p.data);
  if (bad !== null) {
    c.rejects++;
    return { timingReplyMs, accepted: false, latencyMs, rejectedOn: bad };
  }

  // late input (its tick has already started) runs on the next tick, as in the donor (server.cpp:940-941)
  const gameTick = p.intendedTick <= currentTick ? currentTick + 1 : p.intendedTick;
  c.slots[c.next] = { gameTick, data: p.data };
  c.next = (c.next + 1) % RING_SLOTS;
  return { timingReplyMs, accepted: true, latencyMs, rejectedOn: null };
}

// Called once per server tick for each client (donor: server.cpp:1397-1400 scans the ring for GameTick == Tick()).
function inputFor(c: Intake, tick: number): RawInput | undefined {
  for (const s of c.slots) {
    if (s !== undefined && s.gameTick === tick) return s.data;
  }
  return undefined;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/nw001-teeworlds-input-intake.ts) exit 0, no output.

## 5. Lands in

- TARGET `src/fight/input-intake.ts` (new module, the single client-input intake for the Pit and zones; the file does not exist yet in the Frankendom repo as far as this reader knows; Frankendom side not read).
- Parity-checklist row 5 (controls and input). The server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) is where the tick-matched apply belongs; it is context, not the row cited.
- Reuse tag: adapt (zlib-style licence; code may be adapted; the sketch is clean-room TS written from the described mechanism).
- Brief rule served: server-verified actions (every client input is validated before the engine applies it); one engine (one intake path for the Pit and zones).

## 6. Gaps and risks

- Fire on receipt. The direct path runs weapon switch and fire the moment a packet arrives, after two inputs (character.cpp 504-506). That is not tick-aligned and would give a different order from the predicted path. Frankendom should fire only on the tick. The sketch does this.
- Watermark moves backwards. server.cpp 936 assigns the watermark unconditionally. The comment at 925 says old packets are skipped, but only the timing reply is skipped; the old packet still goes into a slot (943) and runs at `Tick()+1` (940-941). The sketch keeps the maximum.
- No per-client input rate limit. The intake branch (907-962) has no rate or count check. A client can send many NETMSG_INPUT packets per tick, each written into a new slot, and after 200 packets the ring wraps (958) and overwrites earlier slots. Frankendom needs an explicit cap (ruling 2 below).
- Validation is reject-only, and the log says "corrected". gamecontext.cpp 667 prints "corrected on" for a rejected input, and the input is not applied. The wording is wrong, not the behaviour. Both the rejection log (646) and this one print only when `Config()->m_Debug` is set, so in normal play a rejected input leaves no trace: Frankendom counts rejects always (the sketch's `rejects`). Keep the rejection; fix the message.
- Donor defects in the intake (keep the intake shape, fix these): (1) `m_LastAckedSnapshot` is stored at 913 before the error check at 918 and never validated against issued snapshots; (2) `Unpacker.Error()` is not re-checked after the payload and ping reads (945-948); (3) there is no upper bound on `IntendedTick`, so a client can queue inputs arbitrarily far ahead (the sketch takes `maxAheadTicks` as zone data); (4) a negative `Size` passes `Size/4 > MAX_INPUT_SIZE`. Fix: validate the ack, check the unpacker after every read, bound the tick window, and reject `Size < 0`.
- Predicted inputs are skipped while the world is paused (gamecontext.cpp 659); Frankendom must decide whether a paused zone queues or drops them.
- A tick with no input for a client triggers no call at all (server.cpp 1397-1400). What the character does on that tick is decided in `CCharacter::Tick`, which was not read. Frankendom must decide hold-last or neutral explicitly and test it.
- Ping correction is client-reported and clamped to 50 ms (948). A client can understate its latency by up to 50 ms. The donor uses the clamped value for `m_Latency`; what reads `m_Latency` was not read. Frankendom must not use this value for any ruling on hits.
- The smooth-time controller shifts the client's prediction clock. It is a client display and prediction tool. It must not decide a hit on the server. Frankendom's kills are server-verified, so this stays client-only.
- The donor's CSmoothTime comments say "magic" for the margin (client.h 75). Keep the margin as a named data field with a comment naming the measured value, not a magic constant.
- Licence: zlib-style text read in full; no GPL or Valve terms. Code may be adapted; this sketch is still written from the mechanism.

As-data shape:
- Donor table: `/mnt/frankendom-donors/teeworlds-teeworlds/datasrc/network.py` (the NetObject("PlayerInput", [...]) row list, lines 88-104) compiled by `datasrc/compile.py` (validator at 185-196 and 266) and `datasrc/datatypes.py` (per-field emitters 338, 356).
- Row fields: name (string), kind (range | any | bool | flag | enum), min and max (range), mask (flag). Example rows: `NetIntRange("m_Direction", -1, 1)` (network.py 89), `NetFlag("m_PlayerFlags", PlayerFlags)` (97), `NetIntRange("m_WantedWeapon", 0, 'NUM_WEAPONS-1')` (101).
- A new input field is one row: yes (the validator and the object size check are generated from the row). Caveat: the tick ring, the timing reply and the apply rule are engine code, not rows.

Provenance per claim:
- Donor repo: teeworlds-teeworlds, on the VPS at /mnt/frankendom-donors/teeworlds-teeworlds. Files and lines are in the receipts file (67 receipts, all verified by the gate verifier).
- Licence: zlib-style permission text, read in full at /mnt/frankendom-donors/teeworlds-teeworlds/license.txt. Permissive; code may be adapted. The data licence is CC-BY-SA 3.0 and is not used here.

What they patched later:
- No history available: the donor has no .git directory and no changelog; `.github` holds only `workflows`.
- In-code markers read: "magic network prediction value" (client.h 75); the "skip packets that are old" comment (server.cpp 925) that the code does not match for the watermark (936); "corrected" for a rejected input (gamecontext.cpp 667). These are open defects, not patches.

Rulings for Dom:
1. Invalid client input: reject the whole input and count it (donor behaviour), or clamp the field to its range? Recommendation: reject and count, never clamp; a clamped aim or move is a silent cheat surface.
2. Per-client input cap: add a cap of one applied input per tick per client (drop and count the rest)? Recommendation: yes; the donor has no cap and its 200-slot ring can be overwritten by a flood.
3. Fire timing: fire only on the server tick (Recommendation: yes), so the donor's fire-on-receipt path is not ported.

Best transferable idea: Validate every client input against a schema table of per-field ranges or masks, reject the whole input and count it, and apply each input only on the server tick it names, with a late input moved to the next tick.
Decision (proposed): adapt — keep the intake shape (schema validation, tick-named ring, late-to-next-tick, tick-matched apply) but fix the watermark, reject without clamping, fire only on the tick, and add the per-client cap the donor lacks.
Acceptance: a server test sends an input with m_Direction 2 (rejected; the player does not move; the reject counter goes to 1), then 201 inputs for future ticks inside one tick (only the cap is applied and the rest are dropped and counted), then one input further ahead than `maxAheadTicks` (rejected and counted), then one input for an already-started tick (applied on the next tick, never on the past tick).

Reuse tag: adapt (zlib-style licence; code may be adapted; sketch is clean-room TS)
Brief rule served: server-verified actions (client input is validated before the engine applies it); one engine (single intake for the Pit and zones)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- The "corrected on" and rejection logs print only when Config()->m_Debug is set (gamecontext 646, 664); the note implied always. OnClientPredictedInput is skipped while m_World.m_Paused (659), not noted; direct fire also requires a non-spectator team (character.cpp 504). The "unpacker failed" check at 918 covers only reads before it.
- Missed donor defects: (1) m_LastAckedSnapshot stored at 913 before the error check, never validated; (2) Unpacker.Error() not re-checked after payload and ping reads (945-948); (3) no upper bound on IntendedTick (the acceptance test depends on this); (4) negative Size passes the Size/4 test.

Fixed 2026-10-12: mechanism steps (a), predicted-input and direct-fire lines; gaps (debug-only logs, four intake defects, pause); sketch (and work/teeworlds-input-intake.ts) gained a maxAheadTicks bound; Acceptance adds the too-far-ahead case.
