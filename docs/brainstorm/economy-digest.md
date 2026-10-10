# Digest: economy-trade (61 notes)

### 00-Evan-shattered-pixel-dungeon (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET001/out/economy-trade/00-Evan-shattered-pixel-dungeon.deep.md
best_idea: Price a shop's sale at base value times a depth band, sell back at base value, and keep a three-item buy-back list, so a sell and buy-back round trip never makes gold and the only margin is the depth band.
decision: adapt - The spread shape and the zero-margin buy-back fit a server-verified economy with one ledger; the donor checks funds only in the client and spends without a check, so Frankendom moves the funds check to the server.
acceptance: A server test asserts a buy above the balance is refused with the balance unchanged, a sell then buy-back returns the balance to its start, and the buy-back list never holds more than three items.
tags: new:price-band-markup,new:sell-at-base-buyback-undo,new:charge-to-value-chance,presence-gated,grace-timer
gaps/risks(excerpt): - Server check: funds are checked only in the client (WndTradeItem 156, Shopkeeper 281). buy (WndTradeItem 298) and buy-back (Shopkeeper 267) spend with no check. The Frankendom server must refuse any buy or buy-back the balance cannot cover, and a test must prove the refusal.
- One ledger: gold is written in five places: Gold.doPickUp (Gold.java 65), buy (WndTradeItem 298), buy-back (Shopkeeper 267), the armband drain (MasterThievesArmband 266), and the quest reset (items/quest/EscapeCrystal.java 316). A pick-up also adds to `Statistics.goldCollected` (Gold.java 66), and buy-back takes it back by hand (Shopkeeper 268). Frankendom needs one add function and one spend function, with lifetime 
checker: -

### 0ad-0ad (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET001/out/economy-trade/0ad-0ad.deep.md
best_idea: Move each traded resource's price index by a fixed step per fixed-size lot, clamp it, and let a slow timer pull it back to zero, so repeated trades get worse but recover on their own without a designer touching anything.
decision: adapt - The impact-and-recovery shape suits a player-run market, but the donor keeps one shared index and two separate ledger calls, so Frankendom scopes the index to a zone market and makes the payment one server transaction.
acceptance: Trading 100 wood for stone gives 82 stone, a second trade gives 79, and the rate returns to 82 after about 20 seconds with no trades; a server test refuses a 40-unit trade with balances and indexes unchanged, and two 100-unit trades leave wood at -4 and stone at +4.
tags: new:price-index-impact,new:timed-restore-to-zero,new:fixed-lot-trade
gaps/risks(excerpt): - One index for the whole market: `priceDifferences` lives on the system entity (Barter.js 45, 47), not on a player, so every player's trade moves the same prices. Frankendom must choose a scope. Zones as data suggests one index per zone market, not one per match.
- Two ledger writes, not one transaction: the payment is `TrySubtractResources` (93) and the payout is `AddResource` (98) in two calls. The donor has no rollback path after the payment. Frankendom makes the trade one server transaction that either moves both or neither.
- Rounding mints or burns a unit: the payout is `Math.round` (97). Frankendom must pick the direction (round down is safer against minting) and write it as a rule, 
checker: -

### 2004Scape-Server (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET001/out/economy-trade/2004Scape-Server.deep.md
best_idea: Price each shop unit from that shop's own stock, so shortage raises the price and surplus lowers it by a fixed step per unit, and each stock row refills one unit per set number of server ticks toward its target, so a shop empties only at a climbing price and refills by itself.
decision: adapt - The stock-driven price and per-row tick restock fit a zone market, but the donor's default numbers make the surplus side and the 60 buy default inert and its units are unresolved, so Frankendom sets the scale and floors as zone data and tests them.
acceptance: Buying three units from a shop at its target gets dearer each unit, a surplus lowers the price only once the zone floor allows it, an emptied row refills one unit every rate interval; a bulk buy that runs out of coins keeps the units already paid for and drops the coins by exactly their sum.
tags: new:stock-deviation-price,new:row-restock-tick,new:partial-buy-keep,clamp-and-report,fixed-step
gaps/risks(excerpt): - Units unresolved: `scale` divides by 1000 (shop.rs2 187), and the defaults are 100 and 60 (shopkeeper.param 7, 11). Taken literally, a shop sells at one tenth of cost at zero deviation. Frankendom must check one known price before it sets any number, and must name the unit in the zone data.
- The default floor hides the 60 default: at zero deviation `max(100, 60 - 0)` gives 100, and with haggle 10 the 60 takes effect only when the shop is more than four units short (shop.rs2 186). A surplus gives no discount on the price a player pays the shop, because the default sell percent is also 100. Frankendom sets the floor and the percents together, and a test pins the result.
- Exact-coins except
checker: -

### CleverRaven-Cataclysm-DDA (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET002/out/economy-trade/CleverRaven-Cataclysm-DDA.deep.md
best_idea: A trade price is one pure function of the item base price and the two parties' stats (a capped skill-gap factor, a capped INT term, a 25% weight, round up), and the whole offer is one signed balance checked against a single credit limit.
decision: adapt - Take the price-chain shape and the one signed balance, which fit a server-computed trade; reject the NPC-remembered debt, the bank and opinion-based credit, which split the ledger in three places and break one ledger.
acceptance: A server test sells an item of base price 100 from an NPC of equal INT to a player whose speech is 2 levels below the NPC and gets 129; reversed gives 123 (sketch output following the donor formula); a trade that would take the balance below the credit limit is refused and no item leaves either inventory.
tags: new:skill-price-adjust,new:escrow-transfer,new:credit-limit,new:signed-balance,clamp-and-report
gaps/risks(excerpt): - Licence CC-BY-SA 3.0 is copyleft: clean-room only; the sketch is written from the described mechanism.
- One ledger: the donor keeps money in three places. The NPC remembers the debt (`npctrade.cpp` 286, `update_npc_owed`), the player holds cash (346), and there is an optional bank (`trade_ui.cpp` 257-267). Frankendom must keep one ledger, so the debt memory and the bank do not transfer. Only the balance formula survives, and only over one ledger.
- Server-verified: the donor computes the price and the balance in the client that shows the trade window (`trade_ui.cpp` 225-231 use local values). Frankendom must compute the price on the server and let the client only show it. The donor gives 
checker: -

### DCurrent-openbor (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET002/out/economy-trade/DCurrent-openbor.deep.md
best_idea: A special is paid from one pool by the same check that gates it, and the payment is refused unless the pool stays above zero for the HP path, so a special can never be the thing that kills the caster.
decision: adapt - Keep one gate-then-pay check with the no-kill floor, a temporary cost ceiling (seal) and the MP regen step, on one pool per special; reject the MP-to-HP fallback (a second ledger) and the deferred payment at animation end (re-checks after the hit).
acceptance: A server test refuses a special costing 6 at stamina 5, accepts it at stamina 6 and leaves 0; with a seal of 4 active for 2 s a 6-cost special is refused and a 3-cost special accepted; a test refuses any charge that would take the attacker's HP to 0 or below.
tags: new:cost-gate-pay,new:cost-ceiling-seal,new:pool-fallback,new:regen-per-second,new:block-mode-split,clamp-and-report,stale-state
gaps/risks(excerpt): - Topic fit: the donor has no shop, trade or price system. What transfers is a resource ledger (costs, fallbacks, ceilings, regeneration). Treat it as a sink and faucet model for stamina, not as an economy.
- One ledger: the donor moves cost from MP into HP (44351, 44387-44428, 31798-31806). Frankendom's one-ledger ruling forbids a second pool silently absorbing the cost. Adapt: one pool per special, refuse instead of falling through.
- Server-verified: every check here runs in the client that also plays the animation (the entity state lives in one process). Frankendom must run the gate and the payment on the server and let the client only show the result.
- Deferred payment: the cost of an 
checker: -

### Dawn-of-Light-DOLSharp (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET002/out/economy-trade/Dawn-of-Light-DOLSharp.deep.md
best_idea: A sale pays the seller the list price and charges the buyer the list price plus a percentage fee, so the fee is a named sink; every check (price, funds, free slot) runs before any money moves, and the seller's proceeds sit in one pool that is paid out whole on withdrawal.
decision: adapt - Keep the three checks before any change, the fee as a named sink and the seller credited the list price; reject the separate merchant money pool (a second ledger) and the unchecked item move; use exact integer math with a bound on the list price, not 32-bit int.
acceptance: A server test lists an item at 1000 copper; a buyer via the market explorer pays 1200, the seller's ledger rises by 1000, and the total of all ledgers falls by exactly 200; a listing at 110,000,000 copper charges 132,000,000 with no wrap, and a buyer with 131,999,999 is refused with no item and no money moved.
tags: new:fee-sink,new:check-before-move,new:merchant-pool,new:item-currency-from-inventory,new:int-fee-overflow
gaps/risks(excerpt): - Licence GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Integer overflow in the fee (`BuyItem` 560). `purchasePrice` and `sellPrice` are C# int (555-556), `MARKET_FEE_PERCENT` is int (2158), and the repo has no `CheckForOverflowUnderflow` setting in its `.csproj`, `.props` or `.targets` files (grep). C# int arithmetic wraps by default, so `purchasePrice * 20` wraps above 2,147,483,647, which happens above 107,374,182 copper. My run of the same 32-bit operations gives a buyer price of 89,050,328 for a 110,000,000 listing, while the seller is credited 110,000,000 (615). That is a copper faucet of about 20.9 million with no source. The seller can enter that pric
checker: -

