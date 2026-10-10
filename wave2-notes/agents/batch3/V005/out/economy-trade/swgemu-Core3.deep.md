# swgemu-Core3 (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/auction/AuctionManagerImplementation.cpp` | Licence: AGPL-3.0 (per-file header "See file COPYING"; COPYING read at the repo root: GNU Affero GPL v3) | C++ | symbol `AuctionManagerImplementation::doAuctionBid`

Checked: `doAuctionBid` 1212-1327 (read in full). `checkBidAuction` 992-1006 (read). `doInstantBuy` 1008 (read to the seller credit and city-tax debit, 1194-1201). `addSaleItem` 519 (read to the expiry scheduling, 790-791). `expireAuction` 2169 (read to the winner and mail branch; the seller payout is not in this function). Constants from `AuctionManager.idl` 36-45. Confidence: high on the proxy-bid order of operations, read line by line. Medium on the takeover refund: this is a reading of the statement order, not a run; I did not execute the code. Not read: `buyItem` 1328 (the caller of `doAuctionBid`); `PlayerManager::getPlayer` (only the IDL declaration, line 443); `expireBidAuction` 2135; `retrieveItem` 1488 (where the seller is paid if not on instant buy). camera_scope not applicable.

## 1. Mechanism

- A bid has two numbers: a visible offer (`price1`) and a hidden maximum (`proxyBid`). The visible price is the amount the leader pays now. The leader's maximum is stored as `item->getProxy()`.
- Order of checks in `doAuctionBid`: the offer must beat the current price and the maximum must beat the offer (1214). The owner cannot bid on their own item (1226). Before this, `checkBidAuction` requires the offer to be at least the current price and the bidder's bank to cover the offer (997-1001).
- Challenger below the leader's maximum (`proxyBid < item->getProxy()`, 1235): the leader keeps the lead. The new price is the challenger's maximum plus their increment over the old price (`proxyBid + increase`, 1241-1253). The leader is debited the rise (`fullPrice`, 1241). The stored maximum is not changed (1277 is not reached on this path). The challenger is not debited and gets a success reply. There is a donor TODO on this path for a leader without funds (1243).
- Otherwise (takeover, 1277 onward): the new maximum is stored (1277), the visible price is set to the offer (1290), and the new leader is debited the full offer (1295). If there was a prior leader, that leader is refunded `item->getPrice()` read after the set at 1290, which is the new offer (1305). If there was no prior leader, the first bidder is charged the offer (1316-1320).
- Instant buy (`doInstantBuy`): the buyer is debited the full price; the seller is credited the full price (1194); city tax is computed as `price - price / (1 + rate)` (1022) and debited from the seller (1201).
- Listing (`addSaleItem`): the listing price is raised by the city sales tax (689). A bazaar listing fee is debited from the seller's bank: 20 credits (`SALESFEE`), or 5x for a premium auction (753-755), reduced to 0.80 by `crafting_merchant_sales_01` (745) and to 0.60 by `crafting_merchant_sales_03` (749).
- Expiry: vendor listings expire after 2592000 s, commodity listings after 604800 s (`AuctionManager.idl` 44-45). Each auction item gets an `ExpireAuctionTask` scheduled for its expiry time (790-791). `expireAuction` (2169) sets the item to expire, and if there is a winner it sets the status to SOLD and mails the seller and the buyer with the price.
- Tick: none for bids: they are event-driven, one call per bid. Expiry is a scheduled task per item, not a per-frame loop.

## 2. Key functions

- `doAuctionBid`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/auction/AuctionManagerImplementation.cpp` 1212-1327. Proxy-bid order of operations and the takeover refund.
- `checkBidAuction`: same file, 992-1006. Minimum-price and bank check before a bid.
- `doInstantBuy`: same file, 1008. Full-price debit, seller credit, city-tax split.
- `addSaleItem`: same file, 519-800. Listing checks, city tax on the listing price, bazaar fee, expiry task.
- `expireAuction`: same file, 2169. Winner resolution and mail.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hidden max (proxy): the price moves only to just above the challenger's max, and the leader pays only the rise | The increment is the challenger's offer minus the old price (1241); no bid step constant is in this function |
| Takeover: the new leader pays the visible offer; the old leader is refunded | Refund amount is the donor's `item->getPrice()` after the set (1305); see section 6 |
| Tax by division: `price - price / (1 + rate)` | Rate is `getSalesTax()` (CityRegion.idl 758-759), a per-city value |
| Listing fee with multipliers | 20 credits (`SALESFEE`); premium x5; merchant discounts 0.80 and 0.60 (745-749) |
| Price cap | `MAXBAZAARPRICE` 20000 (`AuctionManager.idl` 36) |
| Expiry by listing type | 2592000 s vendor; 604800 s commodity (`AuctionManager.idl` 44-45) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a bid (price and max check, funds check, challenger-below-leader path with the leader's debit for the rise, takeover path). It omits: the owner-cannot-bid check, the takeover path's own funds check on the new bidder (1269-1270: bank must cover both the offer and the current price), which the sketch folds into its single upfront bidder check, the MAXBAZAARPRICE cap, the mail and the chat messages, the TransactionLog entries, the `getPlayer` lookup and its offline case, and the instant-buy and expiry paths. It also adds a `leaderPaid` field the donor does not keep, and uses it for the refund, so the refund equals the leader's own debit. The donor refunds the new price instead (section 6). The sketch is a corrected version, not the donor's behaviour.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bank { [id: string]: number; }

interface Lot {
  price: number;        // visible current price
  leader: string | null;
  leaderMax: number;    // the leader's hidden ceiling (proxy)
  leaderPaid: number;   // what the leader has been debited on this lot so far (not tracked in the donor)
}

type BidResult = "ok" | "too-low" | "not-enough-credits";

// Visible offer must beat the price; the hidden max must beat the offer.
// A challenger whose max is below the leader's max loses the lead, but moves the price to just above their own max.
function placeBid(lot: Lot, bank: Bank, bidder: string, offer: number, max: number): BidResult {
  if (offer <= lot.price || max <= offer) return "too-low";
  if ((bank[bidder] ?? 0) < offer) return "not-enough-credits";

  if (lot.leader !== null && max < lot.leaderMax) {
    const newPrice = max + (offer - lot.price);   // challenger's max plus their increment
    const charge = newPrice - lot.price;          // the leader pays only the rise
    if ((bank[lot.leader] ?? 0) < charge) return "not-enough-credits";
    bank[lot.leader] -= charge;
    lot.leaderPaid += charge;
    lot.price = newPrice;
    return "ok";
  }

  // Takeover or first bid: the new leader pays the visible offer; the old leader gets back their own debit.
  if (lot.leader !== null) bank[lot.leader] = (bank[lot.leader] ?? 0) + lot.leaderPaid;
  bank[bidder] = (bank[bidder] ?? 0) - offer;
  lot.price = offer;
  lot.leader = bidder;
  lot.leaderMax = max;
  lot.leaderPaid = offer;
  return "ok";
}

export {};
```

