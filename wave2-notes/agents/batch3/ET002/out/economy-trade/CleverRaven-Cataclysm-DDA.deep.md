# CleverRaven-Cataclysm-DDA (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` | Licence: CC-BY-SA 3.0 (repo `LICENSE.txt`, first line: "licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License"; `npctrade.cpp` itself has no licence header) | C++ | symbol `npc_trading::trade`

Checked: Read `npctrade.cpp` 1-382 in full, `npctrade.h` 1-68 in full, `skill.cpp` 718-725, `npc.cpp` 2154-2290 (sell/buy gates, exchange-freely, credit and willing-to-owe) and 2496-2553 (NPC value), `trade_ui.cpp` 160-340 (balance set-up, recalc, bank, confirm). Not read: faction price rules (`npc::get_price_rules`; premium, markup and fixed-adjustment values), `distribute_items_to_npc_zones`, the failure paths of `i_add` / `i_add_or_fill`, `practice()`, the meaning of the opinion fields `op_of_u.trust/value/fear/anger`. Confidence high on the price chain and the balance formula (each read end to end); medium on the commit order (I read it, but not what the inventory calls do when they fail). Callers (grep only, not read unless stated): `npc_trading::trade` is called from `npctalk_funcs.cpp` 200, 230 and 1142 and `game.cpp` 5443; `trading_price` from `trade_ui.cpp` 63 and 77 (not read) and 228 and 246 (read); `bionic_install_price` from `npctalk_funcs.cpp` 575 and `game_inventory.cpp` 3019 and 3062 (not read). The "price for all callers" statements below rest on those call sites being display or the trade window; the callers at 63, 77, 575 and the game_inventory sites were not opened.

Best transferable idea: a trade price is one pure function of the item's base price and the two parties' stats (a capped skill-gap factor, a capped intelligence term, a 25% weight, round up), and the whole offer is one signed balance checked against a single credit limit.

Decision (proposed): adapt — take the price chain shape and the one signed balance, which fit a server-computed trade; reject the NPC-remembered debt, the bank account and the opinion-based credit, which split the ledger in three places and break "one ledger".

Acceptance: a server test sells an item of base price 100 from an NPC of equal INT to a player whose speech is 2 levels below the NPC and gets 129; with the speech gap reversed it gets 123 (both numbers are output of the clean-room sketch below, which follows the donor formula); a trade that would take the balance below the credit limit is refused and no item leaves either inventory.

## 1. Mechanism

