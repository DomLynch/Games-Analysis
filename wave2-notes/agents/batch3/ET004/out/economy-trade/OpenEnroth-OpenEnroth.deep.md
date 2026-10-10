# OpenEnroth-OpenEnroth (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/PriceCalculator.cpp` | Licence: LGPL-3.0 (repo `LICENSE` is GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007; PriceCalculator.cpp carries no licence header) | C++ | symbol `PriceCalculator::itemBuyingPriceForPlayer`, `PriceCalculator::itemSellingPriceForPlayer`, `PriceCalculator::playerMerchant`

Checked: The hint file `src/GUI/UI/Houses/Shops.cpp` is the shop window, not the pricing. The pricing is in `src/Engine/PriceCalculator.cpp` (228 lines, all read; 201-228 hold the tavern food and training prices, read and noted below). Also read: the sell and buy call sites in `Shops.cpp` (900-935, 1040-1140), `Character::SalesProcess` and the mastery multiplier in `Character.cpp` (350-400, 2835-2850, 4660-4675), `Party::GetPartyReputation` (`Party.cpp` 820-835), `HouseData.h` 17, and the house multiplier loader (`HouseTable.cpp` 86, grep only). Not read: `LocationInfo::reputation` (where the value is set), `Item::canSellRepairIdentifyAt`, `Item::IsBroken`, the `houseTable` data file itself, and the `GUIWindow.cpp` 886-898 display path (grep only). camera_scope: n/a (economy). Confidence: high on the price formulas and their order; medium on what the reputation number means (its sign and source are not read).

Best transferable idea: a shop price is one multiplier of the item value, a merchant-skill percent that discounts it, a floor at the item value for buying, and a clamp to 1..value for selling, so no shop can undercut or over-pay the item's own worth.
Decision (proposed): adapt — keep the clamps and the percent-off shape as zone data for each shop; drop the reputation term unless Frankendom has a reputation to feed it.
Acceptance: a server test asserts that a shop's buy price is never below the item value, its sell price is never above the item value and never below 1, and a broken item sells for 1.

## 1. Mechanism

- Two price rules, one per direction, both fed by the same house multiplier (`houseTable[houseId].fPriceMultiplier`, loaded from `HouseTable.cpp` 86).
- Merchant percent (`playerMerchant`, 135-151). A grandmaster merchant gets 100 (137-141 read; 139 is the test). Otherwise the bonus is the mastery multiplier (1 novice, 2 expert, 3 master, 5 grandmaster, from `GetMultiplierForSkillLevel` with `1, 2, 3, 5`, 137; the mastery switch is `Character.cpp` 2835-2850) times the skill level (144). If the bonus is 0 the percent is minus the party reputation (146-147). Else it is `min(bonus - rep + 7, 100)` (150).
- Buy (`itemBuyingPriceForPlayer`, 73-81). Raw = value times house multiplier (74, float). Discounted = raw times (100 minus the merchant percent) divided by 100, truncated to int (`applyMerchantDiscount` at 153-159). Then the floor (76-78): the price is never below the item's value.
- Sell (`itemSellingPriceForPlayer`, 83-100). Result = value divided by (house multiplier + 2), plus value times merchant percent divided by 100, truncated (85). If the item has a value, the result is clamped to 1..value (88-89). If it has no value, the result is 1 (90-93). A broken item is 1 (95-97).
- Sale flow (`Character::SalesProcess`, `Character.cpp` 366-373). Price is computed first (367-368), then the item is taken (371), then the party gold is added (372).
- Buy flow (`Shops.cpp` 1097-1131). Price computed (1097-1098). If stealing, the gold check is skipped and a steal roll runs (1106-1111). Else the gold must cover the price (1113). Then space is found and the item added (1119-1121). Only then the gold is taken (1127). Check, check, grant, debit: no throw path.
- Services in the same file (read). Tavern food (`tavernFoodCostForPlayer`, 202-214): the house multiplier cubed over 100 (205), discounted by the merchant percent, with a floor of the cubed multiplier over 300 (205, same line), and a minimum of 1 (210-212). Training (`trainingCostForPlayer`, 216-228): next-level experience is `1000 x level x (level+1) / 2` (218); training is priced only when the character's experience reaches that threshold (219), and the price is level x house multiplier x class tier (221), discounted, floored at one third (222-224). So a training price is both a sink and a progression gate.
- Tick: none. Each sale or purchase is one click in the shop window (the click code in `Shops.cpp` 892-923 and 1040-1140). Not a loop.

