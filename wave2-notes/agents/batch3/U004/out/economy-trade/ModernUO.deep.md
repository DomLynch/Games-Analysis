# ModernUO (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` (trigger and purchase in `BaseVendor.cs`, same folder) | Licence: GPL-3.0, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007" (`/mnt/frankendom-donors/ModernUO/LICENSE`) | C# | symbol `GenericBuyInfo.OnRestock`

Checked: `GenericBuyInfo.OnRestock` (GenericBuy.cs 105-137) read in full, with the constructor (31) and `Price` getter (61-82). `BaseVendor.Restock` (132-140) and the lazy trigger in `VendorBuy` (847-868, including the alive, feature-flag and access gates above the check) read. Purchase path read: `OnBuyItems` (144-345 in part), `ProcessSinglePurchase` (1172-1205), `ProcessValidPurchase` (1221-1240). Callers, checked: `OnRestock` has one caller (`BaseVendor.Restock`, 140). `Restock()` has two callers: `VendorBuy` (868, read) and `RestockCommand` (Commands.cs 719, seen in grep only). `VendorBuy` has callers `VendorAI.cs` 119 and 134 (read 108-138) and `BaseVendor.cs` 1432 (read). Confidence high on the restock rule and its constants. Not read: the stack-item branch of `ProcessValidPurchase` (1240-1270), the `Town.Tax` getter (Engines/Factions/Core/Town.cs 63-65, grep only), the `OnBuyItems` mobile branch (210-230 only in part), the body of `IncomingVendorPackets.cs` beyond the call on line 60. camera_scope: not a camera cell.

Best transferable idea: Let a shop's stock ceiling grow when a line sells out and shrink when it sits mostly unsold, and refill it lazily the next time a buyer opens the list, with no timer.
Decision (proposed): adapt — the demand-ceiling rule suits zone vendors and costs little, but the donor's numbers are engine rules and its restock state is transient, so Frankendom must keep stock in the one ledger, make the delay and base stock zone data, and write the rounding down as tested behaviour.
Acceptance: a server test where a ceiling-40 line with 25 unsold refills to 20 and with 15 unsold stays 40, a sold-out 16 line refills to 32 after one hour, and a second open inside the hour changes nothing.

## 1. Mechanism

- A vendor sells from a buy list of `GenericBuyInfo` lines. Each line has a live stock `m_Amount` (units on the shelf) and a ceiling `MaxAmount`, both set to the table amount at construction (GenericBuy.cs 31). Table rows carry a price, an amount and an item id; for example the blacksmith's iron ingot is price 5, amount 16 (SBBlacksmith.cs 16).
- Restock is lazy, not a timer. `VendorBuy` (BaseVendor.cs 847) runs when a player asks to buy, from the context menu (1432) or the speech keyword (VendorAI.cs 119, 134). After the seller-active, alive, feature-flag and access checks, it calls `Restock()` only if more than `RestockDelay` has passed since `LastRestock` (866-868). `RestockDelay` is one hour (130).
- `Restock()` (132-140) sets `LastRestock` to now and calls `OnRestock()` on every buy line.
- `OnRestock()` (GenericBuy.cs 105-137), in order:
  - (a) Sold out (`m_Amount <= 0`): the ceiling doubles, capped at 999 (107-109).
  - (b) Otherwise `halfQuantity` starts as the ceiling. At 999 or more it becomes 640 (121-123). Above 20 it is halved by integer division (125-127). At 20 or less it stays as it is, so small lines never shrink.
  - (c) The ceiling drops to `halfQuantity` only if the unsold count is at least `halfQuantity` (130-133). Sales above about half the ceiling leave it alone, as the comment says (113-117).
  - (d) The shelf is refilled to the ceiling in every case (136). A line that did not shrink still gets a full refill.
- Buying (`OnBuyItems`, 144): the price scalar is refreshed first (`UpdateBuyInfo`). `ProcessSinglePurchase` (1172) clamps the amount to what is on the shelf, and returns false when that leaves nothing (1184-1186) or when control slots run short (1191-1197). A false return makes `OnBuyItems` return false for the whole order (189-191). Gold is then taken from the backpack; the bank is used only when the total is 2000 or more (264-266). `ProcessValidPurchase` (1221) decrements `bii.Amount` (1233).
- Price: unit price is `(m_Price * DefaultPrice + 50) / 100` when the scalar is non-zero (GenericBuy.cs 61-79), else the base price (82). The scalar is `100 + town tax` (BaseVendor.cs 1353). The C# precedence of `??` means a vendor outside any town gets scalar 0 and the base price.
- Player sells: `OnSellItems` (408) calls `bii.Restock(item, amount)` as a hook. `GenericBuyInfo.Restock` always returns false (GenericBuy.cs 103), so the sold item goes to the resale rack (`BuyPack`) and the stock is not refilled. Buy-back from the rack is priced at 1.90 times the sell price (GenericSell.cs 83, used at BaseVendor.cs 210). Player sells pay `GetSellPriceFor` (BaseVendor.cs 537, inside `OnSellItems`).

## 2. Key functions