### EQEmu (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET003/out/economy-trade/EQEmu.deep.md
best_idea: The vendor buy is a server transaction: the client names a stock slot and quantity, the server looks up the line, recomputes the price from base price and a charisma-style percent, takes coin from one wallet, and only then grants the item.
decision: adapt - Take the slot lookup, server-computed price and single wallet, which fit server-verified transactions and one ledger; check bag room before the charge and clamp non-stackable quantity to one, because the donor takes coin first and does not refund on a full bag (14261 vs 14298); keep the CHA/faction curve optional and off by default because the addendum's rulings name no charisma or faction stat.
acceptance: With the curve off, buying a 1000-copper line costs 1050 copper whatever price the request carries; a buy with a full bag is refused and the wallet is unchanged; a quantity of 5 on a non-stackable line is clamped to one item and charged for one.
tags: clamp-and-report,new:vendor-price-curve,new:charge-before-grant
gaps/risks(excerpt): - One ledger: the donor's single copper count (client.cpp 2782-2784) matches the ruling. But the buy takes coin before the room check (14261 vs 14298). A full bag loses the price. Frankendom must check room before the charge (the sketch does).
- Server-verified: the donor takes the slot and quantity from the client and computes the price itself (14166, 14233-14247). Gap: non-stackables are not clamped (14212 tests `Stackable` only), the price is multiplied by the quantity (14247), but one item is created (14307). A client asking for five of a non-stackable pays five and receives one. Read, not run; treat as a donor defect and clamp in the engine.
- No transaction across charge and grant: `Sa
checker: -

### LostCityRS-Engine-TS (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET003/out/economy-trade/LostCityRS-Engine-TS.deep.md
best_idea: A trade is one server transaction that moves both offers, conserves every unit (into the receiver's bag, or onto the floor reserved to the receiver when the bag is full), and writes one ledger row with both sides' values read before anything moves.
decision: adapt - Take the one-transaction shape, unit conservation and two-sided ledger row, which fit server-verified trades and one ledger; reject the silent 200-tick floor despawn as a loss path, because an expired item with no row breaks the one-ledger ruling; the swap must be one server call, not two opcodes run in turn by content.
acceptance: Server test: A offers three stacks, B has one free slot; afterwards every unit is in B's bag or on the floor owned by B, totals per item id are unchanged, one TRADE ledger row holds both sides' values, and an expired floor item writes an EXPIRED row instead of vanishing.
tags: new:two-sided-swap,new:receiver-overflow-floor,new:ledger-row-both-sides,fixed-step
gaps/risks(excerpt): - Silent loss: floor objects are removed after 200 ticks (InvOps.ts 430; the despawn path not read). An item that expires with no ledger row breaks the one-ledger ruling. Frankendom needs an EXPIRED row, or a return to the owner, for every expired unit.
- Two calls, no transaction: the swap is two opcode calls that content runs in turn. If the content stops or throws between them, the first half has already moved (the moves run inside each call, 401-441). Frankendom needs one server transaction that either moves both offers or moves neither.
- Fairness is not the engine's job here: the comment at 412 leaves the outcome to the content. Frankendom's server must check accept state and an offer 
checker: -

### ModernUO (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET003/out/economy-trade/ModernUO.deep.md
best_idea: Each shop line has a stock ceiling that moves with demand (doubles when sold out, halves when most of it stays unsold, never shrinks at small sizes), refills to that ceiling on the next visit after one hour, and takes only one restock step however long the shop sat unvisited.
decision: adapt - Take the lazy one-step catch-up (no per-tick work, no burst after absence) and the demand-moved ceiling, which give a designer-tunable supply control for zones as data; move the cap, reset and floor constants into zone data, and keep player sales from refilling stock, as the donor does, so stock stays a designer number.
acceptance: Server test: a line with ceiling 40 and no stock is at 80 after the next list open past the delay; a line with 30 of 40 left is at 20; a shop unvisited for five hours takes one restock step, not five.
tags: respawn-scaling,wait-gate,new:lazy-one-step-catchup
gaps/risks(excerpt): - The price-scalar sentinel: `100 + Town.FromRegion(Region)?.Tax ?? 0` (BaseVendor.cs 1353) is read as `(100 + tax) ?? 0`, so outside a town it is 0, and the price getter treats 0 as "no scalar" (GenericBuy.cs 79). The result is the base price, but only by a sentinel. Frankendom must use an explicit null or a named default, not a zero that means "no change".
- Sell-side integer: the sell payout accumulates in `int` (BaseVendor.cs 430, 537) with no range guard. The buy side does guard its total (1201-1216) and refuses on overflow with a logged error. Frankendom's copper arithmetic must use one bounded type and one guard on both sides.
- Lazy restock: a shop with no visitor holds stale stock u
checker: -

### OpenDAoC-OpenDAoC-Core (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET004/out/economy-trade/OpenDAoC-OpenDAoC-Core.deep.md
best_idea: A shop reads its price from its own list and the client sends only an item and a count; a buy or sell is one check-then-apply step that moves no money when a check fails.
decision: adapt - The server-read price and check-then-apply shape fit the one ledger; the donor grants before debiting, so Frankendom debits and grants in one step, and the sell-back ratio becomes per-shop zone data.
acceptance: A server test asserts that a failed buy (no funds or no space) changes neither wallet nor inventory, buying 3 at price 100 debits 300 and grants 3, selling a price-199 item at ratio 50 credits 99, and a non-droppable item sells for 0 and is not removed.
tags: new:shop-server-price,new:sell-back-ratio,new:check-then-apply
gaps/risks(excerpt): - Grant before debit. The donor relies on a throw if the debit fails after the items are already in the backpack. Frankendom must check money and space first and then apply both, and a test must show that a failed buy grants nothing and debits nothing.
- Faucet and sink. The sell-back ratio (50 by default) means an NPC sale CREATES money from an item (a faucet), and a buy-then-sell loop loses half (a sink). Frankendom must decide which items an NPC will buy at all. The donor sells any droppable item at the ratio and does not track item origin (not read in full whether the item's origin is recorded anywhere).
- Money is integer. The donor's ratio step floors at each division. Frankendom shoul
checker: -

### OpenEnroth-OpenEnroth (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET004/out/economy-trade/OpenEnroth-OpenEnroth.deep.md
best_idea: A shop price is one multiplier of the item value, a skill percent that discounts it, a floor at the item value for buying, and a clamp to 1..value for selling, so no shop can undercut or over-pay the item's own worth.
decision: adapt - The clamps and the percent-off shape fit a shop as zone data; the reputation term is dropped unless Frankendom has a reputation to feed it, since the duel has none.
acceptance: A server test asserts that a shop's buy price is never below the item value, its sell price is never above the item value and never below 1, and a broken item sells for 1.
tags: new:shop-percent-discount,new:price-floor-clamp,new:check-then-apply
gaps/risks(excerpt): - Reputation. The donor's merchant percent takes its no-skill case from party reputation, which is a number built from five hired-NPC professions (5 each when present) plus a location value. Frankendom has no reputation model in the duel. Drop the term, or give it a single zone field, and say so in the catalogue.
- Skill tie-in. The merchant percent reads a merchant skill level and mastery. Frankendom has no merchant skill yet; the progression lane would need to add one before this discount can be used.
- Integer rounding. The donor truncates at the discount step and again at the sell step. A copy in Frankendom must use integer minor units and the same truncation, or sell prices will drift b
checker: -

### OpenRA-OpenRA (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET004/out/economy-trade/OpenRA-OpenRA.deep.md
best_idea: One player ledger holds cash and a capped ore pool; a debit is take-or-fail and spends ore before cash, and a timed build can be paid as it progresses so a short purse pauses it instead of cancelling it.
decision: adapt - Take the take-or-fail debit and the health-scaled sale refund for Frankendom's ledger; use pay-as-built only for timed crafts; reject the lockstep sync model because the server is the authority.
acceptance: A server test asserts that a 40 debit with 30 ore and 15 cash leaves 0 ore and 5 cash, a 40 debit with 30 ore and 5 cash fails and changes nothing, a 200-value item at half health sells for 50 at refund 50 percent, and a 60-tick craft pays 0 on tick 1 and the full remaining cost on its last tick.
tags: new:take-or-fail,new:ore-before-cash,new:capacity-clamp,new:pay-as-built,new:refund-by-condition
gaps/risks(excerpt): - Lockstep, not server authority. OpenRA runs the same simulation on every client and checks the marked fields for desync (`[VerifySync]` on `Cash`, `Resources`, `ResourceCapacity` at `PlayerResources.cs` 100-107). Frankendom's server is the single authority, so the sync check is not a substitute for server verification. Do not port the lockstep model.
- Pay-as-built in a fight. The payment is per logic tick and it pauses the build when the purse is short. In a fast duel, a craft that pauses mid-way is a trap; keep it for long crafts and say so in the catalogue.
- The rollback reads the current stock, not the amount added this tick (797). Reasoned, not tested: the take can only fail when the
checker: -

### OpenRCT2-OpenRCT2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET005/out/economy-trade/OpenRCT2-OpenRCT2.deep.md
best_idea: Route every coin change through one settle function that takes a typed reason, and re-run the affordability check when the action executes, not only when it was queued.
decision: adapt - The one-settle-function shape with typed reasons and a check at execute time is what the one-ledger, server-verified ruling needs; the park calendar (weekly wages, loans, interest, fortnight upkeep) and the x7 projection do not fit a duel and zone game.
acceptance: A server test: a shop or loot-sale action that changes coins writes exactly one ledger row with its reason; running the same action again after cash has fallen below its cost returns insufficientFunds and changes no state; a test fails on any coin write outside the settle function, with the loan and cheat paths listed as explicit exceptions until routed.
tags: new:single-settle-ledger,new:typed-sink-faucet,new:revalidate-on-execute,clamp-and-report,new:rolling-period-table,new:projected-day-total
gaps/risks(excerpt): - The donor does not have one ledger in practice. `ParkSetLoanAction.cpp` 62 writes `park.cash` directly with no bucket and no day counter. The cheat actions write cash directly at `CheatSetAction.cpp` 601 and 610 (grep hits; not read in context). Scripting also writes cash (`ScPark.cpp` line 58, grep hit only). Frankendom's one-ledger ruling needs these routed through the settle step, or listed as explicit exceptions in a test.
- Guest purchases and spends call `FinancePayment` directly (`Guest.cpp` 1649 and 2271), not through the action runner, so they skip the Query and Execute check. The check for those guest actions was not read. For Frankendom, NPC and merchant purchases need the same 
checker: -

### OpenTTD-OpenTTD (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET005/out/economy-trade/OpenTTD-OpenTTD.deep.md
best_idea: Pay a timed delivery as distance x amount x a time factor that stays flat for a grace window, falls by a fixed slope, then falls on a 1/(x+k) tail that never reaches zero.
decision: adapt - Keep the time-decay curve shape as data for timed rewards (escort, timed bounty, rushed craft order); the ageing counter, cargo table and coupled inflation belong to a transport economy and do not fit Frankendom. Current loot and XP are not time-based, so this has no use until timed content exists.
acceptance: A server test: a timed bounty pays its full base at elapsed 0, pays strictly less at every later tick, drops to 31/255 of base where the linear phase ends, stays above zero after that, and the payout is computed on the server from server ticks.
tags: new:time-decay-payout,new:three-zone-factor,new:hyperbolic-tail-floor,new:transfer-minus-paid,new:two-index-inflation,debt-carry
gaps/risks(excerpt): - Frankendom's current rewards (loot and XP per kill) are not time-based. The curve earns its place only where timed content exists (timed bounty, escort, rushed craft order). Without that content, reject it for now.
- The donor counts ageing ticks of the carrying vehicle, and the period length is a per-vehicle cache whose value was not read. Frankendom must count its own server ticks and state the period length as zone data.
- The curve scales a payout; it does not decide who gets it. Many-on-one credit (hate list, MAX_ATTACKERS = 3) is not in this donor's function (not read in other files).
- The transfer split is a hop-by-hop payout: each hop takes 75 percent of the income so far minus th
checker: -

### OpenXcom-OpenXcom (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET005/out/economy-trade/OpenXcom-OpenXcom.deep.md
best_idea: Check funds and capacity against the running cart total at every add, clamp the quantity to what remains, write the balance once at commit, and queue each row's delivery after its transfer time.
decision: adapt - Keep the add-time money check with the quantity clamp and the single balance write, and add the commit-time re-check the donor lacks; queue deliveries with the catalogue delivery time. Reject base capacity pools (quarters, hangars, store space) unless Frankendom has a capacity-limited inventory, and reject float store size.
acceptance: A server test: a cart of 10 units at a price of 25 with 100 funds clamps to 4 units and a total of 100; commit writes the balance once to 0 and queues one delivery per row after its catalogue delivery time in server ticks; if funds drop to 60 before commit, commit returns a funds error and changes no state.
tags: new:budget-reservation-cart,clamp-and-report,new:single-balance-write,new:delayed-delivery-queue,new:capacity-pools
gaps/risks(excerpt): - The donor trusts the screen. `btnOkClick` writes the balance and queues transfers with no funds or capacity test (327-382). Frankendom must re-check on the server at commit, which the sketch does.
- Division by zero. `increaseByValue` divides by the unit cost (552) whenever no error is set. Scientist and engineer rows are added without a non-zero check (163-180), so a mod cost of 0 would divide by zero. The mod defaults were not read; Frankendom must reject a zero price at catalogue load.
- The scientist and engineer price is the mod cost times 2 (164, 173). Why 2 was not read. Do not copy the factor without knowing its reason.
- Capacity pools are base-management concepts (quarters, hanga
checker: -

### TurningWheel-Barony (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET006/out/economy-trade/TurningWheel-Barony.deep.md
best_idea: Price every trade as catalogue value times one shared modifier stack, then clamp buys to at least the catalogue value and sells to at most it, so no trade can be arbitraged against the shop, and let trading skill narrow the spread.
decision: adapt - Take the modifier stack and the two clamps for shop prices and reuse the neutral sell value for crafting costs; reject client-supplied price fields, the zero floor on overdraft, and the unbounded shop pool, which break the server-verified and one-ledger rulings.
acceptance: A server test sends a buy whose packet beatitude or count differs from the stock item and asserts the price comes from the stock item (or the buy is rejected); a buy with gold below the price is rejected and no gold moves; buy price is at least catalogue value and sell price at most it; a trading-0 buyer pays about 336 and a trading-100 buyer 112 for an unidentified EXCELLENT catalogue-100 item (worked by hand).
tags: new:two-sided-spread,new:proficiency-discount,new:shop-pool-ledger,status-meter,new:server-reprice-from-stock
gaps/risks(excerpt): - Server prices from client packet fields. `SHPB` builds the priced item from the client's packet (type, status, beatitude, appearance, count, identified; net.cpp 7929-7934). The stock match checks type, status, beatitude, model and identified (items.cpp 1479, 1500) but not count, and quivers are priced as the packet count times the price (items.cpp 6011), while the matched stock is consumed whole (net.cpp 7972). Frankendom: price from the stock item on the server only, and ignore client price fields.
- No return after a failed stock match. The loop at net.cpp 7955-7977 has no return, and the price and the gold move follow it (7979-7982), so a buy that matches no stock still charges the buye
checker: -

### ValveSoftware-source-sdk-2013 (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET006/out/economy-trade/ValveSoftware-source-sdk-2013.deep.md
best_idea: Show a discount only when the price really is lower: a sale must be positive and below base, and a bundle shows a discount only when it costs less than its parts, with the struck-out base set to the sum of the parts.
decision: adapt - Take the two discount-truth rules and the never-to-zero rounding for shop prices; take the timed market refresh as stale-while-revalidate but keep the server as owner; reject the client-side market price as displayed truth and reject a rental number without a unit name, because the donor reads the same number two ways.
acceptance: A bundle at 900 with parts summing to 1000 shows base 1000 struck and a discount; a bundle at 1000 shows no strike-through; a 1% sale on a 100-gold item that rounds back to 100 shows no sale; a rental line shows the same charge in the detail view and the cart, with one named unit.
tags: new:sale-only-when-lower,new:bundle-sum-guard,stale-state,new:round-to-granularity,new:rental-share
gaps/risks(excerpt): - Discount truth: the donor's rules (sale strictly below base; bundle below the sum of parts) are the strongest part. Adopt them for Frankendom shops.
- Rounding erases a sale. A small sale rounds back to base and then the sale turns off (inferred from 219-220 and 815-824; the worked example above; not run).
- The rental number has two meanings in one donor. Detail view: charge = scale%. Cart: discount = scale%, so charge = (100 - scale)%. The code is latent here because `ENABLE_STORE_RENTAL_BACKEND` is never defined under `src/`. Frankendom must name the unit in the data field (charge share), and test that the detail and cart agree.
- Market price shows 0 when the cache has no row (298-300;
checker: -

### afritz1-OpenTESArena (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET006/out/economy-trade/afritz1-OpenTESArena.deep.md
best_idea: Pay loot gold from one small range per interior class (halved in villages, doubled elsewhere, scaled by the square of the level in dungeons) and keep the shop sell rate at three quarters so that resale is never a money source.
decision: adapt - Take the per-class gold ranges as zone data and the three-quarter resale rule as one engine constant; reject the donor's two gold representations (counter for shops, inventory item for loot), the price captured at list build, and the equipped-item sale without refusal, since the one-ledger and server-verified rulings need one counter and a server-side price check.
acceptance: A dungeon container at level 3 holds 10 to 109 gold, a village house container 1 to 5, a non-village noble container 40 to 200; all of it lands in the one gold counter; a sale of a 100-gp item pays 75; a purchase of a 75-gp item with 74 gold is refused and nothing moves.
tags: new:class-gold-table,drop-filter,new:flat-resale-rate,new:catalogue-two-table-price,new:one-counter-gold
gaps/risks(excerpt): - Two gold representations. Shops, taverns and corpses use the `player.gold` counter (2702-2706, 2807, 2850, 1515). Loot inserts gold as an inventory item (902), and enemy gold does the same (820). The one-ledger ruling needs one counter; loot must credit it.
- The shop price is captured when the list is built (2062, 2687). A price that changes while the list is open is paid at the old value, and nothing on the server rechecks it. Frankendom: the server re-prices at purchase.
- No stock check on purchase (2702-2706). In the code read, the same item can be bought without limit. Frankendom: stock as data, checked on the server.
- Equipped items can be sold. The sell callback resets the weapon 
checker: -

### alexbatalov-fallout1-ce (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET007/out/economy-trade/alexbatalov-fallout1-ce.deep.md
best_idea: A shop or trade price is one pure function of base cost, a stat-modifier stack, a clamp, and a currency exemption, and an offer is accepted all-or-nothing when it covers that price.
decision: adapt - Keep the price formula and clamp as one server function for shop and player trades; drop the NPC-mood nudge unless a zone asks for it, and fix the empty-NPC-side free gift and the dead T-key branch.
acceptance: Server test: goods 120 with currency 20, equal barter skills, GOOD NPC (+50), no perk, script mod 0 costs 86; an offer of 85 is refused; an empty offer is refused; an empty NPC side is refused.
tags: clamp-and-report,new:currency-exempt-price,new:all-or-nothing-offer,new:mood-price-nudge
gaps/risks(excerpt): - Licence: Sustainable Use License 1.0 allows use only for internal business or non-commercial/personal purposes and free distribution. Treat as restricted: clean-room, shape only, no line-by-line translation.
- Dead branch: the T-key exit condition `modifier <= -30` (4654) can never be true, because the switch yields -25, 0 or +50 (4622-4629). Frankendom should not copy the dead test. If a harsher NPC is wanted, add the level in data, not as this comparison.
- Free gifts: `barter_attempt_transaction` refuses an empty player offer (4262-4264) but not an empty NPC side. With no NPC goods the price is 0, so any offer is accepted and the player gives items for nothing. Frankendom must require b
checker: -

### alexbatalov-fallout2-ce (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET007/out/economy-trade/alexbatalov-fallout2-ce.deep.md
best_idea: A price can be a skill ratio with an offset, (npc + 160) / (party + 160), applied to the cost and multiplied by a bounded modifier, so the price stays smooth and positive without a large clamp, with currency billed at face value.
decision: adapt - Take the ratio form and face-value currency for server-side shop and player trades; add the clamp the donor lacks, do not inherit the doubled cost without a test, drop the companion no-value trade, and make the mood a server record field.
acceptance: Server test: NPC barter 60, party best 100, uncapped goods 100, neutral NPC: price 169; offer 168 refused, 169 accepted; GOOD NPC (-15): price 143.
tags: clamp-and-report,new:ratio-skill-price,new:currency-exempt-price,new:all-or-nothing-offer,new:mood-price-nudge,new:companion-weight-swap
gaps/risks(excerpt): - Licence: Sustainable Use License 1.0 limits use to internal business or non-commercial/personal purposes and free distribution. Restricted: clean-room, shape only.
- Doubled cost: at equal skills and no modifiers the code prices non-currency goods at 2 x their catalogue cost (4695 with the multiplier of 1.0 from 4694). That may be intended; Frankendom must set its own base and state it as a data field, not inherit the factor 2.0.
- No upper clamp on the multiplier: only the floor at 0.0099999998 (4696-4699). Very high modifiers are unbounded. Frankendom should clamp, as the Fallout 1 donor does (10..300).
- Companion trades skip the value check entirely (4720-4729): the goods move for a ca
checker: -

### amilich-isometric-city (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET007/out/economy-trade/amilich-isometric-city.deep.md
best_idea: One settlement step turns a tax faucet and per-service budget sinks into a single balance paid on a fixed calendar, with the tax rate lagged 3% per tick for demand only so a rate change does not shock the city.
decision: adapt - Take the monthly faucet and sink formulas and the day-7 quarter deposit as one server settlement on the server tick; move the ledger off the client, drop the trade income the donor loses, and decide the negative-balance rule in the data.
acceptance: Server test: population 1000, jobs 400, tax 9, one service of 2 buildings at 50 with 100% funding gives income 1080 and expenses 100; crossing day 7 takes 10000 to 10245; a tax change 9 to 100 gives effective rate 11.73 after one tick.
tags: fixed-step,new:weekly-settlement,new:lagged-tax-demand,new:doubling-upgrade-cost,new:client-owned-ledger
gaps/risks(excerpt): - The ledger is the client's. `stats.money` is React state saved to localStorage (GameContext.tsx 348-375) and loaded from it (173-178, 206). A player can edit the save. Frankendom's one ledger must be server state, and the client may only request a build or upgrade.
- `addMoney` (GameContext.tsx 1421-1429) adds any amount with no check. Grep over src found no isocity UI call; a coaster panel calls its own version, which is not read here. Frankendom must have no client mint path.
- The trade income is dropped. `connectToCity` adds 200 to `stats.income` (1012, 1020), but the next tick rebuilds `stats.income` from the formula (simulation.ts 2419 and 2502), and no code adds the 200 into the set
checker: -

### angband-angband (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET008/out/economy-trade/angband-angband.deep.md
best_idea: Price every shop trade with one pure function that the buy and sell commands call on the server, so the client's displayed price is never the one charged, and bound shop payouts with a per-unit purse cap.
decision: adapt - Adopt the server-recomputed price and the single spend-or-refuse transaction; adapt the spreads and the faucet switch to zone data, since Frankendom has no shop balance and the donor's purse is only a per-unit cap, so a gold sink and source must be added.
acceptance: Server test: a buy command sent with a client price of 1 for an item priced 40 charges 40, and a sale of a value-30 item pays 20 to a normal shop and 5 to a black-market shop; in a zone with no_selling set, the sale pays 0 and the item is still removed.
tags: clamp-and-report,new:buy-sell-spread,new:faucet-toggle,new:server-recomputed-price,new:day-restock
gaps/risks(excerpt): - Licence: dual. The Angband licence option is non-profit only, and GPL-2 is the other option. Clean-room, shape only, in either case.
- No shop balance. Gold paid to a shop disappears, and gold paid by a shop has no source record: the purse is only a cap per unit. Frankendom's one ledger needs an explicit sink and a source for every shop trade. The donor does not give one.
- Sell faucet off and drop faucet up (no_selling, obj-make.c 1311) is a whole-game mode, not a per-zone rule. Frankendom would need it as a zone or season flag, and the drop side must be tuned with it.
- The donor's buy price is recomputed server-side in the command (store.c 1695), but the UI uses the same function for di
checker: -

### ax-grymyr-l2dn-server (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET008/out/economy-trade/ax-grymyr-l2dn-server.deep.md
best_idea: List a stack with a fee charged up front that is never refunded, then move each listing through timed states on a fixed server timer, so every sink is a rule with a visible deadline.
decision: adapt - Adopt the fee-up-front, timed-state and server-checked listing shape in one ledger; adapt the currency pair and the fee unit, since the donor mixes two currencies and a fee unit that looks wrong.
acceptance: Server test: list 5 stacks at a fee fraction r; the fee is charged once and not refunded on cancel; a buy with too little currency is refused with no change to either wallet; a paid claim credits price minus min(price x tax, cap); an unclaimed sale is removed after the pay window on a fake clock.
tags: new:listing-fee-up-front,new:timed-listing-states,new:sink-by-expiry,new:server-timer-tick,clamp-and-report,new:two-currency-market
gaps/risks(excerpt): - The fee unit (AdenaFee 100.0 read as a multiplier, comment says 100%): do not copy the number. Frankendom sets the listing fee as an explicit fraction and tests the default.
- Price per unit or per lot: the donor's name and its math disagree (fee x amount, price charged once). Frankendom must pick one meaning and test a stack of 5.
- Buy is not transactional: LCoin is destroyed (676) before the item is added (686), and the donor's own TODO (689) says so. If the add fails, the buyer has paid and holds nothing. Frankendom must run the check, the debit and the item grant as one server transaction that rolls back.
- Registration can return after detaching the stack (347, 355) without putting i
checker: -

### azerothcore-azerothcore-wotlk (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET008/out/economy-trade/azerothcore-azerothcore-wotlk.deep.md
best_idea: Hold each open bid in the auction record itself, refund the outbid bidder and settle the sale inside one server transaction, with the deposit and the cut as explicit sinks.
decision: adapt - Adopt the escrow-in-the-record, one-transaction and minimum-raise rules; adapt the deposit to a plain fraction of catalogue value times listing time, because the donor's formula is hard to explain and its house rates are data we have not read.
acceptance: Server test: a 12-hour stack of 2 at vendor value V charges max(floor, rate x fraction x V x 2); a bid below top bid plus max(5 percent, 1 copper) is refused; an outbid bidder's gold returns in the same transaction; an unsold listing returns the item and not the deposit; a sold listing pays bid + deposit - cut.
tags: clamp-and-report,new:listing-deposit,new:escrow-in-record,new:sale-cut,new:expiry-sink,new:minimum-raise
gaps/risks(excerpt): 
checker: -

### beyond-all-reason-Beyond-All-Reason (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET009/out/economy-trade/beyond-all-reason-Beyond-All-Reason.deep.md
best_idea: A player-to-player transfer debits the sender gross, credits the receiver net after a sink tax, caps the credit by the receiver's remaining room, and counts the difference as burned, so every coin is accounted for.
decision: adapt - The gross/net/burn split is a clean currency sink for player trade and fits one server ledger; the overflow pass mints credit with no debit and the transfer has no sender-balance check, so only the transfer shape is taken.
acceptance: A server test asserts that a 100 transfer at tax 0.3 with room gives the receiver +70, the sender -100 and 30 burned, that a full receiver gets +50 with the sender paying 71.43 and 21.43 burned, and that the total of all balances plus burned is unchanged in every case.
tags: clamp-and-report,new:sink-tax-transfer
gaps/risks(excerpt): - Licence: GPL. Clean-room only. The sketch was written from the described mechanism and not from the donor's lines.
- One ledger, the overflow pass: the second pass (237-238) credits allies with no debit, and the donor's own comment says so (236). That breaks Frankendom's one-ledger rule. Reject that part. If Frankendom ever wants overflow sharing, it must name a source account that pays for it.
- Stale stock: the overflow pass reads the team's stock once (106-109). The first pass caps credits by that variable (165) and then spends part of the stock (178-182), without refreshing the variable. The second pass caps credits by the same variable again (224). Nothing in the donor refreshes it. A
checker: -

### clockworklabs-SpacetimeDB (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET009/out/economy-trade/clockworklabs-SpacetimeDB.deep.md
best_idea: A zero-sum transfer that checks every rule first (funds, self, zero, overflow), then writes both balances and two audit rows, so a refused call changes nothing and every change can be read back per account.
decision: adapt - Take the two-row audit ledger and check-all-then-write order (the one-ledger shape we want); add a request id for retries from the benchmark answer and make the starting grant a capped data field, not an open grant per new identity.
acceptance: A server test: alice (100.00) pays bob 40.00 under request r1, leaving alice 60.00 and bob 40.00 with one Debit and one Credit row; the same r1 again changes nothing; a 1000.00 payment is refused and writes no rows; a self-payment is refused.
tags: new:zero-sum-transfer,new:audit-row-pair,new:faucet-on-connect
gaps/risks(excerpt): - Licence: BSL 1.1, restricted. Shape only, clean-room. The sketch was written from the mechanism and is not a translation.
- No retry guard: a repeated call (double click, lost reply, reconnect) pays twice. The module has no request id. The benchmark answer (t_055, `answers/typescript.ts` 19) shows the fix. That answer is not the product module, so it is a design reference only.
- No sink and no inflation control: the transfer is zero-sum, and the only money source is the starting grant on connection (44-51), which has no cap on how many identities get it. Frankendom needs a capped grant or a sink (a tax or a fee), set as zone data or an engine constant.
- Sender check: this module checks t
checker: -

### coding-horror-basic-computer-games (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET009/out/economy-trade/coding-horror-basic-computer-games.deep.md
best_idea: A market is data on the zone (cost, one price band per good, one d10 route table), and one trip function pays the cost first, rolls each price on arrival, rolls the route once, and settles the sale as exact count times price.
decision: adapt - The market-as-data shape (per-zone price bands, cost paid up front, one route roll with a table) fits zones as data; the year cycle, the BASIC rounding idiom and the Java fall-through and missing savings check must not be copied.
acceptance: A server test: a merchant zone with a band of 85-115 cents for a unit rolls one price on arrival in that band; selling 20 units pays exactly 20 times that price; a route roll of 1-2 takes the stock named in the zone data; a trip whose cost exceeds savings is refused and changes nothing.
tags: new:zone-market-table,new:route-roll-table,new:pay-before-trade
gaps/risks(excerpt): - The donor keeps money as one number (`savings`, Java line 47). Frankendom's rule is one ledger. Every cost and sale must be a ledger entry with a reason, and the savings figure must be derived from the entries.
- No refusal when savings cannot cover the cost (BASIC 1160, 1198, 1250; Java 263, 275, 320). Savings can go negative and the game goes on (Java never reads savings in a condition: 72, 190, 263, 275, 320). Frankendom must refuse a trip the player cannot pay for.
- Java only, the YES path falls through into the sale: `confirmFort` returns true for YES (Java 253), and then the `if (!confirmFort(answer)) { ... break; }` block (151-173) is skipped, with no `break` after it, so the case 
checker: -

### crawl-crawl (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET010/out/economy-trade/crawl-crawl.deep.md
best_idea: Price = catalogue value x a per-vendor markup set once at zone build (a depth term plus an identify term), with a per-unit diminishing curve, and the server checks the whole cart against one gold integer before any deduction.
decision: adapt - Take the value-times-markup price and the whole-cart check as server logic with the markup as zone data, but make the voucher a ledger entry (one ledger) and the curve an integer table so client and server agree.
acceptance: Server test at a zone vendor with markup 20 (identifying): one consumable of base 500 costs 1166 gold, a stack of three costs 3500, and a cart whose total exceeds the player's gold is refused with no item moved and no gold changed.
tags: new:vendor-markup,new:stepdown-soft-cap,new:cart-all-or-nothing,new:voucher-credit,new:identify-markup
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- One ledger: the donor keeps gold as one integer, but it also keeps a second counter for vouchers (`ATTR_VOUCHER`, 935). Frankendom's ruling is one ledger, so a voucher must be a ledger entry, not a second counter.
- Server verification: the donor prices in the menu once (1074) and trusts that price, and it only guards a stale price with a skip (1350-1352). Frankendom must re-price on the server at purchase time and return the server price to the client. The donor's skip is silent and has no message, so the server should reject a stale cart and say so.
- All-or-nothing: the donor's up-front check 
checker: -

### daggerfall-unity (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET010/out/economy-trade/daggerfall-unity.deep.md
best_idea: Price a trade as the list cost times a fixed-point mix of the player's skill and charisma, and drift each zone's price index by a small daily step with a chance that pulls it back toward neutral.
decision: adapt - Take the list-cost formula, the skill-and-charisma trade mix and the daily mean-reverting index as server functions with zone data; reject the letters of credit and the per-region bank accounts as a second ledger.
acceptance: Server test: at a zone with index 1000 and shop quality 10, a buyer with mercantile 50 and personality 50 pays 112 for a list cost of 200, and a seeded run of 30 days keeps the index between 250 and 4000 and moves it only by the 49/50 and 51/50 steps.
tags: new:list-cost-quality-markup,new:fixed-point-trade-mix,new:mean-reverting-index,new:index-daily-step,new:letter-of-credit-second-ledger
gaps/risks(excerpt): - The donor runs the daily index and the prices on the client: `UpdateRegionalPrices` is called from `PlayerEntity` (446) and rolls with `UnityEngine.Random` through `Dice100` (Dice100.cs 22). Frankendom must run the daily step on the server with a seeded RNG, per zone, and send the index to the client. A client that rolls its own index can cheat the price.
- Second ledger: the donor has three money stores: gold pieces (weight-limited, 370), letters of credit (items carrying a value, 1038-1046, and a 1.01 commission, 192 and 395), and bank accounts per region (`DaggerfallBankManager`). Frankendom's ruling is one ledger, so reject the letters of credit and the per-region accounts. Keep one go
checker: -

### electronicarts-CnC_Remastered_Collection (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET011/out/economy-trade/electronicarts-CnC_Remastered_Collection.deep.md
best_idea: Pay a craft in installments from the one ledger, stall with no debt when short, and refund the paid part on cancel.
decision: adapt - The stall-and-retry and refund-to-spendable shape fits crafting cost; the two-pool storage-first rule does not (Frankendom has one ledger), and the schedule must run on the server tick with integer credits.
acceptance: Server test: a craft priced 1000 with 300 credits pays 9 per installment, never takes the ledger below 0, resumes when credits arrive, and cancelling returns exactly the paid part; paid + refund + unpaid = price at every tick.
tags: new:instalment-spend,wait-gate,timer-wheel,clamp-and-report
gaps/risks(excerpt): - Licence: GPL-3.0 with EA section 7 additional terms: no use of Electronic Arts or Command & Conquer trademarks, and no claim of affiliation. Clean-room only; no names, text or constants copied into Frankendom.
- Two pools: the donor spends harvested storage before cash and refunds to cash. Frankendom has one ledger, so the storage-first rule has no counterpart. Only the refund-to-spendable part transfers.
- Frame timing: the donor counts timer ticks inside the game's own AI call (driver not read). Frankendom must run the installment on the server tick with integer credits, and the client only shows the state.
- Silent stall: the stall path in `AI` sets the stage back and does nothing else 
checker: -

### endless-sky-endless-sky (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET011/out/economy-trade/endless-sky-endless-sky.deep.md
best_idea: Keep each item purchase day through a trade and price it on the server with one decay curve: full value, then a per-day decay, then a floor.
decision: adapt - The age-based resale curve and keeping the purchase day suit one ledger; the separate planet-stock record and oldest-first sale are rejected unless used vendor stock is wanted, because they create the buy-low sell-high spread.
acceptance: Server test: a 1000-cost piece bought 100 days old and resold the same day returns 764; at age 400 it is valued at 390; no value falls below 250; buy and sell use one function, so a mixed-age pair cannot be cycled for profit.
tags: new:age-decay-floor,new:record-transfer,clamp-and-report
gaps/risks(excerpt): - Licence: GPL-3.0-or-later. Clean-room only: the sketch is written from the described mechanism. The constants are the donor's default tuning and are re-tuned in Frankendom as data, not copied as text.
- The spread (gap found by reading both sides): the stock sells its oldest bin at the lowest price (`stock` walks from the oldest, Depreciation.cpp 327), and the player's fleet sells its newest bin at the highest price (327, `--record.end()`). Buying from one side and selling to the other can therefore pay 390 for an old piece and receive 991 for a new one (sketch run, both numbers at cost 1000). The donor allows this; it was not played or run as a repeated loop. Frankendom must either price 
checker: -

### evennia-evennia (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET011/out/economy-trade/evennia-evennia.deep.md
best_idea: Price a shop as base value x a per-shop markup on buy and base value x a per-shop buy-back rate on sell, truncate the sell value and refuse zero-value items.
decision: adapt - Two per-shop rates and a server-side coin and slot check fit Frankendom's one ledger; the donor's move-sold-items-into-the-shop path and its unrecorded shop takings are rejected because they contradict the donor's own docstring and break the one ledger.
acceptance: Server test: a base-value 40 item bought with 39 coins is refused by the server; bought with 100 it costs 40 (player at 60); sold back it returns 20, is removed from the player, is not on the shop buy list, and the 20-coin difference is recorded as a sink.
tags: new:shop-markup-buyback,new:server-recheck-trade,new:sell-zero-refused
gaps/risks(excerpt): - Licence: BSD-3-Clause. Code may be adapted; the sketch is clean-room from the mechanism anyway, and the attribution must stay with the copyright notice if any code is copied.
- Buy list build is broken as written: `shops.py` 244 calls `BuyItem.create_from_obj(obj)` with one argument, but the signature at 81 takes `(obj, shopkeeper)`; line 246 calls `BuyItem.create_from_prototype(prototype)`, but the signature at 126 is `(self, prototype_or_key, shopkeeper)` under `@staticmethod` (125). Both calls fail on read, so the buy list cannot be built as written (not run).
- Sell path raises before paying: `_sell_ware` line 421 sets `obj = caller.equipment.remove(item)`, but `remove` returns a list 
checker: -

### exult-exult (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET012/out/economy-trade/exult-exult.deep.md
best_idea: Count every eligible holder first, refuse with nothing removed when short, then drain in a fixed order, with count and drain sharing one predicate.
decision: adapt - Frankendom needs one debit path for shop buys and craft costs; keep the check-then-drain shape with one predicate and one server transaction, and drop the party-of-NPCs part because Frankendom has one character.
acceptance: A craft costing 5 coins with 4 held is refused with the balance unchanged; with 5 spread over two holders the balance drops by exactly 5 in one call; a locked-shape holder is either counted and drained, or not counted, never counted and left unpaid.
tags: clamp-and-report,named-source-stack,new:all-or-nothing-debit,new:count-debit-predicate
gaps/risks(excerpt): - The donor's count and debit use different predicates (contain.cc 578 against 348 and 59-63). The debit can pay less than the count reported, and the caller is told it succeeded. Frankendom must use one predicate, with a test that the countable amount equals the drainable amount when a locked holder is present.
- The donor has no transaction: this function shows no locking or transaction, and its calls come from script code. Frankendom's server must do the check and the debit as one transaction, or two concurrent buys can both pass the check. The storage layer was not read.
- A zero-cost request returns false in the donor (1206). Our sketch returns true. Decide it and test it, so a free cra
checker: -

### flareteam-flare-engine (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET012/out/economy-trade/flareteam-flare-engine.deep.md
best_idea: Price every vendor trade from three data fields (buy ratio, sell ratio, old-sell ratio per vendor), keep a fresh-sale flag on buyback stock, and settle a purchase only after the bag has room.
decision: adapt - The three-price shape and buyback flag suit zone vendors; compute prices on the server (the donor reads the open window at ItemManager.cpp 1801), charge only after placement, and apply the buy ratio once.
acceptance: A vendor with buy ratio 1.5 sells a 100-coin item for exactly 150 (not 225); a sale pays 37 and the buyback shows 37; a buy with a full bag is refused with coins unchanged; after a reload with an old ratio set the buyback price follows it and the fresh flag clears.
tags: new:vendor-spread,new:buyback-reprice,new:settle-before-deliver,new:ratio-override-per-npc
gaps/risks(excerpt): - Double application (read, not run): `getPrice` multiplies by the global buy ratio unconditionally (ItemManager.cpp 1799), then again by the NPC or global buy ratio on the buy path (1805-1807). With the global buy ratio at 1.5 and no NPC override, a base of 100 costs 225 in the code, against 150 by the docs (EngineSettings.cpp 1067, "Global multiplier for item prices on the 'Buy' tab"; NPC.cpp 296, "Uses the global setting when set to 0."). Default 1.0 hides it. Frankendom must apply each ratio once and test the number.
- The buy and sell price depend on the open window: `vendor_npc` is NULL unless the vendor window is visible (ItemManager.cpp 1801, and again 1815). A price read while the w
checker: -

### flareteam-flare-game (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET012/out/economy-trade/flareteam-flare-game.deep.md
best_idea: Make a vendor's stock a fixed list plus a band table rolled a range of times per visit, where each roll picks at most one entry by the tightest band edge that beats it, with a per-visit cap per item.
decision: adapt - The band table is a clean data shape for scarce stock that fits zones as data; roll on the server with a seeded RNG, use the order-independent candidate rule, show each band weight to the designer, and make restock a server policy, not a re-roll on every entry.
acceptance: Entering the trader zone 10,000 times with edges 100/75/50/25 gives each band within 2% of 25% of picks; a rare item capped at 2 per visit never appears a third time; leaving and re-entering within the restock timer does not refill rare stock.
tags: loot-cumulative-roll,drop-filter,new:band-weight-table,new:per-visit-restock,new:max-drops-per-visit
gaps/risks(excerpt): - Order quirk (traced by hand, not run): the push test at LootManager.cpp 373 compares the roll with the threshold, not the entry's own edge. With edges listed as 50 then 80 and a roll of 30, both are pushed, so the 80 entry is a candidate; listed as 80 then 50, only the 50 entry is pushed. The result depends on table order. All six shipped trader tables list edges in descending order (checked by script: no rises), where the intended result holds, so this is latent. Frankendom must sort the table or use the order-independent rule in the sketch, and test it.
- Re-roll on entry: the donor rebuilds a vendor's stock each time its map is built, with no saved state in this code path (handleNewMap,
checker: -

### freeciv-freeciv (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET013/out/economy-trade/freeciv-freeciv.deep.md
best_idea: Price a finish-now purchase as gold per missing unit, with a premium when nothing has been started, recomputed on the server from server state, and debited from the one ledger before the item completes.
decision: adapt - Frankendom needs a finish-now sink for crafting and timers, and the shape (linear per missing unit, double at zero progress, percent modifiers as data, server recomputes) fits one ledger. Adapt because the turn-based once-per-turn gate does not fit real-time fights, and the quadratic unit term needs a playtest number before it is adopted.
acceptance: A server test asserts that a 40-unit craft job with 0 progress quotes 160 gold, the same job at 20 progress quotes 40 gold, a second finish in the same period is refused, and the ledger balance changes once by the quoted amount.
tags: new:rush-buy-price,new:zero-stock-premium,new:one-buy-per-period,new:server-recomputed-price
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor.
- Freeciv's gate is a game-turn flag (`did_buy`, cleared at the turn update). Frankendom's fights are real-time, so the gate has to be a time period in seconds or ticks, held as a data field. Do not copy the turn rule.
- There is no inflation control in this code. The price is a fixed sink with no supply side. Frankendom's inflation control must come from elsewhere; this note gives no answer to it.
- The unit quadratic term is a design choice in the donor (faster-than-linear top-ups). For a crafting finish, it can make late top-ups very expensive; decide with a playtest number, not b
checker: -

### freeorion-freeorion (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET013/out/economy-trade/freeorion-freeorion.deep.md
best_idea: A craft can absorb at most its cost divided by its minimum craft time per tick, with overshoot carried into the next copy, and the server alone decides completion.
decision: adapt - The per-tick cap and the carry give a crafting-time shape the one-ledger ruling allows, expressed in ticks with per-item data. Adapt, and reject the bank as a second pool, because the one-ledger ruling forbids a parallel balance; a buffer, if wanted, becomes a row in the one ledger.
acceptance: A server test asserts that a 60-cost craft with minimum time 5 takes 12 per tick, finishes on tick 5 with 60 debited in total, and that a two-copy order with 10 percent frontload finishes its first copy on tick 5 and carries 1.49 into the second copy.
tags: new:rate-capped-spend,debt-carry,new:server-only-completion,new:consume-on-complete,new:bank-with-withdraw-cap
gaps/risks(excerpt): - GPL v2 (not "or later"): clean-room only. The sketch is written from the mechanism.
- One ledger: the donor's bank is a second pool beside the queue (the "industry stockpile" is set from the queue's expected amount at Empire.cpp 2881). Frankendom's ruling is one ledger, so the bank cannot be copied as a parallel balance. The cap and carry do not need it.
- Turns: the donor counts minimum build time in turns (`build_turns`, 101). Frankendom's fights run in real time, so the minimum must be in ticks or seconds, held as data. Do not copy the turn unit.
- Progress is written before the gates: Empire.cpp 2507 adds progress before the location check (2550), the progress gate (2557) and the consu
checker: -

### gawric-Unity-Client-for-L2J (permissive, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/ET013/out/economy-trade/gawric-Unity-Client-for-L2J.deep.md
best_idea: A trade or duel invite lives for a fixed server-side window, the client shows the time left as a draining bar, and running out of time counts as a decline.
decision: adapt - The expiring invite is a small, real handshake that fits engage-as-state-change and the server-verified rule once the server owns the expiry; the donor's client-only countdown is not an authority and must not be copied as one.
acceptance: A server test opens an invite at t=0, accepts at t=19.9 s (accepted), refuses an accept at t=20.1 s as expired with the trade not opened, and the client bar reaches empty at 20 s.
tags: wait-gate,new:expiring-invite,new:client-drain-display
gaps/risks(excerpt): - Apache-2.0: code may be adapted, but the value here is the shape only.
- The 20 s is a client default. The server sends no expiry in the invite packet (SendTradeRequestDto is read for the sender id only, TradeRequestWindow.cs 49). If the server's window differs, the bar lies. Frankendom must send the expiry in the packet and make the bar read it.
- Race: the client's bar and the server's expiry run on two clocks. An accept clicked while the client's bar still shows time can reach the server after the server has expired the invite (latency). The donor has no handling for this; it sends whatever the button gives. The client itself cannot send accept after its own timeout, since OnTimeout sen
checker: -

### gemrb-gemrb (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET014/out/economy-trade/gemrb-gemrb.deep.md
best_idea: One pure price function driven by per-shop data (markup, depreciation, flags) and the buyer's modifiers, that the server uses to quote and settle, with gold moved only after the item move succeeds.
decision: adapt - Shape fits a shop in a zone (markup and depreciation as shop data, one quote function, pay on success); the donor's client-side gold moves and its second engine price path violate one-ledger, server-verified.
acceptance: Server test: a 50 gp item sold by a shop with SellMarkup 120 and no modifiers quotes 60 and debits exactly 60 on the server ledger; a sale whose item move fails credits 0; the client shop label equals the server quote for the same inputs.
tags: new:store-markup,new:stock-depreciation,new:price-floor,new:pay-on-success,new:one-quote-function
gaps/risks(excerpt): - The donor debits and credits party gold in the client UI (`GameSetPartyGold` at 1084 and 1131). Frankendom's one-ledger and server-verified rules forbid that: the server must quote and settle, and the client only displays the quote.
- Two prices in one engine: the exported `Slot['Price']` (7707) and the UI's `GetRealPrice` disagree (no charisma, reputation, Mercantile or depreciation in the export). Frankendom must allow only one quote function.
- Unchecked sell credit (1129-1131): the donor credits gold even when a move fails. The acceptance test above guards this; do not copy the donor's order.
- Stock depreciation is shared state: the count is per shop, so in a multiplayer zone it must 
checker: -

### hedgewars-hw (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET014/out/economy-trade/hedgewars-hw.deep.md
best_idea: One per-team energy number, the only currency, fed by per-round income and by owned producers that tick up a point, capped at a maximum, and spent only when an item is actually placed.
decision: adapt - Keep the faucet, cap and per-turn quota shapes; the donor caches the cost in a client-side global and lets the placement pay a stale value, so Frankendom's server must recompute the cost and be the only writer of energy.
acceptance: Server test: a clan at 990 energy with income 50 starts its next turn at 1000; a generator tick at the cap is lost; a sixth crate in one turn is refused with no change to energy; a placement that fails for a missing spot spends nothing.
tags: new:faucet-generator,new:per-round-income,new:cap-wasted-tick,new:turn-quota,new:pay-on-success,stale-state
gaps/risks(excerpt): - The donor charges `placedExpense`, a global set by `updateCost` on selection changes (1468-1471, 1196-1216), not a cost recomputed at placement (`PlaceObject` reads it at 1037 and 1090). Correctness depends on every selection change calling the cost update. Not checked exhaustively. Frankendom's server must recompute the cost from the item at purchase time and never trust a cached quote.
- The energy is a number the whole clan shares, so in a multiplayer zone it must be server state. The donor's lockstep model (every client runs the script, inferred from `IsHogLocal`) is not Frankendom's model: the server must be the only writer.
- At the cap, a generator tick is lost (942 before 945). Tha
checker: -

### ihhub-fheroes2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET014/out/economy-trade/ihhub-fheroes2.deep.md
best_idea: A barter rate read from a per-pair table, indexed by the owner's count of a building (nine tiers, clamped), with the quantity bounded by source funds and both sides committed together.
decision: adapt - The tiered category-pair table is data-driven and shared by player and AI, which fits one engine; the donor's local unchecked commit (subtract, then clamp to zero) must not be copied, so the server quotes and settles and refuses a short trade.
acceptance: Server test: with 3 marketplaces, selling 10 ore for gold credits exactly 500 gold and debits 10 ore; a trade of 5 wood with 4 held is refused with no change to either side; the trade window rate text equals the server quote; with 0 marketplaces no trade is offered.
tags: new:category-rate-table,new:tier-by-building-count,new:bounded-quantity,new:two-sided-commit,clamp-and-report
gaps/risks(excerpt): - The commit is local and unchecked: `OddFundsResource` (`kingdom.cpp` 451-452) subtracts, then `Trim` (`resource.cpp` 520-523) clamps to zero. A short source is never refused in the donor; it is only prevented by the slider bound in the UI. Frankendom's server must refuse it.
- Silent clamp: because `Trim` hides a shortfall, a bug in the bound would create resources without error. Frankendom should fail the transaction and report it, not clamp.
- The rate by building count is a tier, not a continuous curve: nine steps and a clamp at nine. Frankendom must decide whether tier counts above nine are useful; the donor throws the extra away.
- Integer division loses the remainder on a trade to a 
checker: -

### keldaanCommunity-pokemonAutoChess (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET015/out/economy-trade/keldaanCommunity-pokemonAutoChess.deep.md
best_idea: Keep one gold value per player that every buy, sell, reroll and round award goes through, return sold copies to a finite pool and draw them out on shop, and cap interest and streak income with plain min() caps.
decision: adapt - Frankendom needs one ledger and server-verified buys, and this shows the arithmetic and pool conservation, but the shop-round cadence and the per-rarity star price table do not fit fast duels or zones as data; take the shape, not the table.
acceptance: A server test: at round end a player with 23 gold and streak 7 gets 12 (interest 2 + streak 5 + flat 5), a bot gets 0, and selling a 3-star unit returns 9 copies to the pool, with every change made through the one ledger function.
tags: new:single-ledger,new:copy-pool-return,new:interest-cap,clamp-and-report
gaps/risks(excerpt): - One ledger is not enforced by the donor. Money changes in five commands through `addMoney` or directly, and also outside them: town item sales write `player.money += ItemSellPricesAtTown[item]` directly (game-commands 2076), which skips `addMoney`'s evolution trigger and ghost-opponent check. The scribble payout also writes money directly (scribbles.ts 95), and sets it to 1 for a shiny egg (85). Frankendom must route every credit and debit through one function, and test that none writes the field directly.
- Interest cap can go negative. `maxInterest = 5 + gimmighoul - amulet` (1432). With enough amulet coins the cap is below 0, so `Math.min(maxInterest, ...)` is negative and the round wou
checker: -

### l1j-en-classic (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET015/out/economy-trade/l1j-en-classic.deep.md
best_idea: Show the shop price with tax on top, charge the buyer one debit for price plus tax, and route the tax to a zone-owned public pool in the same server transaction, with the owner's rate bounded by the server.
decision: adapt - Frankendom's zones are data, so a per-zone tax rate with server bounds and a public-pool credit fits; the castle politics (national and Diad shares, the daily rate listener, the war tax) do not fit a fast browser game, so take the price-plus-tax shape and drop the factions.
acceptance: A server test: 3 units at base 100 in a zone with a 10 percent tax are one debit of 330, the zone pool is credited 30 in the same write, and a rate set outside the allowed range is refused.
tags: new:tax-split,new:public-pool-credit,new:cap-skip-not-clamp
gaps/risks(excerpt): - Payout happens after the charge with no single transaction. The buyer is charged the tax (`consumeItem` 245), then `payCastleTax` may skip the credit at the 2000000000 cap (178). The tax then disappears. Frankendom's one ledger must make the debit and the credit one write, and must clamp and report the cap, not skip it.
- Town books use the template price, not the rated price. `TownTable.addSalesMoney` reads `item.getItem().getPrice()` (117, 120, 121), while the buyer is charged on `price x RateShopSellingPrice` (`L1ShopBuyOrderList.java` 55; tax 84-85 and 121-122). With a rate other than 1.0 the town's books and the buyer's charge disagree. This is read from code, not run.
- Town tax is s
checker: -

### levy-street-world-of-claudecraft (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET015/out/economy-trade/levy-street-world-of-claudecraft.deep.md
best_idea: One eligibility function for trade, checked in a fixed order with one refusal reason per copy, where the server re-runs it and an unknown item category is refused by default.
decision: adapt - Frankendom's player trade and auction need one rule that says why a copy cannot be traded (quest, bound, locked), and the closed default and the precedence chain fit; the token exchange, bond and settlement do not, and neither does the store-catalogue exclusion.
acceptance: A server test: a quest item, a bound copy, a bind-on-trade copy, a soulbound sword and a player-locked item each refuse with their own reason; an unknown kind is refused as not eligible; a common sword is refused below the epic floor while an epic sword lists; a common mount lists.
tags: new:precedence-reason,new:closed-default-category,new:category-floor,clamp-and-report
gaps/risks(excerpt): - The donor's policy is a product decision, not a constant: the restricted policy turns the equipment floor on at epic and both collectible arms on (woc_market_rules.ts 551-562 comment). Frankendom should keep the floor and the flags as catalogue or zone fields, and set the first values by ruling, not by copying epic.
- The reason order is load-bearing. The donor says the order is so that the strongest fact is reported (exchange_eligibility.ts 161-165, 174-177). A test must pin the order, or the player is told a weaker reason.
- The donor keeps an armed copy refused on the directed rail for escrow reasons (exchange_eligibility.ts 117-127). Frankendom has no escrow, so the escrow argument doe
checker: -

### lincity-ng-lincity-ng (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET016/out/economy-trade/lincity-ng-lincity-ng.deep.md
best_idea: Move stock between linked shops toward one shared fill ratio, cap each transfer at a fraction of the sender's capacity, and write every move as one debit plus one credit, so surplus and shortage spread without creating or losing goods.
decision: adapt - Keep the conserved pair transfer and the per-tick cap as the shape for a regional stock flow between zone shops; reject the logistics layer (trucks, traffic, fire, pollution) and reject any mapping of fill ratio to a player price, since stock flow is not a currency.
acceptance: A server test runs 1000 day ticks over one hub and three linked shops and asserts each good's total is unchanged, no count goes negative, and no non-evacuating transfer exceeds hub max / 8.
tags: new:fill-ratio-equalise,new:conserved-transfer,clamp-and-report,wait-gate,timer-wheel,drop-filter,new:overflow-sink,new:consumption-tax-tally
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch follows the order of steps, not the lines.
- One ledger: the donor conserves each pair but has no global check. Frankendom needs a server assertion over all shops of a good, not only per pair.
- No currency: nothing here is a price. The only money counter is `world.taxable` (market.cpp:163). Do not map fill ratio to a price; a price is a separate design.
- The donor does not clamp the receiver to its own maximum on an inflow (lintypes.cpp 796-802 cap only the sender's rate and stock). The target keeps the receiver at or under its maximum only while every participant is at or under 100 percent (lintypes.cpp 701, 789). Frankendom must clamp the r
checker: -

### miki151-keeperrl (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET016/out/economy-trade/miki151-keeperrl.deep.md
best_idea: A crafting queue that books the cost as debt when an item is queued, pays when the stock covers it, refunds only a paid item that has made no progress, and gives each work tick to the first ready item in queue order.
decision: adapt - Keep the queued, paid, in-progress and done states and the refund-before-progress rule for a server-side craft queue, but make the queued cost a real hold in the one ledger; the donor debt is only a claim that other spenders ignore, and its separate debt tables are a second ledger we reject.
acceptance: A server test with 10 gold in stock queues a 10-gold craft, asserts a separate 10-gold spend is refused while queued, asserts unqueue before progress returns exactly 10 gold, and asserts unqueue after progress returns 0.
tags: debt-carry,wait-gate,new:reserve-then-pay,new:refund-before-progress,new:first-ready-takes-work
gaps/risks(excerpt): - The debt is not a hold. `hasResource` compares raw stock and ignores debt (collective.cpp:1013-1015). The callers in the grep all use it that way: construction (collective.cpp:1336-1340), immigration (immigration.cpp:152-158, 256-260) and ransom (player_control.cpp:3798-3802). So a construction or an immigrant can take the stock an unpaid craft was waiting for. Frankendom must make the hold a real ledger row.
- Not first in, first out. `updateState` pays any affordable unpaid item in queue order without stopping at the first one it cannot afford (workshops.cpp:53-60). A cheap later craft can overtake an expensive earlier one. Frankendom must choose the fairness rule.
- Progress is not refu
checker: -

### openmw (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET016/out/economy-trade/openmw.deep.md
best_idea: One offer formula for every vendor service, built from one difference between player and seller sides, giving a buy price and a sell price that cannot make a buy-then-sell round trip profitable once a 75 percent window cap is built in.
decision: adapt - Keep one server-side offer function for all shop services with the buy and sell terms from one difference, the 1-gold minimum and the 75 percent cap inside the function; reject the fatigue and luck terms, since tiredness or a rolled attribute would need new recorded state, and keep standing only as a zone-data term.
acceptance: A server test over every zone shop item asserts buy price at least 75 percent of base, sell price at most 75 percent of base, no gold gained by a buy-then-sell round trip at the same standing, and no offer below 1 gold.
tags: new:buy-sell-spread,new:arbitrage-cap,new:one-price-function,new:standing-price-term,clamp-and-report
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch follows the order of steps, not the lines.
- The donor's price is computed on the client. The mechanics manager runs inside the single-player engine, so nothing checks the offer. Frankendom must compute and check the offer on the server.
- The 75 percent cap is applied only in the trade window (tradewindow.cpp 615-638). The other services call `getBarterOffer` directly (for example travelwindow.cpp:83), so a buy-then-sell loop through a different service can bypass it. Frankendom must put the cap inside the one function.
- The fatigue and luck terms make a price depend on state that the server would have to store and check (fatigue is a live stat; luck 
checker: -

### opentibiabr-otclient (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET017/out/economy-trade/opentibiabr-otclient.deep.md
best_idea: One shared pure fee function (rate of gross, floor, cap, all as zone data) computes both the server debit and the client preview, so the two cannot drift.
decision: adapt - Frankendom needs a fee sink on a player market under one ledger: keep the shape (listing fee at creation, buy pays gross plus fee, sell pays fee only) but compute it in one shared function. Reject the donor's duplicated client copy: it already disagrees with the server (2 percent vs 1 percent, round up vs round down, cap 1,000,000 vs 100,000).
acceptance: A server test lists 10 units at 10,000 gold and asserts the buyer is debited 101,000 (100,000 gross plus a 1,000 fee), and the client preview for the same inputs shows 1,000 because both call the same listingFee.
tags: new:listing-fee,new:mirrored-formula,clamp-and-report
gaps/risks(excerpt): - The donor already has the failure we must avoid. The client and the server each compute the fee, and they disagree: rate 2 percent versus 1 percent, round up versus round down, cap 1,000,000 versus 100,000. A player is shown one fee and charged another. Frankendom must have one function, and the client calls it for previews only.
- The client's affordability check (`getTotalMoney() < totalCost`, 1845) is a UX check. The server does its own check (game.cpp 5293, `totalPrice > (playerMoney + player->bankBalance)`). The server is the authority; the client check must never be the only one.
- The fee is not refunded on cancel (game.cpp 5328). Frankendom must decide whether listing fees are a si
checker: -

### otland-forgottenserver (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET017/out/economy-trade/otland-forgottenserver.deep.md
best_idea: An escrow listing lifecycle (debit on create, pay on accept, release exactly once on cancel or expiry, fees never returned) gives a player market one clear ledger, if the escrow is an explicit balance and the state changes before the money.
decision: adapt - The lifecycle and fee sink fit a player market under one ledger, but the donor keeps escrow implicit, loses item charges and upgrades on the sell path, and orders state and money differently per path. Frankendom keeps the lifecycle with an explicit escrow balance, instance items and one transaction per settlement.
acceptance: A server test starts with 6,000 gold in bank, lists 10 units of a gear item at 500 gold (listing total 5,050: 5,000 escrow plus 50 fee, bank left at 950); after the 30-day sweep the bank is 5,950, a second sweep pays nothing, and the returned or sold gear keeps its upgrade level.
tags: new:escrow-settle,new:listing-fee,new:periodic-expiry-sweep,new:cash-then-bank
gaps/risks(excerpt): - The donor's ledger is split. Gold lives in memory (`player->bankBalance`) and in coin items, while the listing rows are written to the database straight away (`createOffer`, `acceptOffer`, `deleteOffer`, `moveOfferToHistory`). A crash between the two can lose one side. The save path was not read, so the window is not measured. Frankendom must write escrow and state in one transaction.
- Escrow is implied, not stored. A buy's gold is in no account; it is the row's price x amount. Frankendom needs an explicit escrow balance (the sketch has one) so the sum of wallets, escrow and fees can be checked.
- Charges and upgrades are lost on the sell path. The row has no charges field (iomarket 250);
checker: -

### pmbstyle-L2Solo (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET017/out/economy-trade/pmbstyle-L2Solo.deep.md
best_idea: A seller lists no more units than funded demand can absorb, at a price that undercuts the cheapest rival by 2 percent but never below 60 percent of the reference, and surplus goes to a fixed NPC sink at half of base price.
decision: adapt - The listing gate (funded demand minus supply as the cap, undercut versus floor, NPC sink at half base) suits AI merchants and surplus-loot clearing under one currency. Reject the one-way learned multiplier (down 5 per unsold expiry, floor 50, never raised) and the per-seller seeded spread, since they make the price depend on history or character id.
acceptance: A server test with 6 funded units of demand and no supply lets a seller holding 10 units list exactly 6; with a rival ask of 90 and 5 units already listed, the same seller lists exactly 1 unit at no more than floor(90 x 0.98) = 88, and lists nothing when its 60 percent floor is above 88.
tags: new:funded-demand-cap,new:undercut-floor-gate,new:npc-sink-half-base,new:learned-multiplier-ratchet
gaps/risks(excerpt): - The learned multiplier only goes down. A listing that expires unsold drops the item's percent by 5, down to 50 (ColdMarketListingService.js 756). Nothing in the donor raises it, so a shortage never brings prices back. Frankendom must either add a recovery rule or choose the one-way discount on purpose.
- The floor is in two places. `MIN_LISTING_BASE_PERCENT = 60` is defined and exported (MarketListingPolicy.js 13, 244) but not used by the listing floor, which hard-codes `0.60` (BotMarketPricing.js 53). One number, two sources: Frankendom has one constant.
- The cap depends on the price. `unitPrice` comes from supply (79), demand is counted at that price (82), and the cap uses that count (1
checker: -

### pshenok-server-survival (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET018/out/economy-trade/pshenok-server-survival.deep.md
best_idea: One booking function for every money movement, with a sale that reverses the purchase line instead of adding income, and a percent-of-price sink with a time ramp as a data field.
decision: adapt - The ledger rule and percent-of-price repair fit our one-ledger and catalogue-field rulings; the client-side money counter and the per-frame drain on a browser clock do not, so the server must own the ledger and charge per tick.
acceptance: A server test runs 1000 random buy, upgrade, repair, sell, heal and charge operations and asserts balance = start + income - expenses at each step; a second test asserts that with upkeep off, paid auto-repair neither heals nor charges.
tags: variable-step,clamp-and-report,new:upkeep-ramp,new:paid-heal-toggle,new:ledger-booking,new:refund-reversal
gaps/risks(excerpt): - Client-only ledger. `STATE.money` is a number in the browser, and every movement is a hand-written pair of lines. Nothing in the donor enforces the pairing; the donor's own comment (topology.js:408-421) says a missed booking was a real bug. Frankendom must put the server ledger behind one function and reject any write that does not go through it.
- Heal without the upkeep flag. `processAutoRepair` checks only `STATE.autoRepairEnabled` and the mode (economy.js:346). The charge checks `STATE.upkeepEnabled` (game.js:1252). `toggleUpkeep` (game.js:1691-1692) has no mode check. So in survival, with upkeep switched off and auto-repair on, services heal and nothing is charged. The lines of tests/
checker: -

### rathena-rathena (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET018/out/economy-trade/rathena-rathena.deep.md
best_idea: Debit the bid first and credit it back on every refusal path, refund the outbid price and return the buyout excess through the same ledger, with the listing fee as a non-refunded sink.
decision: adapt - The escrow and fee shape fits the one-ledger ruling and gives a non-refunded listing sink for inflation control, but the session-dependent refunds and the mail-as-escrow channel do not fit server-verified play, so the refund must always be a ledger entry.
acceptance: A server test with two bidders and one seller asserts, after outbid, buyout, cancel-refused, a refused listing, and a restart with an overdue row, that the sum of all balances plus the fee sink equals the start total, and that each item is delivered exactly once, even when a party is offline.
tags: timer-wheel,clamp-and-report,new:escrow-debit-then-refund,new:outbid-refund,new:buyout-excess-return,new:listing-fee-sink
gaps/risks(excerpt): - Refunds depend on the session. The map drops the register refund if the seller is not on this map server (intif.cpp:2777-2778), and drops the bid refund if the bidder is not (intif.cpp:2917-2918). The char server does not mail the refund in those cases. In that case the zeny or item is lost, unless something not read repairs it. Frankendom's ledger must refund by ledger entry, never by session presence. The sketch does this.
- The char server trusts the map's debit. `mapif_parse_Auction_bid` does not check the bidder's zeny; it trusts the bid amount the map sends (int_auction.cpp:437-438, map debit at clif.cpp:17192). Frankendom's server is the only authority, so this trust does not transf
checker: -

### scummvm-scummvm (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET018/out/economy-trade/scummvm-scummvm.deep.md
best_idea: Reserve a purchase in a pending cart with a live balance preview, and commit the whole cart as one server transaction that re-checks the sum against the wallet, while abort gives the reserved credits back.
decision: adapt - The pending cart and single commit fit our one-ledger and catalogue rulings, but the client balance, the wallet-as-item and the trusted commit do not fit server-verified play, so the server must own the balance and re-check the cart total at commit.
acceptance: A server test buys three catalogue items, aborts, and asserts the wallet and the displayed balance are unchanged; a second test asserts that a commit whose total equals the balance is refused, and that a buy of a stack that would pass 99 is refused before any debit.
tags: new:pending-cart,new:balance-preview,new:cart-commit-once,new:abort-restores-reserve,clamp-and-report,new:stack-cap-before-debit
gaps/risks(excerpt): - Abort leaves a phantom balance. The cart reserves credits by lowering `_credits` (373), and abort clears the cart without giving them back (467-471). The wallet is not written on abort, so the saved balance is right, but the screen and the spendable balance stay low until the gump is reopened. Frankendom must derive the cart balance from the server ledger, not from a local counter.
- Commit trusts the client. `completePurchase` writes whatever `_credits` holds into the wallet (400) and creates the items (401-404), with no server check and no check of the total. Frankendom's server must check the total against the balance in the same transaction.
- The strict rule keeps a balance above zero
checker: -

### smogon-pokemon-showdown (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET019/out/economy-trade/smogon-pokemon-showdown.deep.md
best_idea: A timed sealed-price lot where each bid restarts the full window, the buyer's spendable amount excludes a reserve for mandatory costs still owed, and the balance is frozen until one close writes the sale.
decision: adapt - The single-lot timed bid and the reserve floor fit a server-side auction, but the chat-text bid channel and the in-memory balance must go, because we need structured commands and an append-only ledger.
acceptance: A player bids on a lot; each accepted bid restarts the lot timer to its full window; a bid above wallet minus reserve is refused with a message; at zero the item and the gold move in one server write, and one undo reverses both.
tags: timer-wheel,wait-gate,new:reserve-floor,new:frozen-balance,new:compensating-undo,new:serpentine-queue,new:sealed-bid-blind
gaps/risks(excerpt): - One ledger: the donor changes `Team.credits` in place (49, 689) and writes no rows. The undo is a hand-written reverse. Our sketch posts a row for every change, and the balance write and the item grant must be one server transaction.
- Server-verified: in open mode a bid is any chat line that parses as a number (638-644), handled by the chat layer, and the team is found by user id (596). Frankendom must take a structured bid command and check it on the server.
- One character, one ledger: a donor team's balance is shared by all its managers (`getManagers`, 40-44). Our wallet belongs to one character, so a shared pool needs its own rule.
- An unbid lot is sold to the nominator at `minBid` (
checker: -

### veloren-veloren (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET019/out/economy-trade/veloren-veloren.deep.md
best_idea: A shop's price rises when its stock falls below expected demand and eases back as stock refills (each step keeps 0.8 of the old value), and a short vendor splits what it has in proportion to what each buyer asked for.
decision: adapt - The scarcity curve and proportional rationing are small and checkable and fit shop pricing; reject the two-phase world-level trade, the workforce allocation through values, and the normalised share prices, because Frankendom needs absolute prices in gold.
acceptance: A vendor's price for a potion rises as players buy its stock out and eases back over the next few server ticks; when two players ask for more than the vendor has spare, each receives the same fraction of what they asked, and the gold and items move in one server write.
tags: new:scarcity-curve,new:smoothed-value,new:proportional-rationing,new:stock-decay-sink,new:two-price-notions
gaps/risks(excerpt): - One ledger: the settlement changes site stocks in place (652, 661, 687) and writes no rows. Frankendom must write one row per move, and the gold and item move must be one server write.
- The silent clamp: when a payment would take stock below zero, the donor logs "BUG" and clamps the payment (674-685) instead of refusing it. Frankendom must reject the overdraft, not clamp it.
- Stock counted twice: `supply` starts as the stocks (828) and the surplus adds them again (851), so the donor's surplus is production plus twice the stock, plus trade, minus demand. Read from the code, not run. Do not copy the double count; decide the surplus formula on purpose and test it.
- Buyer stock: `trade_at_s
checker: -

