# 2004Scape-Server (trading-barter-vendors, cell 36)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` (price formula and buy/sell loops), with `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` (restock), `/mnt/frankendom-donors/2004Scape-Server/src/cache/config/InvType.ts` (stock rows) and `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/interface_trade/scripts/trade.rs2` (player trade, section 6) | Licence: MIT ("MIT License, Copyright (c) 2023-2025 Lost City", LICENSE line 1); MIT code may be adapted | RuneScript + TypeScript engine | symbol `calc_shop_value` (with `adjusted_item_cost_buying`, `adjusted_item_cost_selling`, `price_mod`), restock block in `World.processCleanup`

Checked: Read shop.rs2 end to end (192 lines), trade.rs2 end to end (358 lines), World.ts restock block (1148-1215) and the cleanup call site (444), InvType.ts stock decode (80-122), Inventory.ts stock load and remove rule (66-70, 243-290), Player.ts invItemSpace (1573-1594), InvOps.ts both_moveinv (374-500), NumberOps SCALE (123-126), ScriptState pushInt (325-327), CloseModalHandler.ts and Player.ts modal close (848-858), and the example config rows (varrock.inv, edgeville.npc). Not read: the oc_cost and oc_tradeable lookups, npc_param resolution, the wealth event sink, World.TICKRATE (so ticks are not converted to seconds), the revealObj code, and the trade `busy` check. Confidence: high on the shop formula, the buy/sell loops and the restock rule (each line read, order checked); medium on "restock keyed by slot is safe" (I checked the load, add and remove paths only). Worked numbers below are my arithmetic from the formula, not a run. camera_scope: not applicable.

## 1. Mechanism

An NPC shop is a shared inventory (scope=shared in the config) with a stock list. Each stock row gives an object, a baseline count and a restock interval in ticks (`stockN=object,count,rate`, e.g. `stock1=bronze_chainbody,5,100`, varrock.inv line 9). The price of one unit depends on how far the current stock is from the baseline, so buying from a short shop costs more and selling into a shop that already holds too much pays less.

Order of operations for one unit (the price is recomputed for every unit in the loop):
(a) The stock deviation is `price_mod = current stock - baseline` (shop.rs2 131-136). Baseline comes from the stock row; if the object has no stock row, the deviation is the raw stock count (132-135).
(b) The deviation is scaled by the NPC's per-unit haggle value (`shop_delta`) and clamped to -5000 .. +1000 (shop.rs2 185).
(c) The shop multiplier (per mille) minus that clamped adjustment is floored at 100 (185-186). Buy from shop uses the shop's SELL multiplier (1300 in the example), sell to shop uses the BUY multiplier (400 in the example) (141, 152).
(d) Value = multiplier x base cost / 1000, computed by the SCALE opcode as `(a*c)/b` then truncated to 32-bit (shop.rs2 187; NumberOps.ts 125; ScriptState.ts 326).
(e) Buy: value is at least 1 (shop.rs2 144); overflow of the value is caught and set to 2000000000 with an error log (189).
Buy loop (shop.rs2 59-97): for each unit, reprice at `shop_stock - i` (67), stop if the coins are short, the shop is out of stock, or the remaining units cannot fit (stop lines 69, 76 and 85; the stop at 85 has an exception when the purchase spends every coin, which frees the coin slot), then pay (93) and move one unit (94). A wealth event is written with the count and the total.
Sell loop (shop.rs2 100-128): the sold units are priced at `shop_total + i` (120), the items move into the shop (125), then coins are added (127-128).

Restock (World.ts 1148-1216, once per world tick from the cycle at 444): for each shop with the restock flag and stock lists: if the slot's count is below the baseline and `tick % rate == 0`, add one (1192); if above, remove one on the rate tick (1198). Unlisted items in an allstock shop lose one unit every 100 ticks (1206, constant at 122, "1m" in the comment). Stock slots are never cleared when they reach zero (Inventory.ts 280), so a sold-out stock line still holds a slot and refills.

Worked numbers from the formula, with the example Edgeville general store (sell 1300, buy 400, delta 30) and a base cost of 100 gp:

| Stock vs baseline | Player buys (sell multiplier) | Player sells to shop (buy multiplier) |
|---|---|---|
| equal | 130 gp | 40 gp |
| 10 below | 160 gp | 70 gp |
| 10 above | 100 gp | 10 gp (floor 100 per mille) |
| 40 above | 30 gp (clamp 1000 per mille) | 10 gp |
| 200 below | 630 gp (clamp -5000) | 540 gp |

So the buy price can fall to 30 percent of base and rise to 630 percent, and the sell price can rise to 540 percent when the shop is starved, and never falls below 10 percent (before the sell floor fix in section 6).

