# otland-forgottenserver (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/otland-forgottenserver/src/game.cpp | Licence: GPL-2.0 (game.cpp header; LICENSE is GPL v2 text) | C++ | symbol Game::playerRequestTrade / Game::playerSellItem
Symbol check: playerRequestTrade (2634) and playerSellItem (3079) confirmed. The sale price and stock rules are not in C++. They are in the Lua NPC callback that Npc::onPlayerTrade calls (npc.cpp 358 and 1197), so that path is part of the mechanism; the Lua scripts themselves were not read.

## 1. Mechanism
- Two paths, both event-driven from client packets. Nothing runs on a tick.
- Shop sell (playerSellItem, 3079-3110): the client sends a sprite id, a count, an amount and an ignore-equipped flag. The server returns silently, with no cancel message, on any failure: amount 0 or above ITEM_STACK_SIZE (3081, 100 per game.h 63), no player (3086), no open shop owner (3093, the merchant carries an onBuy and an onSell callback id, 3090-3092) or an unknown item (3098). It converts fluid counts for splash and fluid containers (3103-3104). Then it calls Npc::onPlayerTrade (npc.cpp 358-365) with the sell callback id and ignoreEquipped; inBackpacks keeps its default false. If the NPC has a script handler, NpcEventsHandler::onPlayerTrade (1197-1224) returns at once for callback -1, else calls the Lua function with (player, itemId, count, amount, ignore, inBackpacks). The Lua script (not read) decides the price and changes inventory; the server then resends the sale list (364) whether or not a handler ran.
- Player-to-player trade request (playerRequestTrade, 2634-2753), checks in order: partner exists and is not self (2643); partner within 2 tiles on the same floor (2648, isInRange 2,2,0); line of throw (2653); the item thing exists (2658); sprite id matches, pickupable and no unique id (2665-2666); house invite if ONLY_INVITED_CAN_MOVE_HOUSE_ITEMS (2671-2680); same floor as the item (2684-2688); if the item is more than 1 tile away, autowalk there and re-issue the request after RANGE_REQUEST_TRADE_INTERVAL = 400 (game.h 59), or refuse if no path (2690-2704); the item, or a container holding it or held by it, is not already in tradeItems (2706-2740); a container holds at most ITEM_STACK_SIZE items (2742-2746). Then the onTradeRequest event (2748, script not read) and internalStartTrade.
- internalStartTrade (2755-2785): refuses if either side is already in another trade; sets TRADE_INITIATED, records the item in tradeItems, sends the offer; the partner moves to TRADE_ACKNOWLEDGE with a "wants to trade with you" message, or, if the partner already has an item out, both see the counter-offer.
- Confirmation (playerAcceptTrade, 2787-2879 read): each side sets TRADE_ACCEPT; when both have, it rechecks line of throw (cancels the trade if lost), fires onTradeAccept, then dry-runs adding each item to the other player (flag true, 2861-2862), dry-runs removing, and only then moves both items (2867-2872), marking success. A trade of two equipped backpacks is refused (2855-2858). So the trade has a confirmation step and an all-or-nothing swap; there is no gold leg.
- Inputs: client packets with ids and counts. Outputs: inventory changes made by the Lua script, cancel messages, and the sale list.
- Order for a sale: packet handler, validation, script callback, list refresh. No tick. Callers of both handlers (the packet layer) were not read.

