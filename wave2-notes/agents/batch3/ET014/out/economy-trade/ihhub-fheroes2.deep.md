# ihhub-fheroes2 (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/resource_trading.cpp` (rate tables and `getTradeCost`, 48-130), with the trading UI in `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/dialog/dialog_marketplace.cpp` | Licence: GPL-2.0-or-later per the per-file header (`resource_trading.cpp` line 8: "(at your option) any later version."); the repository `LICENSE` is GPL version 2, June 1991 | C++ | symbol `fheroes2::getTradeCost`

Checked: The task's hint file `dialog_marketplace.cpp` is the UI dialog, not the pricing: its `GetTradeCosts` (56-60) only forwards to `getTradeCost`. The real rate tables and the lookup are in `kingdom/resource_trading.cpp` (read in full, 1-140). Also read: the dialog's rate display (180-240), its selection, scrolling, max/min and commit (470-633); `Kingdom::GetCountMarketplace` (`kingdom/kingdom.cpp` 354-358) and `OddFundsResource` (451-452); `Funds::operator-` and `Funds::Trim` (`resource/resource.cpp` 205-235, 518-540) and the `Funds` field types (`resource.h` 128); the AI planner's use of the same function (`ai/ai_common.cpp` 270-300, 326-348). Not read: the castle building predicate (`PredicateIsBuildBuilding`), the call sites of the trading post, the dialog text at 240-330, the gift dialog, and any test of the tables. Confidence: high on the lookup, the quantity arithmetic and the commit; high that the commit has no sufficiency check (it is only bounded by the slider in the UI). Camera: not applicable.

Best transferable idea: a barter rate read from a per-pair table, indexed by how many of a building the owner has (nine tiers, clamped), with the quantity bounded by the source funds and both sides committed together.

Decision (proposed): adapt. The tiered rate table by category pair is clean, data-driven and the same table serves the player and the AI here, which fits Frankendom's one-engine ruling; but the donor commits by subtracting and clamping on the local kingdom, with no server check, so Frankendom's server must quote and settle both sides and refuse a short trade.

Acceptance: a server test: with 3 marketplaces, selling 10 ore for gold quotes 50 gold per ore and credits exactly 500 gold while debiting 10 ore; a trade of 5 wood when the player holds 4 is refused with no change to either side; the trade window's rate text equals the server quote for the same inputs; with 0 marketplaces no trade is offered.

## 1. Mechanism

- Resources are in three categories: common (wood, ore), rare (mercury, sulfur, crystal, gems), and gold (`resource_trading.cpp` 31-47). Each pair of categories has a row of nine values, one per marketplace tier (48-56): common-to-common and rare-to-rare share one row (46, 130), so there are eight distinct rows.
- The tier is the number of the owner's castles that have a marketplace built (`Kingdom::GetCountMarketplace`, `kingdom.cpp` 354-358). A trading post always uses tier 3 (`dialog_marketplace.cpp` 59).
- Order of steps in `getTradeCost` (61-131), as the code runs:
  (a) tier 0 is asserted and returns 0 (63-66); the same resource or an unknown resource returns 0 (68-72);
  (b) the tier is clamped to 9 (74-76) and reduced by one to a zero-based index (78);
  (c) the pair selects the row and the index returns the value (80-130).
- What a value means (dialog text, 186-198): for a trade to gold, the value is gold per one unit of the source ("I can offer you %{count} for 1 unit of ..."). For a trade to a resource, the value is units of the source per one unit of the target.
- Quantity bounds (dialog 489-494, same in the to-click at 529): the source funds are `max_sell`; the buyable amount `max_buy` is `max_sell x rate` for a trade to gold and `max_sell / rate` (integer division) otherwise. The slider's range is the source funds for a trade to gold and `max_buy` otherwise (186).
- Steps (554-555, 568-569, 580-581, 613, 626): for a trade to gold, one step spends 1 source unit and gains `rate` gold. For a trade to a resource, one step spends `rate` source units and gains 1 unit of the target. The minimum is one step; the maximum button uses the slider's top index.
- Commit (589-591): a trade commits only if both sides are non-zero; the source is reduced by `OddFundsResource` and the target increased by `AddFundsResource`, on the local `Kingdom` object.
- `OddFundsResource` subtracts and then clamps each negative resource to zero (`kingdom.cpp` 451-452; `Funds::Trim` at `resource.cpp` 520-523). There is no check that the source covers the amount; the protection is the slider bound only. `Funds` is `int32_t` per field (`resource.h` 128).
- The AI planner calls the same `getTradeCost` to plan exchanges, both to gold (`ai_common.cpp` 284) and to a missing resource (338). One table serves the player and the AI.

## 2. Key functions

- `fheroes2::getTradeCost`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/resource_trading.cpp` 61-131. Tier clamp, zero guards, pair lookup.
- Rate rows: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/resource_trading.cpp` 48-56.
- Trade window quantity and commit: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/dialog/dialog_marketplace.cpp` 470-633 (the selection, bounds, steps, commit at 589-591).
- `Kingdom::OddFundsResource`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/kingdom.cpp` 449-453.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rate by (source class, target class) and a building count tier, clamped to a maximum | Nine tiers (48, 74-76); trading post tier 3 (dialog 59) |
| Same-class pairs share a rate row | Common-to-common and rare-to-rare share one row (50, 130) |
| Quantity bounded by source funds, integer division for the buyable amount | `max_sell / rate` (494); gold side multiplies (494) |
| Commit both sides only when both are non-zero | `count_sell && count_buy` (589) |
| Rates decrease with more tiers in the buy direction and increase in the sell direction | Rows, e.g. gold-to-common 2500 at tier 1 and 500 at tier 9 (55); common-to-gold 25 at tier 1 and 124 at tier 9 (53) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's pair classes, the same-resource zero, the tier clamp to nine and the zero-based lookup, the two quantity directions with the funds bound, and the commit. It omits the castle count, the trading-post tier, the slider, min and max buttons, the displayed text, the gift path and the assertion for tier 0 (the sketch returns 0 instead). It differs from the donor in one place: the commit refuses a short source, where the donor subtracts and clamps to zero.

