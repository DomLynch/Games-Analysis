# inkjs (quests-dialogue-npc-routines, cell 2)

Donor: `/mnt/frankendom-donors/inkjs/src/engine/Story.ts` | Licence: MIT (LICENSE.md line 1 "MIT License"; Copyright (c) 2017 inkle Ltd. and inkjs contributors per AUTHORS) | TypeScript | symbol `NextSequenceShuffleIndex` (Story.ts 2358-2410), with the choice gate `ProcessChoice` (915-960)

Checked: Opened `src/engine/Story.ts` (VisitContainer 831-838; RANDOM 1412-1430; SEED_RANDOM 1432-1446; VisitIndex 1451-1455; SequenceShuffleIndex 1457-1460; ProcessChoice 915-960; ChooseChoiceIndex 1726-1747; currentChoices 57-70; TryFollowDefaultInvisibleChoice 2326-2356; NextSequenceShuffleIndex 2358-2410), `src/engine/StoryState.ts` (constructor 436-445; visit and turn functions 60-152; SetChosenPath 1123-1135; JSON writer for visit counts at 645), `src/engine/ChoicePoint.ts` (in full), `src/engine/PRNG.ts` (in full), `src/engine/Container.ts` (flags 18-20, 60-90 in part), `src/compiler/Parser/ParsedHierarchy/Sequence/Sequence.ts` (1-140), `SequenceType.ts` (in full), `src/compiler/Parser/InkParser.ts` (2842-2900). Not read: the main continue loop in Story.ts, `PopChoiceStringAndTags`, the rest of Sequence.ts after line 140, the choice-flag JSON reader in JsonSerialisation.ts (grep only), and the host binding for external functions. Confidence: high on sequences, the shuffle index, the choice gate and the turn clock (read end to end); medium on how the flow loop calls them (not read). Quest structure: none (the only word hit for quest, objective or journal in `src/` is a URL comment at InkParser.ts 1545). Camera: not applicable.

## 1. Mechanism

- What it is: ink is a story language compiled to JSON; inkjs is its TypeScript runtime. The runtime holds the flow pointer, a call stack, per-container visit counts and turn indices, and the variables. Choices are generated when the flow reaches a choice point, and the host later picks one by index.
- Sequences (`{a|b|c}`), compile time: the compiler builds a container with `visitsShouldBeCounted` and `countingAtStartOnly` set (Sequence.ts 69-70). It pushes the visit index (`VisitIndex`, Story.ts 1451-1452, which is the count minus 1) and then picks a branch by mode:
  - stopping (default; InkParser.ts 2846): MIN(visits, n-1) (Sequence.ts 92-95 with the branch count n in 94).
  - once: MIN(visits, n) where the extra last branch is empty (Sequence.ts 84-85 and 92-95).
  - cycle: visits modulo n (Sequence.ts 98-99).
  - shuffle (alone, or with stopping, or with once): see below.
  The parser accepts six flag values only: stopping 1, cycle 2, shuffle 4, once 8, shuffle+stopping, shuffle+once (InkParser.ts 2880-2890; SequenceType.ts 2-5). Any other combination is a parse error.
