# daggerfall-unity (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` | Licence: MIT (LICENSE: "Copyright (c) 2009-2023 Daggerfall Workshop", MIT) | C# (Unity) | symbol `CalculateTradePrice` (with `CalculateCost`, `UpdateRegionalPrices`, `DeductGoldAmount`)

Checked: The cell hint was INFERRED, so I searched with grep for Mercantile, buy and sell price words, and the trade window. The real pricing lives in `FormulaHelper.cs`, not in the window. Read in full: `CalculateCost` (1884-1899), `CalculateItemRepairCost` (1902-1921), `CalculateItemIdentifyCost` (1935-1956), `CalculateTradePrice` (1976-2004), `ApplyRegionalPriceAdjustment` (2026-2045), `RandomizeInitialRegionalPrices` and `UpdateRegionalPrices` (2047-2095). Also read: `DaggerfallTradeWindow.cs` 443-505 (list cost and the buy, sell and identify branches), 1020-1125 (transaction and haggle tiers); `PlayerEntity.cs` 430-455 (daily trigger), 1310-1350 (`GetGoldAmount`, `DeductGoldAmount`), 2183-2195 (initial regions); `DaggerfallBankManager.cs` 76-95, 362-410 (withdraw, deposit, letters of credit); `Dice100.cs` 20-25 (grep context). Callers: `CalculateCost` has five call sites: FormulaHelper 1916 (read, repair), DaggerfallTradeWindow 443, 462 and 466 (seen by grep only; 443 and 466 are the list and identify lines, 462 the repair line), and GuildServiceCureDisease 85 (grep only). `CalculateTradePrice` has five call sites (DaggerfallTradeWindow 498 and 502 read; SpellBookWindow 687, TavernWindow 200 and CureDisease 92 seen by grep only). `UpdateRegionalPrices` has one caller (PlayerEntity 446, read). Confidence: high on the formulas and the order of operations (read line by line; the fixed-point precedence checked by hand). Medium on the numbers in section 3 (computed by hand and by a TypeScript run of the sketch, not in the Unity build). Not read: the faction power range (`merchantsFaction.power`, `regionFaction.power`), the material and enchantment value modifiers on `item.value`, the consumers of PricesHigh and PricesLow, the bank window's redemption UI, `TryGetOverride` (a mod hook, client-only). Licence: MIT, so the code may be adapted; the sketch is still written from the mechanism.

## 1. Mechanism

- Base value: an item's `value` starts at its template `basePrice` (DaggerfallUnityItem.cs 563). The comment in ItemsFile.cs says material and mercantile modify it later; the material step was not read.
- List cost (`CalculateCost`, 1884-1899). Order: floor the base at 1 (1892-1893); multiply by the region's price index and divide by 1000, floor at 1 (1895 calls `ApplyRegionalPriceAdjustment`, which is 2041-2043); then `cost = 2 * (cost * (shopQuality - 10) / 100 + cost)` (1896). At shop quality 10 the list cost is twice the adjusted base; each point above 10 adds 1 percent of the adjusted base, doubled. Shop quality is documented as 0 to 20 (1881). The `conditionPercentage` argument is not used in the default body (1884-1899).
- Trade price (`CalculateTradePrice`, 1976-2004). First, two levels: `merchant_mercantile_level = 5 * (shopQuality - 10) + 50` (1983), and personality level is the same expression (1984). Then a fixed-point mix, where each product is shifted back by 8 bits (`>> 8`) and `/200 + 128` maps a 0-100 stat to a factor between 128 and 256.
  - Selling (1990-1994): the player's Mercantile and Personality both raise the price. `amount = ((((179 * dm) >> 8) + ((51 * dp) >> 8)) * cost) >> 8`.
  - Buying (1996-2000): the player's Mercantile and Personality both lower it, because the stat enters as `100 - stat`. `delta_personality` is shifted left 6 after its shift (1999), then `amount = ((((192 * dm) >> 8) + (dp >> 8)) * cost) >> 8`.
