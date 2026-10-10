# smogon-pokemon-showdown (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/chat-plugins/auction.ts` | Licence: MIT (`/mnt/frankendom-donors/smogon-pokemon-showdown/LICENSE`, first line "The MIT License (MIT)", copyright 2011-2026 Guangcong Luo and other contributors) | TypeScript | symbol `Auction` (class; `bid`, `finishCurrentNom`, `pokeBidTimer`, `undoLastNom`)

Checked: Read in full: lines 1-160 (Team, Auction fields, parseCredits), 280-340 (setters), 415-440 (assignPlayer, addTeam), 494-780 (credit change, start, reset, next, nominate, bid, chat bid handlers, skip, finish, undo, timers, end), and the undo command (line 1096, read in the grep output; 1092-1095 not printed). Not read: 160-280 (table and render helpers), 340-415, 440-494, 781-1091, 1092-1095, 1097-1189 (help text, room settings). Confidence: high on the open and blind auction core. The snake-mode undo defect is read from the code and was not run. Camera scope: not applicable.

## 1. Mechanism

A sequential, one-lot-at-a-time auction for a team draft. Each team holds a credit balance, set to `startingCredits` (line 35; the `Auction` default is 100000 at line 115). One lot runs in this order:

(a) Nomination. `next()` (541-556) walks the queue until it finds a team that is not suspended (549-552), posts its turn and starts the nomination timer if one is set (555). A team is suspended when its credits fall below `minBid` or it has reached `maxPlayers` (62-71; snake drafts use `minPlayers` instead). `nominate()` (558-592) clears the nomination timer, moves the state to `bid`, sets the opening price to `minBid` and makes the nominating team the provisional top bidder (578-579), then starts the bid timer (590).

(b) Bidding. `bid()` (594-627) rejects the bid unless the state is `bid`, the bidder manages a team and that team is not suspended (595-598). It also rejects an amount above `maxBid()` (600). In open mode the amount must beat the current top bid (621). An accepted bid sets the top bid and top bidder, and restarts the bid timer at its full length (625). `startBidTimer` calls `clearBidTimer`, which sets the remaining time back to the limit (709), then starts a 1-second `setInterval` (715-717). No credits move on a bid; they move only on the sale.

(c) Reserve rule (`Team.maxBid`, 73-75). The spendable amount is `credits + minBid * min(0, players - minPlayers + 1)`. For each mandatory roster slot still unfilled, beyond the lot being bid on, the team keeps one `minBid` back. A team with 8 of 10 mandatory players can bid its whole balance minus one `minBid`, which covers the last slot. The same rule blocks a credit change that would leave a team unable to fill its roster (505-507) and stops the start if any team is below it (515-517).

(d) Bid timer. `pokeBidTimer()` (732-742) subtracts one each interval (733). At zero it calls `finishCurrentNom()` (734-735). Warnings go out at multiples of 30 seconds and at 20, 10 and 5 (738). The nomination timer works the same way and at zero calls `skipNom()` (720-723).

(e) Sale. `finishCurrentNom()` (663-680) announces the sale (676), calls `highestBidder.addPlayer(nominatedPlayer, highestBid)` (677), clears the bid timer (678) and calls `next()` (679). `addPlayer` (46-52) takes the player off any previous team and deducts the price from credits (49).

(f) Freeze. Credits cannot change while a nomination is open (498), and players cannot be assigned during one (416). Only one lot is open at a time (559 rejects nominations in state `bid`), so a balance never carries two open commitments.

(g) Undo. `undoLastNom()` (682-692) restores the queue snapshot taken at nomination (564-565). If a player was nominated, it removes that player from `highestBidder` (688) and adds `highestBid` back to that team's credits (689). Only one undo is kept (684).

Blind mode (`type === 'blind'`, set at 326-336): bids are hidden and each team bids once (602-603). A blind bid must be above `minBid` (604) and above the current top bid to take the lead (612). The lot closes early when `bidsPlaced` reaches the team count (617-619).

Snake mode (`type === 'snake'`): no bids. The nominated player goes to the nominating team at price 0 (572-575), and nominations run on a 60-second timer (334).

Bid input: in open mode any chat line that parses as a number is a bid (638-644). `parseCredits` (78-85) reads values under 500 as thousands and requires a multiple of 500.

Turn order: `reset()` (534) and `addTeam()` (436) set the queue to the teams followed by the same teams reversed. Each `next()` shifts a team off the front and pushes it on the back, so turns run in snake order and the cycle repeats.

## 2. Key functions

