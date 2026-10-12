# ACEmulator-ACE (trading-barter-vendors, cell 2)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` | Licence: AGPL-3.0 (repo LICENSE file: GNU AFFERO GENERAL PUBLIC LICENSE Version 3) | C# | symbol `FinalizeTrade`

Checked: `Player_Trade.cs` read in full (473 lines: open 30-100, close 102, add 116-170, reset and clear 177-194, accept 196-216, FinalizeTrade 218-305, decline 307, combat switch 325, busy state 342-360, inventory verify 362-420, known trade objects 422-470). `Container.cs` 400-438 read (capacity overloads; body after 438 not read). `Vendor.cs` 525-612 read (vendor buy total and the two price formulas; the rest of Vendor.cs not read). `Player_Commerce.cs` 54 read; the vendor transaction body (22-126 and `FinalizeBuyTransaction` at 59) not read. `Player_Inventory.cs` 82-100 read (create overloads; `TryAddToInventory` body not read). camera_scope: not applicable (trade topic). Confidence: high on the trade order of operations (every line of the trade class read). Medium on the escrow-failure consequence: the create result is ignored in the code, but what the database holds after a failed create was not read. No test was run.

## 1. Mechanism

- Two online players trade through a two-step accept. The window holds a set of item GUIDs per player (`ItemsInTradeWindow`) and an acceptance flag per player (`TradeAccepted`). Currency is an item too (coin stacks, Player_Commerce.cs 54), so zeny-like value moves as stack items.
- Order of steps as the code runs:
  - (a) Open (`HandleActionOpenTradeNegotiations`, 30). Refused for Olthoi players, when the partner has the "ignore all trade requests" option (49), when either side is already trading (56), or when either side is not in NonCombat mode (63). The initiator walks to the partner first (`CreateMoveToChain`, 72); if that fails the initiator gets the max-distance error (76). Only then both sides get `IsTrading = true` and a shared window opens. The partner side (the non-initiator branch, which runs without a walk) sets the same flags.
  - (b) Add (`HandleActionAddToTrade`, 116). Refused while `TradeTransferInProgress` is set (118). The caller's acceptance is cleared (121) and the partner's acceptance is cleared too (128). The item is looked up in the inventory, then equipped; attuned items are refused (140); a summoned pet device is refused; unique items are checked against the partner (154). Only then is the item GUID added to the caller's window (161). Every add clears both acceptances, so the partner always sees a fresh confirm. Add is the ONLY handler that clears both sides' acceptance.
  - (c) Reset (`HandleActionResetTrade`, 177-186) and `ClearTradeAcceptance` (188-194): each clears the CALLER's offered window (`ItemsInTradeWindow`) and the caller's acceptance only. There is no per-item remove handler in the file. `FinalizeTrade` failures (busy 356-357, capacity 424-425) call `ClearTradeAcceptance` on both sides, so both offered windows are wiped as well as both acceptances, not just the confirmations. A failed ownership check (369/375) declines only that side, leaving the partner's acceptance set.
  - (d) Accept (`HandleActionAcceptTrade`, 196). Sets the caller's acceptance and tells both clients. If the partner has also accepted (214), `FinalizeTrade` runs. Otherwise it waits.
  - (e) Finalize, gate (`FinalizeTrade`, 218-220). Busy-state check (`VerifyTrade_BusyState`, 342): refused if either side is busy; both acceptances are cleared. Inventory verify (`VerifyTrade_Inventory`, 362): every offered GUID must still be in the owner's inventory or equipment (364-375, else that side declines); then `CanAddToInventory` for each side against the other side's offer (379-380): burden and free slots, with separate encumbered and no-space messages. Either failure clears both acceptances and sends the reason. Nothing moves yet.
  - (f) Escrow (239-255). Both sides are marked busy (223-224) and `TradeTransferInProgress` is set on both. Each offered item is taken out of the owner (`TryRemoveFromInventoryWithNetworking` or the equipped-dequip path, 239 and 249) and kept in a local escrow list with its biota and biota lock (`tradedItems`).
  - (g) Delivery (258-270). A 0.5 s action-chain delay (258). Then each escrow item is created in the other player's inventory (`TryCreateInInventoryWithNetworking`, 262 and 265). The return value is not used. Both players get `TradeComplete` (267-268), busy and transfer flags are cleared (270-275), the traded biotas are saved in parallel (276), and both windows are reset (278-279).
