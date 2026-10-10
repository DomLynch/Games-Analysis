# azerothcore-azerothcore-wotlk (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/AuctionHouse/AuctionHouseMgr.cpp` (with `src/server/game/Handlers/AuctionHouseHandler.cpp`) | Licence: GNU GPL v2 (LICENSE, "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") | C++ | symbol `AuctionHouseMgr::GetAuctionDeposit` (with `HandleAuctionSellItem`, `HandleAuctionPlaceBid`, `HandleAuctionRemoveItem`, `AuctionHouseObject::Update`)

Checked: read `AuctionHouseMgr.cpp` 34-38 (constants and timer), 92-115 (deposit), 150-322 (all mail payout paths), 441-457 (update timer), 518-562 (expiry loop), 568-585 (cut and outbid step). Read `AuctionHouseHandler.cpp` 117-200 and 225-330 (create), 425-593 (bid and buyout), 594-668 (cancel). Read `Util.h` 52-55 (`CalculatePct`), `WorldConfig.cpp` 117-118 (rates), and the header constants by grep. Not read: `AuctionHouseHandler.cpp` 330-425 (multi-item split path), the list handlers (671-870), `AuctionHouseSearcher`, the mail delivery code, and the AuctionHouse DBC rows that supply `depositPercent` and `cutPercent` (data, not read). Confidence high on the formulas and the payout order; medium on the multi-item path. camera_scope: n/a.

## 1. Mechanism

- A player auction house with two prices: a start bid and an optional buyout. A seller pays a deposit at listing, which comes back only as part of a sale; the buyer's bid is held by the auction row until someone outbids it.
- Listing (`HandleAuctionSellItem`): the duration in minutes is converted to seconds (183) and must be 12, 24 or 48 hours (187-190). The expiry time is now plus the duration times RATE_AUCTION_TIME (262). The deposit is computed (265) and must be affordable (266); it is charged (272) and saved on the listing (313).
- Deposit (`GetAuctionDeposit`, 92-111), in order: base is the item's vendor SellPrice (94). If that is 0 or less, the deposit is the minimum (95-97, read). Otherwise the multiplier is depositPercent x 3 / 100 (99, via `CalculatePct` at Util.h:54). The time term is the number of whole 12-hour periods in the listing time in seconds (100). Deposit = multiplier x SellPrice x count x periods x DepositRate, computed as `((m * MSV * count / 3) * timeHr * 3)` (101); the divide by 3 and the multiply by 3 cancel, so the code is algebraically multiplier x SellPrice x count x periods. It is floored at 100 copper times the rate (108-109).
- Bid (`HandleAuctionPlaceBid`): the price must be above the current bid and at least the start bid (488). Unless it is a buyout, it must be at least the current bid plus the outbid step (493), where the outbid step is 5 percent of the current bid, minimum 1 copper (`CalculateAuctionOutBid`, 582-584). The bidder must hold the price (499). The previous bidder is mailed back their bid (517, mail with money at 296). The new price is charged (518). The row is saved inside one transaction, begun at 506 and committed with the gold save at 589.
- Buyout (same handler, 557 onward): the buyer pays the buyout, less their own bid if they are already the top bidder; the previous bidder is refunded; the bid becomes the buyout; the sale-pending mail (566), the successful mail (567) and the won mail run in the same transaction; the auction is removed.
- Sale payout (`SendAuctionSuccessfulMail`, 187-243): the seller's money is profit = bid + deposit - cut (194), sent as mail money (216). The item goes to the buyer by the won mail.
- Cut (`GetAuctionCut`, 568-571): CalculatePct(bid, cutPercent) x CutRate, floored at 0 (570-571). The cut is taken from the sale, so the house keeps it.
- Expiry (`AuctionHouseObject::Update`, 518-562): the auction map is scanned every minute (timer at 38-39 and 441-447). The check uses now + 60 seconds (520), so an auction can close up to a minute early. No bidder: the expired mail returns the item and no money (264-265; the mail draft has `.AddItem(pItem)` and no AddMoney). With a bidder: the successful and won mails run (549). Either way the auction row is deleted in the same transaction.
- Cancel (`HandleAuctionRemoveItem`, 594-668): the owner may cancel. If there is a bidder, the owner pays the cut (632-637) and the bidder is mailed back the bid (636, money at 318). The item is mailed to the owner (after 637). The deposit is not returned on cancel: that mail draft adds only the item (read).
- Ledger: all money moves are `ModifyMoney` on a character, or money in a mail, saved in the same transaction. The auction house has no gold balance. An open bid is held in the auction row. The deposit and the cut are sinks. The deposit is returned to the seller only as part of a sale (194).

