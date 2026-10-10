# l1j-en-classic (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1TaxCalculator.java` | Licence: GPL-2.0 (repo `COPYING`, "Version 2, June 1991", read; the file headers say "version 2, or (at your option) any later version") | Java | symbol `L1TaxCalculator`, `L1Shop.sellItems`

Checked: Read in full: `L1TaxCalculator.java` (1-162), `shop/L1ShopBuyOrderList.java` (19-119). Read `shop/L1Shop.java` 95-300 (buy path, tax payout, town tax call); the rest of the file (1-95, 300-341) was not read. Read the caller `clientpackets/C_Result.java` 112-132 (buy window). Read `datatables/TownTable.java` 105-150 (`addSalesMoney`; the rest of the file not read). Read `L1TownLocation.java` 181-190, `C_TaxRate.java` 68-81 and grep of 49-80, `L1CastleLocation.java` 278-298 (the daily rate listener body, 300 onward, not read), `Config.java` 834-842, `templates/L1ShopItem.java` 60-61, `serverpackets/S_ShopSellList.java` line 106 only (grep). Three or more candidate files opened (the calculator, the order list, the shop, the town table, the buy window). Confidence: high on the buy-side tax arithmetic and the payout order (read end to end). Medium on the town path (`addSalesMoney` read, the rest of the class not read). Camera scope: not applicable.

Best transferable idea: Show the shop price with tax on top, charge the buyer one debit for price plus tax, and route the tax to a zone-owned public pool in the same server transaction, with the owner's rate bounded by the server.
Decision (proposed): adapt — Frankendom's zones are data, so a per-zone tax rate with server bounds and a public-pool credit fits; the castle politics (national and Diad shares, the daily rate listener, war tax) do not fit a fast browser game, so take the price-plus-tax shape and drop the factions.
Acceptance: a server test: 3 units at base 100 in a zone with a 10 percent tax are one debit of 330, the zone pool is credited 30, and a rate set outside the allowed range is refused.

## 1. Mechanism

- Buy window (`C_Result.java` 114-129): the client sends pairs of (order number, count). A count below 1 or above 1000 is skipped (123-125). Each valid pair is added to a buy order list (`orderList.add`, 127). Then `shop.sellItems(pc, orderList)` runs (129).
- Per line price (`L1ShopBuyOrderList.add`, 54-55): unit price = `(int)(template price x RateShopSellingPrice)`. The rate is a server setting, default 1.0 (`Config.java` 838-839).
- Per line tax (72-80): for NPCs other than 70017 and 70049 (Orim and Rozen, per the comment on line 72), `layTax` is added. Total for the line = price x count + tax (80).
- Tax (`L1TaxCalculator.calcTotalTaxPrice`, 56-61): gross castle tax + town tax. Castle gross per unit = `floor(rated price x castle rate / 100)` (84-85), summed over the count. The castle rate is the castle's rate from a per-castle map (`L1CastleLocation.java` 281). The town rate is the town leader's rate plus a fixed 2 (`L1TownLocation.java` 187). Town tax per unit = `floor(rated price x town rate / 100)` (121-122).
- Shares of the castle gross (for the payout, not added to the buyer): national = `floor(castle gross / 10)` (113) and Diad = `floor(castle gross / 10)` (156). The castle keeps gross minus national minus Diad (92).
- Checks before charging (`L1Shop.ensureSell`, 127-158): total in 0 to 2000000000 (129); adena balance covers the tax-included total (133); weight limit (137-141); inventory slots at most 180 (153).
- Charge and store (`sellItems`, 293-299): `consumeItem(ADENA, total)` (245-246), store each item (253-290), then `payTax` (298). `payTax` runs the castle payout (230), the town payout (231), then the Diad payout (232).
- Castle payout (`payCastleTax`, 160-198): castle tax = gross minus national minus Diad. If the NPC's castle is Aden or Diad, national is added to the castle's share and not paid to Aden (168-169). If the castle id is not 0 and the tax is above 0 (172), the castle's public money is raised by the castle tax only if it is below 2000000000 (178-181). Otherwise the credit is skipped, not clamped. National goes to Aden's public money with the same cap check (185-196).
- Diad payout (`payDiadTax`, 200-218): Diad share is raised into Diad's public money, same cap check (212-215). The Diad share is computed from the NPC's castle rate, not Diad's own rate (`calcDiadTaxPrice`, 151-156).
- Town payout (`payTownTax`, 220-227): skipped while contribution totals are being processed (221). Otherwise `TownTable.addSalesMoney` (224). It writes sales money, the above-2 percent tax, and the fixed 2 percent (105-150). Each part is floored per unit on the template price, with a minimum of 1 if it comes out at 0 for a town with a rate (125-131).
- Sell to NPC (the reverse flow): `getAssessedPrice` = `(int)(price x RateShopPurchasingPrice / packCount)` (`L1Shop.java` 107-110). No tax term.
- Sell list display: the NPC sell list shows `price + calc.layTax(shopItem, 1)` (`S_ShopSellList.java` 106). The player sees price plus tax.

