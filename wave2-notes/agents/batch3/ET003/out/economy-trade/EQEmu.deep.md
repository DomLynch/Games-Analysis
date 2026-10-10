# EQEmu (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` (price curve in `zone/client.cpp`, rules in `common/ruletypes.h`, faction values in `common/faction.h`) | Licence: GPL-3.0 (`LICENSE.md`, "Version 3, 29 June 2007"; copyleft, clean-room only) | C++ | symbol `Client::Handle_OP_ShopPlayerBuy`

Checked: `Client::Handle_OP_ShopPlayerBuy` read in full (zone/client_packet.cpp 14126-14372). Price path read in full: `Client::CalcNewPriceMod` (zone/client.cpp 4239-4283), `Client::CalcPriceMod` (4285-4293), `Client::TakeMoneyFromPP` (2773-2822; the platinum branch after 2822 not read). Classic curve body read (4150-4236) but not used. Callers of `CalcPriceMod`: buy (client_packet.cpp 14241), sell-to-vendor payout (14437), the buy-back price of a sold item (14504) and client_process.cpp 929 were read; client_process.cpp 980 and client_packet.cpp 14683 were not read. Grep of zone/client_packet.cpp finds no read of `mp->price` (the request price field). Hint file `utils/sql/svn/2004_charges_alt_currency.sql` opened: schema migration only (alternate currency tables, merchantlist columns), not the mechanism. Confidence: high on buy order and the price formula; medium-high on the non-stackable overcharge (read, not run). Not read: `GetFactionLevel`, `GetCHA`, the merchant list builder, `Handle_OP_AltCurrencyPurchase` (zone/client_packet.cpp 2629), the sell handler's first 50 lines.

