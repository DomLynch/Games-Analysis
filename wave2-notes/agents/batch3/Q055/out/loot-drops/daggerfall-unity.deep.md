# daggerfall-unity (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/LootTables.cs` | Licence: MIT License (LICENSE file: "Copyright (c) 2009-2023 Daggerfall Workshop"; per-file header LootTables.cs:4) | C# (Unity) | symbol `LootTables.GenerateRandomLoot`

Checked: Read: LootTables.cs 1-273 (header 1-76, the matrix rows 77-101 via a grep of the rows, GetMatrix 110-119, GenerateLoot 121-161, GenerateRandomLoot 176-256, RandomIngredient 262-268), Dice100.cs 4-22, DaggerfallLoot.cs 77-83, EnemyEntity.cs 330 and 389-396 (within SetEnemyCareer from 248), EnemyDeath.cs 47-56, 62-130 and 161-167, SetupDemoEnemy.cs 1-30 and 140-190. Callers: GenerateRandomLoot is called only from DaggerfallLoot.GenerateItems (DaggerfallLoot.cs:80); GenerateItems is called from EnemyEntity.cs:330 and LootTables.cs:148 (interior loot by location index). SetEnemyCareer is called in the donor only from SetupDemoEnemy.cs:166, 171 and 183 (grep of Assets and the whole donor). Not read: ItemBuilder.Create* bodies, ItemCollection.Import, the MapChance values, and EnemyBasics.cs beyond the LootTableKey lines a grep returned. Confidence: high on the roll order and numbers (read end to end). Moderate on timing: I read SetupDemoEnemy.cs's header and the call site, but did not trace the Unity lifecycle that runs it at spawn.

## 1. Mechanism

- A loot "key" (for example "A", "C", "T") selects a chance matrix (LootTables.cs 77-101). Unknown keys fall back to row 0, which is empty (118).
- `GenerateRandomLoot` builds the bag in this order (176-256):
  1. Gold: `goldCount = Random.Range(MinGold, MaxGold + 1) * PC level` (194). Inclusive range, multiplied by the player's level. Added only if above 0 (196-198).
  2. Weapons: repeat roll from `WP` (201-206).
  3. Armour: repeat roll from `AM` (209-214).
  4. Ingredients, in this order: C1 x level, C2 x level, C3, P1 x level, P2 x level, M1, M2 (217-223). Each is its own repeat roll (helper 262-268).
  5. Magic items from `MI` (226-231). 6. Clothing from `CL` (234-239). 7. Books from `BK` (242-247). 8. Religious items from `RL` (250-255).
- Repeat roll: while `Dice100.SuccessRoll((int)chance)` is true, add one item and `chance *= 0.5f` (202-205). The `(int)` cast runs before each roll, so the chance shrinks in whole steps. Chance 0 never succeeds.
- `Dice100.SuccessRoll(c)` is `Random.Range(0, 100) < c` (Dice100.cs 15-17): a uniform integer 0-99 below the chance.
- Before the rolls, `Random.InitState(items.GetHashCode())` reseeds the Unity global random (191). Items is a fresh list, so the seed is that list's object hash.
- Enemy use: `EnemyEntity.SetEnemyCareer` calls `DaggerfallLoot.GenerateItems(mobileEnemy.LootTableKey, items)` (330), which fills the enemy's own inventory at setup. Then a map roll (389) and, when the key is non-empty, a potion at 3 and a recipe at 2 (391-396, the recipe call at 396).
- On death: `EnemyEntity_OnDeath` only sets `performDeath` (161-167). `Update` calls `CompleteDeath` on the next tick (54-56). `CompleteDeath` disables the enemy object (62 onward), creates a lootable corpse container (96), and moves the entity's whole inventory into it (123). So the bag is rolled at setup and handed over at death.

## 2. Key functions