## 2. Key functions

- `L1TaxCalculator.calcTotalTaxPrice`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1TaxCalculator.java` 56-61. Total tax for a line.
- `L1TaxCalculator.calcCastleTaxPrice` (per item): same file, 80-94. Gross, then minus national and Diad.
- `L1TaxCalculator.calcNationalTaxPrice` and `calcDiadTaxPrice`: same file, 105-114 and 148-157. Each is 10 percent of castle gross (integer division by 10).
- `L1ShopBuyOrderList.add`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/shop/L1ShopBuyOrderList.java` 49-103. Builds one line, its price and its tax.
- `L1Shop.sellItems` (order): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/shop/L1Shop.java` 293-299. Check, charge, store, then pay tax.
- `L1Shop.payCastleTax`, `payDiadTax`, `payTownTax`: same file, 160-227. The three payouts and their caps.
- `TownTable.addSalesMoney`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/datatables/TownTable.java` 105-150. Town books. Read only in part for the write (the rest of the class not read).
- `C_TaxRate` bounds: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_TaxRate.java` 49-81. Castle lord 10-50 (57); town leader 2-5, stored as rate minus 2 (78-79).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price is base x server rate, floored | Rate 1.0 default (theirs, Config.java 839) |
| Tax is a percent of the rated price, floored per unit | Castle rate 10 to 50 (theirs, C_TaxRate.java 57); town rate 2 to 5 including the fixed 2 (theirs, C_TaxRate.java 78; L1TownLocation.java 187) |
| The buyer is debited price plus tax in one charge, after a balance and weight check | Adena as the currency (theirs, L1Shop.java 133, 245) |
| Part of the tax is split off to a fixed sink | National 10 percent and Diad 10 percent of castle gross (theirs, L1TaxCalculator.java 35, 40, 113, 156) |
| Caps | Price range 2000000000 (theirs, L1Shop.java 129); public money caps 2000000000 (theirs, L1Shop.java 178, 190, 212) |
| Order limits | 1000 units per line (theirs, C_Result.java 123); 180 inventory slots (theirs, L1Shop.java 153) |
| Exempt NPCs | Ids 70017 and 70049 (theirs, L1ShopBuyOrderList.java 72) |
| War tax (defined, never called) | 15 (theirs, L1TaxCalculator.java 30; no caller, see section 6) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the line: rated unit price, per-unit tax floored, one debit for price plus tax after the balance check, then the tax is split by shares and the remainder goes to the zone pool. It omits the Aden and Diad shares (the donor splits castle gross into castle, national and Diad), the donor's 2000000000 cap (the donor skips the credit at the cap; Frankendom should clamp and report), the town's above-2 and fixed-2 split and its minimum of 1, the contribution-total skip, the weight and inventory checks, the 1000-unit line limit, the NPC id exemption (the `exempt` flag stands in for it), and the war tax (no caller in the donor). Shares are data; the donor's split is fixed at 10 and 10.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface OrderLine { basePrice: number; count: number }
export interface TaxShare { to: string; pct: number }   // share of the gross tax, each floored; the remainder goes to the zone pool

export interface Settlement {
  rejected: boolean;
  total: number;                       // one debit: price plus tax
  price: number;
  tax: number;                         // gross tax
  credits: Record<string, number>;     // where the tax goes; sums to tax
}

// Unit price is base x server rate, floored per line. Tax is floored per unit, as the donor does.
export function settleOrder(
  lines: OrderLine[],
  sellingRate: number,
  taxPct: number,
  shares: TaxShare[],
  exempt: boolean,
  buyerGold: number
): Settlement {
  let price = 0;
  let tax = 0;
  for (const l of lines) {
    const unit = Math.floor(l.basePrice * sellingRate);
    price += unit * l.count;
    if (!exempt) {
      for (let i = 0; i < l.count; i++) tax += Math.floor((unit * taxPct) / 100);
    }
  }
  const total = price + tax;
  if (total > buyerGold) return { rejected: true, total: 0, price: 0, tax: 0, credits: {} };

  const credits: Record<string, number> = {};
  let left = tax;
  for (const s of shares) {
    const amt = Math.floor((tax * s.pct) / 100);
    credits[s.to] = (credits[s.to] ?? 0) + amt;
    left -= amt;
  }
  credits["zonePool"] = (credits["zonePool"] ?? 0) + left;
  return { rejected: false, total, price, tax, credits };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ET015-l1j-shop-tax-settle.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/economy.ts` (new, the one ledger: a shop purchase is one debit, the tax is one credit to a zone pool). Parity-checklist row 21 (catalogue fields): the base price, the per-zone tax rate and its bounds, and the share table are catalogue and zone fields. Row 18 (loot roll and XP award) fits only the award side; the tax itself is a price rule, so row 21 is the closer fit.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (one debit, one credit per purchase); zones as data (tax rate and share are zone fields, bounds are engine constants); server-verified (the buy window and the payout run on the server).