```ts
// Licence: donor per-file header is GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Res = "wood" | "ore" | "mercury" | "sulfur" | "crystal" | "gems" | "gold";
type Cls = "common" | "rare" | "gold";
type Ledger = Record<Res, number>;

const MAX_TIERS = 9;

// Rate rows by category pair. Each row has one entry per marketplace tier (1 to 9).
// For a trade to gold the value is gold per one unit of the source; otherwise it is units of the source per one unit of the target.
const RATE_ROWS: Record<string, readonly number[]> = {
  "common>common": [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "rare>rare": [10, 7, 5, 4, 4, 3, 3, 3, 2],
  "common>rare": [20, 14, 10, 8, 7, 6, 5, 5, 4],
  "rare>common": [5, 4, 3, 2, 2, 2, 2, 2, 1],
  "common>gold": [25, 37, 50, 62, 74, 87, 100, 112, 124],
  "rare>gold": [50, 74, 100, 124, 149, 175, 200, 224, 249],
  "gold>common": [2500, 1667, 1250, 1000, 834, 715, 625, 556, 500],
  "gold>rare": [5000, 3334, 2500, 2000, 1667, 1429, 1250, 1112, 1000],
};

function categoryOf(r: Res): Cls {
  if (r === "gold") return "gold";
  if (r === "wood" || r === "ore") return "common";
  return "rare";
}

// Rate for a pair at a given count of marketplaces. Zero when no trade is possible.
function tradeRate(marketplaces: number, from: Res, to: Res): number {
  if (from === to || marketplaces === 0) return 0;
  const row = RATE_ROWS[`${categoryOf(from)}>${categoryOf(to)}`];
  const tier = Math.min(marketplaces, MAX_TIERS) - 1;
  return row[tier];
}

// Largest number of steps the source funds allow. One step gives 1 source unit (to gold) or `rate` source units (to a resource).
function maxSteps(fromFunds: number, rate: number, toGold: boolean): number {
  if (rate === 0) return 0;
  return toGold ? fromFunds : Math.floor(fromFunds / rate);
}

function stepsToAmounts(steps: number, rate: number, toGold: boolean): { give: number; get: number } {
  return toGold ? { give: steps, get: steps * rate } : { give: steps * rate, get: steps };
}

// Commit on the server. Refuses when the source is short; the donor subtracts and clamps to zero instead.
function settleTrade(ledger: Ledger, from: Res, to: Res, give: number, get: number): boolean {
  if (give <= 0 || get <= 0) return false;
  if (ledger[from] < give) return false;
  ledger[from] -= give;
  ledger[to] += get;
  return true;
}
```

Typecheck: the block plus `export {};` was copied to the VPS `/tmp/ET014-fh-check.ts` and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0.

## 5. Lands in

- TARGET `origins/economy/barter-rate.ts` (new, proposed; the Frankendom tree was not read, so the path is a proposal). The rate tables, the tier lookup and the quantity bound are one pure module used by the server to quote and settle, and by the shop window only to display. The commit sits next to it in the one ledger.
- Parity-checklist row 21 (catalogue fields): the rate rows and tier counts are catalogue or zone data. Row 18 (loot roll and XP award) does not fit a barter rate, so row 21 is the closest of rows 1-23.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (one quote function used by the player and the AI; both sides committed together by the server); zones as data (the rate rows and the tier source are per-zone data, not constants).

## 6. Gaps and risks

- The commit is local and unchecked: `OddFundsResource` (`kingdom.cpp` 451-452) subtracts, then `Trim` (`resource.cpp` 520-523) clamps to zero. A short source is never refused in the donor; it is only prevented by the slider bound in the UI. Frankendom's server must refuse it.
- Silent clamp: because `Trim` hides a shortfall, a bug in the bound would create resources without error. Frankendom should fail the transaction and report it, not clamp.
- The rate by building count is a tier, not a continuous curve: nine steps and a clamp at nine. Frankendom must decide whether tier counts above nine are useful; the donor throws the extra away.
- Integer division loses the remainder on a trade to a resource (`max_sell / rate`, 494): the leftover source units are unspent. That is a designed rounding; Frankendom should state it in the acceptance test rather than leave it implicit.
- Same-class rows share one set of values (50, 130). That is a design choice: Frankendom should decide whether same-class trades are allowed at all.
- The trading post always uses tier 3 (dialog 59), independent of the owner's buildings. Frankendom's equivalent of a neutral market should be a zone field, not a hardcoded tier.
- Frankendom's currency model was not read: the sketch takes the funds as numbers and does not assume a gold stat or a reputation term.
- Pit as client: no trade happens in the Pit. The rate function must not be the settlement path there.
- GPL: clean-room only. The sketch is written from the mechanism, not translated.
