# ACEmulator-ACE (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` (two-party trade state machine: open, add, accept, finalize, decline, close), `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Container.cs` (`CanAddToInventory`, room check) | Licence: GNU Affero General Public License v3 (repo `LICENSE`, read; no per-file header) | C# | symbol `FinalizeTrade` (entry `HandleActionAcceptTrade`)

Checked: Read in full: `Player_Trade.cs` 30-115 (open and close), 116-176 (add to offer), 177-217 (reset, clear, accept), 218-306 (finalize and item lookup), 307-430 (decline, combat switch, busy and inventory verification). Not read: `Player_Trade.cs` 430-473 (known-object tracking). `Container.cs` 433-460 (list room check; the body of `CanAddToInventory(worldObject)` and the list overload were read). Also read in passing: `Vendor.cs` 573-616 (vendor buy and sell prices, not written up here). Callers: `FinalizeTrade` is called only from `HandleActionAcceptTrade` (line 215). The network handlers that call `HandleActionAddToTrade` and `HandleActionTradeSwitchToCombatMode` were not read. Not read: `HasEnoughBurdenToAddToInventory` (the burden rule), `GetFreeContainerSlots` and `GetFreeInventorySlots` (the slot counts), the persistence path of `TryRemoveFromInventoryWithNetworking` (whether removal is saved before the 0.5 s delay). Confidence: high on the state machine and the order of checks (read and receipted); medium on the room check (the burden helper was not read). Nothing was executed.

## 1. Mechanism

