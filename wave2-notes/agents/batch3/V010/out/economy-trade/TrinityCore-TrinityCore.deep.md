# TrinityCore-TrinityCore (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/TradeHandler.cpp` (with `Entities/Player/TradeData.h`, `Entities/Player/TradeData.cpp`, `Entities/Player/Player.cpp` TradeCancel) | Licence: GPL-2.0-or-later (TradeHandler.cpp and TradeData.cpp headers: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL v2) | C++ | symbol `WorldSession::HandleAcceptTradeOpcode`

Checked: Read in full: `TradeData.h` (18-90) and `TradeData.cpp` (18-153); `TradeHandler.cpp` 109-234 (`moveItems`, `setAcceptTradeMode`, `clearAcceptTradeMode`), 235-557 (`HandleAcceptTradeOpcode`, every branch), 580-596 (cancel), 597-716 (`HandleInitiateTradeOpcode`), 717-792 (gold, item set and clear handlers); `Player::TradeCancel` (Player.cpp 13212-13229). Constants: `ObjectDefines.h` 27, `Player.h` 1028, `World.cpp` 713, `worldserver.conf.dist` 1684. Not read: `HandleBeginTradeOpcode` (568-579), `SendUpdateTrade` (53-108, the packet fill), `Item::CanBeTraded` and `IsBindedNotWith` bodies, `Player::CanStoreItems` and `MoveItemToInventory`, `SaveInventoryAndGoldToDB`, the bodies of the spell-in-trade checks (`Spell::CheckCast`), the account-bank helper. Second mechanism, not written up: the auction house (`AuctionHouseMgr.cpp`) was read only for `CalculateAuctionHouseCut` (1460-1463) and its three callers (1669, 1841, 1932), by grep. The auction house is a separate note candidate. Confidence: high on the two-party trade state machine and commit order; medium on store helpers (not read). camera_scope: not applicable.

## 1. Mechanism

- Opening (`HandleInitiateTradeOpcode`, 597-710). Refused if the initiator already has a trade (599), is dead, stunned, logging out or in flight, or below `LevelReq.Trade` (631; config default 1, World.cpp 713). Refused if the target is missing, is the same player or already busy (647), dead (654), in flight, stunned or logging out, is on the other faction unless `AllowTwoSide.Trade` (default 0, worldserver.conf.dist 1684), out of `TRADE_DISTANCE` (11.11, ObjectDefines.h 27; check at 693), or below the level requirement. Then both players get a new `TradeData` (709-710) and the target is sent PROPOSED.
- Offer changes. Every change to an offer does the same two things, in code: it clears the accept on BOTH sides (`SetAccepted(false)` on this side and on the partner, TradeData.cpp 70, 95, 120), and it rolls a new 32-bit random server index on the changed side only (`UpdateServerStateIndex`, 72, 97, 122; value from `rand32()`, 152). A change that is a no-op returns first and resets nothing (item same as before, 64-65; gold same as before, 105-106).
  - Gold (`SetMoney`, 103-125): if the changer does not have the money, the request fails with NOT_ENOUGH_MONEY (108-113); otherwise the value is stored, the accepts clear, and the index rolls.
  - Items (`HandleSetTradeItemOpcode`, 727-773; `SetItem`, 58-82): slot must be below 7 (`TRADE_SLOT_COUNT`); the item must exist in the pack, and must be tradable unless the slot is the non-traded slot 6 (the lookup and tradability check at the top of the handler); an item already in another slot is refused (754); a partner-bound item is refused for a traded slot (764); then `SetItem`. Clearing a slot calls `SetItem(nullptr)` (775-788).
  - Spells applied to the trade (`SetSpell`, 84-101) follow the same accept-clear and index-roll rule.
- Accept (`HandleAcceptTradeOpcode`, 235-557), in this order:
  1. Mark my accept first (251). If the checks below fail, the accept is undone.
  2. The partner's current server index must equal the `StateIndex` the client quoted (254). If not, reply STATE_CHANGED and unaccept me (254-260).
  3. Range check, TRADE_DISTANCE (262). My gold and the partner's gold must be covered by each owner (271, 281), and no side may exceed `MAX_MONEY_AMOUNT` after the swap (290 and the partner check after it).
  4. Every traded item on each side must still pass `CanBeTraded` (313, 339) and not sit in the account bank (checked after each).
  5. If the partner has also accepted (362): set the in-trade flag on every traded item of both sides and mark both trades in accept process (`setAcceptTradeMode`, 192-215; items set at 205). Then the spell checks run. Then the room check: the partner's `CanStoreItems` for my items and mine for the partner's (450-451). The in-trade flags are cleared (453). If either side has no room, both accepts are cleared and the failure is reported to the side that lacks room (456-476), and the function returns.
  6. Commit, in this order: remove each traded item from both inventories, setting the gift creator (485-499); `moveItems` stores each pair only if both directions can take their item (121), and otherwise returns each item to its owner (171-182) (with log errors); the gold swap (524-527); delete both `TradeData` (537-540); save both inventories and gold in one database transaction (543-545); COMPLETE to both (548-550).
  7. If the partner has not accepted: send ACCEPTED to the partner and stop (554).
