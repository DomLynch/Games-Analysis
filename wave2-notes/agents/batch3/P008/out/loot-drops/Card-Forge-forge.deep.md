# Card-Forge-forge (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/data/RewardData.java` | Licence: GPL-3.0 (`README.md` line 97: "License: GPL-3.0"; root `LICENSE` is the GPL version 3 text; no per-file header in `RewardData.java`, and "or later" is not stated) | Java | symbol `RewardData.generate`

Checked: Read in full: `RewardData.java` 154-351 (all `generate` overloads and the whole type switch), 352-361 (`generateAll`), field list 35-61 and the copy constructor 65-96 (skimmed). `CardUtil.java` 319-328 (`getPredicateResult`) and 330-351 (`generateCards`). `EnemySprite.java` 473-566 (`getRewards`, both branches). `WorldStage.java` 176-190 and `MapStage.java` 1001-1004 (where the rewards are loaded). `DifficultyData.java` 23. Callers of `generate` enumerated by grep: `EnemySprite.java` 557 and 562; `RewardSprite.java` 71; `MapStage.java` 742; `MapDialog.java` 443 and 451; `RewardScene.java` 315; `AdventureEventData.java` 780, 787, 790; `ArenaScene.java` 269; `MenuScene.java` 100. Not read: the body of `CardUtil.CardPredicate` (the class starts at 48; the filter's matching logic was not read, only its call at 321-324), `Reward.java`, the reward pick UI in `RewardScene`, and the difficulty setup in `AdventurePlayer.java` 440-443 (grep only). Confidence: high on the roll order and the numbers in `generate`. Medium on what the card filter excludes, because its body was not read. Depth: full for the roll and the enemy pool; the filter is (not read).

Best transferable idea: a loot table as data rows, where each row is an independent probability gate, then a difficulty-scaled bonus count, then uniform draws from a pre-filtered pool, so a whole drop table is a short list of small rows.

## 1. Mechanism

- Data. A reward row (`RewardData`) carries `probability`, `count`, `addMaxCount`, a `type` string (card pool, item, gold, booster, life, and others), and filters: `cardName`, `rarity`, `colors`, `editions`, `subTypes`, `manaCosts`, date range and more (`RewardData.java` 35-61).
- Per row, `generate` runs once (166-349) and in this order:
  1. Gate (175): `if (probability == 0 || rewardRandom.nextFloat() <= probability)`. A probability of 0 means the row always fires, not that it never does. Rows are independent: each one rolls its own gate.
  2. Bonus (178-179): `maxCount = Math.round(addMaxCount * Current.player().getDifficulty().rewardMaxFactor)`; `addedCount = nextInt(maxCount)` when `maxCount > 0`, else 0. So the bonus is uniform over [0, maxCount - 1]. A row with `addMaxCount` 1 and factor 1 always adds 0. The bonus is drawn only when the gate passes.
  3. Draws, by type:
     - `card` / `randomCard` with a `cardName` (224-245): the named card, `count + addedCount` times (238-244; with card variants, 231-236).
     - `card` / `randomCard` with no name: `CardUtil.generateCards(pool, this, count + addedCount, rng)` over the source deck (247) or the full card pool, enemy-filtered when `isForEnemy` (252). `generateCards` filters the pool once with the row's predicate (`CardUtil.java` 335), then does `count` draws of `pool.get(r.nextInt(pool.size()))` (337-338), with replacement, so duplicates are possible.
     - `deckCard` (330-336): the same `generateCards` over the caller's cards, with `count + addedCount + bonusDeckCards()` (333).
     - `Union` (182-221): a deduplicated pool built from `cardUnion` rows, then `count` uniform draws (206-218). The bonus is not added here.
     - Gold (338-340): one reward whose amount is `count + addedCount`.
     - Item by name list (259-267): each draw picks a uniform name from `itemNames` (261). A single `itemName` repeats `count + addedCount` times (269-275).
     - Shop and pack types (`cardPack` 322-329, `cardPackShop` 278-313, `landSketchbookShop` 314-321) and `life`/`shards` (341-347) are read at the level of their loops. The booster generation they call, `AdventureEventController.generateBooster`, was not read.
- Random source (168): `useSeedlessRandom ? new Random() : WorldSave...getRandom()`. Enemy rows pass `true` (EnemySprite 557, 562), so they use a fresh unseeded `Random`. Map rows pass `false` (MapStage 742), so they use the world's seeded generator.
- Enemy reward pool, `EnemySprite.getRewards()` (473). It clears the pool (474) on every call, so calling it again re-rolls. Two sources:
  - (a) Enemies with `copyPlayerDeck` (477-549). If the player's deck has fewer than 4 unique rule sets, or fewer than 10 cards that are not very basic lands (486), the enemy grants gold 199, 9 shards and one fixed card, then returns (500-508). Otherwise, in fantasy mode (511), it draws from the player's own deck: 2 uncommon or special (528-529), 3 common (533-535), 2 rare or mythic rare (539-540). It also grants gold `(1 or 2) x 100` plus 0 to 100 (543-544) and one life (545). Outside fantasy mode the copy-deck block ends at 549 and the standard rows below run.
  - (b) Standard enemies (551-564): each row in `data.rewards` and in `this.rewards` runs through `generate` (557, 562).
- Timing. On defeat, the enemy's death animation plays and then `startPause` runs (182-185). Only then is `getRewards()` loaded into `RewardScene` (186). `MapStage.getReward` (1001-1003) also loads `currentMob.getRewards()`. The roll therefore happens at defeat, not in the attack.
- Difficulty. `rewardMaxFactor` defaults to 1 (`DifficultyData.java` 23). Each row's bonus is scaled by the current player's difficulty (178).

## 2. Key functions

- `RewardData.generate`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/data/RewardData.java` 166-349. Gate, bonus, typed draws.
- `CardUtil.generateCards`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/util/CardUtil.java` 330-351. Filter once, then `count` uniform draws with replacement.
- `EnemySprite.getRewards`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/character/EnemySprite.java` 473-566. Rebuilds the pool each call; chaos-enemy composition and standard rows.
- Defeat path: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/WorldStage.java` 176-190.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Independent row gate: fire when a uniform roll is at or below the row probability | Probability 0 = always (theirs, `RewardData.java` 175); the test is `<=` on a float roll |
| Bonus count in [0, round(max x difficulty) - 1], drawn only after the gate passes | Difficulty multiplier `rewardMaxFactor`, default 1 (theirs, `DifficultyData.java` 23; scaled at `RewardData.java` 178) |
| Draws with replacement from a filtered pool | Pool filter from the row's fields (theirs, `CardUtil.java` 335) |
| Single amount row for currency | Gold is one reward of `count + addedCount` (theirs, `RewardData.java` 339) |
| Fixed composition for a copy-deck enemy in fantasy mode: 2 uncommon, 3 common, 2 rare | Counts 2 / 3 / 2 (theirs, `EnemySprite.java` 528-540) |
| Currency from a base plus a random spread | Base `(nextInt(2) + 1) x 100` and spread `nextInt(101)` (theirs, `EnemySprite.java` 543) |
| Unseeded versus seeded rows | `useSeedlessRandom` true for enemy rows (theirs, `EnemySprite.java` 557) |

## 4. TypeScript sketch

simplified: keeps the row gate (probability with 0 meaning always), the difficulty-scaled bonus count, and the two reward kinds needed here (one gold amount; pool draws uniform with replacement). Order matches the donor: gate, then bonus count, then draws. It omits: the card predicate (its body was not read), the card-variant (edition) lookup, the union dedupe (the donor uses a HashSet), deck-derived pools (`sourceDeck`, `copyPlayerDeck`), the enemy fantasy composition (`EnemySprite.java` 511-545), the seeded versus unseeded choice, and the reward wrapper types for life, shards and boosters.

```ts
// Licence: GPL-3.0 (donor; README "License: GPL-3.0", root LICENSE is the GPLv3 text; no per-file header in RewardData.java). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface RewardRow {
  probability: number;      // 0 = always; otherwise the row fires when rng <= probability
  count: number;            // base count
  addMaxCount: number;      // bonus drawn from [0, round(addMaxCount * difficultyFactor) - 1]
  kind: 'pool' | 'gold';
  pool: string[];           // filtered ids, used when kind === 'pool'
  gold: number;             // amount, used when kind === 'gold'
}

interface Rng { next(): number; }   // uniform in [0, 1)

type Reward = { kind: 'item'; id: string } | { kind: 'gold'; amount: number };

// One reward row. Gate first, then the bonus count, then the draws; the row is independent of other rows.
function rollRow(row: RewardRow, difficultyFactor: number, rng: Rng): Reward[] {
  const out: Reward[] = [];
  if (!(row.probability === 0 || rng.next() <= row.probability)) return out;

  const maxCount = Math.round(row.addMaxCount * difficultyFactor);
  const added = maxCount > 0 ? Math.floor(rng.next() * maxCount) : 0;
  const n = row.count + added;

  if (row.kind === 'gold') {
    out.push({ kind: 'gold', amount: n });
    return out;
  }
  if (row.pool.length === 0) return out;
  for (let i = 0; i < n; i++) {
    out.push({ kind: 'item', id: row.pool[Math.floor(rng.next() * row.pool.length)] });   // with replacement
  }
  return out;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `work/forge-reward-row.ts`, with `export {}`).

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed module, not checked against the Frankendom repo): the loot roll for one verified kill, as a function of the zone's table rows, the difficulty factor and an rng. Parity-checklist row 18 (loot roll and XP award). The server tick sub-line (post-K item 3) is not added by this cell.
- today: none read in Frankendom.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: one ledger and server-verified kills (Frankendom rulings); licence rule 7 (GPL, clean-room)

## 6. Gaps and risks

- Licence: GPL-3.0. Clean-room only; the sketch is written from the mechanism.
- Unseeded rolls: enemy rows use `new Random()` (168, 557). A server-verified kill that must be replayable needs a seed recorded with the kill (row 19, fight record). The donor does not do this.
- Re-roll on call: `getRewards` clears and rebuilds (474), so calling it twice gives two different results. Frankendom must roll once per kill and write the result to the ledger; the screen only shows it.
- The `probability` = 0 means always (175). That is easy to misread as "never". Frankendom should use an explicit `always` flag in the table data.
- Fantasy composition copies the player's own deck into enemy rewards (511-545). Frankendom's one-ledger rule means this cannot create items from the hero's gear without a ledger entry; the transferable part is the row shape, not the source.
- No cap or dedupe is set on rows or bonus draws in this code. Frankendom needs a per-kill cap (MAX_ATTACKERS = 3 is about attackers, not drops; the cap is a separate decision) and a rule for duplicate rows.
- MAX_ATTACKERS = 3: the rows are per enemy death, and no attacker-credit rule appears in these lines (credit not read). Frankendom must decide which hero gets the rows when up to three attackers hit.
- Difficulty factor: scaled by the player's difficulty (178). Frankendom should keep the factor on the zone or run data, not a global.
- Pit as client: the reward screen is client-only. The server decides the rows and the amounts.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** Gate at RewardData 175 (prob 0 = always, <=), bonus at 178-179 (round(addMaxCount*rewardMaxFactor), nextInt), generateCards filter-once/draw-with-replacement (CardUtil 335-338), seeded vs seedless (168; EnemySprite 557/562 pass true), gold 199/shards 9, fantasy 2/3/2 counts, 1-2 x100 + 0..100 gold, rewardMaxFactor=1 (DifficultyData 23), defeat path (WorldStage 176-190), GPL-3.0 (README 97): all hold.

**Missed:** type null/empty defaults to randomCard (RewardData 176-177); EnemySprite passes isForEnemy=false and a deck stripped of basic lands and restricted editions (557); non-fantasy copyPlayerDeck falls through to standard rows (note says so) 