### widelands-widelands (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/ET019/out/economy-trade/widelands-widelands.deep.md
best_idea: A standing two-party trade that starts a batch only when both sides have their items reserved, and finishes a batch only when both sides have received it in full, so neither side can be charged for a batch the other never delivered.
decision: adapt - The launch and completion rules are a clean escrow pattern for player trade, but the walking carriers and the supply network do not fit, so Frankendom keeps the state machine and drops the transport.
acceptance: Two players agree a standing trade of 5 potions for 3 scrolls over 10 batches; a batch starts only when both have the goods reserved; when both sides have received, the batch counter reads 1 of 10 on both screens; cancelling refunds any reserved goods that have not started.
tags: new:two-party-escrow,new:batch-launch-gate,new:both-sides-completion,new:pause-fill-gate,new:batch-cap-constant
gaps/risks(excerpt): - Server-verified: the only guard on a proposal is the command handler (`cmd_propose_trade.cc` 64-79). `propose_trade` relies on an `assert` (1322), which a release build may not check. Frankendom must validate at the server entry point and never rely on an assert.
- Accept: `accept_trade` checks the state (1349) but not who is accepting. The recipient check is `check_trade_player_matches` (1291-1310), called from the other trade actions (1519, 1549, 1590, 1630). Whether the accept path calls it is in `cmd_trade_action.cc`, which was not read. Frankendom must check every trade action against the two parties on the server.
- Constant drift: `kMaxBatches` (`trade_agreement.h` 37) is never used
checker: -