- Cancel (`HandleCancelTradeOpcode`, 590-594, to `Player::TradeCancel`, Player.cpp 13212-13229): sends CANCELLED to both sides and deletes both `TradeData`.

## 2. Key functions

- `WorldSession::HandleAcceptTradeOpcode`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/TradeHandler.cpp` 235-557 (state-index check, checks, two-side accept, room check, commit).
- `WorldSession::moveItems`: same file, 109-190 (both-direction room gate, return path).
- `setAcceptTradeMode` / `clearAcceptTradeMode`: same file, 192-233 (in-trade flags for the commit window).
- `WorldSession::HandleInitiateTradeOpcode`: same file, 597-710.
- `WorldSession::HandleSetTradeItemOpcode` and `HandleSetTradeGoldOpcode`: same file, 717-773.
- `TradeData::SetItem`, `SetMoney`, `SetSpell`, `SetAccepted`, `UpdateServerStateIndex`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/TradeData.cpp` 58-152.
- `Player::TradeCancel`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 13212-13229.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-party offer: each side has items and gold; either side's change clears both accepts | Six traded slots plus one non-traded slot (`TRADE_SLOT_TRADED_COUNT` = 6, `TRADE_SLOT_COUNT` = 7; TradeData.h 25-27) |
| Stale-offer guard: accept quotes the partner's index; mismatch rejects | 32-bit random index (`rand32()`, TradeData.cpp 152) |
| Range gate on both players | `TRADE_DISTANCE` 11.11 (theirs, ObjectDefines.h 27) |
| Gold cap on the swap | `MAX_MONEY_AMOUNT` = 99999999999 (theirs, Player.h 1028) |
| Level gate on trading | `LevelReq.Trade` default 1 (theirs, World.cpp 713) |
| Two-side or cross-faction trading switch | `AllowTwoSide.Trade` default 0 (theirs, worldserver.conf.dist 1684) |
| Room check before any move; full rollback on failure | None (the rule; the donor's rollback in `moveItems` is the fallback path) |
| Commit = remove, store, money, save | Save is one transaction for both characters' inventories and gold (TradeHandler.cpp 543-545) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: an offer change clears both accepts and re-rolls only the changed side's index; accept quotes the partner's index; a mismatch unaccepts; the partner must have accepted; both directions are checked for room before anything moves; then the removal, the stores and the gold swap. It omits: the in-trade flags (the sketch's room check is the only guard against concurrent moves), the spell-in-trade path, the bank and bound-item checks (the caller must check tradability), the GM logging, played-time adjustment, gift-creator marking, the money-cap check, the per-side error codes (the sketch returns one outcome), the rollback-to-owner path in `moveItems` (the sketch assumes the prechecks hold), the cancel path, and the client state index (`UpdateClientStateIndex`), which the server accept check does not use.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Who = "a" | "b";
interface Offer {
  items: (string | null)[];   // traded slots (6); an item id per slot
  gold: number;
  accepted: boolean;
  index: number;              // server state index for this offer; re-rolled when this offer changes
}
interface Trade { a: Offer; b: Offer; }
type Outcome = "state-changed" | "partner-pending" | "no-space" | "committed" | "invalid";

const other = (w: Who): Who => (w === "a" ? "b" : "a");
const newIndex = (rng: () => number): number => Math.floor(rng() * 4294967296);   // 32-bit random

// Any change to a side's offer clears BOTH accepts; only the changed side's index re-rolls.
function changeOffer(t: Trade, who: Who, change: (o: Offer) => boolean, rng: () => number): boolean {
  const o = t[who];
  if (!change(o)) return false;               // no-op: nothing changed, so nothing resets
  t.a.accepted = false;
  t.b.accepted = false;
  o.index = newIndex(rng);
  return true;
}