Worked arithmetic (from the code, no run): a novice merchant (bonus 1 times level, say level 2, so bonus 2) at party reputation 0 has percent `min(2 - 0 + 7, 100)` = 9. A buy at multiplier 1.0 and value 100 is `100 * (100 - 9) / 100` = 91, then the floor keeps 100. A sell at the same settings is `100/3 + 100*9/100` = 33 + 9 = 42.

## 2. Key functions

- `PriceCalculator::itemBuyingPriceForPlayer`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/PriceCalculator.cpp` 73-81.
- `PriceCalculator::itemSellingPriceForPlayer`: same file, 83-100 (clamp 88-89, broken 95-97).
- `PriceCalculator::playerMerchant`: same file, 135-151 (the grandmaster branch, the no-skill branch, the capped skill bonus).
- `PriceCalculator::applyMerchantDiscount` (two overloads, int and float): same file, 153-159.
- `Character::SalesProcess`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` 366-373.
- Buy in the shop window: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp` 1097-1131.
- Sell in the shop window: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/Houses/Shops.cpp` 913-915.
- Callers of `itemSellingPriceForPlayer`: `Character.cpp:368` only (grep; the dialogue path uses the buy function at `Character.cpp:4672`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Shop price = item value x house multiplier (float, then truncated) | `fPriceMultiplier` per house (theirs, `HouseTable.cpp:86`, data file not read) |
| Merchant percent: grandmaster = 100 | `if (merchantSkill.mastery() == MASTERY_GRANDMASTER) {` (theirs, PriceCalculator.cpp 139) |
| Mastery multipliers 1, 2, 3, 5 | `GetMultiplierForSkillLevel(SKILL_MERCHANT, 1, 2, 3, 5)` (theirs, PriceCalculator.cpp 137) |
| Skill bonus: min(bonus - reputation + 7, 100) | `return std::min(bonus - rep + 7, 100);` (theirs, PriceCalculator.cpp 150) |
| No skill: percent = minus reputation | `if (bonus == 0) {  // no skill so trading on rep alone` (theirs, 146-147) |
| Buy floor: never below item value | `if (price < realValue) {  // price should always be at least item value` (theirs, 76) |
| Sell clamp: 1..item value | `result = std::clamp(result, 1, realValue);` (theirs, 89) |
| Broken item sells for 1 | `if (item.IsBroken()) {` (theirs, 95) |
| Party reputation: 5 for each of five hired-NPC professions present, plus location reputation | `if (CheckHiredNPCSpeciality(NPC_PROFESSION_PIRATE)) npcRep += 5;` and `return npcRep + ddm_dlv->reputation;` (theirs, Party.cpp 828, 833) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's price formulas, the percent rule, the buy floor, the sell clamp and the broken rule, in the donor's order. It REORDERS nothing in the price formulas; the sale and purchase helpers copy the donor's order. It ADDS a removal check in the sale helper (the donor takes the item without checking), and it passes the space check as a callback (the donor calls `findSpace` before `add`). It omits: the steal branch, the empty-value case (the donor's "no value means 1" branch is written in as the `else` of the clamp), the party-reputation calculation (the sketch takes reputation through the merchant percent), the float-versus-int overload choice, and the display-only `GUIWindow.cpp` price path.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface PriceInput { value: number; houseMult: number; merchantPct: number; broken: boolean; }

