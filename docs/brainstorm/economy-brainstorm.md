# Economy and trade brainstorm (idea-mining lead) - v1

**NOTHING IS BUILT.** This file is a design brainstorm from the 61-note digest `/private/tmp/p2/brainstorm/economy-digest.md`. No code, no data file, no test and no server change exists. Every field name, number, formula and test below is a proposal. Nothing here has been run, except a few arithmetic checks (a hand calculator run) used for the worked examples; those are marked "calc".

What I read: all 61 digest entries (best_idea, decision, acceptance, tags, and the gap excerpts). The excerpts are cut at about 700 characters, so several gap lists end mid-sentence; where a defect rests on a cut excerpt I say "(cut)". I did NOT open the deep notes behind the digest. I could not see the parity table itself; the 22 row names come from `/private/tmp/p2/HANDOFF.md` and row 23 (zone population) from the zones brief, so section 6 is inferred and labelled so.

Rulings assumed: ONE LEDGER; server-verified everything; one engine; zones as data; loot/XP parity row 18; catalogue fields row 21 (row 20 = catalogue as runtime source); Pit frozen (row 22).

## 0. How to read licence tags, numbers and citations

- Licence class: **[P]** permissive (MIT, BSD, Apache, Zlib), **[C]** copyleft (GPL, AGPL, CC-BY-SA, BSL, EA-terms GPL), **[R]** restricted or unclear (Valve, Sustainable-Use, BSL-restricted, non-commercial). The class is the digest header class, not my own legal reading.
- **[C] and [R] donors are shape-only.** No constant or code is copied. Every number I give is our own, with a derivation, and was checked against the digest's donor numbers (collision table in section 8). [P] donors could be adapted with notice, but I still wrote everything fresh.
- Citation form: `Donor [class] ET0xx` where ET0xx / U004 / V0xx is the digest batch folder under `/private/tmp/p2/wave2-haiku/batch3/<batch>/out/economy-trade/<donor>.deep.md`.
- Money is an integer count of **c** (the minor unit; a name for the display coin is a Lead/Dom choice). All percents are integer basis points (bp, 10000 = 100%). Money type on the server is a 64-bit integer (BigInt in TypeScript) with a hard per-amount cap `maxAmount` (see section 3, P01), never a 32-bit int and never a float.
- **Tuning assumptions (mine, unmeasured, replace by measurement):**
  - server step `T` = 100 ms;
  - a typical fight `fightS` = 20 s;
  - a typical session `sessionS` = 1800 s with 60 percent of it in fights, so 54 fights per session and 108 per hour;
  - **wage `W`** = 36 c per fight at zone tier 1. Derivation: I want one session to pay about 2000 c (the price of a first gear piece), so W = 2000 / 54 = 37, rounded down to 36 so that 54 fights pay exactly 1944 c. Session income `S` = 1944 c; hourly income `H` = 3888 c;
  - bag size 24 slots.
  Every number below is a formula in `W`, `S`, `H`, `T`, `fightS`, so re-deriving after measurement is mechanical.

## 1. Top gems (16)

Each gem: the idea, donor and note, class, what we keep, what we fix, and our own numbers.

**G1. One door for all money: `settle(account, delta, reason, requestId)`.** OpenRCT2 [C] ET005 (single settle with typed reason, re-check at execute time); pokemonAutoChess [C] ET015 (one gold value, pool conservation); server-survival [P] ET018 (booking function, sale reverses purchase); SpacetimeDB [R] ET009 (audit row pair, check everything then write).
 Keep: every coin change goes through one function that writes a row with a reason, and a refused call writes nothing. Defect -> fix: donors bypass their own door (loans, cheats, town sales, scribble payout write the field directly) -> a static test greps server code for any write to a balance field outside the door, and an exception list that must be empty at release. Our numbers: reasons are a closed enum (section 3, P12); refused call = state hash unchanged.

**G2. Server prices from the stock row; the client sends only a slot and a quantity.** EQEmu [C] ET003; OpenDAoC [C] ET004; Barony [P] ET006; angband [C] ET008; evennia [P] ET011.
 Keep: the client names `(vendorId, lineId, qty, quoteId?)`; the server looks the line up and prices it. Defect -> fix: Barony priced from packet fields and charged for a failed match -> price only from the stored line, unknown line = hard refuse with no charge; EQEmu charged five for a non-stackable one -> clamp quantity to `stackMax` from the catalogue (row 21 field) and report the clamp. Our numbers: none beyond the price function (G3).

**G3. One pure price function with a spread and an arbitrage cap inside it.** OpenMW [C] ET016 (one offer function, cap inside it); Barony [P] ET006 and OpenEnroth [C] ET004 (clamp buy to at least value, sell to at most value); evennia [P] ET011; OpenTESArena [P] ET006 (flat resale rate).
 Keep: `buy(v)` and `sell(v)` are computed from one function with modifier stack order fixed, so no service can bypass the cap (OpenMW applied the cap only in the trade window). Our numbers (derived): the round trip should lose about half, so buy/sell = g^3 = 2.1, g = 1.28. `buyBp` = 12800; `sellBp` = 1/g^2 = 6104; `sellCapBp` = 7000; `tradeSkillBpMax` = 1800 (an optional later skill, off by default). Invariant: `sell <= min(floor(v * sellCapBp / 10000), buy - 1)`, `buy >= v`. Calc: v = 1000 -> buy 1280, sell 610 (round trip loses 670).

**G4. Buy-back as a zero-margin undo, with a fresh flag.** Shattered Pixel Dungeon [C] ET001; flare-engine [C] ET012 (fresh-sale flag, re-price on old ratio).
 Keep: a sold item can be bought back for exactly what was paid, so selling by mistake is free to undo. Fix: flare-engine applied the buy ratio twice -> the buy-back price is stored on the row at sale time and never recomputed. Our numbers: `buybackSlots` = ceil(24 / 4) = 6 (a quarter of a bag, so one clear-out visit fits); `buybackTtlS` = 45 x fightS = 900 s; the list also clears on leaving the zone.

**G5. Stock-driven price plus proportional rationing.** 2004Scape [P] ET001; Veloren [C] ET019.
 Keep: scarcity raises the price a fixed step per missing unit; two buyers asking for more than is left each get the same fraction. Fix: 2004Scape's surplus side was inert and its unit was unresolved -> a named unit (bp per unit), the floor and the step set together and pinned by a test; Veloren clamped an overdraft silently with a "BUG" log -> refuse instead. Our numbers: `stepBp = 6000 / target` per missing unit (emptying a line adds 60 percent), surplus step = half of that, `stockMultMin` 8000, `stockMultMax` 16000. Calc: target 24, stock 12 -> stepBp 250, mult 13000.