- `Team.maxBid`: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/chat-plugins/auction.ts` 73-75 (reserve formula).
- `Team.addPlayer` and `removePlayer`: same file 46-60 (price deducted at 49, refunded only by the caller).
- `Auction.next`: same file 541-556 (suspension skip, turn posting, nomination timer).
- `Auction.nominate`: same file 558-592 (opening price and top bidder, bid timer start).
- `Auction.bid`: same file 594-627 (affordability, increment, timer restart).
- `Auction.finishCurrentNom`: same file 663-680 (sale: `addPlayer` at 677, then `next()`).
- `Auction.undoLastNom`: same file 682-692 (refund and removal, 688-689).
- Timers: `clearBidTimer` 707-711, `startBidTimer` 713-718, `pokeBidTimer` 732-742, same file.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Reserve floor: keep one minimum bid per unfilled mandatory slot, excluding the lot being bid on | `minBid` default 3000 (line 95; no receipt, because the only text on that line is 14 characters and the minimum is 15, so this value is read but not receipted); `minPlayers` 10 (line 96) |
| Balance frozen while a lot is open | None; it is a rule (line 498) |
| Bid window restarts at full length on each bid | 10 s (line 335); 30 s for blind (335); allowed range 7-120 s (320) |
| Warnings at multiples of 30 s and at 20, 10, 5 s | Constants at line 738 |
| Nomination timer: off for auction, 60 s for snake | Lines 334 |
| Bid step: multiples of 500; values under 500 read as thousands | Lines 80-81 |
| Credit cap | 10,000,000 (line 502); starting credits 100000 (line 115) |
| Unbid lot: the nominator wins at `minBid` | Lines 578-579 (mechanism) |

## 4. TypeScript sketch

simplified: the sketch uses a wall-clock deadline (`closesAt`) where the donor counts one-second intervals. It starts with no top bidder, so an unbid lot passes, where the donor gives it to the nominator at `minBid` (578-579). It has no blind mode, snake mode, nomination timer, chat parsing or undo of a skipped nomination. The `grant` and `revoke` callbacks stand in for `addPlayer` and `removePlayer`. The balance is frozen while a lot is open because only `close` and `undo` post to the ledger.

```ts
// Licence: MIT (donor: Pokemon Showdown). Written fresh from the described mechanism; not a translation.
type Id = string;

interface LedgerRow { seq: number; account: Id; delta: number; reason: string; }

// One ledger: balances change only through post(), and every change is a row.
class Ledger {
  private rows: LedgerRow[] = [];
  private balances = new Map<Id, number>();
  constructor(private startingBalance: number) {}
  balance(account: Id): number { return this.balances.get(account) ?? this.startingBalance; }
  post(account: Id, delta: number, reason: string): void {
    const next = this.balance(account) + delta;
    if (next < 0) throw new Error("insufficient funds");
    this.balances.set(account, next);
    this.rows.push({ seq: this.rows.length + 1, account, delta, reason });
  }
}

interface Lot { itemId: Id; highest: number; highestBidder: Id | null; closesAt: number; }
interface Sale { buyer: Id; itemId: Id; price: number; }

class LotAuction {
  private lot: Lot | null = null;
  private lastSale: Sale | null = null;
  constructor(
    private ledger: Ledger,
    private minBid: number,       // donor default 3000 (data field)
    private minPlayers: number,   // mandatory roster slots (data field)
    private windowMs: number,     // bid window, reset on every bid (data field)
    private ownedCount: (buyer: Id) => number,
  ) {}

  // Money a buyer must keep for the mandatory slots still unfilled, excluding the lot being bid on.
  reserve(buyer: Id): number {
    return this.minBid * Math.max(0, this.minPlayers - this.ownedCount(buyer) - 1);
  }
  maxBid(buyer: Id): number { return this.ledger.balance(buyer) - this.reserve(buyer); }

  open(itemId: Id, now: number): void {
    if (this.lot) throw new Error("a lot is already open");
    this.lot = { itemId, highest: this.minBid, highestBidder: null, closesAt: now + this.windowMs };
  }

  bid(buyer: Id, amount: number, now: number): void {
    const lot = this.lot;
    if (!lot || now >= lot.closesAt) throw new Error("no lot open");
    if (amount % 500 !== 0) throw new Error("bids are multiples of 500");
    if (amount > this.maxBid(buyer)) throw new Error("cannot afford that bid");
    if (amount <= lot.highest) throw new Error("bid must beat the current bid");
    lot.highest = amount;
    lot.highestBidder = buyer;
    lot.closesAt = now + this.windowMs; // full window again after every bid
  }

