# OpenDAoC-OpenDAoC-Core (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs` | Licence: GPL (repo `LICENSE` is GNU GPL v3; `gplheader.txt` says "version 2 ... or (at your option) any later version"; GameMerchant.cs has no header of its own, its first lines are `using` directives) | C# | symbol `GameMerchant.OnPlayerBuy`, `OnPlayerSell`, `OnPlayerAppraise`

Checked: Read in full: instance `OnPlayerBuy` (87-140), `OnPlayerSell` (262-295), `OnPlayerAppraise` (304-336), the `ITEM_SELL_RATIO` property (ServerProperties.cs 876-877), and the buy and sell packet handlers that call them (callers read: PlayerBuyRequestHandler.cs 20-45, PlayerSellRequestHandler.cs 8-40). Not read: the static `OnPlayerBuy` overload (206-252, used by lot markers and AbstractServerRules), the `GameItemCurrencyMerchant` and `GameBountyMerchant` buy overrides, and `WORLD_PICKUP_DISTANCE`'s default value. Callers of the instance buy/sell: `PlayerBuyRequestHandler.cs:42`, `PlayerSellRequestHandler.cs:35`, `sell.cs:122` (grep only, not read in full). `craft.cs` calls the 4-argument page overload (line 142), which was not read. camera_scope: n/a (economy). Confidence: high on buy and sell order and the appraisal arithmetic; medium on the wider caller set.

Best transferable idea: a shop reads its price from its own list and the client sends only an item and a count, and a buy or sell is one check-then-apply step that moves no money when a check fails.
Decision (proposed): adapt — the server-read price and the check-then-apply shape fit the one ledger exactly, but the donor grants items before it debits and throws if the debit fails; Frankendom should debit and grant in one step, and the sell-back ratio should be per-shop zone data.
Acceptance: a server test asserts that buying with too little money, or with no inventory space, changes neither wallet nor inventory; buying 3 at price 100 debits 300 and grants 3; selling a price-199 item at ratio 50 credits 99; a non-droppable item sells for 0 and is not removed.

## 1. Mechanism

- Buy. The client sends an item slot and a count (`PlayerBuyRequestHandler.cs:42`). The merchant reads the template from its own trade list (93), not from the client. Count times `PackSize` gives the number of items (98-99). Total price is count times `template.Price` (104). Everything below runs inside `lock (player.Inventory.Lock)` (106).
  - Money check: if the player's money is below the total, send a message and return (108-111).
  - Distance: if the player is outside `WORLD_PICKUP_DISTANCE` from the merchant, send a message and return (114).
  - Grant: `AddTemplate` into the backpack (120). If it fails (no space), send a message and return. No money is taken.
  - Log, then `RemoveMoney(totalValue, ...)` (134). If that debit fails, the code throws `"Money amount changed while adding items."` (136). There is no rollback. The item grant happens BEFORE the debit.
- Sell. The client sends the inventory slot inside `lock (client.Player.Inventory.Lock)` (`PlayerSellRequestHandler.cs:23`), then calls `merchant.OnPlayerSell` (35). In order: refuse if not droppable (265); distance check (271); value = `OnPlayerAppraise(..., silent: true)` (277); value 0 means "not interested" (279); `RemoveItem` first (285); only then `AddMoney` (288). The debit of the item comes BEFORE the credit of money, so a failed removal pays nothing.
- Appraisal (`OnPlayerAppraise`, 304-336). Count is `max(1, Count)` and pack is `max(1, PackSize)` (309-310). Value = `Price * count / pack * ratio / 100` (312), where the ratio is `ITEM_SELL_RATIO`. Integer division in that left-to-right order. If `Price == 1` and the value rounded to 0, the value becomes `Price * count / pack` (314-315). If the item is not droppable, the value is 0 (317-319).
- Ratio. `ITEM_SELL_RATIO` is a server property with default 50 (ServerProperties.cs:876 attribute, 877 declaration). The description string is "Merchants are buying items at the % of initial value".
- Tick: none. Each action is one synchronous call from one packet. Not a loop.

Worked arithmetic (from the code, not run): a stack of 1 item with Price 199 and PackSize 1 appraises to `199 * 1 / 1 * 50 / 100` = 99. A Price-1 item appraises to 1, through the fallback.

## 2. Key functions

- `GameMerchant.OnPlayerBuy` (instance): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs` 87-140. The whole buy path: template, total, lock, money check, distance, grant, log, debit.
- `GameMerchant.OnPlayerSell`: same file, 262-295. Droppable check, distance, appraise, remove, credit.
- `GameMerchant.OnPlayerAppraise`: same file, 304-336. The sell-back formula, the price-1 floor, the non-droppable zero.
- Callers: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/packets/Client/168/PlayerBuyRequestHandler.cs` 42 and `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/packets/Client/168/PlayerSellRequestHandler.cs` 35. Both pass only the slot and the count (or the item) from the client; the price is looked up on the server.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Buy total = unit price x count, price from the merchant's own list | `template.Price` (server data, per template) |
| Pack: items granted = count x pack size when pack size > 0 | `template.PackSize` (server data); 0 means one item per count |
| Sell-back = price x count / pack x ratio / 100, integer maths | `ITEM_SELL_RATIO` default 50 (theirs, ServerProperties.cs 876) |
| Price-1 floor: an item priced 1 that rounds to 0 pays its own price | rule at GameMerchant.cs 314-315 |
| Non-droppable items pay nothing and cannot be sold | rule at 265 and 317-319 |
| Trade range | `WORLD_PICKUP_DISTANCE` (theirs; default not read) |
| Debit after grant (buy), remove before credit (sell) | order, not a number |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's price source, pack rule, integer sell formula, price-1 floor and non-droppable zero. It REORDERS two things on purpose: buy checks everything and then debits and grants in one call (the donor grants first and throws if the debit fails); sell checks droppable first (the donor computes a value and then zeroes it, the result is the same). It omits: the inventory lock, the distance check's real range (it is a boolean parameter), all messages and language keys, the log calls, the static housing overload, and the currency and bounty merchants. The inventory interface is a stand-in for `player.Inventory`.

