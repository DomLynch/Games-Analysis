# TrinityCore-TrinityCore (trading-barter-vendors, cell 3)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/TradeHandler.cpp` | Licence: GPL-2.0-or-later (per the TradeHandler.cpp header: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL v2) | C++ | symbol `WorldSession::HandleAcceptTradeOpcode`

Checked: Read: `Handlers/TradeHandler.cpp` lines 43-51 (ignore and busy), 235-557 (accept, in full), 559-566 (unaccept), 590-596 (cancel), 597-716 (initiate, in full), 717-792 (gold, item set, item clear); `Entities/Player/TradeData.cpp` 25-153 (GetItem, SetItem, SetMoney, SetAccepted, UpdateServerStateIndex); `Entities/Player/TradeData.h` (members only); `Entities/Player/Player.cpp` TradeCancel (13212-13226) and its callers (381, 23186); `Entities/Creature/Creature.cpp` GetVendorItemCurrentCount (3330-3364) and UpdateVendorItemCurrentCount (3366-3398); `Entities/Player/Player.cpp` BuyItemFromVendorSlot price section (23738-23842) and SellItemToVendor (23907-23925); `AuctionHouse/AuctionHouseMgr.cpp` deposit functions (444-453), the cut (1460-1462) and the sale profit (1842); `AuctionHouse/AuctionHouseMgr.h` 52; `DataStores/DB2Structure.h` 323; `World/World.cpp` 1009; `Entities/Object/ObjectDefines.h` 27; `Entities/Player/Player.h` 1028. Not read: `moveItems` (TradeHandler 109-191), `Player::CanStoreItems`, `Item::CanBeTraded` and `IsBindedNotWith` bodies, the trade spell path in detail, the vendor refill data (incrtime, maxcount in the world database; not in the donor), the auction bid and buyout paths, the auction duration validation, the `HOUR` and `MINUTE` constant definitions (not located). Callers: `TradeCancel` from logout (381), taxi start (23186), cancel (594), decline (45, 50). `GetVendorItemCurrentCount` from the buy path (23738); the other callers of `UpdateVendorItemCurrentCount` were not searched. camera_scope: n/a. Confidence: high for the trade window (accept, offer and cancel paths read end to end); medium for the vendor and auction numbers (formulas read; the clock drift is worked by hand from the code, not run). The donor has no AGENTS.md or CLAUDE.md at its root that was read.

## 1. Mechanism

Trade window, in the order the code runs:

