# smogon-pokemon-showdown (determinism-replay, cell 1)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/prng.ts` (with `sim/battle.ts`, `sim/battle-stream.ts`, `sim/battle-queue.ts`, `sim/state.ts`, `sim/dex.ts`, `server/room-battle.ts`) | Licence: MIT (LICENSE: "The MIT License (MIT)", Copyright (c) 2011-2026 Guangcong Luo and other contributors); code may be adapted | TypeScript | symbol `PRNG`

Checked: Read `sim/prng.ts` in full (329 lines) and `server/verifier.ts` in full. Read ranges of `sim/battle.ts` (215-240, 280-380, 405-470, 2265-2400, 2996-3030), `sim/battle-stream.ts` (15-140, 180-200, 390-440), `sim/state.ts` (20-160, 400-430), `sim/battle-queue.ts` (405-425), `server/room-battle.ts` (570-610), `test/sim/misc/prng.js` and `test/sim/misc/state.js`. Confidence: high for the RNG, speed-tie and input-log claims (opened, receipted, order traced). Medium for "a stored input log replays to the same battle": the donor's tests cover serialize-and-restore every turn, but I found no donor test that replays a saved log, and I did not run one. Not read: the `ts-chacha20` library, most of `sim/battle-actions.ts` (only the damage call sites), the client. Desync checksums: none found; grep for checksum, desync and hash in `sim/`, `server/room-battle.ts` and `server/replays.ts` returned no hits. camera_scope: not applicable.

## 1. Mechanism

- **One stream per battle.** The battle builds one `PRNG` from its seed (`sim/battle.ts` 224) and keeps the seed it started with as `prngSeed` (225). Every random decision goes through `battle.random`, `randomChance` or `sample`, which call that one stream (battle.ts 346-357). Inside `sim/` (excluding tools), `Math.random` appears only in `sim/prng.ts`: the gen5 default seed (299-302) and a commented-out gen3 block (313 onward). A seedless `PRNG` takes a seed from `crypto.getRandomValues` (prng.ts 160-161, 218).
- **Two algorithms (plus a legacy branch), chosen by the seed prefix** (prng.ts 59-68; a third branch at 64-65 sends any seed starting with a digit, the old numeric comma format, to `Gen5RNG` too, and a constructor converts old array seeds to a string, 47-50; module comment at 36 says the same). `sodium,<32 hex>`: ChaCha20 keystream over a zero buffer with a fixed nonce (202). Each draw replaces the 32-byte key with the first 32 bytes of output (205) and reads the next 4 bytes as a big-endian u32 (207). The whole state is that 32-byte key. `gen5,<four 16-bit hex>`: 64-bit LCG x' = a*x + c with a = 0x5D588B656C078965 and c = 0x269EC3 (286-287, 291); output is the upper 32 bits (248).
- **Mapping** (prng.ts 99, 101, 116): `random()` = u32 / 2^32; `random(n)` = floor(u * n / 2^32); `random(m, n)` = floor(u * (n - m) / 2^32) + m; `randomChance(p, q)` = `random(q) < p`.
- **Order of work in a turn** (battle.ts 2996-3016): `commitChoices` first calls `updateSpeed()` (2997), keeps the old queue aside, then writes each side's choice to the input log (3009), then the sides commit, then `queue.sort()` (3016) calls `speedSort` (`sim/battle-queue.ts` 418-420; battle.ts 433-466). `speedSort` is a selection sort on a comparator. `comparePriority` (battle.ts 408-415) orders by order (low first), then priority, then speed (high first), then subOrder and effectOrder. Each group of equal keys with more than one member is shuffled with the same stream (battle.ts 459-460; prng.ts 150-157). A speed tie therefore costs (group size - 1) draws, and every later draw depends on how many ties there were.
- **Damage uses one draw.** `random(16)` gives an offset of 0-15, so the roll is 85-100 percent (battle.ts 2397), then truncated by `tr` (Dex `trunc` = `num >>> 0`, `sim/dex.ts` 365-367). Modifiers are fixed-point: each factor times 4096, truncated, chained with +2048 and >> 12 (battle.ts 2314, 2322).
- **Input log (the replay record).** A list of text lines, not a table. Written in this form: `>start <JSON>` with formatid and seed (battle.ts 280-291); `>version <head>` and `>version-origin <origin>` before `>start` when build info exists (285-290); `>player <slot> <JSON>` (3252); `>p1 <choice>` and so on for each committed turn (3009); `>tiebreak` (1474); `>forcewin <side>` or `>forcetie` (1516); `>forcelose <side>` (battle-stream.ts 111); `>chat` lines, including the `chat-inputlogonly` record type that writes to the log only (121-125); `>reseed <seed>` (`sim/battle-stream.ts` 114-116); `>chat`, `>eval`, `>editbattle` (battle-stream.ts 122-188). There are no turn markers. An `undo` message is not logged at all (battle-stream.ts 94-95); only the final choice at commit time is written, so the log never shows an undone choice. A turn is complete when every side has a choice; the commit throws "Not all choices done" otherwise (battle.ts 3005). Replay = feed the same lines into a fresh `BattleStream`: `_writeLine` switches on the record type (battle-stream.ts 76-140) and `start` builds the battle. The server does the same with a stored log (`server/room-battle.ts` 577-578) and reads player names back out of the JSON text (596-603).
- **Save and load** (`sim/state.ts`). `serializeBattle` writes the current stream state (line 68), the starting seed as `prngSeed` (it is not in the `BATTLE` skip set; read back at 89) and the queue (73). `deserializeBattle` rebuilds the battle from the starting seed, then sets `battle.prng = new PRNG(state.prng)` (149). The stream resumes at the saved draw. For sodium the saved state is the 32-byte key; for gen5 it is the 64-bit value.
- **Spectating from a log.** `BattleStream` with `replay: 'spectator'` sends only channel 0 lines (battle-stream.ts 61-62). `getPlayerStreams` (396-440) splits one update into an omniscient view (channel -1), a spectator view (channel 0, line 437) and one view per player. Hidden information uses `|split|pN` protocol lines that carry a secret line for player N and a shared line for everyone else (battle.ts 33, 35-56).
- **Desync detection: none in this donor.** No per-turn state hash or checksum exists in the sim or the room code. `server/verifier.ts` checks a login signature (line 5, 21-25), not battle state.