**G6. Lazy one-step restock with a demand-moved ceiling.** ModernUO [C] ET003 and U004.
 Keep: no timers; on first list-open after the delay, refill once to the ceiling; a sold-out line raises its ceiling, a mostly-unsold line lowers it; however long the shop sat, take one step only. Fix: transient state lost on restart -> ceiling and `lastRestockTick` live in the ledger store; the price scalar uses an explicit null, never "0 means none". Our numbers: `restockDelayS` = 240 (12 x fightS); ceiling x3/2 on sold-out, x5/6 when 3/4 or more is unsold; `ceilMin` = base, `ceilMax` = 4 x base.

**G7. Zone price index: daily mean reversion plus impact-and-recovery.** Daggerfall Unity [P] ET010 (daily index step); 0 A.D. [C] ET001 (impact per lot, timed restore).
 Keep: a per-zone price index that drifts and pulls back, and trades that push a rate then recover. Fix: Daggerfall rolled it on the client, 0 A.D. shared one index for the whole market -> index per zone market, rolled on the server with a seed `H(worldSeed, zoneId, dayNo)` so it is replayable; 0 A.D. rounding could mint -> round the payout down. Our numbers: `idx` in bp, bounds 7800..16200; daily step `idx += (10000 - idx) * 1800 / 10000 + noise`, noise uniform in +-170 bp. Impact: each lot traded moves a pair rate 120 bp, recovering 1/9 of the gap per sweep (sweepTicks 90).

**G8. Two-accept trade with a version counter; any change clears accepts.** ACE [C] V002; TrinityCore [C] V010; gawric Unity client [P] ET013 (expiring invite).
 Keep: both accepts must quote the current offer version; any edit bumps the version and clears both accepts; the commit re-checks ownership and room. Fix: TrinityCore kept the accept after an item-check failure and omitted the money check on one path; ACE's real clear also emptied the offer windows (checker found it) -> we choose explicitly: change clears accepts only, keeps offers, and a test pins it; the commit runs all checks, then one transaction. Our numbers: `inviteTtlS` = 24 (1.2 x fightS), the expiry is sent in the packet and the bar reads it; `acceptArmTicks` = 15 (button disabled 1.5 s after any change; 600 ms phone reaction x 2.5).

**G9. Conserved swap: nothing is ever lost, overflow becomes a claim row.** LostCityRS [P] ET003; Widelands [C] ET019 (batch starts only when both sides are reserved).
 Keep: one server transaction moves both offers; every unit ends in a bag or a claim owned by the receiver. Fix: LostCity let floor items expire with no row -> expiry writes an `EXPIRED` row and returns the claim to the owner; content ran the swap as two calls -> one call. Our numbers: `claimTtlS` = 3600; expiry returns to the original owner.

**G10. Escrow inside the auction record; outbid refund in the same transaction; proxy bid.** azerothcore [C] ET008; rathena [C] ET018; swgemu Core3 [C] V005; Showdown [P] ET019 (each bid restarts the window); AAEmu [C] V008 (fee by duration, buy-now ends lot).
 Keep: the bid sits in the lot, so a restart or an offline bidder cannot lose a refund. Fix: rathena dropped refunds when the party was off the map -> refunds are ledger rows, never session events; swgemu refunded the new price, not the leader's own debit (checker confirmed the overpay) -> the hold is recorded on the row and the refund equals that recorded hold; AAEmu had no balance check -> `settle` refuses. Our numbers: `minRaiseBp` = 350 (twenty raises double a price: ln2/ln1.035 = 20.1), floor 2 c; anti-snipe `extendToS` = 66 (3 x (fightS + 2 s latency)); proxy hold = the bidder's max.

**G11. Fee-at-listing that is never refunded, timed states, and one shared fee function.** l2dn server [P] ET008; forgottenserver [C] ET017; otclient [P] ET017; AAEmu [C] V008.
 Keep: listing fee up front, a sale tax on settlement, expiry as a sink with a visible deadline. Fix: otclient's client and server disagreed (rate, rounding direction, cap) -> one shared module imported by server and client for previews; l2dn's fee unit and per-lot-or-per-unit were unclear -> the fee is a bp fraction of the lot total, tested on a stack of 5; DOLSharp overflowed in the fee (see G13). Our numbers: `saleTaxBp` = 650 (one eighth of the vendor round-trip loss: 0.52 / 8 = 0.065); `depositBp` = 76 per 8-hour block, max 3 blocks (76 = 650 x 0.35 / 3, covering a 35 percent unsold rate over three blocks); tax rounds up, seller proceeds round down. Calc: price 2,147,483,647 -> tax 139,586,438 exactly in 64-bit.

**G12. Gross / net / burn transfer.** Beyond All Reason [C] ET009.
 Keep: sender pays gross, receiver gets net, the difference is a named burn, a cap on the receiver's room. Fix: the overflow pass minted credit with no debit and the transfer did not check the sender -> no overflow pass; sender check first. Our numbers: gift transfer tax `giftTaxBp` = 900 (above `gift.freeAllowanceC` = one session of income S = 1944 per day), so a free allowance keeps friends' small gifts cost-free.

**G13. Bounded integer math.** DOLSharp [C] ET002 (32-bit fee wrap gave a buyer price 20.9 million too low, a faucet); ModernUO [C] ET003 (sell side `int` with no guard, buy side guarded); AAEmu (int cast of a long).
 Keep: check price, funds and room before any move. Fix: all fees use `(amount * bp)` in 64-bit with `maxAmount` = 10^9 c, tax and fee computed from the same bounded value on both sides; a boundary fuzz test at 2^31 / 20, 2^31, 2^32, 2^53 (these are the integer limits, not donor constants).