## 6. Gaps and risks

- Payout happens after the charge with no single transaction. The buyer is charged the tax (`consumeItem` 245), then `payCastleTax` may skip the credit at the 2000000000 cap (178). The tax then disappears. Frankendom's one ledger must make the debit and the credit one write, and must clamp and report the cap, not skip it.
- Town books use the template price, not the rated price. `TownTable.addSalesMoney` reads `item.getItem().getPrice()` (117, 120, 121), while the buyer is charged on `price x RateShopSellingPrice` (`L1ShopBuyOrderList.java` 55; tax 84-85 and 121-122). With a rate other than 1.0 the town's books and the buyer's charge disagree. This is read from code, not run.
- Town tax is skipped during contribution-total processing (`L1Shop.java` 221), and the code read does not record the skip. Frankendom should not have a silent skip.
- War tax is defined (`L1TaxCalculator.java` 30, 44, 128-137) but `calcWarTaxPrice` has no caller in the donor (grep of the whole tree). Do not port it.
- Per-unit truncation: tax is floored for each unit, not once per line. For small prices this rounds tax down more than a per-line floor would. Frankendom should choose one rule and test it.
- The national and Diad shares are fixed at 10 percent and are computed from the NPC's castle rate, not the receiving castle's rate (`L1TaxCalculator.java` 151-156). This is a faction rule, not a zone rule. Reject for Frankendom.
- Player-set rates (castle lord 10 to 50, town leader 2 to 5) are a live political lever. For Frankendom the rate should be zone data set by an admin, with the bounds as engine constants. Not a player-set rate.
- The castle rate map is refreshed by a daily listener (`L1CastleLocation.java` 294-298); the listener body (300 onward) was not read. Frankendom should not rely on a day tick for pricing.
- Orim and Rozen are exempt by NPC id (`L1ShopBuyOrderList.java` 72). Frankendom should use a zone flag.
- The donor is GPL-2.0. Clean-room, shape only.
