# rathena-rathena (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` | Licence: GNU GPL, version 3 (LICENSE file, "GNU GENERAL PUBLIC LICENSE Version 3"; each source header says "Licensed under GNU GPL"; clean-room, shape only, no line-by-line translation) | C++ | symbols `mapif_parse_Auction_register`, `mapif_parse_Auction_bid`, `auction_end_timer`, `auction_create`, `inter_auctions_fromsql`, with the map-side halves `clif_parse_Auction_register` (src/map/clif.cpp), `intif_parse_Auction_register` and `intif_parse_Auction_bid` (src/map/intif.cpp)

Checked: The cell had no file hint (INFERRED), so I searched with grep for auction, vending, zeny and refine. Candidates opened: src/char/int_auction.cpp (1-260, 315-486, the whole mechanism; 261-314 and 487-514 not read), src/map/clif.cpp (16979-17000, 17072-17200), src/map/intif.cpp (2765-2795, 2821-2836, 2887-2935; the close handler 2862-2886 not read), src/map/vending.cpp (1-3, 96-122), src/map/skills/merchant/skill_vending.cpp (all 35 lines, a stub that opens the vending UI), src/map/battle.cpp (config rows only). Mail internals (src/char/int_mail.cpp) read at the signature only. Callers: `intif_Auction_bid` has one caller in the code searched (clif.cpp:17197). Confidence: high on the order of operations and the numbers I cite; medium on the outcome when a player is offline, which I read from the code paths only. No tests were run. camera_scope: not applicable (economy topic).

## 1. Mechanism

A server-side auction house split across two servers. The map server holds each player's zeny and items. The char server holds the listings (rows in SQL plus an in-memory map keyed by auction id) and the end timers. Every zeny movement is a call to `pc_payzeny` or `pc_getzeny` tagged with `LOG_TYPE_AUCTION`, so the donor logs its money through one tag.

- Listing (map first, then char). The map checks the item, the price, and that hours are in 1..48 (clif.cpp:17096), refuses a start price at or above the buyout price (clif.cpp:17091), caps the buyout at `auction_maximumprice` and pulls the start price to buyout minus 1 if needed (clif.cpp:17112-17115), and checks that the seller has `hours x fee` zeny (clif.cpp:17107). It then sends the row to the char server, and as soon as the send succeeds the map removes the item (clif.cpp:17144, 17150) and takes the fee `hours x auction_feeperhour` (clif.cpp:17148, 17153). The char server's answer comes later. The char server refuses a new listing when the seller already has 5 open ones (the test is `< 5`, int_auction.cpp:333). A refused row comes back with auction id 0, and the map gives the item back and refunds the fee (intif.cpp:2788-2793), but only if the seller is still online on this map server (intif.cpp:2777-2778).
- Timer. The char server stores the end time as `now + hours x 3600` (int_auction.cpp:87) and arms a timer of `hours x 3600000` ms (int_auction.cpp:120-127).
- Bid (map debits first). The map takes the bid amount from the bidder with `pc_payzeny` before sending the bid (clif.cpp:17192, 17197). The char server rejects a bid that does not beat the current price or that comes from the seller (int_auction.cpp:441). It also rejects a bidder who already holds 5 bids unless the bid reaches the buyout price (int_auction.cpp:446). A rejected bid returns the amount to the bidder (intif.cpp:2923).
- Outbid. The previous top bidder is refunded the old price by mail (int_auction.cpp:456). The new bid becomes the price and the buyer (int_auction.cpp:463-465).
- Buyout. A bid at or above the buyout price ends the auction at once (int_auction.cpp:467). The char server returns the overpayment `bid - buynow` to the bidder (int_auction.cpp:469), mails the item to the buyer (471), mails the seller the buyout price (473), and deletes the row (475).
- End by timer. With a buyer, the buyer gets the item and the seller gets the price by mail (int_auction.cpp:152-154). With no buyer, the item goes back to the seller by mail (157). The fee is not returned in either case.
- Cancel. Allowed only when no one has bid (int_auction.cpp:372). It mails the item back with zero zeny (378). The fee is not returned.
- Close (seller ends early with a bidder). The seller gets the price by mail and the buyer gets the item by mail (int_auction.cpp:416-418).
- Restart. Rows are reloaded from SQL. A row whose end time is still ahead gets its timer for the remaining time. A row whose end time has passed fires after 10 s (int_auction.cpp:247-252).

## 2. Key functions

