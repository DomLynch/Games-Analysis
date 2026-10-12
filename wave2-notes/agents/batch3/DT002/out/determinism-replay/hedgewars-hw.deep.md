# hedgewars-hw (determinism-replay, cell 3)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uRandom.pas` (with `hedgewars/uCommandHandlers.pas`, `hedgewars/uCommands.pas`, `hedgewars/uIO.pas`, `hedgewars/uGears.pas`, `hedgewars/uGearsList.pas`, `hedgewars/uGearsHandlersMess.pas`, `hedgewars/uLand.pas`, `hedgewars/hwengine.pas`, `rust/lib-hwengine-future/src/gear.rs`, `rust/lfprng/src/lib.rs`, `rust/hedgewars-checker/src/main.rs`, `gameServer/OfficialServer/GameReplayStore.hs`) | Licence: GNU GPL version 2. `COPYING` is the GPLv2 text; `uRandom.pas` header says "version 2 of the License" with no "or later" clause. Copyleft: clean-room, shape only | Pascal, Rust, Haskell | symbol `SetRandomSeed` (plus `chNextTurn`)

Checked: Read `hedgewars/uRandom.pas` in full (104 lines); `hedgewars/uCommandHandlers.pas` 372-415 and 562-574; `hedgewars/uGearsHandlersMess.pas` 6878-6896; `hedgewars/uCommands.pas` 84-122; `hedgewars/uIO.pas` 290-335 and 392-450; `hedgewars/uGears.pas` 600-640; `hedgewars/uGearsList.pas` 990-1012; `hedgewars/uLand.pas` 1094-1112; `hedgewars/hwengine.pas` 92-100; `hedgewars/uUtils.pas` 239-252; `rust/lib-hwengine-future/src/gear.rs` 360-400; `rust/lfprng/src/lib.rs` in full; `rust/hedgewars-checker/src/main.rs` 14-60 and 140-170; `gameServer/OfficialServer/GameReplayStore.hs` in full; `ChangeLog.txt` (grep plus version lookup). Confidence: high for the seed, draw, per-turn fingerprint, stamped commands and remote compare (opened, traced, receipted). High for the two defects in section 6 (read the split function and the call). Medium on the Rust-port differences: both sources read, but I did not run either generator. Not read: `hedgewars/uGearsHedgehog.pas` 1580-1590 (seen only in grep), `hedgewars/uScript.pas` 3939 and 3972 (script writes to `CheckSum`, seen in grep only), `gameServer/EngineInteraction.hs` (the demo parser `replayToDemo`), `hedgewars/adler32.pas` body (the call site is read, not the function's maths), the Qt frontend. History: `ChangeLog.txt` only; the copy has `.hgtags` and `.hgignore` but no Mercurial store, so no commit ids. camera_scope: not applicable.

## 1. Mechanism

- **Shared seed, one generator per match.** The game starts with `SetRandomSeed(cSeed, false)` (`hwengine.pas` 97). The seed text is copied into a 64-word ring (`uRandom.pas` 43, 63-81). The copy is cut at 54 characters (68-69). The loop `for i:= t to 54` fills slots t to 54 with one odd constant, `$A98765 + 68` (80-81); slots 55 to 63 stay zero. Index `n` starts at 54, and a `|` in the seed ends the copy when `dropAdditionalPart` is set (70-72). The generator then runs 2048 steps before any draw (83-84).
- **The draw step** (`uRandom.pas` 52-61): each step advances a ring index and writes `ring[n + 40] + ring[n + 9]`, masked to 31 bits (56-58). Both taps are read from the ring itself, so the generator needs no other state. Index 40 is 24 back and index 9 is 55 back, mod 64, which matches the donor's comment. `GetRandom(m)` takes two steps and returns the second value mod `m` (95-96). `GetRandomf` takes two steps (89-90) and `rndSign` one (101).
- **History goes into the stream.** `AddRandomness(r)` XORs `r` into the ring at the current index (46-50). Game state is fed in at fixed points, so the stream depends on what both sides have seen: each tick (`uGears.pas` 637), each ammo step (`uGearsHandlersMess.pas` 6891), each gear deletion (`uGearsList.pas` 1004), and each turn end (`uCommandHandlers.pas` 396).
- **Fixed-step tick.** `GameTicks` advances once per tick (`uGears.pas` 639). The wire carries a 16-bit tick: `SendIPC` writes `GameTicks` into every outgoing message (`uIO.pas` 323). When the low 16 bits wrap, the local side sends a `#` message (`uGears.pas` 623-627), and the receiver adds one to `hiTicks` (`uIO.pas` 408-411). So a 32-bit time is `hiTicks shl 16 + loTime` (398).
- **Stamped synced commands.** Only commands in the synced set are buffered for the wire (`uIO.pas` 296-302 and 328-335). A remote command runs only when its stamp equals the local `GameTicks` (398), except commands `s`, `h`, `#`, `b`, `F` and `G`, which carry no usable stamp and run at once (399-403). A `#` may follow `N` in the same tick (397).
- **The per-turn fingerprint** (`uCommandHandlers.pas` 384-411): `GameTicks` is XORed into `CheckSum` (391). `CheckSum` is a global set to 0 once in `initModule` (`uVariables.pas` 2942) and never reset: every tick folds it into the RNG (`uGears.pas` 637) and every `Rand` command folds into it, so it is a running whole-game digest, not a fresh per-turn value (the sketch's `turnFingerprint` restarts from the tick each turn, a deliberate simplification). Then for each gear in list order it XORs in `gear_checksum(gear)` (395) and injects the running `CheckSum` into the RNG (396). The local side sends `N` plus the 32-bit `CheckSum` (402-405). The remote side stores the received value (`uIO.pas` 438-441) and, at its own turn end, fails with "Desync detected" if its `CheckSum` differs (408). The check is skipped when the current team has already gone (`CurrentTeam^.hasGone or ...`, 408), and only remote sources check at all (400).
- **The gear fingerprint** (`gear.rs` 374-380): the raw values of `x`, `y`, `d_x`, `d_y` are shifted left by 0, 1, 2 and 3 bits and folded with XOR.
- **Terrain digest.** At start the engine runs `sendlanddigest` (`hwengine.pas` 99). It computes Adler32 over every land row (`uLand.pas` 1104-1106) and sends `M<synced>|<land>` (1107). A different loaded map on any player stops the game (1094-1097).
- **Replay storage and check.** The server writes `show` of a tuple: teams at start, map params, params, and round messages (`GameReplayStore.hs` 57-59). It saves only when every player has a registered account (53). Loading reads the text back and rebuilds the demo (74-79). The Rust checker runs the engine on the file with sound and music off and `--stats-only` (`main.rs` 28-36) and reads the `WINNERS` or `DRAW` lines (46-49).
- **Argument fold for random-affecting commands.** When a console variable is flagged `Rand`, `ParseCommand` XORs `Read32(@CmdStr)`, `s[0]` and `GameTicks` into `CheckSum` (`uCommands.pas` 109-110). `CmdStr` holds the command name after the split (`uUtils.pas` 250-251); `s` holds the rest. See defect 1 in section 6.

## 2. Key functions

- `SetRandomSeed` (seed ring and 2048-step prime): `hedgewars/uRandom.pas` 63-85.
- `GetNext`, `GetRandom`, `GetRandomf`, `rndSign`: `uRandom.pas` 52-61, 87-102.
- `AddRandomness`: `uRandom.pas` 46-50.
- Turn-end fingerprint and send: `hedgewars/uCommandHandlers.pas` 384-411; seed command 566-574.
- Ammo-step fold: `hedgewars/uGearsHandlersMess.pas` 6879-6895.
- Tick loop and wrap message: `hedgewars/uGears.pas` 614-640.
- Command parse and synced fold: `hedgewars/uCommands.pas` 84-122.
- Wire time stamp and remote scheduling: `hedgewars/uIO.pas` 293-335 and 392-450.
- Land digest: `hedgewars/uLand.pas` 1094-1112.
- Gear fingerprint (Rust): `rust/lib-hwengine-future/src/gear.rs` 374-380.
- Replay save and load: `gameServer/OfficialServer/GameReplayStore.hs` 50-79.
- Checker: `rust/hedgewars-checker/src/main.rs` 14-60.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ring generator with two taps 24 and 55 back, 31-bit sums (uRandom 56-58) | Ring of 64 words (43); taps at 40 and 9 mod 64 |
| Prime the generator before the first draw (83-84) | 2048 steps |
| Seed text cut to a fixed length, rest ignored (68-69) | 54 characters |
| Unused slots (t to 54) filled with one odd constant (80-81) | `$A98765 + 68`, which is `0xA987A9` |
| Inject state into the generator at fixed points (46-50) | Every tick, ammo step, gear delete and turn end |
| 16-bit wire tick plus a high-word counter (323, 398, 623) | 65536 ticks per wrap |
| Per-gear fingerprint folded into a turn fingerprint (gear.rs 374-380; uCommandHandlers 391-396) | Shift amounts 0 to 3 |
| Remote compare once per turn end (uCommandHandlers 408) | Skipped when the current team has gone |

## 4. TypeScript sketch

simplified: clean-room. Written from the mechanism (shared seed, stamped commands, per-turn fingerprint, remote compare); it does not follow the donor's ring generator, XOR-with-shift fingerprint or call order. The changes from the donor: a splitmix-style mixer replaces the lagged Fibonacci ring; each field is multiplied by its own constant before the fold (the donor XORs shifted values); gears are sorted by id before folding (the donor folds in list order); the argument bytes are folded in, not the command name. It omits the land digest, the `#` wrap message, the Rust port, the replay file format, the checker, the synced-command set and the donor's skip rule for a team that has gone (the sketch returns a named skip instead). Typecheck only.

```ts
// Clean-room (donor licence GPL-2.0: shape only). Written from the mechanism: shared seed, stamped commands, per-turn fingerprint, remote compare. Not a translation of the donor.
interface Gear { id: number; x: number; y: number; dx: number; dy: number } // fixed-point values as integers
interface Stream { s: number } // one 32-bit state, advanced by draws and by injected history

// Avalanche mixer (murmur3 finaliser style): every input bit moves every output bit.
function mix32(a: number): number {
  let z = (a + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

// Seed both sides from the same text (FNV-1a over the characters, then mixed).
function seedStream(seed: string): Stream {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return { s: mix32(h) };
}

// One draw in [0, 2^32).
function next(st: Stream): number {
  st.s = (st.s + 0x9e3779b9) >>> 0;
  return mix32(st.s);
}

// Inject history into the stream, so later draws depend on everything both sides have seen.
function addRandomness(st: Stream, v: number): void {
  st.s = mix32((st.s ^ v) >>> 0);
}

// Per-gear fingerprint: each field is multiplied by its own odd constant and added (not XOR with shifts).
const K = [0x9e3779b1, 0x85ebca77, 0xc2b2ae3d, 0x27d4eb2f];
function gearFingerprint(g: Gear): number {
  const fields = [g.x, g.y, g.dx, g.dy];
  let acc = 0;
  for (let i = 0; i < 4; i++) acc = (acc + Math.imul(fields[i] | 0, K[i])) >>> 0;
  return mix32((acc ^ g.id) >>> 0);
}

// Turn-end fingerprint. Gears are sorted by id first, so the order of the list cannot change the result.
function turnFingerprint(tick: number, gears: Gear[], st: Stream): number {
  let fp = mix32(tick >>> 0);
  const ordered = [...gears].sort((a, b) => a.id - b.id);
  for (const g of ordered) {
    fp = mix32((fp ^ gearFingerprint(g)) >>> 0);
    addRandomness(st, fp);
  }
  return fp;
}

// Remote compare. A skip (player left) is returned as a named result so the caller can log it; it is never silent.
interface TurnCheck { ok: boolean; skipped?: 'player-left' }
function compareTurn(local: number, remote: number | null, playerLeft: boolean): TurnCheck {
  if (playerLeft) return { ok: true, skipped: 'player-left' };
  return { ok: remote !== null && local === remote };
}

// Synced commands run only at the tick they were stamped with, so both sides apply them at the same tick.
interface Stamped { tick: number; cmd: string; arg: string }
function runAt(tick: number, queue: Stamped[], apply: (c: Stamped) => void): Stamped[] {
  const rest: Stamped[] = [];
  for (const c of queue) {
    if (c.tick === tick) apply(c);
    else rest.push(c);
  }
  return rest;
}

// Fold the argument bytes (not the command name) into the stream for commands that draw random numbers.
function foldArgument(st: Stream, c: Stamped): void {
  let h = 0x811c9dc5;
  for (let i = 0; i < c.arg.length; i++) h = Math.imul(h ^ c.arg.charCodeAt(i), 0x01000193) >>> 0;
  addRandomness(st, mix32((h ^ c.tick) >>> 0));
}
```

## 5. Lands in

- TARGET `src/fight/fingerprint.ts` (new): the per-turn fingerprint over gears sorted by id, the stamped-command runner and the argument fold. Parity-checklist row 19 (fight record / replay). The fingerprint is a drift signal for the record, not a kill authority.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room only; the sketch above is written from the mechanism, and the donor's ring generator is not used)
- Brief rule served: 1 (one engine: the fingerprint runs on the same gear state the engine uses); server-verified kills (the fingerprint can flag drift; it never decides a kill).

## 6. Gaps and risks

- **Defect 1, the argument is not folded.** `ParseCommand` XORs `Read32(@CmdStr)` (`uCommands.pas` 110). After the split, `CmdStr` is the command name (`uUtils.pas` 250-251), so the fold reads the name's length byte and first three characters. The argument bytes in `s` are folded only through `s[0]`, its length (110). Two clients that send the same command name with different arguments can keep the same checksum. Bytes after a short name come from the buffer; I did not read what they hold. fix: fold the argument bytes (`s`), as `foldArgument` does.
- **Defect 2, the RNG depends on gear list order.** The XOR of gear checksums is order-free (`uCommandHandlers.pas` 393-398), but `AddRandomness` is called per gear inside the loop (396), so the injected values depend on list order. Two clients whose gear lists differ in order will diverge in later draws even when every gear matches. fix: fold in id order (`turnFingerprint` sorts), or inject once after the fold.
- **Defect 3, a weak fold.** `gear_checksum` XORs four shifted values (`gear.rs` 374-380). XOR cancels: two different gear states can give the same value, so the turn check can miss the change. fix: multiply each field by its own odd constant before adding, as `gearFingerprint` does. Keep the per-turn check; the fix is only the mixing.
- **Defect 4, the check is skipped for a team that has gone.** `checkFails(CurrentTeam^.hasGone or (CheckSum = lastTurnChecksum), ...)` (`uCommandHandlers.pas` 408) passes whenever the current team has gone. The desync-on-quit fixes in the changelog (section 7) sit here. fix: keep the skip, but return it as a named result and write it to the ledger (`compareTurn`); never skip silently.
- **Defect 5, two generators disagree.** The Rust port `lfprng` starts its ring at `0xa98765` (`lfprng/src/lib.rs` 10), while the Pascal unit fills with `0xA987A9` (`uRandom.pas` 81). The Rust sum has no 31-bit mask (lfprng 36-37), where the Pascal sum has one (`uRandom.pas` 58). The Rust port also fills all 64 slots with `0xa98765` (Pascal leaves 55-63 zero), starts its index at 0 (Pascal at 54) and has no `|` drop, so the two generators disagree from the first draw. Its test (lfprng 109-123) checks only the port's own numbers. I did not run either. fix: pick one generator; if a port exists, check it against vectors printed by the reference engine.
- **Defect 6, the checker only checks the final winner.** `main.rs` 49-56 reads `WINNERS` or `DRAW`. A replay can end with the same winner after a per-turn drift. fix: the replay verifier compares per-turn fingerprints, not only the result.
- **Gating, replays only for registered accounts** (`GameReplayStore.hs` 53). Guest fights leave no record to check. fix: a Frankendom PvP fight always gets a record; the retention length is for Dom to set (ruling 2).
- **Frankendom rulings.** Hedgewars is peer-to-peer lockstep, where each client runs the same sim. Frankendom's server runs the sim, so the fingerprint becomes a drift alarm for any client-side engine copy. Kills stay server-verified. MAX_ATTACKERS = 3 does not change the fold; the sort by id keeps 3-on-1 fights order-free.

## 7. Pass-2 additions

**As-data shape.** The replay record is the `show` text of a tuple: teams at start, `mapParams` as key/value pairs, `params` as key/value pairs, and `roundMsgs`, a list of strings (`GameReplayStore.hs` 57-59). Each round message is a command string. The engine's wire format for a command is a code character (`isSyncedCommand` lists the codes, `uIO.pas` 296-302), a payload, and a 16-bit tick stamp written at the end (`uIO.pas` 323, 326). I did not confirm that `roundMsgs` holds the same bytes. Row fields for Frankendom: `{ fight_id: string, seq: int, code: string, payload: string, tick_lo: uint16 }`. A new command code that must run at a stamped tick is not one row; the exempt codes `s`, `h`, `#`, `b`, `F`, `G` (`uIO.pas` 399-403) are a second list to edit. A new X is one row: no for a new command code, which needs an edit to the synced set (`uIO.pas` 296-302) and a case in the dispatch (406-447); a new console variable is one registration in code, not a data row (`uCommands.pas` 102-117 walks the linked list of registered variables).

**Provenance per claim.** Donor: hedgewars-hw (Mercurial origin; the copy has `.hgtags` and `.hgignore` but no store, so no changeset ids). Licence GPL-2.0 (`COPYING`; `uRandom.pas` 5-7). Every claim above has a receipt in `DT002/receipts.tsv` with file and line; claims without a receipt are marked "(not read)" in the Checked line or described as my reading.

**What they patched later** (ChangeLog.txt, version from the `=====` heading above each entry):
- 0.9.11: "Fix game desync when oneof players quits" (line 1475); "Fix initial room map config desync" (1477).
- 0.9.12: "Fix some desync causes" (1458).
- 0.9.17: "desync on quits" among other engine bugfixes (1252). The skip for a team that has gone sits in the same area of code; the changelog line does not say it is the origin (inference).
- 0.9.18: "Detect desyncs early" (1214). Likely the per-turn check (inference; the changelog line does not say).
- 0.9.19: "Split seed with '|' to keep the land shape but change the hog placement" (1182); "Desync fixes" (1186). The `dropAdditionalPart` argument (`uRandom.pas` 74) comes from the first.
- 0.9.24: "Fix possible network desynchronization and crash when players rejoin an active game" (517).
- Code comments: `uIO.pas` 397 (only `#` may follow `N` in a tick) and 401 ("must be synced for saves to work"); `uRandom.pas` 68-69 ("not 55 to ensure we have odd numbers").

**Rulings for Dom** (at most three):
1. Should a Frankendom fight keep a per-turn fingerprint as a drift alarm between the server and any client-side engine copy? Recommendation: yes, as an alarm only; it never decides a kill.
2. Should every PvP fight keep its record, including guest-only fights (Hedgewars keeps only registered-account fights)? Recommendation: yes; the retention length is your call.
3. When a fight ends because a player left, should the fingerprint check still run? Recommendation: yes, and a mismatch goes to the ledger rather than being skipped silently.

**Weight for a Core slice this week.** Row 19 (fight record and replay): the Core slice stores the record rows above for each duel and runs the per-turn fingerprint at each turn end. Row 1 (duel step) gets the id-ordered fold and the argument fold, which the duel step needs before any random command is added.

**Acceptance:** a stored fight record replays to the same per-turn fingerprints; moving one gear by one unit changes the next turn's fingerprint; reordering the gear list does not; changing only a command argument (not its name) changes the fingerprint; a skipped check appears in the ledger with its reason.

Best transferable idea: fold the game's state into a per-turn fingerprint and into the random stream at the same fixed points on both sides, so a drift shows up at the next turn end instead of as a silent wrong result.
Decision (proposed): adapt — keep the per-turn fingerprint, the history-fed stream and the stamped commands; fix the argument fold, the order-dependent injection and the XOR fold; keep the team-gone skip only as a logged result.
Acceptance: the record replay, gear-move, gear-order and argument tests above all pass; a skipped check appears in the ledger.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR (all errors confirmed against the donor on the VPS).
- "Unused slots get +68 (81)": loop is `for i:= t to 54`, slots 55-63 stay zero in Pascal; Rust fills all 64, starts index 0 (Pascal n=54), no `|` drop. Defect 5 understated. Confirmed.
- "Remote command runs only when stamp equals GameTicks (398)": `uIO.pas` 399-403 exempts `s`, `h`, `#`, `b`, `F`, `G`; the sketch `runAt` has no exemptions. Confirmed.
- Section 7 stated the 0.9.17 and 0.9.18 changelog lines as origins of the team-gone skip and the per-turn check; the changelog does not say so. Inference, now marked.
- As-data row is invented for Frankendom (already flagged); `roundMsgs` byte equality unconfirmed (already flagged).
- Missed: `CheckSum` is initialised once (`uVariables.pas` 2942), never reset, and folded every tick (`uGears.pas` 637): a running whole-game digest, not per-turn. Confirmed.

Fixed 2026-10-12: seed fill range, Rust-port differences (defect 5), the stamp exemptions, the running-digest wording, and the two changelog claims marked as inference. Sketch code unchanged: `runAt` is the stamped-command shape only and the exemption list is documented in section 7 as a Frankendom decision (a Frankendom server fight needs no unstamped client commands), so no typecheck needed.
