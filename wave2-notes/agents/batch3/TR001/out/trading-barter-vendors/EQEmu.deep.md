# EQEmu (trading-barter-vendors, cell 2)

Donor: `/mnt/frankendom-donors/EQEmu/zone/trading.cpp` | Licence: GPL-3.0-or-later (per the trading.cpp header: "either version 3 of the License, or (at your option) any later version"; repo LICENSE.md is GPL v3) | C++ | symbol `Client::FinishTrade`

Checked: Read in full: `zone/trading.cpp` FinishTrade (319-687) and ResetTrade (196-317), Trade::Start (69-82), Trade::AddEntity (85-152), CheckTradeLoreConflict (689-738), CheckTradeNonDroppable (740-752). Read: `zone/client_packet.cpp` Handle_OP_CancelTrade (4317-4356), Handle_OP_TradeRequest (15675-15720), Handle_OP_TradeRequestAck (15722-15747), Handle_OP_TradeAcceptClick (15428-15502); `zone/inventory.cpp` trade-slot gate (1862-1912), trade add (1993-2004), CheckLoreConflict (171-186); `zone/client_process.cpp` disconnect return (715-727), OPMoveCoin (1280-1610, with the coin-table function at 1262-1278); `zone/client.cpp` PlayerTradeEventLog (12320-12484, the record calls read), CalcNewPriceMod (4239-4284), CalcClassicPriceMod (4163, header only), CalcPriceMod (4285-4294); `zone/mob.cpp` 555-572; the merchant buy and sell lines in `zone/client_packet.cpp` (14225-14245, 14430-14460, 14490-14503, 14670-14690); `common/ruletypes.h` (the Merchant and Character rules). Callers read: `FinishTrade` from TradeAcceptClick (15446-15475), CancelTrade (4334, 4341), disconnect (client_process 718-721), the Mob delete path (mob.cpp 567), and the NPC branch in TradeAcceptClick (15492). `AddEntity` from inventory.cpp 2004 only. Not read: the bazaar and barter bodies (BuyTraderItem 1340-1553, SellToBuyer 1873-2108, ValidateBuyLineCost 3691-3714; only the BazaarAuditTrail header at 1324 was seen), `zone/tradeskills.cpp`, the faction enum order, `GetNPCTypeID` quest EVENT_TRADE scripts, `Client::AddMoneyToPP` body, the rest of PlayerTradeEventLog after 12484. camera_scope: n/a. Confidence: high for the player-to-player trade (read end to end); medium for the price numbers (read, not run; the float truncation is read from the code, not tested). Donor AGENTS.md and CLAUDE.md were not read.

## 1. Mechanism

Trade, in the order the code runs:

- **Ask.** `Handle_OP_TradeRequest` passes the request to the partner's client (client_packet.cpp 15706). A session does not exist yet; the comment says it starts only when the partner's ack arrives (15682). Nothing in this handler checks distance (see section 6).
- **Start.** `Handle_OP_TradeRequestAck` calls `trade->Start` (15743). `Trade::Start` resets and sets Trading (trading.cpp 69-82). An NPC partner that is not engaged starts a trade at once (15710).
- **Offer.** A move into a trade slot is gated in the inventory code. Only cursor items may go in (inventory.cpp 1993); a NoDrop item moved into a trade slot is treated as a hack and the character is kicked (1880, the NoDrop check with WorldKick nearby). The item then goes to `Trade::AddEntity` (2004). AddEntity first resets BOTH sides to Trading (trading.cpp 94-98), then moves the item, or part of a stack, into the trade slot (85-152).
- **Coin.** `OPMoveCoin` rejects negative amounts (client_process.cpp 1288), rejects coin moved out of the trade window (1382), clamps the amount to the source balance (1532), converts between denominations (PP 1000, GP 100, SP 10, CP 1 copper, 1268 and the table at 1265-1278), debits the source (1549), and then checks the destination (1555). A coin move into the trade resets both sides to Trading (1586, 1589) and tells the partner the new total (1592-1595).
- **Accept.** `Handle_OP_TradeAcceptClick` sets this side to TradeAccepted (client_packet.cpp 15431). Only when the partner's state is equal to it (15439) are both set to Completing. Then the gates run in this order:
  1. Lore conflict on either side (15443): both players are cancelled, each gets its items back, and both are reset.
  2. NoDrop item on this side (15451) or the other side (15461): cancelled; the side that has the item gets a "hacking activity" message (15458, 15468).
  3. Otherwise, the trade event is written (15472), then this side finishes with the partner (15474), then the partner finishes with this side (15475), then both are reset.