### ModernUO (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/U004/out/economy-trade/ModernUO.deep.md
best_idea: Let a shop's stock ceiling grow when a line sells out and shrink when it sits mostly unsold, and refill it lazily the next time a buyer opens the list, with no timer.
decision: adapt - The demand-ceiling rule suits zone vendors and costs little, but the donor's numbers are engine rules and its restock state is transient, so Frankendom must keep stock in the one ledger, make the delay and base stock zone data, and write the rounding down as tested behaviour.
acceptance: A server test where a ceiling-40 line with 25 unsold refills to 20 and with 15 unsold stays 40, a sold-out 16 line refills to 32 after one hour, and a second open inside the hour changes nothing.
tags: new:demand-ceiling,wait-gate,clamp-and-report
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the described mechanism and the donor lines were not copied.
- Two gold sources: the donor takes gold from the backpack (`ConsumeTotal`, BaseVendor.cs 254) and from the bank above 2000 (264-266). Frankendom's one-ledger ruling means both must settle through one account, with stock and gold in one transaction.
- Transient state: after a load, restock amounts rebuild from the base table (BaseVendor.cs 1316-1318; `LoadSBInfo` 588 resets `LastRestock`). A restart resets every sold-out line. Frankendom must either persist the ceiling in the ledger or accept the reset, and write the choice as a test.
- Rounding and comment mismatch: the halvin
checker: No false claim found. Verified: OnRestock 105-137 exactly as described (sold-out x2 cap 999 at 107-109; 999+ -> 640 at 121-123; >20 halves at 125-127; drop only if m_Amount >= half at 130-133; refill 136), RestockDelay 1 h (BaseVendor.cs 130), lazy gate Core.Now - LastRestock > delay (866), Restock sets LastRestock before OnRestock (134-140), only callers VendorBuy 868 and Commands.cs 719, VendorBuy callers VendorAI 119/134 and BaseVendor 1432, ProcessSinglePurchase clamp/abort (1177-1198), orde

