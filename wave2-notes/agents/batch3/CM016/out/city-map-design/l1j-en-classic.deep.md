# l1j-en-classic (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/datatables/TownTable.java` (with `model/L1TownLocation.java`, `controllers/HomeTownTimeController.java`, `model/shop/L1Shop.java`, `clientpackets/C_TaxRate.java`, `model/L1TaxCalculator.java`) | Licence: GNU General Public License version 2, "or (at your option) any later version" (TownTable.java:4; COPYING line 2, "Version 2, June 1991"). Copyleft: clean-room, shape only | Java (Lineage-style server) | symbol `TownTable.addSalesMoney`

Checked: The hint file (TownTable.java) is the tax ledger, not the layout. Opened in full: TownTable.java (244 lines), L1TownLocation.java (313 lines), HomeTownTimeController.java (255 lines). Opened in part: L1Shop.java 205-230 (payTownTax; its caller in payTax was not read), C_TaxRate.java 68-81 (leader rate setter; the top of the packet handler was not read), L1TaxCalculator.java 40-75 and 116-126 (buyer-side town tax). Confidence high for the tax ledger, the reserved-rate-at-tick rule, the monthly contribution pool and the return-point list. Not read: the town and castle map files (maps/), the town layout (roads, buildings, landmarks, signage) which is the cell topic, the L1Town template, the shop instance (L1MerchantInstance), the NPC action that opens the rate UI (C_NPCAction), the Getback caller, the SQL schema for `town` and `characters`, and the config value `Config.RATE_SHOP_SELLING_PRICE`. So the layout half of the topic is not covered by this cell. Verdict is for the town economy and return points.

Best transferable idea: A hub takes a tax on each service sale, the leader's rate change is held in reserve until the daily tick, and the monthly pool of the fixed tax is shared out per point of contribution, with the top contributor becoming the leader.
Decision (proposed): adapt — take the reserved-rate-until-tick rule and the monthly pool split by contribution as a city-treasury loop on the one ledger. Adapt the tax maths: one tax figure per sale, split after, so the buyer and the town never disagree by a rounding unit (defect below). Reject the hard-coded town ids 1 to 10.
Acceptance: A server test asserts that a rate change made during the day is not charged until the daily tick, that a 30-coin sale at a 5 percent total rate charges the buyer exactly the amount the town books, and that the player with the most contribution becomes leader after the monthly pass.

## 1. Mechanism

- Town record. Each town row holds a leader id, a variable tax rate, a reserved rate, today's sales, yesterday's sales, the variable tax pool (`town_tax`) and the fixed tax pool (`town_fix_tax`). Rows are loaded into an in-memory map (`load`, TownTable.java:57-81). The fixed part is always 2 percent (`_minTaxRate`, line 41).
- Leader sets the rate (C_TaxRate.java:77-79). Only the town leader may set it, and only a total of 2 to 5 percent. The stored value is the total minus 2 (so 0 to 3 variable). It is written to the reserved column (TownTable.java:173, 181), not the active one.
- Sale (L1Shop.java:220-224 to TownTable.java:105-135). On a shop sale to a player, the town is found from the NPC (L1TownLocation.getTownIdByNpcid). The sale is booked only when no monthly pass is running (L1Shop.java:221). Per unit, the variable tax is `price * rate / 100` and the fixed tax is `price * 2 / 100`, both with integer division (TownTable.java:120-121). If a non-zero rate gives 0, the variable and fixed taxes are each forced to 1 (125-129). Today's sales go up by price times count for the line (TownTable.java:117, the total sales counter).
- Buyer's price (L1TaxCalculator.java:116-126). The buyer's town tax is the sum over units of `(int)((price * Config.RATE_SHOP_SELLING_PRICE) * rate / 100)`, where the rate is the active rate plus 2 (L1TownLocation.java:187). So the buyer pays the variable plus the fixed part.
- Daily tick (HomeTownTimeController.java:78-90). On each day change the reserved rate becomes the active rate (TownTable.java:220), today's sales become yesterday's and today's reset to zero (236), and the in-memory map reloads.
- Monthly pass (HomeTownTimeController.java:92-136), on day 25. Sales are paused (98). For each town 1 to 10 (109), the members are ranked by contribution, highest first (154); the total contribution is summed; the unit is the fixed pool divided by the total contribution, floored to two decimals (179-180); each member's pay becomes contribution times the unit and the contribution resets (183); the leader becomes the top contributor and the fixed pool resets to 0 (188). The order inside `monthlyProc` is: roll the rate and sales tables and reload (93-96), pause sales and save all players (98-108), run the per-town pass above (109-123), reload, set HomeTownID -1 to 0 and reset every player's contribution and save again (123-131), then `clearHomeTownID` (134, the SQL at 216) and resume sales (135). A town with no members gets leader id 0 and a null name and its fixed pool is zeroed anyway (157-160, 188-192): the pool is destroyed, not carried over. The payout itself is claim-and-zero: `getPay` (226-254) reads the character's Pay column with FOR UPDATE and sets it to 0, so each member collects once. On day 25 `monthlyProc` runs instead of `dailyProc` (only one of the two runs).
- Return points (L1TownLocation.java:173-178). Each town has a small array of coordinates (2 to 9 points per town, counted from the arrays). One is picked uniformly at random with ThreadLocalRandom (177). The map id comes from a second table (151-167). An unknown town falls back to the Silver Knight Town points array only (175-176); the map id at 178 is `townToMap.get(townId)`, which returns null for an unknown town and throws on unboxing, so the fallback is incomplete (donor defect: fall back the map id too). Callers include the Getback path, the home-town item (C_ItemUSe.java:1172) and the Orcish Forest return (L1PcInstance.java:1306).