## 2. Key functions

- `PRNG` constructor and `setSeed`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/prng.ts` 45-69 (seed dispatch: sodium at 59-60, gen5 at 61-63).
- `PRNG.random`, `randomChance`, `shuffle`: prng.ts 91-103, 115-117, 150-158.
- `SodiumRNG.next`: prng.ts 198-208. `Gen5RNG.next` and `nextFrame`: prng.ts 246-249 and 285-295.
- `Battle` constructor (seeds the stream, writes the start record): `sim/battle.ts` 224-235 and 280-291.
- `Battle.commitChoices`: battle.ts 2996-3030 (choice log at 3009, queue sort at 3016).
- `Battle.speedSort` and `comparePriority`: battle.ts 408-415 and 433-466.
- `Battle.resetRNG`: battle.ts 360-363.
- `BattleStream._writeLine` (record switch): `sim/battle-stream.ts` 76-140.
- `getPlayerStreams`: battle-stream.ts 396-440.
- `State.serializeBattle` and `deserializeBattle`: `sim/state.ts` 61-75 and 84-151.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One stream per battle; the stream state is the whole save | Seed format `sodium,` + 32 hex = 128 bits (prng.ts 210-227, from crypto) |
| Draw maps to [0, n) by multiply and floor (prng.ts 99) | None |
| Fisher-Yates over each speed-tie group, (size - 1) draws (battle.ts 459-460) | None |
| Turn order: order, then priority, then speed, then subOrder, then effectOrder (battle.ts 408-415) | Key list is Showdown's; the values come from moves and species |
| Damage roll offset 0-15 gives 85-100 percent (battle.ts 2397) | 16 and 100 are the cartridge-style roll |
| Fixed-point modifier: factor times 4096, +2048, >> 12 (battle.ts 2314, 2322) | 4096 is the scale |
| Gen5 LCG (prng.ts 286-291) | a and c are the cartridge constants |

## 4. TypeScript sketch

simplified: keeps the donor's selection-sort swaps and the tie shuffle, for one numeric key (speed, highest first); it does not run the five-key `comparePriority`. It replaces ChaCha20 and the gen5 LCG with xorshift32 as a stand-in, so the seed format is not donor-compatible. It omits the mid-turn switch insertion that keeps the old queue after the new sort (battle.ts 2996-3016), undo, the admin records (forcewin, forcetie, eval, editbattle), the `|split|` hidden-information lines, and the damage roll and fixed-point multipliers. It keeps the donor's order of work (log the choices, then sort) and the rule that a turn ends when every side has one choice. Typecheck only; the replay was not run.

```ts
// Licence: MIT (donor). Shape re-expressed from sim/prng.ts, sim/battle.ts (speedSort, commitChoices, inputLog) and sim/state.ts. Not a line-by-line port.
type Seed = string; // "xs32,<8 hex digits>": algorithm name first, so an old log keeps its algorithm
interface Rng { s: number } // the whole generator state: one non-zero u32

