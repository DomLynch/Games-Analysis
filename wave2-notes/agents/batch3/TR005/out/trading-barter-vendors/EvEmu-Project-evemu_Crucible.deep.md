# EvEmu-Project-evemu_Crucible (trading-barter-vendors, cell 36)

Donor: `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` | Licence: LGPL. The file header says "either version 2 of the License, or (at your option) any later version"; the repo README (lines 63-79) says "GNU Lesser General Public License ... either version 3 of the License, or (at your option) any later version." Copyleft: clean-room, shape only | C++ | symbol `TradeBound::ToggleAccept` (flow: `TradeBound::OfferMoney`, `TradeBound::Add`, `TradeBound::MultiAdd`, `TradeBound::ExchangeItems`, `TradeService::BindObject`, `TradeService::InitiateTrade`)

Checked: Read all of TradeService.cpp (655 lines, every function from 57 to 655), TradeService.h 66-104 (structs), and the calls it makes into AccountService::TransferFunds (AccountService.cpp 298-345, the online-payer branch only; AddBalance and the offline path not read) and the broker and sales tax formulas (EvEMath.cpp 211-229) and the sell/buy order fee path (MarketProxyService.cpp 318-345, 560-603). Not read: AccountDB::OfflineFundXfer, the Client::AddBalance body, the dispatcher's exception handling (so whether a throw in ToggleAccept is caught was not read), the item Move/ChangeOwner internals, MarketMgr.cpp order matching, and the NPC market (market/NPCMarket.cpp). Confidence: high on the trade-window flow and on each line cited; medium on the "reachable" defects, because the stock client's packets and the dispatcher were not read. camera_scope: not applicable.

## 1. Mechanism

Two characters trade through a server-held session. The session is created on the first bind of a trade bound object, keyed under both character IDs. Each party adds items (Add, MultiAdd) or sets a money amount (OfferMoney). Every change clears both accept flags. A party toggles its own accept flag (ToggleAccept). When both flags are true at the test, the server runs ExchangeItems, then clears the session on both sides. Abort cancels at any time and returns the items to the station hangar.

Order of operations, as the code runs:
(a) InitiateTrade (583-620) refuses if the caller already has a session (585-590) or the target has one (592-596). It sends an "Initiate" notification to the caller only (613-618). It inserts no session.
(b) BindObject (509-552) creates the session from the bind arguments: stationID (532), myID and herID, myMoney and herMoney (537-538), fileTime (539). It starts both accept flags false (535-536) and inserts the session under myID and herID (545-546). An existing session under args.myID is reused without checking the other arguments.
(c) Add (212-286): looks up the item by its ID (213); checks only that the caller is one of the two parties (226-234); takes qty from a client named argument (239-241); records ownerID = caller (247) and quantity = client qty (250); moves the WHOLE item into the trade container (257); sends OnItemChange to both (277-279); clears both accept flags (282-283).
(d) MultiAdd (288-381): the same pattern for a list of item IDs. It records the server-side quantity (344) and moves the whole item (350). It clears both accept flags (372-373).
(e) OfferMoney (57-99): sets the caller's money from the PyFloat argument (63-80, no sign or balance check); clears both accept flags (81-82); sends MoneyOffer to both.
(f) ToggleAccept (142-201): sets the caller's accept flag from newAccept (150-160). Reads a named argument forceTrade (166-169). If forceTrade is set, it sets BOTH stored flags to true (171-173). Sends StateToggle with the local values (182-189). Then it tests the LOCAL variables myAccept and herAccept (191), not the stored flags. If both are true, it calls ExchangeItems (192) and clears the session on both sides (193-196).
(g) ExchangeItems (453-499): money first. TransferFunds moves myMoney from the caller side to the other side (466), then herMoney back (467). TransferFunds is a void function (AccountService.cpp 298), so a failed transfer cannot be seen at the call site. Its comment says it throws when the online payer cannot be debited (AccountService.cpp 340-341). Items second: for each list entry, ChangeOwner to the other party (481) and Move to the session station with flagHangar (482). Ships and cargo containers get their contents' owner changed (the TransferContainerContents call, 484-489 region). Then TradeComplete goes to both.
(h) Only after (g) returns does ToggleAccept remove both active sessions (193-194) and clear the client trade pointers (195-196). If (g) throws, these lines are not reached.

The trade window has no timer, no item cap and no rate limit. fileTime is stored (539) and never read in the file. The donor also has no remove-one-item call: the bound object registers List, IsCEOTrade, GetItemID, GetItem, Add, MultiAdd, ToggleAccept, OfferMoney, Abort (46-54). Withdrawing an item means aborting the whole trade.