// Accept. The accepter quotes the partner's index it last saw; a mismatch unaccepts and reports state-changed.
// Both sides are checked for room before anything moves; the move is then one atomic step.
function accept(
  t: Trade,
  who: Who,
  quotedPartnerIndex: number,
  canStore: (to: Who, items: string[]) => boolean,
  ledger: {
    removeItem(from: Who, slot: number): void;
    storeItem(to: Who, item: string): void;
    addGold(who: Who, delta: number): void;
  },
): Outcome {
  const me = t[who];
  const them = t[other(who)];
  me.accepted = true;
  if (them.index !== quotedPartnerIndex) {
    me.accepted = false;
    return "state-changed";
  }
  if (!them.accepted) return "partner-pending";

  const mineItems = me.items.filter((x): x is string => x !== null);
  const theirItems = them.items.filter((x): x is string => x !== null);
  if (!canStore(other(who), mineItems) || !canStore(who, theirItems)) {
    t.a.accepted = false;
    t.b.accepted = false;
    return "no-space";
  }

  for (let i = 0; i < me.items.length; i++) {
    if (me.items[i] !== null) ledger.removeItem(who, i);
    if (them.items[i] !== null) ledger.removeItem(other(who), i);
  }
  for (const item of mineItems) ledger.storeItem(other(who), item);
  for (const item of theirItems) ledger.storeItem(who, item);
  ledger.addGold(who, them.gold - me.gold);
  ledger.addGold(other(who), me.gold - them.gold);
  return "committed";
}

export {};
```

## 5. Lands in

- TARGET `src/fight/trade.ts` (new module; two-party exchange, one ledger). Parity-checklist row 18 is the loot and XP row, so the nearest fit is not a fight row: this is a player-to-player exchange, not a kill reward. Not a zone-population row either. Recorded as "no parity row fits; nearest is row 18 for the item and gold ledger write (not an exact match)". Server-side only: the offer state lives on the server, and the commit is server-verified.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (one transaction moves items and gold); server-verified (the server checks every quote and the room, the client sends only intent); one character/one ledger (both characters' changes commit together or not at all)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor's two saves share one transaction (TradeHandler.cpp 543-545), but the same region carries a comment that `SaveInventoryAndGoldToDB` has no transaction guard of its own and the saves are "desynchronized" with other saves. The item moves themselves run before the save, in memory. Frankendom's one-ledger rule needs the item move and the save to be one write; adapt, do not copy this order.
- The donor's rollback (`moveItems`, 171-182) is a second path that puts items back after they have been removed. The sketch avoids it by checking room first. Frankendom should keep only the precheck path, so there is no partial state to repair.
- The stale-offer guard uses a random 32-bit index. That is fine for detecting a changed offer, but it is not a sequence number; Frankendom could use a monotonically rising counter (deterministic and testable). Decide which, and test it.
- The initiate path has no zone check; the only range gate is distance 11.11 (theirs). Frankendom's zones and the Pit: the Pit is a client, so a trade in the Pit would be a rule of the engine; decide whether trading is allowed during a fight (it should not be, in a fight the engine owns the state).
- The donor allows trade with any level at or above the requirement and any alive, un-stunned target. Frankendom's MAX_ATTACKERS = 3 and combat state do not appear here; a fighting player should be refused by the same state gate the duel uses.
- Auction house, bids, deposits, expiry and mail (AuctionHouseMgr.cpp) are a separate economy mechanism. Only the cut function was read (1460-1463, rate times the consignment rate, clamped at 0). Not written up.
- The room check (`CanStoreItems`) and the store helpers were not read; the sketch's `canStore` is a parameter. Frankendom's inventory rule must give the same answer for the precheck and the store.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger, server-verified (the trade is a server commit), one character one ledger

Best transferable idea: Any change to either offer clears both accepts and re-rolls only the changed side's index, and an accept must quote the partner's current index, so a stale offer can never complete.
Decision (proposed): adapt — the stale-offer rule and the check-both-sides-then-move order are the mechanism worth keeping; adapt the commit into one ledger transaction (the donor's two-phase move with rollback is not a model for us) and use a deterministic counter instead of a random index.
Acceptance: a server test: A offers a sword, B offers 50 gold; A accepts; B raises the gold to 60, which clears A's accept; A's accept with the old index is rejected as state-changed; when both accept on current indices, the swap commits in one transaction, and a full inventory on either side aborts the whole trade with no item lost or duplicated.