- **Settle, per side.** `FinishTrade(tradingWith)` runs once per player. Inside it, `other` is the partner. It first credits the partner's offered coin to this side (trading.cpp 330). Then it moves the partner's trade-slot items in three passes:
  1. Bags (354-364): if the bag is NoDrop, or the other side is self, or the receiver has no free slot, the bag goes back to the giver's cursor.
  2. Stacks (396-422): partial stacks merge into the receiver's existing stack up to `StackSize` (396). The rest stays on the giver's stack. If the put fails, the charges are restored (422).
  3. Everything else (479-499): NoDrop or self passes the test (479); a receiver with no free slot gets the item pushed onto the giver's cursor (493); NoDrop items go back to the giver (498-499).
- **Cancel (self).** `Handle_OP_CancelTrade` calls `FinishTrade(this)` (client_packet.cpp 4334). With `tradingWith == this`, the NoDrop override (479) lets the items return to the owner. A cancel is the same settle code with the owner as the receiver.
- **Disconnect.** A client that drops during a trade runs FinishTrade on itself and on the partner, then resets both (client_process.cpp 717-727).
- **Log.** `PlayerTradeEventLog` builds one event with both sides' coin and item lists (client.cpp 12470-12475) and records it for each trader (12481, 12483).

Ticks: none. The trade is driven by client packets and by the disconnect path. No per-frame loop.

## 2. Key functions

- `Client::FinishTrade`: `/mnt/frankendom-donors/EQEmu/zone/trading.cpp` 319-687. One side's settlement against a partner: coin, bags, stacks, items, with the return-to-giver paths.
- `Client::ResetTrade`: same file, 196-317. Used when a trade is reset: coin back to self, items back to bags, and anything with no room is dropped on the ground (211, 311).
- `Trade::AddEntity`: same file, 85-152. Resets both sides to Trading, then moves a stack or item into the trade slot.
- `Client::Handle_OP_TradeAcceptClick`: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 15428-15502. The two-accept gate and the lore, NoDrop and event-log order.
- `Client::OPMoveCoin`: `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` 1280-1610. Coin moves, including into the trade.
- `Client::CheckLoreConflict`: `/mnt/frankendom-donors/EQEmu/zone/inventory.cpp` 171-186. The per-item uniqueness check used by the trade gate.
- `Client::CalcNewPriceMod`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 4239-4284. The charisma and faction price modifier.

## 3. Numbers vs mechanism

Trade rules (exact values from the code):

| Rule | Value or formula | Where |
|---|---|---|
| Settle gate | both states TradeAccepted, then both Completing | client_packet.cpp 15439-15441 |
| Reset on any offer change | both states = Trading (item add and coin move) | trading.cpp 95, 98; client_process.cpp 1586, 1589 |
| Lore conflict | item with LoreFlag, and LoreGroup -1 (same item ID held by the partner) or the same LoreGroup number | inventory.cpp 174-177 (rule for the other side at 15443) |
| Lore message | partner named, with item link (rule on by default) | trading.cpp 704-717; ruletypes.h 229 |
| NoDrop in trade | any trade item not droppable: cancel (and treated as a hack) | trading.cpp 747; client_packet.cpp 15451, 15458 |
| Coin: negative amount | rejected | client_process.cpp 1288 |
| Coin: amount to take | min(source balance, requested) | client_process.cpp 1532 |
| Coin ratios (copper units) | PP 1000, GP 100, SP 10, CP 1 | client_process.cpp 1268 |
| Stack merge cap | the receiver's stack holds at most StackSize; the rest stays with the giver | trading.cpp 396 |
| Full receiver | item goes back to the giver's cursor (settle); to the ground (reset) | trading.cpp 493, 211, 311 |
| Disconnect | items returned, both sides reset | client_process.cpp 717-727 |
| Trade event row | one TRADE event per trader, both sides' coin and items | client.cpp 12470-12483 |

Vendor (NPC) prices, read from the merchant code. Defaults come from ruletypes.h.

