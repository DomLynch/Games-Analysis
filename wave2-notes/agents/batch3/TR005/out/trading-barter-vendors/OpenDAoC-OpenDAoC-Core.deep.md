# OpenDAoC-OpenDAoC-Core (trading-barter-vendors, cell 36)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/PlayerTradeWindow.cs` (player trade: offers, accept, settle, refund; lines 312-711) | Licence: GNU GPL version 3 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"). Copyleft: clean-room, shape only | C# | symbol `PlayerTradeWindow.AcceptTrade` (with `TradeUpdate`, `AddItemToTrade`, `RemoveItemToTrade`, `CloseTrade`, and `GamePlayer.OpenTrade`)

Checked: Read PlayerTradeWindow.cs lines 14-40 and 312-729 (729 lines in the file; 41-311 are field declarations, property getters and the Combine and Repair setters, not read), GamePlayer.cs 6263-6350 (give-to-trade entry points), 12070-12100 (window creation with one shared lock), 855-925 (close on link-death and quit), GamePlayerInventory.cs 325-340 and 530-548 (inventory moves that drop an item from the offer), PlayerMoveItemRequestHandler.cs 18, 138-140, 241, 255-275 (money give), GameMerchant.cs 87-135, 262-320 (NPC buy and sell), ConsignmentState.cs 268-360 (consignment buy with market fee), ServerProperties.cs 877 and 2089. Not read: Inventory BeginChanges and CommitChanges bodies (so what an open change batch leaves behind is not known), the Money and AddMoney internals beyond the lines above, DbInventoryItem save code, the GameLivingInventory RemoveItem path (line 606), the house money pool save, and the default values of ITEM_SELL_RATIO and MARKET_FEE_PERCENT (config not read). Confidence: high on the trade flow and on each line cited, medium on the failure-path defect (the next step after the open change batch was not read). camera_scope: not applicable.

## 1. Mechanism

Two players share one trade session: a window object per player, both holding the same lock object (GamePlayer.cs 12076-12081). An offer holds a reference to the live inventory item (AddItemToTrade adds to the list at 336 and does not move the item), and money as a running total (350). Every change clears both accept flags (TradeUpdate 378-379). Settlement happens only when both have accepted (414). It runs in this order:

(a) First accept: set my flag (408), tell the partner (410-412), return. Second accept: the code reaches the settle path below.
(b) Money first (421-422): `RemoveMoney` is called on both sides up front, each returning true or false. If either side is short (425), the donor refunds the side that did pay (433 or 446), zeroes the short side's offer money, refreshes the window and returns (456).
(c) Combine (459) and repair (495) are separate branches. The main branch (the else after them) is items, from about 508.
(d) Net slots (511-513): slots needed for me = max(0, partner items - my items); same for the partner. If either side lacks free slots, both sides are told, the money is refunded to both (534-535), the window refreshes, and it returns false (537).
(e) Change batch (541-545): `BeginChanges` on both inventories and `m_changesCount++` on both windows. The items are cloned first (547-548).
(f) Remove everything first (550-580): each of my items is removed from my inventory (556); each partner item from theirs (572). If a removal fails the donor logs and returns false (564, 580) with no money refund and no rollback, and the change batch is not committed (see section 6).
(g) Add (589-650): emblem cleared if the guilds differ (589, 632); envenom charges cleared when the receiving class cannot keep them (600, 643); each item goes into the first free backpack slot with `AddItemWithoutDbDeletion` (or `AddItem` if already deleted).
(h) Commit (671), decrement the counters (673-674), chat result, save both inventories.
(i) Money to the other side (694-696), log, then `CloseTrade` (702).

Entry: a player gives an item or money to another player (drop on the player). ReceiveTradeItem and ReceiveTradeMoney call `OpenTrade(source)` when neither has a window (GamePlayer.cs 6263, 6321). This opens both windows at once with no consent prompt. The partner can then accept or close.

Anti-dupe: any inventory move that takes an offered item out of the owner's inventory removes it from the offer (GamePlayerInventory.cs 335; the slot-swap path at 542-543), and that also clears both accepts (through RemoveItemToTrade's TradeUpdate, 366-367). Link-death and quit close the trade (GamePlayer.cs 861, 923).

Numbers: per side 10 items (MAX_ITEMS, 312). Money given at once is one denomination count stored in an unsigned 16-bit field (PlayerMoveItemRequestHandler.cs 18, 241); the give is refused if it is more than the giver's current money (258). Per-trade money is not capped.

## 2. Key functions