- Price of one trade line, `_trading_price` (`npctrade.cpp` 213-233, anonymous namespace). If the NPC side will not sell (or buy) the item at price 1, the price is 0 (217-223). Otherwise it is `adjusted_price` for the item (225), plus the same calculation for each item inside its standard pockets, recursively, with amount -1 (226-230).
- `adjusted_price` (`npctrade.cpp` 178-209). In order: (a) base = `price_no_contents(true, ...)` (184); (b) if the faction has a price rule for the item, multiply by its premium (186) and, when the seller is an NPC, by its markup (187-189); (c) for a count-by-charges item with amount >= 0, scale by `amount / charges` (191-193); (d) if the buyer is an NPC, the price becomes the buyer's `value(item, price)`; otherwise, if the seller is an NPC, the seller's (194-198); (e) if the faction rule has a fixed adjustment it replaces the social adjustment (200-202), otherwise `price *= 1 + 0.25 * adjust` with `adjust` from `net_price_adjustment` (204-205); (f) round up (208).
- Social adjustment, `net_price_adjustment` (`npctrade.cpp` 150-167). `int_diff = seller INT - buyer INT` (161). `int_adj = 1 + 0.05 * min(19, |int_diff|)` (162). `soc_adj = price_adjustment(round(seller speech - buyer speech))` (163-164). `adjust = int_diff >= 0 ? int_adj * soc_adj : soc_adj / int_adj` (165). Return `adjust` if the seller is an NPC, else `-1 / adjust` (166). So an NPC seller prices above base when it is the stronger party, and a player seller gets a value below base.
- Skill factor, `price_adjustment` (`skill.cpp` 720-725). The gap is capped at 5 levels (722). `val = 0.045 s^2 - 0.025 s + 1` (723). Gap >= 0 returns `val`; gap < 0 returns `1 / val` (724). Worked values from the polynomial (my arithmetic, not run): gap 1 gives 1.02, gap 2 gives 1.13, gap 3 gives 1.33, gap 4 gives 1.62, gap 5 gives 2.00.
- Intelligence term: 0.05 per point of INT difference, capped at 19 points, so at most 1.95 (162). Combined with a skill factor of 2.00 the adjust can reach 3.90 before the 0.25 weight; the weight then gives a price multiplier of 1.975 at most. (Arithmetic from the constants; the sketch was run on a 19-point INT gap and gave 149 for a 100 base.)
- NPC value, `npc::value(item, market_price)` (`npc.cpp` 2506-2553). Shopkeepers and the faction currency value at market price (2508-2512). Otherwise a multiplier starts at 1 and adds: weapons `weapon_val * 0.0002` when `weapon_val` (the item's weapon score minus the wielded one) is positive (2514-2522); food, when the NPC will eat it, up to +3.0 for calories and +3.0 for drink, each only when the need is more than twice the item's value (2526-2534); ammo +0.2 when the NPC has a matching gun (2535-2540); books `fun * 0.01` plus `(book level - skill) * 0.1` when the skill is in the NPC's range (2541-2547); a tool it does not own +0.1 (2548-2550). The result is `round(ret * market)` (2552). Dangerous items are valued at -1000 (2498-2499).
- Whether a trade line is allowed at all: `wants_to_sell(it, price)` (`npc.cpp` 2162-2188) refuses worn and trader-kept items (2169-2174), refuses items on the shopkeeper's no-sell groups (2176-2184), and otherwise succeeds only for a non-negative price (2187). `wants_to_buy(it, price)` (2196-2232) refuses dangerous items and active bombs (2198-2200), filthy items (2211-2213), items on the blacklist or outside the whitelist (2215-2228), and otherwise requires a non-negative price (2231). Both were read in full.
- The offer balance, `trade_ui` (`trade_ui.cpp`). On open: `_cost = trader.op_of_u.owed - cost` (167), `_balance = _cost` (169), `_bank = you.cash` (170). Each change recalculates both panes' values: each pane sums `trading_price` with the buyer and seller set by pane (225-229). Then `_balance = _cost + values[you] - values[trader] + _delta_bank` (231), only when the trader is not a free exchanger (230). The sign convention: a positive balance is credit, shown as "Credit" (338), meaning the trader owes the player.
- The bank. `bank_balance` (255-269) is refused unless the `CAPITALISM` option is on (257-258). It moves the rest of the balance into or out of the bank: `_delta_bank = -(_balance - _delta_bank)` (262), a withdrawal is clamped to the bank balance and to zero (263-266).
- Accept check, `_confirm_trade` (301-327). Refused if `balance + max_credit_extended < 0` (305-311). Refused if the NPC has no pocket for the player's items (312-314). If the NPC would not remember the whole balance, the player is asked whether to continue at the NPC's willing-to-owe limit (315-320). Otherwise the player is asked "Looks like a deal" (322-323).
- Debt memory, `calc_npc_owes_you` (`npctrade.cpp` 264-283). A free-exchange NPC owes nothing (267-268). If the balance is above both the current debt and the willing-to-owe limit, the NPC keeps the larger of those two (277-279). Otherwise it keeps the balance (282).
- Credit limits, `npc::max_credit_extended` (`npc.cpp` 2243-2262). Allies: unlimited (2245-2247). Otherwise `max(0, trust*50 + value*50 + fear*50 + altruism*100 + anger*(-200))` (2249-2261). The `op_of_u` fields and `personality.altruism` are opinion and personality values; their scale was not read.
- Willing-to-owe limit, `npc::max_willing_to_owe` (`npc.cpp` 2266-2289). Allies: unlimited (2268-2270). Otherwise `max(0, 10000 + max(0,trust)*10000 + max(0,value)*10000 + max(0,fear)*10000 + max(0,altruism)*10000 + anger*(-10000))` (2272-2288).
- Commit, `npc_trading::trade` (`npctrade.cpp` 294-352). Restock the shop and drop invalid inventory (296-299). Run `trade_ui`. If accepted (304): (1) `transfer_items` for the player's items into an escrow (312-313). A player-held item is removed from the player at once and copied into escrow (104-111, escrow branches 87-91). (2) `transfer_items` for the NPC's items to the player, no escrow (314). Held items are removed from the NPC at once (104-111), and items not held by the NPC are tagged `trade_amount` or `trade_charges` for removal later (113-118). (3) Escrow goes to the NPC: `distribute_items_to_npc_zones` for a shopkeeper (316-317), otherwise `i_add` (319-321). (4) Tagged map items are charged down or removed (324-342). (5) If the NPC is not a free exchanger: the player's cash drops by `delta_bank` (346), `update_npc_owed` stores the new debt and adds `value_you` to the NPC's sold total (347, 286-287), and speech is practised by `value_you / 10000` (348).

## 2. Key functions

- `npc_trading::trade`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` 294-352. The commit: escrow, swap, debt update, speech practice.
- `npc_trading::transfer_items`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` 40-122. Moves each line; escrow only when the NPC is the destination (43, 87-91).
- `npc_trading::adjusted_price`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` 178-209. Base, faction rules, charge scaling, NPC value, social adjustment, round up.
- `npc_trading::net_price_adjustment`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` 150-167. INT term, speech term, NPC or player seller sign.
- `price_adjustment`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` 720-725. Skill-gap polynomial with the 5-level cap.
- `npc::value`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npc.cpp` 2496-2553. NPC's own multiplier on market price.
- `npc::max_credit_extended` and `npc::max_willing_to_owe`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npc.cpp` 2243-2262 and 2266-2289. Credit and debt limits from opinion.
- `trade_ui` balance: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/trade_ui.cpp` 164-171 (initial), 221-234 (recalc), 255-269 (bank), 301-327 (confirm).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = base x (1 + weight x social adjust), rounded up | Weight 0.25 (theirs, npctrade.cpp 205); round up (208) |
| Skill gap, capped at 5 levels, quadratic factor, reciprocal for the weaker party | 0.045, -0.025, +1; cap 5 (theirs, skill.cpp 722-724). Factor tops out at 2.00 |
| Intelligence term, per point, capped | 0.05 per point, cap 19 points (theirs, npctrade.cpp 162) |
| Seller sign: NPC seller uses the value, player seller uses -1/value | Sign rule (theirs, npctrade.cpp 166) |
| Speech practice from trade volume | value / 10000 (theirs, npctrade.cpp 348); units as donor |
| Credit limit = weighted sum of opinion terms, floored at 0 | Trust, value, fear 50 each; altruism 100; anger -200 (theirs, npc.cpp 2249-2253) |
| Willing-to-owe limit = base plus weighted opinion terms | Base and per-term 10000; anger -10000 (theirs, npc.cpp 2272-2277) |
| Dangerous item value | -1000 (theirs, npc.cpp 2499; receipt not possible, quote under 15 characters, see receipts) |
| NPC value multipliers | Weapon 0.0002 per point; food caps 3.0 each; kcal 0.00005; drink 0.0055; ammo +0.2; book fun 0.01, level gap 0.1; tool +0.1 (theirs, npc.cpp 2522-2550; the +0.2 and +0.1 lines are under 15 characters and have no receipt) |
| Balance = owed - cost + offer value - take value + bank delta | None (the formula, trade_ui.cpp 231) |
| Accept while balance + credit >= 0 | None (the rule, npctrade.cpp 357) |

Checked worked values from the sketch below, which follows the donor formula (these are not donor runs): base 100, equal INT, NPC seller 2 speech levels above the player gives 129; 2 levels below gives 123; player seller to an NPC of equal stats gives 75; NPC 19 INT points above with equal speech gives 149; charge stack 5 of 10 at base 100 with a NPC seller and equal stats gives 63.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the price chain (skill factor, INT term, sign by seller, 0.25 weight, charge scaling, round up) and the signed balance with the credit check. It omits the NPC value multipliers (npc.cpp 2496-2553), the faction premium, markup and fixed adjustment (npctrade.cpp 184-202), the recursive pocket pricing (226-230), the willing-to-owe and debt cap (264-283), the escrow commit and the bank. It uses `Math.round` where the donor uses C `round()`, which differs for negative halves (C rounds half away from zero), and it takes the opinion-based credit limit as an input. The donor's `trade` and `transfer_items` are not sketched because the sketch is about the price and the balance, not the commit.

```ts
// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Party {
  int: number;      // intelligence stat
  speech: number;   // social skill level
  isNpc: boolean;
}

// Skill gap -> multiplier. The gap is capped at 5 levels, so the factor tops out at 2.0.
function skillFactor(gap: number): number {
  const s = Math.min(5, Math.abs(gap));
  const val = 0.045 * s * s - 0.025 * s + 1;
  return gap >= 0 ? val : 1 / val;
}

// Seller-side adjustment. An NPC seller gets the value; a player seller gets its negative reciprocal.
function netAdjust(buyer: Party, seller: Party): number {
  const intDiff = seller.int - buyer.int;
  const intAdj = 1 + 0.05 * Math.min(19, Math.abs(intDiff));
  const socAdj = skillFactor(Math.round(seller.speech - buyer.speech));
  const adjust = intDiff >= 0 ? intAdj * socAdj : socAdj / intAdj;
  return seller.isNpc ? adjust : -1 / adjust;
}

// One item's price. base = market price (already multiplied by any NPC value factor by the caller).
function tradePrice(base: number, buyer: Party, seller: Party, amount: number, charges: number): number {
  let price = base;
  if (amount >= 0) price *= amount / charges; // charge-based stacks
  price *= 1 + 0.25 * netAdjust(buyer, seller);
  return Math.ceil(price);
}

// Signed balance for the whole offer. Positive means the trader owes the player (credit).
// owed = trader's remembered debt; valueYou = what the trader would pay for the player's offer;
// valueTrader = what the player would pay for the trader's offer; bankDelta = bank movement.
function tradeBalance(owed: number, cost: number, valueYou: number, valueTrader: number, bankDelta: number): number {
  return owed - cost + valueYou - valueTrader + bankDelta;
}

// The trader accepts while the balance stays within its credit limit.
function traderAccepts(balance: number, maxCredit: number): boolean {
  return balance + maxCredit >= 0;
}
export {};
```

## 5. Lands in

- TARGET `origins/economy/trade.ts` (proposed new module: server-side price and balance; the Frankendom repo was not opened under the batch rules, so this path is a proposal and not checked against the tree).
- Parity-checklist row 21 (catalogue fields): the base price, the charge and stack fields and the value multipliers are catalogue fields.
- The escrow commit (`npc_trading::trade`) fits no row 1-23. It is none. A server-side commit belongs with the one-ledger transaction, not in the checklist.
- today: no economy module is referenced in this note (repo not read).
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only, shape not text).
- Brief rule served: one ledger, server-verified (Frankendom ruling); zones as data for the price fields; rules 7-9 n/a.