## 5. Lands in

- TARGET `origins/economy/auction.ts` (new, only if Frankendom builds a player market). No Frankendom parity row covers a market. Parity row 18 (loot roll and XP award) is the nearest and applies only if bids were used to replace a loot roll, which is not planned. Row 23 does not apply.
- today: no market in Frankendom's rulings (not read in this pass).
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room, shape only; no line-by-line translation)
- Brief rule served: one ledger (the leader's debit and refund are one ledger entry, not two); server-verified kills do not apply to a market, so this rule is n/a here.

## 6. Gaps and risks

- AGPL-3.0 is copyleft: the sketch is written from the described mechanism, not translated.
- Suspected donor bug, a reading of the code order, not run: on takeover the prior leader is refunded `item->getPrice()`, which the code set to the new offer (1290) just before the refund (1305). The prior leader's own debits sum to the old price (case A debits the rise, 1241), so the refund looks like it exceeds what they paid by (new offer minus old price). Confirm with a test before relying on it. A grep of `src/tests` finds no reference to `doAuctionBid`, `AuctionManager` or `proxyBid`.
- Offline leader: the refund is inside `if (priorBidder != nullptr)` (1298-1305). If `PlayerManager::getPlayer` returns null for an offline player, the refund is skipped and the leader's money is not returned. That lookup was not read, so this is unverified.
- The donor's own TODO (1243): a leader without funds in the proxy path is not handled as a case; the challenger gets NOTENOUGHCREDITS.
- Frankendom's one-ledger rule: any money move must be one ledger entry with a balanced debit and refund. The donor splits the refund and the debit across two functions and two bank objects. Do not copy that split.
- The listing fee and tax are rates on a player's bank, not per zone. If Frankendom ever adds a market, these should be zone data (the city rate) and engine constants (the fee).

Best transferable idea: a hidden-maximum (proxy) bid where the leader pays only the rise above the challenger's maximum, with the takeover refund set to the leader's own recorded debit.

Decision (proposed): reject for now. Frankendom's rulings have no market, and the parity checklist has no row for one, so the mechanism would be a feature with no slot. If a market or a bid-for-drop feature is ever approved, adopt the proxy rule and the leaderPaid refund, not the donor's refund.
Acceptance: if built, a server test asserts this case: a lot at 100, leader max 500; a challenger offers 150 with max 300, so the price becomes 350 and the leader's debit is 250 (total 350) with the challenger not debited; then a bidder offers 400 with max 600, and the old leader is refunded 350, not 400.

Reuse tag: rewrite-from-idea (AGPL-3.0, clean-room). Brief rule served: one ledger (refund equals debit).


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Sketch header says it omits 'the bank check on the leader in the takeover path': the takeover check (1269-1270) is on the NEW bidder (player), and the sketch does include a bidder funds check; the leader's check (1244) is in the proxy path and is included. Mislabelled omission. Core claims verified: 1214, 1226, 1235, 1241 (fullPrice=proxyBid+increase-price), 1253, 1277, 1290, 1296, 1305 refund of new price (real overpay bug confirmed), offline-leader skip (1298), 1316-1321, doInstantBuy 1194/1201/1022, MAXBAZAARPRICE 20000, SALESFEE 20, fee multipliers 745/749/753-755, 689, expiry 790-791, IDL 44-45.

**Missed:** expireAuction 2201-2213: no bidder, or winner offline (getPlayer null), routes to expireBidAuction (item treated as unsold) rather than SOLD - an offline winner loses the sale; not mentioned. Proxy path at 1235 also needs priorBidder online (non-null), else any bid falls to takeover path and overwrites the proxy.