- Shuffle, compile time: for shuffle with stopping or once, the compiler first compares the index with the fixed endpoint (n-1 for stopping, n for once) and skips the shuffle there, so the last beat is fixed or empty (Sequence.ts 110-122). Otherwise it pushes the element count (n, or n-1 for shuffle+stopping; Sequence.ts 126-131) and emits `SequenceShuffleIndex` (132).
- Shuffle, run time (`NextSequenceShuffleIndex`, Story.ts 2358-2410): it pops the element count and the sequence index. `loopIndex = seqCount / numElements` (2388) and `iteration = seqCount % numElements`. A seed is built from the sum of the character codes of the container path (2394), plus the loop index and the story seed (2396). A PRNG is seeded with that (2397). A pool [0..n-1] is drawn without replacement: `chosen = random.next() % pool.length` (2405), pick `pool[chosen]`, remove it (2407), and repeat up to the iteration. Net effect: each pass of n visits is a fresh permutation of the branches, and no branch repeats inside a pass.
- Story seed: `RANDOM(min, max)` seeds a PRNG with `storySeed + previousRandom` and returns `(next % range) + min` (Story.ts 1420-1424); `previousRandom` is then set to the new value (1428), so the sequence of RANDOM results depends on call order. `SEED_RANDOM` sets `storySeed` (1443) and resets `previousRandom` to 0 (next line). When no seed was set, the constructor uses the wall clock: `new PRNG(timeSeed).next() % 100` (StoryState.ts 443-444).
- Choice gate (`ProcessChoice`, Story.ts 915-960): when the flow reaches a choice point, it pops the condition if there is one (920-921). If the choice is once-only (`onceOnly`, default true, ChoicePoint.ts 12), it reads the visit count of the choice's target container and hides the choice if that count is above zero (939-943). Content is consumed either way (the donor comment says so). A visible choice gets a `Choice` with the target path, the source path, the invisible-default flag and a forked thread (955-958).
- Choice pick: `ChooseChoiceIndex` (1726) checks the index is inside the list the story generated (1729-1731). It sets the thread from the choice and calls `ChoosePath` (1746), which records the visit and advances the turn (SetChosenPath 1132-1133; visits via VisitChangedContainersDueToDivert).
- Invisible defaults: `currentChoices` hides choices flagged as invisible defaults (Story.ts 64). If every choice is an invisible default, `TryFollowDefaultInvisibleChoice` takes the first one without advancing the turn (2326-2353; `ChoosePath(choice.targetPath, false)` at 2353).
- Visit counts: `VisitContainer` (Story.ts 831-838) increments the count only when the container is entered at its start (833) and only if `visitsShouldBeCounted`. The count lives in a map keyed by the container's path string (StoryState.ts 101-115). When a StatePatch layer is present, reads and writes go to it first (StoryState.ts 60-64 and 103-107; when a patch is created was not read).
- Turn clock: `currentTurnIndex` starts at -1 (StoryState.ts 441) and increments each time a path is chosen with `incrementingTurnIndex` true (1132-1133). `TurnsSinceForContainer` returns the current turn minus the turn recorded for the container (149), and -1 when there is no record (the else branch after 149; read). The clock counts player choices, not seconds.
- Tick: none in these functions. The host calls the runtime; nothing here reads time, except the default seed in the constructor.

## 2. Key functions

