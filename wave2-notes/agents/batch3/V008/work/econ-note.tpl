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
@@SKETCH@@
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

Reuse tag: rewrite-from-idea (LGPL/GPL: clean-room; shape only)
Brief rule served: one ledger and server-verified outcomes; parity row 18 (closest row, not an exact match).

Best transferable idea: a listing fee that scales with listing duration and a buy-now that ends the lot at once, both settled server-side by one ledger with the balance check the donor skips.
Decision (proposed): adapt — the fee-by-duration and buy-now shape are plain server rules and fit one ledger, but the mail settlement, the missing balance check and the untaxed remainder must not be copied.
Acceptance: server test: a 12-hour lot with a 500,000-copper buyout charges 10,000 copper (2%); a 1,000-copper bid from a 500-copper balance is rejected and the balance stays 500; a 15-copper sale credits 13 and the test asserts the remaining 2 copper go to a named tax entry.