- **Initiate.** `HandleInitiateTradeOpcode` (TradeHandler.cpp 597-716) refuses in this order: already trading (599), dead (603), stunned, logging out, in flight (624, too far), the player's level below `CONFIG_TRADE_LEVEL_REQ` (631), no partner by GUID (ObjectAccessor), partner is self or already trading (busy), partner dead, partner stunned or logging out, the faction check unless two-side trade is allowed (685), distance `IsWithinDistInMap(..., TRADE_DISTANCE)` (693), partner level (700). Then both players get a `TradeData` at once (709-710) and the partner is sent PROPOSED. There is no separate consent step: the partner sees an open trade and can decline by cancelling (decline handlers 43-51, which call `TradeCancel`).
- **Offer edits.** Every edit first bumps the editor's client state counter (gold 723, item 762, clear 781), then calls `SetMoney` or `SetItem`. Both reset BOTH accept flags (TradeData.cpp 69, 119), then call `UpdateServerStateIndex` (72, 122), which sets a new random 32-bit value (152: `_serverStateIndex = rand32();`), then refresh both clients. `SetItem` refuses bound-to-other items with NOT_ON_TAPLIST (TradeHandler.cpp 766) and refuses an item already in another slot of this trade (754). `SetMoney` refuses if the player does not have the money (TradeData.cpp 108).
- **Accept.** `HandleAcceptTradeOpcode` (235): it sets the accepter's flag first (251), then checks in order: the partner's state index equals the value the accepter sent (254; on mismatch the status is STATE_CHANGED and the accept is undone, 256-258); distance (262); the accepter's money (271); the partner's money (281); the money cap on each side (290, 299); the items on both sides still CanBeTraded and not bound to the other player (313, 320; and the partner's items at 339); the account-bank position (not in the bags). Any failure undoes the accept and reports.
- **Both accepted.** Only when the partner's flag is set (362) does it settle. It sets the InTrade flag on the items (for item counting only; see section 6), then tests capacity both ways with `CanStoreItems` (450-451). If either side cannot store, BOTH accepts are cleared and nothing moves (failure branches at 456-483).
- **Settle.** Step 1 removes both sides' items from their inventories, marking each with a gift creator (485-499). Step 2 stores them on the other side (500, `moveItems`, body not read). Step 3 moves money: the payer's debit first (524), then the credit (525-527). The state is cleared (both trade objects deleted, 536-540), and both players' inventories and gold are saved in one database transaction (543-546). A comment at 542 notes that saves elsewhere are not under such a guard.
- **Cancel.** `Player::TradeCancel` (Player.cpp 13212-13226) sends the status to both players and deletes both trade objects. Nothing was escrowed, so nothing is returned. Triggers: the player's cancel (TradeHandler 590-596), decline (45, 50), logout cleanup (Player.cpp 381), and taxi start (23186).
- **Distance during the offer.** The distance is tested at initiate (693) and at accept (262). The TRADE_DISTANCE macro is used only at those two places in the server game code (grep). No per-tick distance check was found in the paths read, so a trade stays open while the partners walk apart, and it fails only at accept.

Tick: none. The trade is driven by client packets and by logout and taxi events.

## 2. Key functions

- `WorldSession::HandleAcceptTradeOpcode`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/TradeHandler.cpp` 235-557. The accept gate, the re-checks, capacity, settle and the single save transaction.
- `WorldSession::HandleInitiateTradeOpcode`: same file, 597-716. The start checks and the two TradeData objects.
- `TradeData::SetItem`, `TradeData::SetMoney`, `TradeData::UpdateServerStateIndex`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/TradeData.cpp` 58-100, 103-124, 150-153. The offer-change reset and the version id.
- `Player::TradeCancel`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 13212-13226.
- `Creature::GetVendorItemCurrentCount`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp` 3330-3364. The lazy stock refill.
- `Player::BuyItemFromVendorSlot`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` from 23662 (function start; the price section is 23738-23842).

## 3. Numbers vs mechanism

Trade window (exact values from the code):

| Rule | Value or formula | Where |
|---|---|---|
| Trade distance (initiate and accept) | 11.11 yards | ObjectDefines.h 27; TradeHandler.cpp 693, 262 |
| Money cap per character | 99,999,999,999 copper | Player.h 1028; TradeHandler.cpp 299 (receiving side) |
| Trade level | `CONFIG_TRADE_LEVEL_REQ` (config, both players) | TradeHandler.cpp 631, 700 |
| Reset on any offer edit | both accept flags false; new state version | TradeData.cpp 69, 72, 119, 122 |
| Version id | random 32-bit value per edit (`rand32`) | TradeData.cpp 152 |
| Accept check | partner's version must equal the accepter's copy | TradeHandler.cpp 254 |
| Settle gate | both accept flags true | TradeHandler.cpp 362 |
| Capacity | `CanStoreItems` both ways, before any move; any failure clears both accepts | TradeHandler.cpp 450-451 |
| Save | one database transaction for both players | TradeHandler.cpp 543-546 |

Vendor prices and stock (read, not run):

| Rule | Formula and numbers | Where |
|---|---|---|
| Base price | `pProto->GetBuyPrice()`; for extended-cost items, `iece->Money` instead, and only full stacks | Player.cpp 23751, 23828 |
| Unit price | `buyPricePerItem = basePrice / BuyCount` (double) | Player.cpp 23834 |
| Total | `price = uint64(buyPricePerItem * count)` | Player.cpp 23842 |
| Count cap | `maxCount = MAX_MONEY_AMOUNT / buyPricePerItem`; a larger count is silently clamped and logged as cheating | Player.cpp 23835, 23840 |
| Stock refill (read path) | if `last + incrtime <= now`: `diff = (now - last) / incrtime` (integer); `count += diff x BuyCount`, capped at maxcount; the record is erased when full; then `last = now` | Creature.cpp 3347-3358; erase 3353 |
| Stock refill (purchase path) | same, then `count -= used`, and `last = now` even when no refill happened | Creature.cpp 3385-3396 (reset at 3396) |
| Clock drift (worked by hand from the code) | incrtime 60 s, vendor opened every 59 s: refills happen every 118 s, not 60 s, so the restock rate halves | Creature.cpp 3358 |
| Sell payout | `GetSellPrice(this, true) x amount`; refused if the gold cap would be passed | Player.cpp 23907, 23922-23924 |

Auction house fees (read, not run):

| Rule | Formula and numbers | Where |
|---|---|---|
| Item auction deposit | `ceil(floor(max(sellPrice x 0.15, 100)) / SILVER) x SILVER x (minutes / 720)` (100 copper minimum; rounded up to whole silver; 720 = 12 hours in minutes) | AuctionHouseMgr.cpp 450-453; AH_MINIMUM_DEPOSIT 48; MIN_AUCTION_TIME 52 |
| Commodity deposit | `max(0.15 x quantity x sellPrice, 100)`, same rounding and time factor | AuctionHouseMgr.cpp 444-447 |
| Auction cut on a sale | `max(CalculatePct(bid, ConsignmentRate) x Rate.Auction.Cut, 0)`; ConsignmentRate is a per-house byte from the DB2 table; the rate defaults to 1.0 | AuctionHouseMgr.cpp 1460-1462; DB2Structure.h 323; World.cpp 1009 |
| Seller profit on a sale | `bid + deposit - cut`: the deposit comes back on sale | AuctionHouseMgr.cpp 1842 |
| Time factor edge | integer division: an auction shorter than 12 h gives factor 0 (no deposit), if such a duration is accepted (not read) | AuctionHouseMgr.cpp 447, 453 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: an edit clears both accepts and changes the offer version; an accept must name the partner's version the accepter saw; the second accept re-checks money, bound and tradeable items, ownership and capacity for both sides before anything is written; then one commit. It changes four things on purpose: (a) money and item checks also run at write time, not only at accept; (b) there is no escrow, as in the donor, but ownership is checked again at commit; (c) the random version is a per-side id generated on the server, and the sketch uses `Math.random`, so the sketch is a shape, not a security primitive; (d) the commit is computed on copies and written once, where the donor writes items then money in separate calls. It omits the spell-in-trade path, the account-bank position check, the InTrade flag, the gift creator, the status packets, the level and faction checks at initiate, the database transaction, and the logout and taxi cancel paths.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Item { id: string; canBeTraded: boolean; boundTo: string | null }
interface Side {
  playerId: string;
  x: number;
  y: number;
  offer: Item[];       // items this side offers (references, not escrowed)
  money: number;       // copper offered
  accepted: boolean;
  version: number;     // id of THIS side's current offer; changes on every edit
}
interface Trade { a: Side; b: Side; open: boolean }
interface Ledger {
  money: Map<string, number>;   // balances
  owner: Map<string, string>;   // item id -> owner id
  freeSlots: Map<string, number>;
}
type Result = "waiting" | "settled" | "refused" | "stale" | "far" | "closed";

const TRADE_DISTANCE = 11.11;            // donor ObjectDefines.h (yards)
const MAX_MONEY = 99999999999;           // donor Player.h (copper)

function newVersion(): number {
  // Random id so a client cannot precompute the next value (donor uses rand32).
  return Math.floor(Math.random() * 4294967296);
}

function dist(a: Side, b: Side): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Any edit bumps this side's version and clears both accepts (donor SetItem / SetMoney).
function setOffer(t: Trade, who: "a" | "b", items: Item[], money: number, l: Ledger): boolean {
  if (!t.open) return false;
  const me = t[who];
  if (!Number.isInteger(money) || money < 0) return false;
  if ((l.money.get(me.playerId) ?? 0) < money) return false;          // refuse at write, not only at confirm
  for (const it of items) {
    if (!it.canBeTraded) return false;
    if (it.boundTo !== null && it.boundTo !== (who === "a" ? t.b : t.a).playerId) return false;
    if (l.owner.get(it.id) !== me.playerId) return false;
  }
  me.offer = items;
  me.money = money;
  me.version = newVersion();
  t.a.accepted = false;
  t.b.accepted = false;
  return true;
}

// The accept names the partner's offer version the accepter saw (donor StateIndex check).
function accept(t: Trade, who: "a" | "b", seenPartnerVersion: number, l: Ledger): Result {
  if (!t.open) return "closed";
  const me = t[who];
  const other = who === "a" ? t.b : t.a;
  if (other.version !== seenPartnerVersion) return "stale";          // offer changed under the accepter
  if (dist(me, other) > TRADE_DISTANCE) return "far";
  me.accepted = true;
  if (!other.accepted) return "waiting";

  // Both accepted: re-check everything at the moment of settle (donor Update path).
  for (const [s, o] of [[t.a, t.b], [t.b, t.a]] as const) {
    if ((l.money.get(s.playerId) ?? 0) < s.money) return refuse(t);
    if ((l.money.get(o.playerId) ?? 0) + s.money > MAX_MONEY) return refuse(t);
    for (const it of s.offer) {
      if (!it.canBeTraded) return refuse(t);
      if (it.boundTo !== null && it.boundTo !== o.playerId) return refuse(t);
      if (l.owner.get(it.id) !== s.playerId) return refuse(t);
    }
    if ((l.freeSlots.get(o.playerId) ?? 0) < s.offer.length) return refuse(t);
  }

  // Commit: compute everything, then write. One step, no awaits.
  const newMoney = new Map(l.money);
  const newOwner = new Map(l.owner);
  const newFree = new Map(l.freeSlots);
  for (const [s, o] of [[t.a, t.b], [t.b, t.a]] as const) {
    newMoney.set(s.playerId, (newMoney.get(s.playerId) ?? 0) - s.money);
    newMoney.set(o.playerId, (newMoney.get(o.playerId) ?? 0) + s.money);
    for (const it of s.offer) newOwner.set(it.id, o.playerId);
    newFree.set(s.playerId, (newFree.get(s.playerId) ?? 0) + s.offer.length);
    newFree.set(o.playerId, (newFree.get(o.playerId) ?? 0) - s.offer.length);
  }
  l.money = newMoney;
  l.owner = newOwner;
  l.freeSlots = newFree;
  t.open = false;
  return "settled";
}

function refuse(t: Trade): Result {
  t.a.accepted = false;
  t.b.accepted = false;
  return "refused";
}

// Cancel: nothing was escrowed, so nothing to return.
function cancel(t: Trade): void {
  t.open = false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file copied to /tmp, exit 0.

Best transferable idea: an accept names the exact version of the partner's offer that the accepter saw, so an offer that changed in flight can never be settled by an old click; every edit changes the version and clears both accepts, and the second accept re-checks everything before one commit.

Decision (proposed): adapt — adopt the offer version bound to the accept (it closes the race between one side's edit and the other's accept, which the reset-only gate in the ModernUO and EQEmu notes does not), keep the capacity-first, all-or-nothing settle, and reject the donor's stock clock as written (the reset to now drops the partial interval; fix: advance the clock by whole intervals only).

Acceptance: Two test players. A offers a sword; B reads version v1 and accepts; A adds 10 gold (version v2, both accepts clear); B's earlier accept with v1 returns "stale" and does not settle; B re-accepts with v2; A accepts; one settle moves the sword and 10 gold, the wallet total is unchanged. Separately, a vendor with incrtime 60 s and a 1-unit refill is opened every 59 s; the stock gains 9 units by the 590 s read and 10 by a read at 600 s. The donor's clock gives 5 by 590 s (worked by hand from the code; to be confirmed by a test).

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed path; trade is server state and writes through the one settle door, as in the ModernUO and EQEmu notes). Not in src/fight.
- Parity-checklist row: 18 (loot roll and XP award). Trade is where item ownership changes between players, so row 18 is the nearest row. No row covers trade directly; Lead should decide whether it gets one.
- Vendor stock refresh and buy and sell prices (sections 3, the vendor table) would belong in a separate proposed file, `origins/server/vendor-stock.ts`; no parity row covers it.
- Auction deposit and cut (section 3, the auction table) would belong in a further proposed file, `origins/server/auction.ts`, only if Frankendom builds an auction; no parity row covers it.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (settle is the only door); server-verified (the server re-checks at accept, and the version is server-issued); clean-room only.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described order and from the version idea.
- Offered items are not locked while offered. The donor sets InTrade only during the accept process (TradeHandler 205, 212, 229, 231), and the only consumers of that flag are item-count functions (Player.cpp 9833, 10503, 12152 and others). Selling, destroying or mailing an offered item does not clear the accepts or change the version (no hook in Player or Item; grep). The trade then settles with the missing item skipped (`GetItem` returns null for a missing item, TradeData.cpp 32). Nothing is duplicated, but the partner can accept an offer that is no longer what they were shown. Frankendom: any change to an offered item (sell, mail, destroy, move to the bank) must bump the version and clear accepts; the sketch's commit-time owner check refuses instead of skipping.
- Two trades can name the same item. The offer is a reference; the second settle finds the item not in the owner's bag and skips it. Frankendom: refuse the second settle, do not skip.
- Distance is checked only at initiate and accept. A trade stays open while the partners walk apart (see section 1). Frankendom must cancel on distance, map change or death, as the ModernUO donor does (see that note).
- Partner consent is not a step. Initiate opens both trade objects at once. Decline works (45, 50), but the status codes look swapped: the ignore handler sends PLAYER_BUSY and the busy handler sends PLAYER_IGNORED (TradeHandler 43-51). Fix: map each handler to its status.
- The donor's stock clock drifts. `last = now` at 3358 drops the partial interval, so a vendor opened just under the restock interval refills at about half the intended rate (worked by hand, section 3). Fix: `last += diff x incrtime`.
- The purchase path resets the restock clock even when nothing was refilled (3396). Fix: only advance the clock by the whole intervals used.
- Silent count clamp on buy (Player.cpp 23840): the order is cut to the cap and logged as a cheat, but the player is charged for the clamped count with no message. Frankendom should refuse and report, not clamp.
- Auction time factor (AuctionHouseMgr.cpp 447, 453): integer division. A duration under 12 hours gives factor 0 (no deposit) if the server accepts such a duration (the duration check was not read). Fix: validate the duration to the allowed set, and use a rational factor.
- Money is moved after the items (TradeHandler 500-527) and the items and gold are saved in one transaction only at the end (543-546). A crash between the in-memory moves and the save leaves the in-memory state and the database out of step; the donor's comment says so (542).
- Not found in this path: trade logs beyond the GM command log (TradeHandler 130, 148, 504 are GM-only), rate limits and bot patterns for trade (not searched), escrow for scheduled duel wagers (not in donor), cross-zone trade (the partner is looked up by GUID with `ObjectAccessor::FindPlayer` (TradeHandler.cpp 639), which is server-wide; cross-zone is therefore possible in the donor; the distance check is the only guard).
- Vendor refill data (incrtime, maxcount, BuyCount) lives in the world database, which is not in the donor. The numbers above are the code's formulas, not the donor's shipped values.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger (settle is the only door); server-verified (the version is server-issued and checked at accept); clean-room only.
