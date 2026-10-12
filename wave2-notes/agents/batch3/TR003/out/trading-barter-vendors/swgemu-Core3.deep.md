# swgemu-Core3 (trading-barter-vendors, cell 1)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/player/PlayerManagerImplementation.cpp` | Licence: GNU Affero General Public License v3 (COPYING line 1 "GNU AFFERO GENERAL PUBLIC LICENSE", line 2 "Version 3, 19 November 2007"); clean-room, shape only | C++ | symbol `PlayerManagerImplementation::handleVerifyTradeMessage` (with `handleAddItemToTradeWindow`, `handleGiveMoneyMessage`, `handleAccept/UnAcceptTransactionMessage`, `checkTradeItems`, `handleAbortTradeMessage`; request in `packets/object/ItemDropTradeCallback.h`)

Checked: read end to end: request handshake in `ItemDropTradeCallback.h` (about 60-140); trade handlers in `PlayerManagerImplementation.cpp` 2679-2869 and 3097-3220; `checkTradeItems` 2870-2935 and 3040-3095 (the pet/vehicle middle, 2936-3039, read only through grep of its checks); `TradeSession.idl` in full. Callers: `handleVerifyTradeMessage` is called only from `packets/trade/VerifyTradeMessageCallback.h:45`; `handleAcceptTransactionMessage` from `AcceptTransactionMessageCallback.h:35`. Not read: `TransactionLog` internals, `ObjectController::transferObject`, the `Locker` class, the bodies of `canBeTradedTo` for vehicles and ships. Defects below were each checked by grep for every setter of the flag. Confidence high on the flow and the defects; medium on the non-read helpers. camera_scope: n/a (trade). Typecheck: sketch passed `tsc --noEmit --strict --target es2020` on the VPS (exit 0). Receipts: 32/32 pass verify_receipts.py.

## 1. Mechanism

Two-party server-side trade session. Event-driven: each client message calls one handler; there is no timer or tick loop. Order of steps:

