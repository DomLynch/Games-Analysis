# azerothcore-azerothcore-wotlk (trading-barter-vendors, cell 1)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/TradeHandler.cpp` (with `Entities/Player/TradeData.cpp`, `Entities/Player/TradeData.h`, `Entities/Item/Item.cpp`, `Entities/Player/PlayerStorage.cpp`; vendor part in `Entities/Creature/Creature.cpp` and `Entities/Player/Player.cpp`) | Licence: GPL-2.0-or-later (LICENSE file is GNU GPL v2, June 1991; source headers say "either version 2 of the License, or (at your option) any later version") | C++ | symbol `WorldSession::HandleAcceptTradeOpcode`

Checked: Read in full: `HandleAcceptTradeOpcode` (TradeHandler.cpp 237-681), `moveItems` (125-190), `setAcceptTradeMode` and `clearAcceptTradeMode` (194-235), `HandleUnacceptTradeOpcode` (683-690), `HandleInitiateTradeOpcode` (721-857), `HandleSetTradeGoldOpcode` (858-868), `HandleSetTradeItemOpcode` (870-933), `HandleClearTradeItemOpcode` (935-949), all of `TradeData.cpp` (136 lines), `TradeData.h` fields (64-80). Read in part: `Item::CanBeTraded` (Item.cpp 795-812) and `Item::IsBindedNotWith` (1142-1160); `PlayerStorage.cpp` `CanStoreItems` in-trade skip (1548-1600) and the trade cleanup block (4200-4216). Callers: `TradeData::SetItem` is called from `HandleSetTradeItemOpcode` (932) and `HandleClearTradeItemOpcode` (grep only, not opened in full); the `SetAccepted` callers listed are the ones in TradeHandler.cpp and TradeData.cpp; a repo-wide caller search was not run. Not read: the spell/reagent branch bodies in detail (checked only as far as the accept gate), the crossrealm clone block in full (494-580 read), the GM logging helpers, the auction house, the trade level config value. Donor has no `.git` directory, so history is code comments only (see section 7). Confidence: high on the order of operations of accept and settle and on the confirm-clearing lock (read end to end); medium on the complete caller list of the setters. Camera: not applicable.

Best transferable idea: Two players confirm a swap; any edit to either side clears both confirmations, and the server re-checks eligibility, gold and room for both sides at the moment both confirm, then applies the swap in one step or not at all.

Decision (proposed): adapt - the confirm lock and the re-check at settle are the anti-scam core we need; the donor's move-with-rollback is replaced by writing ledger rows through `settle()` (one ledger rule), and three donor gaps (no range re-check during the trade, a partner confirmation left set after a gold-short failure, an unhandled clone-failure branch) are fixed in the design.

Acceptance: Server test: A offers a sword, B offers 50 gold, A confirms; B edits the gold to 49, so both confirmations clear and both clients show back-to-trade; both confirm again and exactly two ledger rows are written (sword A to B, 49 gold B to A) and both inventories update in one call. Second test: B's gold falls below the offered amount before the second confirm, so no rows are written and both confirmations clear. Player sees: the confirm tick on both windows drops the moment either side changes an item or the gold amount.

## 1. Mechanism