Best transferable idea: The vendor buy is a server transaction: the client names a stock slot and a quantity, the server looks up the line, recomputes the price from the base price and a charisma-style percent, takes coin from one wallet, and only then grants the item.
Decision (proposed): adapt - take the shape (slot lookup, server-computed price, one wallet), but check bag room before charging and clamp quantity for every item type, because the donor takes coin first and does not refund on a full bag (client_packet.cpp 14261 vs 14298, with the donor's own comment at 14286). The charisma/faction percent is optional and off by default unless Frankendom has a matching stat; do not copy the donor's constants.
Acceptance: a server test asserts that with the curve off, buying a 1000-copper line costs 1050 copper whatever price the request carries, and that a buy with a full bag is refused with the wallet unchanged.

## 1. Mechanism

- One server handler runs a vendor buy. It reads the NPC id, the stock slot and the quantity from the request (14134, 14148-14149). The request price is not read.
- Order of steps (as the code runs):
  (a) Refuse if the NPC is not a merchant, the quantity is below 1, or the player is out of range (`USE_NPC_RANGE2`) (read 14126-14156; range check at 14149).
  (b) Find the line: walk the merchant list, skip rows above the player's level (14162), match the client's slot (14166). If there is no match, search the temporary, depleting merchant list for that NPC type (read in 14126-14200). If the item still cannot be found, send "already sold" and refresh that slot (read in 14126-14200).
  (c) Clamp the quantity. Temporary stock clamps to its remaining charges (read in 14126-14250; the exact lines not separately cited). Stackable items clamp to the stack size (14212). Non-stackable items are not clamped: the check at 14212 tests `Stackable` only.
  (d) Price (14233-14250): unit = `int(item price x SellRate)` (14233); x `SellCostMod` (default 1.05) when the classic rule is off (14236-14237); x `CalcPriceMod(tmp, false)` when `UsePriceMod` is on (14240-14241). Charged items (`MaxCharges > 1`) cost one unit (14244-14245); all others cost unit x requested quantity (14247). A negative result is refused (14250).
  (e) Charge: `TakeMoneyFromPP(price)` (14261). That function adds up copper, silver, gold and platinum; if the total is below the price it returns false without deducting (client.cpp 2782-2784). On false it logs "Vendor Cheat attempted" (14263) and returns. On success it deducts across the denominations and calls `SaveCurrency()` (client.cpp 2773-2822 read; the platinum branch not read) before any item is placed.
  (f) Room: try to stack into an existing stack (14280), else find a free slot (14283). The cursor-full branch returns (14291) and the no-slot branch returns (14298-14299). Both return after the coin is already taken; the donor comment at 14286 asks whether the coin should be reimbursed, and the code does not do it.
  (g) Grant: place the item (14307), reply to the client (read in 14307-14372), update temporary stock charges (`SaveTempItem`, 14317), write the player event log and fire the merchant-buy quest hook (read in 14318-14372).
- Price curve (`CalcNewPriceMod`, 4239-4283): a percent from charisma around a pivot. The pivot is 103 for factions 6 or worse, "apprehensively" (4245), and 75 for factions 1-5, "indifferently or better" (4260). Above the pivot the percent is `(CHA - pivot) x -(ChaBonusMod/100) x PriceBonusPct` (4249, 4264). Below the pivot it is `(pivot - CHA) x (ChaPenaltyMod/100) x PricePenaltyPct` (4255, 4270). The bonus is clamped at `-PriceBonusPct` (4265) and the penalty at `+PricePenaltyPct` (4256, 4271). The sell side (reverse) flips the sign (4277-4278). The multiplier is `1 + pct/100` (4280-4281).
- Defaults (common/ruletypes.h): SellCostMod 1.05, BuyCostMod 0.95, ChaBonusMod 3.45, ChaPenaltyMod 1.52, PriceBonusPct 4, PricePenaltyPct 4.
- `CalcPriceMod` (4285-4293) uses this curve unless `UseClassicPriceMod` is set (4289). The classic curve is a fit to observed price data (client.cpp 4164-4220 comments) and is off by default; not transferred.
- Sell-to-vendor (`Handle_OP_ShopPlayerSell`, 14374 onward; read 14425-14512). The player is paid for a quantity of i items, not a per-unit price. With the price mod on, the total for i items is `(uint32)(item price x i) x CalcPriceMod(vendor, true)` (14437), then x `BuyCostMod` 0.95 (14441), then `+= 0.5` and truncated to uint32 (a few lines after 14441, not separately cited). With the mod off it is `(item price x i) x BuyCostMod + 0.5` (14455). The loop stops at the first count whose total passes 4,000,000,000 and sets the quantity to that count (14446-14448). The payout is `AddMoneyToPP(price)` (14464). The sold item enters vendor stock at the buy price: base x SellCostMod x `CalcPriceMod(vendor, false)` (14504), so a buy-back costs more than the sell payout.
- Worked example, by hand (not run): base 1000 copper. `int(1000 x 1.05)` = 1050. Faction 5 (indifferent), CHA 60: pct = (75-60) x (1.52/100) x 4 = 0.912; multiplier 1.00912; 1050 x 1.00912 = 1059.58, stored as int 1059 (each step truncates). At faction 5, CHA 104: pct = 29 x -0.138 = -4.002, clamped to -4, multiplier 0.96.

## 2. Key functions

- `Client::Handle_OP_ShopPlayerBuy`: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 14126-14372. The whole buy: checks, lookup, clamp, price, charge, room, grant.
- `Client::CalcNewPriceMod`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 4239-4283. The CHA/faction percent and clamps.
- `Client::CalcPriceMod`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 4285-4293. Dispatch between the new curve and the classic curve.
- `Client::TakeMoneyFromPP`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 2773-2822 (platinum branch not read). The one wallet: total check, then deduct and save.
- `Client::Handle_OP_ShopPlayerSell`: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 14374 onward (read 14425-14512 only). Sell-to-vendor price.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Server finds the stock line by slot, never by a client price | Slot number is the client's index (14166) |
| Unit price x quantity, clamped to stack size for stackables | `StackSize` from item data (14212) |
| Base price, then a markup rule, then a CHA/faction percent in a clamped band | SellCostMod 1.05 (ruletypes.h:941); ChaBonusMod 3.45 (ruletypes.h:945); ChaPenaltyMod 1.52 (ruletypes.h:946) |
| Pivot for the percent | 103 for faction 6+ (client.cpp 4249, 4255); 75 for faction 1-5 (4264, 4270) |
| Percent caps | PriceBonusPct 4 (ruletypes.h:943), PricePenaltyPct 4 (ruletypes.h:944) |
| Sell side = reverse sign and a buy-cost factor | BuyCostMod 0.95 (ruletypes.h:942; applied at 14441 and 14455) |
| One wallet, check total before deduct | Copper total = copper + 10 silver + 100 gold + 1000 platinum (client.cpp 2773-2822) |
| Overflow guard on a sum | 4,000,000,000 (14446) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's slot lookup, level filter, stack clamp, markup and CHA/faction percent with its clamps, and the one-wallet charge. It reorders the donor in one place: it checks room before the charge (the donor charges first and does not refund). It also clamps every non-stackable purchase to one item (the donor charges the requested quantity). It omits the distance and merchant-class checks, temporary depleting stock, lore checks, stacking into an existing stack (the sketch always uses a free slot), charged items, the 4,000,000,000 sell guard, event logs and the quest hook. Integer truncation follows the donor's int steps. Rule constants are passed in, not read from the donor's rule system.
```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.

// One ledger: all coin is a single copper count.
interface Wallet { copper: number; }

interface Bag { freeSlots: number; }

interface MerchantRules {
  usePriceMod: boolean;   // default true
  sellCostMod: number;    // 1.05 default, applied to the vendor's sell price
  chaBonusMod: number;    // 3.45 default
  chaBonusPct: number;    // 4 default (max bonus, percent)
  chaPenaltyMod: number;  // 1.52 default
  chaPenaltyPct: number;  // 4 default (max penalty, percent)
}

interface StockLine {
  slot: number;
  baseCopper: number;     // item price x sell rate, already in copper
  stackable: boolean;
  stackSize: number;
  minLevel: number;
}

// Percent adjustment from charisma. Pivot 103 for factions 6+ (apprehensive or worse), 75 for factions 1-5.
function chaPercent(cha: number, factionLevel: number, r: MerchantRules): number {
  const pivot = factionLevel >= 6 ? 103 : 75;
  let pct = 0;
  if (cha > pivot) pct = (cha - pivot) * -(r.chaBonusMod / 100) * r.chaBonusPct;
  else if (cha < pivot) pct = (pivot - cha) * (r.chaPenaltyMod / 100) * r.chaPenaltyPct;
  return Math.min(Math.max(pct, -r.chaBonusPct), r.chaPenaltyPct);
}

// Unit buy price in copper. Each multiply truncates to an integer, as the donor's int price does.
function unitBuyCopper(line: StockLine, cha: number, factionLevel: number, r: MerchantRules): number {
  let unit = Math.trunc(line.baseCopper);
  unit = Math.trunc(unit * r.sellCostMod);
  if (r.usePriceMod) {
    const mult = 1 + chaPercent(cha, factionLevel, r) / 100;
    unit = Math.trunc(unit * mult);
  }
  return unit;
}

type BuyResult =
  | { ok: true; granted: number; charged: number }
  | { ok: false; reason: "unknown-slot" | "bad-quantity" | "no-slot" | "not-enough-coin" };

function handleBuy(
  stock: StockLine[], slot: number, requested: number, playerLevel: number,
  cha: number, factionLevel: number, r: MerchantRules, wallet: Wallet, bag: Bag,
): BuyResult {
  // The server finds the line by slot; the client never sends a price or an item id.
  const line = stock.find(s => s.slot === slot && playerLevel >= s.minLevel);
  if (!line) return { ok: false, reason: "unknown-slot" };
  if (requested < 1) return { ok: false, reason: "bad-quantity" };

  // Stackables clamp to the stack size. Non-stackables are one item per purchase (sketch change: the donor charges the requested quantity).
  const qty = line.stackable ? Math.min(requested, line.stackSize) : 1;
  const total = unitBuyCopper(line, cha, factionLevel, r) * qty;

  // Room is checked BEFORE the charge (sketch change: the donor charges first and does not refund).
  if (bag.freeSlots < 1) return { ok: false, reason: "no-slot" };
  if (wallet.copper < total) return { ok: false, reason: "not-enough-coin" };

  wallet.copper -= total;
  bag.freeSlots -= 1;
  return { ok: true, granted: qty, charged: total };
}
```

## 5. Lands in

- TARGET `origins/server/shops.ts` (proposed new module; the Frankendom tree was not read). The server buy: lookup, price, charge, room, grant. The client only sends slot and quantity.
- Parity-checklist row 21 (catalogue fields): stock line base price, stackable flag, stack size and minimum level come from the catalogue. The price curve is a server rule with its numbers as data.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger and server-verified transactions (Frankendom rulings); rules 7-9 n/a

## 6. Gaps and risks

- One ledger: the donor's single copper count (client.cpp 2782-2784) matches the ruling. But the buy takes coin before the room check (14261 vs 14298). A full bag loses the price. Frankendom must check room before the charge (the sketch does).
- Server-verified: the donor takes the slot and quantity from the client and computes the price itself (14166, 14233-14247). Gap: non-stackables are not clamped (14212 tests `Stackable` only), the price is multiplied by the quantity (14247), but one item is created (14307). A client asking for five of a non-stackable pays five and receives one. Read, not run; treat as a donor defect and clamp in the engine.
- No transaction across charge and grant: `SaveCurrency()` runs inside `TakeMoneyFromPP` (client.cpp, read) before the item is placed (14307). A crash between the two can lose coin or item. Frankendom needs one write for both or a reconciling check.
- Two stock lists: temporary depleting stock (read in 14126-14200) is kept separately from the catalogue, with its own charge counts. Frankendom should keep stock as one zone-data list with one count per line.
- Charisma and faction: the curve needs a CHA stat and a faction value. The addendum's rulings name neither. Keep the curve optional and default off; do not add factions to make it work.
- Faction filter: the 2004 migration (utils/sql/svn/2004_charges_alt_currency.sql) adds `faction_required` to `merchantlist`, but the buy path reads only `level_required` (14162). Whether the list builder applies `faction_required` was not read. Do not copy a faction filter without factions.
- Rounding: each multiply truncates to int (14233-14250). Frankendom should compute once in integer copper with one stated rounding rule.
- Bounds: the sell path guards overflow at 4,000,000,000 (14446). Frankendom should bound copper balances in the ledger rather than in each price step.
- GPL-3.0: clean-room only. The sketch is written from the described mechanism and does not translate donor lines.

Receipts: `/private/tmp/p2/wave2-haiku/batch3/ET003/receipts.tsv` (49 rows, verify_receipts.py: 49 ok, 0 failed).

- Lore-conflict refusal happens before the charge (14198-14201).
- Sold-item re-stocking (14504) only happens when vendor->GetKeepsSoldItems() (14478), not unconditionally.

## Checker findings

- Verdict: CLEAN. No errors found; cited lines and numbers verified against the donor.
- Corrected: nothing.
- Missed (not in the note):
  - Lore-conflict refusal before charge (Handle_OP_ShopPlayerBuy 14198-14201).
  - Sold-item re-stocking at 14504 only happens when vendor->GetKeepsSoldItems() (14478), not unconditionally.
  - Minor vagueness: temp-stock clamp lines are 14203-14209.