function parseSeed(seed: Seed): Rng {
  const [algo, hex = ''] = seed.split(',');
  if (algo !== 'xs32') throw new Error(`unknown rng algo: ${algo}`);
  const s = parseInt(hex, 16) >>> 0;
  if (!s) throw new Error('xs32 state must be non-zero');
  return { s };
}
const seedOf = (r: Rng): Seed => `xs32,${r.s.toString(16).padStart(8, '0')}`;

// One draw (xorshift32). The state is the only thing that advances, so saving the state saves the stream position.
function next(r: Rng): number {
  let x = r.s;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  r.s = x;
  return x;
}

// randInt(r, n) in [0, n); randInt(r, m, n) in [m, n). Same mapping as PRNG.random: floor(u32 * width / 2^32).
function randInt(r: Rng, a: number, b?: number): number {
  const u = next(r);
  if (b === undefined) return Math.floor((u * a) / 2 ** 32);
  return Math.floor((u * (b - a)) / 2 ** 32) + a;
}

// Fisher-Yates on [lo, hi), drawing from the SAME stream, as the battle's shuffle does.
function shuffleRange<T>(r: Rng, items: T[], lo: number, hi: number): void {
  for (let i = lo; i < hi - 1; i++) {
    const j = randInt(r, i, hi);
    if (j !== i) [items[i], items[j]] = [items[j], items[i]];
  }
}

// Order by one numeric key, highest first. Donor-style selection: find the top tie group, swap it to the front,
// then shuffle that group with the same stream. Each tie group costs (group size - 1) draws.
function speedSort<T>(r: Rng, list: T[], key: (x: T) => number): void {
  let sorted = 0;
  while (sorted + 1 < list.length) {
    let top = key(list[sorted]);
    let idx: number[] = [sorted];
    for (let i = sorted + 1; i < list.length; i++) {
      const k = key(list[i]);
      if (k > top) { top = k; idx = [i]; } else if (k === top) idx.push(i);
    }
    for (let i = 0; i < idx.length; i++) {
      const from = idx[i];
      if (from !== sorted + i) [list[sorted + i], list[from]] = [list[from], list[sorted + i]];
    }
    if (idx.length > 1) shuffleRange(r, list, sorted, sorted + idx.length);
    sorted += idx.length;
  }
}

interface Choice { side: string; choice: string; speed: number }
type Line =
  | { kind: 'start'; seed: Seed }
  | { kind: 'choice'; side: string; choice: string }
  | { kind: 'reseed'; seed: Seed };