- `LootTables.GenerateRandomLoot`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/LootTables.cs` 176-256. The whole bag: gold, then the category repeat rolls.
- `RandomIngredient`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Items/LootTables.cs` 262-268. Same repeat roll, reused for the seven ingredient groups.
- `Dice100.SuccessRoll`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/Dice100.cs` 15-17.
- `DaggerfallLoot.GenerateItems`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Internal/DaggerfallLoot.cs` 77-83. Looks up the matrix and imports the new items.
- `EnemyEntity.SetEnemyCareer` (loot lines): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/EnemyEntity.cs` 330 and 389-396.
- `EnemyDeath.CompleteDeath` (corpse transfer): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyDeath.cs` 62 onward; transfer at 123; death flag at 161-167.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Gold: inclusive random range, times the level of the looter | Key A: 1-10; key C: 2-20 (theirs, LootTables.cs 79 and 82) |
| Category repeat roll: success adds one item, chance halves per success | Halving factor 0.5 (theirs, 205); first chance is the row value (theirs, e.g. WP 25 for key C at 82) |
| Integer roll under a 0-99 range: success when roll < chance; chance 0 never succeeds | Range 0-99 (theirs, Dice100.cs 17) |
| Integer truncation of the chance before each roll | `(int)` cast (theirs, 202 and 264) |
| Level scaling on some categories only | P1, P2, C1, C2 x PC level (theirs, 217, 218, 220, 221); C3, M1, M2, WP, AM, MI, CL, BK, RL not scaled (theirs, 201-250) |
| Potion add-on behind a non-empty loot key | Potion 3, recipe 2 (theirs, EnemyEntity.cs 394 and 396) |
| Map add-on per enemy | `MapChance` is a per-enemy field (theirs, 389; value not read) |

Worked numbers from the code (computed from the rules above, not from a run):
- Key C at PC level 5, P1: chance 10 x 5 = 50, so the roll chances are 50, 25, 12, 6, 3, 1, then 0 (never). At most 6 ingredients from that group.
- Key T (row 100: AM 100, WP 100): chances 100, 50, 25, 12, 6, 3, 1, then 0. At most 7 armour and 7 weapons.
- Key C at PC level 5, gold: `Random.Range(2, 21) * 5`, so 10 to 100 inclusive.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rules: inclusive gold range times level, one repeat roll per category with the chance halved after each success, the integer truncation before each roll, chance 0 never succeeds, and level scaling on the categories named in a set. It omits the item creation (ItemBuilder), the donor's exact order (the donor rolls weapons, armour, then the ingredient groups in a fixed order, then magic, clothing, books, religion; the sketch walks the matrix's own key order), the Random.InitState reseed, the map, potion and recipe add-ons, the interior location table, and the OnLootSpawned event. Ingredient groups are separate keys, as in the donor.