### ACEmulator-ACE (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V002/out/economy-trade/ACEmulator-ACE.deep.md
best_idea: Make a two-party exchange commit only when both sides accept the same offer: any change clears both acceptances, and the commit re-checks ownership and room before anything moves.
decision: adapt - Take the two-acceptance commit and the re-check at commit for any two-party exchange (duel wager, loot split, Pit stake); do not build a player trade window yet.
acceptance: A server test where A offers a sword, B accepts, A adds a potion (B's acceptance clears, nothing moves), both accept again and the sword and potion swap exactly once; if A's sword is dropped between the offers, the commit declines and neither item moves.
tags: stale-state,wait-gate,new:two-party-accept
gaps/risks(excerpt): - AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Frankendom has no player-to-player trade today. A full trade window is not needed to get the safety rule: any two-party exchange (a loot split, a duel wager, a Pit stake) should use the same commit rule: a change clears both acceptances, the commit re-checks ownership and room, and only then moves items.
- Ownership and room are checked at commit, not at offer time. The donor checks attunement and uniqueness at offer time (140, 154) and ownership and room at commit (379-380). Frankendom must enforce the same split, or an offered item can be spent by a fight between offer and commit. The sketch does this with `owned` at 
checker: (1) Note (Finalize steps 1 and 3, Close) and sketch clearAcceptance() say a busy or room failure only 'clears both acceptances'. Real ClearTradeAcceptance (Player_Trade.cs 188-194) also does ItemsInTradeWindow.Clear(), so both offer windows are emptied and players must re-add items; the sketch keeps offers. This is a behaviour difference in the very rule the note recommends porting. (2) Finalize remove loops (237-245, 247-255) silently skip an item whose TryRemove fails; no abort or rollback - n

### swgemu-Core3 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V005/out/economy-trade/swgemu-Core3.deep.md
best_idea: A hidden-maximum (proxy) bid where the leader pays only the rise above the challenger's maximum, with the takeover refund set to the leader's own recorded debit.
decision: reject - Frankendom's rulings have no market and the parity checklist has no row for one, so the mechanism has no slot yet; if a market or bid-for-drop feature is approved, adopt the proxy rule and the leaderPaid refund, not the donor's refund.
acceptance: If built: a lot at 100, leader max 500; challenger offers 150 with max 300, price becomes 350, leader debit 250 (total 350), challenger not debited; then a bidder offers 400 with max 600 and the old leader is refunded 350, not 400.
tags: new:proxy-bid,new:leader-debit-refund,new:listing-fee-multiplier
gaps/risks(excerpt): - AGPL-3.0 is copyleft: the sketch is written from the described mechanism, not translated.
- Suspected donor bug, a reading of the code order, not run: on takeover the prior leader is refunded `item->getPrice()`, which the code set to the new offer (1290) just before the refund (1305). The prior leader's own debits sum to the old price (case A debits the rise, 1241), so the refund looks like it exceeds what they paid by (new offer minus old price). Confirm with a test before relying on it. A grep of `src/tests` finds no reference to `doAuctionBid`, `AuctionManager` or `proxyBid`.
- Offline leader: the refund is inside `if (priorBidder != nullptr)` (1298-1305). If `PlayerManager::getPlayer` 
checker: Sketch header says it omits 'the bank check on the leader in the takeover path': the takeover check (1269-1270) is on the NEW bidder (player), and the sketch does include a bidder funds check; the leader's check (1244) is in the proxy path and is included. Mislabelled omission. Core claims verified: 1214, 1226, 1235, 1241 (fullPrice=proxyBid+increase-price), 1253, 1277, 1290, 1296, 1305 refund of new price (real overpay bug confirmed), offline-leader skip (1298), 1316-1321, doInstantBuy 1194/120

### AAEmu-AAEmu (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V008/out/economy-trade/AAEmu-AAEmu.deep.md
best_idea: A listing fee that scales with listing duration and a buy-now that ends the lot at once, both settled server-side by one ledger with the balance check the donor skips.
decision: adapt - The fee-by-duration and buy-now shape are plain server rules that fit one ledger, but the mail settlement, the missing balance check and the untaxed remainder must not be copied.
acceptance: Server test: a 12-hour lot with a 500,000-copper buyout charges 10,000 copper; a 1,000-copper bid from a 500-copper balance is rejected and the balance stays 500; a 15-copper sale credits 13 and the remaining 2 go to a named tax entry.
tags: new:listing-fee-by-tier,new:buy-now-ends-lot,new:expiry-sweep-settle,new:debit-without-check
gaps/risks(excerpt): - Balance check missing on the in-game money paths. `ChangeMoney(SlotType.Inventory, -fee)` (AuctionManager.cs:627), `SubtractMoney` for buy-now (155) and for a bid (181) all reach `ChangeMoney` with `SlotType.None` as the source (Character.cs:1503, 1555). The only balance check is inside the `typeFrom` switch (1508-1527), so it never runs for these calls. `Money` is `long` (Character.cs:107) and nothing clamps it, so, as read, a bid or listing can drive a balance below zero. Frankendom must check the balance on the server before any debit. Not tested.
- Start price is never checked on bids. `StartMoney` is stored (AuctionLot.cs:38) but `BidOnAuctionLot` only compares against `BidMoney` (Auc
checker: All checked claims hold: fee formula and 1,000,000 cap (29, 619-624) with (int) cast (627), post order (fee, item to AuctionAttachments, AddAuctionLot 619-635), buy-now branch 146-157, bid branch 158-187 (refund mail then record then SubtractMoney), strict > top bid, expiry query 287 and 5 s timer 388, 90 percent share rounded (38,46) with tax figure (int)(soldAmount-moneyAfterFee) only in mail text (MailForAuction 104-124), cancel with no refund (115-117), fail mail attaches only item (175-178)

### TrinityCore-TrinityCore (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V010/out/economy-trade/TrinityCore-TrinityCore.deep.md
best_idea: Any change to either offer clears both accepts and re-rolls only the changed side's index, and an accept must quote the partner's current index, so a stale offer can never complete.
decision: adapt - The stale-offer rule and the check-both-sides-then-move order are worth keeping; adapt the commit into one ledger transaction (the donor's two-phase move with rollback is not a model for us) and use a deterministic counter instead of a random index.
acceptance: A server test: A offers a sword, B offers 50 gold; A accepts; B raises the gold to 60, which clears A's accept; A's accept with the old index is rejected as state-changed; when both accept on current indices the swap commits in one transaction, and a full inventory on either side aborts the whole trade with no item lost or duplicated.
tags: stale-state,new:accept-reset-on-change,new:precheck-then-commit
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor's two saves share one transaction (TradeHandler.cpp 543-545), but the same region carries a comment that `SaveInventoryAndGoldToDB` has no transaction guard of its own and the saves are "desynchronized" with other saves. The item moves themselves run before the save, in memory. Frankendom's one-ledger rule needs the item move and the save to be one write; adapt, do not copy this order.
- The donor's rollback (`moveItems`, 171-182) is a second path that puts items back after they have been removed. The sketch avoids it by checking room first. Frankendom should keep only the precheck path
checker: (1) Step 1 says 'if the checks below fail, the accept is undone': false for the item checks. CanBeTraded failure (313-318, 339-344), IsBindedNotWith (320-326) and account-bank checks (328-334, 352-358) send a status and `return` WITHOUT SetAccepted(false), so my accept stays set. Only index mismatch (258), distance (266) and the gold checks (276, 286, 295, 304) unaccept. (2) Note says money checks are 'covered by each owner' but sketch omits the HasEnoughMoney check (271, 281) and distance check