- `auction_create`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 79-134 (end time at 87, timer at 120-127).
- `auction_end_timer`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 146-166 (buyer and seller mail at 152-157).
- `mapif_parse_Auction_register`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 326-344 (5-listing cap at 333).
- `mapif_parse_Auction_cancel`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 355-382 (no bidder at 372; zero zeny at 378).
- `mapif_parse_Auction_close`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 393-423 (sale mails at 416-418).
- `mapif_parse_Auction_bid`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 435-482 (validity at 441, bid cap at 446, outbid refund at 452-461, buyout at 467-477).
- `inter_auctions_fromsql`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_auction.cpp` 180-258 (restart rule at 247-252).
- `clif_parse_Auction_register`: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 17072-17156 (checks 17091-17112, item removal 17150, fee 17148-17153).
- `clif_parse_Auction_bid`: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 17177-17199 (debit at 17192, forward at 17197).
- `intif_parse_Auction_register`: `/mnt/frankendom-donors/rathena-rathena/src/map/intif.cpp` 2765-2795 (refund at 2788-2793).
- `intif_parse_Auction_bid`: `/mnt/frankendom-donors/rathena-rathena/src/map/intif.cpp` 2911-2930 (refund at 2921-2924).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee per time unit, taken up front, refunded only if the listing is refused | 12000 zeny per hour (battle.cpp:8633, default); 1 to 48 hours (clif.cpp:17096) |
| Escrow by debit first, credit back on every refusal path | Refusal credit: `pc_getzeny(sd, bid)` (intif.cpp:2923) |
| Outbid refunds the previous top bid in full | No fee on bids; refund is the old price (int_auction.cpp:456) |
| Buyout closes the auction and returns the excess over the buyout price | Overpayment `bid - buynow` (int_auction.cpp:469) |
| Price cap and start-below-buyout rule | Max price 500000000 (battle.cpp:8634); start capped at buyout minus 1 (clif.cpp:17114-17115) |
| Open-item caps per player | 5 listings per seller (int_auction.cpp:333); 5 bids per buyer (int_auction.cpp:446) |
| Overdue timers after restart fire soon, not never | 10000 ms (int_auction.cpp:250) |
| Fee refund on cancel or sale | None (cancel mails zero zeny, int_auction.cpp:378) |

## 4. TypeScript sketch

simplified: the sketch keeps the escrow shape (debit, then refuse-and-credit), the outbid refund, the buyout excess, the sale and return paths, the cancel rule and the restart catch-up. It differs from the donor in three places. (1) The sketch takes the listing fee before the cap check and refunds it on refusal; the donor's char server checks the cap first and the map takes the fee only after accepting. The net effect is the same. (2) The sketch refunds through the ledger in every refusal path and never depends on a session being online; the donor drops a refusal refund when the seller or buyer is not on the map server (intif.cpp:2777-2778, 2917-2918), so the sketch is not a copy of the donor there. (3) It omits the mail channel, the item and card fields, the SQL persistence, the bound-item check (clif.cpp:17102), the GM check, and the packet glue. The `fee` is not refunded on cancel or sale, as in the donor.

```ts
// clean-room sketch of the donor's rules (GPL-3.0 donor). Written from the described mechanism, not a translation.
interface Listing {
  id: number;
  sellerId: number;
  buyerId: number;      // 0 = no bidder yet
  price: number;        // current top bid, or the start price
  buyNow: number;
  endsAt: number;       // ms epoch
  closed: boolean;
}

// One ledger for all zeny. debit() returns false if the balance is short.
interface Ledger {
  debit(charId: number, amount: number, why: string): boolean;
  credit(charId: number, amount: number, why: string): void;
  giveItem(charId: number, itemId: number, why: string): void;
}

const FEE_PER_HOUR = 12000;     // auction_feeperhour default (battle.cpp:8633)
const MAX_PRICE = 500000000;    // auction_maximumprice default (battle.cpp:8634)
const MAX_LISTINGS = 5;         // int_auction.cpp:333
const MAX_BIDS = 5;             // int_auction.cpp:446
const CATCHUP_MS = 10000;       // int_auction.cpp:250, overdue rows fire after 10 s

function openCount(db: Map<number, Listing>, charId: number, asBuyer: boolean): number {
  let n = 0;
  for (const l of db.values()) {
    if (l.closed) continue;
    if (asBuyer ? l.buyerId === charId : l.sellerId === charId) n++;
  }
  return n;
}

// Listing: the whole fee is taken up front and returned if the listing is refused.
function list(
  ledger: Ledger, db: Map<number, Listing>, nextId: number,
  sellerId: number, price: number, buyNow: number, hours: number, now: number
): Listing | null {
  if (hours < 1 || hours > 48) return null;
  if (price >= buyNow) return null;          // donor refuses before clamping (clif.cpp:17091)
  const cap = Math.min(buyNow, MAX_PRICE);
  const start = price >= cap ? cap - 1 : price;
  const fee = hours * FEE_PER_HOUR;
  if (!ledger.debit(sellerId, fee, "auction-fee")) return null;
  if (openCount(db, sellerId, false) >= MAX_LISTINGS) {
    ledger.credit(sellerId, fee, "auction-fee-refund");
    return null;
  }
  const l: Listing = { id: nextId, sellerId, buyerId: 0, price: start, buyNow: cap,
                       endsAt: now + hours * 3600000, closed: false };
  db.set(l.id, l);
  return l;
}