Note: the stock is shared (scope=shared), so every player sees the same stock and price at the same tick. Restock and decay are driven by the world tick, not the wall clock; the rule is deterministic given the tick number.

## 2. Key functions

- `calc_shop_value` `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` 183-190: clamp, floor, scale, overflow guard.
- `price_mod` `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` 131-137: stock minus baseline.
- `adjusted_item_cost_buying` `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` 139-147: uses the sell multiplier; floor 1.
- `adjusted_item_cost_selling` `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` 150-153: uses the buy multiplier; no floor.
- `buy_item` loop `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` 59-97; `sell_item` loop 100-128.
- Restock `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 1182-1210 inside `processCleanup` (1148).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Price = base x multiplier, multiplier moved by how far stock sits from baseline | `(stock - baseline) x haggle`, clamped -5000 .. 1000 (shop.rs2 185) |
| Multiplier floor (price cannot fall below 10 percent of base via the multiplier) | 100 per mille (shop.rs2 186) |
| Per-mille scale (1000 = 100 percent) | scale(a, 1000, base) (shop.rs2 187) |
| NPC multipliers and haggle as data | `param=shop_sell_multiplier,1300`, `param=shop_buy_multiplier,400`, `param=shop_delta,30` (edgeville.npc 29-31) |
| Buy minimum | 1 gp (shop.rs2 144) |
| Overflow guard | 2000000000 (shop.rs2 189) |
| Restock one unit per interval when short or over | rate in ticks per stock row (`stockN=obj,count,rate`; varrock.inv 9 and 30; InvType.ts 110-111) |
| Unlisted item decay in a general store | 1 unit per 100 ticks (World.ts 122, 1206) |
| Restock check runs every world tick | cleanup call (World.ts 444) |

## 4. TypeScript sketch

simplified: keeps the donor's formula order (deviation, clamp, multiplier floor, per-mille scale, minimum) and the one-unit restock on the rate tick. It changes three things and says so: the sell side gets a 1 gp minimum (the donor has none), restock is written per row (the donor indexes by slot), and a zero rate is rejected at load (the donor's modulo by zero never restocks). It omits the slot array, the overflow-to-2-billion guard, the coin and inventory checks, the wealth logging, and the decay for unlisted items except for a separate helper.

```ts
// Licence: MIT (donor, 2004Scape-Server LICENSE). Adapted shape, rewritten for this sketch.
type StockRow = { itemId: string; baseline: number; restockTicks: number };
interface ShopParams { buyPerMille: number; sellPerMille: number; haggle: number; } // shop buy and sell multipliers, per-unit haggle

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Unit price. stock and baseline are counts. Result is whole gp.
// minValue: donor uses 1 for shop buy; the sell side has no floor in the donor (fix: floor at 1).
function unitPrice(baseCost: number, perMille: number, haggle: number,
                   stock: number, baseline: number, minValue: number): number {
  const deviation = clamp((stock - baseline) * haggle, -5000, 1000);
  const mult = Math.max(100, perMille - deviation);      // per mille, floor 10 percent
  const value = Math.trunc((mult * baseCost) / 1000);
  return Math.max(minValue, value);
}

// Player buys from the shop: the shop's sell multiplier applies.
function buyPrice(p: ShopParams, baseCost: number, stock: number, baseline: number): number {
  return unitPrice(baseCost, p.sellPerMille, p.haggle, stock, baseline, 1);
}

// Player sells to the shop: the shop's buy multiplier applies.
function sellPrice(p: ShopParams, baseCost: number, stock: number, baseline: number): number {
  return unitPrice(baseCost, p.buyPerMille, p.haggle, stock, baseline, 1);
}

// One world tick. Restock is keyed by item id (fix: the donor indexes by slot).
// stockRate 0 is rejected at load (fix: the donor's modulo by zero never restocks).
function restockStep(tick: number, row: StockRow, stock: number): number {
  if (row.restockTicks < 1) throw new Error("restockTicks must be at least 1");
  if (tick % row.restockTicks !== 0) return stock;
  if (stock < row.baseline) return stock + 1;
  if (stock > row.baseline) return stock - 1;
  return stock;
}

// Unlisted items in a general store lose one unit every decayTicks (donor: 100).
function decayStep(tick: number, decayTicks: number, stock: number): number {
  return tick % decayTicks === 0 && stock > 0 ? stock - 1 : stock;
}