## 2. Key functions
- Game::playerSellItem (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/game.cpp | 3079-3110 | validates amount and shop, resolves the item, forwards to the merchant's sell callback.
- Npc::onPlayerTrade (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/npc.cpp | 358-365 | calls the script handler, then refreshes the sale list.
- NpcEventsHandler::onPlayerTrade (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/npc.cpp | 1197-1224 | pushes (player, itemId, count, amount, ignore, inBackpacks) into the Lua callback.
- Game::playerRequestTrade (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/game.cpp | 2634-2753 | player-to-player trade request validation chain, walk-to retry, then internalStartTrade.
- Game::internalStartTrade (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/game.cpp | 2755-2785 | trade state machine entry: initiated and acknowledge states, item bookkeeping.
- Game::playerAcceptTrade (forgottenserver) | /mnt/frankendom-donors/otland-forgottenserver/src/game.cpp | 2787-2879 (read; function continues) | two-sided accept, dry-run swap, then move.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Validate a sell request (amount in range, shop open, item exists) before any price logic | ITEM_STACK_SIZE cap 100 (theirs, game.h 63) |
| Forward price decisions to a script callback so content owns the rule | Lua callback ids stored per shop (theirs) |
| Two-tile range and line-of-throw gate for trade | RANGE 2 tiles (2648), line of throw (theirs) |
| Walk-to-target then retry on a timer | RANGE_REQUEST_TRADE_INTERVAL = 400 (theirs, game.h 59) |
| Two-sided accept, dry-run both sides, then swap | TRADE_* state names, ITEM_STACK_SIZE = 100 container cap (theirs, game.h 63) |

## 4. TypeScript sketch
simplified: the sale path is the validate-then-forward shape only (the donor returns silently on failure; the sketch returns a reason). The trade path models the checks in the donor's order up to the throw/pickup/unique/already-trading gates but omits the house-invite, floor, walk-to-retry, container-size and script-event steps. The sale sketch also drops the player lookup and the fluid sub-type conversion. The accept swap is added as swapTrade: it checks only that each side has room (the donor also refuses two equipped backpacks, runs separate add and remove dry runs, releases the tradeItems entries first, fires onTradeAccept, and rechecks line of throw), then moves both.
```ts
// Licence: GPL-2 (otland-forgottenserver). CLEAN-ROOM: written from the mechanism, no donor lines.
interface ShopOwner { onSell(player: string, itemId: number, count: number, amount: number): boolean; }
interface Request { playerId: string; spriteId: number; count: number; amount: number; }

const STACK_CAP = 100; // theirs

function handleSellRequest(req: Request, shopOwner: ShopOwner | undefined, resolve: (sprite: number) => number): { ok: boolean; reason?: string } {
  if (req.amount === 0 || req.amount > STACK_CAP) return { ok: false, reason: 'bad amount' };
  if (!shopOwner) return { ok: false, reason: 'no shop open' };
  const itemId = resolve(req.spriteId);
  if (itemId === 0) return { ok: false, reason: 'unknown item' };
  const accepted = shopOwner.onSell(req.playerId, itemId, req.count, req.amount);
  return accepted ? { ok: true } : { ok: false, reason: 'script refused' };
}

interface TradeCheck { dist: number; lineOfThrow: boolean; pickupable: boolean; uniqueId: boolean; alreadyInTrade: boolean; }

function canStartTrade(t: TradeCheck, range = 2): string | null {
  if (t.dist > range) return 'out of reach';
  if (!t.lineOfThrow) return 'cannot throw';
  if (!t.pickupable || t.uniqueId) return 'not possible';
  if (t.alreadyInTrade) return 'already trading';
  return null;
}

// Both sides accepted: check that each side can take the other's item first, then move both, or move nothing.
interface Side { items: string[]; room: number; }
function swapTrade(a: Side, aItem: string, b: Side, bItem: string): boolean {
  if (a.room < 1 || b.room < 1) return false;   // dry run of the adds
  a.items = a.items.filter((i) => i !== aItem).concat(bItem);
  b.items = b.items.filter((i) => i !== bItem).concat(aItem);
  return true;
}
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (changeOffer, acceptTrade and settleTrade at 169-275 already model the two-sided accept and all-or-nothing swap, with escrow and no spill) and origins/server/shop-buy.ts (the shop write path). Named from reading both in the world worktree.
- Parity-checklist row: row 18 (server-verified writes behind the post-K item 3 server tick; the one ledger) and row 21 (item fields for pickup/unique-style flags).
- Reuse tag: rewrite-from-idea (GPL-2; the mechanism is the validate-then-forward pattern only)
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- Prices and stock are in Lua scripts, not in a typed server data model. Frankendom has zones as data and needs its own price table.
- The sell callback is trusted to change inventory. Frankendom must check that the server, not a script, moves items and gold.
- Trade is item-for-item with no gold leg; it does have a two-sided accept and a dry-run swap (2787-2879). Frankendom's settleTrade already has the equivalent plus escrow and a cooldown; the donor adds nothing it lacks except the line-of-throw recheck at accept, which has no Frankendom meaning (trades settle at the Concord Exchange).
- The swap runs in one thread of the game loop on live objects; Frankendom's one ledger needs it as one origins_apply batch.
- Hard limits (2 tiles, stack cap 100) are theirs, not Frankendom values.
- Donor is GPL-2, so only the mechanism is described here.