class Fight {
  rng: Rng;
  readonly startSeed: Seed;
  log: Line[];
  constructor(seed: Seed) {
    this.rng = parseSeed(seed);
    this.startSeed = seed;
    this.log = [{ kind: 'start', seed }];
  }
  // Order of work: log the choices first, then sort the turn (as commitChoices does).
  commitTurn(choices: Choice[]): Choice[] {
    for (const c of choices) this.log.push({ kind: 'choice', side: c.side, choice: c.choice });
    return this.orderTurn(choices);
  }
  orderTurn(choices: Choice[]): Choice[] {
    const order = choices.slice();
    speedSort(this.rng, order, c => c.speed);
    return order;
  }
  reseed(seed: Seed): void {
    this.rng = parseSeed(seed);
    this.log.push({ kind: 'reseed', seed });
  }
  // Save: the start seed, the current stream state and the record. Enough to resume exactly.
  save(): string {
    return JSON.stringify({ startSeed: this.startSeed, rng: seedOf(this.rng), log: this.log });
  }
  static load(text: string): Fight {
    const o = JSON.parse(text) as { startSeed: Seed; rng: Seed; log: Line[] };
    const f = new Fight(o.startSeed);
    f.rng = parseSeed(o.rng);
    f.log = o.log;
    return f;
  }
}

