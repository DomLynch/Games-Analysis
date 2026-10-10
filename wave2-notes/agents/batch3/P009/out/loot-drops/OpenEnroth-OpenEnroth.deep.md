# OpenEnroth-OpenEnroth (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Tables/ItemTable.cpp` | Licence: LGPL-3.0 (`/mnt/frankendom-donors/OpenEnroth-OpenEnroth/LICENSE` lines 2-3: "GNU LESSER GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; the files read carry no per-file licence header) | C++ | symbol `ItemTable::generateItem`

Checked: `ItemTable::generateItem` is at Tables/ItemTable.cpp 316-474 (read in full). Also read: `ItemTable::LoadRandomItems` 204-232; `Item::generateGold` 254-285; `RemapTreasureLevel` 760-783; `GenerateItemsInChest` 323-353 (354-356 seen only in part); `Actor::SetRandomGoldIfTheresNoItem` 192-212; `Actor::Die` 1757-1790 (the death-drop part); `Actor::LootActor` 3497-3503 and 3540-3580 (3504-3539 not read); `Character::StealFromActor` 1294-1295 (call site); `Monsters.cpp` treasure-cell parser 443-498. Not read: `itemDropForMonsterType`; `rnditems.txt` and the enchantment data files (stditems, spcitems); the `grng` helpers `random`, `randomSample`, `randomDice`, `randomInSegment`; `Item::GenerateArtifact` (called at Chest.cpp 336); whether `items[2]` is collected anywhere other than the 3504-3539 region. The hint file `src/Engine/Data/ItemData.h` is the item struct only; line 32 holds the per-tier weights. Callers of `SetRandomGoldIfTheresNoItem` found by grep: Character.cpp 1295 and CastSpellInfo.cpp 1961 (only 1295 read). Confidence: high on the order and numbers of `generateItem`, the gold tiers, the chest split, and the remap table; medium on which path ordinary monster kills use, because the middle of `LootActor` was not read.

## 1. Mechanism

Three things roll loot in this donor, and they are separate.

