# otland-forgottenserver (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` | Licence: GPL-2.0 (game.cpp header: "governed by the GPL-2.0 License that can be found in the LICENSE file"; LICENSE is GNU GPL version 2, June 1991, no "or later" clause read) | C++ | symbols `Game::playerCreateMarketOffer` (5203), `Game::playerCancelMarketOffer` (5311), `Game::playerAcceptMarketOffer` (5375), `tfs::iomarket::checkExpiredOffers` / `processExpiredOffers` (`src/iomarket.cpp` 111, 187)

Checked: Read in full: `game.cpp` 5203-5373 (create, cancel), 5375-5555 (accept, both sides, history, row update), 5579-5625 (`getMarketItemList`, the item source for sell listings); `iomarket.cpp` 1-80 and 105-340 (rows, expiry, move-to-history, stats; lines 81-104 not read); `databasetasks.cpp` (callback dispatch only, lines 38-67, read by grep and in part); `otserv.cpp` 244-245; `luascript.cpp` 13742-13775 (binding only); `const.h` 8-9; `config.lua.dist` 74-77; `game.cpp` 1508-1545 (`removeMoney`, the cash source, read in part). Camera scope: not a camera cell. Confidence: high on the lifecycle and every number (each read in place; the 42 receipts for this cell pass the verifier). Not read: the save path that writes the in-memory `bankBalance` to the database (when a player record is saved), the body of `hasMarketAttributes`, `schema.sql`, the Lua scripts that call the statistics, and the offline-player load path beyond its calls. Cell N = 11 (the cells file category_no).

Best transferable idea: an escrow listing lifecycle (debit on create, pay on accept, release exactly once on cancel or expiry, fees never returned) gives a player market with one clear ledger, if the escrow is an explicit balance and the state changes before the money.
Decision (proposed): adapt — keep the lifecycle and the fee sink, but make escrow an explicit ledger balance, store item instances (not item types), and write the state change and the money move in one transaction. The donor's code shows none of those three: the payout is an in-memory balance change and the row writes are separate statements, with no transaction visible around them.
Acceptance: a server test starts with 6,000 gold in bank, lists 10 units of a gear item at 500 gold (listing total 5,050: 5,000 escrow plus 50 fee, bank left at 950); after the 30-day sweep the bank is 5,950, a second sweep pays nothing, and the returned or sold gear keeps its upgrade level.

## 1. Mechanism

- A fixed-price listing market. Two sides: buy listings (a player posts "I pay P per unit for N units") and sell listings (a player posts "I sell N units at P"). There is no matching engine: the list has no ordering (`getActiveOffers`, iomarket.cpp 31), and a buyer or seller accepts a posted listing at its price.
- Create (`playerCreateMarketOffer`, 5203). Guards in order: amount 1 to 64000 (5206), price 1 to 999,999,999,999 (5210), premium account (5227, default on), non-stackable amount at most 2000 (5242), open-listing count below the per-player cap (5247, default 100). Then the fee: `fee = floor(price/100 x amount)`, floored at 20 and capped at 100,000 (5251-5255; const.h 8-9).
  - Buy listing: total = price x amount + fee (5291-5292). Refuse if total exceeds cash plus bank (5293). Debit cash first, then bank (5297-5300).
  - Sell listing: refuse if the fee is not covered by cash plus bank (5260). Then take the items from the inbox and depot chests (5264; source at 5582; only items with market attributes, 5612). Then debit the fee cash first, then bank (5286-5289).
  - Insert the row (`createOffer`, 5303; iomarket.cpp 250): player, side, item type, amount, price, created time, anonymous flag. The row has no charges or upgrade field.
- Accept (`playerAcceptMarketOffer`, 5375). Guards: amount 1 to 64000 (5377), listing exists, not the acceptor's own account (5396), amount at most the remaining amount (5401). Total = price x amount (5410). No fee on accept.
  - Accepting a buy listing (the acceptor sells): the acceptor's items are removed (5413 onward), the acceptor's bank is credited total (5444), the buyer's items go to the buyer's inbox.
  - Accepting a sell listing (the acceptor buys): the acceptor pays cash first then bank (5489-5492); the items go to the acceptor's inbox; the seller's bank is credited total (5527; offline sellers via `increaseBankBalance`).
  - History row for each party (5537, 5541). Remaining amount reduced (5544). Row deleted if it hits zero (5546-5547), otherwise updated (5549).
