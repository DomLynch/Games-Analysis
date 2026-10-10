# AAEmu-AAEmu (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs` (auction house: post, buy-now, bid, expiry sweep) | Licence: LGPL-3.0 per README.md:36 wording; LICENSE.GPL is GPL-3.0 text; LICENSE.MIT (Rain0Ash 2019) also present; treated as copyleft, clean-room only | C# | symbol `AuctionManager.PostLotOnAuction` / `BidOnAuctionLot` / `RemoveAuctionLotSold`

Checked: Opened AuctionManager.cs lines 1-420 and 596-638 (not read: 421-595, the Save/search/sort helpers). Also read in full: AuctionLot.cs, AuctionBid.cs, AuctionHouseTask.cs, AuctionDuration.cs, MailForAuction.cs; Character.cs 1503-1556 (money helpers); CSAuctionPostPacket.cs, CSBidAuctionPacket.cs; AuctionController.cs 30-62 and 180-210 (web API). Callers: `PostLotOnAuction` has one in-game caller (CSAuctionPostPacket.cs:21), `BidOnAuctionLot` one (CSBidAuctionPacket.cs:23); the web API calls `CreateAuctionLot` and `AddAuctionLot` directly. Grep across AAEmu.Game finds no use of the `AucLowStartMoney` / `AucBidMoneyUnderStartMoney` error codes outside their definition. Confidence high on the post, bid, buy-now and sweep order; the Save and search code was not read.

## 1. Mechanism

- A seller posts a lot with a start price, a buy-now (buyout) price and a duration of 6, 12, 24 or 48 hours (AuctionLot.cs:14; AuctionManager.cs:303-313). The listing fee is charged first, then the item moves into the auction attachments, then the lot is added (AuctionManager.cs:619-635). Fee = buyout x 0.01 x (duration tier + 1), so 1%, 2%, 3% or 4%, capped at 1,000,000 (AuctionManager.cs:29, 619-624). The fee is taken with `ChangeMoney(SlotType.Inventory, -fee)` (627), and on the as-read code path that call cannot fail for lack of money (see Gaps).
- Buy-now: when a bid is at or above the buyout (and the buyout is not 0), the previous top bidder is refunded by mail, the buyer pays the buyout with `SubtractMoney`, and the lot sells at the buyout price (AuctionManager.cs:146-156).
- Bid: a bid is accepted only if it is above the current top bid (158). The previous top bidder is mailed their bid back (160-169), the new bidder is recorded, and the bid is debited with `SubtractMoney` (171-186). The start price is stored but this path never reads it (AuctionManager.cs 130-188 read in full).
- Expiry: a 5-second task (388) selects lots whose end time has passed (287). A lot with a top bidder sells at the top bid; a lot without one returns the item to the seller by mail (292-294, 60-89).
- Sale: the seller gets 90% of the sale price, rounded down by the `(int)` cast (38, 46; MailForAuction.cs:124 attaches the share). The rest is written only into the mail body as a tax figure (MailForAuction.cs:104-108, 121-122); nothing credits it to any account.
- Cancel: a lot with no bids is returned to the seller by mail (CancelAuctionLot, 91-123). The listing fee is not refunded, because the cancel path calls no money function (115-117).
- Tick: no per-frame work. The sweep is a timer task on the task manager (388), not a loop inside the fight or the world tick.

## 2. Key functions