**G14. Craft payment: reserve, drip, rate cap, refund-before-progress, rush price.** keeperrl [C] ET016 (queue states); C&C Remastered [C] ET011 (installments, stall with no debt); freeorion [C] ET013 (rate cap and carry, server decides completion); OpenRA [C] ET004 (pay as built); freeciv [C] ET013 (rush price).
 Keep: queue a craft = a real hold row in the ledger (keeperrl's "debt" was only a claim the other spenders ignored), the hold releases at a capped rate per tick into a sink or the material pool, cancel refunds the unspent hold plus a share of the spent part. Fix: keeperrl let a cheap later item overtake -> strict queue order by default (`craft.fairness` = "fifo" | "any-affordable"); C&C stalled silently -> a stalled craft shows "waiting for c" with the shortfall. Our numbers: per-tick draw = ceil(cost / minTicks); 900 c over 150 ticks = 6 c per tick; cancel loss `cancelLossBp` = 1667 on the spent part (1/6, one sixth, to stop queue spam as free storage); rush multiplier `rushBp` = 14000 + 12000 x (remaining / total). Calc: cancel at tick 60 of a 900 c craft: spent 360, held 540, refund 540 + 299 = 839, sink 61. Rush at 40 percent progress: remaining 540 x 2.12 = 1145.

**G15. Discount-truth rules.** Valve source SDK 2013 [R] ET006.
 Keep: a sale shows only if the price is strictly below base after rounding; a bundle shows a discount only if it costs less than the sum of its parts. Fix: rounding erased a 1 percent sale; the rental number meant two things -> every price field has one named unit (charge share). Our numbers: round displayed prices to `roundTo` = 1 c below 200 c, 5 c from 200 c up, and only after the discount test.

**G16. Faucet cap, sink table and an inflation guard.** OpenRCT2 [C] ET005 (rolling period table); hedgewars [C] ET014 (cap, wasted tick); pokemonAutoChess [C] ET015 (interest cap); server-survival [P] ET018 (upkeep as percent of price with a ramp); isometric-city [P] ET007 (lagged rate so a change does not shock); crawl [C] ET010 (step-down soft cap).
 Keep: each account has a rolling faucet window; payouts above the cap taper rather than stop; a daily controller moves one lever by a bounded step. Fix: autochess's interest cap could go negative -> every cap is `max(0, ...)`; hedgewars charged a cached cost -> price recomputed at the point of payment. Our numbers: `faucetCapC` = 1.6 x H = 6221 c per rolling hour, linear taper from 1.0 at the cap to 0.2 at 2 x cap. Calc: earned 7000 -> multiplier 0.8998. Controller: `r = sinks24 / faucets24`; dead band 0.80..0.92 (target 0.86, leaving 14 percent growth for new players); outside it, vendor `buyBp` moves `clamp(round((0.86 - r) x -4000), -140, +140)` bp per day inside bounds 11400..14600.

## 2. Defect -> fix table

Rule: a donor defect never rejects the mechanism. Class tag after the donor. "T" ids refer to the experiment plan (section 7).

| Donor [class] ET | Defect (from the digest) | Fix | Test |
|---|---|---|---|
| Shattered PD [C] ET001 | Funds checked only in the client; buy and buy-back spend unchecked; gold written in five places | Server checks; `settle` is the only writer | T1, T12 |
| 0 A.D. [C] ET001 | One index for the whole market; payment and payout are two calls with no rollback; `Math.round` can mint | Index per zone market; one transaction; round payouts down | T4, T7 |
| 2004Scape [P] ET001 | Scale unit unresolved; surplus side inert; a "60 default" hidden by a floor | Named unit bp; floor and step set together and pinned | T3 |
| CDDA [C] ET002 | Price computed in the client; debt remembered by the NPC and a bank (three money places) | Server price; one signed balance over one ledger; no NPC debt | T1, T12 |
| OpenBOR [P] ET002 | MP spent from HP when short (second pool); payment deferred to animation end | One pool per cost, refuse not fall through; pay at the gate | T9 |
| DOLSharp [C] ET002 | 32-bit fee wraps; buyer price 20.9 million short of the seller's credit; separate merchant pool | 64-bit; `maxAmount`; pool is a ledger account | T6 |
| EQEmu [C] ET003 | Coin taken before the bag-room check; non-stackable qty charged but one granted | Room check first, qty clamp, one transaction | T2 |
| LostCityRS [P] ET003 | Floor items vanish at expiry with no row; swap as two content calls | `EXPIRED` row and return to owner; one call | T8 |
| ModernUO [C] ET003 / U004 | `?? 0` sentinel means "no price scalar"; sell side `int` unguarded; stock state reset on restart; two gold sources | Explicit null; 64-bit both sides; ceiling persisted; one account | T3, T6 |
| OpenDAoC [C] ET004 | Items granted before debit; sell-back creates money from any droppable item | Check then apply; origin flag on items (N7) | T2, T10 |
| OpenEnroth [C] ET004 | Truncation drifts; reputation term has no source | Integer minor units, one rule; reputation field dropped | T3 |
| OpenRA [C] ET004 | Rollback reads current stock not the amount added; lockstep sync | Server authority; rollback uses recorded amounts | T7 |
| OpenRCT2 [C] ET005 | Loan, cheats, scripting and guest spends write cash directly | All routed through `settle`; exception list empty at release | T12 |
| OpenTTD [C] ET005 | Time-decay curve has no use without timed content | Park until timed bounties exist (idea N4); server ticks | T14 |
| OpenXcom [C] ET005 | Commit trusts the screen; divide by zero on cost 0; price factor 2 unexplained | Re-check at commit; reject price 0 at catalogue load; no unexplained factors | T2, T13 |
| Barony [P] ET006 | Price from packet fields; no return after failed match still charges; zero floor on overdraft | Price from stored line; hard return; overdraft refused | T1, T2 |
| Valve SDK 2013 [R] ET006 | Rounding erases a small sale; rental number means two things; market price shows 0 when cache empty | Test sale after rounding; named unit; empty = "no quote" | T15 |
| OpenTESArena [P] ET006 | Two gold forms (counter and item); price captured at list build; no stock check; equipped item sellable | One counter; reprice at purchase; stock as data; refuse equipped | T1, T3, T11 |
| Fallout 1 CE [R] ET007 | Dead branch (`<= -30` never true); empty NPC side accepted as a free gift | No dead test; require both sides non-empty | T5 |
| Fallout 2 CE [R] ET007 | Cost doubled by default; no upper clamp; companion trades skip the value check | Own base, stated; clamp both sides; every trade checks value | T5 |
| isometric-city [P] ET007 | Ledger is client state in localStorage; `addMoney` has no check; trade income dropped | Server ledger; no client mint path | T1 |
| angband [C] ET008 | Shop money vanishes or appears without a record; faucet switch is global | Shop is a ledger account with sink and source rows; switch is a zone flag | T4 |
| l2dn server [P] ET008 | Fee unit read 100 as a multiplier; per-unit vs per-lot unclear; buy destroys currency before the item add; registration returns after detaching the stack | bp fraction of lot total; one transaction; rollback restores the stack | T2, T6 |
| azerothcore [C] ET008 | (none read in the excerpt) deposit formula hard to explain | Plain fraction of value x duration | T6 |
| Beyond All Reason [C] ET009 | Overflow pass credits with no debit; stale stock variable not refreshed | No overflow pass; re-read balance inside the transaction | T4 |
| SpacetimeDB [R] ET009 | No retry guard (double click pays twice); uncapped starter grant per identity | `requestId` dedupe; grant is a capped data field once per account | T16 |
| basic-computer-games [P] ET009 | No refusal when savings are short; Java fall-through into the sale | Refuse; table-driven route, no fall-through | T2 |
| crawl [C] ET010 | Voucher is a second counter; stale price skipped silently | Voucher is a ledger row; stale cart rejected with a message | T12, T17 |
| Daggerfall Unity [P] ET010 | Index and prices roll on the client; letters of credit and bank per region (second ledger) | Server seeded roll; one gold | T4, T12 |
| C&C Remastered [C] ET011 | Two pools (storage then cash); silent stall | One ledger; stall shows shortfall | T9 |
| Endless Sky [C] ET011 | Oldest-bin buy / newest-bin sell loop: buy 390, sell 991 (cost 1000) | One price function by age; stock and player use the same function | T10 |
| Evennia [P] ET011 | Buy list build calls with wrong arity; sell path raises before paying; takings unrecorded | Typed interface test; sell is check-then-apply; takings are a sink row | T2 |
| Exult [C] ET012 | Count and drain use different predicates; zero-cost returns false; no transaction | One predicate; zero-cost craft is allowed and writes no row; one transaction | T7, T13 |
| flare-engine [C] ET012 | Global buy ratio applied twice (150 expected, 225 actual); price depends on whether the window is open | Apply each ratio once, price independent of UI | T3 |
| flare-game [C] ET012 | Band order changes the result; stock re-rolled on every entry | Order-independent rule; restock is a policy with a timer | T3 |
| freeciv [C] ET013 | Turn-flag gate does not fit real time | Gate is a period in ticks | T14 |
| freeorion [C] ET013 | Progress written before the gates; bank is a second pool | Gates first; no bank | T9 |
| hedgewars [C] ET014 | Cost cached from the last selection; paid at placement | Recompute at payment | T1 |
| gemrb [C] ET014 | Client credits gold even if the move fails; two prices in one engine | Pay on success; one quote function | T2 |
| fheroes2 [C] ET014 | `Trim` clamps a shortfall to zero silently; remainder lost on division | Fail the transaction; remainder goes to the sink row | T7, T4 |
| pokemonAutoChess [C] ET015 | Direct money writes; interest cap can go negative | `settle` only; `max(0, ...)` | T12 |
| l1j [C] ET015 | Tax skipped at a cap; town books use the template price | Clamp and report; books use the charged price | T4 |
| claudecraft [P] ET015 | Reason order is load-bearing | Pin the order in a test | T11 |
| lincity-ng [C] ET016 | Receiver not clamped to its maximum; no global check | Clamp; global conservation assertion | T7 |
| keeperrl [C] ET016 | Debt is not a hold; cheap items overtake; progress not refunded | Real hold; fairness flag; refund rule | T9 |
| OpenMW [C] ET016 | Cap only in the trade window; price computed on the client | Cap inside the function; server | T3, T5 |
| otclient [P] ET017 | Client and server fee differ in rate, rounding and cap | One shared module | T6 |
| forgottenserver [C] ET017 | Escrow implicit; charges and upgrades lost on the sell path; state/money order differs per path | Explicit escrow account; item instance travels whole; state before money everywhere | T7, T11 |
| L2Solo [P] ET017 | Learned multiplier only falls; floor in two places; cap depends on price | Recovery rule (N10); one constant; cap computed before price | T3 |
| server-survival [P] ET018 | Auto-repair heals without the upkeep flag | Heal and charge share one flag | T9 |
| rathena [C] ET018 | Refund lost when party is off the map; trusts the map's debit | Ledger refund by row; server is the only debit | T7, T8 |
| scummvm [C] ET018 | Abort leaves a phantom balance; commit trusts the client | Balance derived from ledger; total re-checked at commit | T2 |
| Showdown [P] ET019 | Bid is any chat line parsing as a number; balance in memory; unbid lot sold to nominator | Structured command; ledger; unbid lot returns to seller | T7 |
| Veloren [C] ET019 | Silent clamp with a log; stock counted twice | Refuse; surplus formula stated and tested | T3 |
| Widelands [C] ET019 | Trade guarded by an `assert`; accept does not check who is accepting | Validate at the entry point; every action checks both parties | T5 |
| ACE [C] V002 | Real clear also empties offers; finalize skips a failed removal | Pick one rule and pin it; any failed removal aborts all | T5 |
| swgemu [C] V005 | Refund is the new price (overpay); offline leader gets no refund | Refund the recorded hold; refund by row | T7 |
| AAEmu [C] V008 | No balance check; start price never checked on bids; untaxed remainder | `settle` refuses; check start price; remainder is a named sink | T2, T4 |
| TrinityCore [C] V010 | Accept kept after item-check failure; saves not one transaction | Every failed check unaccepts; one transaction | T5, T7 |

## 3. Composable parts (each switchable, each data-driven)

Every part has `enabled`. A switch off means the part's endpoints refuse with `feature_off` and no ledger row is written. All fields live in a catalogue block `economy` (row 20/21) and per-zone overrides (zones as data). Defaults below belong to the "Standard" preset (section 4).

**P01 Ledger core (always on).** `settle(account, delta, reason, requestId)`. Fields: `maxAmount` 1000000000; `currency` "c"; `negativeBalance` false; `startGrantC` 216 (6 x W), `startGrantOncePerAccount` true. Accounts: player wallets, `escrow:<listingId>`, `hold:<craftId>`, `pool:<zoneId>` (public pool), `sink:<reason>` (a named burn account). Wallets, escrow, holds, pools and sinks are all accounts, so the sum of every account is the whole supply.

**P02 Price function.** `price.buyBp` 12800, `sellBp` 6104, `sellCapBp` 7000, `rounding` {buy: "up", sell: "down", fee: "up"}, `modifierOrder` ["zoneIdx","stock","tradeSkill","festival"], `minPriceC` 1. One module `economy/price.ts` imported by the server and by the client preview.

**P03 Vendor stock.** Per vendor line: `{item, base, target, ceilMin, ceilMax, price: {mode: "fixed"|"stock"}}`. `stepBp` computed from target as in G5 unless overridden. Only the vendor sells into stock: player sales do not refill stock by default (`playerSalesRestock` false), as ModernUO does, so stock stays a designer number; true is allowed for the Open Market preset.

**P04 Restock.** `restock.mode` "lazy-one-step" | "timer" | "off"; `restockDelayS` 240; `ceilUpNum/Den` 3/2; `ceilDownNum/Den` 5/6; `ceilDownWhenUnsoldBp` 7500.

**P05 Buy-back.** `buyback.slots` 6; `buyback.ttlS` 900; `buyback.priceMode` "paid" (price stored at sale, never recomputed).

**P06 Tax and fee sinks.** `fees.saleTaxBp` 650; `fees.depositBp` 76; `fees.depositBlockS` 28800; `fees.depositBlocksMax` 3; `fees.giftTaxBp` 900; `fees.giftFreeC` 1944; `fees.destination` "burn" | "zonePool"; `fees.roundUp` true. One module, imported by client for previews.

**P07 Player-to-player trade.** `trade.enabled`, `trade.inviteTtlS` 24, `trade.acceptArmTicks` 15, `trade.maxItems` 8, `trade.maxC` 100000, `trade.rangeTiles` 6 (same zone cell), `trade.onChange` "clear-accepts" | "clear-all". Eligibility via P13.

**P08 Escrow listing and auction.** `market.mode` "off" | "listing" | "auction" | "both"; `market.durationBlocks` 1..3; `market.minRaiseBp` 350, `market.minRaiseC` 2; `market.antiSnipe.extendToS` 66; `market.proxyBid` true; `market.buyNow` true; `market.maxActivePerAccount` 12 (= 24 slots / 2).

**P09 Craft payment.** `craft.payMode` "up-front" | "drip" | "on-complete"; `craft.fairness` "fifo" | "any-affordable"; `craft.cancelLossBp` 1667; `craft.rush.enabled`, `craft.rush.baseBp` 14000, `craft.rush.slopeBp` 12000, `craft.rush.periodTicks` 600; per recipe `minTicks`, `costC`, `inputs[]`. Drip only for crafts of 150 ticks or more (the OpenRA note warns a pause is a trap in a fast fight).

**P10 Faucet caps.** `faucet.windowS` 3600; `faucet.capC` 6221; `faucet.floorBp` 2000; `faucet.perSourceCapBp` 3000 (one source, such as a spawn point or vendor, may supply at most 30 percent of the cap); `faucet.sameTargetTaper` {afterKills: 7, perKillBp: 800, floorBp: 3000, windowS: 600} (crawl-style step-down shape, our numbers: 7 = fights in 140 s, 800 bp loss per further kill).

**P11 Inflation guard.** `guard.mode` "off" | "alert" | "auto"; `guard.targetRatio` 0.86; `guard.deadBand` [0.80, 0.92]; `guard.gain` 4000; `guard.stepBpMax` 140; `guard.buyBpBounds` [11400, 14600]; `guard.faucetBpBounds` [8000, 11000] (a second lever on the zone wage). Reads P12 rows only.

**P12 Audit rows.** Row: `{seq, tick, requestId, account, delta, reasonCode, refType, refId, balanceAfter, pairSeq}`; every transfer writes two rows with `pairSeq`. Reason enum (closed): `kill_loot`, `quest`, `start_grant`, `vendor_buy`, `vendor_sell`, `buyback`, `fee_deposit`, `tax_sale`, `tax_gift`, `trade_swap`, `escrow_hold`, `escrow_release`, `craft_hold`, `craft_spend`, `craft_refund`, `rush`, `repair`, `expire_return`, `admin_adjust`. Daily `SEAL` row stores totals and a checksum (N1). `requestId` dedupe window = 3 days.

**P13 Eligibility.** Claudecraft-style ordered refusals: `quest`, `bound`, `locked`, `equipped`, `fresh-vendor` (N7), `floor` (rarity below the catalogue floor), `unknown-kind` (closed default). Fields in the catalogue (row 21): `tradeFlags`, `rarity`, `stackMax`, `baseValueC`, `sinkClass`, `origin`.

**P14 Zone index.** `index.enabled`, `index.bounds` [7800, 16200], `index.pullBp` 1800, `index.noiseBp` 170, `index.sweepTicks` 90, `index.impactBpPerLot` 120, `index.recoverDen` 9.

**P15 Quote and price lock.** `quote.ttlTicks` 120 (0.6 x fightS); the server returns `quoteId` with price; a buy that carries a live quoteId pays the quoted price if the server price moved against the buyer inside the lock (the sink absorbs the difference, bounded by `quote.maxDriftBp` 600), otherwise the server price. An expired quote is re-quoted with a visible message.

**P16 Repair and upkeep.** `repair.bpOfBuyPerFullWear` 1100 (11 percent: about 9 full repairs equal one purchase), `repair.healRequiresFlag` true, `repair.walletReserve` true (N18).

## 4. Presets (4 plus an overlay)

A preset is one JSON overlay merged on the defaults; switching a preset changes no code. All numbers are our own derived starting values, untested.

**E0 "Flat" (tutorial, early zone, and the safe fallback).** Fixed prices, no market, no index, no guard. Fields:
```
{ "price": {"mode":"fixed","buyBp":12800,"sellBp":6104},
  "vendor": {"stock":"unlimited","restock":{"mode":"off"}},
  "index": {"enabled":false}, "market": {"mode":"off"}, "trade": {"enabled":false},
  "fees": {"destination":"burn","giftTaxBp":0},
  "faucet": {"capC":9331}, "guard": {"mode":"off"},
  "buyback": {"slots":6,"ttlS":900} }
```
`faucet.capC` 9331 = 2.4 x H: a cap that rarely binds.

**E1 "Standard Zones" (default).** Stock-driven vendors, lazy restock, zone index, buy-back, repair, no player market, trade on.
```
{ "price": {"mode":"stock"}, "vendor": {"restock":{"mode":"lazy-one-step","delayS":240}},
  "index": {"enabled":true,"pullBp":1800,"noiseBp":170},
  "trade": {"enabled":true,"inviteTtlS":24,"acceptArmTicks":15},
  "market": {"mode":"off"}, "fees": {"giftTaxBp":900},
  "faucet": {"capC":6221}, "guard": {"mode":"alert"}, "repair": {"bpOfBuyPerFullWear":1100} }
```

**E2 "Open Market".** E1 plus escrow listings and auctions with proxy bids; player sales refill vendor stock; tax goes to the zone pool.
```
{ "market": {"mode":"both","durationBlocks":3,"minRaiseBp":350,"antiSnipe":{"extendToS":66},"proxyBid":true},
  "fees": {"saleTaxBp":650,"depositBp":76,"destination":"zonePool"},
  "vendor": {"playerSalesRestock":true},
  "guard": {"mode":"auto","stepBpMax":140} }
```
The pool-funded events (N5) need `fees.destination` "zonePool".

**E3 "Iron" (hardcore sinks).** Steeper repair, a wallet soft cap with decay, a lower faucet cap, craft cancellation costs more. For a season or an optional world.
```
{ "repair": {"bpOfBuyPerFullWear":1600}, "faucet": {"capC":4666,"floorBp":1500},
  "wallet": {"softCapC":38880,"decayBpPerHour":10},
  "craft": {"cancelLossBp":2500,"rush":{"enabled":false}},
  "fees": {"saleTaxBp":900,"giftTaxBp":1500}, "guard": {"mode":"auto"} }
```
`softCapC` 38880 = 20 x S; `decayBpPerHour` 10 applies only to the part above the cap, a sink labelled `decay_wallet`.

**E4 "Festival" overlay (time-boxed on top of any preset).** Shop discounts funded by the zone pool; the discount is a real price below base (G15 test), paid from the pool, so supply is conserved.
```
{ "festival": {"discountBp":1200,"fundedBy":"pool:zone","capC":"pool balance","startsAtTick":null,"endsAtTick":null} }
```
`discountBp` 1200 stays under the trade-skill maximum so the floor `buy >= v` still holds (checked by T3).

## 5. Novel ideas (20)

Each says what it combines and how it stays within the rulings.

- **N1 Daily SEAL row.** At the server day boundary write one row per account class with `sum(wallets)`, `sum(escrow)`, `sum(holds)`, `sum(pools)`, `sum(sinks)`, `minted`, and a checksum chaining the previous seal. A seal that fails `total == minted - 0` (sinks are in the total) halts the market and raises an alert. (OpenRCT2 rolling table, SpacetimeDB pair rows.)
- **N2 Price-lock quote.** Quote id with a 12 s lock (P15); stale quote gets a fresh quote message, never a silent skip (crawl) and never an old price (Arena).
- **N3 Dry-run endpoints.** Every economy action has a `dry: true` form that runs the same code, collects the would-be rows, and rolls back. The UI uses it for the "you pay / you get / tax" panel, tests use it as an oracle. (otclient mirrored formula, scummvm balance preview.)
- **N4 Pool-funded bounties.** A timed bounty or escort pays from `pool:<zone>` using the time-decay curve (OpenTTD shape: flat window, slope, tail); the pool, not a mint, funds it, and a bounty cannot exceed the pool balance. Needed only once timed content exists. Our curve: full for `graceS` = 40 (2 x fightS), then linear to 40 percent at 6 x fightS, then 4000 / (1 + (t - 6 x fightS) / 60) bp tail, never below 600 bp.
- **N5 Zone treasury and festivals.** Taxes accumulate in `pool:<zone>`; when the pool passes `festival.trigger` = 8 x H the zone runs a discount week funded only by what is in the pool. A closed loop that returns sink coin to players without minting. (l1j public pool, BAR burn accounting.)
- **N6 Row 18 value budget.** Loot tables and wage are both derived from one catalogue field `valueBudgetC` per tier, so `E[coin per fight]` equals W by construction; a CI lint computes the expectation over the loot table and fails if it differs from W by more than 3 percent. (afritz1 class gold table, flare-game band table.)
- **N7 Origin flag on item instances.** `origin` in {drop, craft, vendor, quest}. A vendor-bought item resells at `sellBp` x 0.7 of the usual sell price for its first 3 sales (`freshVendorBp` 7000), so shop-to-NPC loops cannot print money; a drop sells at the usual rate. Fixes OpenDAoC's untracked origin. The number: 7000 bp makes buy -> sell lose another 30 percent.
- **N8 Wear-based resale.** Sell value scales with remaining durability: `sell = base x sellBp x (4000 + 6000 x dur/durMax) / 10000`. One function for vendors and for NPC-appraised player listings. (Endless Sky decay, OpenRA refund by condition.)
- **N9 Duel wager escrow (not in the Pit).** Two-accept swap (G8) of equal stakes, held in escrow, 4 percent rake `wagerRakeBp` 400 to a sink; the winner is named by the existing server result. Switchable, off in E0; the Pit stays out (row 22 frozen).
- **N10 Recovery for any learned multiplier.** L2Solo's one-way ratchet gets a reverse: each unsold expiry moves the item's `listMultBp` down 300; each sale at or above ask moves it up 450 (up faster than down so shortages recover) inside 6500..11000.
- **N11 Lazy everything, one sweep.** No timers per object. Restock, index, buy-back expiry, offer expiry all settle on read with one step, plus one sweep every `sweepTicks` 90 for listings and claims that must expire without being read. (ModernUO lazy catch-up.)
- **N12 Claim rows for all overflow.** A bag-full receive, an outbid refund of an item, or an expired listing becomes a claim row owned by the receiver; the UI shows "waiting for you (3)". (LostCity floor, forgottenserver history, AAEmu mail.)
- **N13 Proportional rationing at one tick.** The server collects buys on a line inside a window of 3 ticks (`rationWindowTicks`) and, if the sum exceeds stock, gives each the same fraction rounded down, remainder to the earliest by sequence number. (Veloren rationing.)
- **N14 Static zone-data conservation lint.** For each zone's data, compute declared faucets (wage x cap, loot value budgets) and declared sinks (vendor spread x expected visits, repair, tax) and fail CI if `sink/faucet` is outside [0.55, 1.1] for the zone's preset. A design-time check on "zones as data". (isometric-city monthly formula; OpenRCT2 table.)
- **N15 Hold-to-confirm and undo.** Phone-first: purchases over 25 percent of the wallet need a 0.6 s hold; vendor sells have the buy-back as undo (G4); player trades show the tax-inclusive total and arm the accept button (P07). (Showdown compensating undo, Shattered buy-back.)
- **N16 Reserve floor.** Spendable = wallet - reserve, where reserve covers outstanding craft holds and the repair cost of the equipped set at 1 wear. A player cannot spend into a state where gear cannot be repaired. (Showdown reserve floor, keeperrl real hold.)
- **N17 Same-target taper with a visible meter.** The faucet taper (P10) shows a small meter "this spawn is tired" so the player moves on instead of grinding; also counters bots. (crawl step-down, Barony status meter.)
- **N18 Replayable economy.** Ledger rows plus the seeded index rolls rebuild every balance from genesis; a replay test (row 19 sibling) rebuilds from rows and compares with the live state. (SpacetimeDB audit pair, Daggerfall index.)
- **N19 Credit notes as ledger rows.** A voucher or compensation is an account entry with an expiry reason code, never a second counter. (crawl voucher defect.)
- **N20 Per-source faucet attribution.** `perSourceCapBp` (P10) lets Dom see which spawn or quest feeds the most coin, and the guard throttle that source's wage before the whole zone. (OpenRCT2 typed buckets.)

## 6. Gaps in parity rows 1-23 (INFERRED, for Lead to decide)

Known rows (HANDOFF): 1 duel step/sim; 2 AI; 3 guard/parry/stamina; 4 fight loop; 5 controls; 6 hero actor; 7 creature actor; 8 blood; 9 finishers; 10 hit impact; 11 camera; 12 sound; 13 specials; 14 HUD; 15 gear dressing; 16 colour grade; 17 death/respawn; 18 loot roll and XP; 19 fight record/replay; 20 catalogue as runtime source; 21 catalogue fields; 22 Pit-only; 23 zone population (per the zones brief). No row covers a wallet, a shop, a price or a sink. **All of the below is inferred; nothing was checked against the real checklist.**

Rows Lead should add (proposed):
1. **Wallet and ledger** (balance, `settle`, reason enum, request ids, audit rows). Closest: none (row 18 awards loot but not money rows).
2. **Vendor and price function** (buy, sell, spread, cap, stock, restock, buy-back).
3. **Sinks and fees** (tax, deposit, repair, rush, decay), each with a reason code.
4. **Faucet budget and inflation guard** (cap, taper, daily controller, SEAL).
5. **Player trade** (two-accept, version, escrow, invite, claim rows).
6. **Market and auction** (listings, proxy bid, refunds).
7. **Craft payment** (hold, drip, cancel, rush).
8. **Item instance state through trade** (durability, upgrade level, origin, bound/locked); today's row 15 gear dressing is visual only.
9. **Row 18 extension:** loot roll must credit coin through `settle` with reason `kill_loot`, and the loot table's expected coin must equal wage W (N6). Possibly row 18 already says part of this; Lead to check.
10. **Row 17 extension:** death cost (repair, drop rule) uses `settle` and the repair sink; today's row probably covers respawn only.
11. **Row 19 extension:** replay of ledger rows and seeded index rolls (N18).
12. **Rows 20/21 field additions:** `baseValueC`, `stackMax`, `tradeFlags`, `rarity`, `origin`, `sinkClass`, `valueBudgetC`, `vendor lines`, per-zone `economy` overlay; reject price 0 at load (OpenXcom).
13. **Row 14 HUD:** wallet, tax-inclusive total, quote lock countdown, taper meter (phone width 375).
14. **Row 5 controls:** hold-to-confirm and the accept-arming delay.
15. **Row 22 Pit:** a test that no economy hook (stake, wager, rake) is reachable from Pit code. This keeps the freeze.
16. **Row 23 sibling:** the zone `economy` block (index, vendor ids, faucet cap, preset) next to the population block.
17. **Row 4/13:** the action costs of specials (OpenBOR gate-then-pay) are stamina, not currency; make that explicit so `settle` is not used for stamina (one pool per cost; refuse instead of falling through).

## 7. Experiment plan (headless server tests, nothing run)

All tests run against the server module with no client and no browser, a fake clock, a seeded RNG, and an in-memory ledger store with a fault-injection hook. Heavy runs (the fuzz, the 60-day simulation) go to the VPS per Dom's standing rule; the unit tests are cheap enough for the Mac.

**Unit and property tests**

| Id | Test | Pass condition |
|---|---|---|
| T1 | Client-trust: send a buy with a lying price, lying item fields, a lying client balance | Charged price comes from the stored line; balance unchanged on refuse |
| T2 | Check-then-apply: full bag, short funds, qty 5 on a non-stackable, stale line, price 0 line | Refusal reason is correct; state hash (all accounts, items, stock) before == after |
| T3 | Price function property grid over all items x modifiers (index bounds, stock bounds, discount 0..1800, festival) | `buy >= v`, `sell <= min(0.7v, buy-1)`, sell >= 1, applying each ratio once; calc spot: v = 4375, idx 11600, stock 13000, disc 900 -> buy 7685, sell 2910 |
| T4 | Sink accounting | Every fee, tax, remainder and rounding difference lands in a named sink row; sum of all accounts + sinks == minted |
| T5 | Trade rules: change clears accepts; empty side refused; wrong party refused; failed removal aborts | No item or coin moved on any refusal |
| T6 | Boundary fuzz at 2^31/20, 2^31-1, 2^31, 2^32, 2^53, `maxAmount` | Fee equals big-integer oracle; no wrap |
| T7 | Fault injection: throw after each step of every transaction (buy, sell, swap, bid, outbid, settle, craft cancel) | After the throw, state == before (rollback) and the conservation assertion holds |
| T8 | Expiry: listing, claim, buy-back, invite on a fake clock; offline party | Expiry writes an `EXPIRED` or `expire_return` row; item and coin are not lost |
| T9 | Craft: drip, stall, cancel at several ticks, fifo versus any-affordable, rush | `paid + refund + sink + unpaid == cost` at every tick; no negative balance |
| T10 | Arbitrage search: buy-sell, sell-buyback, craft-sell, vendor-origin resale, wear resale, bots exhaustive up to 3 steps | No sequence of 3 operations yields a net gain at equal state |
| T11 | Eligibility order and unknown-kind default | Each reason fires in the pinned order |
| T12 | Static lint: no balance write outside `settle` | Exception list empty |
| T13 | Catalogue load: price 0, negative, over `maxAmount`, missing field | Load refuses with the field name |
| T14 | Time-decay bounty and rush period gate on server ticks | Server ticks only |
| T15 | Discount truth: a 1 percent sale on a 100 c item, a bundle at 900 vs parts 1000 | Sale hidden after rounding; bundle strike only when cheaper |
| T16 | Idempotency: same `requestId` twice, then 10,000 retries interleaved | One effect only |
| T17 | Stale quote | Fresh quote message; no silent skip |

**Conservation-of-currency fuzz (the headline test).** Original sketch; seeds and counts are starting values.

```
// fuzz-conservation.ts  (proposal, not written)
for (seed of seeds(200)) {
  const w = makeWorld({seed, accounts: 50, zones: 4, preset: pick(presets), clock: fake()})
  const genesis = total(w)                 // sum of wallets+escrow+holds+pools (sinks start at 0)
  let minted = 0n
  for (step = 0; step < 20000; step++) {
    const op = pickWeighted(w.rng, OPS)    // buy, sell, buyback, trade offer/accept/edit/cancel,
                                           // list, bid, outbid, buyNow, cancel, craft queue/cancel/rush,
                                           // repair, gift, wager, kill_loot, advance clock, restart server
    const before = hashAll(w)
    const r = tryOp(w, op)                 // may be a hostile op: bad ids, huge amounts, wrong party
    if (inject(w.rng, 0.02)) faultAfterRandomStep(w)   // throw mid-transaction
    if (r.refused || r.faulted) assertEq(hashAll(w), before)      // a refusal changes nothing
    minted += r.mintedFaucetC                                      // only kill_loot, quest, start_grant mint
    assertEq(total(w) + sinkTotal(w), genesis + minted)            // conservation, every step
    assert(allBalances(w).every(b => b >= 0n))
    assert(everyItemUnitOwnedOnce(w))                              // items: conserved, no duplicates
    assertRowsExplain(w)                                           // every balance change has a row pair
  }
  assertReplayEquals(w)                    // rebuild from rows + seed == live state (N18)
}
```
Variants: (a) concurrency: run two interleaved op streams over the same line and account (transaction ordering); (b) differential: an independent bigint oracle re-implements `price` and `fee` and is compared on random inputs; (c) mutation test: seed deliberate bugs (skip a refund row, wrap a fee, clamp silently) and require the fuzz to fail within N steps.

**Simulation experiments (VPS, bots)**

| Id | Experiment | Output for Dom |
|---|---|---|
| X1 | 60 simulated days, 200 bots with three play styles (grinder, trader, flipper), presets E0..E3 | sink/faucet ratio by day, Gini of wealth, median item price index, time to afford first gear piece |
| X2 | Guard response: inject a 40 percent faucet shock on day 20 | days to return into the dead band; maximum markup move per day (<= 140 bp) |
| X3 | Exploit hunt: 20 hostile bots search the 3-step arbitrage space with real latency and parallel requests | zero profitable loops |
| X4 | Market load: 5,000 listings, 200 bidders, proxy bids | transaction p99, refund exactness |
| X5 | Phone checks (outside this brainstorm): hold-to-confirm, accept arming, quote lock countdown at 375 wide | screenshots for Dom |

## 8. Constant collision check

I compared each number I propose with the donor numbers visible in the digest. Donor numbers seen (digest): buy-back 3; rates 82/79 and 20 s; 100 and 60; 25 percent weight; 129/123; 20 percent fee (1200); 5 percent (1050); 50 ratio; 75 percent cap and three quarters; 336/112; 10..300; 160; 2 percent and 1 percent; 30 percent (0.3); 10 percent; 0.8 smoothing; 90 percent share; 60 percent floor and 98 percent undercut; 5 per expiry and floor 50; 1 hour restock; doubles and halves with 999 and 640 and 20; 99 stack; 200 tick; 20 s invite; hub max/8; 1.01; 250 and 390 and 764 and 991; index bounds 250 and 4000 with steps 49/50 and 51/50; 2,000,000,000; 1,000,000 and 100,000 caps; 500; 5-block fee 10,000; 31/255; 30-day sweep; 100,000,000 and 110,000,000; 12 hour.

| Mine | Value | Collides? |
|---|---|---|
| wage W / session / hour | 36 / 1944 / 3888 | no |
| buyBp / sellBp / sellCapBp | 12800 / 6104 / 7000 | no (donor caps 75 / 60 differ) |
| buy-back slots / ttl | 6 / 900 s | no (donor 3) |
| saleTaxBp / depositBp / giftTaxBp | 650 / 76 / 900 | no (donor 5, 10, 20, 30; 900 bp = 9 percent, differs from 90 share) |
| minRaiseBp / extendToS | 350 / 66 | no (donor 5 percent) |
| inviteTtlS / acceptArm | 24 s / 1.5 s | no (donor 20 s) |
| restockDelayS / ceiling steps | 240 s / 3/2 and 5/6 | no (donor 1 hour, x2, half) |
| faucet cap / floor | 6221 c, 0.2 | no |
| index bounds / pull / noise | 7800..16200 / 1800 / 170 | no (donor 250..4000, 49/50) |
| stepBp | 6000 / target | no |
| cancelLossBp / rush | 1667 / 14000 + 12000 x remaining share | no (donor 160 at zero progress, double) |
| repair | 1100 bp | no |
| start grant | 216 c | no |
| quote lock / drift | 120 ticks / 600 bp | no |
| guard target / band / step | 0.86 / 0.80..0.92 / 140 | no |
| festival discount | 1200 bp | no |
| 2^31, 2^32, 2^53 | integer limits | not donor constants; they are the 32-bit and 53-bit limits |
Disclosure: I found no coincidence with any donor number, [P] or otherwise. The check covers only numbers visible in the digest excerpts; donor numbers in the cut parts of the notes were not seen.

## 9. Questions for Dom (at most 6)

1. Is a player market or auction in scope at launch, or vendor-only first? (The swgemu note says the rulings have no market slot; the parts are ready as P08 but nothing needs them for E0 or E1.)
2. Where should taxes go: burned, or into a zone treasury that pays for festival discounts (N5)?
3. Should a wallet cap with slow decay exist in the default experience, or only in the Iron season (E3)?
4. Should the inflation guard adjust vendor prices by itself (auto) or only alert a human (alert)?
5. Are duel wagers outside the Pit wanted (N9), given the Pit stays frozen?
6. Is one currency a firm rule, including for any future paid currency, or may a second typed asset sit in the same ledger?

*End of brainstorm. Nothing is built; every number is a proposal awaiting measurement.*