- Cancel (`playerCancelMarketOffer`, 5311). Owner check (5323). Buy: bank credited with price x remaining amount (5328). Sell: items recreated in the inbox from the row, with the item type's default charges (5352). Then `moveOfferToHistory` (5368), whose return value is not checked. Listing fee is not returned.
- Expiry (`checkExpiredOffers`, iomarket.cpp 187). Cutoff: rows with `created <= now - 30 days` (189, 193). Runs every 60 minutes (config 76; re-scheduled at 202) and once at server start (otserv.cpp 244). Per row: move to history first; if the move fails, skip the payout (118-119). Sell rows: items to the inbox with no capacity limit (144, 162). Buy rows: bank credited with price x remaining amount (175, 179). Listing fee not returned.
- Statistics: `updateStatistics` (iomarket.cpp 298) recomputes count, min, max, and sum per item from accepted history rows; Lua reads them through `itemType:getMarketBuyStatistics()` (luascript 13742-13747; the sell-side binding was not read by name). Nothing in the create, accept, or expiry path reads them (read: the three paths above; not read: any other caller).
- Tick and timing: event-driven for every player action. The only periodic work is the expiry sweep (60-minute scheduler, 202). The expiry query runs as a DB task, and its callback is queued on the main dispatcher (databasetasks.cpp 67), so it runs as a separate task and never inside a player action.

## 2. Key functions

- `Game::playerCreateMarketOffer`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 5203-5309. Guards, fee, debit, row insert, browse refresh.
- `Game::playerAcceptMarketOffer`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 5375-5555. Both sides; the payout is the same `totalPrice` on both (5410).
- `Game::playerCancelMarketOffer`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 5311-5373. Buy refund is pay-then-move.
- `tfs::iomarket::checkExpiredOffers` and `processExpiredOffers`: `/mnt/frankendom-donors/otland-forgottenserver/src/iomarket.cpp` 187-203 and 111-184. Move-then-pay for each row.
- `tfs::iomarket::moveOfferToHistory`: `/mnt/frankendom-donors/otland-forgottenserver/src/iomarket.cpp` 274-295. SELECT, DELETE (guarded at 287), history insert.
- `Game::getMarketItemList`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 5579-5625. Searches inbox and depot chests.
- `Game::removeMoney`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 1508-1545 (read in part). Cash is the summed worth of coin items that `removeMoney` finds (1538).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee charged at creation, a rate of gross, floored and capped | 1 percent (`price / 100.`, 5251); floor 20 and cap 100,000 (const.h 8-9) |
| Buy escrow: the buyer's total is removed from the wallet at listing, and the row holds the promise | total = price x amount + fee (5291-5292) |
| Sell escrow: the seller's items leave the world at listing and sit in the row | item count taken from inbox and depot (5264) |
| Pay cash first, then bank | Debit order at 5289-5300 and 5489-5492 |
| Release exactly once on cancel or expiry | Donor pays on cancel with no guard (5328, then 5368 unchecked); expiry moves first and pays only on success (118-119) |
| Lifetime and sweep | 30 days (config 74), cutoff on `created` (iomarket 189), sweep every 60 minutes (config 76, 202) |
| Per-player open listings | 100 (config 77, read as default in config.lua.dist) |
| Limits | amount 64,000 per listing (5206); 2,000 for non-stackable items (5242); price 999,999,999,999 (5210) |
| Premium gate | on by default (config 75; 5227) |

## 4. TypeScript sketch

