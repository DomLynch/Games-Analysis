# opentibiabr-otclient (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua | Licence: MIT | C++ (this file is Lua; the engine is C++) | symbol market offers (onMarketBrowse / onMarketReadOffer)
Symbol check: onMarketReadOffer (383) and onMarketBrowse (672) confirmed. Their packet-handler callers were not read; the file is the client side of the market.

## 1. Mechanism
- A client-only display layer. The server sends market packets (the parsing code was not read). onMarketReadOffer is called once per offer row, and its parameters are: action (0 = buy, 1 = sell), amount, counter, itemId, holder name, price, state, timestamp, var (list selector), tier.
- onMarketReadOffer (383-417) builds an offer table (tier defaults to 0, 394) and sorts it into one of six module-level lists (376-381) by var (1 = history, 2 = own offers, else browse, 398-416) and action (0 = buy list, else sell list). It does not compute anything.
- onMarketBrowse (672-889) runs after a batch (its caller was not read). It handles only one kind per call: if the history lists hold rows it hands them to MarketHistory.onParseMarketHistory and returns (673-682); else if own-offer lists hold rows it hands them to MarketOwnOffers.onParseMyOffers and returns (684-693); else, if an item is selected (695-697), it takes the browse lists and empties them (699-703).
- Browse batch: if the selected item and tier equal the last shown (708), then a side with exactly one row is an update: match on counter plus timestamp, replace the row, or remove it when amount is 0 (709-739); an unmatched row is ignored and a side with 0 or 2+ rows is dropped, not applied. Otherwise both lists are replaced wholesale (741-745).
- Inputs: packed offer rows. Outputs: the lists the market window renders, and the coin total on onParseStoreGetCoin.
- Rendering (748-888): each list shows floor(panel height / 16) - 1 rows (748, 805) with a scrollbar for the rest. Buy rows are greyed when the depot holds none of the item at that tier (getDepotItemCount, 352-374, 783-788); sell rows when total money is below the unit price (847-852). These are client-side hints only. Then onUpdateChildItem and focus on the first row of each list (879-888).
- Tick: event-driven, per call. No simulation.

## 2. Key functions
- onMarketReadOffer (opentibia) | /mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua | 383-417 | builds one offer table and stages it into the right list by var and action.
- onMarketBrowse (opentibia) | /mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua | 672-889 | drains staging lists in priority order; patches single-row updates by counter and timestamp; otherwise replaces both lists, then rebuilds the two scrolled, windowed offer lists.
- onParseStoreGetCoin (opentibia) | /mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua | 419-449 | refreshes the coin total labels and the coin item count.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Stage incoming rows by list selector and direction, then drain by priority | The var codes 1 and 2 and the action codes 0 and 1 (theirs, wire format, 398-415) |
| In-place update keyed on (counter, timestamp), amount 0 means remove | Key fields and the zero-amount rule (theirs) |
| Tier as part of the item key, default 0 | Tier field (theirs, 394, 706) |
| Coin item id 22118 special case | Item id 22118 (theirs, 369, 433, 444) |

## 4. TypeScript sketch
simplified: the history and own-offer lists are parsed by other modules (MarketHistory, MarketOwnOffers; not read), so the sketch only stages and hands the lists back. The browse case requires a selected item before it drains (695-697), which the sketch leaves to the caller. The wholesale replace and the "exactly one row" update rule are in applyBatch. Rendering, scrolling and greying are omitted.
```ts
// Licence: MIT (opentibiabr-otclient). Logic lifted from
// modules/game_market/t_market.lua (onMarketReadOffer, onMarketBrowse) and rewritten in TS.
interface Offer { counter: number; timestamp: number; action: 0 | 1; itemId: number; tier: number; amount: number; price: number; holder: string; }

const staging = {
  history:  { buy: [] as Offer[], sell: [] as Offer[] },   // var 1
  mine:     { buy: [] as Offer[], sell: [] as Offer[] },   // var 2
  browse:   { buy: [] as Offer[], sell: [] as Offer[] },   // var 0 or other
};
type ListName = 'history' | 'mine' | 'browse';

function stageOffer(varCode: number, o: Offer): void {
  const list: ListName = varCode === 1 ? 'history' : varCode === 2 ? 'mine' : 'browse';
  (o.action === 0 ? staging[list].buy : staging[list].sell).push(o);
}

// Drain in priority order: history, then own offers, then the browse lists.
function drain(): { list: ListName; buy: Offer[]; sell: Offer[] } | null {
  for (const name of ['history', 'mine', 'browse'] as ListName[]) {
    const s = staging[name];
    if (s.buy.length || s.sell.length) {
      const out = { list: name, buy: s.buy.slice(), sell: s.sell.slice() };
      s.buy.length = 0; s.sell.length = 0;
      return out;
    }
  }
  return null;
}

// Browse batch: for the same item and tier a side with exactly one row patches the book in place (amount 0 removes);
// any other row count is dropped. For a different item or tier the batch replaces the book.
function applyBatch(book: Offer[], batch: Offer[], sameItemAndTier: boolean): Offer[] {
  if (!sameItemAndTier) return batch;
  if (batch.length !== 1) return book;
  const u = batch[0]!;
  const i = book.findIndex((r) => r.counter === u.counter && r.timestamp === u.timestamp);
  if (i < 0) return book;
  if (u.amount === 0) return book.filter((_, j) => j !== i);
  const next = book.slice();
  next[i] = u;
  return next;
}
```

## 5. Lands in
- Frankendom file(s): the server side is origins/contracts/economy.ts (Trade, settleTrade at the Concord Exchange) with origins/server/shop-buy.ts as the existing server write path; a client market view would be a new origins/shops/ client module (name for Lead). Named from reading economy.ts and shop-buy.ts in the world worktree.
- Parity-checklist row: row 18 (server-verified, one-ledger writes; the client only renders what the server sends) and row 21 (item and tier fields).
- Reuse tag: adapt (MIT, so the logic can be lifted; the wire shape is Tibia's and must be replaced with Frankendom's own packet)
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- Client only. The greying-out is a display hint, not a rule. The client does not check validity, price bounds or ownership. Frankendom's server-verified rule means the server must produce every row, and the client only renders.
- No purchase or escrow logic here. This file displays the market, and it does not complete trades.
- The six staging lists are module-level (376-381), not per request. Two overlapping batches could interleave, and a browse batch with 0 or 2+ rows for the same item is silently dropped (708-739); a Frankendom client must key a batch to a request id.
- Coin special case (item 22118) is Tibia's own currency item and has no Frankendom equivalent.