// Merchant percent (100 = free, negative = surcharge). Grandmaster is free; no skill uses reputation alone.
function merchantPct(skillMult: number, skillLevel: number, grandmaster: boolean, reputation: number): number {
  if (grandmaster) return 100;
  const bonus = skillMult * skillLevel;
  if (bonus === 0) return -reputation;
  return Math.min(bonus - reputation + 7, 100);
}

// Buy: value times house multiplier, discounted by the merchant percent, truncated; never below the item value.
function buyPrice(p: PriceInput): number {
  const raw = p.value * p.houseMult;
  const discounted = Math.trunc((raw * (100 - p.merchantPct)) / 100);
  return Math.max(discounted, p.value);
}

// Sell: value over (multiplier + 2), plus value times merchant percent; clamped to 1..value; broken pays 1.
function sellPrice(p: PriceInput): number {
  let result = Math.trunc(p.value / (p.houseMult + 2) + (p.value * p.merchantPct) / 100);
  if (p.value > 0) result = Math.min(Math.max(result, 1), p.value);
  else result = 1;
  if (p.broken) result = 1;
  return result;
}

interface Party { gold: number; }

// Sell in donor order: price first, then take the item, then pay. The donor has no check on the take; this sketch adds one.
function sell(party: Party, takeItem: () => boolean, p: PriceInput): number {
  const price = sellPrice(p);
  if (!takeItem()) return 0;
  party.gold += price;
  return price;
}

// Buy in donor order: check gold, check space and add, then take the gold.
function buy(party: Party, grantItem: () => boolean, p: PriceInput): { ok: boolean; paid: number } {
  const price = buyPrice(p);
  if (party.gold < price) return { ok: false, paid: 0 };
  if (!grantItem()) return { ok: false, paid: 0 };
  party.gold -= price;
  return { ok: true, paid: price };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (`/tmp/et004-prices-ts.ts`; copy in the work folder as `et004-prices-ts.ts`).

## 5. Lands in

- TARGET `origins/economy/prices.ts` (new): the price rules as pure functions. Shop multiplier, merchant percent and the floor and clamp rules are zone data per shop (the multiplier and the percent source); the rules themselves are engine code.
- Parity-checklist row 21 (catalogue fields): item value, the shop's price multiplier and the broken flag are catalogue or zone fields.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one ledger (each sale and purchase is check-then-apply: the price is computed first, the item and gold move together, and a failed check moves nothing); zones as data (the house multiplier is a per-shop field); server-verified (the sketch takes the price from the server's item value, never from the client).

## 6. Gaps and risks

- Reputation. The donor's merchant percent takes its no-skill case from party reputation, which is a number built from five hired-NPC professions (5 each when present) plus a location value. Frankendom has no reputation model in the duel. Drop the term, or give it a single zone field, and say so in the catalogue.
- Skill tie-in. The merchant percent reads a merchant skill level and mastery. Frankendom has no merchant skill yet; the progression lane would need to add one before this discount can be used.
- Integer rounding. The donor truncates at the discount step and again at the sell step. A copy in Frankendom must use integer minor units and the same truncation, or sell prices will drift by one.
- Sign of reputation. The donor applies minus reputation in the no-skill case and in the skill case, so higher reputation lowers the sell price and raises the buy price. What reputation means in the game (its sign, its source) was not read. Do not copy the sign without reading it.
- Stealing. The shop window has a stealing mode that skips the gold check and rolls a fine (1106-1111). Frankendom has no theft in the duel; leave it out of the price module.
- The sale path does not check the take. The sketch adds a check. Frankendom must check it, since a failed take with a credited sale would be a duplicate-money bug.
- Training gate. Training is sold only to a character who has reached the experience threshold (219). That ties a money sink to progression; the progression lane must decide whether a shop may sell a level-up, and money must not buy the threshold.
- Licence LGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