simplified: keeps the donor's order of operations (fee, cash-then-bank debit, state change before payout on expiry and cancel, the sweep by age) but changes three things. Escrow is an explicit ledger balance (the donor implies it from the row), so `totalGold` can be checked after every call; a second release returns 0 by state, not by a DB guard; and the sell-accept checks the owner's wallet before the buyer is debited (the donor credits the seller after the items move). It omits: item removal and recreation (the caller moves items, and charges are not modelled), the account-based self-trade check (a player-id check here), the database, the amount and price limits, the per-player cap, the premium gate, the statistics, the 60-minute cadence (the caller calls `sweep`), inbox capacity, and offline-player loading. Donor order for the sell-accept is: check money, debit, add items, credit seller (5489-5527); the sketch debits and credits in a different order, and the one-step write is a sketch choice, not the donor's.

```ts
// Licence: GPL-2.0 (donor). Clean-room: written from the described mechanism; no donor lines are translated.
export type Side = 'buy' | 'sell';
export type State = 'active' | 'filled' | 'cancelled' | 'expired';

export interface Wallet { cash: number; bank: number; }
export interface Listing {
  id: number;
  owner: number;
  side: Side;
  unitPrice: number;
  amount: number;   // remaining units
  created: number;  // seconds
  state: State;
}
export interface Ledger {
  wallets: Map<number, Wallet>;
  listings: Map<number, Listing>;
  escrow: number;   // gold held for open buy listings (explicit, not implied by rows)
  feeSink: number;  // listing fees; never returned
}
export interface Rules {
  feeBasisPoints: number; // 100 = 1 percent of gross
  feeMin: number;
  feeMax: number;
  durationS: number;      // listing lifetime, seconds
}

export function listingFee(gross: number, r: Rules): number {
  const raw = Math.floor((gross * r.feeBasisPoints) / 10000);
  return Math.min(r.feeMax, Math.max(r.feeMin, raw));
}

// Cash first, then bank. Changes nothing and returns false when the total cannot be covered.
function pay(l: Ledger, who: number, total: number): boolean {
  const w = l.wallets.get(who);
  if (!w || total > w.cash + w.bank) return false;
  const fromCash = Math.min(w.cash, total);
  l.wallets.set(who, { cash: w.cash - fromCash, bank: w.bank - (total - fromCash) });
  return true;
}

function credit(l: Ledger, who: number, amount: number): void {
  const w = l.wallets.get(who);
  if (!w) throw new Error('no wallet for ' + who);
  l.wallets.set(who, { cash: w.cash, bank: w.bank + amount });
}

// Listing. Buy: gross plus fee leaves the wallet, gross goes to escrow. Sell: only the fee is charged here.
export function createListing(l: Ledger, r: Rules, id: number, owner: number, side: Side,
                              unitPrice: number, amount: number, now: number): Listing | null {
  if (amount <= 0 || unitPrice <= 0 || l.listings.has(id)) return null;
  const gross = unitPrice * amount;
  const fee = listingFee(gross, r);
  const total = side === 'buy' ? gross + fee : fee;
  if (!pay(l, owner, total)) return null;
  if (side === 'buy') l.escrow += gross;
  l.feeSink += fee;
  const listing: Listing = { id, owner, side, unitPrice, amount, created: now, state: 'active' };
  l.listings.set(id, listing);
  return listing;
}

// Accept part or all of a listing. Checks first, then money moves in one step. The caller moves items.
export function accept(l: Ledger, id: number, acceptor: number, qty: number): number | null {
  const x = l.listings.get(id);
  if (!x || x.state !== 'active' || qty <= 0 || qty > x.amount || acceptor === x.owner) return null;
  const total = qty * x.unitPrice;
  if (x.side === 'sell') {
    if (!l.wallets.has(x.owner)) return null;     // check the credit target before any debit
    if (!pay(l, acceptor, total)) return null;   // acceptor pays
    credit(l, x.owner, total);                    // owner is credited to bank
  } else {
    l.escrow -= total;                            // escrow pays the acceptor, who supplies the items
    credit(l, acceptor, total);
  }
  x.amount -= qty;
  if (x.amount === 0) x.state = 'filled';
  return total;
}

// Cancel or expiry. The state moves first, so a second call pays nothing.
export function release(l: Ledger, id: number, to: 'cancelled' | 'expired'): number {
  const x = l.listings.get(id);
  if (!x || x.state !== 'active') return 0;
  x.state = to;
  if (x.side === 'buy') {
    const back = x.amount * x.unitPrice;
    l.escrow -= back;
    credit(l, x.owner, back);
    return back;
  }
  return 0; // sell: the caller returns the items to the owner's inbox; the fee is kept
}

// Periodic sweep: releases every active listing older than the lifetime.
export function sweep(l: Ledger, r: Rules, now: number): number {
  let paid = 0;
  for (const x of l.listings.values()) {
    if (x.state === 'active' && x.created <= now - r.durationS) paid += release(l, x.id, 'expired');
  }
  return paid;
}

// One-ledger invariant for tests: wallets + escrow + fees is constant across every call above.
export function totalGold(l: Ledger): number {
  let sum = l.escrow + l.feeSink;
  for (const w of l.wallets.values()) sum += w.cash + w.bank;
  return sum;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at `/tmp/otland-forgottenserver-escrow.ts`: passed. The file ends with `export {}`.

## 5. Lands in

- TARGET `origins/server/market.ts` (proposed new module; not read in the Frankendom tree). Holds the listing, accept, release and sweep functions, the escrow balance, and the one fee function shared with the client preview from cell 1 (the same file, `listingFee`).
- Parity-checklist row 18 (loot roll and XP award), as a stretch: a settlement that credits gold to a ledger is the nearest row, and it is the one that carries the one-ledger rule. No row of 1-23 covers a player market directly; say so if Lead wants a new row.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only; no donor line translated)
- Brief rule served: one ledger (explicit escrow, one transaction per settlement); server-verified (every payout decided on the server); zones as data (fee rule, lifetime, limits as data fields)

## 6. Gaps and risks

- The donor's ledger is split. Gold lives in memory (`player->bankBalance`) and in coin items, while the listing rows are written to the database straight away (`createOffer`, `acceptOffer`, `deleteOffer`, `moveOfferToHistory`). A crash between the two can lose one side. The save path was not read, so the window is not measured. Frankendom must write escrow and state in one transaction.
- Escrow is implied, not stored. A buy's gold is in no account; it is the row's price x amount. Frankendom needs an explicit escrow balance (the sketch has one) so the sum of wallets, escrow and fees can be checked.
- Charges and upgrades are lost on the sell path. The row has no charges field (iomarket 250); a cancelled or expired item is rebuilt with the item type's default charges (game.cpp 5352; iomarket.cpp 155). Gear with an upgrade level or durability must store the instance, not the type.
- Order differs by path. Cancel pays first and then moves the row, ignoring the move result (5328, 5368). Expiry moves first and pays only on success (118-119). Accept pays and then writes the row (5489-5527, then 5544-5549), and those row writes return nothing that is checked. Frankendom picks one order (state first, then money) and applies it to all four paths.
- The fee is a sink on cancel and on expiry: nothing in the code returns it (5328; iomarket 175-179). Decide whether listing fees are sinks, and write the rule down.
- Refunds go to the bank, not to cash (5328, 179). That is a ledger choice; state which wallet a refund lands in.
- Expiry is late by up to 60 minutes (config 76; 202), because the sweep runs on a fixed cadence and the cutoff is the creation time (189). Frankendom should store an expiry time on each listing and sweep on a timer, or check on read.
- No matching engine: prices are posted, and the list has no ORDER BY (iomarket 31). If Frankendom wants a bid/ask market, this donor does not provide one.
- The self-trade check compares accounts (5396), so two characters on one account cannot trade with each other. Frankendom has one character per ledger; compare the character id and keep the rule explicit.
- The premium-only gate (5227) is a monetisation rule. Frankendom's rulings (as read in the addendum) say nothing about it; leave it out unless Strategy adds one.
- The statistics are min, max, sum and count per item from accepted history, exposed to Lua (iomarket 298-320; luascript 13742-13747). They are a display or price-index signal; the code that reads them for pricing was not read.