- Two `TradeData` objects are created together when the trade opens (TradeHandler.cpp 846-847). Each side has seven item ids (six traded slots plus one non-traded slot, the spell-reagent slot), a copper amount, and an accepted flag. Items are stored as GUIDs and resolved to `Item` objects only on read (TradeData.cpp 28, TradeData.h 79).
- Any change clears both confirmations. `TradeData::SetItem` returns early if the slot already holds that item (TradeData.cpp 58), otherwise it clears my flag (63) and the partner's flag (64) and sends back_to_trade to both (130). `SetMoney` does the same after its no-op check (95) and its has-enough-gold check (98), clearing both at 109-110.
- Confirm is `HandleAcceptTradeOpcode` (237-681). In order: (a) my flag is set true first, before any check (253); (b) range: if the partner is farther than `TRADE_DISTANCE` (11.11 units), the status is TARGET_TO_FAR and my flag is set false again (256-262); (c) gold: my copper must be at most my money (265), the partner's copper at most the partner's money (275), and neither side may overflow `MAX_MONEY_AMOUNT` (284-298); (d) each offered item must pass `CanBeTraded` on both sides (307, 325), and my items must not be bound to the partner (314); the mirror bind check on the partner's items is commented out (331, with a reason); (e) if the partner has not confirmed, the partner is sent TRADE_ACCEPT and the function stops (676-680); (f) if both have confirmed (340), `setAcceptTradeMode` flags every offered item in-trade (194-214, `SetInTrade` at 207); (g) the spell/reagent checks run here (not described in this note); (h) the partner is sent TRADE_ACCEPT (423); each side's incoming stacks are checked against the other side's free room with `CanStoreItems` (428-429). In-trade stacks are not counted as occupying space (PlayerStorage.cpp 1571), so a side's own offered stacks count as room. On failure both flags are cleared and nothing moves (the failure branches close the window).
- Apply, if both checks pass: each offered item gets `ITEM_FIELD_GIFTCREATOR` set to the other party and is removed from inventory (494-508). If the crossrealm flag is set (509), each item is cloned and its old instance row is deleted in a transaction (509-580). Then `moveItems` (583) checks, slot by slot, that each side can store the incoming item; if both fit, it stores them, and if not, it puts the already-removed items back with their original owners (125-190, rollback at 173).
- Money moves after items (598-601): the initiator is debited, the partner credited, and the reverse. A 10-gold-or-more leg is written to `log_money` (586-593), and the completed trade is written to the server log with both item lists (633).
- Save and cleanup: both trade objects are deleted and cleared (647-650), and both inventories and gold are saved in one database transaction on the non-crossrealm path (666-668). Both sides receive TRADE_COMPLETE (672).
- Unconfirm (683-690): clears my flag and notifies the partner with `SetAccepted(false, true)` (689).
- Cancel: the player-side cleanup deletes both trade objects (PlayerStorage.cpp 4212-4214).
- There is no tick loop for trades. Everything runs in packet handlers. Range is checked only when the trade opens (835) and when a side confirms (256); a trade does not cancel when the two players walk apart.

## 2. Key functions

- `WorldSession::HandleAcceptTradeOpcode`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/TradeHandler.cpp` 237-681. The whole confirm pipeline: range, gold, bind and tradability, both-confirmed gate, room check, apply, log, save, cleanup.
- `TradeData::SetItem`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/TradeData.cpp` 54-74. The edit that clears both confirmations (no-op if unchanged).
- `TradeData::SetMoney`: same file 93-113. Refuses gold the player does not have, clears both confirmations.
- `TradeData::SetAccepted`: same file 123-136. Stores the flag and sends back_to_trade to the side whose flag changed.
- `WorldSession::moveItems`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/TradeHandler.cpp` 125-190. Slot-by-slot store with rollback.
- `WorldSession::HandleInitiateTradeOpcode`: same handler file 721-857. Gates: alive, not stunned, not logging out, not in flight, level, trial account, busy partner, faction, range, then creates both trade objects.
- `Item::CanBeTraded` and `Item::IsBindedNotWith`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Item/Item.cpp` 795-812 and 1142-1160 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Any edit clears both confirmations | None (a rule; TradeData.cpp 63-64, 109-110) |
| Range checked when a side confirms | `TRADE_DISTANCE` = 11.11 game units (ObjectDefines.h 29) |
| Six offered item slots per side plus one non-traded slot | 6 traded, slot 6 non-traded (TradeData.h 30-31) |
| Gold cap before a confirm | `MAX_MONEY_AMOUNT` = 0x7FFFFFFF-1 = 2147483646 copper (Player.h 924) |
| Gold units | 1 silver = 100 copper; 1 gold = 100 silver = 10000 copper (SharedDefines.h 240-241) |
| Log threshold for gold legs | 10 gold = 10 * GOLD = 100000 copper (TradeHandler.cpp 586) |
| Room check both ways before any move | Free bag slots; in-trade stacks count as free (PlayerStorage.cpp 1571) |
| Trade level gate on initiate | `CONFIG_TRADE_LEVEL_REQ` (TradeHandler.cpp 758); the configured value was not read |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's core order: any edit clears both confirmations, the second confirm re-checks eligibility, gold and room, then applies once. It omits the spell/reagent slot, the bind allow-list (reduced to one allowed receiver), the crossrealm clone, GM and money logging, the played-time fix-up, the in-trade item flag (replaced by the single synchronous settle), and the donor's per-slot rollback (replaced by a room check before any move). It differs on purpose in three places: a gold edit the player cannot pay returns false and keeps the trade open (the donor closes the window); any failed settle clears BOTH confirmations (the donor clears only one side on its gold-short branches, 265-280); and range is re-checked at each confirm, not during the trade (the donor also does not cancel on walking apart, so that is a gap, not copied behaviour).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Side = 0 | 1;
const SLOTS = 6;            // offered item slots per side
// Range (donor: TRADE_DISTANCE 11.11 game units) is checked by world.inRange at every accept.