- `PlayerTradeWindow.AcceptTrade` `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/PlayerTradeWindow.cs` 404-709: flags, money pre-check, net slot check, change batch, removals, adds, commit.
- `PlayerTradeWindow.TradeUpdate` 374-390: clears both accepts; UI refresh suppressed while the change counter is above 0 (381).
- `PlayerTradeWindow.AddItemToTrade` 319-343: 10-item cap; live reference.
- `GamePlayer.OpenTrade` `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 12070-12091: one shared lock for both windows.
- `GamePlayer.ReceiveTradeItem` / `ReceiveTradeMoney` 6263 / 6312: entry on give, opens the window.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Item cap per side | 10 (PlayerTradeWindow.cs 312) |
| Net slot need per side: arriving minus leaving, floored at 0 | Math.Max(0, partner count - my count) (511-512) |
| Money: both sides checked, refund the side that paid | refund branches 433, 446, 534-535 |
| Market (NPC) buy: total = number x template price; items before money | GameMerchant.cs 104, 120, 134 |
| Merchant sell appraisal: (price x count / pack) x sell ratio / 100, truncated at each step | GameMerchant.cs 312; ITEM_SELL_RATIO (ServerProperties.cs 877, default not read) |
| Price 1 items that round to 0 still pay their raw value | GameMerchant.cs 314-315 |
| Non-droppable items pay 0 | GameMerchant.cs 317-319 |
| Consignment (house market) buy through the explorer: buyer pays base plus fee; seller is credited base only; the fee is a sink | ConsignmentState.cs 305-306, 346, 354; MARKET_FEE_PERCENT (ServerProperties.cs 2089, default not read) |

Worked from the formula (my arithmetic, not run): a 100-copper item with sell ratio 50 and pack size 1 appraises at 100 x 1 / 1 x 50 / 100 = 50. A 1-copper item with ratio 50 appraises at 1 x 1 / 1 x 50 / 100 = 0, then the price-1 rule returns 1.

## 4. TypeScript sketch

simplified: keeps the donor's order of accept, net-slot check and atomic apply, plus the offer-invalidation rule (an item that leaves an account drops out of the offer). It changes two things and says so: all money and ownership checks run before any change (the donor removes money first and refunds on failure), and the apply is wrapped so a throw restores both accounts (the donor returns partway through with no restore). It omits the window and packet layer, the locks, emblems and poison stripping, the combine and repair branches, the logging, the per-denomination money encoding and the consignment fee. Inventory is a set of item ids; slots are a count.

```ts
// Licence: GPL-3.0 (donor, OpenDAoC-OpenDAoC-Core LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = number;

interface Account { id: number; money: number; freeSlots: number; owned: Set<ItemId>; }
interface Offer { items: ItemId[]; money: number; accepted: boolean; }
interface Trade { a: Account; b: Account; offerA: Offer; offerB: Offer; open: boolean; }

const MAX_ITEMS = 10; // per side, as in the donor

// Lock on change: any edit clears BOTH accepts.
function clearAccepts(t: Trade): void {
  t.offerA.accepted = false;
  t.offerB.accepted = false;
}

function addItem(t: Trade, side: "a" | "b", id: ItemId): boolean {
  const acct = side === "a" ? t.a : t.b;
  const offer = side === "a" ? t.offerA : t.offerB;
  if (!acct.owned.has(id) || offer.items.includes(id) || offer.items.length >= MAX_ITEMS) return false;
  offer.items.push(id); // a reference: the item stays with its owner until settle
  clearAccepts(t);
  return true;
}

// An item that leaves an account (moved, sold, dropped) falls out of any offer that holds it.
function itemLeft(t: Trade, id: ItemId): void {
  t.offerA.items = t.offerA.items.filter(x => x !== id);
  t.offerB.items = t.offerB.items.filter(x => x !== id);
  clearAccepts(t);
}

function refuse(t: Trade): "refused" {
  clearAccepts(t);
  return "refused";
}

function accept(t: Trade, side: "a" | "b"): "waiting" | "settled" | "refused" {
  (side === "a" ? t.offerA : t.offerB).accepted = true;
  if (!(t.offerA.accepted && t.offerB.accepted)) return "waiting";
  return settle(t);
}

function transfer(from: Account, to: Account, offer: Offer): void {
  from.money -= offer.money;
  to.money += offer.money;
  for (const id of offer.items) {
    if (!from.owned.delete(id)) throw new Error("item vanished during settle");
    to.owned.add(id);
  }
}

// 1. Checks only (nothing moves). 2. Apply, with a copy to restore if a step throws.
function settle(t: Trade): "settled" | "refused" {
  const pairs = [
    { from: t.a, offer: t.offerA, to: t.b },
    { from: t.b, offer: t.offerB, to: t.a },
  ];
  for (const p of pairs) {
    if (p.from.money < p.offer.money) return refuse(t);
    if (p.offer.items.some(id => !p.from.owned.has(id))) return refuse(t);
  }
  // net slots: items arriving minus items leaving, per side
  const needA = Math.max(0, t.offerB.items.length - t.offerA.items.length);
  const needB = Math.max(0, t.offerA.items.length - t.offerB.items.length);
  if (t.a.freeSlots < needA || t.b.freeSlots < needB) return refuse(t);

  const saved = [t.a, t.b].map(acct => ({ acct, money: acct.money, owned: new Set(acct.owned) }));
  try {
    for (const p of pairs) transfer(p.from, p.to, p.offer);
  } catch {
    for (const s of saved) {
      s.acct.money = s.money;
      s.acct.owned = s.owned;
    }
    return refuse(t);
  }
  t.open = false;
  return "settled";
}

