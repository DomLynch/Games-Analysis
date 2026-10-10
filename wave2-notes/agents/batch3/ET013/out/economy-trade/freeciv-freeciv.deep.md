# freeciv-freeciv (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/common/improvement.c` (`impr_buy_gold_cost` 307-330), `/mnt/frankendom-donors/freeciv-freeciv/common/unittype.c` (`utype_buy_gold_cost` 1517-1549), `/mnt/frankendom-donors/freeciv-freeciv/server/cityhand.c` (`really_handle_city_buy` 294-358) | Licence: GPL-2.0-or-later (per the file headers: "either version 2, or (at your option) any later version"; COPYING is GPL version 2) | C | symbol `impr_buy_gold_cost` / `utype_buy_gold_cost` / `really_handle_city_buy`

Checked: Read in full: `impr_buy_gold_cost` (common/improvement.c 307-330), `utype_buy_gold_cost` (common/unittype.c 1517-1549), `really_handle_city_buy` (server/cityhand.c 294-358), `impr_build_shield_cost` (common/improvement.c 295-302), `city_production_buy_gold_cost` (server/citytools.c 3657-3668), `impr_sell_gold` (common/improvement.c 335-338). Callers checked: `impr_buy_gold_cost` is called from `city_production_buy_gold_cost` (server/citytools.c 3663) and from common/aicore/caravan.c 415-417 (AI evaluation; not read beyond the call). `utype_buy_gold_cost` is called from `city_production_buy_gold_cost` (citytools.c 3666) and from common/aicore/aisupport.c 120 (AI; not read beyond the call). `really_handle_city_buy` is called from `handle_city_buy` (server/cityhand.c 402-411; the call is at 410). Not read: the sell handler, the Coinage production itself, the AI caravan logic, the client purchase UI beyond `city_can_buy` (client/citydlg_common.c 1558-1573). Confidence: high for the price formula and the purchase gates (read end to end); medium for how the rest of the economy feeds gold. This is not a camera topic.

## 1. Mechanism

- Two pure price functions, one per item kind (building or unit), answer "how much gold to finish this item now?" Inputs: the city, the item, and `shields_in_stock`. The price covers only the missing shields: `missing = full cost - stock`, where the full cost already includes the percent effects (improvement.c 311; unittype.c 1523).
- Buildings: 2 gold per missing shield (improvement.c 319). Units: `2 * missing + (missing * missing) / 20` (unittype.c 1528). The unit term is a quadratic premium with integer division, so large top-ups cost disproportionately more per shield.
- Zero-stock premium: if nothing is in stock, the price is doubled, for buildings (improvement.c 322-324) and for units (unittype.c 1531-1533).
- Percent modifier: the price is multiplied by `(100 + bonus) / 100`. The building bonus is `EFT_IMPR_BUY_COST_PCT` (improvement.c 327); the unit bonus is `EFT_UNIT_BUY_COST_PCT` (unittype.c 1543-1546). The bonus comes from the ruleset's effects data. The classic and civ2civ3 rulesets set a +100% premium for great wonders (data/classic/effects.ruleset 2571-2577; data/civ2civ3/effects.ruleset 4439-4441). A grep of `data/` found no ruleset that sets `Unit_Buy_Cost_Pct`, so the unit modifier exists in code but is unused by the shipped rules (grep only; the effect is not read in any ruleset file).
- Coinage-like improvements (`IG_CONVERT`) cost 0 and cannot be bought (improvement.c 313-315; server refuses at cityhand.c 314-318).
- Sell side (not the focus): the sale value is the base build cost, `MAX(build_cost * shieldbox / 100, 1)` (improvement.c 337), not the price paid.
- Server purchase, in order (`really_handle_city_buy`, server/cityhand.c): (a) refuse if the city was founded this turn (302-306); (b) refuse if `did_buy` is set (308-312); (c) refuse coinage (314-318); (d) refuse a unit purchase while the city is in disorder (321-325); (e) recompute the price from server state with `city_production_buy_gold_cost` (327-328), so the client's price is never trusted; (f) a price of 0 or less returns with no change (329-331); (g) if the price exceeds the player's gold, refuse with a message (332-349); (h) debit the gold (351); (i) if the stock is below the full cost, the missing shields are written to `disbanded_shields`, the stock is set to the full cost and `did_buy` is set (352-358); (j) the player is notified (361-372), then the city and player info are resent (after 372; exact lines not recorded).
- Reset: `did_buy` is cleared in the per-city turn update (server/cityturn.c 3847; the enclosing function was not read) and when a city is founded (common/city.c 3578). So the limit is one purchase per city per game turn.
- Client mirror: `city_can_buy` (client/citydlg_common.c 1558-1573) checks the same flags and `pcity->client.buy_cost > 0`. The client gets `buy_cost` in the city packet, computed by the server (server/citytools.c 2605). The client's number is for display and enables the button; the server recomputes at purchase.
- Tick: none. This is a request-response handler. It runs once per client request (`handle_city_buy`, server/cityhand.c 410), not in a loop.