- `GenericBuyInfo.OnRestock`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` 105-137. The per-line rule: sold-out doubling, halving, full refill.
- `BaseVendor.Restock`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 132-140. Sets `LastRestock` and runs `OnRestock` on each line.
- `BaseVendor.VendorBuy`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 847-868. The lazy trigger: the delay gate at 866.
- `BaseVendor.OnBuyItems`, `ProcessSinglePurchase`, `ProcessValidPurchase`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 144-345 (in part), 1172-1205, 1221-1240. The clamp, the all-or-nothing abort, the gold and bank split, the decrement.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sold-out line doubles its ceiling, capped | x2, cap 999 (GenericBuy.cs 109) |
| Very large ceiling resets to a fixed value | 999 or more becomes 640 (GenericBuy.cs 121-123) |
| Ceiling halves only when the unsold part is at least half of it | Halve above 20 (125), integer divide by 2 (127), test `m_Amount >= halfQuantity` (130) |
| Small ceilings never change | The threshold 20 (125); at 20 or below `halfQuantity` equals the ceiling |
| Full refill after every restock | Refill to ceiling (136) |
| Lazy refill gated by elapsed time, checked on access | One hour (BaseVendor.cs 130), gate at 866 |
| Price scaled by a percentage with rounding | `+50` then `/100` (GenericBuy.cs 79) |
| Buy-back spread | Buy-back = 1.90 x sell price (GenericSell.cs 83) |
| Bank fallback above a total | 2000 gold (BaseVendor.cs 264) |
| Stock table entry | Iron ingot: price 5, amount 16 (SBBlacksmith.cs 16) |

Rounding note, from the code and not run: the halving threshold is `ceiling - floor(ceiling/2)` sold or fewer. For an odd ceiling of 21 the ceiling halves when 11 are sold, one more than "more than half" in the comment at 113-117. Read the code, not the comment, when porting.

## 4. TypeScript sketch

simplified: the sketch keeps the restock rule (sold-out doubling capped at 999; the 999-to-640 reset; halving above 20 only when the unsold part is at least the halved ceiling; full refill) and the lazy one-hour trigger that sets the timestamp before refilling. It omits the gold charge and bank fallback, the control slots, the price formula and buy-back spread, the resale rack for player sells, the per-item Restock hook (always false in the donor), bulk orders, and the transient persistence on load. Its `buy` clamps like `ProcessValidPurchase`; it does not model the donor's order-level abort on a sold-out line (BaseVendor.cs 189-191).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface StockLine {
  maxAmount: number; // ceiling that a restock refills to
  amount: number;    // units left on the shelf
}

// One restock step for one line.
// Sold out: the ceiling doubles (cap 999).
// Otherwise: a ceiling of 999+ drops to 640, a ceiling above 20 halves (integer), and the ceiling
// only drops when the unsold count is at least the new half. Ceilings of 20 or less never change.
// Then the shelf refills to the ceiling in every case.
function restockLine(line: StockLine): void {
  if (line.amount <= 0) {
    line.maxAmount = Math.min(999, line.maxAmount * 2);
  } else {
    let half = line.maxAmount;
    if (half >= 999) half = 640;
    else if (half > 20) half = Math.floor(half / 2);
    if (line.amount >= half) line.maxAmount = half;
  }
  line.amount = line.maxAmount;
}

interface Vendor {
  lastRestock: number; // ms timestamp
  lines: StockLine[];
}

const RESTOCK_DELAY_MS = 60 * 60 * 1000; // one hour

// Lazy trigger: restock runs when a buyer opens the buy list and the delay has passed. No timer.
// Restock sets lastRestock to now, so a long-unvisited vendor restocks once, not once per missed hour.
function onOpenBuyList(v: Vendor, now: number): void {
  if (now - v.lastRestock > RESTOCK_DELAY_MS) {
    v.lastRestock = now;
    for (const line of v.lines) restockLine(line);
  }
}

// A purchase takes at most what is on the shelf; the rest of the order is dropped.
function buy(line: StockLine, want: number): number {
  const got = Math.min(want, line.amount);
  if (got < 1) return 0;
  line.amount -= got;
  return got;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/vendor-stock.ts` (proposed new module; the file name is a proposal and was not checked against the Frankendom tree). Stock lines are server state; the restock runs on the server when a buyer opens the list, never on the client.
- Parity-checklist row 20 (catalogue as runtime source): the stock table and its base amounts and prices come from the zone catalogue, and the ceiling and count live in server state.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (stock and gold settle on the server); zones as data (restock delay, base stock and price, town price scalar as zone fields)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism and the donor lines were not copied.
- Two gold sources: the donor takes gold from the backpack (`ConsumeTotal`, BaseVendor.cs 254) and from the bank above 2000 (264-266). Frankendom's one-ledger ruling means both must settle through one account, with stock and gold in one transaction.
- Transient state: after a load, restock amounts rebuild from the base table (BaseVendor.cs 1316-1318; `LoadSBInfo` 588 resets `LastRestock`). A restart resets every sold-out line. Frankendom must either persist the ceiling in the ledger or accept the reset, and write the choice as a test.
- Rounding and comment mismatch: the halving threshold is `floor(ceiling/2)` unsold, so an odd ceiling halves one sale earlier than the comment suggests (see section 3). Port the code's rule and test the odd and even cases.
- Small lines never shrink: any ceiling of 20 or less stays put. A zone that expects shrinking on small stock will not get it.
- All-or-nothing order: one sold-out line or a control-slot shortfall returns false for the whole order (BaseVendor.cs 189-191, 1184-1186, 1191-1197). Frankendom must decide partial versus whole and test it. The donor's choice is whole.
- Player-sell refill is a dead hook (GenericBuy.cs 103 always false). Do not port it as a refill path; the resale rack is the donor's only sell-back route, priced at 1.90 times the sell price (GenericSell.cs 83). A 1.90 spread is an economic choice; decide it, do not inherit it.
- Town tax: the `100 + ...?.Tax ?? 0` precedence (BaseVendor.cs 1353) gives scalar 0 and base price outside any town. Frankendom should make the tax an explicit zone field, not an accident of precedence.
- Lazy trigger: a vendor nobody opens never restocks, and an open after a long gap restocks once. That suits a server with no restock tick; it does mean restock depends on a player's request, which the server must allow.
