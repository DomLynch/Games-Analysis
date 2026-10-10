# ax-grymyr-l2dn-server (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/InstanceManagers/WorldExchangeManager.cs` | Licence: MIT (LICENSE.txt: "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project") | C# | symbol `WorldExchangeManager` (`registerItemBid`, `checkBidStatus`, `buyItem`, `takeBidMoney`, `cancelBid`)

Checked: read `WorldExchangeManager.cs` at 36-82 (constructor and timer), 118-198 (status tick), 256-376 (fee and register), 382-384 (date helper), 433-494 (cancel), 495-569 (claim), 636-736 (buy). Read `L2Dn.GameServer/Config/WorldExchange.ini` in full (55 lines), `Config.WorldExchange.cs` in full, the register packet `ExWorldExchangeRegisterItemPacket.cs` (lines 15-31), and the two id constants in `Inventory.cs` (33, 39). Not read: `returnItem` (570-639), `getItemStatusAndMakeAction` (392-432), `loadItemBids` (199-255), `createItem` (737-765), `insert` (1049-1095), the `Map` class used for `_itemBids`, and the caller in `DailyTaskManager.cs` (only found by grep). Confidence high on fee order and state machine; medium on the tick's behaviour under concurrent edits (Map semantics not read). camera_scope: n/a.

## 1. Mechanism

- A player market. A seller registers a stack of one item with a price. Buyers pay in the premium currency LCoin (id 91663, Inventory.cs:39). The listing fee is paid in adena (id 57, Inventory.cs:33). The seller claims the sale price minus a tax later.
- Register (`registerItemBid`, 281-376), in order:
  (a) feature flag (283-286 region, read); (b) a check `playerBids.Count >= 10` on the result of `getPlayerBids` (289-292). This check is DEAD CODE: `getPlayerBids` (WorldExchangeManager.cs 927-974) always returns a map with exactly 3 keys (REGISTERED, SOLD, OUT_TIME), so `Count` is 3 and the cap never fires; the donor has no working per-seller limit (and when the feature is disabled it returns an empty map); (c) the item must be in the inventory (read); (d) amount >= 1, price >= 1, amount x price >= 1 (301-305); (e) fee from `calculateFeeForRegister` (256-272): for adena the fee is `priceForEach * 100` flat (267), otherwise `priceForEach * amount * AdenaFee` (270); (f) cap at MaxAdenaFee when it is not -1 (309-311); (g) the seller must hold that much adena (313-317), and a fee below 1 is refused; (h) the stack is detached from the inventory (347); (i) the item's category is looked up (355); if it is missing the function returns FAIL, and by then the stack is already detached (read; I did not trace `detachItem` so I cannot say where the stack ends up); (j) the fee is removed from adena (363); (k) the bid's end time is now + ItemSellPeriod days (364); (l) the bid is stored with `priceForEach` as its price (365-366) and written to the database unless DBLazy is set.
- Status tick (`checkBidStatus`, 118-198), on a ThreadPool fixed-rate timer every BidItemsIntervalStatusCheck ms (46-47; default 30000 ms per the ini at line 18). Only bids whose end time has passed are changed (130). REGISTERED becomes OUT_TIME with a new end time of now + ItemBackPeriod days (144-145). SOLD or OUT_TIME becomes NONE and the item is set VOID (156), which removes it. NONE is removed from the map (139).
- Buy (`buyItem`, 640-689): the bid must be REGISTERED (status checks read between 640 and 668); the buyer's LCoin count must be at least the price (669-672); the price is destroyed from the buyer's LCoin (676); the bid is replaced with a SOLD record for the seller whose end time is now + PaymentTakePeriod days (678-680); the original stack is added to the buyer (686). If that add returns null, the function sends FAIL, and the code's own TODO says the transfer is not transactional (689).
- Claim (`takeBidMoney`, 495-569): the bid must be SOLD and the claim must be inside its end time (541). The tax is price x LCoinFee, capped at MaxLCoinFee (550-551). The seller is credited price minus tax in LCoin (552). The sold item is set VOID (555). The tax is never credited to anyone, so it is a sink.
- Cancel (`cancelBid`, 433-494): allowed when the bid is not NONE and not SOLD (read). The stack is returned (480) and the bid goes to NONE. The registration fee is not refunded: the function has no adena credit (read the whole body).

