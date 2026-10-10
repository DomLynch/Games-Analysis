# keldaanCommunity-pokemonAutoChess (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/pve-stages.ts` (stage 19 `getRewards`, 177-188; stage 2 and 3 pools, 66-96) with `app/utils/random.ts` (`randomWeighted` 15-37, `pickRandomIn` 43-48, `pickNRandomIn` 50-61) | Licence: GPL-3.0 (`/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/LICENSE` line 2, "Version 3, 29 June 2007"). Clean-room, shape only. | TypeScript | symbol `PVEStages[19].getRewards`

Checked: opened `pve-stages.ts` stage 1, 2, 3 and 19 reward functions (43-58, 59-96, 162-190), `utils/random.ts` (1-80), the round-end grant (`game-commands.ts` 1925-1958) and the stage-start generation (2100-2130), `game-state.ts` 70, `town-encounters.ts` 80-106, `types/enum/Item.ts` 485-499. Writers of `randomComponentsGiven` were found by grep: only lines 54, 92 and 186 of `pve-stages.ts`. Callers of `getRewards` and `getRewardsPropositions`: `game-commands.ts` 2116-2129 (grep). Not read: the code that applies a chosen proposition (the `PlayerChoice` handler), the bodies of stages 9-40 other than 19, the client display (board-manager.ts 169, grep only). Confidence high on the stage 19 weights and draws, and on the stage 2 and 3 filters. The claim that a proposition the player takes is not written to the ledger rests on the writer grep plus the unread choice handler. The verdict is STRONG for the ownership-weighted pool, not for kill drops: a broad grep for loot, drop and reward found no kill-drop code (its drop hits are drag-and-drop item equip effects and the PvE reward path). camera_scope: not applicable.

Best transferable idea: weight a zone's loot pool so that items the character does not yet own weigh twice the owned ones, draw twice per reward, and write the granted items to a per-character ledger only after both draws.

Decision (proposed): adapt — take the 2:1 weighting and the ledger-after-draws order, but keep the weights as zone data and write the ledger on the server; do not copy the donor's stage 3 empty-pool behaviour (it pushes `undefined` if the pool is exhausted).

Acceptance: a server test seeds the roll, gives a fresh character a reward stage with two draws from an eight-item pool, and asserts that the first draw favours unowned items at 2:1, that both drawn items are written to the ledger after the stage, and that an item can repeat within one stage.

## 1. Mechanism

- Pool and ledger. The reward pool is the eight components `ItemComponentsNoFossilOrScarf` (types/enum/Item.ts 485-494). Each player has a `randomComponentsGiven` array (player.ts 194) that records what has been granted.
- Stage start (game-commands.ts 2116-2129): for each alive player, `getRewards` and `getRewardsPropositions` run and their results replace `pveRewards` and `pveRewardsPropositions`.
- Round-end grant (game-commands.ts 1942-1956): only when the player's last battle result is WIN, `pveRewards` is moved into `items`, and any `pveRewardsPropositions` become a `PlayerChoice` of type item (cleared after).
- Stage 2 propositions (pve-stages.ts 66-72): up to three distinct picks from the pool minus the ledger (`pickNRandomIn`, which returns fewer if the pool is smaller, and none if it is empty). No ledger write here.
- Stage 3 reward (pve-stages.ts 86-93): one pick, `pickRandomIn`, from the pool minus the ledger; then the ledger is pushed (92).
- Stage 19 reward (pve-stages.ts 177-188), the ownership-weighted shape: weight is 1 if the component is already in the ledger, else 2 (179). Two draws (182-183) with `randomWeighted` over those same weights; the weights are not updated between draws. Only after the loop is both pushed to the ledger (186). So one stage can yield the same item twice, and the ledger is written once.
- `randomWeighted` (utils/random.ts 15-37): total = sum of the weights (22-27). Roll = `Math.random()` times total times `(1 + ap * apScaling / 100)` times `(1 + luck / 100)` (28-32). It subtracts weights in insertion order and returns the first item that drives the roll below zero (33-35), else null (36). With the defaults ap = 0 and luck = 0, the roll is always below total, so null cannot happen in stage 19. (Not checked: other callers that pass ap or luck.)
- Treasure box (town-encounters.ts 86-106; game-state.ts 70; game-commands.ts 1646): one table type is rolled when the game state is created (game-state.ts 70, field initialiser), and every treasure box in that game switches on it (game-commands 1646). Weights: gold 0.2, mushrooms 0.1, sweets 0.1, itemComponents 0.1, componentsAndTickets 0.1, craftableItems 0.15, goldBow 0.05 (97-104). They sum to 0.8, and `randomWeighted` normalises by that total, so the effective shares are gold 25%, craftableItems 18.75%, four types at 12.5%, goldBow 6.25%. A null result falls back to itemComponents (105).

## 2. Key functions

