# boardgameio-boardgame.io (determinism-replay, cell 2)

Donor: `/mnt/frankendom-donors/boardgameio-boardgame.io/src/plugins/random/random.ts` (with `src/plugins/random/random.alea.ts`, `src/plugins/plugin-random.ts`, `src/plugins/main.ts`, `src/core/reducer.ts`, `src/master/filter-player-view.ts`, `src/ai/bot.ts`, `docs/documentation/random.md`, `docs/documentation/CHANGELOG.md`) | Licence: MIT (root LICENSE: "Copyright (c) 2017 The boardgame.io Authors"); `random.alea.ts` carries an MIT-style notice, "Copyright 2015 David Bau"; code may be adapted | TypeScript | symbol `Random`

Checked: Read `src/plugins/random/random.ts` in full (198 lines), `src/plugins/random/random.alea.ts` in full (109 lines), `src/plugins/plugin-random.ts` in full (40 lines), `src/plugins/plugin-log.ts` in full, `src/plugins/random/random.test.ts` lines 1-30 and 100-167, `src/plugins/main.ts` 150-260 and 296-314, `src/core/reducer.ts` 495-560, `src/master/filter-player-view.ts` 1-40, `src/ai/bot.ts` 95-110 (the bot's copy only), `docs/documentation/random.md` 1-60, and the CHANGELOG entries at 58, 403, 1312, 1340, 1446, 1460. Confidence: high for the draw, state, redaction and NoClient claims (opened, receipted, order traced). Medium for the alea maths: I checked the operation order against the code but did not run it, so the sketch is typechecked only. Not read: `src/master/master.ts` beyond the lines that call the filter, the persistence and storage code, the flow code in `src/core/flow.ts`, most of `random.test.ts`. The grep for `replay`, `checksum`, `desync` and `hash` in `src/` (non-test) returned no hits. camera_scope: not applicable.

## 1. Mechanism

- **Pure draws with the stream state stored as data.** `Random` is built from the random state in plugin data (`random.ts` 63-70). Each draw restores the generator from the saved state (`alea(seed, R.prngstate)`, line 89), draws, and writes the advanced state back into the state object (93-96). So a move's result is a function of its input state: the same state gives the same draw, which the design doc states as the reason (`docs/documentation/random.md` 19-21).
- **Seed.** The game's `seed` is used if set (`plugin-random.ts` 29-34). If not, the default is `Date.now().toString(36).slice(-10)` (`random.ts` 55-57): a time-based value, not a secret. Line 88 stops using `seed` for seeding once `prngstate` exists, but `...R` (93-96) keeps `seed` in the plugin data for the whole game, so the stored seed stays in state (a leak surface if the plugin data is ever shown; see section 6).
- **The generator (Alea, from seedrandom).** State is four numbers `c, s0, s1, s2` (`random.alea.ts` 29-34). Seeding hashes the seed text with Mash, once for a blank string per word and once per word for the seed (46-61; Mash 72-91). A step (64-69) computes `t = 2091639 * s0 + c * 2^-32`, shifts the words (`s0 = s1`, `s1 = s2`), takes `c = trunc(t)`, and returns `s2 = t - c`. The returned value is the raw draw in [0, 1).
- **Game-facing draws** (`random.ts` 133-193): `Die(sides)` = `floor(u * sides) + 1` (135); `D4`..`D20` are the same with fixed sides; `Number()` returns the raw `u` (170-172); `Shuffle(deck)` takes one draw per remaining item, picks index `trunc(remaining * u)`, outputs that item and moves the last remaining item into the hole (186-190). So shuffling n items uses n draws.
- **Client rule (NoClient).** The random plugin returns `isUsed()` from `noClient` (`plugin-random.ts` 16-18). The reducer, on a client, runs the move, asks `NoClient`, and if true returns the old state (`reducer.ts` 506, 522-524). The client does not show the move's result and waits for the server (`main.ts` 227-229). Test: a move that calls `random.D6()` leaves the client's `G.die` undefined (`random.test.ts` 103-126).
- **Redaction.** The random plugin's `playerView` returns `undefined` (`plugin-random.ts` 37). Every player view runs `playerView` for each plugin (`main.ts` 301-310), and the master's filter calls `PlayerView` on the state (`filter-player-view.ts` 24). So a player's view has no seed and no generator state. Test: `state.plugins.random.data` is undefined after `PlayerView` (`random.test.ts` 128-144); a client's initial state has no random data (164-167).
- **Order of work in the reducer** (`reducer.ts` 499-549): plugins Enhance the state (499), the move runs (506), the client checks NoClient (522), and only on the server does the flow run (549) before plugins flush (`main.ts` 186-201, which stores each plugin's state).
- **Replay and desync.** None in the donor. The log plugin adds metadata only (`plugin-log.ts` 19-23). No replay or checksum code in `src/` outside tests.
- **Save and load.** The generator state is four plain numbers in plugin data (`random.alea.ts` 29-34; `random.ts` 93-96), so the whole game state is plain data and the stream position goes with it. I did not read the storage code, so I do not claim a save/load path beyond that.

## 2. Key functions

- `Random._random` (one draw): `/mnt/frankendom-donors/boardgameio-boardgame.io/src/plugins/random/random.ts` 83-99.
- `Random.api` (`Die`, `Number`, `Shuffle`): random.ts 101-197.
- `Random.seed` (default seed): random.ts 55-57.
- `alea` and `Alea.next` (generator): `src/plugins/random/random.alea.ts` 36-69 and 103-109.
- Random plugin hooks (`noClient`, `flush`, `setup`, `playerView`): `src/plugins/plugin-random.ts` 13-38.
- `NoClient`, `Flush`, `PlayerView`: `src/plugins/main.ts` 176-250 and 296-314.
- Reducer move path: `src/core/reducer.ts` 495-560.
- Master filter: `src/master/filter-player-view.ts` 17-28.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pure draw: state in, value and next state out | None |
| Four-word plain state stored in the game state | None |
| Alea step: `t = 2091639 * s0 + c * 2^-32`, shift, carry (alea 64-69) | 2091639 is the seedrandom multiplier |
| Die = floor(u * sides) + 1 (random.ts 135) | Default sides 6 (random.ts 133) |
| Shuffle: one draw per item, last item fills the hole (186-190) | None |
| Default seed from Date.now base36, last 10 characters (random.ts 56) | 10 characters: a time-based seed, which Frankendom must not use |

## 4. TypeScript sketch

simplified: the Alea step and Mash seeding keep the donor's operation order (checked by reading, not run). The donor's mutable class, closures and plugin hooks are replaced by pure functions that return the next state, which is what the stored `prngstate` does in the donor. It omits Die arrays, `D4`..`D20`, `Number()`, the bot's own copy of the generator (`src/ai/bot.ts` 104-108), the setup-time seed, the Date-based default seed (not wanted), and the plugin system. `playerView` and `clientApply` summarise two donor rules (`plugin-random.ts` 37; `reducer.ts` 522-524); they are not donor functions.

```ts
// Licence: MIT (donor: boardgame.io). The Alea step and Mash seeding are the donor's inlined copy of seedrandom's Alea (MIT-style notice by David Bau). Re-expressed as pure functions; not a line-by-line port.
const TWO_POW_MINUS_32 = 2.3283064365386963e-10;

// Plain data: four numbers, safe to keep in the game state (the donor keeps it under plugins.random.data).
interface RngState { c: number; s0: number; s1: number; s2: number }

// Mash: string to a fraction in [0, 1). Keeps its own counter, as the donor's closure does.
function makeMash(): (data: string | number) => number {
  let n = 0xefc8249d;
  return (data: string | number): number => {
    const str = data.toString();
    for (let i = 0; i < str.length; i++) {
      n += str.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    return (n >>> 0) * TWO_POW_MINUS_32;
  };
}

// Seed the three words from the seed text, in the donor's order (Alea constructor).
function seedState(seed: string | number): RngState {
  const mash = makeMash();
  const s0a = mash(' ');
  const s1a = mash(' ');
  const s2a = mash(' ');
  let s0 = s0a - mash(seed);
  if (s0 < 0) s0 += 1;
  let s1 = s1a - mash(seed);
  if (s1 < 0) s1 += 1;
  let s2 = s2a - mash(seed);
  if (s2 < 0) s2 += 1;
  return { c: 1, s0, s1, s2 };
}

// One step, pure: returns the output in [0, 1) and the next state. The input state is not changed.
function step(st: RngState): { out: number; next: RngState } {
  const t = 2091639 * st.s0 + st.c * TWO_POW_MINUS_32;
  const c = Math.trunc(t);
  const out = t - c;
  return { out, next: { c, s0: st.s1, s1: st.s2, s2: out } };
}

// Game-facing draws. Each returns the value and the state after it, so a move stays a pure function of its inputs.
function die(st: RngState, sides: number): { value: number; st: RngState } {
  const r = step(st);
  return { value: Math.floor(r.out * sides) + 1, st: r.next };
}

// Pick from what is left, move the last item into the hole: one draw per item (donor Shuffle).
function shuffle<T>(st: RngState, deck: T[]): { deck: T[]; st: RngState } {
  const clone = [...deck];
  const out: T[] = [];
  let cur = st;
  let remaining = clone.length;
  while (remaining > 0) {
    const r = step(cur);
    cur = r.next;
    const idx = Math.trunc(remaining * r.out);
    out.push(clone[idx]);
    clone[idx] = clone[--remaining];
  }
  return { deck: out, st: cur };
}

// The rng state is redacted from every player view (donor: the random plugin's playerView returns undefined).
interface FightState { hp: number[]; rng: RngState }
function playerView(s: FightState): { hp: number[] } {
  return { hp: s.hp };
}

// Donor NoClient rule: a move that drew randomness is not shown on the client; the client keeps its old state and waits for the server.
function clientApply<S>(old: S, result: { state: S; usedRandom: boolean }): S {
  return result.usedRandom ? old : result.state;
}
```

## 5. Lands in

- TARGET `src/fight/rng.ts` (new): pure seeded draws (die, shuffle, raw step) with the four-word state kept as plain data in the fight state; the duel step calls these and never exposes the state. Parity-checklist row 1 (duel step / sim).
- Reuse tag: adapt-idea (MIT: code may be adapted; the sketch is a re-expression; the Alea code keeps its MIT-style notice)
- Brief rule served: 1 (one engine: the draws happen inside the duel step, not in a client) and server-verified kills (a client never shows a roll that the server has not answered).

## 6. Gaps and risks

- **Raw draws in state leak the stream.** `random.Number()` returns the raw value (`random.ts` 170-172), and the generator state is the last few raw values plus a carry (`random.alea.ts` 64-68). A move that stores `Number()` in `G` shows the generator to every player who sees `G`. My reading, not run: several consecutive raw values are enough to rebuild the state. fix: the fight state keeps only derived results (a hit, a roll, a loot pick), never a raw draw; the stream state is server-only.
- **Seed stays in state and the bot has an unseeded path.** The plugin record keeps `seed` for the whole game (`random.ts` 93-96), so the redaction test must cover it too. The bot falls back to `Math.random()` when no seed is set (`bot.ts` 101-102), an unseeded draw path. `D8` is in `SpotValue` (`random.ts` 107) but missing from the `RandomAPI` interface (17-32), a small typing defect. Fix: drop `seed` from player-visible data, forbid unseeded fallbacks in our engine.
- **The donor's only guard is redaction.** Redaction (`plugin-random.ts` 37) is the sole protection for the state; a new plugin that forgets it leaks it. fix: a server test asserts the player view JSON has no `rng` key, for every player view.
- **Time-based default seed.** `Random.seed()` uses `Date.now()` (`random.ts` 55-57). fix: fight seeds come from the server's crypto source and are stored only on the server. Nothing in `src/fight` may default to time.
- **Client discard costs a round trip.** NoClient means any roll-using move is discarded on the client and waits for the server (`reducer.ts` 522-524). That is the right rule for server-verified kills, but a hit feels slower on a phone. Dom ruling 1 below.
- **Client-side fallback seed.** A client without the seed uses seed `'0'` to run the move, then discards it (`random.ts` 64-68). fix: Frankendom clients never run a draw; the server does.
- **No replay or checksum.** Frankendom's fingerprint receipts need a per-turn state hash and a stored (seed, moves) record; the donor has neither (grep found none). This is new work; the donor does not supply it. Row 19 owns it, not row 1.
- **Named streams are not in the donor.** One stream serves every draw. Frankendom needs separate streams for damage, ties and loot. That matches the Showdown note (`smogon-pokemon-showdown.deep.md` section 6); the two notes agree on the defect.

## 7. Pass-2 additions

**As-data shape.** The donor's random data is one plugin record: `{ seed: string | number, prngstate?: { c: number, s0: number, s1: number, s2: number } }` (`random.ts` 12-15; `random.alea.ts` 29-34). Frankendom row shape: `{ fight_id: string, stream: enum('damage','ties','loot','spawns'), c: number, s0: number, s1: number, s2: number }`. A new X is one row: yes for a new named stream (a new row with the same four numbers, no code change), no for a new draw type, which needs a function in `src/fight/rng.ts`.

**Provenance per claim.** Donor: boardgame.io, copy at `/mnt/frankendom-donors/boardgameio-boardgame.io` (no `.git`, so no commit ids). Licence MIT (root LICENSE); the Alea code carries an MIT-style notice (`random.alea.ts` 4-27). Every claim has a receipt in `DT002/receipts.tsv` with file and line.

**What they patched later.** No git history in the donor copy. The CHANGELOG (`docs/documentation/CHANGELOG.md`) records these fixes: v0.20.2, line 1446, "Fix bug that was causing Random code to return the same numbers."; v0.25.0, line 1312, "set default RNG seed once per game, not game type"; v0.23.2, line 1340, "make Random API present in first onTurnBegin and onPhaseBegin"; v0.43.0, line 403, "Handle random plugin redacted state on multiplayer clients" (PR #885). The code comment at `random.ts` 64-67 records the client seed fallback. The rule from v0.43.0 is the one a Frankendom client must follow: a redacted state must not break the client.

**Rulings for Dom** (at most three):
1. Should a Frankendom client ever show a roll before the server answers? Recommendation: no; the client waits for the server result (the donor's NoClient rule), and we accept the round trip, because kills are server-verified.
2. Should any raw random value ever be stored in fight state or sent to a client? Recommendation: no; only derived results (a hit, a roll, a pick) go to clients.
3. Should fight seeds come from the server's crypto source and stay server-side? Recommendation: yes, and no time-based default anywhere in `src/fight`.

**Weight for a Core slice this week.** Row 1 (duel step): the duel step draws from `src/fight/rng.ts` as pure state-in, state-out, and the player view drops the rng key. Row 19 (replay) reuses the same seed and move list once it exists.

**Acceptance:** a server test replays one duel from (seed, move list) and gets identical rolls; the player view JSON for each side has no `rng` key; a client test shows that a roll-using action leaves the displayed HP unchanged until the server answers.

Best transferable idea: keep every random draw a pure function of the stored state, store that state as four plain numbers in the fight state, and let the client discard any move that drew randomness until the server answers.
Decision (proposed): adapt — take the pure draw, plain-data state and client-discard rule; drop the time-based seed default and the raw `Number()` exposure, and split the one stream into named sub-streams.
Acceptance: the duel replay test, the player-view test and the client-discard test above all pass in CI.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: note said state carries seed only until the first draw; random.ts 93-96 spreads ...R so seed stays in plugin data all game.
- Missed: bot.ts 101-102 falls back to Math.random() when unseeded.
- Missed: D8 in SpotValue (random.ts 107) but absent from RandomAPI interface (17-32).
- Missed: stored seed is a leak surface relevant to the redaction risk.

Fixed 2026-10-12: seed-lifetime claim in Mechanism corrected; unseeded bot path, D8 typing gap and seed-in-state leak added to Gaps and risks. Sketch unchanged (it already omits the seed after setup).