export {}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/opendaoc-trade-settle.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/trade-session.ts` (new, proposed; the Frankendom repo was not opened in this pass). Settle is the one place money and items move, and it goes through the one ledger.
- Parity row 18 (loot roll and XP award: item grant, money and the one ledger). Nearest row; no row covers trade (see ruling 1 in the EvEmu note).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room shape only)
- Brief rule served: one ledger (money and items settle in one call); server-verified (every owner and balance check runs on the server before any move).

Best transferable idea: a trade where an item that leaves an inventory drops out of the offer and clears both accepts, and settlement checks money, ownership and slots before anything moves.
Decision (proposed): adapt — keep reference offers, invalidation on leave, the net slot check and the shared trade lock; do not pre-remove money (check at settle instead, so there is no refund path); fix the failure path that the donor leaves half-applied.
Acceptance: A player moves an offered item to another slot; it disappears from both offers and both accepts clear. A server test asserts that a settle that fails on the second side's item leaves both accounts' money and items unchanged.

## 6. Gaps and risks

Donor defects, each with the fix (the idea is kept):
1. Failure after removal is not rolled back (AcceptTrade 556-564 and 572-580): if a partner item cannot be removed, the donor returns false after items were already taken from the owner's inventory and after both sides' money was already removed (421-422), with no refund or re-add. Fix: check everything first (the sketch), then apply inside a restore wrapper.
2. Change batch left open on that path (541 BeginChanges and 544-545 counter increments; the matching CommitChanges at 671 and decrement at 673-674 are only on the success path). After the failed trade the window's change counter stays above zero, and TradeUpdate returns before refreshing (381). Fix: put the batch in try/finally, and decrement on every exit. (What an open batch does in the inventory was not read.)
3. Money removed before items are checked (421-422, then the item checks at 556-580). Fix: check money at settle, do not pre-remove (see decision).
4. A give can open a trade window on the other player without consent (GamePlayer.cs 6263, 6321). Fix for Frankendom: a trade needs an explicit request and an accept, both logged.
5. The comment at PlayerTradeWindow.cs 323 says admin and GM windows may trade any item, but the restriction sits inside `if (PrivLevel == 1)` (324-327). Which level is ordinary was not checked. Fix: name the rule in the data (who may trade what) and test it.
6. Merchant buy adds items before taking money (GameMerchant.cs 120 then 134), and a failed money removal throws (`Money amount changed while adding items.`) with the items already in the inventory. The balance is pre-checked under a lock (108), so it is safe only if every money change takes the same lock (not read). Fix: take money first in one settle call.
7. Consignment purchase fee is int arithmetic: `purchasePrice * MARKET_FEE_PERCENT / 100` (ConsignmentState.cs 306). For a large sell price times a large percent this overflows int. The result could then be a small positive price while the seller is credited the full base (354). Not run; from reading the types (SellPrice int, DbInventoryItem.cs 94; MARKET_FEE_PERCENT int, ServerProperties.cs 2089). Fix: use long and clamp.

Fees and sinks (what the donor does with money):
- Merchant sell: the seller gets the appraisal (ratio applied), and the merchant keeps nothing else (GameMerchant.cs 277-288). Sell ratio is server config.
- Consignment buy via the market explorer: the buyer pays base plus MARKET_FEE_PERCENT; the seller is credited base into the house pool (ConsignmentState.cs 354 calls AddMoney on the state, which holds a house money field, 117-134). The fee leaves the economy. This is a sink; but it is paid by the buyer, so the listed price is not what the buyer pays. For Frankendom: prefer a seller-side cut, so the price shown is the price paid.

History: no history available (no git history in the box; no changelog was searched for trade in this pass).

Gaps against Frankendom rulings: the donor has no escrow row (money is removed from both sides in place), and no trade log row other than LogInventoryAction and LogGMAction calls. Frankendom needs both settle rows and a trade audit row under one ledger.

Rulings for Dom:
1. Should a trade require an explicit request and accept (no drop-to-open)? Recommendation: yes; a request is one tap, and an unrequested window is spam.
2. Should the market fee be a buyer surcharge (donor) or a seller cut? Recommendation: seller cut, so the shown price is the price paid.
3. Should trade money be checked at settle only (no pre-removal)? Recommendation: yes; it removes the refund path, and a test can check it.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room shape only)
Brief rule served: one ledger (settle is the only door, money and items together); server-verified (owner, balance and slot checks on the server before any change).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN.
- No false claim found. Format gaps vs the newer template: no 'As-data shape' row-field section and no 'a new X is one row' yes/no.
- Missed (optional): the money-short branch (PlayerTradeWindow 425-456) zeroes the short side's offer but leaves both item lists in place, so a repeat accept loop is possible.