export {}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/vendor-price-restock.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/vendor-stock.ts` (new, proposed; the Frankendom repo was not opened in this pass). Price and stock live on the server; the shop window is client-only.
- Parity row 18 (loot roll and XP award: item grant, money and the one ledger). Nearest row. A stock refill is a respawn-like timer, so row 23 (zone population, respawn) is the alternative; see ruling 2.
- Reuse tag: rewrite-from-idea (MIT, adaptation allowed; the sketch is still written from the formula)
- Brief rule served: one ledger (every buy and sell is a ledger row, not a side count); zones as data (multipliers, haggle, stock rows and rates are data rows per vendor).

Best transferable idea: a vendor price that moves with its own stock (above baseline is cheaper, below is dearer, both clamped) with the stock refilled one unit per interval on a shared tick.
Decision (proposed): adapt — keep the stock-deviation price, the clamp and the per-row restock; key restock by item id instead of slot; floor the sell price at 1 gp; reject a zero restock interval at load.
Acceptance: A player buys the last two units of a 5-stock item and the price rises on the next unit; after 100 ticks the shop holds one more; a server test asserts that a zero restock interval fails to load and that a sell of a 100-gp item to a shop above baseline pays at least 1 gp.

## 6. Gaps and risks

Donor defects, each with the fix (the idea is kept):
1. Sell price has no floor (shop.rs2 150-153): a cheap item sold to a shop far above baseline can pay 0 gp after truncation (for example a 1-gp item at 10 percent). Fix: floor sells at 1 gp (sketch `sellPrice`).
2. Restock is indexed by slot (World.ts 1192-1206 use `stockcount[index]` with `inv.items[index]`). It is correct only while stock slots stay in listed order, which holds now because the load fills slots in order (Inventory.ts 66-70) and stock slots are never cleared (280). Any later sort, swap or move of a stock slot breaks restock silently. Fix: store the baseline on the row keyed by item id.
3. Zero or negative rate: `tick % 0` is NaN, so a row with rate 0 never restocks (World.ts 1192). Fix: reject at load.
4. Overflow guard sets 2000000000 and logs an error (shop.rs2 189): silent price capping. Fix: clamp at a named maximum and alert.
5. Haggle (`shop_delta`) is a per-unit value applied to every item the same way (edgeville.npc 31). The donor comment on the 100 floor says "not entirely sure if this is how it's supposed to be handled" (shop.rs2 142-143). Keep the floor, make it a row field.

Player trade in the same donor (trade.rs2, read in full). It is a two-screen trade with lock on change. Flow: Trade option opens a request (26-69); a mutual request opens both windows and resets both statuses (68-69). Removing an item resets both statuses (313 and 317); adding one does the same (352 and 356). Accept on the offer screen checks free space on both sides (lines 91 and 101; procs at 161 and 192) and opens the confirm screen only when both have accepted (79). The confirm screen's accept runs both_moveinv in each direction (265-266) and closes both. Coins are an ordinary offered item (no money field in trade.rs2). Defects: space is checked at the first accept, not at the confirm; overflow is then dropped at the recipient's feet (InvOps.ts 424-431, lifecycle 200 as passed, reveal after 100 ticks per World.ts 1506). That overflow drop is a safety net, not a check. Tradeable check at 338, members check at 343. Idea kept for Frankendom: one settle call (see EvEmu note) plus the owned overflow drop as the rule for a full inventory.

Other rules that may matter for Frankendom (read, not built): the trade wealth event is written once from the first direction (InvOps.ts 461, 465), so one trade is one audit row with both sides' items and values; a modal close requested on the same tick is applied at the player step, before queued scripts (Player.ts 848-858; CloseModalHandler.ts 8, 13).

Gaps against Frankendom rulings: no escrow exists in this donor for trade or wager; the stake would need an escrow row. Stock is shared (scope=shared): a single shared stock is fine for a gladiator shop but a per-player bought-out limit is not in this donor.

History: "no history available" (no git history in the box; the repo has no changelog for vendors checked).

Rulings for Dom:
1. Should vendor stock be shared across all players in a zone (the donor's model), or per player? Recommendation: shared per zone, as the donor does; per-player limits can come later as a separate row.
2. Should restock go under row 18 (ledger) or row 23 (zone respawn timers)? Recommendation: row 23, because a refill is a timer like a respawn, and the price is the only ledger part.
3. Should the sell price floor be 1 gp or 10 percent of base? Recommendation: 1 gp floor plus a per-item minimum in the data row, so a rare item cannot pay 0.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- All checked claims hold (shop.rs2, World.ts, Inventory.ts, trade.rs2, InvOps, LICENSE MIT).
- Trivial: the licence quote spans LICENSE lines 1-3, not line 1.
- Format gap: older note has no as-data row-fields block or explicit "a new X is one row yes/no" line.
- Missed (not wrong): sell loop also gates on can_sell_obj (104), coin/shop space checks (108-116), and uses oc_uncert for noted items.