| Rule | Formula and numbers | Where |
|---|---|---|
| Sell to player (the merchant sells) | int(Price x SellRate), then x 1.05 (SellCostMod), then x mod (player buys), each step truncated | client_packet.cpp 14233-14241; ruletypes.h 941 |
| Buy from player (the merchant buys) | uint32 price = floor(Price x i x mod_reverse); then price = floor(price x 0.95); then price += 0.5 (no effect) | client_packet.cpp 14433-14444; ruletypes.h 942 |
| Classic buy rounding (for comparison) | floor(Price x i x 0.95 + 0.5) | client_packet.cpp 14455 |
| CHA threshold, indifferent or better | 75 | client.cpp 4262 |
| CHA threshold, apprehensive or worse | 103 | client.cpp 4247 |
| CHA bonus (CHA above threshold) | chaformula = (CHA - T) x -(3.45/100 x 4) = (CHA - T) x -0.138 (percent), capped at -4 | client.cpp 4249, 4264, 4250 (cap; defaults ruletypes.h 943, 945) |
| CHA penalty (CHA below threshold) | chaformula = (T - CHA) x (1.52/100 x 4) = (T - CHA) x 0.0608 (percent), capped at +4 | client.cpp 4255, 4270, 4256 (cap at 4271) |
| Cap reached (defaults) | bonus at CHA 132 (apprehensive) or 104 (indifferent); penalty at CHA 37 or 9 | derived from the slopes above (not run) |
| Modifier used | 1 + chaformula / 100; reverse flips the sign for selling to the merchant | client.cpp 4278, 4280, 4285 |
| Classic mode | a separate curve with a greed term; the SellCostMod and BuyCostMod are not used | client.cpp 4163; ruletypes.h 940 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's accept gate (both sides accept, then lore and NoDrop gates, then settle), the rule that any offer change resets both accept states, and the coin rules (non-negative, clamped to the balance). It changes three things on purpose: (a) settlement is all-or-nothing: every check runs before the first write, and the donor's per-item fallback (an item the receiver cannot take goes back to the giver while the rest trade) is replaced by a cancel with no partial trade; (b) the coin destination is checked before anything is debited (donor debits first and checks after, and its comment says a failed destination loses the coin); (c) offers are a selection from the bag, not moved into a trade slot, so cancel has nothing to return and the donor's stack-merge and bias passes are not modelled. It omits the packets, the per-denomination conversion table, the partial-stack split, the bag-container passes, the event log, the NPC hand-in branch, the disconnect path and the message strings.