- `getRewards` for stage 19: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/pve-stages.ts` 177-188. Read in full.
- Stage 2 and stage 3 pools: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/pve-stages.ts` 66-72 and 86-93. Read in full.
- `randomWeighted`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/random.ts` 15-37. Read in full.
- `pickNRandomIn` and `pickRandomIn`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/utils/random.ts` 43-61 (shuffle the copy, then pop). Read in full.
- Grant on win: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1942-1956. Stage-start generation: 2116-2129.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Unowned items weigh twice owned items | 2 and 1 (theirs, pve-stages.ts 179) |
| Draws per reward | 2 (theirs, pve-stages.ts 182) |
| Ledger written after all draws | after the loop (theirs, pve-stages.ts 186) |
| Propositions: pick up to N from pool minus ledger | N = 3 (theirs, pve-stages.ts 68-72) |
| Pool size | 8 components (theirs, types/enum/Item.ts 485-494) |
| Weighted pick, roll = random times total | Weights normalised by their own sum (theirs, random.ts 22-27); ap and luck factors (random.ts 31-32, defaults 0) |
| Treasure table as weights, rolled once per run | 0.2 / 0.1 / 0.1 / 0.1 / 0.1 / 0.15 / 0.05, sum 0.8 (theirs, town-encounters.ts 97-104) |

## 4. TypeScript sketch

simplified: follows the stage-19 order (weights from the ledger, two independent draws over the same weights, ledger written after both draws) and the stage-2 filter (pool minus ledger, n picked, no ledger write). Differences from the donor: the ledger is a Set, not the donor's array that keeps duplicates; the donor's stage-3 empty-pool case (pickRandomIn returns undefined and that gets pushed) is not copied; the randomWeighted null branch is not copied, and the sketch keeps only a typing fallback that is unreachable while the roll is below 1. Omitted: the round-end grant and win check, the choice flow, the treasure-box table and its per-game roll, shiny and marowak items, and the ap and luck factors.

```ts
// Ownership-aware reward pools. Pool = the reward list for a zone table; ledger = what this character already got.
interface PoolRoll {
  pool: string[];                 // donor ItemComponentsNoFossilOrScarf (8 items)
  given: Set<string>;             // donor player.randomComponentsGiven (array with duplicates)
}

// Stage-19 shape: `draws` independent picks over the same weights (owned 1, unowned 2).
// The ledger is written only after all draws, so one stage can repeat an item.
function drawOwnershipWeighted(
  state: PoolRoll,
  draws: number,
  rand01: () => number,
): string[] {
  const weight = (item: string): number => (state.given.has(item) ? 1 : 2);
  const total = state.pool.reduce((sum, item) => sum + weight(item), 0);
  const picked: string[] = [];
  for (let d = 0; d < draws; d++) {
    let roll = rand01() * total;
    let chosen = state.pool[state.pool.length - 1];   // typing fallback; unreachable while rand01() < 1
    for (const item of state.pool) {
      roll -= weight(item);
      if (roll < 0) { chosen = item; break; }
    }
    picked.push(chosen);
  }
  for (const item of picked) state.given.add(item);
  return picked;
}

// Stage-2/3 shape: up to `count` distinct items from the pool minus the ledger. No ledger write here.
function offerNotGiven(
  state: PoolRoll,
  count: number,
  rand01: () => number,
): string[] {
  const left = state.pool.filter((item) => !state.given.has(item));
  for (let k = left.length - 1; k > 0; k--) {
    const j = Math.floor(rand01() * (k + 1));
    [left[k], left[j]] = [left[j], left[k]];
  }
  return left.slice(0, count);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/pac-ownership-check.ts` (sketch plus `export {};`): exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (post-fight reward roll, zone data for the weights). Parity-checklist row 18 (loot roll and XP award). Ledger write happens in the same server step as the roll.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (roll and ledger written once, server-side); licence rule 7 (copyleft, clean-room)

## 6. Gaps and risks

- The donor's pool-minus-ledger filters (stage 2 and 3) make an item unobtainable once granted, and stage 3 has no fallback for an empty pool. Frankendom must decide whether a pool can run dry, and if it can, say what the player gets instead.
- Stage 3's empty-pool case would push `undefined` into the ledger. Stage order makes it unreachable here: only stage 1 writes to the ledger before stage 3 (writer grep), so at stage 3 the ledger holds at most one item. Frankendom should not rely on stage ordering; it should guard the empty case in code.
- A proposition the player takes does not appear to be written to the ledger (writer grep; the choice handler was not read). That lets an item come back later. Frankendom needs to pick: write it on choice, or accept the repeat, and test it.
- Two draws with the weights fixed for both draws allow one item to be granted twice in one reward. This is what the donor does. Frankendom must decide if a zone chest should allow duplicates.
- The treasure-box table is rolled once per game and applies to every box in the run. That fits a run-wide variety rule, not a per-chest drop, so it is not adopted here.
- The `randomWeighted` luck factor multiplies the roll and can push it past the total into null. If Frankendom ever adds a luck stat to a loot roll, it must clamp the roll to the total. Not used in stage 19 (defaults are 0).
- Clean-room only: the donor is GPL-3.0. The sketch is written from the described mechanism and is not a translation.
- The donor has no kill-drop table in the combat code I searched. Frankendom's kill loot needs its own source; this note does not supply one.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one ledger (roll and ledger written once, server-side); licence rule 7