## 2. Key functions

- `TownTable.addSalesMoney` 105-135: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/datatables/TownTable.java`. Booking of one sale's taxes into the ledger.
- `TownTable.updateTaxRate` 214-228 and `updateSalesMoneyYesterday` 230-244: same file. The daily activation and the sales roll.
- `TownTable.changeTaxRate` 173 (reserved column only): same file.
- `HomeTownTimeController.fixedProc` 74-83, `dailyProc` 85-90, `monthlyProc` 92-136, `totalContribution` 138-207: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/controllers/HomeTownTimeController.java`.
- `L1TownLocation.getGetBackLoc` 173-179 and `getTownTaxRateByNpcid` 181-190: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1TownLocation.java`.
- `L1Shop.payTownTax` 220-227: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/shop/L1Shop.java`.
- `C_TaxRate.setTownTax` 68-81: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/clientpackets/C_TaxRate.java`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-part tax: variable rate set by the leader, fixed part always on | Fixed part 2 percent (TownTable.java:41); variable part 0 to 3 (C_TaxRate.java:78-79) |
| Rate change held in reserve, applied at the daily tick | Daily tick on day change; monthly pass on day 25 (HomeTownTimeController.java:78) |
| Daily roll of sales into yesterday | Reset to zero (TownTable.java:236) |
| Pool split by contribution, two decimals | Floor to 2 decimals (HomeTownTimeController.java:179-180) |
| Leader = top contributor | Order by contribution, descending (154) |
| Pause booking while the pool is computed | Flag set at 98, cleared at 135; checked at L1Shop.java:221 |
| Random pick from a list of return points | 2 to 9 points per town; fallback Silver Knight Town (176) |
| Hub id range | Towns 1 to 10 only (L1Shop.java:223; L1TownLocation.java:185; HomeTownTimeController.java:109) |

## 4. TypeScript sketch

simplified: keeps the donor's flow: the leader-set rate is held in reserve and becomes active at the daily tick, the sales are booked only when the pass is not running, the monthly pool is split by contribution with a two-decimal unit, and the top contributor leads. It omits the database writes and the in-memory cache reload, the return points, the home-town flag clearing, the shop NPC lookup, and the buyer's price path (the donor computes the same figure separately). It changes one thing on purpose: the donor computes the buyer's tax and the town's credit separately with separate roundings, and the minimum-1 rule applies to each part; the sketch computes one tax figure per sale, floors it per unit, and splits the fixed share from that figure, so the buyer and the town cannot disagree.

```ts
// clean-room sketch from the described mechanism (donor licence: GPL-2.0-or-later; shape only, no lines copied).
export {};

interface Town {
  id: number;
  leaderId: string;
  variableRatePct: number;  // active leader-set part (0 to 3 in donor)
  reservedRatePct: number;  // set by the leader; becomes active at the daily tick
  fixedRatePct: number;     // always-on part (donor: 2)
  salesToday: number;
  salesYesterday: number;
  taxPool: number;          // variable tax collected
  fixPool: number;          // fixed tax collected; paid out monthly
  paused: boolean;          // true while the monthly pool is computed
}

// One tax figure per sale line, floored per unit. The town's split is taken from this figure,
// so the buyer's tax and the town's credit cannot disagree by a rounding unit.
function saleTax(price: number, count: number, totalPct: number): number {
  let tax = 0;
  for (let i = 0; i < count; i++) tax += Math.floor((price * totalPct) / 100);
  return tax;
}

// Records one sale. Returns the tax the buyer owes on the line; the town keeps the same amount.
function recordSale(t: Town, price: number, count: number): number {
  if (t.paused) return 0; // no sales are booked while the monthly pool is computed
  const totalPct = t.variableRatePct + t.fixedRatePct;
  const tax = saleTax(price, count, totalPct);
  const fixed = Math.floor((tax * t.fixedRatePct) / totalPct);
  t.fixPool += fixed;
  t.taxPool += tax - fixed;
  t.salesToday += price * count;
  return tax;
}

