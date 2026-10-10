# ACEmulator-ACE (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Trade.cs` (two-party trade state machine: open, add, accept, finalize, decline, close), `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Container.cs` (`CanAddToInventory`, room check) | Licence: GNU Affero General Public License v3 (repo `LICENSE`, read; no per-file header) | C# | symbol `FinalizeTrade` (entry `HandleActionAcceptTrade`)

Checked: Read in full: `Player_Trade.cs` 30-115 (open and close), 116-176 (add to offer), 177-217 (reset, clear, accept), 218-306 (finalize and item lookup), 307-430 (decline, combat switch, busy and inventory verification), 430-473 (known-object tracking, not used in the note). `Container.cs` 433-460 (list room check; the body of `CanAddToInventory(worldObject)` and the list overload were read). Also read in passing: `Vendor.cs` 573-616 (vendor buy and sell prices, not written up here). Callers: `FinalizeTrade` is called only from `HandleActionAcceptTrade` (line 215). The network handlers that call `HandleActionAddToTrade` and `HandleActionTradeSwitchToCombatMode` were not read. Not read: `HasEnoughBurdenToAddToInventory` (the burden rule), `GetFreeContainerSlots` and `GetFreeInventorySlots` (the slot counts), the persistence path of `TryRemoveFromInventoryWithNetworking` (whether removal is saved before the 0.5 s delay). Confidence: high on the state machine and the order of checks (read and receipted); medium on the room check (the burden helper was not read). Nothing was executed.

## 1. Mechanism

- Open (`Player_Trade.cs` 30-100). The initiator's request is refused if either side is an Olthoi (32), the partner ignores trade requests (49, initiator only), either side is already trading (56), or either side is not in non-combat mode (63). The initiator walks to the partner (`CreateMoveToChain`, 72); a failed move reports max distance (76). On success the partner is set up with the same checks, both sides start with empty offer windows and the partner link is set (`IsTrading`, `TradePartner`).
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

@@SKETCH@@

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