// Replay a record. The record has no turn markers: a turn ends when every side has one choice.
function replay(lines: Line[], sides: number, speedOf: (side: string) => number): Choice[][] {
  const turns: Choice[][] = [];
  let fight: Fight | null = null;
  let pending: Choice[] = [];
  for (const line of lines) {
    if (line.kind === 'start') { fight = new Fight(line.seed); continue; }
    if (!fight) throw new Error('a record must start with a start line');
    if (line.kind === 'reseed') { fight.reseed(line.seed); continue; }
    pending.push({ side: line.side, choice: line.choice, speed: speedOf(line.side) });
    if (pending.length === sides) {
      turns.push(fight.orderTurn(pending));
      pending = [];
    }
  }
  return turns;
}
```

## 5. Lands in

- TARGET `src/fight/record.ts` (new): the fight record (start seed, ordered choices, reseeds), `save()` and `load()` that keep the stream position, and the turn-order step. Parity-checklist row 19 (fight record/replay). Speed-tie order also touches row 1 (duel step/sim) but the row named here is 19.
- Reuse tag: adapt-idea (MIT: code may be adapted; the sketch is a re-expression, not a copy)
- Brief rule served: 1 (one engine: the record and the sort are engine code; the Pit and zones only display it). Kills follow from the server's record, so they stay server-verified.

## 6. Gaps and risks

- **One stream for every roll.** A new tie or a new roll shifts every later draw, including loot. Frankendom keeps the idea and fixes the defect: derive named sub-streams (damage, ties, loot, spawns) from one fight seed, so a change in one purpose cannot move another's draws. fix: named sub-streams.
- **Ties consume draws.** The count of ties changes the stream. Same fix; add a test that changing only the loot table does not change the duel's hits.
- **Admin lines share the log with choices.** `forcewin`, `forcetie`, `eval`, `editbattle` and `reseed` sit in the same record as choices. The donor's own comment says an eval that touches the log "would double-play the change" on replay (battle-stream.ts 131-132). Frankendom: keep GM actions out of the fight record and write them as separate ledger rows (one ledger).
- **`random(m, 0)` silently changes meaning.** When the upper bound is 0 the call falls to the one-argument branch (prng.ts 98-99) and returns a value in [0, m). fix: our RNG asserts `b > a` for the two-argument form.
- **Truncation wraps negatives.** `num >>> 0` turns a negative number into a large unsigned one (dex.ts 366-367; JS semantics, not run). fix: clamp damage and heal to >= 0 before any truncation.
- **Gen5 default seed uses Math.random** (prng.ts 299-302). fix: nothing in `src/fight` may call `Math.random`; seeds come from the server's crypto source.
- **The client must not draw.** The donor's sort and damage roll run wherever the battle runs. Frankendom: only the server runs `orderTurn` and rolls; the client animates results it is sent.
- **No desync check in the donor.** Frankendom's fingerprint receipts need a per-turn state hash. That is new work, not copied from here.
- **Test shape to copy.** The donor's state test serializes, reloads and restarts the battle every turn and compares normalised JSON with a control run (`test/sim/misc/state.js` 26-39). Acceptance below.

## 7. Pass-2 additions

**As-data shape.** The donor's record is text lines. Row fields as the donor writes them: `type` (string: start, player, p1-p4, reseed, forcewin, forcetie, tiebreak, chat, eval, editbattle), `payload` (string: JSON for start and player, choice text for pN, seed for reseed). Frankendom row shape: `{ fight_id: string, seq: int, kind: enum('start','choice','reseed'), side: string | null, payload: string }`. A new X is one row: no, in the donor (a new record type needs a case in the `_writeLine` switch, battle-stream.ts 76-140, plus replay code). Yes in Frankendom only if `kind` is a row in a kinds table and the turn code does not change; a new choice kind that changes turn order is not a row.

**Provenance per claim.** Donor: smogon/pokemon-showdown, copy at `/mnt/frankendom-donors/smogon-pokemon-showdown` (no `.git` directory, so no commit ids). Licence MIT (LICENSE file). Every claim has a receipt in `DT002/receipts.tsv` with file and line.

**What they patched later.** No history available in git (no `.git` in the donor copy). In-code history only: prng.ts 48 "compat for old inputlogs" (array seeds still accepted); prng.ts 147-148 says the speed-tie rule follows an external issue; battle.ts 2366-2367 says the 16-bit nature truncation only affects Eternatus-Eternamax in Pure Hackmons; battle-stream.ts 115 and 131-132 document the eval caveats; prng.ts 212 is a TODO on a typing workaround.

**Rulings for Dom** (at most three):
1. Should each fight get named RNG streams (damage, speed ties, loot, spawns) from one fight seed, instead of the donor's single stream? Recommendation: yes, so a change to ties never moves loot rolls.
2. How long should a PvP fight record be kept, and should every PvP fight keep one? Recommendation: keep one for every PvP fight; the retention length is your call.
3. Should GM or admin actions ever enter a fight record? Recommendation: no; they go to the ledger as separate rows.

**Weight for a Core slice this week.** Row 19 (fight record) is the one a Core slice uses: store seed and choices for each duel and add a replay test. Row 1 (duel step) takes the speed-tie order.

**Acceptance:** a server test runs 200 seeded duels, stores each record, replays it from the record alone, and asserts identical HP, log lines and kill result; a second test saves a duel at turn 5, loads it, and asserts the rest of the run matches the uninterrupted run.

Reuse tag and Brief rule are in section 5.

Best transferable idea: one seed plus an ordered choice log rebuilds any fight exactly, and saving the RNG's position lets a fight resume mid-way.
Decision (proposed): adapt — keep one seeded record per fight with save/restore of the stream position, but split the stream into named sub-streams and keep GM actions out of the record; the donor's replay and save shape fits row 19 and server-verified kills, and its single-stream defect is fixable.
Acceptance: the 200-duel replay test and the save-at-turn-5 test both pass, and changing only the loot table leaves every duel hit unchanged.

Added 2026-10-12 (checker, verified battle.ts 358-362): `Battle.resetRNG(seed)` treats `undefined` as the starting seed but `null` as "roll a new seed" (the comment says so). The `>reseed` record logs the resulting seed (battle-stream.ts 116), so replay stays correct, but the null/undefined distinction is a likely porting bug; fix: make the reset target explicit (`resetToStart()` vs `reseedFresh()`).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- setSeed has a third branch (digit-leading legacy seeds go to Gen5RNG) not listed under 'two algorithms'.
- Input-log record list omitted >version, >version-origin, >forcelose, >chat-inputlogonly (and undo, which is in fact not logged).
- commitChoices calls updateSpeed() first; omitted from 'order of work'.
- Replay claim honestly marked unrun; no donor test replays a saved log (state.js is serialize/restore only).
- Missed: resetRNG(null) vs undefined quirk.

Fixed 2026-10-12: seed-algorithm wording, input-log record list, commitChoices order, added resetRNG line.