- Open (`Player_Trade.cs` 30-100). The initiator's request is refused if either side is an Olthoi (32), the partner ignores trade requests (49, initiator only), either side is already trading (56), or either side is not in non-combat mode (63). The initiator walks to the partner (`CreateMoveToChain`, 72); a failed move reports max distance (76). On success the partner side re-runs its own checks (Olthoi, trading state, combat mode) but not the ignore option or the partner-Olthoi check, which apply to the initiator only (49, 56-63). Then both sides are set trading, linked, and their offer windows are cleared (the else branch, 84-98).
- Offer (`HandleActionAddToTrade`, 116-161). Refused while a transfer is in progress (118). Any change clears both acceptances: the adder's (121) and the partner's (128). An attuned item (140), a summoned pet device, or a unique the partner cannot take (154) is refused. Only then does the item enter the offer set (161).
- Accept (`HandleActionAcceptTrade`, 196-216). Refused while a transfer is in progress (198). The accepter's flag is set and the partner is told. Finalize runs only if the partner has already accepted (214-215).
- Finalize (`FinalizeTrade`, 218-283), in this order:
  1. Busy check (`VerifyTrade_BusyState`, 344 onward): if either side is busy, both acceptances are cleared, nothing moves.
  2. Ownership check (`VerifyTrade_Inventory`, `GetItemsInTradeWindow`): every offered item must still be in the pack or equipped. A missing item declines that side only (311 for the decliner's flag); the partner's flag is left as it was.
  3. Room check on both sides (`CanAddToInventory` on the other side's items, 379-380; list overload at `Container.cs` 433-460): burden first (441), then container-slot items against free container slots (447), then the rest against free inventory slots (457). Failure clears both acceptances; nothing moves.
  4. Move: both sides' transfer flags are set (226-227). Items are removed from both inventories (loops at 237 and 247). After a 0.5 s delay (258), the items are created on the other side (261-268), both transfer flags are cleared, both are unbusied, the moved biotas are saved (276), and both trade windows are reset (278).
- Decline (`HandleActionDeclineTrade`, 307-323): clears the decliner's acceptance and sends a failure message to both.
- Close (`HandleActionCloseTradeNegotiations`, 102-114): refused while a transfer is in progress (104). Otherwise clears the link, the offers and the acceptances.
- Combat switch (`HandleActionTradeSwitchToCombatMode`, 325-338): entering combat while trading closes the trade for both sides.

## 2. Key functions

- `HandleActionAcceptTrade()`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` 196-216. The commit trigger.
- `FinalizeTrade(Player target)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` 218-283. Busy, ownership, room, move.
- `HandleActionAddToTrade(uint, uint)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` 116-175. Clears both acceptances on every change.
- `VerifyTrade_Inventory(Player)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` 362-428. Ownership and room, with the decline vs clear split.
- `CanAddToInventory(List<WorldObject>, out bool, out bool)`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Container.cs` 433-460.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Commit delay after both accept | 0.5 s (`Player_Trade.cs` 258) |
| Acceptance cleared on any offer change | none (a rule: both flags reset, 121, 128) |
| Room: burden, then container slots, then main slots | the three checks at `Container.cs` 441, 447, 457. The numbers come from the character, not from zone data |
| Refusal for attuned items, pet devices, unique items | the three checks at `Player_Trade.cs` 140, the pet check, and 154 |

The donor has no coin or price logic in this path. Coins move as items too (the trade is item-for-item). No prices are involved in the state machine.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: offer changes clear both acceptances; a commit needs both acceptances; then the busy check, the ownership check (a missing item declines only that side), the room check (burden, container slots, main slots) and the move. It omits: the open-trade checks (Olthoi, ignore option, combat mode, distance), the uniqueness check (folded into `tradeable`), the decline and close messages, the combat switch, the 0.5 s delay (the move happens in one step), the persistence of the moved items, `KnownTradeObjs`, the equipped-item lookup (folded into `owned`), and the exact burden rule (the sketch assumes a plain sum against the headroom; `HasEnoughBurdenToAddToInventory` was not read).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Side = "a" | "b";

interface ItemInfo {
  tradeable: boolean;   // false for attuned items, a summoned pet device, or a unique the partner cannot carry
  backpack: boolean;    // true if the item takes a container (backpack) slot rather than a main slot
  burden: number;
}

interface Trader {
  id: string;
  offer: Set<string>;         // item ids in this side's offer window
  owned: Set<string>;         // item ids this trader holds (pack and equipped)
  accepted: boolean;          // this side has accepted the current offers
  busy: boolean;              // doing something else that blocks a trade
  freeContainerSlots: number;
  freeInventorySlots: number;
  burdenHeadroom: number;
}

interface TradeState {
  a: Trader;
  b: Trader;
  items: Map<string, ItemInfo>;
  transferring: boolean;      // set while the items move; blocks every edit and accept
}

type Outcome = "open" | "transferred" | "declined" | "cleared" | "blocked";

// Any change to either offer clears BOTH acceptances, so neither side can confirm an offer the other has not seen.
function addOffer(t: TradeState, side: Side, item: string): Outcome {
  if (t.transferring) return "blocked";
  const info = t.items.get(item);
  if (info === undefined || !info.tradeable) return "blocked";
  t.a.accepted = false;
  t.b.accepted = false;
  t[side].offer.add(item);
  return "open";
}

function clearAcceptance(t: TradeState): void {
  t.a.accepted = false;
  t.b.accepted = false;
}

// Accepting only commits when both sides have accepted the same offers.
function accept(t: TradeState, side: Side): Outcome {
  if (t.transferring) return "blocked";
  t[side].accepted = true;
  if (!(t.a.accepted && t.b.accepted)) return "open";
  return finalize(t);
}

// Room check for the items a side would receive: burden first, then backpack slots, then main slots.
function canReceive(recv: Trader, incoming: string[], items: Map<string, ItemInfo>): boolean {
  let burden = 0;
  let containers = 0;
  for (const id of incoming) {
    const info = items.get(id);
    if (info === undefined) return false;
    burden += info.burden;
    if (info.backpack) containers += 1;
  }
  if (burden > recv.burdenHeadroom) return false;
  if (containers > recv.freeContainerSlots) return false;
  if (incoming.length - containers > recv.freeInventorySlots) return false;
  return true;
}

// Commit: busy check, then ownership of every offered item (a missing item declines that side only), then room on both sides (clears acceptance).
function finalize(t: TradeState): Outcome {
  if (t.a.busy || t.b.busy) {
    clearAcceptance(t);
    return "cleared";
  }
  for (const side of ["a", "b"] as const) {
    for (const id of t[side].offer) {
      if (!t[side].owned.has(id)) {
        t[side].accepted = false; // the other side's acceptance is left as it was, as in the donor
        return "declined";
      }
    }
  }
  const aGets = [...t.b.offer];
  const bGets = [...t.a.offer];
  if (!canReceive(t.a, aGets, t.items) || !canReceive(t.b, bGets, t.items)) {
    clearAcceptance(t);
    return "cleared";
  }
  // Move. The donor removes both offers first, waits 0.5 s, then creates the items on the other side; this sketch does it in one step.
  t.transferring = true;
  for (const id of t.a.offer) { t.a.owned.delete(id); t.b.owned.add(id); }
  for (const id of t.b.offer) { t.b.owned.delete(id); t.a.owned.add(id); }
  t.a.offer.clear();
  t.b.offer.clear();
  clearAcceptance(t);
  t.transferring = false;
  return "transferred";
}

// Entering combat or closing the window ends the negotiation for both sides (the donor also resets the partner link).
function closeTrade(t: TradeState): void {
  if (t.transferring) return;
  t.a.offer.clear();
  t.b.offer.clear();
  clearAcceptance(t);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/trade.ts` (new, server side; no `src/fight/` module fits, since trade is not fight logic). The state lives on the server, and the commit writes the same ledger as loot and kills. Nearest parity-checklist row: 18 (loot roll and XP award: item ownership moves on the server ledger). Sub-line: "server tick: fixed step, input intake, per-tick NPC budget" is not used here; the 0.5 s delay becomes a server-tick count.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, the state machine from the described mechanism, no code copied)
- Brief rule served: 1 (one ledger: the server moves items, the client only shows the window); zones as data: none

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Frankendom has no player-to-player trade today. A full trade window is not needed to get the safety rule: any two-party exchange (a loot split, a duel wager, a Pit stake) should use the same commit rule: a change clears both acceptances, the commit re-checks ownership and room, and only then moves items.
- Ownership and room are checked at commit, not at offer time. The donor checks attunement and uniqueness at offer time (140, 154) and ownership and room at commit (379-380). Frankendom must enforce the same split, or an offered item can be spent by a fight between offer and commit. The sketch does this with `owned` at commit.
- The donor removes both sides' items before the 0.5 s delay and creates them after. Whether the removal is persisted before the delay was not traced. Frankendom's one ledger should move items in a single server write, so no crash window exists. Test it.
- A missing item declines only the side that lost it; the partner's acceptance stays. Frankendom should decide whether the partner's acceptance survives a decline. The donor keeps it.
- The donor's burden and slot rules (`HasEnoughBurdenToAddToInventory`, `GetFreeInventorySlots`) were not read. Do not port the room numbers from this note.
- Trading closes on entering combat (`Player_Trade.cs` 327). Frankendom's MAX_ATTACKERS and the duel state need the same rule: no commit while either side is in a fight.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one ledger; the server moves items); zones as data: none

Best transferable idea: Make a two-party exchange commit only when both sides accept the same offer: any change clears both acceptances, and the commit re-checks ownership and room before anything moves.
Decision (proposed): adapt - take the two-acceptance commit and the re-check at commit for any two-party exchange (duel wager, loot split, Pit stake); do not build a player trade window yet.
Acceptance: a server test where A offers a sword, B accepts, A adds a potion (B's acceptance clears, nothing moves), both accept again and the sword and potion swap exactly once; and if A's sword is dropped between the offers, the commit declines and neither item moves.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Note (Finalize steps 1 and 3, Close) and sketch clearAcceptance() say a busy or room failure only 'clears both acceptances'. Real ClearTradeAcceptance (Player_Trade.cs 188-194) also does ItemsInTradeWindow.Clear(), so both offer windows are emptied and players must re-add items; the sketch keeps offers. This is a behaviour difference in the very rule the note recommends porting. (2) Finalize remove loops (237-245, 247-255) silently skip an item whose TryRemove fails; no abort or rollback - not mentioned and the sketch assumes every offered item moves. Verified OK: open-trade checks 32-67 (initiator-only ignore/Olthoi), add clears both acceptances before validation (121,128), attuned/pet/unique refusals 140-159, accept 196-216, FinalizeTrade order 220-283 with 0.5 s delay and SaveBiotasInParallel, missing-item decline per side (367-377), CanAddToInventory 433-464 (burden, container slots, main slots), combat-switch close 325-340, AGPL v3.

**Missed:** CanAddToInventory returns true immediately for an empty list (Container.cs 438, one-way trade) - sketch canReceive also does by loop but note does not state it. Gold/pyreal path is just items (note says so).
