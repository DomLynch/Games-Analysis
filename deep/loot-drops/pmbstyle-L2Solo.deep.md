# pmbstyle-L2Solo (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | Licence: Apache-2.0 (LICENSE in the donor root) | JavaScript (the sketch is TypeScript) | symbol rewardGroupRoll / rollGroup / selectDropItem / rollDropAmount / deepBlueRule

## 1. Mechanism

- A drop is a reward group: `overall` (percent), a list of items each with a `chance` share (percent of the group) and `min`/`max` amounts (`dropItemBaseChance` 73-77, `dropAmountBounds` 90-93). On a kill, `npcRewards` (World/Generics/NpcRewards.js, 40-60) builds `{npcLevel, killerLevel, attackerLevels}`, then for each reward group calls `rewardGroupRoll(reward, 'drop', ctx)`; on a hit it calls `selectDropItem(reward, groupRoll.itemRate)` then `rollDropAmount(reward, item, groupRoll.itemRate)` and calls `awardDrop` (11-23), which spawns ground item(s) near the NPC through `world.spawnItem` (stackable items as one stack, others one per unit; spawn point within a 50-unit circle, 25-38). The default RNG is `Math.random` (the `rng = Math.random` defaults at lines 57, 119, 136, 172, 194).
- Rates: `profile()` (28-48) multiplies exp, sp, adena, drop, spoil and quest-reward rates by the active preset (x1, x10, x50; lines 1-5; chosen by env `L2NODE_PROGRESSION_RATE` or config, 24-26). `questDrop` is fixed at 1 (42).
- Group rate: `groupRate` (50-55): a group that holds the adena item (`selfId === 57`) uses the adena rate; otherwise the spoil rate when `kind` is `'spoil'`, else the drop rate.
- Deep Blue rule (`deepBlueRule`, 147-170): levels are the killer's plus the attackers', only those finite and above 0; the highest minus the NPC level is the gap (0 when the NPC level is missing or not above 0). A gap below 9 changes nothing (157-159). From 9 up: `penaltyPercent = (gap - 8) * 9` (161), `chanceMultiplier = max(0, (100 - penalty)/100) / 3` (167), and a minimum chance of 0.0001 (168).
- `rewardGroupRoll` (172-192): takes the group rate; if the rule is active, multiplies it by `chanceMultiplier` and, for an adena group, then divides by the drop rate (182-184) so a shared high preset does not cancel the penalty. It calls `rollGroup(overall, rate, rng, minimumChance)`. For a `'drop'` kind under the rule, the amount multiplier is computed from the undiluted base rate (190), and the returned `itemRate` is always the base rate (191), so item selection and amounts ignore the penalty.
- `rollGroup` (57-66): `chance = min(100, max(minimumChance, overall * rate))`; hit is `chance > 0 && rng() * 100 <= chance`; it also returns `amountMultiplier = max(1, overall * rate / 100)` (68-71).
- `selectDropItem` (119-134): weight per item = `min(100, overall * share / 100 * rate)` (79-81), items with zero weight dropped; one roll `rng() * total` walks the cumulative weights; falls back to the last item.
- `rollDropAmount` (136-145): `scaledChance = max(100, itemBaseChance * rate)` (96), repeats = `floor(scaledChance / 100)` plus one more if `rng() * 100 < remainder`; each repeat adds `min` if `min === max` else a uniform integer in [min, max]; the total is at least 1.
- `scaleAmount` (194-199): amount times `max(1, multiplier)`, whole part plus one more if `rng() < fraction`, at least 1. It is used by the spoil path (SpoilSweep.js 55), which was not otherwise read.
- Output: a hit flag, the chosen item and amount, plus the Deep Blue state. Runs once per reward group per kill, server-side.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| rewardGroupRoll | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 172-192 | Full group roll: Deep Blue, rate pick, hit roll, amount multiplier |
| rollGroup | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 57-66 | Clamped percent chance and hit roll |
| selectDropItem | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 119-134 | Weighted pick of one item in a group |
| rollDropAmount | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 136-145 | Repeats from the scaled chance; random amount per repeat |
| deepBlueRule | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 147-170 | Level-gap penalty on drops for over-levelled killers |
| profile / groupRate | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/ProgressionRates.js | 28-55 | Active preset multipliers and per-group rate choice |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group roll in percent, clamped, with a minimum chance floor | Clamp 0..100 (theirs, line 59); minimum 0.0001 (theirs, line 11) |
| Weighted item pick with weight = overall x share / 100 x rate, capped at 100 | Share and cap values are data (theirs) |
| Integer part guaranteed, fractional part a roll | Guaranteed repeats = floor(chance / 100) (theirs) |
| Level-gap penalty: gap threshold, percent per level above it, divisor on the chance | Gap threshold 9, 9 percent per level, divisor 3 (theirs, lines 7-9); the penalty counts from gap - 8 (theirs, line 161); adena id 57 (theirs, lines 52, 182) |
| Rate presets as a single multiplier per kind | Presets x1, x10, x50 (theirs, lines 2-4) |