```ts
// Licence: GPL-3.0 (donor, EQEmu). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type TradeState = "trading" | "accepted" | "completing";
interface Item { id: string; loreGroup: number | null; noDrop: boolean }
interface Player {
  id: string;
  coin: number;          // balance read from the one ledger (copper-equivalent units)
  bag: Item[];           // items the player owns
  freeSlots: number;     // free bag slots at settle time
  state: TradeState;
  offer: Item[];         // subset of bag
  offerCoin: number;
}
interface Trade { a: Player; b: Player; open: boolean }
type Outcome = "waiting" | "settled" | "cancelled" | "closed";

const MAX_COIN = 2147483647; // int32 cap (data)

// Any change to an offer clears both accept states (donor AddEntity and the coin move both set Trading).
function markDirty(t: Trade): void {
  t.a.state = "trading";
  t.b.state = "trading";
}

function addItem(t: Trade, who: Player, item: Item): boolean {
  if (!t.open) return false;
  if (item.noDrop) return false;                         // donor: NoDrop items cannot enter the trade
  if (!who.bag.includes(item) || who.offer.includes(item)) return false;
  who.offer.push(item);
  markDirty(t);
  return true;
}

function setOfferCoin(t: Trade, who: Player, amount: number): boolean {
  if (!t.open || !Number.isInteger(amount) || amount < 0) return false; // donor: negative amounts dropped
  who.offerCoin = Math.min(amount, who.coin);                           // donor: clamp to balance
  markDirty(t);
  return true;
}

// Lore: the receiver already holds an item of the same lore group.
function loreClash(giver: Player, receiver: Player): boolean {
  return giver.offer.some(
    (i) => i.loreGroup !== null && receiver.bag.some((j) => j.loreGroup === i.loreGroup),
  );
}

// Two accept states must meet; the second accept runs settle once.
function accept(t: Trade, who: Player): Outcome {
  if (!t.open) return "closed";
  who.state = "accepted";
  const other = who === t.a ? t.b : t.a;
  if (other.state !== "accepted") return "waiting";
  t.a.state = "completing";
  t.b.state = "completing";
  const result = settle(t);
  t.open = false;
  return result;
}

// All-or-nothing. Donor settles per item and returns what fails to the giver; this sketch checks first,
// then commits, so a half-finished trade cannot happen.
function settle(t: Trade): Outcome {
  const a = t.a;
  const b = t.b;
  if (loreClash(a, b) || loreClash(b, a)) return "cancelled";
  if (a.offer.some((i) => i.noDrop) || b.offer.some((i) => i.noDrop)) return "cancelled";
  if (!a.offer.every((i) => a.bag.includes(i)) || !b.offer.every((i) => b.bag.includes(i))) return "cancelled";
  if (b.freeSlots < a.offer.length || a.freeSlots < b.offer.length) return "cancelled";

  // Coin: compute both new balances before any write (donor debits the source first).
  const newA = a.coin - a.offerCoin + b.offerCoin;
  const newB = b.coin - b.offerCoin + a.offerCoin;
  if (newA < 0 || newB < 0 || newA > MAX_COIN || newB > MAX_COIN) return "cancelled";

  // Commit: no awaits between these writes.
  const aGive = a.offer;
  const bGive = b.offer;
  a.bag = a.bag.filter((i) => !aGive.includes(i)).concat(bGive);
  b.bag = b.bag.filter((i) => !bGive.includes(i)).concat(aGive);
  a.coin = newA;
  b.coin = newB;
  a.offer = [];
  b.offer = [];
  a.offerCoin = 0;
  b.offerCoin = 0;
  return "settled";
}

// Cancel: nothing moved before settle, so there is nothing to return.
function cancel(t: Trade): void {
  t.open = false;
  t.a.offer = [];
  t.b.offer = [];
  t.a.offerCoin = 0;
  t.b.offerCoin = 0;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file copied to /tmp, exit 0.

Best transferable idea: a trade settles only when both sides accept, any offer change resets both accepts, and the server cancels rather than half-completing when a lore, NoDrop or capacity check fails.

Decision (proposed): adapt — keep the accept-reset gate and the lore and NoDrop cancel gates, and adopt the donor's "cancel is a settle back to the owner" idea in spirit (here: nothing moves until settle); reject the donor's per-item partial settle, because a player must never get less than the confirmed offer without seeing it; fix the coin check order (check the destination before the debit).

Acceptance: Two test players: A offers an item with a lore group that B already holds; B accepts; A accepts; the trade is cancelled with no item moved and both accepts clear. Separately: B's bag is full, both accept, the trade is cancelled and no coin moves. A coin offer of -5 is refused at write; an offer above A's balance is clamped to the balance, and the clamp is shown in the offer before confirm.

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed path; trade is server state and writes through the one settle door, the same as the ModernUO note). Not in src/fight.
- Parity-checklist row: 18 (loot roll and XP award). Trade is the place where item ownership changes between players, so row 18 is the nearest row. No row covers trade directly; Lead should decide whether it gets one.
- Vendor prices (the NPC buy and sell formulas and the CHA modifier) would belong in a separate proposed file, `origins/server/vendor-prices.ts`; that file has no parity row in the checklist.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (settle is the only door); server-verified (the server runs the lore, NoDrop and capacity checks); clean-room only.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the order of operations.
- No server-side range check for player trades in the paths read. `Handle_OP_TradeRequest` (15675-15720) forwards the request with no distance test; `Handle_OP_TradeAcceptClick`, `OPMoveCoin` and the trade-slot move (inventory.cpp 1862-2004) do not test distance either. A grep of zone/*.cpp for a distance or range check tied to a trade found none. Frankendom must cancel a trade on distance, map change or death (the ModernUO donor does this; see its note).
- Partial settle is the donor's default. The per-item fallback (a receiver with no room gets the item back, the rest still trade; trading.cpp 493, 498) can give a player less than the confirmed offer. Frankendom should not copy it. Our sketch cancels instead.
- Coin destination check is after the debit (client_process.cpp 1549, 1555). The donor's own comment (1548) says a failed destination loses the coin. Fix: check capacity before any debit.
- The destination overflow test is not a sound check: `*to_bucket + amount_to_add > *to_bucket` (client_process.cpp 1555) relies on signed int overflow, which is undefined behaviour in C++. Fix: compare against `MAX - amount` before adding.
- Shared-bank platinum is disabled by a rule, and when it is off the client is warned that platinum will be destroyed (ruletypes.h 112; the popup at client_process.cpp 1572, the branch not receipted). The duplication risk is named in the rule; Frankendom has no such path.
- Client-side accept: the donor's Trade::AddEntity and the coin move reset accepts on the server (trading.cpp 95-98; client_process.cpp 1586-1589). That is the lock on change Frankendom needs. Do not rely on the client to reset its own accept.
- Trade event: the trade log is one row with both sides (client.cpp 12470-12483). Frankendom's settle rows already carry this; log the trade as rows, not as a separate event.
- NPC hand-in (the `IsNPC` branch of FinishTrade, trading.cpp 509 to 687, read): the NPC decides what it keeps, and unconsumed items are returned (RuleB AlwaysReturnHandins, ruletypes.h 1160). Relevant to Frankendom's turn-in of quest items; not part of the player trade.
- Vendor prices: the buy-from-player formula has a rounding defect. `price += 0.5` on a uint32 truncates, so the rounding the comment asks for does not happen (client_packet.cpp 14441-14444). The classic branch rounds correctly (14455). Fix: compute in double and round once at the end.
- Vendor prices: the CHA modifier is capped at 4 percent by default (ruletypes.h 943; client.cpp 4250, 4271). Frankendom should expose the slope, threshold and cap as zone data rather than constants.
- Not found in this path: stock refresh for NPC merchants (not read), bazaar and barter bodies (not read; the audit-trail helper exists at trading.cpp 1324), bot patterns and rate limits for trade (not searched), escrow for scheduled duel wagers (not in donor), cross-zone trade (the partner is looked up in this zone's entity list, client_packet.cpp 15675-15690; cross-zone is inferred, not tested).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: one ledger (settle is the only door); server-verified; clean-room only.