- Which branch runs: in the trade window, `GetTradePrice` (492-505) sends Buy and Repair to the buy branch (498), Sell and SellMagic to the selling branch (502), and Identify returns the list cost with no bargain. The price shown is the list cost times the stack count (443).
- Payment, buy: `PlayerEntity.DeductGoldAmount(tradePrice)` (1055). The deduction takes gold pieces first if they cover the price (1326), otherwise consumes letters of credit in order (partial consumption of one letter, then the next), then gold pieces; it returns any unpaid remainder (1320-1350). The trade window ignores that return value.
- Payment, sell: gold pieces are added (1041) if carried weight plus the gold's weight stays under the encumbrance limit; otherwise the player gets a letter of credit item with `value = tradePrice` (1038-1046).
- Skill: each completed trade adds one point of Mercantile through `TallySkill` (1088). Skill rises by use.
- Haggle tiers (ShowTradePopup 1103-1110): compares the trade price with half the list cost (1105) and with three quarters (1107) to choose a message. Message only; it does not change the price.
- Repair uses the same list formula on 10 percent of value (`CalculateItemRepairCost`, 1913-1916, then `CalculateCost`), returns 0 when condition is already at max (1907-1908, read), and then a guild may reduce it. Repair then goes through the buy branch (498).
- Identify cost (`CalculateItemIdentifyCost`, 1935-1953): `(25 * baseItemValue) >> 8`, about 9.8 percent of value (1950), free on the Witches Festival holiday (1941-1948), and reduced by a guild (1953). Identify is not bargained.
- Regional price index (the drift that makes prices move):
  - Initial index per region: `750 + Random(0..500)`, so 750 to 1250 (2050). Index 1000 is 1.0x.
  - Update: once for each elapsed game day (PlayerEntity 441-446: `daysPast = currentDay - lastDay`, then `UpdateRegionalPrices(ref regionData, daysPast)` inside `if (daysPast > 0)`). It loops `times` steps (2065) and only over regions where the player has a region faction record (2063). It returns early if the Merchants faction record is missing (2057-2058).
  - Each step: `chance = (merchantsPower - regionPower) / 5 + 50 - (index - 1000) / 25` (2067-2068). The roll `Dice100.FailedRoll(chance)` is true when a random 0-99 is at or above the chance (Dice100.cs 22), so the index rises with probability `chance`% (clamped by the range of the roll). A fall multiplies by 49/50 (2070), a rise by 51/50 (2072). The index is clamped to 250 to 4000 (2074).
  - The mean reversion is in the chance itself. At index 1000 with equal faction power the rise chance is 50 percent. Each 25 points above 1000 takes one point off the rise chance; each 25 below adds one. At 1500 the chance is 30 percent and the expected daily factor is 0.992 (computed by hand: 0.3 x 1.02 + 0.7 x 0.98). At 250 the chance is 80 percent and the factor is 1.012.
  - Flags (2075-2086): an index above 2000 turns on PricesHigh (2086); an index below 500 turns on PricesLow (2083); from 500 to 2000 both are cleared.
- Money outside the trade: `GetGoldAmount` (1313-1315) is gold pieces plus letters of credit. Bank accounts are per region. A withdrawal of gold is refused when the carried weight would exceed the limit (DaggerfallBankManager 370). A letter of credit withdrawal adds a commission (`locCommission = 1.01`, 192; applied at 395) and needs at least 100 (398).

## 2. Key functions