## 2. Key functions

- `impr_buy_gold_cost`: `/mnt/frankendom-donors/freeciv-freeciv/common/improvement.c` 307-330. Missing shields, 2 gold each, zero-stock doubling, coinage refusal, percent bonus.
- `utype_buy_gold_cost`: `/mnt/frankendom-donors/freeciv-freeciv/common/unittype.c` 1517-1549. Same shape, plus the quadratic term (1528) and the unit percent bonus (1543-1546).
- `impr_build_shield_cost`: `/mnt/frankendom-donors/freeciv-freeciv/common/improvement.c` 295-302. The full cost the price is measured against: base cost times the build-cost percent effect, scaled by `shieldbox`, minimum 1.
- `really_handle_city_buy`: `/mnt/frankendom-donors/freeciv-freeciv/server/cityhand.c` 294-358. The purchase: gates, price recomputed, gold check, debit, stock top-up, once-per-turn flag.
- `city_production_buy_gold_cost`: `/mnt/frankendom-donors/freeciv-freeciv/server/citytools.c` 3657-3668. Chooses the building or unit price with the current stock.
- `city_can_buy` (client mirror): `/mnt/frankendom-donors/freeciv-freeciv/client/citydlg_common.c` 1558-1573.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = gold per missing unit, on the part not yet built | 2 gold per missing shield for buildings (theirs, improvement.c 319) |
| Units: linear term plus a quadratic term, integer division | Quadratic term `missing^2 / 20` (theirs, unittype.c 1528) |
| Empty start costs more (double when stock is zero) | Multiplier 2 (theirs, improvement.c 323; unittype.c 1532) |
| Percent modifiers stacked on the price from data | Great wonders +100% (theirs, data/classic/effects.ruleset 2573 type line and the 2571 comment; civ2civ3 4439-4441) |
| Items that convert production to money cannot be bought | Coinage (`IG_CONVERT`) price 0 (theirs, improvement.c 313-315) |
| Server recomputes the price, client only displays it | None (mechanism; the packet at citytools.c 2605 carries the display price) |
| One purchase per item per period | `did_buy` reset per game turn (theirs, server/cityturn.c 3847) |

Worked numbers from the formulas above (computed from the donor formula, not measured in a running game): a building with 40 shields to build and 0 in stock costs `2*40*2 = 160` gold; with 20 in stock it costs `2*20 = 40` gold. A unit with a 40-shield build cost and 0 in stock costs `(2*40 + 40*40/20)*2 = 320` gold; with 20 in stock (20 missing) it costs `2*20 + 20*20/20 = 60` gold. The unit numbers show the quadratic term doubling the cost of a large top-up.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (founded, once-per-turn, convert, disorder, recompute price, zero-price refusal, gold check, debit, top-up plus flag). It omits the ownership assert, the message texts, the `disbanded_shields` bookkeeping, `city_refresh` and the packet sends, and the effects lookup (the percent bonus is passed in as a number). It drops the donor's C integer semantics: `Math.floor` on non-negative values matches C integer division here. It does not model the per-turn reset (the caller clears `didBuy`), and it does not model the AI callers.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "building" | "unit";

interface BuyQuote {
  kind: Kind;
  buildCost: number;    // full shield cost of the current item (after the percent modifiers)
  stock: number;        // shields already in the city
  buyPctBonus: number;  // extra percent on the price (data: e.g. +100 for a great wonder)
  isConvert: boolean;   // coinage-like item: never buyable
}

// Price in gold for the missing shields. Pure: the same inputs always give the same price.
function buyPriceGold(q: BuyQuote): number {
  if (q.isConvert) return 0;
  const missing = q.buildCost - q.stock;
  let cost = 0;
  if (missing > 0) {
    cost = q.kind === "building"
      ? 2 * missing
      : 2 * missing + Math.floor((missing * missing) / 20); // units rise faster than linear
  }
  if (q.stock === 0) cost *= 2;                     // nothing in stock: double price
  return Math.floor((cost * (100 + q.buyPctBonus)) / 100);
}