- `Story.NextSequenceShuffleIndex`: `/mnt/frankendom-donors/inkjs/src/engine/Story.ts` 2358-2410 (read in full).
- `Story.ProcessChoice`: same file 915-960 (read in full).
- `Story.ChooseChoiceIndex`: same file 1726-1747 (read in full).
- `Story.VisitContainer`: same file 831-838 (read in full).
- `StoryState.IncrementVisitCountForContainer` and `TurnsSinceForContainer`: `/mnt/frankendom-donors/inkjs/src/engine/StoryState.ts` 101-115 and 128-152 (read).
- Sequence codegen: `/mnt/frankendom-donors/inkjs/src/compiler/Parser/ParsedHierarchy/Sequence/Sequence.ts` 67-140 (read; 67 is `GenerateRuntimeObject`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stopping: show branch min(visits, n-1), last branch sticks | Clamp at n-1 (Sequence.ts 94 with n branches) |
| Once: show branch min(visits, n), then an empty branch | One extra empty branch (Sequence.ts 84-85) |
| Cycle: visits mod n | Modulus n (Sequence.ts 98-99) |
| Shuffle: a fresh permutation for each pass of n visits, no repeats inside a pass | Pool size n, or n-1 when stopping (Sequence.ts 126-128); loop = floor(visits / n) (Story.ts 2388) |
| Per-pass seed | Path char-code sum + loop index + story seed (Story.ts 2394-2396); PRNG step 48271 mod 2147483647 (PRNG.ts 7, 11) |
| Default seed | Wall clock ms, modulo 100, so only 100 default values (StoryState.ts 443-444) |
| Visit count | +1 per entry at the start of the container (StoryState.ts 101-115; Story.ts 833) |
| Once-only choice | Hidden when target visits > 0 (Story.ts 939-943); default true (ChoicePoint.ts 12) |
| Turn clock | Starts at -1 (StoryState.ts 441), +1 per chosen path (1132-1133) |

## 4. TypeScript sketch

simplified: keeps the donor's flag-combination logic (stopping, cycle, shuffle, once, the two shuffle endpoints), the per-pass permutation drawn without replacement, the choice gate and the turn clock. It omits the container tree, the copy-on-write patch layer, the thread fork on choices, the RANDOM chain (previousRandom), the invisible-default fallback and the tag and text handling. Three donor defects are fixed in the sketch: the path hash is FNV-1a instead of a character-code sum (Story.ts 2394), the seed parts are mixed by multiply and xor instead of added (2396), and the player seed is a required argument instead of a clock default (StoryState.ts 443-444). The loop index is floored explicitly. Only the six flag values the donor parser accepts are allowed.

```ts
// Licence: MIT (donor, inkjs, LICENSE.md "MIT License"). Shape adapted from the sequence and choice logic described in the donor; written fresh, not a line-by-line translation.

// Sequence flags, same bit values as the donor's SequenceType.
const STOPPING = 1;
const CYCLE = 2;
const SHUFFLE = 4;
const ONCE = 8;
// The six combinations the donor's parser accepts (InkParser 2880-2890).
const ACCEPTED_FLAGS: number[] = [STOPPING, CYCLE, SHUFFLE, ONCE, SHUFFLE | STOPPING, SHUFFLE | ONCE];

// Same generator step as the donor (Park-Miller: multiply by 48271, modulo 2^31 - 1).
class Prng {
  private s: number;
  constructor(seed: number) {
    let x = Math.trunc(seed) % 2147483647;
    if (x <= 0) x += 2147483646;
    this.s = x;
  }
  next(): number {
    this.s = (this.s * 48271) % 2147483647;
    return this.s;
  }
}

// Fix: the donor sums character codes of the path, so anagram paths collide. FNV-1a 32-bit instead.
function hashPath(path: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Fix: the donor adds (path hash + loop index + story seed), so different triples can sum to the same seed.
// Mix each part by multiply and xor instead, and keep the result in the generator's range.
function shuffleSeed(pathHash: number, loopIndex: number, playerSeed: number): number {
  const mixed = (pathHash ^ Math.imul(loopIndex + 1, 0x9e3779b1) ^ Math.imul(playerSeed, 0x85ebca6b)) >>> 0;
  return (mixed % 2147483646) + 1;
}

// Draw without replacement: the slot-th pick of a permutation of `count` items, one pool per loop.
function shuffledSlot(count: number, slot: number, pathHash: number, loopIndex: number, playerSeed: number): number {
  const rng = new Prng(shuffleSeed(pathHash, loopIndex, playerSeed));
  const pool: number[] = [];
  for (let i = 0; i < count; i++) pool.push(i);
  let picked = 0;
  for (let i = 0; i <= slot; i++) {
    const chosen = rng.next() % pool.length;
    picked = pool[chosen];
    pool.splice(chosen, 1);
  }
  return picked;
}

// Branch to show. `visits` = times this sequence was entered (counted at its start only).
// `playerSeed` is required: the donor defaults to a clock-derived seed (StoryState 443-444).
function branchFor(flags: number, visits: number, n: number, pathStr: string, playerSeed: number): number {
  if (!ACCEPTED_FLAGS.includes(flags)) throw new Error("sequence type combination not supported");
  const once = (flags & ONCE) !== 0;
  const cycle = (flags & CYCLE) !== 0;
  const stopping = (flags & STOPPING) !== 0;
  const shuffle = (flags & SHUFFLE) !== 0;

  // Index before any shuffle: clamp for stopping or once, modulo for cycle, raw count for pure shuffle.
  let seqCount: number;
  if (stopping || once) {
    const branches = once ? n + 1 : n; // once adds an empty last branch
    seqCount = Math.min(visits, branches - 1);
  } else if (cycle) {
    seqCount = visits % n;
  } else {
    seqCount = visits;
  }
  if (!shuffle) return seqCount;

  // Shuffle: the stopping or once endpoint is fixed; everything before it is shuffled.
  const fixedEnd = stopping ? n - 1 : n;
  if ((stopping || once) && seqCount === fixedEnd) return seqCount;
  const count = stopping ? n - 1 : n;
  const pathHash = hashPath(pathStr);
  const loopIndex = Math.floor(seqCount / count);
  const slot = seqCount % count;
  return shuffledSlot(count, slot, pathHash, loopIndex, playerSeed);
}

// Choice gate, evaluated when the flow reaches the choice point (not when the player clicks).
interface ChoiceGate {
  hasCondition: boolean;
  condition: boolean;
  onceOnly: boolean;       // default true in the donor; false = sticky choice
  targetVisits: number;    // visits to the choice's target container so far
}

function choiceVisible(g: ChoiceGate): boolean {
  if (g.hasCondition && !g.condition) return false;
  if (g.onceOnly && g.targetVisits > 0) return false;
  return true;
}

// Turn clock: advances only when the player picks a path (not on automatic fall-through).
// Returns -1 when the container has never been entered, as the donor does.
function turnsSince(currentTurn: number, lastTurnEntered: number | undefined): number {
  return lastTurnEntered === undefined ? -1 : currentTurn - lastTurnEntered;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/qu002-ink-sequences.ts) exits 0.

## 5. Lands in

- TARGET `origins/quests/dialogue-select.ts` (proposed module, same as the YarnSpinner note: one pick step for NPC lines, sequences and choices; not checked against the Frankendom repo). Parity-checklist row 20 (catalogue as runtime source): sequence modes and choice gates are data on dialogue rows, and the server runs them. The per-character seed belongs in the same ledger entry as the character.
- today: none known (not checked).
- Reuse tag: rewrite-from-idea (MIT, code may be adapted; this sketch is written fresh from the mechanism)
- Brief rule served: zones as data (barks and choices as rows); server-verified (the server runs the sequence and the gate); one ledger (visit counts, turn indices and the seed saved with character state); rules 7-9 n/a

## 6. Gaps and risks

- No quest model. The donor has no quest, objective, step, prerequisite, reward or journal (single word hit at InkParser.ts 1545, a URL comment). A quest is knots, variables and visit counts; Frankendom builds the quest state itself.
- Default seed is the wall clock (StoryState.ts 443-444): only 100 default values, and not reproducible. Frankendom must always pass the character's seed; never fall back to a clock seed.
- Weak path hash (Story.ts 2394): anagram paths get the same shuffle. Fix in sketch: FNV-1a.
- Additive seed (Story.ts 2396): different (path, loop, seed) triples can sum to the same seed, so two barks can shuffle the same way. Fix in sketch: multiply-xor mix.
- Unfloored loop index (Story.ts 2388): safe today only because the floor is taken after the integer parts are added (2396-2397). The sketch floors it explicitly.
- Call-order dependence: RANDOM results chain through `previousRandom` (Story.ts 1420 and 1428), so a replay must make the same RANDOM calls in the same order. Frankendom's replay (inputs plus seed) holds only if the server logs every such call.
- Visit counts are keyed by container path string (StoryState.ts 101-115). Renaming or moving a knot resets its counts, so line ids must be stable, as in the YarnSpinner note.
- Once-only choices hide only after the target is entered (Story.ts 939-943). A choice whose target is never entered stays visible for ever. Fine for a one-time offer; a quest needs its own flag.
- The pick is checked only against the list the story generated (Story.ts 1729-1731), not against the condition at pick time. The server must generate the list and keep it for the pick.
- Modulo bias in `% range` (Story.ts 1424) and `% pool.length` (2405): negligible for small pools; note it if pools grow large.
- The turn clock counts player choices (1132-1133), not seconds: good for replay and for the no-wall-clock rule.
- Not read: the continue loop, the host binding for external functions, the rest of Sequence.ts after 140, and whether one Story instance is shared across players (assumed one per player; not checked).

## As-data shape

- Sequence row (ink source, compiled to a container): `{ flags: int (1 stopping, 2 cycle, 4 shuffle, 8 once); branches: n }`. Accepted flags: 1, 2, 4, 8, 5, 12 (InkParser.ts 2880-2890; SequenceType.ts 2-5). Container flags: `visitsShouldBeCounted`, `turnIndexShouldBeCounted`, `countingAtStartOnly` (Container.ts 18-20; CountFlags 69-71).
- Choice point row: `{ pathOnChoice; hasCondition; hasStartContent; hasChoiceOnlyContent; isInvisibleDefault; onceOnly }` with a flags int in which once-only is bit 16 (ChoicePoint.ts 12 and 49).
- Runtime state row: `visitCounts: Map<pathString, int>`, `turnIndices: Map<pathString, int>`, `storySeed: int`, `previousRandom: int`, `currentTurnIndex: int` (StoryState.ts 436-441; written to JSON at 645).
- A new bark rotation is one row: yes, as ink source (a `{~...}` or `{!...}` sequence compiles to a container; no engine code). A new sequence mode is one row: no (the parser and runtime fix the six flag values). A new choice is one row: yes (script). A new condition function is one row: no (external functions need host binding; not read).

## Provenance

- Repo: inkjs, `/mnt/frankendom-donors/inkjs/` (TypeScript port of the ink runtime). Licence: MIT, read from `LICENSE.md` line 1 ("MIT License"). Code may be adapted; this sketch is written fresh.
- Ink language and compiler: the compiler is under `src/compiler`; the parser rules cited above are from `InkParser.ts`.

## What they patched later

- No history available beyond the snapshot: `git log` in the donor shows one commit, `6b11534`, a dependency bump (fs-extra). No changelog file was found in the box.
- Code markers only: `// TODO: Replace by default value?` on the null guards in `NextSequenceShuffleIndex` (Story.ts 2372 and 2383), and `// TODO: Implement Profiler` (139). These point at null handling in the shuffle, not at a patched rule.

## Rulings for Dom

1. Should ambient NPC barks use the shuffle mode (each line once per pass, new order each pass), with stopping for story beats and once for one-time lines? Recommendation: yes.
2. Should each character have its own bark seed, stored in the character's ledger entry (stable order, replayable), instead of any clock default? Recommendation: yes.
3. Should a once-only choice hide when its target was entered (the donor rule, no extra state) or carry its own flag saved with the quest? Recommendation: the donor rule for offers, a flag for quest steps.

Best transferable idea: Use a per-pass shuffle (a fresh permutation for each n visits, no repeats within a pass) seeded per character, so NPC barks never repeat within a pass and replay the same way.
Decision (proposed): adapt - the per-pass shuffle and the turn clock fit NPC barks and quest-giver lines; we change the seed to a per-character value with a proper hash and mix, and keep the server as the only place that runs the sequence.
Acceptance: A server test shows that over three passes of a four-line bark each line is shown once per pass, the same character seed gives the same order, another seed gives a different order, and a once-only choice disappears after its target is entered.

Reuse tag: rewrite-from-idea (MIT; adapted shape, fresh code)
Brief rule served: zones as data (barks and choices as rows); server-verified (server runs the sequence and the choice gate); one ledger (visit counts, turn index and seed saved with character state); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN.
- All checked claims hold. Trivial miss: TurnsSinceForContainer raises an error when the container is not turn-counted (needs countAllVisits).