- `CalculateCost`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1884-1899. List price: floor, regional index, then the quality factor.
- `CalculateTradePrice`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 1976-2004. Buy and sell fixed-point mixes.
- `ApplyRegionalPriceAdjustment`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 2026-2045. Index divided by 1000, floored at 1.
- `UpdateRegionalPrices`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 2053-2095. Daily drift with mean reversion, clamp, and flags.
- `DaggerfallTradeWindow.ConfirmTrade_OnButtonClick` (transaction): `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallTradeWindow.cs` 1030-1090 (read in part).
- `PlayerEntity.DeductGoldAmount`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` 1324-1350.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Vendor list cost = adjusted base x (1 + markup), markup from quality | Quality 10 is the neutral point; quality factor 1 percent per point, doubled (1896); quality documented 0-20 (1881) |
| Regional index as a multiplier, 1000 = 1.0x | Division by 1000 (2041); floor 1 (2042-2043); initial 750 + roll 0-500 (2050) |
| Price changes by a fixed step with a chance that depends on distance from the mean | Step 49/50 and 51/50 (2070, 2072); chance = power difference / 5 + 50 - (index - 1000) / 25 (2067-2068); clamp 250 to 4000 (2074) |
| Trade price as a fixed-point mix of two stats | Levels 5 x (quality - 10) + 50 (1983); buy weights 192 and 128-256 factors; sell weights 179 and 51 (1994, 2000) |
| Repair and identify as fractions of value | Repair 10 percent (1913); identify 25 >> 8 (1950) |
| Flags at thresholds | Above 2000 high, below 500 low (2075-2086) |

Worked numbers, base value 100 at neutral index (1000), computed from the formulas (python and then the TypeScript sketch in section 4, both gave the same values):

- List cost: quality 10 gives 200; quality 15 gives 210; quality 20 gives 220. A regional index of 1500 at quality 10 gives 300.
- Buy at quality 10 (list 200): skill 0 and personality 50 gives 140; skill 50 and personality 50 gives 112; skill 100 and personality 50 gives 84. Personality 0 at skill 50 gives 121; personality 100 gives 103.
- Sell at quality 10 (list 200): skill 0 gives 74; skill 50 gives 100; skill 100 gives 126. Personality 0 gives 92; personality 100 gives 107.

## 4. TypeScript sketch

simplified: keeps the donor order (floor, regional index, quality factor for the list cost; level, then the fixed-point mix for buy or sell; the daily step with its chance, 49/50 and 51/50 steps, and clamp; flags). It omits the faction lookups (the faction powers are an input), the random roll source (a function is passed in), the material and enchantment value, the repair and identify fractions, the guild reductions, the Witches Festival free identify, the weight check and letter-of-credit payment, the bank accounts and commission, the Mercantile tally, the haggle messages, and the mod override hook. The C# integer division is mirrored with `Math.trunc`, and `>>` and `<<` are the same 32-bit operators.

```ts
// Licence: MIT (donor, Daggerfall Workshop). Clean-room sketch of the mechanism, re-expressed for Frankendom; not a line-by-line translation.
// clean-room

// C# integer division truncates toward zero; Math.trunc matches it.
const idiv = (a: number, b: number): number => Math.trunc(a / b);

// Shop list price (CalculateCost shape). regionIndex: 1000 = 1.0x, clamped by the daily walk to 250..4000.
function listCost(baseValue: number, quality: number, regionIndex: number): number {
  let cost = Math.max(baseValue, 1);
  cost = Math.max(1, idiv(cost * regionIndex, 1000));
  return 2 * (idiv(cost * (quality - 10), 100) + cost);
}

// Trade price (CalculateTradePrice shape). Fixed point: each product is shifted back by 8 bits.
// skill = player Mercantile (0-100), personality = player Personality (0-100).
function tradePrice(cost: number, quality: number, selling: boolean, skill: number, personality: number): number {
  const level = 5 * (quality - 10) + 50;
  if (selling) {
    const dm = (((idiv((100 - level) << 8, 200) + 128) * (idiv(skill << 8, 200) + 128)) >> 8);
    const dp = (((idiv((100 - level) << 8, 200) + 128) * (idiv(personality << 8, 200) + 128)) >> 8);
    return (((((179 * dm) >> 8) + ((51 * dp) >> 8)) * cost) >> 8);
  }
  const dm = (((idiv(level << 8, 200) + 128) * (idiv((100 - skill) << 8, 200) + 128)) >> 8);
  const dp = ((((idiv(level << 8, 200) + 128) * (idiv((100 - personality) << 8, 200) + 128)) >> 8) << 6);
  return (((((192 * dm) >> 8) + (dp >> 8)) * cost) >> 8);
}

// One daily step of a region's index. powerDiff = merchants faction power minus region faction power.
// rnd() returns an integer 0..99; the index rises when the roll is below the chance (Dice100 shape).
function dailyIndexStep(index: number, powerDiff: number, rnd: () => number): number {
  const chanceRise = idiv(powerDiff, 5) + 50 - idiv(index - 1000, 25);
  const rise = rnd() < chanceRise;
  const next = rise ? idiv(51 * index, 50) : idiv(49 * index, 50);
  return Math.min(4000, Math.max(250, next));
}