(a) Request. Player A targets B (`ItemDropTradeCallback.h:97`). The request only becomes a trade when B has also targeted A (`ItemDropTradeCallback.h:110`). B's ignore list silently refuses it (`ItemDropTradeCallback.h:74`). Then both sides get a `TradeSession` with the other's id as target (`ItemDropTradeCallback.h:127`; B's is created at 138 if missing).

(b) Offer. Items are added by reference to the caller's session (`PlayerManagerImplementation.cpp:2777`) after three refusals: no-trade item (2753), container holding a no-trade object (2760), not owned or not movable (2747). Each refusal also calls `handleAbortTradeMessage`, which ends the whole trade for both sides (2748-2765). A pet or vehicle control device is stored away (`storeObject`) when it is added (2767-2774), and `checkTradeItems` refuses a helper-droid pet outright (about 2950). Otherwise nothing moves. Coins are clamped to cash on hand when set (2798) and stored on the session (2806).

(c) Accept. Sets an accepted flag on the caller's session (2835) and sends the other side a message. Unaccept clears it (2856). The server never reads the flag (defect D1 below).

(d) Verify. The caller's verified flag is set first (3115). Then the target is looked up (3118-3121, return if not a player) and both players are locked (3128). `checkTradeItems` (3137) re-checks both sides: items still in the bag, no-trade again, receiver slots (3047), coins not negative (3073) and not above cash (3076, and 3084 for the other side), and both within 15.f (3087). Any failure sends both sides into abort (3137-3141).

(e) Settle. Only when the other side's verified flag is already true (3145). One trade group id is created (3113). Each of the caller's items moves to the receiver with a ledger row (3152, 3156), then the other side's items (loop from 3167; each failure logged at 3177 and 3183), then coins (3197-3199), then both sessions are cleared (3210-3211) and the target ids reset (3216-3217).

## 2. Key functions

- `handleVerifyTradeMessage`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/player/PlayerManagerImplementation.cpp` 3097-3220. The confirm and the settle.
- `checkTradeItems`: same file 2870 to just before 3097. Re-checks at confirm time; returns false on the first failure.
- `handleAddItemToTradeWindow`: same file 2727-2791. Offer by reference; the receiver is sent a view of the item (2784).
- `handleGiveMoneyMessage`: same file 2792-2826. Coin offer, clamped to cash.
- `handleAbortTradeMessage`: same file 2679-2726. Ends the session on both sides.
- Request handshake: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/packets/object/ItemDropTradeCallback.h` 74-139.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Mutual request: both sides must target each other | none (id equality, ItemDropTradeCallback.h:110) |
| Offer by reference; nothing moves until settle | none |
| Coin offer clamped to balance when set | clamp = cash on hand (PlayerManagerImplementation.cpp:2798) |
| Re-check everything at confirm; any failure aborts the whole trade | checks: coins >= 0 (3073), coins <= cash (3076, 3084) |
| Presence gate | range 15.f (3087); units are not defined in the donor; checked at verify only |
| Receiving slots | `getContainerVolumeLimit` (3047, 3059, 3065): current size + incoming >= limit refuses |
| Droid cap on trade | droids in datapad + droids in this trade >= `getBaseStoredDroids` refuses (PetControlDeviceImplementation.cpp:847); base value not read |
| One ledger group per settle | `getNewTrxGroup` once per verify (3113) |

## 4. TypeScript sketch

simplified: keeps the donor order (request, offer, confirm, re-check, settle) and changes three things, all fixes to donor defects, not donor behaviour: (1) any edit clears both confirms (donor never clears them, D2); (2) the rows are built first and returned for one `settle()` call, so the trade is all or nothing (donor moves item by item, D3); (3) the range check runs at settle (already in the donor at verify). It differs from the donor on one more point: a refused add (no-trade, not owned) returns false and keeps the window open, where the donor aborts the whole trade; that is a choice, not a donor behaviour, and a build may abort instead. It omits the accept flag (the donor never reads it, D1), the mutual request, the ignore list, the pet and vehicle caps, the container volume count (folded into `roomFor`), the no-trade recursion (folded into `tradable`), the packet layer and the TransactionLog.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor.
type Id = string;

interface Offer {
  items: Id[];      // items stay in the owner's bag until settlement (held by reference)
  coins: number;
  confirmed: boolean;
}

// One settlement row. Every row of one trade shares a tradeId (one ledger group).
type Row =
  | { kind: "item"; tradeId: number; item: Id; from: Id; to: Id }
  | { kind: "coins"; tradeId: number; amount: number; from: Id; to: Id };

// Live checks, run again at confirm time (the donor re-checks at verify).
interface Checks {
  inRange(a: Id, b: Id): boolean;          // donor: distance < 15.f
  holdsItem(who: Id, item: Id): boolean;   // item still in who's bag
  tradable(item: Id): boolean;             // not no-trade, and no no-trade object inside
  balance(who: Id): number;                // cash on hand
  roomFor(who: Id, items: Id[]): boolean;  // free slots on the receiving side
}

let nextTradeId = 1;

export class TradeWindow {
  private readonly tradeId: number;
  private readonly offers: Record<Id, Offer>;
  private open = true;

  constructor(private readonly a: Id, private readonly b: Id, private readonly checks: Checks) {
    this.tradeId = nextTradeId++;
    this.offers = {
      [a]: { items: [], coins: 0, confirmed: false },
      [b]: { items: [], coins: 0, confirmed: false },
    };
  }

  private other(who: Id): Id {
    return who === this.a ? this.b : this.a;
  }

  // Fix for the donor: any edit clears BOTH confirms, so a confirm always covers the current contents.
  private touch(): void {
    this.offers[this.a].confirmed = false;
    this.offers[this.b].confirmed = false;
  }

  addItem(who: Id, item: Id): boolean {
    if (!this.open || !this.checks.tradable(item) || !this.checks.holdsItem(who, item)) return false;
    this.offers[who].items.push(item);
    this.touch();
    return true;
  }

  setCoins(who: Id, amount: number): boolean {
    if (!this.open) return false;
    this.offers[who].coins = Math.max(0, Math.min(Math.floor(amount), this.checks.balance(who)));
    this.touch();
    return true;
  }

  // Returns the settlement rows once both sides have confirmed the same contents and all checks pass.
  // The caller passes the rows to one settle() call, so the trade is all or nothing.
  confirm(who: Id): Row[] | null {
    if (!this.open) return null;
    this.offers[who].confirmed = true;
    if (!this.offers[this.other(who)].confirmed) return null; // wait for the other side

    if (!this.checkAll()) {       // fail closed: any failed check ends the whole trade
      this.abort();
      return null;
    }
    return this.rows();
  }

  abort(): void {
    this.open = false;
  }

  private checkAll(): boolean {
    if (!this.checks.inRange(this.a, this.b)) return false;
    for (const who of [this.a, this.b]) {
      const o = this.offers[who];
      if (o.coins > this.checks.balance(who)) return false;
      for (const item of o.items) {
        if (!this.checks.tradable(item) || !this.checks.holdsItem(who, item)) return false;
      }
    }
    if (!this.checks.roomFor(this.b, this.offers[this.a].items)) return false;
    if (!this.checks.roomFor(this.a, this.offers[this.b].items)) return false;
    return true;
  }

  private rows(): Row[] {
    const out: Row[] = [];
    for (const [from, to] of [[this.a, this.b], [this.b, this.a]] as const) {
      const o = this.offers[from];
      for (const item of o.items) out.push({ kind: "item", tradeId: this.tradeId, item, from, to });
      if (o.coins > 0) out.push({ kind: "coins", tradeId: this.tradeId, amount: o.coins, from, to });
    }
    return out;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed new module, not yet in the repo; the one place a trade is confirmed and handed to `settle()`).
- Parity row 18 (loot roll and XP award: ownership and one ledger). Trade has no parity row of its own; row 18 is the nearest.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: one ledger (a trade is one group id with N rows; barter is two sides of one settle); server-verified (both sides re-checked on the server at confirm).

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- D1, accept flag is unused. Set at 2835, cleared at 2856; `TradeSession.idl:30` (under `objects/player/sessions/`) has the getter and grep found no caller. Fix: either require accept before confirm or drop accept. The sketch drops it.
- D2, edits do not clear confirms. `handleAddItemToTradeWindow` (2727-2791) and `handleGiveMoneyMessage` (2792-2826) never touch the verified flag. The flag is cleared only at 3133 (no receiver session) and in `clearTradeContainer` (`TradeSession.idl:79`). So A confirms, A changes the coins, B confirms, and the trade settles with the new coins. The client UI may reset confirms on edit, but nothing in the donor server code enforces it. Fix: any edit clears both confirms (the sketch's `touch()`).
- D3, partial settle. The caller's item loop (from 3149; transfer at 3156, no else branch) has no failure branch: a failed `transferObject` is silent. The other side's failures are logged (3177, 3183) and the loop continues. Coins then move (3199). Fix: build all rows first, settle in one transaction, abort all rows on any failure.
- D4, verified flag before the checks. 3115 sets it, then 3120 can return early and leave it true (3133 fixes only the no-session branch). Fix: record the confirm only after the target and checks pass.
- Range is checked at verify only (3087). Fix: also check at settle (the sketch does). The donor's units are not defined here; Frankendom needs its own value, as data.
- Trade limits: the only limits read are container slots and the droid and vehicle counts. No per-trade item cap, rate limit or cooldown was found in the functions read; not searched exhaustively (not read).
- Taxes and fees: none in the trade functions read (2679-3219). Not checked for auction or vendor fees; those are outside this cell.
- Escrow for scheduled duel wagers: not in this donor. Items stay in their bags and are checked by reference. A wager pot needs its own escrow row at duel start (not read in donor).
- Take-one loot: the donor's no-trade flag is the closest shape. A take-one piece should be no-trade after pickup unless the rulings allow otherwise; the flag must cover containers too (2760).
- Pet and vehicle limits show that a trade can be refused by the receiver's storage. Frankendom should refuse the same way, before settle, with a visible reason.

Best transferable idea: a trade is two confirms on one shared, locked offer; any edit clears both, and one settle() writes all rows under one group id or none.
Decision (proposed): adapt — the mutual request, fail-closed re-check, no-trade flags and one ledger group per trade fit our one-ledger rule; the unused accept flag, confirms that survive edits and item-by-item settle are fixed in origins/server/trade.ts.
Acceptance: two players within 15 units; A offers a gear piece and 500 coins; B confirms; A changes coins to 5 and both confirms clear; after both confirm again one settle() writes one item row and one coins row under one trade id; a server test asserts an edit after one confirm settles nothing, and the caller's `settle()` (not in the sketch; it takes the rows from `confirm`) applies all rows or none, so one failing row aborts the whole trade.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: handshake in ItemDropTradeCallback.h (ignore list, mutual target, session creation), offer handlers 2727-2826 (clamp to cash, reference add), accept/unaccept flags set and never read (grep: getAcceptedTrade unused outside idl), verified flag set before target lookup and left true on early return (3115, 3133), checkTradeItems both sides (separate loops for trade and receiver containers), volume >= limit, coins <0 / > cash both sides, distance >= 15.f, settle order and shared trx group, silent failure on caller's loop vs logged on receiver loop, coins last, clear + drop session. Errors: (1) note calls the add-item checks 'three refusals'; in the donor each failure (not owned/not movable, no-trade, contains no-trade) also calls handleAbortTradeMessage, ending the whole trade; sketch's addItem just returns false and keeps the window open. (2) Control devices (pets/vehicles) are auto-stored via storeObject when added to the trade (donor ~2767-2774) - not mentioned. (3) TradeSession.idl is under objects/player/sessions/, path in note not given; getter at line 30 correct, clear at 79 correct. Acceptance sequence passes against the sketch (edit clears both confirms; rows share tradeId); 'one failing row aborts the whole trade' depends on the caller's settle(), not covered by sketch.
Missed: Donor auto-stores a pet/vehicle control device when offered (storeObject) and rejects HELPERDROIDPET outright (checkTradeItems ~2950).

Fixed 2026-10-12 (Sonnet fixer): added that each add refusal aborts the donor's whole trade (the sketch deliberately only returns false); control-device auto-store and the helper-droid refusal noted; idl path given; acceptance now says the all-or-nothing row failure is tested on the caller's settle(), not in the sketch. No sketch code changed. Not verified: nothing further.