## 2. Key functions

- `registerItemBid`: `WorldExchangeManager.cs` 280-376 (attribute `Synchronized` at 280). Validation, fee, detach, fee charge, bid creation.
- `calculateFeeForRegister`: `WorldExchangeManager.cs` 256-272. Adena flat rule; otherwise price x amount x rate.
- `checkBidStatus`: `WorldExchangeManager.cs` 118-198. Expiry state machine, run by the timer set at 46-47.
- `buyItem`: `WorldExchangeManager.cs` 640-689. No `Synchronized` attribute on it (`registerItemBid` has one at 280).
- `takeBidMoney`: `WorldExchangeManager.cs` 495-569. Tax and credit.
- `cancelBid`: `WorldExchangeManager.cs` 433-494. Return of stack, no fee refund.
- Config: `L2Dn.GameServer/Config/WorldExchange.ini` (values and comments); `L2Dn.GameServer.StaticData/Configuration/Config.WorldExchange.cs` 27-31 (parsing with defaults; the tick interval field is named `WORLD_EXCHANGE_SAVE_INTERVAL` at 27 and is fed by the ini key `BidItemsIntervalStatusCheck`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Listing fee charged up front, proportional to value listed, optionally capped, not refunded on cancel | AdenaFee 100.0 (ini 33; code 270); MaxAdenaFee -1 (ini 38). See the unit warning below. |
| Adena listing flat fee for adena itself | priceForEach x 100 (theirs, 267), not a config key |
| Sale tax taken out of the proceeds, capped | LCoinFee 0.05 (ini 23; config 28), MaxLCoinFee 20000 (ini 28; code 551) |
| Entries per seller (open count) | none in effect: the donor's `Count >= 10` test (289) is dead code because the map always has 3 keys (927-974). The sketch's cap is a Frankendom rule, value 10 chosen by us. |
| Three timers on a listing: sell period, back-out period, pay window | ItemSellPeriod 14 days (ini 47), ItemBackPeriod 120 days (ini 55), PaymentTakePeriod 120 days (ini 51) |
| Status check interval | BidItemsIntervalStatusCheck 30000 ms (ini 18; config 46-47 region) |
| Currency ids | LCoin 91663 (Inventory.cs 39); adena 57 (Inventory.cs 33) |

Unit warning (as read): the ini comment at line 31 says "Default: 100% (100.0)", but the code multiplies by the value directly (270). So with the default, the listing fee is 100 times price x amount, not 100%. The ini also says "Carefully - hard coded value (in client)", which suggests the client expects this number. I did not read the client, so I cannot say whether this is a real bug or a unit the client also uses. Do not copy 100.0 as a rate without checking.

Price semantics (as read): the register packet reads the price first (ExWorldExchangeRegisterItemPacket.cs:17) and passes it as `priceForEach` (31). The fee multiplies it by the amount (270), but the bid stores it unchanged (366) and the buyer is charged it once (676). The name says per unit; the payment says per lot. Which one the client sends is not read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for list (a Frankendom open-count cap, which the donor's own dead check does not provide; validity, fee with cap, affordability, fee charged, listing opened), buy (status, affordability, premium destroyed, sold record), claim (status and window, tax with cap, credit) and the tick (registered to outOfTime, expired sold or outOfTime to none). It treats `price` as the donor does, as the amount charged once for the lot. It omits the item detach and re-add, the item category lookup, the sold clone, the database writes, the online seller alarm, the packets, the `Synchronized` attributes and the lazy-update flag. Times are plain numbers in milliseconds.

```ts
// Licence: MIT (donor LICENSE.txt, Grymyr / L2Dn Server Project). Adapted shape, written from the read code, not a line-by-line port.
type Status = 'registered' | 'outOfTime' | 'sold' | 'none';

interface Wallet { adena: number; premium: number; } // one ledger: every change goes through the functions below

interface Listing {
  id: number;
  seller: string;
  count: number;
  price: number;      // the listed price (the donor stores the value it is given and charges it once)
  status: Status;
  endsAt: number;     // ms timestamp of the next status change
}

interface MarketTerms {
  adenaFeeRate: number;   // listing fee as a multiple of price x count (donor default 100.0)
  maxAdenaFee: number;    // -1 = no cap
  taxRate: number;        // share of the sale kept by the market (0.05)
  maxTax: number;         // -1 = no cap
  sellDays: number;       // how long a listing stays open
  backDays: number;       // how long an expired listing can be taken back
  payDays: number;        // how long a seller can claim proceeds
  maxOpen: number;        // Frankendom rule: max open listings per seller. The donor's equivalent test (Count >= 10 on a 3-key map) never fires, so this is NOT donor behaviour
}

const DAY = 86400000;

function listingFee(t: MarketTerms, price: number, count: number): number {
  let fee = Math.floor(price * count * t.adenaFeeRate);
  if (t.maxAdenaFee !== -1 && fee > t.maxAdenaFee) fee = t.maxAdenaFee;
  return fee;
}

// List: the caller passes `open`, the seller's count of registered listings (the donor's cap on this is dead code; ours is real). Checks, charges the fee up front (not refunded on cancel), then opens the listing.
function list(t: MarketTerms, seller: Wallet, open: number, id: number, who: string, count: number, price: number, now: number): Listing | null {
  if (open >= t.maxOpen) return null;
  if (count < 1 || price < 1) return null;
  const fee = listingFee(t, price, count);
  if (fee > seller.adena || fee < 1) return null;
  seller.adena -= fee;
  return { id, seller: who, count, price, status: 'registered', endsAt: now + t.sellDays * DAY };
}

// Buy: the buyer pays the listed price in premium currency first, then the sale is recorded.
function buy(buyer: Wallet, l: Listing, now: number, t: MarketTerms): boolean {
  if (l.status !== 'registered') return false;
  if (buyer.premium < l.price) return false;
  buyer.premium -= l.price;
  l.status = 'sold';
  l.endsAt = now + t.payDays * DAY;
  return true;
}

// Claim: the seller receives price minus the tax, capped; the claim is refused after the pay window.
function claim(t: MarketTerms, seller: Wallet, l: Listing, now: number): number {
  if (l.status !== 'sold' || now > l.endsAt) return 0;
  let tax = Math.floor(l.price * t.taxRate);
  if (t.maxTax !== -1 && tax > t.maxTax) tax = t.maxTax;
  const net = l.price - tax;
  seller.premium += net;
  l.status = 'none';
  return net;
}

// Status tick: run on a fixed timer. Expired listings go to outOfTime; expired sold or outOfTime rows are removed and their proceeds or item are lost.
function tick(t: MarketTerms, listings: Listing[], now: number): void {
  for (const l of listings) {
    if (l.endsAt > now) continue;
    if (l.status === 'registered') {
      l.status = 'outOfTime';
      l.endsAt = now + t.backDays * DAY;
    } else if (l.status === 'sold' || l.status === 'outOfTime') {
      l.status = 'none';
    }
  }
}
```


The sketch's `tick` and `claim` follow the donor's status order; the donor's claim also checks the owner and the row's identity before the status (not sketched).

## 5. Lands in

- TARGET `origins/server/market.ts` (proposed new module, server side; no Frankendom market module was read). Listing, buy, claim and the tick run on the server only; the client shows the state.
- Parity-checklist row 21 (catalogue fields): fee rates, caps, windows and the open-listing cap (ours; the donor's is dead code) are data, not code. The payment and credit side belongs with row 18 (loot roll and XP award) as the one ledger side.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; this sketch is a clean shape-only rewrite and copies no lines)
- Brief rule served: one ledger (every adena and premium move is a function on the wallet, one place each); server-verified (the donor's register, buy and claim all re-check on the server, and the client sends only the request); zones as data (fees, caps and windows as config)

## 6. Gaps and risks

- The fee unit (AdenaFee 100.0 read as a multiplier, comment says 100%): do not copy the number. Frankendom sets the listing fee as an explicit fraction and tests the default.
- Price per unit or per lot: the donor's name and its math disagree (fee x amount, price charged once). Frankendom must pick one meaning and test a stack of 5.
- Buy is not transactional: LCoin is destroyed (676) before the item is added (686), and the donor's own TODO (689) says so. If the add fails, the buyer has paid and holds nothing. Frankendom must run the check, the debit and the item grant as one server transaction that rolls back.
- Registration can return after detaching the stack (347, 355) without putting it back, as far as the read code shows. Frankendom must check the category before it detaches.
- Sinks: the listing fee is never refunded (cancel has no adena credit), the tax is never credited, and unclaimed proceeds and items are removed after PaymentTakePeriod or ItemBackPeriod (120 days each). These are designed sinks, but a player who misses the window loses real value. Frankendom must show the timers and log each sink in the one ledger.
- Concurrency: `registerItemBid` is `Synchronized` (280); `buyItem` (640), `cancelBid` (433) and `takeBidMoney` (495) are not, so two calls on one bid can interleave (not tested). Frankendom must serialise every trade on one bid id on the server.
- The tick iterates `_itemBids` and removes entries inside the loop (125, 139). Whether the Map class allows that was not read.
- Premium currency plus an adena fee is two currencies in one market. Frankendom has one ledger, so it must decide the currency pair before it copies the shape.
- Not read: `returnItem`, `getItemStatusAndMakeAction`, `createItem`, `insert`, `loadItemBids`, and the caller in `DailyTaskManager.cs`.

Best transferable idea: List a stack with a fee charged up front that is never refunded, then move each listing through timed states (open, then take-back window, then removed) on a fixed server timer, so every sink is a rule with a visible deadline.
Decision (proposed): adapt - adopt the fee-up-front, timed-state and server-checked-listing shape in one ledger; adapt the currency and the fee units to Frankendom's single currency and a fraction rate, since the donor mixes two currencies and a fee unit it may have wrong.
Acceptance: a server test lists 5 stacks at a price with a fee fraction r: the fee is charged once and not refunded on cancel; a buy with too little currency is refused with no change to either wallet; a paid claim credits price minus min(price x tax, cap); an unclaimed sale is removed after the pay window (fake clock).

- Dead per-seller cap (above): the donor has no working limit on listings per seller, so a seller can list without bound.
- cancelBid and takeBidMoney both verify the caller is the original owner and that the held holder is the same instance (456-469, 518-531); buy has no such check, only status.
- checkBidStatus removes NONE entries while iterating the map (already flagged in this section; confirmed).

## Checker findings

- Verdict: MINOR
- Corrected:
  - Per-seller 10-entry cap: was presented as a live donor rule (section 1 step b, section 3 table, sketch maxOpen comment and list comment, section 5 and the sketch preamble). It is dead code: getPlayerBids (WorldExchangeManager.cs 927-974) always returns a 3-key map, so `playerBids.Count >= 10` (289) is never true. Note, table, sketch comments and preamble corrected; the sketch cap is now labelled a Frankendom rule. Sketch behaviour unchanged (comments only).
  - Config parsing lines 28-30 corrected to 27-31, with the field name WORLD_EXCHANGE_SAVE_INTERVAL for ini key BidItemsIntervalStatusCheck.
- Missed (also added to section 6):
  - Dead per-seller cap (above): the donor has no working limit on listings per seller, so a seller can list without bound.
  - cancelBid and takeBidMoney both verify the caller is the original owner and that the held holder is the same instance (456-469, 518-531); buy has no such check, only status.
  - checkBidStatus removes NONE entries while iterating the map (already flagged in this section; confirmed).