## 2. Key functions

- `GetAuctionDeposit`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/AuctionHouse/AuctionHouseMgr.cpp` 92-111. Deposit formula, minimum, and the time term.
- `AuctionEntry::GetAuctionCut` and `CalculateAuctionOutBid`: same file, 568-585. Cut and outbid step.
- `SendAuctionSuccessfulMail`: same file, 187-243. Profit = bid + deposit - cut, sent as mail money (216).
- `AuctionHouseObject::Update`: same file, 518-562. Expiry loop with a 60-second look-ahead.
- `HandleAuctionSellItem`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/AuctionHouseHandler.cpp` 117-330 (read in parts). Duration check, batch sum (225), deposit per item (258-272), listing save (313).
- `HandleAuctionPlaceBid`: same handler, 425-593. Bid and buyout branches, one transaction.
- `HandleAuctionRemoveItem`: same handler, 594-668. Cancel with cut and bidder refund.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing deposit proportional to base value x count x listing time, with a floor | depositPercent x 3 / 100 (theirs, AuctionHouseMgr.cpp 99); 12-hour time unit (100); floor 100 copper (34, 108) |
| Deposit scaled by a server rate | Rate.Auction.Deposit 1.0 (WorldConfig.cpp 117) |
| Sale cut as a share of the bid, scaled by a server rate, floored at 0 | cutPercent per auction house (data, not read); Rate.Auction.Cut 1.0 (WorldConfig.cpp 118) |
| Minimum raise: 5 percent of current bid, at least 1 copper | 5 (theirs, 582) |
| Allowed durations | 12, 24, 48 hours (handler 187-190; MIN_AUCTION_TIME 12 h, AuctionHouseMgr.h:34) |
| Expiry check interval and look-ahead | 1 minute timer (38); 60-second look-ahead (520) |
| Item count per listing | MAX_AUCTION_ITEMS 160 (AuctionHouseMgr.h:35) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for listing (deposit computed, affordability, charge), bidding (sale check, minimum raise, affordability, refund of the previous bidder, charge), buyout (own bid credit, refund, sale profit), cancel (cut to seller, bid refund, deposit lost) and expiry (60-second look-ahead, profit or nothing). It uses doubles and an explicit floor where the donor uses float and a uint32 cast, so it can differ by a copper at the edges. It credits refunds immediately where the donor sends mail with money in the same transaction. It omits the item and its stack split, the multi-item path, the mail delivery delay, the GM and achievement hooks, the log writes, the two-faction house choice and the trial-account check.