**A. The item roll, `ItemTable::generateItem(tier, requestedType, out)`** (316-474). Input: an item tier 1-6 and a type request, either a specific item type/skill or RANDOM_ITEM_ANY. Output: one item.
- Known-type branch (327-348): collect every spawnable item of the requested type or skill with a non-zero weight for this tier (329-337), keep a running total of the weights (332-334), draw one number in [1, total] (340), and pick the first entry whose running total reaches it (341-345). If no item qualifies, the result is the crude longsword (346-348).
- Any-type branch (349-374):
  - Tier 6 only: draw a random artifact (353). If the draw of `random(100) < 5` succeeds and that artifact is not yet generated and the configured artifact limit is not reached, the artifact is returned at once (356-362). The draw at 353 and the `random(100)` at 357 are evaluated whether or not the artifact is used.
  - Otherwise draw one number in [1, the tier's weight sum] (366) and walk all spawnable items accumulating each tier weight until the running total reaches it (367-373).
- Post-processing for every item (375-445):
  - Potions other than the bottle get power = 2d4 x tier (375-377).
  - Divine Intervention is swapped for Sunray unless a quest bit is set (379-380).
  - Identification flag from the item's repair difficulty (381-384).
  - Enchantment (386-445): weapons (one-handed, two-handed, bow) get a special enchant only if `random(100)` is under the tier's weapon chance (392-397). Armour, shields, helmets, belts, cloaks, gauntlets, boots, rings and amulets roll once for a standard enchant: under the standard chance (409-410) means a standard attribute enchant, chosen by a cumulative pick (411-419), with strength drawn from a tier range (422) and halved for armsmaster, dodge and unarmed (424-428), minimum 1 (430-432). At or over standard plus special (434-435) means none. Otherwise the roll falls through to a special enchant (447-473). Wands get charges = random(6) + damage mod + 1 (440). Other types return (443-444).
  - Special enchant (447-473): candidates are filtered by enchantment level against the tier (457-460), weighted by the item type's chance (461), and picked by a cumulative roll (470-473).

**B. Chest contents, `GenerateItemsInChest`** (Objects/Chest.cpp 323-356). For each chest entry that is a random-item placeholder (327-328): the placeholder's tier is remapped through the map's tier (330-331) and a tier is drawn from the remapped band. A draw of tier 7 means an artifact (333-341). Otherwise 1-5 items are rolled per entry (344). Each one rolls `random(100)`: under 20 nothing (347-349); under 60 gold at the tier (350-351); otherwise `generateItem(tier, any)` (353).

**C. Monster loot.** Three paths, all in Objects/Actor.cpp:
- At death, `Actor::Die` (1757-1790) rolls `random(100) < 20` (1783) and, on success, drops one item chosen by `itemDropForMonsterType` (1781, not read). This is a separate flat drop and does not use the treasure cell.
- Gold dice and the treasure roll are part of `SetRandomGoldIfTheresNoItem` (192-212). It rolls the monster's gold dice into slot 3 when slot 3 is empty (196-203), then rolls `random(100) < treasureDropChance` (205) and calls `generateItem` at the monster's treasure level into slot 2 (206-209), and sets the has-item flag (211). Its call sites seen: stealing (Character.cpp 1294-1295).
- At loot time, `Actor::LootActor` (3497-) either takes slot 3 gold when the has-item flag is set (3547-3558), or, when the flag is not set, rolls `random(100) < treasureDropChance` (3560) and generates the item at the treasure level (3561), then places it in the party or on the holding cursor (3565-3568). Slots 0 and 1 are handled after (3571-3580). Slot 2 does not appear in the lines read.
- Treasure cells are parsed (Monsters.cpp 449-498): "NN%" is the drop chance, defaulting to 100 when the cell has flags but no percent (462-467); "MdS" is M dice of S sides for gold (484-485); "L" plus a digit gives the treasure level (492). The cell "0" means no drop (457-458).

Gold amounts by tier are fixed in `Item::generateGold` (254-285): tier 1 is 50 + random(51), tier 2 is 100 + random(101), tier 3 is 200 + random(301), tier 4 is 500 + random(501), tier 5 is 1000 + random(1001), tier 6 is 2000 + random(3001). The gold item is small for tiers 1-2, medium for 3-4, large for 5-6 (263-283).

Tier remap (`RemapTreasureLevel`, Item.cpp 760-783): a 7x7 table gives a band [min, max] for an item tier and a map tier (764-771; row 2 is at 766), indexed at 781 and returned at 782.

Loading (`LoadRandomItems`, Tables/ItemTable.cpp 204-232): from `rnditems.txt`, the first 618 rows give each item's weight per tier 1-6 (207-218). Tier weight sums are precomputed (220-223). The following rows give the enchant chances per equipment and weapon tier (225-231).

## 2. Key functions

- `ItemTable::generateItem`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Tables/ItemTable.cpp` 316-474. Known-type or any-type weighted pick, artifact gate, potion power, enchant split.
- `ItemTable::LoadRandomItems`: same file 204-232. Per-tier weights and enchant chances from data.
- `GenerateItemsInChest`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Chest.cpp` 323-356. Remap, count, 20/40/40 split.
- `Item::generateGold` and `RemapTreasureLevel`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Item.cpp` 254-285 and 760-783.
- Monster loot: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Actor.cpp` 192-212 (`SetRandomGoldIfTheresNoItem`), 1757-1790 (`Die`, 20% drop), 3497- (`LootActor`, loot-time treasure roll).
- Treasure cell format: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Monsters.cpp` 443-498.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted pick: one roll in [1, sum], first running total >= roll (340-345, 366-373) | None; weights are data per tier (213-218) |
| Percent gate before generation: `random(100) < chance` (205, 3560) | Chance is data per monster (462-467) |
| Death drop: flat 20% (1783) | 20 (theirs) |
| Gold base + random spread per tier (262-282) | Tier table (theirs): 50/51, 100/101, 200/301, 500/501, 1000/1001, 2000/3001 |
| Chest: count 1-5 (344); nothing under 20, gold under 60, else item (347-353) | 1-5, 20, 60 (theirs) |
| Enchant route from one roll: under standard = standard; at or over standard + special = none; else special (409-435) | Standard and special chances per tier, read from data (226-231; values not read) |
| Standard enchant strength halved for three skills (424-428) | Skill list (theirs) and divisor 2 (theirs) |
| Potion power = 2d4 x tier (376) | 2, 4 (theirs) |
| Artifact at tier 6: 5% and a global limit (351-357) | 5 (theirs); limit from config (356) |
| Tier remap from item tier and map tier (764-782) | 7x7 band table (theirs) |
| Wand charges = random(6) + damage mod + 1 (440) | 6 (theirs) |

## 4. TypeScript sketch

simplified: keeps the weighted pick with a running total, the percent gate before generation, the gold tier table, the one-roll enchant split (standard, special, none), and a tier remap through a band table with a uniform draw inside the band (the donor's `randomSample` was not read, so uniform is an assumption). Omits: the known-type branch and its crude-longsword fallback; the tier-6 artifact gate and its global limit; potion power; the Divine Intervention substitution; identification; wand charges; the standard-attribute choice and strength halving; the special-enchant eligibility table; the gold item-type mapping; the chest count and the 20/40/40 split; the death-time 20% drop; the stealing and spell gold rolls; holding-cursor and inventory placement. The random draw order differs from the donor (the donor draws the tier-6 artifact sample even when it is not used), so the sketch does not reproduce the donor's sequence.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Tier = 1 | 2 | 3 | 4 | 5 | 6;

interface Candidate { id: string; weightByTier: Record<Tier, number>; }

// Cumulative-weight pick: one roll in [1, sum], the first entry whose running total reaches it wins.
function weightedPick<T>(items: T[], weight: (t: T) => number, rnd: (n: number) => number): T | undefined {
  let sum = 0;
  for (const it of items) sum += weight(it);
  if (sum === 0) return undefined;
  const roll = rnd(sum) + 1;
  let run = 0;
  for (const it of items) {
    run += weight(it);
    if (run >= roll) return it;
  }
  return undefined;
}

// Item roll at a tier: pick by per-tier weight from the table (data, not code).
function rollItem(tier: Tier, table: Candidate[], rnd: (n: number) => number): string | undefined {
  return weightedPick(table, (c) => c.weightByTier[tier], rnd)?.id;
}

// Gold by tier. Ranges are data: [base, spread] meaning base + rnd(spread).
const GOLD_BY_TIER: Record<Tier, [number, number]> = {
  1: [50, 51], 2: [100, 101], 3: [200, 301], 4: [500, 501], 5: [1000, 1001], 6: [2000, 3001],
};
function rollGold(tier: Tier, rnd: (n: number) => number): number {
  const [base, spread] = GOLD_BY_TIER[tier];
  return base + rnd(spread);
}

// Monster loot gate: roll 0..99 under the drop percentage, then generate at the monster's tier.
function monsterLootRoll(dropPct: number, tier: Tier | null, table: Candidate[], rnd: (n: number) => number): string | undefined {
  if (tier === null) return undefined;
  if (rnd(100) >= dropPct) return undefined;
  return rollItem(tier, table, rnd);
}

// Equipment enchantment: one roll splits into standard, special, or none.
// Donor order: roll < standard -> standard; roll >= standard + special -> none; otherwise special.
function enchantmentRoute(standardPct: number, specialPct: number, rnd: (n: number) => number): 'standard' | 'special' | 'none' {
  const roll = rnd(100);
  if (roll < standardPct) return 'standard';
  if (roll >= standardPct + specialPct) return 'none';
  return 'special';
}

// Zone difficulty remaps an item tier into a band of real tiers (donor RemapTreasureLevel).
// The band table is data. Inside the band the tier is drawn uniformly here; the donor sampling method was not read.
function remapTier(band: [Tier, Tier], rnd: (n: number) => number): Tier {
  const [lo, hi] = band;
  return (lo + rnd(hi - lo + 1)) as Tier;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (engine loot step: tier roll, percent gate, enchant split, one write to the ledger). Parity-checklist row 18 (loot roll and XP award).
- Best transferable idea: keep loot as one per-tier weight table with a single weighted pick and a percent gate in front, so a zone's difficulty only changes which tier band it draws from, not the code.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only: shape, not lines)
- Brief rule served: 1 (one engine, zones as data); rules 7-9 n/a

## 6. Gaps and risks

- LGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor lines are translated.
- Server-verified kills and one ledger: the donor rolls loot inside the same process as the game (grng, pParty and pItemTable are globals), so no server check or ledger exists in this code. Frankendom must roll on the server at kill time and write one ledger entry. Where the item goes when the pack is full is an open choice: the donor uses a holding cursor and a drop (Actor.cpp 3565-3566, 3573-3574).
- Two roll points: the donor rolls the treasure at loot time (Actor.cpp 3560-3561) and a flat 20% drop at death (1783). Frankendom should keep one roll point, most likely at kill time for server verification, and must decide what the other path becomes.
- Artifact limit is global party state (`pParty->isArtifactGenerated`, ItemTable.cpp 355-358). Frankendom's ledger is per character or per server; the uniqueness rule across players must be decided, not copied.
- Replay and the fight record (row 19): the donor draws the tier-6 artifact sample even when the artifact is unused (ItemTable.cpp 353, 357), so the draw order itself is part of the outcome. A seeded, fixed draw order is needed for replay.
- Gold tiers and enchant chances are constants or data in the donor. Frankendom wants them as data fields (zones as data, catalogue rows 20-21), not as code.
- Risk: the special-enchant pick (ItemTable.cpp 470-472) assumes at least one eligible candidate and asserts at 472. I did not check what happens when no candidate matches a tier. Frankendom should guard that case.
- Unresolved in the donor: whether `items[2]` (the treasure rolled at steal or spell time) is collected anywhere. Lines 3504-3539 of LootActor were not read, so I do not claim it is lost.