## 4. TypeScript sketch

Licence: Apache-2.0.

simplified: `rewardGroupRoll` is not composed (the group-rate pick by kind, the adena division by the drop rate, the amount multiplier and `scaleAmount` are omitted, and the base-rate `itemRate` for items is the caller's job); `numberOr` input sanitising, the integer flooring of min/max (`dropAmountBounds`), the preset profile and the expected-value helpers are omitted; `levelPenalty` takes killer levels as one array and assumes they are already above 0.
```ts
// Licence: Apache-2.0 (pmbstyle-L2Solo, src/GameServer/ProgressionRates.js
// rollGroup, selectDropItem, rollDropAmount, deepBlueRule, rewardGroupRoll)
interface Item { id: number; share: number; min: number; max: number; }
interface Group { overall: number; items: Item[]; }
const LEVEL_GAP = 9, PENALTY_PER_LEVEL = 9, CHANCE_DIVISOR = 3, MIN_CHANCE = 0.0001; // all theirs
function levelPenalty(npcLevel: number, killerLevels: number[]): { mult: number; minChance: number } {
  const highest = Math.max(0, ...killerLevels);
  const gap = npcLevel > 0 ? highest - npcLevel : 0;
  if (gap < LEVEL_GAP) return { mult: 1, minChance: 0 };
  const penalty = (gap - (LEVEL_GAP - 1)) * PENALTY_PER_LEVEL;
  return { mult: Math.max(0, (100 - penalty) / 100) / CHANCE_DIVISOR, minChance: MIN_CHANCE };
}
function rollGroupHit(overall: number, rate: number, minChance: number, rnd: () => number): boolean {
  const chance = Math.min(100, Math.max(minChance, Math.max(0, overall) * rate));
  return chance > 0 && rnd() * 100 <= chance;
}
function pickItem(g: Group, rate: number, rnd: () => number): Item | undefined {
  const w = g.items.map((item) => ({ item, weight: Math.min(100, (Math.max(0, g.overall) * Math.max(0, item.share) / 100) * rate) })).filter((e) => e.weight > 0);
  const total = w.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return undefined;
  let roll = rnd() * total;
  for (const e of w) {
    roll -= e.weight;
    if (roll < 0) return e.item;
  }
  return w[w.length - 1].item;
}
// chanceTimesRate = overall * share / 100 * rate (the per-item chance, as in the weight above)
function rollAmount(item: Item, chanceTimesRate: number, rnd: () => number): number {
  const scaled = Math.max(100, chanceTimesRate);
  const guaranteed = Math.floor(scaled / 100);
  const remainder = scaled - guaranteed * 100;
  const repeats = guaranteed + (rnd() * 100 < remainder ? 1 : 0);
  let total = 0;
  for (let i = 0; i < repeats; i++) total += item.min === item.max ? item.min : Math.floor(rnd() * (item.max - item.min + 1)) + item.min;
  return Math.max(1, total);
}
```

## 5. Lands in

- TARGET origins/encounters/encounters.ts (`rollTable`: it already has a roll probability, weighted entries, `dropLimit`/`minDrop`, a quantity per entry and level gates) with origins/server/mob-rewards.ts paying it. The donor's genuinely new ideas are two: (1) the overflow rule, a chance above 100 percent becomes guaranteed repeats plus a fractional roll (`rollDropAmount`), which only matters if Frankendom adds rate multipliers; (2) the level-gap penalty, which Frankendom already has for the career side as `falloffPermille(target level - your level)` in origins/progression/model.ts (grey kills pay 0). If drops should fall off too, add the falloff to the loot roll from the same function, not a second formula with a 9-level threshold. src/ladder.ts is the Pit ladder and is unrelated to PvE drops.
- Parity checklist row 18 (loot roll and XP award; post-K item 3); row 21 for any rate or gap field (catalogue).
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor's default RNG is `Math.random` and the callers do not pass one (NpcRewards.js 51, 53, 55). Frankendom's `rollLoot` takes a seed and the server replays it; the donor's `rng` parameter is the seam to inject a seeded stream, and the draw order (group hit, item pick, amount) must be fixed.
- No hidden numbers: the preset multiplier (x1, x10, x50) is a global rate. A rate would have to be a catalogue field on the loot table (row 21) and must not change fight outcomes; Frankendom has no rate preset.
- Deep Blue needs a level on both sides and the attackers' levels. Frankendom already carries the foe level (`foeLevel` in `rollLoot`) and the career level; it should reuse `falloffPermille` rather than add a threshold constant. With MAX_ATTACKERS = 3 the "highest attacker level" reads at most the three engaged creatures' counterpart, i.e. the player's level plus party members; the donor's `attackerLevels` list has no such bound.
- One ledger: `awardDrop` spawns a ground item via `world.spawnItem` (NpcRewards.js 11-38), with no inventory write at roll time. Frankendom pays through the server inventory in the one transaction with CP.
- Floating-point percentages: the donor uses fractional chances and `<=` on a float roll (62). Frankendom is integer-only in the career model; chances should be whole permille or percent in the catalogue.