Numbers: none in the trade window itself. The fee and tax numbers (section 3) belong to the market, not to the trade window.

Note on what is safe here: the two-step confirm with a reset on every change IS the anti-scam shape. The defects below are in what the server trusts, not in the flow.

## 2. Key functions

- `TradeBound::ToggleAccept` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 142-201. Accept flags, the forceTrade named argument, and the exchange test on local variables (191).
- `TradeBound::ExchangeItems` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 453-499. Money transfers (466-467), owner change (481), move (482).
- `TradeBound::Add` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 212-286. Item lookup with no owner check (213), client quantity (241, 250), whole-item move (257), flags reset (282-283).
- `TradeBound::OfferMoney` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 57-99. Money set and flags reset (81-82).
- `TradeService::BindObject` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 509-552. Session created from client bind args (532, 537-538), keyed under both IDs (545-546).
- `TradeService::InitiateTrade` `/mnt/frankendom-donors/EvEmu-Project-evemu_Crucible/src/eve-server/station/TradeService.cpp` 583-620. Session guards (585, 592) and the null session dereference (593).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Two-party session: both confirms needed, any change clears both | Flag reset in OfferMoney (81-82), Add (282-283), MultiAdd (372-373). No timer. |
| Commit only when both flags are true, then clear the session | ToggleAccept test (191), cleanup (193-196). |
| Broker fee on order placement: base rate reduced by Broker Relations level, shifted by standing | BrokerFee: fee = 0.01 x (1 - 0.05 x level) x 2^(-2w), where w = (0.7 x faction + 0.3 x corp standing) / 10 (EvEMath.cpp 211-214). |
| Broker fee floor | max(fee x order value, 100) (EvEMath.cpp 215). |
| Sales tax: base over 100, reduced 10 percent per Accounting level, capped at the base | maximumTax = base / 100; tax = maximumTax x (1 - 0.1 x accounting); min(tax, maximumTax) (EvEMath.cpp 227-229). The Tax Evasion term is a todo (226). |
| Broker fee is not refunded | "there is no refund in broker fees." (MarketProxyService.cpp 649). |
| Sales tax is paid when the item sells, not on placement | "taxes are paid when item sells" (MarketProxyService.cpp 582). |
| Money is a double in the session | myMoney, herMoney: double (TradeService.h 82-83). |

Buy orders escrow the money with the station owner (MarketProxyService.cpp 341, Escrow key). That is a market rule, not a trade rule. The trade window has no escrow at all: the money moves only in ExchangeItems.

## 4. TypeScript sketch

simplified: keeps the donor's two-step flow (an edit by either party clears both confirms; the second confirm settles) but changes the order of work. All ownership, quantity and balance checks run before anything moves, and all money and item rows go to one ledger call. It drops the forceTrade flag (no path lets one party confirm for the other), the windows and UI, the bind/session registry, the station check, the container contents, the journal entries and the broker or sales tax. The stock is a stub; it does not model Move or ChangeOwner.