export interface Stack { id: number; bound: string | null; tradable: boolean; }
export interface Offer { playerId: string; items: (Stack | null)[]; gold: number; accepted: boolean; }
export interface Trade { offers: [Offer, Offer]; open: boolean; }
export interface Event { to: string; kind: "back_to_trade" | "accepted" | "settled" | "refused"; reason: string; }
export interface LedgerRow { from: string; to: string; kind: "item" | "gold"; ref: number; qty: number; }
export interface World {
  inRange(a: string, b: string): boolean;
  copper(playerId: string): number;
  freeSlots(playerId: string): number;  // empty bag slots, NOT counting the stacks being offered
  apply(rows: LedgerRow[]): void;       // the one door that moves items or gold; must be atomic
}

// Any change to either side clears BOTH confirmations, so nobody confirms a deal that has moved.
function clearAccepts(t: Trade, events: Event[], reason: string): void {
  for (const o of t.offers) o.accepted = false;
  for (const o of t.offers) events.push({ to: o.playerId, kind: "back_to_trade", reason });
}

export function setItem(t: Trade, side: Side, slot: number, item: Stack | null, events: Event[]): boolean {
  const me = t.offers[side];
  const other = t.offers[1 - side];
  if (!t.open || slot < 0 || slot >= SLOTS) return false;
  if ((me.items[slot]?.id ?? 0) === (item?.id ?? 0)) return false; // no-op edits do not clear confirmations
  if (item) {
    if (!item.tradable) return false;
    if (item.bound !== null && item.bound !== other.playerId) return false;
    if (me.items.some((s) => s?.id === item.id)) return false; // one item cannot sit in two slots
  }
  me.items[slot] = item;
  clearAccepts(t, events, "item changed");
  return true;
}

export function setGold(t: Trade, side: Side, copper: number, events: Event[], world: World): boolean {
  const me = t.offers[side];
  if (!t.open || copper < 0 || me.gold === copper) return false;
  if (copper > world.copper(me.playerId)) return false; // simplified: donor closes the window here
  me.gold = copper;
  clearAccepts(t, events, "gold changed");
  return true;
}