- `AuctionManager.PostLotOnAuction`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs` 605-637. Fee formula, cap, charge, item move, add.
- `AuctionManager.BidOnAuctionLot`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs` 130-188. Buy-now branch (146-157) and bid branch (158-187).
- `AuctionManager.RemoveAuctionLotSold`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs` 31-58. The 90% share, the sale mails, then the lot is removed.
- `AuctionManager.UpdateAuctionHouse` (expiry sweep): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs` 284-296; scheduled at 387-388.
- `Character.ChangeMoney` / `SubtractMoney`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/Character.cs` 1503-1556 (the balance check at 1511 runs only when the source slot is Inventory or Bank; the source is `SlotType.None` on the paths above).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee as a share of the buy-now price, growing with listing duration, capped | 1%, 2%, 3%, 4% for 6/12/24/48 h (AuctionManager.cs 619; tiers AuctionLot.cs:14); cap 1,000,000 (AuctionManager.cs:29) |
| Sale proceeds to the seller minus a fixed cut | 0.9 kept by seller (AuctionManager.cs:38); the cut is 0.1 |
| Buy-now ends the lot at once | Threshold: bid >= buyout, buyout != 0 (AuctionManager.cs:146) |
| Outbid: a higher bid replaces the top bid, the old bidder is refunded | Strictly greater than the top bid (AuctionManager.cs:158) |
| Expiry sweep on a fixed timer | 5 s first run, then every 5 s (AuctionManager.cs:388) |
| Lot duration in hours | 6, 12, 24, 48 (AuctionManager.cs:306-313) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for posting (fee first, lot added last) and for the sweep, and it adds the balance check the donor's debit paths lack. It reorders the buy-now and bid paths so the new bidder is debited before the old bidder is refunded (the donor refunds first). It leaves out items, mail, the seller-mail ClientName condition (AuctionManager.cs:43), the web API path, the bid-on-own-lot case, and the start price (the donor does not enforce it either). The 10% remainder is simply not credited, as in the donor, and the sketch says so in code.

```ts
// Licence: LGPL-3.0 (README) / GPL-3.0 (LICENSE.GPL) (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type DurationTier = 0 | 1 | 2 | 3; // 6 h, 12 h, 24 h, 48 h

const HOURS: Record<DurationTier, number> = { 0: 6, 1: 12, 2: 24, 3: 48 };
const LISTING_FEE_CAP = 1000000; // copper units, as the donor's MaxListingFee
const SELLER_KEEP = 0.9;         // seller share of a sale; the rest is the trade tax

interface Lot {
  id: number;
  seller: number;
  buyout: number;               // 0 = no buy-now
  tier: DurationTier;
  endsAt: number;               // ms timestamp
  topBid: number;
  topBidder: number | null;
}

interface Ledger { balance: Map<number, number>; }

function listingFee(buyout: number, tier: DurationTier): number {
  return Math.min(Math.floor(buyout * 0.01 * (tier + 1)), LISTING_FEE_CAP);
}

// The debit the donor's in-game paths lack: refuse when the balance would go negative.
function debit(l: Ledger, who: number, amount: number): boolean {
  const bal = l.balance.get(who) ?? 0;
  if (amount < 0 || bal < amount) return false;
  l.balance.set(who, bal - amount);
  return true;
}

function credit(l: Ledger, who: number, amount: number): void {
  l.balance.set(who, (l.balance.get(who) ?? 0) + amount);
}

// Post: the fee is taken first; the lot exists only if the fee was paid.
function postLot(l: Ledger, lots: Map<number, Lot>, lot: Lot, now: number): boolean {
  if (!debit(l, lot.seller, listingFee(lot.buyout, lot.tier))) return false;
  lot.endsAt = now + HOURS[lot.tier] * 3600000;
  lots.set(lot.id, lot);
  return true;
}

// Sale: seller gets 90 percent, rounded down. The remainder is not credited to anyone.
function settleSale(l: Ledger, lot: Lot, price: number): void {
  credit(l, lot.seller, Math.floor(price * SELLER_KEEP));
}

type BidOutcome = "buyNow" | "bid" | "rejected";

// Buy-now at or above the buyout ends the lot. Otherwise a bid must beat the top bid.
// The donor refunds the old top bidder before debiting the new one; here the debit comes first,
// so a failed debit changes nothing.
function bidOn(l: Ledger, lots: Map<number, Lot>, lot: Lot, bidder: number, amount: number,
               refund: (who: number, amount: number) => void): BidOutcome {
  if (!lots.has(lot.id)) return "rejected";
  if (lot.buyout !== 0 && amount >= lot.buyout) {
    if (!debit(l, bidder, lot.buyout)) return "rejected";
    if (lot.topBidder !== null) refund(lot.topBidder, lot.topBid);
    settleSale(l, lot, lot.buyout);
    lots.delete(lot.id);
    return "buyNow";
  }
  if (amount <= lot.topBid) return "rejected";
  if (!debit(l, bidder, amount)) return "rejected";
  if (lot.topBidder !== null) refund(lot.topBidder, lot.topBid);
  lot.topBidder = bidder;
  lot.topBid = amount;
  return "bid";
}