// Leader sets the total rate (2 to 5 in donor); the variable part is stored and applied at the next daily tick.
function setReservedRate(t: Town, callerId: string, totalPct: number): boolean {
  if (callerId !== t.leaderId) return false;
  if (totalPct < t.fixedRatePct || totalPct > 5) return false;
  t.reservedRatePct = totalPct - t.fixedRatePct;
  return true;
}

// Daily tick: the reserved rate becomes active and today's sales become yesterday's.
function dailyTick(towns: Town[]): void {
  for (const t of towns) {
    t.variableRatePct = t.reservedRatePct;
    t.salesYesterday = t.salesToday;
    t.salesToday = 0;
  }
}

// Monthly pool: the fixed-tax pool is shared out per point of contribution, two decimals; top contributor leads.
function monthlyPayout(t: Town, contributions: Map<string, number>): { leader: string | null; pay: Map<string, number> } {
  t.paused = true;
  let total = 0;
  let leader: string | null = null;
  let best = -1;
  for (const [id, c] of contributions) {
    total += c;
    if (c > best) { best = c; leader = id; }
  }
  const unit = total > 0 ? Math.floor((t.fixPool / total) * 100) / 100 : 0;
  const pay = new Map<string, number>();
  for (const [id, c] of contributions) pay.set(id, c * unit);
  t.fixPool = 0;
  // Donor: a town with no members ends with no leader and its pool is still zeroed.
  t.leaderId = leader ?? "";
  t.paused = false;
  return { leader, pay };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/cm016-l1j-town-economy.ts`; local copy in `work/l1j-town-economy.ts`).

## 5. Lands in

- TARGET `origins/zones/town-economy.ts` (new, proposed; does not exist yet): the hub tax ledger, the reserved-rate rule and the monthly pool, on the one ledger. The leader's rate change is a server command.
- Parity-checklist row 23 (zone data: a hub is a zone with its own return points and rules). The monthly pool pays members in the same way as row 18 (loot roll and XP award); row 23 was the hint for this cell and is kept.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: zones are data on one runtime (return points and the tax rate are zone data); one ledger (one tax figure per sale, split after); server-verified (the sale and the rate change are server commands).

## 6. Gaps and risks

- GPL-2.0-or-later copyleft: clean-room, shape only. The sketch is written from the mechanism.
- Defects (keep the idea, fix each):
  - D1: the buyer's price multiplies by `Config.RATE_SHOP_SELLING_PRICE` (L1TaxCalculator.java:121), but the town's credit does not (TownTable.java:120-121). With any rate other than 1 the town books a different amount from what the buyer paid. fix: one tax figure per sale, split after (sketch does this). The config value was not read.
  - D2: the buyer's tax is one floor per unit of the total rate, while the town books two floored parts, and the minimum-1 rule applies to each part (TownTable.java:125 and 129). For a 30-coin sale at a total of 5 percent, the buyer pays 1 and the town books 2 (1 variable and 1 fixed) if the configured selling rate is 1. fix: take the fixed part from the same figure and apply no minimum (sketch does this).
  - D3: the hub range 1 to 10 is written as a literal in three places (L1Shop.java:223, L1TownLocation.java:185, HomeTownTimeController.java:109), while the town ids run to 17 (L1TownLocation.java:16-32). Towns 11 to 17 get no town tax and no monthly pool; the intent was not read. fix: one constant or a per-town data flag.
  - D4: the town lookup can return null (TownTable.java:97), and the sale path reads the rate without a null check (TownTable.java:110). fix: check the lookup and refuse the sale.
  - D5: the sale path is synchronized (TownTable.java:105), but the reserved-rate writer (173) and the tax removal (154) are not. The in-memory town and the database row are updated in two separate steps. fix: one writer or one transaction per town.
- The fixed 2 percent is a constant (TownTable.java:41). Frankendom should make it a zone data field.
- The return points are a fixed list of 2 to 9 coordinates per town, chosen uniformly. The list is a data-like table in code; Frankendom should move it into zone data with a designer-set weight per point.
- Not covered: the town layout (roads, buildings, landmarks, signage) and the minimap. The donor's map files were not read, so the cell's layout topic is not answered by this note.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: 1 (one engine, zones as data); one ledger (one tax figure per sale); server-verified (sale and rate change on the server)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- monthlyProc order: players are saved first (102-108), then the per-town pass, then HomeTownID -1 to 0 and contribution reset (123-127), then clearHomeTownID (134); note said players are saved after the pool pass.
- Fallback at L1TownLocation 175-176 only substitutes the points array; townToMap.get(townId) at 178 returns null for an unknown town and unboxing throws, so the fallback claim was incomplete.
- Missed: empty town gets leader 0/null and its pool zeroed (sketch kept the old leader); getPay 226-254 claim-and-zero payout; day-25 path replaces dailyProc.

Fixed 2026-10-12: monthly order rewritten, fallback claim corrected, added empty-town and getPay lines; sketch monthlyPayout now clears the leader for an empty town. Typecheck: see report.