// Flags the player sees: above 2000 is "high", below 500 is "low", 500 to 2000 is neither.
function priceFlag(index: number): "high" | "low" | "none" {
  if (index > 2000) return "high";
  if (index < 500) return "low";
  return "none";
}

export { listCost, tradePrice, dailyIndexStep, priceFlag };
```

## 5. Lands in

- TARGET `origins/economy/shop-prices.ts` (new module, proposed; not checked against the repo): the list cost and the trade price as server functions, with the shop quality as zone data. The fixed-point shape stays an engine constant.
- Parity-checklist row 21 (catalogue fields): the base value per item and the list-cost inputs come from the catalogue. Row 21 is the closest row for the price fields.
- The regional index has no row. Row 23 is zone population and does not fit a price index, so I say so plainly: the index is zone state that needs its own home, and it should live next to the zone data (`origins/economy/shop-prices.ts`, same file, flagged as zone state). Not checked against the parity checklist for a better fit.
- Repair and identify: no row fits. They are service fees, so they are cited under the same file, not under a loot or XP row.
- today: none known (Frankendom's tree was not read for this note).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written from the mechanism)
- Brief rule served: zones as data (quality per shop, index per zone); server-verified (the index and the price are computed on the server, seeded); one ledger (see the gaps: the donor's letters of credit and bank accounts are a second ledger and are rejected).

## 6. Gaps and risks

- The donor runs the daily index and the prices on the client: `UpdateRegionalPrices` is called from `PlayerEntity` (446) and rolls with `UnityEngine.Random` through `Dice100` (Dice100.cs 22). Frankendom must run the daily step on the server with a seeded RNG, per zone, and send the index to the client. A client that rolls its own index can cheat the price.
- Second ledger: the donor has three money stores: gold pieces (weight-limited, 370), letters of credit (items carrying a value, 1038-1046, and a 1.01 commission, 192 and 395), and bank accounts per region (`DaggerfallBankManager`). Frankendom's ruling is one ledger, so reject the letters of credit and the per-region accounts. Keep one gold integer and the server check.
- Deduction order (PlayerEntity 1320-1350): gold first, then letters, then gold again, with an unpaid remainder returned. The trade window ignores that remainder (1055). Frankendom must refuse a purchase it cannot fully pay, and never record a partial payment.
- Affordability gate not read: the window shows "not enough gold" (ShowTradePopup) but I did not read which check stops a purchase with too little gold before `DeductGoldAmount`. The server must check the full price before any deduction.
- Skill by use: each completed trade adds one Mercantile point (1088), with no cap in the call. That is a farming route for a price advantage. Frankendom should cap it or make it diminishing, and test the cap.
- Integer order matters: `>>` and `<<` precedence and the 8-bit shifts decide the rounding. The sketch reproduces the donor's order, and the numbers in section 3 come from that order. Any port must keep the order and add a test vector set (the worked numbers above).
- Faction power range not read. The index drift depends on faction power difference over 5, so Frankendom needs its own bounded power input; the range here is unknown (not read).
- Repair and identify use fractions of value (10 percent, 25 >> 8). They are sinks; Frankendom's crafting costs should be checked against them, not assumed.
- Adjacent sinks and faucets not read end to end: the bank commission (192, 395), the loan limit (`loanMaxPerLevel`, DaggerfallBankManager 190) and the overdue-loan check run on each day change (PlayerEntity 448; `LoanChecker` not read).

Reuse tag: rewrite-from-idea (MIT; code may be adapted; the sketch is written from the mechanism)
Brief rule served: zones as data; server-verified; one ledger (economy topic, cell 3 of ET010)
Best transferable idea: Price a trade as the list cost times a fixed-point mix of the player's skill and charisma, and drift each zone's price index by a small daily step with a chance that pulls it back toward neutral.
Decision (proposed): adapt — take the list-cost formula, the skill-and-charisma trade mix and the daily mean-reverting index as server functions with zone data; reject the letters of credit and the per-region bank accounts as a second ledger.
Acceptance: server test: at a zone with index 1000 and shop quality 10, a buyer with mercantile 50 and personality 50 pays 112 for a list cost of 200, and a seeded run of 30 days keeps the index between 250 and 4000 and moves it only by the 49/50 and 51/50 steps.