export function accept(t: Trade, side: Side, world: World, events: Event[]): "waiting" | "settled" | "failed" {
  if (!t.open) return "failed";
  const me = t.offers[side];
  const other = t.offers[1 - side];
  me.accepted = true;
  if (!world.inRange(me.playerId, other.playerId)) {
    me.accepted = false;
    events.push({ to: me.playerId, kind: "refused", reason: "too far" });
    return "failed";
  }
  if (!other.accepted) {
    events.push({ to: other.playerId, kind: "accepted", reason: "partner confirmed" });
    return "waiting";
  }
  // Both confirmed: re-check everything at the moment of settle, not when the offer was made.
  const mine = me.items.filter((s): s is Stack => s !== null);
  const theirs = other.items.filter((s): s is Stack => s !== null);
  const eligible =
    mine.every((s) => s.tradable && (s.bound === null || s.bound === other.playerId)) &&
    theirs.every((s) => s.tradable && (s.bound === null || s.bound === me.playerId));
  const goldOk = me.gold <= world.copper(me.playerId) && other.gold <= world.copper(other.playerId);
  // Each side's own offered stacks leave first, so they count as free room for the incoming stacks.
  const roomOk =
    world.freeSlots(other.playerId) + theirs.length >= mine.length &&
    world.freeSlots(me.playerId) + mine.length >= theirs.length;
  if (!eligible || !goldOk || !roomOk) {
    clearAccepts(t, events, "trade could not settle");
    return "failed";
  }
  // Barter is two item rows plus optional gold rows: nothing moves outside the ledger.
  const rows: LedgerRow[] = [];
  for (const s of mine) rows.push({ from: me.playerId, to: other.playerId, kind: "item", ref: s.id, qty: 1 });
  for (const s of theirs) rows.push({ from: other.playerId, to: me.playerId, kind: "item", ref: s.id, qty: 1 });
  if (me.gold > 0) rows.push({ from: me.playerId, to: other.playerId, kind: "gold", ref: 0, qty: me.gold });
  if (other.gold > 0) rows.push({ from: other.playerId, to: me.playerId, kind: "gold", ref: 0, qty: other.gold });
  world.apply(rows);
  t.open = false;
  events.push({ to: me.playerId, kind: "settled", reason: "" }, { to: other.playerId, kind: "settled", reason: "" });
  return "settled";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed with exit 0 (file copied to /tmp on the VPS).

## 5. Lands in

- TARGET `origins/server/trade.ts` (new module; the Frankendom trade code was not read in this pass, so "new" is unverified). The settle path would call the one ledger door `settle()`. Not a fight module; `src/fight/` is not the right home.
- Parity row: 18 (loot roll and XP award; item ownership), the nearest row. No parity row 1-22 covers trades. Ruling needed (section 7).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (settle() is the only door, barter is two rows, no side table); server-verified trades; the client shows only the confirm state.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor has no ledger. It moves `Item` objects in place, with a rollback, and writes a text log line (TradeHandler.cpp 633) plus `log_money` rows only for gold legs of 10 gold or more (586-593). Frankendom's one-ledger rule needs every item and gold leg as a row from the start.
- Donor defect 1, range: the trade is not cancelled when the players walk apart. Range is checked only at open (835) and at confirm (256). Fix: check range on the server tick and cancel the trade on the first tick out of range, returning nothing (no move has happened).
- Donor defect 2, partner confirmation left set: on the initiator's gold-short branch (265-270) only the initiator's flag is cleared; the partner's flag is left set in memory (the partner is told back_to_trade through `forTrader`). A later confirm by the initiator, with the offer unchanged, settles without the partner pressing confirm again. Fix: clear both flags on any failed settle (the sketch does this).
- Donor defect 3, unhandled branch: in the crossrealm clone (509-580), when a clone fails and the original cannot be stored back, the code falls through to `continue` with no store and no delete. Its own comment says "Should we handle else statement here?" (531 and 564). Fix: the settle must be all-or-nothing in one transaction; a failed clone aborts the whole trade. The crossrealm branch is fork-specific (gated by `sToCloud9Sidecar`, line 509); it is needed only if Frankendom runs more than one realm, which this pass did not check.
- Donor defect 4, consistency: the non-crossrealm save (666-668) happens after the in-memory move, in one transaction for both inventories. The read code does not show that a crash between the move and the save is safe. Frankendom should write rows and apply them in one database transaction.
- Bind check, as the donor does it: each side's item is checked against the partner as receiver when it is placed (HandleSetTradeItemOpcode 924), and again at confirm only for the initiator's items (314). The partner-side confirm check is commented out (331), with the reason that a bad partner item fails the later check. Our sketch re-checks both sides at settle (`eligible`), so we do not depend on that reason.
- Vendor part (the same donor; read, not in the note's mechanism): stock is an in-memory list per creature (Creature.h 467; not persisted; the only other reference is the clear at Creature.cpp 300). Restock is lazy. `GetVendorItemCurrentCount` refills on read (Creature.cpp 3276-3288), and the vendor list display also calls it (ItemHandler.cpp 923), so reads trigger the refill. Two defects in that code: (i) the refill anchor is set to the read time (3288), so the remainder of a partial interval is lost and restock drifts later with frequent reads; (ii) every purchase resets the refill clock (3327, outside the refill `if`, and `UpdateVendorItemCurrentCount` is called from one place, Player.cpp 10868, in the store path of a bought item), so a purchase delays the next restock even when no interval has passed. Fix: advance the anchor by whole intervals (`last += diff * incrtime`) and only in the refill branch; refill from the zone tick, not on read.
- Vendor price (read): base price is `BuyPrice * count` (Player.cpp 11038), then `floor(price * discount)` (11041), with discount 1.0 at or below neutral and `1 - 0.05 * (rank - 3)` above neutral (12624, 12640; REP_NEUTRAL = 3 at SharedDefines.h 160; REP_EXALTED = 7 at 164). Derived values: Friendly 0.95, Honored 0.90, Revered 0.85, Exalted 0.80. Frankendom should keep the 0.05 step as a data field per faction, not a constant.
- Not read: the auction house (AuctionHouseHandler.cpp), the spell/reagent body, GM logging helpers, `CONFIG_TRADE_LEVEL_REQ` value, DB save functions.

## 7. Pass-2 additions

**As-data shape**
- Trade (in memory, one object per player): `TradeData` fields (TradeData.h 64-80): `_player` Player*, `_trader` Player*, `_accepted` bool, `m_acceptProccess` bool, `_money` uint32 (copper), `m_spell` uint32, `m_spellCastItem` ObjectGuid, `m_items` ObjectGuid[7] (TradeData.h 79). No trade table in the code read; the trade log is a text line (TradeHandler.cpp 633) and `log_money` rows for gold legs of 10 gold or more (588, 593).
- A new trade slot is one row: no (the slot count is an enum, TradeData.h 30-31, and the items are a fixed array).
- Vendor stock (table `npc_vendor`, read by the query at ObjectMgr.cpp 10157): row fields `entry` uint32, `item` uint32, `maxcount` uint32 (10179), `incrtime` uint32 in seconds (10180), `ExtendedCost` uint32; the table is ordered by `slot`. The stock counter is not in the table; it is the in-memory `VendorItemCount` {itemId, count, lastIncrementTime} (Creature.cpp 106-107).
- A new vendor item is one row: yes (one `npc_vendor` row, with the same columns for a game-event copy); a new stock counter is not a row (it is runtime).

**Provenance per claim**
- Repo: azerothcore-azerothcore-wotlk, the donor copy on the VPS. Files and lines are in the receipts (receipts.tsv, 79 rows, all verified). Licence GPL-2.0-or-later: shape only; copyleft, no line-by-line port.

**What they patched later** (no git history; comments only, read from the code)
- `Xinef:` tags mark local changes (342 matches in game/*.cpp by grep), for example Item.cpp 808 "// Xinef: check if item is looted now" in CanBeTraded.
- A disabled partner-bind check carries its reason (TradeHandler.cpp 331): it was removed because a bad partner item would fail the trade later anyway, so the check was judged not exploitable.
- Two open TODOs in the crossrealm clone path (531, 564): "Should we handle else statement here?" Those are unfinished, not patched.
- The crossrealm path is fork-specific (sidecar-gated, line 509); its dates are not in the donor copy.

**Rulings for Dom**
1. Should a trade close automatically when the two players are out of range? Recommendation: yes, on the first server tick out of range, nothing moves.
2. Can a take-one loot item be traded at all? Recommendation: no in the first version; if wanted later, a one-time bind after pickup (the donor's allow-list pattern), not a free trade.
3. Should vendor stock refill on the zone tick (from `npc_vendor`-shaped rows) instead of on read? Recommendation: yes; it removes the read-triggered refill and the purchase clock reset.

Reuse tag and brief rule are in section 5.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. All checked claims hold against the donor (trade range, accept order, flag clearing, vendor refill, discount, licence).
- Minor: some cited line numbers are off by 1 to 3.
- Minor: money-overflow checks (about lines 284-298) are described only briefly.