interface CityState {
  turnFounded: number;
  turn: number;
  didBuy: boolean;      // at most one purchase per city per turn
  inDisorder: boolean;
  kind: Kind;
  isConvert: boolean;
  buildCost: number;
  stock: number;
  buyPctBonus: number;
}

interface PlayerLedger { gold: number; }

type BuyOutcome = { ok: true; paid: number } | { ok: false; reason: string };

// Server-side purchase. The price is recomputed here from server state; the client's number is only a display.
function handleBuy(p: PlayerLedger, c: CityState): BuyOutcome {
  if (c.turnFounded === c.turn) return { ok: false, reason: "founded this turn" };
  if (c.didBuy) return { ok: false, reason: "already bought this turn" };
  if (c.isConvert) return { ok: false, reason: "not buyable" };
  if (c.kind === "unit" && c.inDisorder) return { ok: false, reason: "disorder" };

  const cost = buyPriceGold({
    kind: c.kind, buildCost: c.buildCost, stock: c.stock,
    buyPctBonus: c.buyPctBonus, isConvert: c.isConvert,
  });
  if (cost <= 0) return { ok: false, reason: "nothing to buy" };
  if (cost > p.gold) return { ok: false, reason: "not enough gold" };

  p.gold -= cost;                                   // debit before the item is completed
  if (c.stock < c.buildCost) {
    c.stock = c.buildCost;                          // complete the item this turn
    c.didBuy = true;
  }
  return { ok: true, paid: cost };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on the file with `export {};`).

## 5. Lands in

- TARGET `origins/economy/rush-buy.ts` (new, proposed; the Frankendom repo was not read for this note): the pure price function, with the price fields as zone data (per shop or per zone). The purchase handler and the gold debit belong on the server path that writes the one ledger, not in the client.
- Parity row: 21 (catalogue fields). This is the closest row for the price fields, and it is not a clean fit: row 21 is about catalogue data, not money. Row 18 (loot roll and XP award) does not cover gold or purchases. No row covers a gold sink or a purchase; flagged for Lead.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger, server-verified transactions (Frankendom rulings): the server recomputes the price instead of trusting the client; rules 7-9 n/a

Best transferable idea: price a finish-now purchase as gold per missing unit, with a premium when nothing has been started, recomputed on the server and debited from the one ledger before the item completes.
Decision (proposed): adapt — the price shape (linear per missing unit, double at zero progress, percent modifiers as data, server recomputes) fits one ledger; the turn-based once-per-turn gate and the quadratic unit term do not transfer as they are.
Acceptance: a server test asserts that a 40-unit craft job with 0 progress quotes 160 gold, the same job at 20 progress quotes 40 gold, a second finish in the same period is refused, and the ledger balance changes once by the quoted amount.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor.
- Freeciv's gate is a game-turn flag (`did_buy`, cleared at the turn update). Frankendom's fights are real-time, so the gate has to be a time period in seconds or ticks, held as a data field. Do not copy the turn rule.
- There is no inflation control in this code. The price is a fixed sink with no supply side. Frankendom's inflation control must come from elsewhere; this note gives no answer to it.
- The unit quadratic term is a design choice in the donor (faster-than-linear top-ups). For a crafting finish, it can make late top-ups very expensive; decide with a playtest number, not by copying the constant.
- Ledger shape: the donor debits gold, then fills the stock and records the free shields in `disbanded_shields`. Inside this function there is no transaction record. Frankendom's one ledger should record debit and completion as one entry, so a refund or audit has one source.
- The donor does no locking: the check (332) and the debit (351) are not protected by a lock in this function. The code relies on the server handling one request at a time (not read; assumed from the handler's structure). Frankendom's server must keep that guarantee, or lock the player's balance, for concurrent purchases.
- Unit percent modifier exists in code with no shipped ruleset using it (grep only). Do not assume a unit bonus is wired up in the donor.
- Not read: the sell handler (refund path), the Coinage production path that makes the gold, the AI caravan and aisupport callers' use of the price, the end of `really_handle_city_buy` (359 onward). The sale value is the base cost, not the price paid; whether that is an exploit is not assessed here.
- Frankendom ruling check: the price is server-recomputed (matches "server-verified"); zones as data (the percent bonus is data in the donor; the rate is not, so the rate is a data field Frankendom must add).
