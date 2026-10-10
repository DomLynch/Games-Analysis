# Dawn-of-Light-DOLSharp (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/CustomNPC/ConsignmentMerchant.cs` (`BuyItem` 527-625) with `GameServer/packets/Client/168/PlayerWithdrawMerchantMoney.cs` 37-88 and `GameServer/Finance/Wallet.cs` | Licence: GPL-2.0-or-later (repo `LICENSE` is GPL version 2; per-file header in `gplheader.txt`: "either version 2 of the License, or (at your option) any later version"; copyleft, clean-room only) | C# | symbol `ConsignmentMerchant.BuyItem`

Checked: The hinted file `GameServer/Finance/Currency.cs` (77 lines, read in full) only defines currency types (copper, bounty points, mithril, item currency). The real economy is in the consignment (player-run) merchant and the wallet. Read in full: `Currency.cs` (77 lines), `Money.cs` (81 lines), `Wallet.cs` (136 lines). Read: `PlayerWithdrawMerchantMoney.cs` 30-90 (lines 1-29 are usings and the class header); `ConsignmentMerchant.cs` 44-49 (lock object), 186-213 (`TotalMoney`), 360-430 (remove and set price), 527-530 and 530-640 (`BuyItem`; 527 is the signature), 700-760 (interact and load); grep-only for the dialog at 474 and the entry points at 448, 506 and 515-523; `ServerProperties.cs` 2128-2160 (switches and the fee); `HouseMgr.cs` 780-815 (rent, partial). Not read: `GameMerchant.cs` (NPC shops, 546 lines), `MarketExplorer.cs`, `MarketSearch.cs`, `PlayerTradeWindow.cs` (player-to-player trade, 738 lines), `MerchantCatalog.cs`, `LootGeneratorMoney.cs`, `MoveItemFromObject` (the item move result), `InventoryItem.SellPrice` (its type is inferred as int from `int sellPrice = item.SellPrice;` at 555, because C# would need a cast otherwise), the `m_moneyLock` declaration, and the body of `FindFirstEmptySlot`. Confidence high on the order of `BuyItem`, the fee formula and the seller credit (read end to end); high on the 32-bit overflow (arithmetic and a run of the same 32-bit operations, not a run of the donor); medium on the BP-path race (I did not trace the wallet lock against the inventory lock). Callers: `BuyItem(player)` at 506 is the direct buy; `BuyItem(player, true)` at 523 follows the market dialog (474); both seen by grep, the bodies of 448-523 were not read. Other callers of `OnPlayerBuy` (`PlayerBuyRequestHandler.cs` 69-73 and `LotMarker.cs` 224) were grep-only. `camera_scope` does not apply.

Best transferable idea: a sale pays the seller the list price and charges the buyer the list price plus a percentage fee, so the fee is a named sink; every check (price, funds, free slot) runs before any money moves, and the seller's proceeds sit in one pool that is paid out whole on withdrawal.

Decision (proposed): adapt — keep the three checks before any change, the fee as a named sink, and the seller credited the list price; reject the separate merchant money pool (a second ledger held in its own database row until withdrawal) and the unchecked item move; use exact integer math with a bound on the list price, not 32-bit int.

Acceptance: a server test lists an item at 1000 copper; a buyer through the market explorer pays 1200, the seller's ledger rises by 1000, and the total of all ledgers falls by exactly 200 (the fee); a listing at 110,000,000 copper charges 132,000,000 with no wrap, and a buyer with 131,999,999 is refused with no item and no money moved.

## 1. Mechanism

- Purchase flow, `BuyItem` (`ConsignmentMerchant.cs` 527-625). (a) The pending-buy property is cleared (530). (b) Under the merchant lock (534; `LockObject` returns `m_vaultSync`, 44-49), the item is found in the client's slot of the merchant inventory; if not found, the buy stops (537-553). (c) Price: `sellPrice = item.SellPrice` (555) and `purchasePrice = sellPrice` (556). If the buy came through the market explorer and the fee is above 0, `purchasePrice += (purchasePrice * MARKET_FEE_PERCENT) / 100` (558-561). The fee is int arithmetic. (d) Under `player.Inventory` (563): a price of 0 or less stops the buy (565-570). Funds: if the bounty-point switch is on, the buyer's bounty points must cover `purchasePrice` (572-579); otherwise the copper balance must (580-587). (e) A free backpack slot is found (589); none stops the buy (591-595). Only now does money move. (f) Bounty points: a message, then `RemoveMoney` (599-600), and the return value is not checked. Copper: `RemoveMoney` (604); if it returns false, the buy stops (609-612), otherwise the purchase message is sent (607). (g) The seller is credited `TotalMoney += sellPrice` (615): the list price, not the buyer's price. The difference is the fee, which goes to no account. (h) The item moves (622): `MoveItemFromObject` runs, and its result is passed to `NotifyObservers` with no check.
- Who pays the fee. `BuyMarketResponse` (515-523, grep-only) calls `BuyItem(player, true)` after the player confirms the dialog that says the market explorer "costs an additional ... % fee" (474, grep-only). The direct buy (506) calls `BuyItem(player)`, so the fee is zero there.
- Seller's pool. `TotalMoney` (193-213) is a locked property over `m_totalMoney` (45). Every set writes the house's consignment row to the database at once (208-210). On load it is read back (754). The pool is separate from the seller's wallet.
- Withdrawal, `PlayerWithdrawMerchantMoney.HandlePacket` (`PlayerWithdrawMerchantMoney.cs` 37-88). The active merchant is checked (44-46), then the house (49-51), then the withdraw permission (54-58). Under the same merchant lock (60, the same object as the buy at 534), the whole pool is read (62). If it is above 0: bounty points or copper are added to the buyer's wallet (66-76), and the pool is reduced by the whole amount (78). The new pool is sent to the client (85).
- The wallet, `Wallet.cs`. Stored balances are a dictionary of currency to long (9). Item currency has no stored balance: `GetBalance` sums the counts of matching backpack stacks each time (21-27). `AddMoney` rejects item currency (40-43), adds under the balance lock (44-49) and saves (49). `RemoveMoney` for item currency first checks the total (60), then removes from the matching stacks in order: a partial count from the stack that covers the rest (67-70), or a whole stack and move on (72-76); it returns true (78). For stored currency: check (84), subtract (85), save (87), and drop a zero entry (99).
- Money, `Money.cs`. Amounts are long; a negative mint throws (16). Text splits copper into platinum, gold, silver and copper: 100 copper per silver (29-30), 100 silver per gold (31), 1000 gold per platinum (32).
- Rent, `HouseMgr.cs` 780-815. Rent is taken from the house's kept money first (794-799). Any remainder is taken from the consignment pool (802-810); if the pool cannot cover it, the house is scheduled for repossession (812-815). The pool is therefore also a rent source (read partly).

## 2. Key functions

- `BuyItem`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/CustomNPC/ConsignmentMerchant.cs` 527-625. Price, funds, slot, payment, seller credit, item move.
- `BuyMarketResponse` and the direct entry: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/CustomNPC/ConsignmentMerchant.cs` 506, 515-523.
- `TotalMoney`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/CustomNPC/ConsignmentMerchant.cs` 193-213.
- `SetSellPrice`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/CustomNPC/ConsignmentMerchant.cs` 381-430 (the list price is set here; non-tradable items are stored at 0, 405-410).
- Withdraw: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/packets/Client/168/PlayerWithdrawMerchantMoney.cs` 37-88.
- Wallet: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/Finance/Wallet.cs` 19-99.
- Fee and switch: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverproperty/ServerProperties.cs` 2133-2158.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Buyer pays list plus a percentage fee; seller gets the list price; the fee is a sink | Fee default 20 percent (theirs, ServerProperties.cs 2157; the value is the attribute default) |
| Fee only on the market-explorer path | Flag at 558 and 523 (theirs) |
| Checks before money moves: price above 0, funds, free slot | None (the order, 565-595) |
| Pool paid out whole on withdrawal, with a permission check | None (62-78) |
| Currency stored as a balance, or counted from items | Bounty points and copper stored; item currency counted (theirs, Wallet.cs 9, 21-27) |
| Denominations | 100 copper per silver, 100 silver per gold, 1000 gold per platinum (theirs, Money.cs 29-32) |
| Fee arithmetic in 32-bit int | Overflow above 107,374,182 copper at a 20 percent fee (derived: 2,147,483,647 / 20; see section 6) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the purchase: price, then funds, then slot, all before any ledger change; the fee is the list price times the percent, floored (C# int division truncates, the same for positive values); the seller is credited the list price and the fee is burned. It uses one currency (copper) and one ledger map; it omits the bounty-point choice, the item move (`MoveItemFromObject`, not read), the observer notification, the withdraw permission and withdrawal, the database save, the lock, and the rent path. It uses JavaScript number arithmetic, which is exact at these magnitudes; it does not reproduce the donor's 32-bit fee arithmetic (section 6).

```ts
// Licence: GPL-2.0-or-later (donor, per gplheader.txt: "either version 2 of the License, or (at your option) any later version"). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Money is an integer count of the smallest unit (copper) throughout.
interface Listing { id: string; seller: string; listPrice: number; }
interface Ledger { [account: string]: number; }

type Outcome =
  | { ok: true; buyerPays: number; sellerCredit: number; fee: number }
  | { ok: false; reason: "no-price" | "no-funds" | "no-slot" };

// Checks run in the order: price, funds, slot. Nothing is charged until all three pass.
// Buyers using the market explorer pay the list price plus a percentage fee; the fee is a sink
// (it is in neither the buyer's balance nor the seller's).
function quotePurchase(
  l: Listing,
  feePercent: number,
  viaExplorer: boolean,
  buyerFunds: number,
  freeSlots: number,
): Outcome {
  const fee = viaExplorer && feePercent > 0 ? Math.floor((l.listPrice * feePercent) / 100) : 0;
  const buyerPays = l.listPrice + fee;
  if (buyerPays <= 0) return { ok: false, reason: "no-price" };
  if (buyerFunds < buyerPays) return { ok: false, reason: "no-funds" };
  if (freeSlots < 1) return { ok: false, reason: "no-slot" };
  return { ok: true, buyerPays, sellerCredit: l.listPrice, fee };
}

// One ledger mutation: the buyer is debited, the seller credited with the list price, and the fee is burned.
function commitPurchase(
  ledger: Ledger,
  buyer: string,
  l: Listing,
  feePercent: number,
  viaExplorer: boolean,
  freeSlots: number,
): Outcome {
  const funds = ledger[buyer] ?? 0;
  const q = quotePurchase(l, feePercent, viaExplorer, funds, freeSlots);
  if (!q.ok) return q;
  ledger[buyer] = funds - q.buyerPays;
  ledger[l.seller] = (ledger[l.seller] ?? 0) + q.sellerCredit;
  return q;
}
export {};
```

Checked values from running this sketch on the VPS (`tsc --strict` clean, then run with node; sketch outputs, not donor runs): list 1000 with the explorer fee gives buyer pays 1200, fee 200; direct buy gives 1000 with no fee; funds 1199 for 1200 are refused; no free slot is refused; list 110,000,000 gives buyer pays 132,000,000 (fee 22,000,000); in the commit run the ledger total falls by exactly the fee (5000 before, 4800 after). The same 32-bit operations the donor uses, emulated in the check file and not run on the donor, give a fee of -20,949,672 and a buyer price of 89,050,328 for the same 110,000,000 listing, while the seller is still credited 110,000,000 (line 615).

## 5. Lands in

- TARGET `origins/economy/market.ts` (proposed new module: listing price, buyer quote, fee sink and ledger commit). The Frankendom repo was not opened under the batch rules, so this path is a proposal; check it against the tree before use.
- Parity-checklist row 21 (catalogue fields): the list price is a catalogue or listing field, and the fee percent is zone or catalogue data. The purchase transaction itself fits no row 1-23; it is "none" for that part and needs the one-ledger commit rule.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only).
- Brief rule served: one ledger, server-verified (one ledger map; the server runs the quote and the commit); zones as data for the fee percent and the currency; rules 7-9 n/a.

## 6. Gaps and risks

- Licence GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Integer overflow in the fee (`BuyItem` 560). `purchasePrice` and `sellPrice` are C# int (555-556), `MARKET_FEE_PERCENT` is int (2158), and the repo has no `CheckForOverflowUnderflow` setting in its `.csproj`, `.props` or `.targets` files (grep). C# int arithmetic wraps by default, so `purchasePrice * 20` wraps above 2,147,483,647, which happens above 107,374,182 copper. My run of the same 32-bit operations gives a buyer price of 89,050,328 for a 110,000,000 listing, while the seller is credited 110,000,000 (615). That is a copper faucet of about 20.9 million with no source. The seller can enter that price: `SetSellPrice` casts a uint to int (405). Not run on the donor; reproduce in a test before reporting.
- Bounty-point path does not check the removal (600). The funds check (574) is before the removal and outside the wallet lock, so a concurrent spend can make `RemoveMoney` return false, and the buyer still gets the item. Copper does check (604). Not traced; treat as a race to test.
- Seller credited before the item moves, and the move result is not checked (615 before 622). If the move fails after the credit, the buyer has paid and has no item, with no refund. Frankendom must move the item and the money in one commit.
- Second ledger: the seller's proceeds are a separate pool in the house's consignment row (208-210), not in the wallet, until the seller withdraws (62-78). The pool also pays rent (HouseMgr 790-810). That is two ledgers for one money stream; Frankendom's one-ledger ruling means the sale should credit the seller's ledger entry directly, and rent should be a debit in that same ledger.
- Withdrawal pays the whole pool in one step (62-78). Fine for a single merchant; the sketch keeps the credit per sale so a partial withdrawal is possible if needed.
- The fee applies only through the market explorer (558, 523). A direct buy from a merchant pays no fee (506). Frankendom should decide which path pays the sink and write it as data.
- Item currency counted from inventory (Wallet.cs 21-27): the inventory is the single source for that currency. This is a useful one-ledger pattern for items that are currency. But `RemoveMoney` for item currency removes stacks before it returns (67-76) with no rollback, so the removal must sit inside one transaction if a later step can fail.
- The wallet's `SetBalance` is public and marked for privatisation (Wallet.cs 92-95). Frankendom's balance writes must all go through the server ledger.
- Licence GPL-2.0-or-later: the sketch does not copy any donor line.