```ts
// Licence: GNU GPL v2 (donor LICENSE). Clean-room sketch of the mechanism, not a translation of the donor.
// clean-room
interface Wallet { gold: number; } // copper; the only balance that listings, bids and sales move

interface HouseTerms {
  depositPercent: number; // per auction house (data)
  cutPercent: number;     // per auction house (data)
  depositRate: number;    // server rate, default 1.0
  cutRate: number;        // server rate, default 1.0
}

const MIN_DEPOSIT = 100; // copper, before the rate

interface Listing {
  sellPrice: number;      // vendor sell price of one item
  count: number;
  startBid: number;
  buyout: number;         // 0 = no buyout
  bid: number;
  bidder: Wallet | null;
  deposit: number;
  expireAt: number;       // seconds
  open: boolean;
}

// Deposit on listing: depositPercent x 3 percent x vendor price x count x whole 12-hour periods, times the rate, never below the minimum.
function deposit(t: HouseTerms, sellPrice: number, count: number, durationSec: number): number {
  const periods = Math.floor(durationSec / 3600 / 12);
  const multiplier = (t.depositPercent * 3) / 100;
  const raw = Math.trunc(((multiplier * sellPrice * count) / 3) * periods * 3 * t.depositRate);
  return Math.max(raw, MIN_DEPOSIT * t.depositRate);
}

function cut(t: HouseTerms, bid: number): number {
  return Math.max(Math.trunc((bid * t.cutPercent) / 100 * t.cutRate), 0);
}

function outbidStep(bid: number): number {
  return Math.max(Math.trunc((bid * 5) / 100), 1);
}

function sellerProfit(t: HouseTerms, l: Listing): number {
  return l.bid + l.deposit - cut(t, l.bid);
}

function list(t: HouseTerms, seller: Wallet, sellPrice: number, count: number, startBid: number, buyout: number, durationSec: number, now: number): Listing | null {
  const d = deposit(t, sellPrice, count, durationSec);
  if (seller.gold < d) return null;
  seller.gold -= d;
  return { sellPrice, count, startBid, buyout, bid: 0, bidder: null, deposit: d, expireAt: now + durationSec, open: true };
}

// Bid or buyout. The affordability check uses the price sent, as in the donor.
function place(t: HouseTerms, l: Listing, bidder: Wallet, seller: Wallet, price: number): 'bid' | 'buyout' | 'refused' {
  if (!l.open) return 'refused';
  if (price <= l.bid || price < l.startBid) return 'refused';
  const isBid = price < l.buyout || l.buyout === 0;
  if (isBid && price < l.bid + outbidStep(l.bid)) return 'refused';
  if (bidder.gold < price) return 'refused';

  if (isBid) {
    if (l.bidder) l.bidder.gold += l.bid;   // previous bid returned (mail in the donor)
    bidder.gold -= price;
    l.bidder = bidder;
    l.bid = price;
    return 'bid';
  }

  // buyout: pay the buyout (less any bid already held), refund the previous bidder, and close the sale
  if (l.bidder === bidder) bidder.gold -= l.buyout - l.bid;
  else {
    bidder.gold -= l.buyout;
    if (l.bidder) l.bidder.gold += l.bid;
  }
  l.bidder = bidder;
  l.bid = l.buyout;
  seller.gold += sellerProfit(t, l); // sale: seller gets bid + deposit - cut
  l.open = false;
  return 'buyout';
}

// Cancel: with a bidder, the seller pays the cut and the bid goes back to the bidder. The deposit is not returned.
function cancel(t: HouseTerms, l: Listing, seller: Wallet): boolean {
  if (!l.open) return false;
  if (l.bidder) {
    const c = cut(t, l.bid);
    if (seller.gold < c) return false;
    seller.gold -= c;
    l.bidder.gold += l.bid;
  }
  l.open = false;
  return true;
}

// Minute tick with a 60 s look-ahead. No bidder: the item goes back and the deposit is lost. With a bidder: the seller gets bid + deposit - cut.
function tick(t: HouseTerms, listings: Listing[], seller: Wallet, now: number): void {
  const checkTime = now + 60;
  for (const l of listings) {
    if (!l.open || l.expireAt > checkTime) continue;
    if (l.bidder) seller.gold += sellerProfit(t, l);
    l.open = false;
  }
}
```

## 5. Lands in

- TARGET `origins/server/auction.ts` (proposed new module, server side; no Frankendom market module was read). Listing, bid, buyout, cancel and expiry run on the server; the client sees the state.
- Parity-checklist row 21 (catalogue fields): the vendor base value comes from the item catalogue, and the deposit and cut rates come from the house entry (data). The payout side (the profit credit and refunds) belongs with row 18 (loot roll and XP award) as the one ledger side.
- Reuse tag: rewrite-from-idea (GPL v2: clean-room, shape only)
- Brief rule served: one ledger (every bid, refund, deposit, cut and profit is one balance move in one server transaction); server-verified (the server computes the deposit, minimum raise and cut; the client sends only the request); zones as data (house rates and durations as data)

Best transferable idea: Hold each open bid in the auction record itself, refund the outbid bidder and settle the sale inside one server transaction, with the deposit and the cut as explicit sinks.
Decision (proposed): adapt - adopt the escrow-in-the-record, single-transaction and minimum-raise rules; adapt the deposit formula to a plain fraction of the catalogue value times the listing time, since the donor's formula has a 3-and-divide-by-3 step that reads as noise and its unit scaling is data we do not have.
Acceptance: a server test lists a 12-hour stack of 2 at vendor value V and charges max(floor, rate x fraction x V x 2); a bid below the top bid plus max(5 percent, 1 copper) is refused; an outbid bidder's gold returns in the same transaction; an unsold listing returns the item and not the deposit; a sold listing pays bid + deposit - cut.