- Decline (`HandleActionDeclineTrade`, 307-323) clears only the caller's acceptance (partner's flag is untouched) and notifies both sides "Trade confirmation failed".
- Combat switch (`HandleActionTradeSwitchToCombatMode`, 325) closes both trades if a player enters combat while trading.
- Tick: no loop. The 0.5 s delay is the only timed step. Known-trade-object tracking (`KnownTradeObjs`, near the end of the file) returns the owner of a traded item only while that owner is within `LocalBroadcastRange`; stale entries are pruned when the lookup runs.

## 2. Key functions

- `HandleActionOpenTradeNegotiations`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` from line 30. Open gates and walk-to-partner.
- `HandleActionAddToTrade`: same file from line 116. Add rules; every add clears both acceptances.
- `HandleActionAcceptTrade`: same file from line 196. Accept and call to finalize.
- `FinalizeTrade`: same file from line 218. Gate, escrow, delayed delivery, save, reset.
- `VerifyTrade_BusyState`: same file from line 342. Busy check that clears both acceptances.
- `VerifyTrade_Inventory`: same file from line 362. Ownership and capacity check for both sides.
- `CanAddToInventory` (list overload): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Container.cs` from line 433. Empty list is always allowed (438).
- `GetSellCost` and `GetBuyCost`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Vendor.cs` 577-584 and 591-598. Vendor price formulas (section 3).

## 3. Numbers vs mechanism

| Item | Donor formula or value | Range or default | file:line |
|---|---|---|---|
| Trade gate: combat | refused unless both `CombatMode == NonCombat` | flag | Player_Trade.cs:63 |
| Trade gate: already trading | refused if either `IsTrading` | flag | Player_Trade.cs:56 |
| Walk to partner | `CreateMoveToChain` before the window opens; failure gives max-distance error | distance not read | Player_Trade.cs:72, 76 |
| Accept lock | add clears both `TradeAccepted` (121, 128); reset, clear and decline clear only the caller's (183, 191, 311); a failed busy or capacity check clears both acceptances and both windows (190, 356-357, 424-425) | 2 flags | Player_Trade.cs:121, 128, 183, 191, 311, 356-357, 424-425 |
| Finalize gate | refused if either side `IsBusy` | flag | Player_Trade.cs:344 |
| Capacity check | `CanAddToInventory(list)`: burden and free slots, encumbered flag first | count and burden; limits not read | Container.cs:433, 438 |
| Escrow delay | `AddDelaySeconds(0.5f)` before delivery | 0.5 s | Player_Trade.cs:258 |
| Create on partner | `TryCreateInInventoryWithNetworking(wo)`; return value unused | bool, ignored | Player_Trade.cs:262, 265; Player_Inventory.cs:90 |
| Sell-to-player (vendor SellPrice) | `ceil(rate x value - 0.1)`, minimum 1, rate = `SellPrice ?? 1.0` | default rate 1.0 | Vendor.cs:579, 583 |
| Promissory note sell rate | fixed 1.15 | 1.15 | Vendor.cs:581 |
| Buy-from-player (vendor BuyPrice) | `floor(rate x value + 0.1)`, minimum 1, rate = `BuyPrice ?? 1` | default rate 1 | Vendor.cs:593, 597 |
| Promissory note buy rate | fixed 1.0 | 1.0 | Vendor.cs:595 |
| Purchase total | `uint totalPrice` summed over items, coin-value check against it; comment says rollover not checked | uint, no overflow check | Vendor.cs:535, 541-542, 548 |
| Currency | coin stacks are items with a fixed class | item stack | Player_Commerce.cs:54 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: lock on change (the donor clears both acceptances on add only; the sketch also clears both on withdraw as a Frankendom addition, and a failed finalize wipes both acceptances and both windows as the donor does), finalize only when both accepted, busy and ownership check, capacity check for both sides before any item moves, escrow out of both owners, delivery to the other side. It omits: the uniqueness and attuned details beyond a flag, the pet, the Olthoi and ignore-option gates, the walk-to-partner, the combat-mode close, the 0.5 s delay (escrow and delivery run in one call), the biota save and the known-object tracking. It reorders one step and fixes one donor gap: the donor ignores the result of each create; the sketch sends a delivery that does not fit back to its owner, so an item is never dropped.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Item { id: string; slots: number; burden: number; attuned: boolean; }
interface Holder {
  id: string;
  items: Map<string, Item>;        // what the holder owns
  slotsFree: number;
  burdenFree: number;
  busy: boolean;
  window: Map<string, Item>;       // offered items (by id)
  accepted: boolean;
}
interface Trade { a: Holder; b: Holder; inProgress: boolean; }
type Outcome = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): Outcome => ({ ok: false, reason });
const other = (t: Trade, who: Holder): Holder => (who === t.a ? t.b : t.a);

// Donor rule: an ADD clears BOTH acceptances (ACE 121, 128). Reset and decline clear only the caller's in the donor;
// the sketch's withdraw also clears both (Frankendom addition, there is no remove handler in ACE).
function clearBoth(t: Trade): void { t.a.accepted = false; t.b.accepted = false; }

function offer(t: Trade, who: Holder, itemId: string): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  const item = who.items.get(itemId);
  if (!item) return fail("not owned");
  if (item.attuned) return fail("attuned item");
  // uniqueness check not modelled here
  who.window.set(itemId, item);
  clearBoth(t);
  return { ok: true };
}

function withdraw(t: Trade, who: Holder, itemId: string): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  who.window.delete(itemId);
  clearBoth(t);
  return { ok: true };
}

function canTake(to: Holder, items: Item[]): boolean {
  const slots = items.reduce((s, i) => s + i.slots, 0);
  const burden = items.reduce((s, i) => s + i.burden, 0);
  return slots <= to.slotsFree && burden <= to.burdenFree;
}

// Failed finalize: the donor's ClearTradeAcceptance on both sides wipes both offered windows and both acceptances.
function decline(t: Trade, reason: string): Outcome {
  clearBoth(t);
  t.a.window.clear();
  t.b.window.clear();
  return fail(reason);
}

function accept(t: Trade, who: Holder): Outcome {
  if (t.inProgress) return fail("transfer in progress");
  who.accepted = true;
  if (!other(t, who).accepted) return { ok: true };
  return finalize(t);
}

function finalize(t: Trade): Outcome {
  if (t.a.busy || t.b.busy) return decline(t, "too busy");
  // every offered item must still be owned by its holder (else decline, nothing moves)
  for (const h of [t.a, t.b]) {
    for (const id of h.window.keys()) if (!h.items.has(id)) return decline(t, "item gone");
  }
  const fromA = [...t.a.window.values()];
  const fromB = [...t.b.window.values()];
  if (!canTake(t.b, fromA) || !canTake(t.a, fromB)) return decline(t, "not enough room");

  // phase 1: escrow. Items leave their owners; both sides are busy and the trade is in progress.
  t.inProgress = true;
  t.a.busy = true;
  t.b.busy = true;
  for (const it of fromA) { t.a.items.delete(it.id); t.a.slotsFree += it.slots; t.a.burdenFree += it.burden; }
  for (const it of fromB) { t.b.items.delete(it.id); t.b.slotsFree += it.slots; t.b.burdenFree += it.burden; }

  // phase 2: deliver. The donor ignores the result of its create call; here a delivery that does not fit goes back to its owner.
  const deliver = (to: Holder, owner: Holder, list: Item[]): void => {
    for (const it of list) {
      if (to.slotsFree >= it.slots && to.burdenFree >= it.burden) {
        to.items.set(it.id, it);
        to.slotsFree -= it.slots;
        to.burdenFree -= it.burden;
      } else {
        owner.items.set(it.id, it);  // returned to owner, never dropped
        owner.slotsFree -= it.slots;
        owner.burdenFree -= it.burden;
      }
    }
  };
  deliver(t.b, t.a, fromA);
  deliver(t.a, t.b, fromB);

  t.a.window.clear();
  t.b.window.clear();
  t.a.busy = false;
  t.b.busy = false;
  t.a.accepted = false;
  t.b.accepted = false;
  t.inProgress = false;
  return { ok: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2): exit 0.

## 5. Lands in

- TARGET `origins/server/trade.ts` (proposed new module, same as the rathena note; the Frankendom path was not checked from this box). Escrow and delivery are the two legs of one `settle()` call, not two writes.
- Parity-checklist row 18 (loot ownership and XP award; trade is ownership transfer). Sub-line: one ledger, settle() is the only door; a traded item has exactly one owner at every moment. Not row 5 and not row 23.
- Reuse tag: rewrite-from-idea (AGPL-3.0, copyleft: clean-room only)
- Brief rule served: one ledger (every move is a settle row); server-verified outcome (ownership and capacity checked on the server before any item moves); take-one loot (an item is never owned by two characters).

Best transferable idea: adding to the offer clears both confirmations (the donor does this on add only; we extend it to any offer change), and a trade only moves items after a fresh busy and capacity check on both sides, so a confirmed offer can never change under the other player.
Decision (proposed): adapt — adopt the lock-on-add rule (extended by us to withdraw) and the capacity pre-check (the donor's lock on add is the anti-scam rule that rathena lacks); adapt the escrow-then-deliver shape into one settle() call with both rows, and fix the donor's ignored create result by returning a failed delivery to its owner in the same write.
Acceptance: a server test where A confirms, then B adds one item: both confirmations clear and A's confirm must be repeated; a second test where B has no free slot for A's item: the trade is refused before any item moves, and if the delivery check fails mid-settle, the item stays with its owner and the ledger sums are unchanged.

## 6. Gaps and risks

- Ignored create result (donor defect, read in code): `TryCreateInInventoryWithNetworking` returns bool and the delivery loop does not check it (Player_Trade.cs:262, 265). The escrow is already removed from the owner, so a failed create can leave an item with no owner in memory. What the database holds after that was not read (Player_Inventory.cs `TryAddToInventory` body not read). Fix: as in the sketch, return the item to its owner in the same settle.
- Donor gap kept in mind: a decline or reset clears only the caller's acceptance and window, leaving the partner's acceptance set; the sketch's withdraw clears both so a confirmation can never outlive a change to the offer. `FinalizeTrade` does not re-check the partner's `TradeAccepted` or window after verify; the verify steps run immediately before escrow so the window is not exposed.
- Escrow is a delay window, not one write (Player_Trade.cs:258): items are out of both inventories for 0.5 s, and a crash in that window is not analysed here. Frankendom should not copy the delay; one settle() row pair has no in-between state.
- The purchase total is a uint sum with an explicit "detect rollover?" comment and no check (Vendor.cs:535-542). Fix: clamp and report, as the sum is built.
- Price rounding differs by direction: sell-to-player uses ceil(x - 0.1), buy-from-player uses floor(x + 0.1), and both multiply in float (single precision, cast in the code) before rounding. The rounding should be one function in Frankendom with a test on the boundary values.
- No tax or fee on trades (trade code read in full; none found). Vendor margins are the SellPrice and BuyPrice rates per vendor. Frankendom sinks must come from data (vendor rates per zone), not from the trade code.
- Presence: the donor needs the initiator to walk to the partner and requires NonCombat for both (Player_Trade.cs:63, 72). Frankendom's "cross-zone trading (presence)" is not covered; the walk gate would need the zone check too.
- Item limits per trade (slots, zeny cap) were not found in Player_Trade.cs; the donor's limit is the free slots and burden of the partner (Container.cs:433). Frankendom needs explicit per-trade caps as data.
- Bound and unique rules: unique items are checked against the partner (Player_Trade.cs:154); the donor has no account-bound flag in this file (not read elsewhere). Test accounts and bound pieces need Frankendom rules.
- Vendor transaction body (`Player_Commerce.cs` 22-126, 59 `FinalizeBuyTransaction`) was not read, so the buy-side settle and stock behaviour are not claimed here.
- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Table row 'every add, remove, reset or decline clears both TradeAccepted' wrong for 183/191/311: reset, ClearTradeAcceptance and decline clear only the caller's; only add clears both (121, 128). No per-item remove handler exists.
- Headline idea and sketch comment ('any add, remove or decline') overstated the donor.
- ClearTradeAcceptance (190) also clears the caller's offered window, so a busy or capacity failure wipes both windows, not only acceptances; failed ownership check declines only that side (369/375).
- Missed: FinalizeTrade does not re-check partner acceptance or window after verify; KnownTradeObjs tracking as described.

Fixed 2026-10-12: mechanism (c), decline, table row, headline idea, decision and sketch comments corrected; sketch decline() now also wipes both windows (donor behaviour), withdraw labelled as a Frankendom addition. Typecheck below.
