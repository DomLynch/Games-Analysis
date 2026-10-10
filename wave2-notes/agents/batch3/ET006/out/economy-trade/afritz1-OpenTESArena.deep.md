# afritz1-OpenTESArena (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` (`getLootGoldAmount` 721-772, `getLootValuesIndex` 689-702, `getPopulatedLootSlots` 704-719), with `Interface/GameWorldUiState.cpp` 2685-2757 (shop buy and sell), 2789-2857 (tavern drink and room), `Items/ArenaItemUtils.cpp` 28-39, `Items/ItemLibrary.cpp` 12-43, `Items/ItemDefinition.cpp` 326-349, `Entities/EntityChunkManager.cpp` 816-820 and 899-902 | Licence: MIT (`LICENSE.txt` line 1 "The MIT License (MIT)"; line 3 "Copyright (c) 2016-2026 The OpenTESArena Developers") | C++ | symbol `ArenaEntityUtils::getLootGoldAmount` (shop: `GameWorldUI::makeShopkeeperItemSellCallback`)

Checked: The hint file (`Entities/EntityChunkManager.cpp`) is the container builder; I read only its gold lines (816-820, 899-902) and used them as callers. The price rules are in `Interface/GameWorldUiState.cpp`. Read in full: `makeShopkeeperItemPurchaseCallback` (2685-2717), `makeShopkeeperItemSellCallback` (2719-2757), `makeTavernDrinkPurchaseCallback` (2789-2827), `makeTavernRoomPurchaseCallback` (2830-2862; the closing brace was not read), `getLootGoldAmount`, `getPopulatedLootSlots`, `getLootValuesIndex`. Read in part: the shop list build (2040-2110; the weapon and armour lists only), `ItemDefinition::getGoldValue` (326-349), the magic-price functions (`ArenaItemUtils.cpp` 28-39 and the two calls in `ItemLibrary.cpp`), the table loads in `ExeData.cpp` (grep, lines 667-755). Not read: the body of `getHumanEnemyGold`, the corpse and pickpocket amounts (`GameWorldUiMVC.cpp` 1515, 1595; `PlayerLogic.cpp` 656), the caller that combines slot population with gold (`EntityChunkManager.cpp` 880-905, only 899-902 read), the `ArenaRandom` generator (only the `next(exclusiveMax)` signature, `Math/Random.h` 30, read). Barter: `TextAssetLibrary.cpp` 556-559 loads barter, offer-refused and counter-offer strings; a grep of `src/` found no code that uses them, so haggling is not implemented in this donor. Mages Guild spells: `GameWorldUiState.cpp` 2783 says "Spells not implemented." Candidates opened (at least three): `GameWorldUiState.cpp`, `ArenaEntityUtils.cpp`, `ItemDefinition.cpp`, `ArenaItemUtils.cpp`, `ItemLibrary.cpp`, `EntityChunkManager.cpp`. Confidence: high on the shop buy and sell rules, the tavern debits, and the loot gold formulas (read in full); medium on how the container caller orders slots and gold (not read in full). Scope: economy, not camera. Camera scope: not applicable.

Best transferable idea: Pay loot gold from one small range per interior class (halved in villages, doubled elsewhere, scaled by the square of the level in dungeons) and keep the shop sell rate at three quarters so that resale is never a money source.
Decision (proposed): adapt — take the per-class gold ranges as zone data and the three-quarter resale rule as one engine constant; reject the donor's two gold representations (a counter for shops and an inventory item for loot), the price captured when the list is built, and the equipped-item sale without refusal, because the one-ledger and server-verified rulings need one counter and a server-side price check.
Acceptance: A dungeon container at level 3 holds 10 to 109 gold, a village house container holds 1 to 5, a non-village noble container holds 40 to 200; all of it lands in the one gold counter; a sale of a 100-gp item pays 75; a purchase of a 75-gp item with 74 gold is refused and nothing moves.

## 1. Mechanism

One gold counter (`player.gold`) is the money in the shop, tavern and corpse paths. Loot gold is a different path (see Gaps). The sinks and faucets, in the order the code runs:

Shop buy (`GameWorldUiState.cpp` 2685-2717):
- (a) The price is the catalogue base for the item type (`ItemDefinition::getGoldValue`, 326-349). The shop list reads it when the list is built (2062 for weapons; 2099 for armour) and passes it into the callback (2071, 2109; captured by the lambda at 2687).
- (b) Check: gold at least the price (2702). If not, "too expensive" (2713-2714).
- (c) Insert the item (2705), then debit the captured price (2706). No stock count and no shop gold pool are read in this function.
- (d) No skill, charisma or condition factor appears in the price functions read.

Shop sell (`GameWorldUiState.cpp` 2719-2757):
- (a) Value = catalogue base (2738).
- (b) Pay `(3 x value) / 4`, integer division, which is 75% (2739). Credit the gold (2741).
- (c) Clear the slot and compact the inventory (2742-2743).
- (d) If the item is equipped, a weapon animation reset runs (2745-2751). No refusal is written for an equipped item.