```ts
// Licence: MIT (donor, Daggerfall Workshop). Shape adapted; written fresh, not a line-by-line port.
interface LootMatrix {
  minGold: number;                 // inclusive gold range, scaled by PC level
  maxGold: number;
  chance: Record<string, number>;  // percent (0-100) per category key
  levelScaled: Set<string>;        // categories whose chance is multiplied by PC level
}

interface LootRoll {
  category: string;
  count: number;
}

// rng() returns a float in [0, 1). successRoll is "uniform integer in [0, 99] < chance".
function successRoll(chance: number, rng: () => number): boolean {
  return Math.floor(rng() * 100) < chance; // chance 0 can never succeed
}

// Repeated roll: each success adds one item and halves the chance. The chance is truncated
// to an integer before each roll, as the donor casts (int) before its roll.
function repeatCount(baseChance: number, rng: () => number): number {
  let count = 0;
  let chance = baseChance;
  while (successRoll(Math.trunc(chance), rng)) {
    count++;
    chance *= 0.5;
  }
  return count;
}

function generateLoot(m: LootMatrix, pcLevel: number, rng: () => number): { gold: number; rolls: LootRoll[] } {
  const span = m.maxGold - m.minGold + 1;
  const gold = (m.minGold + Math.floor(rng() * span)) * pcLevel;

  const rolls: LootRoll[] = [];
  for (const [category, base] of Object.entries(m.chance)) {
    const chance = m.levelScaled.has(category) ? base * pcLevel : base;
    const count = repeatCount(chance, rng);
    if (count > 0) rolls.push({ category, count });
  }
  return { gold, rolls };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/q055-loot-matrix-daggerfall.ts: exit 0 (run in this session). Sketch file: /private/tmp/p2/wave2-haiku/batch3/Q055/work/loot-matrix-daggerfall.ts.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new engine module): the bag roll. The matrix is zone data (keyed per enemy); the halving, the truncation and the level scaling are engine rules. Parity-checklist row 18 (loot roll and XP award). The roll is one call at the server-verified kill, not at spawn.
- Today: the Frankendom repo was not checked in this pass, so no current loot file is named here.
- Best transferable idea: A category-by-category repeat roll, where each success halves the next chance, gives a bag that is mostly small, with rare big bags, and a per-zone table of percent chances is enough to tune it.
- Decision (proposed): adapt - we want the matrix and the halving repeat roll as zone data and one engine rule, but not the donor's spawn-time roll, its level source or its global random reseed.
- Acceptance: A server test with a fixed seed kills a key-C enemy at killer level 5 and asserts gold in 10-100 inclusive, at most 6 P1 items, no 0-chance category in 10,000 seeded rolls, and the ledger gains exactly the logged bag once; the corpse shows the same items.
- Reuse tag: adapt (MIT, Daggerfall Workshop 2009-2023; the code may be adapted, the donor is cited in the header)
- Brief rule served: zones as data (the matrix is per key), one ledger (one bag, moved once), server-verified kills (the roll happens on the server at the kill).

## 6. Gaps and risks

- Timing: the donor rolls at enemy setup and hands the bag over at death (330; 123). Frankendom verifies kills on the server, so the roll must happen at the verified kill, with the seed written to the fight record (row 19). Copying the spawn-time roll would let a client see the bag before the kill.
- Level source: the roll reads the one local `PlayerEntity.Level` (194, 217, 220). Frankendom has many players; pass the killer's level explicitly.
- Global random: `Random.InitState(items.GetHashCode())` (191) reseeds the Unity global random for the whole game on each loot roll. Use a dedicated seeded stream and never reuse the donor line.
- Seed quality: the game does not choose the seed (the list's object hash, 191), so a bag cannot be replayed from a logged seed. Frankendom needs a logged seed to replay a bag.
- Level scaling is not consistent in the donor's own comments (LootTables.cs 179-181 names groups differently from the code at 217-221). The code is the truth here; we follow the code and the named keys.
- Gold and items are the only parts that map to Frankendom now. Ingredients, magic items, clothing, books and religious items need item types Frankendom does not have (ItemBuilder not read); leave those keys out of the first version.
- The number of successes per category depends on the starting chance. An unscaled row of 100 (key T) gives at most 7 (100, 50, 25, 12, 6, 3, 1). A level-scaled group starts at base times PC level (217, 218, 220, 221), so it can start above 100: for example P1 10 at level 30 is 300 and gives up to 9 successes (300, 150, 75, 37, 18, 9, 4, 2, 1). The halving is a cap that grows with level, not a fixed 7. Set a cap per category in zone data if the bag size matters.
- Classic divergence: the donor's own comment (184-186) says classic gives even a 0 percent category a 1 in 100 chance, but the donor code does not (chance 0 never succeeds). Interior keys J to O also add map, potion and recipe rolls (`GenerateLoot` 154-161; not sketched).
- The donor's corpse transfer moves the whole entity inventory (123); the quest comment says quest rewards are stashed there too. For Frankendom that is a second ledger source; keep the bag as one ledger entry per roll.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Gap 'halving gives at most 7 successes per category' is false for level-scaled groups: chance is base*PC level (LootTables.cs 217,218,220,221), so e.g. P1 10 at level 30 = 300 gives 9 successes (300,150,75,37,18,9,4,2,1). The 7 limit only holds for unscaled 100 rows (key T). Worked numbers (6 for key C L5 P1, 7 for T, gold 10-100) verified. Other claims verified: order 194-255, 0.5 factor, (int) casts, Random.InitState 191, Dice100 15-17, EnemyEntity 330/389-396 (3 and 2), EnemyDeath 54-56/96/123/161-167, callers, MIT header line 4.

**Missed:** LootTables.GenerateLoot 154-161: interior keys J-O also get map (2,1,1,2,2,15), potion 4, recipe 2; code comment 184-186 says classic gives even 0% categories a 1/100 chance, donor code does not (never succeeds at 0) - useful divergence to note.