```ts
// Licence: GPL (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Wallet { balance: number; }
interface Inventory {
  canAdd(itemId: string, qty: number): boolean;
  add(itemId: string, qty: number): void;
  remove(itemId: string): boolean;
}
interface ShopItem { id: string; price: number; packSize: number; }
type BuyResult =
  | { ok: true; paid: number; granted: number }
  | { ok: false; reason: "bad-count" | "out-of-range" | "no-funds" | "no-space" };

// Buy: the price comes from the shop's own list; the client only names an item and a count.
// Checks first, then debit and grant as one step (the donor grants first, then debits).
function buy(wallet: Wallet, inv: Inventory, item: ShopItem, packs: number, inRange: boolean): BuyResult {
  if (packs <= 0) return { ok: false, reason: "bad-count" };
  if (!inRange) return { ok: false, reason: "out-of-range" };
  const total = packs * item.price;
  const qty = item.packSize > 0 ? packs * item.packSize : packs;
  if (wallet.balance < total) return { ok: false, reason: "no-funds" };
  if (!inv.canAdd(item.id, qty)) return { ok: false, reason: "no-space" };
  wallet.balance -= total;
  inv.add(item.id, qty);
  return { ok: true, paid: total, granted: qty };
}

interface OwnedItem { id: string; price: number; count: number; packSize: number; droppable: boolean; }

// Sell-back value in the donor's integer order: floor(price*count/pack), then *ratio/100 with floor.
// A price-1 item that rounds to 0 pays its own count/pack value. Non-droppable items pay 0.
function appraise(item: OwnedItem, sellRatioPct: number): number {
  if (!item.droppable) return 0;
  const count = Math.max(1, item.count);
  const pack = Math.max(1, item.packSize);
  const base = Math.floor((item.price * count) / pack);
  let val = Math.floor((base * sellRatioPct) / 100);
  if (item.price === 1 && val === 0) val = base;
  return val;
}

type SellResult = { ok: true; paid: number } | { ok: false; reason: "out-of-range" | "not-interested" | "cant-remove" };

// Sell: remove the item first, then credit the wallet (the donor order). No credit if the removal fails.
function sell(wallet: Wallet, inv: Inventory, item: OwnedItem, sellRatioPct: number, inRange: boolean): SellResult {
  if (!inRange) return { ok: false, reason: "out-of-range" };
  const value = appraise(item, sellRatioPct);
  if (value === 0) return { ok: false, reason: "not-interested" };
  if (!inv.remove(item.id)) return { ok: false, reason: "cant-remove" };
  wallet.balance += value;
  return { ok: true, paid: value };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/et004-shop-ts.ts`, copy in the work folder as `et004-shop-ts.ts`).

## 5. Lands in

- TARGET `origins/economy/shop.ts` (new): merchant lists as zone data (item id, price, pack size, sell-back ratio per shop). The debit and credit themselves go through the one engine ledger (its module name is not named here; the Frankendom repo was not read for this note).
- Parity-checklist row 21 (catalogue fields): shop price, pack size and the droppable flag are catalogue fields. Row 18 (loot roll and XP award) does not fit a shop sale; the sell-back is a price, not a drop.
- Reuse tag: rewrite-from-idea (GPL; clean-room only)
- Brief rule served: one ledger (each buy and sell is one check-then-apply step; a failed check moves no money and grants nothing); server-verified (the price comes from the server's list, the client sends only a slot and a count); zones as data (the shop list and the sell-back ratio are data).

## 6. Gaps and risks

- Grant before debit. The donor relies on a throw if the debit fails after the items are already in the backpack. Frankendom must check money and space first and then apply both, and a test must show that a failed buy grants nothing and debits nothing.
- Faucet and sink. The sell-back ratio (50 by default) means an NPC sale CREATES money from an item (a faucet), and a buy-then-sell loop loses half (a sink). Frankendom must decide which items an NPC will buy at all. The donor sells any droppable item at the ratio and does not track item origin (not read in full whether the item's origin is recorded anywhere).
- Money is integer. The donor's ratio step floors at each division. Frankendom should keep money in integer minor units and copy the floor order, or the sell-back will drift by one unit.
- Price 1 special case. The floor rule is a quirk of low-price items, not a design. Frankendom should either drop it or write it as an explicit data rule.
- The sell-back ratio here is one server property for every merchant. Frankendom wants it per shop, so it is zone data, not a global. The donor's per-merchant overrides (guard merchant, currency merchant) were not read.
- The static `OnPlayerBuy` overload (206-252) and the bounty and currency merchant buys differ (bounty points, exchange items). Not read; do not port them from this note.
- Licence GPL: clean-room only. The sketch is written from the mechanism. No donor line is translated.