Other sinks, same check-then-debit pattern:
- Tavern drink (2805-2807): debit, then the drink effect is applied when the message closes (2812-2815).
- Tavern room (2848-2853): debit (2850), then the room is rented for 24 (2852-2853) hours.
- Mages Guild spells are not for sale (2783: "Spells not implemented.").

Faucets:
- Loot containers (`ArenaEntityUtils.cpp`):
  - (a) The interior class maps to a loot table index: house 0, palace 1, noble 2, dungeon 3, crypt and tower 4 (`getLootValuesIndex` 689-698; constants `ArenaEntityUtils.h` 94-99).
  - (b) House (727-737): `random.next(9) + 2` gives 2 to 10; halved by integer division in a village (730-732), doubled elsewhere (735-736).
  - (c) Palace (741-746): a per-city value from the executable table, `palaceGoldValues`.
  - (d) Noble (748-761): the house rule (2 to 10, halved or doubled), then times 10 (760).
  - (e) Dungeon and crypt or tower (763-766): `level x level` plus `random.next(100) + 1` (1 to 100).
  - (f) The caller inserts the gold as an inventory item (900-902) and marks the first possible slot as gold (899: "The first possible item is gold").
- Slot population (704-719): each container slot is filled on its own roll; the chance comes from the executable table at `4 x class + slot` (710-712), filled when `roll <= chance` with roll `next(100) + 1` (714-715).
- Enemy gold (817-820) uses `getHumanEnemyGold`; corpse gold (1515, 1595) and pickpocket gold (656) are added to the counter. Their amount functions were not read.

Catalogue prices (`ArenaItemUtils.cpp` 28-39; `ItemLibrary.cpp` 25, 38):
- (a) An armour-class accessory costs its material multiplier x 50 (31).
- (b) An attribute enhancement costs the base item price plus the attribute price (38).
- (c) Both tables come from the executable (`ExeData.cpp` 667-755; `ExeData.h` 347-350).

Worked by hand from the formulas (not run):
- Sell a 100-gp item: 3 x 100 / 4 = 75.
- Buy a 75-gp item with 74 gold: refused (2702).
- Dungeon at level 3: 9 + (1 to 100) = 10 to 109.
- Village house: (2 to 10) / 2 = 1 to 5 (integer division). Non-village house: (2 to 10) x 2 = 4 to 20.
- Non-village noble: (2 to 10) x 2 x 10 = 40 to 200. Village noble: (2 to 10) / 2 x 10 = 10 to 50.

## 2. Key functions

- `GameWorldUI::makeShopkeeperItemPurchaseCallback`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Interface/GameWorldUiState.cpp` 2685-2717.
- `GameWorldUI::makeShopkeeperItemSellCallback`: same file, 2719-2757.
- `makeTavernDrinkPurchaseCallback` and `makeTavernRoomPurchaseCallback`: same file, 2789-2862.
- `ArenaEntityUtils::getLootGoldAmount`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/ArenaEntityUtils.cpp` 721-772.
- `ArenaEntityUtils::getPopulatedLootSlots`: same file, 704-719.
- `ArenaEntityUtils::getLootValuesIndex` (interior to table index): same file, 689-702.
- `ArenaItemUtils::getArmorClassMagicItemBasePrice` and `getAttributeEnhancementMagicItemBasePrice`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Items/ArenaItemUtils.cpp` 28-39.
- `ItemDefinition::getGoldValue`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Items/ItemDefinition.cpp` 326-349.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Buy at full catalogue value after an affordability check; sell at three quarters, integer division | 3/4 (`GameWorldUiState.cpp` 2739); the check (2702) |
| Loot gold as a fixed range per container class | House 2 to 10 (`ArenaEntityUtils.cpp` 729); noble 2 to 10 (750) |
| Village halves the range, other cities double it | Halve (732); double (736) |
| Noble multiplier | 10 (760) |
| Dungeon gold grows with level squared, plus a roll | `level x level` plus 1 to 100 (765) |
| Per-slot chance, roll 1 to 100 | Roll `next(100) + 1` (714); fill when roll <= chance (715) |
| Price as the sum of two tables | Material multiplier x 50 (`ArenaItemUtils.cpp` 31); base plus attribute (38) |
| Palace gold from a per-city table | `palaceGoldValues` (`ArenaEntityUtils.cpp` 745) |
| Tavern room rented for a fixed period | 24 hours (`GameWorldUiState.cpp` 2852) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for each loot class (the class switch, the roll, the village halving or non-village doubling, the noble times 10), the slot roll, the check-then-debit shop buy, the integer three-quarter sell, and the two-table catalogue price. It omits: the executable tables (passed in as data), the enemy, corpse and pickpocket gold, the tavern effects and room timer, the stock and the list-time capture of price (the sketch reads the price at buy time, which is the Frankendom choice), the caller that combines slots and gold, and the donor's `ArenaRandom` generator (the sketch takes an injected `Rng`). The sketch does not reproduce the donor's two gold representations.