// Bid: the bid is debited first. Every refusal path credits it back, so no path loses zeny.
function bid(ledger: Ledger, db: Map<number, Listing>, l: Listing, bidderId: number, amount: number): boolean {
  if (l.closed || amount <= l.price || l.sellerId === bidderId) return false;
  if (!ledger.debit(bidderId, amount, "auction-bid")) return false;
  if (openCount(db, bidderId, true) >= MAX_BIDS && amount < l.buyNow && l.buyerId !== bidderId) {
    ledger.credit(bidderId, amount, "auction-bid-refund");
    return false;
  }
  if (l.buyerId !== 0) ledger.credit(l.buyerId, l.price, "outbid-refund");
  l.buyerId = bidderId;
  l.price = amount;
  if (amount >= l.buyNow) {
    ledger.credit(bidderId, amount - l.buyNow, "buyout-excess");
    settle(ledger, l);
  }
  return true;
}

// Ending: a sold listing pays the seller the price and gives the item to the buyer; an unsold one returns the item. The fee is never refunded here.
function settle(ledger: Ledger, l: Listing): void {
  if (l.closed) return;
  if (l.buyerId !== 0) {
    ledger.credit(l.sellerId, l.price, "auction-sale");
    ledger.giveItem(l.buyerId, l.id, "auction-item");
  } else {
    ledger.giveItem(l.sellerId, l.id, "auction-item-returned");
  }
  l.closed = true;
}

// Cancel is allowed only with no bidder, and returns the item only (the fee stays with the house).
function cancel(ledger: Ledger, l: Listing): boolean {
  if (l.closed || l.buyerId !== 0) return false;
  ledger.giveItem(l.sellerId, l.id, "auction-cancel-item");
  l.closed = true;
  return true;
}

// Restart: an ended row is settled after CATCHUP_MS, not dropped.
function resumeTimer(l: Listing, now: number): number {
  return l.endsAt > now ? l.endsAt - now : CATCHUP_MS;
}

export {};
```

## 5. Lands in

- TARGET `origins/economy/auction.ts` (proposed new module; Frankendom repo not read, so the path is a proposal). The escrow shape belongs next to the one ledger: `origins/economy/ledger.ts` (proposed, see the pshenok note).
- Parity-checklist row: 21 (catalogue fields). The donor's fee, price cap, listing caps and hour limits are catalogue-style data. No parity row covers an auction house directly; row 18 (loot roll and XP award) is the nearest row, but nothing here rolls loot or awards XP, so row 18 does not fit.
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room, shape only)
- Brief rule served: one ledger (debit then refund on every refusal path); server-verified (the authority is the server, not the client); zones as data (fee, cap and hour limits per town market).

## 6. Gaps and risks

- Refunds depend on the session. The map drops the register refund if the seller is not on this map server (intif.cpp:2777-2778), and drops the bid refund if the bidder is not (intif.cpp:2917-2918). The char server does not mail the refund in those cases. In that case the zeny or item is lost, unless something not read repairs it. Frankendom's ledger must refund by ledger entry, never by session presence. The sketch does this.
- The char server trusts the map's debit. `mapif_parse_Auction_bid` does not check the bidder's zeny; it trusts the bid amount the map sends (int_auction.cpp:437-438, map debit at clif.cpp:17192). Frankendom's server is the only authority, so this trust does not transfer. It must debit and bid in one transaction.
- Mail is the escrow channel. Outbid money and sale money reach the player by mail (int_auction.cpp:152-157, 416-418, 456, 473), so money sits in a mailbox until the player opens it. Frankendom should credit the balance directly and show the history in the ledger, not in mail.
- Fee is a pure sink. The listing fee is never returned on cancel or sale (int_auction.cpp:378; the sale mail carries only the price). That is a clean inflation control; the donor does not state it as a design goal (not read). If Frankendom adopts it, make the refund ratio a data field set to 0.
- Hard-coded limits. The 5-listing and 5-bid caps (int_auction.cpp:333, 446) and the 10 s catch-up (int_auction.cpp:250) are literals, not config. Frankendom should make them catalogue or zone data.
- Order of debit and checks. The bidder's zeny is debited on the map (clif.cpp:17192) before the char server runs its checks, including the 5-bid cap (int_auction.cpp:446). Every refusal therefore depends on the refund path above, which can fail as noted. The sketch takes the same debit, but refunds through the ledger on every refusal.
- Not read: the close handler on the map (intif.cpp:2862-2886), the list paging (int_auction.cpp:260-314), and the mail internals. Whether the item can duplicate on a failed close was not checked.

Best transferable idea: Debit the bid first and credit it back on every refusal path, refund the outbid price and return the buyout excess through the same ledger, with the listing fee as a non-refunded sink.
Decision (proposed): adapt — the escrow and fee shape fits the one-ledger ruling and gives a non-refunded listing sink for inflation control, but the session-dependent refunds and the mail-as-escrow channel do not fit server-verified play, so the refund must always be a ledger entry.
Acceptance: a server test with two bidders and one seller asserts, after outbid, buyout, cancel-refused, a refused listing, and a restart with an overdue row, that the sum of all balances plus the fee sink equals the start total, and that each item is delivered exactly once, even when a party is offline.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: one ledger, server-verified; zones as data; catalogue fields (row 21)