```ts
// Licence: LGPL (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = number;
type CharId = number;

interface StockItem { id: ItemId; owner: CharId; typeId: number; qty: number; }
interface Offer { items: Map<ItemId, number>; money: number; } // item id -> qty offered
interface Side { charId: CharId; offer: Offer; confirmed: boolean; }
interface ItemRow { kind: "item"; from: CharId; to: CharId; itemId: ItemId; qty: number; }
interface MoneyRow { kind: "money"; from: CharId; to: CharId; amount: number; }
type LedgerRow = ItemRow | MoneyRow;

interface Ledger {
  balance(charId: CharId): number;
  stock(itemId: ItemId): StockItem | undefined;
  settle(rows: LedgerRow[]): void; // one call: all rows apply, or none do
}

interface Session { a: Side; b: Side; state: "open" | "settled" | "cancelled"; }

function sideOf(s: Session, charId: CharId): Side {
  if (s.a.charId === charId) return s.a;
  if (s.b.charId === charId) return s.b;
  throw new Error("not a party to this trade");
}

function otherSide(s: Session, side: Side): Side {
  return side === s.a ? s.b : s.a;
}

// Any change by either party clears BOTH confirms (lock on change).
function editOffer(s: Session, charId: CharId, change: (o: Offer) => void): void {
  if (s.state !== "open") throw new Error("trade closed");
  change(sideOf(s, charId).offer);
  s.a.confirmed = false;
  s.b.confirmed = false;
}

function addItem(s: Session, charId: CharId, itemId: ItemId, qty: number, ledger: Ledger): void {
  const item = ledger.stock(itemId);
  // ownership and quantity are checked on the server, against the stock, not the client's claim
  if (!item || item.owner !== charId) throw new Error("not your item");
  if (!Number.isInteger(qty) || qty < 1 || qty > item.qty) throw new Error("bad quantity");
  editOffer(s, charId, o => { o.items.set(itemId, qty); });
}

function removeItem(s: Session, charId: CharId, itemId: ItemId): void {
  editOffer(s, charId, o => { o.items.delete(itemId); });
}

function setMoney(s: Session, charId: CharId, amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("bad amount");
  editOffer(s, charId, o => { o.money = amount; });
}

// A party confirms. The other party's confirm can only be set by that party's own call.
function confirm(s: Session, charId: CharId, ledger: Ledger): "waiting" | "settled" {
  if (s.state !== "open") throw new Error("trade closed");
  sideOf(s, charId).confirmed = true;
  if (!(s.a.confirmed && s.b.confirmed)) return "waiting";
  settle(s, ledger);
  return "settled";
}

function settle(s: Session, ledger: Ledger): void {
  const rows: LedgerRow[] = [];
  for (const side of [s.a, s.b]) {
    const to = otherSide(s, side).charId;
    // re-validate every offered item and the money before anything moves
    for (const [itemId, qty] of side.offer.items) {
      const item = ledger.stock(itemId);
      if (!item || item.owner !== side.charId || qty > item.qty) throw new Error("offer no longer valid");
      rows.push({ kind: "item", from: side.charId, to, itemId, qty });
    }
    if (side.offer.money > 0) {
      if (ledger.balance(side.charId) < side.offer.money) throw new Error("insufficient funds");
      rows.push({ kind: "money", from: side.charId, to, amount: side.offer.money });
    }
  }
  ledger.settle(rows); // single atomic call; no separate money step that can fail halfway
  s.state = "settled";
}

export {}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/evemu-trade-session.ts) exit 0.

## 5. Lands in

- TARGET `origins/server/trade-session.ts` (new, proposed; the Frankendom repo was not opened in this pass). Trade session is server state; the client shows the two offers and the two confirm buttons only.
- Parity row 18 (loot roll and XP award: item grant and the ledger). Nearest row; no parity row covers player trade (see ruling 1).
- Reuse tag: rewrite-from-idea (LGPL; clean-room shape only)
- Brief rule served: one ledger (settle() is the only door; a trade is one call, not two transfers); server-verified (the server checks owner, quantity and balance, the client claims nothing).

Best transferable idea: a two-party trade where any edit clears both confirms, and one settle call moves all items and money only after every ownership, quantity and balance check passes.
Decision (proposed): adapt — keep the two-step confirm with reset-on-change; drop the forceTrade flag; settle both sides in one ledger call after re-checking owner, quantity and balance, because the donor's two money transfers and client-trusted quantities are not safe.
Acceptance: Two phone players open a trade; player A offers 1 from a stack of 100, and player B sees 1 and receives exactly 1. Any edit by either player clears both confirms. A server test asserts that one party's confirm, or a named flag sent by the other party, cannot settle the trade.

## 6. Gaps and risks

Defects in the donor, each with the fix for Frankendom (the idea is kept; the defect is not):
1. forceTrade (ToggleAccept 166-173): the server reads a named argument from the caller and sets BOTH stored flags true. The exchange test (191) uses the local variables, so the exchange happens on the next ToggleAccept call, not this one. Fix: no code path lets a party confirm for the other. Delete the flag.
2. No owner check on Add (213-226): the item is fetched by ID and only the caller's side is checked. The trade record's ownerID is the caller (247). Fix: check item.owner == caller and that the item is in the caller's hangar or container before any move.
3. Displayed quantity is client-supplied (241, 250), but the whole stack moves (257, 481-482). No split call exists in TradeService.cpp (grep: none). The other party sees the offered number and receives the whole stack. MultiAdd uses the server quantity (344), so the two add paths disagree. Fix: split the stack to the offered quantity inside settle (the sketch's ItemRow carries qty) and show only server-side quantities.
4. Session money and station come from the bind arguments (532, 537-538), and the registration (545-546) trusts herID with no proof that the other character agreed. A client that binds a session naming another character sets that character's herMoney. Fix: money is set only by OfferMoney from each party; a session can be created only from a trade the other party initiated and accepted.
5. Two money transfers, no pre-check, no atomic settle (466-467). TransferFunds is void and throws when the online payer cannot be debited (AccountService.cpp 340-341). If the first transfer succeeds and the second throws, the first party has paid and nothing moves. If the throw happens mid-ExchangeItems, the session cleanup (193-196) is skipped. Fix: validate both balances and all items first, then one ledger call (the sketch's settle()).
6. InitiateTrade null dereference (593): the already-trading branch reads call.client->GetTradeSession()->..., which is null on that path, because the guard at 585 has already returned for callers with a session. Fix: read the target's session (592-593).
7. No same-station or same-zone check: InitiateTrade reports the target's station (605) and BindObject takes the station from the client (532); ExchangeItems moves items to that station (482). Fix: the server sets the station from the caller's position and requires both parties to be in one zone.
8. OfferMoney accepts any amount with no sign or balance check (57-99). Fix: integer, at least 0, at most the balance at offer time, re-checked at settle.
9. No remove-one-item (registration 46-54). Fix: add remove; it clears both confirms like any other change.
10. Stale todo (211 "refresh other window when item added") and a documented one-session limit (523). Not a defect in the flow; note only.

Market side (not the trade window, same topic):
11. Standing lookup uses the caller's docked station owner (MarketProxyService.cpp 328), but the broker fee is paid to the owner of the stationID argument (343). The TODO at 202 says stationID is not validated. Fix: take standing from the owner the fee is paid to, and validate the station ID. As written, a player docked at a high-standing station could pay the lower fee on an order placed at another station (not run; from code reading only).
12. SalesTax's Tax Evasion term is a todo (EvEMath.cpp 226): the parameter is accepted and not applied. Fix: give the term a data field before any rule depends on it.
13. Buy-order escrow and fee are both transferred at placement (MarketProxyService.cpp 335-344). Fee is non-refundable (649). Keep the idea for market listings; it is a candidate sink, not a trade rule.

History (what they patched later): the ChangeLog has "Fixed sales tax default to 1%" under the 0.8.4 heading (doc/ChangeLog.md 20-25). No trade-specific entries in the ChangeLog (grep for trade: none). No git history in the donor box: "no history available" beyond that.

Gaps against the Frankendom rulings: the donor has no escrow for trade, so it is no help for scheduled duel wagers. The market escrow pattern (MarketProxyService.cpp 341, Escrow key) is the nearest shape: hold the stake as an escrow row and release it on a server-verified result.

Rulings for Dom:
1. Should trade get its own parity row (24, "player trade and settle under the one ledger")? Recommendation: yes; no row 1-23 covers it.
2. Should a player-to-player trade be allowed only in the same zone, with both players idle (not in a fight)? Recommendation: yes for v1; no cross-zone trade.
3. Should player-to-player trade carry a fee? Recommendation: no fee on trade; keep any fee to market listings, where the donor's broker shape already fits.

Reuse tag: rewrite-from-idea (LGPL; clean-room shape only)
Brief rule served: 1 (one ledger, settle() is the only door); server-verified (kills, items, money).

## PASS2 extras

As-data shape:
- Table: no table. The donor keeps the trade in memory. Session row (TradeService.h 74-85): containerID uint32, stationID uint32, myID uint32, herID uint32, myState bool, herState bool, myMoney double, herMoney double, fileTime int64. Trade-list row (TradeService.h 87-97): itemID uint32, typeID uint32, ownerID uint32, locationID uint32, flagID uint32, quantity uint32, groupID uint32, categoryID uint32, singleton bool, customInfo string.
- A new trade is one row: no, not in the donor. The flow is code (the accept/exchange logic). The Frankendom version can store the session and its settle rows as data rows, but the state machine stays in code.
- A new fee rule is one row: no. The broker and tax numbers are constants in EvEMath.cpp. Frankendom should move the rate and floor to a row (see data_fields).

Provenance per claim: every claim above cites TradeService.cpp, AccountService.cpp, EvEMath.cpp, MarketProxyService.cpp, or the ChangeLog, with file and line. Licence: LGPL for all of them (clean-room only).

Patch history: see the History paragraph above.

Rulings for Dom: see the three above.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- 20+ claims checked (ToggleAccept, ExchangeItems money and items, InitiateTrade null deref, BindObject, registration, BrokerFee/SalesTax, ChangeLog, licence header vs README) all held.
- Checker missed-items (not added to the note body): InitiateTrade (~591) dereferences FindClientByCharID with no null check; ToggleAccept/Add dereference GetTradeSession() with no null check; Add passes the client-supplied flag to Move (TradeService.cpp ~232-257), so the destination flag is client-chosen.