```ts
// Licence: MIT (donor, LICENSE.txt). Adapted shape, written from the mechanism as read.
interface Rng { next(exclusiveMax: number): number; } // donor: next(n) returns 0..n-1

interface CityCtx {
  isVillage: boolean;   // the donor halves some gold in villages and doubles it elsewhere
  cityIndex: number;    // index into the per-city palace table (the donor has 3 entries)
}

type Interior = "house" | "palace" | "noble" | "dungeon" | "crypt";

// Gold on a loot container. Mirrors the donor's case order: house, palace, noble, dungeon/crypt.
function lootGold(kind: Interior, city: CityCtx, levelIndex: number, rng: Rng, palaceTable: number[]): number {
  switch (kind) {
    case "house": {
      let g = rng.next(9) + 2;                         // 2..10 when next(9) is 0..8
      g = city.isVillage ? Math.trunc(g / 2) : g * 2;
      return g;
    }
    case "palace":
      return palaceTable[city.cityIndex];              // fixed per city class (data table)
    case "noble": {
      let g = rng.next(9) + 2;
      g = city.isVillage ? Math.trunc(g / 2) : g * 2;
      return g * 10;                                   // nobles carry ten times the house amount
    }
    case "dungeon":
    case "crypt":
      return levelIndex * levelIndex + (rng.next(100) + 1); // grows with the square of the level, plus 1..100
    default:
      return 0;
  }
}

// Each container slot is filled on its own roll: populated when roll (1..100) <= the slot's chance (data table).
function populatedLootSlots(chances: number[], rng: Rng): boolean[] {
  return chances.map((c) => rng.next(100) + 1 <= c);
}

// Shop: buy at the full catalogue price (must be affordable); sell at three quarters, integer division.
function shopBuyPrice(basePrice: number): number {
  return basePrice;
}
function shopSellPrice(basePrice: number): number {
  return Math.trunc((3 * basePrice) / 4);
}
function tryBuy(gold: number, price: number): { ok: boolean; gold: number } {
  return gold >= price ? { ok: true, gold: gold - price } : { ok: false, gold };
}

// Catalogue prices built from two tables: a material multiplier x 50 for armour-class items,
// and base item price + attribute price for attribute enhancements.
function armourClassAccessoryPrice(materialMultiplier: number): number {
  return materialMultiplier * 50;
}
function enhancementAccessoryPrice(baseItemPrice: number, attributePrice: number): number {
  return baseItemPrice + attributePrice;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/arena-loot-shop.ts`) passed with no output (run in this session).

## 5. Lands in

- TARGET `origins/economy/loot-gold.ts` (new; per-class gold ranges and slot chances as zone data; the resale rule goes to `origins/economy/prices.ts`, shared with the Barony and Valve notes).
- Parity-checklist row 18 (loot roll and XP award). The container gold amount and the per-slot roll are the loot roll. Row 21 (catalogue fields) would cover the two-table prices, but it is not the chosen row.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed; the sketch is written from the mechanism)
- Brief rule served: one ledger (gold lands in one counter, not as an inventory item); zones as data (class ranges and chances per zone)

## 6. Gaps and risks

- Two gold representations. Shops, taverns and corpses use the `player.gold` counter (2702-2706, 2807, 2850, 1515). Loot inserts gold as an inventory item (902), and enemy gold does the same (820). The one-ledger ruling needs one counter; loot must credit it.
- The shop price is captured when the list is built (2062, 2687). A price that changes while the list is open is paid at the old value, and nothing on the server rechecks it. Frankendom: the server re-prices at purchase.
- No stock check on purchase (2702-2706). In the code read, the same item can be bought without limit. Frankendom: stock as data, checked on the server.
- Equipped items can be sold. The sell callback resets the weapon animation (2745-2751) and does not refuse. Frankendom: refuse, or unequip first on the server.
- The shop price check and debit live inside UI callbacks (`GameWorldUiState.cpp` 2685-2757). Frankendom: the check, debit and grant belong in the engine module, not the UI.
- Barter is not implemented: the strings are loaded (`TextAssetLibrary.cpp` 556-559) but nothing in `src/` uses them. There is no haggling to copy.
- Spells are not for sale in this donor (2783). There is no spell sink to copy.
- Dungeon gold grows with level squared (765) and has no cap in the function. A deep dungeon can pay more than a shop sword. Frankendom must tune it per zone as data; this is not tested.
- The enemy, corpse and pickpocket amounts were not read (see Checked). Their rates are unknown.
- The caller that combines slot population with gold was only partly read (899-902). Whether a failed slot roll skips the gold was not checked.
- The loot tables and palace values come from the original game's executable. Frankendom must write its own numbers as zone data; the donor's numbers are not a balance target.
- Licence: MIT. Adaptation is allowed; the sketch is still written from the mechanism.