  // Called on a timer tick. Closes the lot at its deadline; the sale is one ledger write.
  close(now: number, grant: (buyer: Id, itemId: Id) => void): void {
    const lot = this.lot;
    if (!lot || now < lot.closesAt) return;
    this.lot = null;
    if (lot.highestBidder === null) return; // no bid: the lot passes
    this.ledger.post(lot.highestBidder, -lot.highest, `buy ${lot.itemId}`);
    grant(lot.highestBidder, lot.itemId);
    this.lastSale = { buyer: lot.highestBidder, itemId: lot.itemId, price: lot.highest };
  }

  // Reverses the last sale: refund the price and return the item.
  undo(revoke: (buyer: Id, itemId: Id) => void): void {
    const sale = this.lastSale;
    if (!sale) throw new Error("only one sale can be undone");
    this.ledger.post(sale.buyer, sale.price, `undo ${sale.itemId}`);
    revoke(sale.buyer, sale.itemId);
    this.lastSale = null;
  }
}
```

## 5. Lands in

- TARGET `origins/server/economy/lot-auction.ts` (new module; the path is proposed and was not checked against the repo). One lot at a time, server clock, one ledger write on close.
- Parity-checklist row 18 (loot roll and XP award): the closest row, and only a partial fit. Row 18 covers rolls and XP, and no row covers a market or trade. The close runs from the server tick, so the sub-line is "server tick: fixed step, input intake, per-tick NPC budget".
- Today: not checked; no current Frankendom economy file was read.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch was written fresh from the mechanism)
- Brief rule served: one-character/one-ledger rule (HANDOFF "also usable" list); rules 1-10 n/a

## 6. Gaps and risks

- One ledger: the donor changes `Team.credits` in place (49, 689) and writes no rows. The undo is a hand-written reverse. Our sketch posts a row for every change, and the balance write and the item grant must be one server transaction.
- Server-verified: in open mode a bid is any chat line that parses as a number (638-644), handled by the chat layer, and the team is found by user id (596). Frankendom must take a structured bid command and check it on the server.
- One character, one ledger: a donor team's balance is shared by all its managers (`getManagers`, 40-44). Our wallet belongs to one character, so a shared pool needs its own rule.
- An unbid lot is sold to the nominator at `minBid` (578-579). That is a design choice Frankendom must make on purpose; the sketch passes an unbid lot.
- Undo after a snake pick: `undoLastNom` calls `this.highestBidder.removePlayer` (688), but `highestBidder` is only assigned in open and blind modes (579, 614, 623), so it stays null in snake mode. Read from the code, not run: this is probably a TypeError. Do not copy the undo path without a test.
- Blind early close: suspended teams cannot bid (598) but still count in `this.teams.size` (617), so the early close may never fire and the lot waits for the timer. Read from the code, not run.
- Timer: the bid clock is an interval counter (717, 733) and is not wall-clock time. Our close is a deadline check on the server clock.
- No persistence in the read code: the teams, auction and balances are in-memory fields (24-38, 87-115). A restart loses an open auction. Frankendom's ledger must survive a restart.

Best transferable idea: a timed sealed-price lot where each bid restarts the full window, the buyer's spendable amount excludes a reserve for mandatory costs still owed, and the balance is frozen until one close writes the sale.
Decision (proposed): adapt - the single-lot timed bid and the reserve floor fit a server-side auction, but the chat-text bid channel and the in-memory balance must go, because we need structured commands and an append-only ledger.
Acceptance: a player bids on a lot; each accepted bid restarts the lot timer to its full window; a bid above wallet minus reserve is refused with a message; at zero the item and the gold move in one server write, and one undo reverses both.

- nominate snapshots lastQueue (564-565) BEFORE the player validity checks (567-569), so a failed nomination overwrites the undo snapshot.
- Blind mode takes bids via onChatMessage (629-636, swallows the chat line); open mode uses onLogMessage.
- Nomination time limit range is 7-300 (311) versus bid time 7-120.

## Checker findings

- Verdict: CLEAN. No errors found; cited lines and numbers verified against the donor.
- Corrected: nothing.
- Missed (not in the note):
  - In nominate, lastQueue is snapshotted (564-565) BEFORE the player validity checks (567-569), so a failed nomination overwrites the undo snapshot: an undo-safety defect.
  - Blind mode takes bids via onChatMessage (629-636, swallows the chat line) while open mode uses onLogMessage.
  - Nomination time limit range is 7-300 (311) versus bid time 7-120.