// Expiry sweep (the donor runs it every 5 s): a lot with a top bidder sells, otherwise it returns to the seller.
function sweepExpired(l: Ledger, lots: Map<number, Lot>, now: number,
                      returnItem: (seller: number, lotId: number) => void): void {
  for (const lot of [...lots.values()]) {
    if (now <= lot.endsAt) continue;
    if (lot.topBidder !== null) settleSale(l, lot, lot.topBid);
    else returnItem(lot.seller, lot.id);
    lots.delete(lot.id);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/auction.ts` (new; the path is a proposal, not checked against the repo). Server-side market, settled through the one ledger, not in src/fight.
- Parity-checklist row 18 (loot roll and XP award; ledger). This is the closest row: the addendum has no economy or trade row, so this is a fit by ledger rules, not a true row match. Flagged for Lead.
- Reuse tag: rewrite-from-idea (LGPL/GPL: clean-room; shape only)
- Brief rule served: one ledger and server-verified outcomes (Frankendom rulings); parity row 18 as the closest row.

## 6. Gaps and risks

- Balance check missing on the in-game money paths. `ChangeMoney(SlotType.Inventory, -fee)` (AuctionManager.cs:627), `SubtractMoney` for buy-now (155) and for a bid (181) all reach `ChangeMoney` with `SlotType.None` as the source (Character.cs:1503, 1555). The only balance check is inside the `typeFrom` switch (1508-1527), so it never runs for these calls. `Money` is `long` (Character.cs:107) and nothing clamps it, so, as read, a bid or listing can drive a balance below zero. Frankendom must check the balance on the server before any debit. Not tested.
- Start price is never checked on bids. `StartMoney` is stored (AuctionLot.cs:38) but `BidOnAuctionLot` only compares against `BidMoney` (AuctionManager.cs:158). The bid's client packet gives the amount with no server floor.
- Listing fee is not refunded on cancel (115-117) or on expiry (FinalizeForFail attaches only the item, MailForAuction.cs:175-178). The donor is consistent in this, so it is a design choice, but it is a sink.
- Rounding loss: with the 0.9 share, a sale of 15 copper credits 13 (`(int)13.5`) and shows 1 as tax (`(int)1.5`); that copper is credited to nobody (AuctionManager.cs:38, 46). The donor's 10% cut is display-only; Frankendom's one ledger must make the cut an explicit entry or no cut at all.
- Seller can bid on their own lot. Nothing in `BidOnAuctionLot` (130-188) blocks it (read in full).
- Settlement by mail (the item and the money arrive in a later mail) adds a second path that is not on the ledger. For Frankendom this is a reject; settle directly.
- Web API path (AuctionController.cs:54-57, 203-206) adds lots with no fee and no money check. That is an admin shortcut; it must not reach production rules.
- Fits a fighting game poorly. Frankendom has no market in the brief; this is a clean-room design for later, not a fight rule.

Best transferable idea: a listing fee that scales with listing duration and a buy-now that ends the lot at once, both settled server-side by one ledger with the balance check the donor skips.
Decision (proposed): adapt — the fee-by-duration and buy-now shape are plain server rules and fit one ledger, but the mail settlement, the missing balance check and the untaxed remainder must not be copied.
Acceptance: server test: a 12-hour lot with a 500,000-copper buyout charges 10,000 copper (2%); a 1,000-copper bid from a 500-copper balance is rejected and the balance stays 500; a 15-copper sale credits 13 and the test asserts the remaining 2 copper go to a named tax entry.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All checked claims hold: fee formula and 1,000,000 cap (29, 619-624) with (int) cast (627), post order (fee, item to AuctionAttachments, AddAuctionLot 619-635), buy-now branch 146-157, bid branch 158-187 (refund mail then record then SubtractMoney), strict > top bid, expiry query 287 and 5 s timer 388, 90 percent share rounded (38,46) with tax figure (int)(soldAmount-moneyAfterFee) only in mail text (MailForAuction 104-124), cancel with no refund (115-117), fail mail attaches only item (175-178), ChangeMoney balance check only in the typeFrom switch (1508-1527) so SlotType.None callers skip it (1503, 1555), Money is long (107), StartMoney unused in bid path, durations 6/12/24/48 (303-313), README LGPL text at line 36, callers at CSAuctionPostPacket:21 and CSBidAuctionPacket:23. Sketch is a reasonable corrected shape and declares its reordering.

**Missed:** CancelAuctionLot (91-123) never checks that the caller is the seller (player only used to send the cancel packet); RemoveAuctionLotFail has a redundant 'BidderName != empty' sold branch (65-69). Neither noted.
