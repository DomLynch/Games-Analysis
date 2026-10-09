# OpenDAoC-OpenDAoC-Core (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs | Licence: GPL-3 | C# | symbol GameMerchant.OnPlayerBuy/OnPlayerSell/OnPlayerAppraise
Symbol check: OnPlayerBuy (87-140), OnPlayerSell (262-295) and OnPlayerAppraise (304-336) opened and confirmed. The base OnPlayerBuy is at 87; the overload at 142 (adds a page number) was not read.

## 1. Mechanism
- Server-side and request-driven. Nothing runs on a tick. Each call is one player action.
- OnPlayerBuy(player, item_slot, number) (87-140): decodes the slot into page and slot, looks up the template, sets amount = number times pack size (refused if zero or less), and total = number times price. Under the player's inventory lock: refuses if money is short, refuses if out of pickup range, refuses if the backpack has no room, logs, builds the message, then removes the money. A failed money removal throws, after the item has already been granted.
- OnPlayerSell(player, item) (262-295): refuses non-droppable items and out-of-range players, asks OnPlayerAppraise (silent) for the value, refuses a zero value, removes the item from the inventory (a failed removal sends a cannot-be-sold message and pays nothing), then adds the money and logs both sides. Order of the early checks: droppable first, then range.
- OnPlayerAppraise(player, item, silent) (304-336): value = price * count / pack size * ITEM_SELL_RATIO / 100, all integer maths evaluated left to right (line 312), with count and pack size each floored at 1. A price of 1 whose value comes out zero falls back to price * count / pack size without the ratio (lines 314-315). Non-droppable items are zeroed (line 317). When not silent it also sends an offer or not-interested message.
- Inputs: player, slot or item, count. Outputs: items and money moved, log entries.

## 2. Key functions
- GameMerchant.OnPlayerBuy (base) | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs | 87-140 | the buy transaction: money, range, room, grant, then take money.
- GameMerchant.OnPlayerSell | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs | 262-295 | sell: droppable, range, appraise, remove item, pay.
- GameMerchant.OnPlayerAppraise | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameMerchant.cs | 304-336 | sell price formula with the sell ratio and the price-1 rule.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Price times count, pack-size normalised (GameMerchant.cs:98, 104) | Pack size per template (theirs, data) |
| Sell value as a percent of buy price (312) | ITEM_SELL_RATIO = 50 (theirs; default at serverproperty/ServerProperties.cs:876) |
| Range gate on both buy and sell (114, 271) | WORLD_PICKUP_DISTANCE = 256 (theirs; default at serverproperty/ServerProperties.cs:631) |
| Price-1 rounding rule (314) | The rule itself is theirs |

## 4. TypeScript sketch
Licence: GPL-3 (OpenDAoC-OpenDAoC-Core). Clean-room: written from the mechanism, no donor lines.
simplified: the template is passed in directly (no page/slot decode); inventory space is a free-slot count, not a stack-merging AddTemplate; the sell-side range check is shown but messages, logging, the player lock and the second overload are omitted. The appraise integer steps follow the donor order.
```ts
interface Template { price: number; packSize: number; }
interface Player { money: number; inRange: boolean; freeSlots: number; }
const SELL_RATIO_PCT = 50; // theirs: server property default

// Buy: count and money first, then range, then room; the donor grants the item before taking money.
function buy(p: Player, t: Template, number: number): { ok: boolean; reason?: string } {
  const amount = t.packSize > 0 ? number * t.packSize : number;
  if (amount <= 0) return { ok: false, reason: 'bad count' };
  const total = number * t.price;
  if (p.money < total) return { ok: false, reason: 'need money' };
  if (!p.inRange) return { ok: false, reason: 'too far' };
  if (p.freeSlots <= 0) return { ok: false, reason: 'no space' };
  p.freeSlots -= 1; // grant
  p.money -= total; // donor throws here if this fails after the grant
  return { ok: true };
}

interface Item { price: number; count: number; packSize: number; droppable: boolean; }

// Appraisal: integer steps left to right; price-1 fallback; non-droppable is zero.
function appraise(it: Item): number {
  const count = Math.max(1, it.count);
  const pack = Math.max(1, it.packSize);
  const unscaled = Math.trunc((it.price * count) / pack);
  let v = Math.trunc((unscaled * SELL_RATIO_PCT) / 100);
  if (it.price === 1 && v === 0) v = unscaled;
  if (!it.droppable) v = 0;
  return v;
}

// Sell: droppable first, then range, then appraise; zero value refuses; item removed, then money paid.
function sell(p: Player, it: Item, remove: (i: Item) => boolean): boolean {
  if (!it.droppable) return false;
  if (!p.inRange) return false;
  const v = appraise(it);
  if (v === 0) return false;
  if (!remove(it)) return false;
  p.money += v;
  return true;
}
```

## 5. Lands in
- Frankendom file(s): origins/shops/shop.ts (price and sell ratio), origins/server/shop-buy.ts (server-side buy transaction), origins/contracts/economy.ts (shared money and price types).
- Parity-checklist row: row 18 (loot roll and XP / career award; the one server ledger that vendor money must also go through) and row 21 (price, pack size and sell ratio are catalogue fields).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- Order of operations: the donor grants the item before taking money, and a failed charge afterwards throws with the item already granted (lines 134-137). Frankendom's one ledger (origins/server/shop-buy.ts) must do money and item in one server transaction, money checked first, no partial state.
- Appraise uses integer division at each step in the donor (line 312); the port must truncate at the same points or prices drift by a coin.
- Server-verified kills and economy: the range and money checks are server-side in the donor. Frankendom must keep them on the server and never trust a client price or count.
- Stack stock and restock for merchant items: not read; the base buy path never decrements a stock count.
- Sell removes the item before paying; if removal fails nothing is paid (no rollback needed). The item-then-money order means a crash between the two loses the item: use one transaction.