## 6. Gaps and risks

- Licence CC-BY-SA 3.0 is copyleft: clean-room only; the sketch is written from the described mechanism.
- One ledger: the donor keeps money in three places. The NPC remembers the debt (`npctrade.cpp` 286, `update_npc_owed`), the player holds cash (346), and there is an optional bank (`trade_ui.cpp` 257-267). Frankendom must keep one ledger, so the debt memory and the bank do not transfer. Only the balance formula survives, and only over one ledger.
- Server-verified: the donor computes the price and the balance in the client that shows the trade window (`trade_ui.cpp` 225-231 use local values). Frankendom must compute the price on the server and let the client only show it. The donor gives no evidence of how it would stay honest over a network.
- Commit order and failure: the player's items leave the player first (`npctrade.cpp` 104-111) and the NPC's items are added second (314), with no rollback and no check that the receiving side can take the items (the `i_add` failure path was not read). Frankendom must validate both sides and then commit in one server transaction.
- Credit by opinion (npc.cpp 2249-2261) is a relationship mechanic. For a fight-first game it adds a second economy state per NPC. Reject unless Frankendom wants NPC credit as data; the accept rule (npctrade.cpp 357) is the part that transfers.
- The stats are the donor's speech and INT. Frankendom has no such stats in the duel, so the shape transfers with a stat named in the data (for example a barter stat) and the cap (5 levels) and weight (0.25) as zone or catalogue data. Do not hard-code the donor constants.
- `Math.round` in the sketch is not C `round()` for negative halves; Frankendom needs one rounding rule on the server, tested.
- Faction price rules (premium, markup, fixed adjustment) are data the donor reads per faction (`npctrade.cpp` 182-202). Not read beyond the calls. If Frankendom takes this, they become zone data, not engine constants.
- The worked numbers (129, 123, 75, 149, 63) come from the sketch, not from the donor. Re-check them against the Frankendom catalogue before a test uses them.
