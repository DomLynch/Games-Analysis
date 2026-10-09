# pmbstyle-L2Solo (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | Licence: Apache-2.0 | JavaScript | symbol priceAt / npcPrice / listingFloor
Symbol check: priceAt (48), npcPrice (28) and listingFloor (52) confirmed. The file is 56 lines and is read whole. npcPrice is the core, and it reads from the offer snapshot when running in a worker.

## 1. Mechanism
- A pricing reference for autonomous market bots. Given one item, it returns an integer price that a bot will use as its list anchor. It does not run on a tick; each call is on demand.
- Reference price: the lower of (a) the item's scaled base price (BotEconomyPricing.scalePrice, in another file, not read) and (b) the lowest NPC shop offer for that item id. An enchanted item or one flagged not NPC-comparable has no NPC price (Infinity), so the base price alone is used.
- NPC price: the minimum positive offer price across every town NPC seller's buy list, keyed by item self id. Built once and cached, invalidated when the spawn table or the progression rate changes.
- Worker mode: when an offer snapshot is supplied, the module reads only the snapshot and never loads town or world services. The main process owns the data and the worker prices from an immutable copy.
- priceAt(item, ratio) = max(1, floor(reference x ratio)). listingFloor is priceAt at ratio 0.60.
- Inputs: item record (selfId, basePrice, enchant, npcComparable) and the NPC offer list. Output: integer price.

## 2. Key functions
- indexOffers (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 9-18 | minimum positive price per item id across offers.
- useNpcOfferSnapshot (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 20-24 | switches the module to snapshot mode for workers.
- npcPrice (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 28-42 | NPC minimum for an item; rebuilds cache when spawns or rate change.
- referencePrice (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 44-46 | min of scaled base and NPC price.
- priceAt (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 48-50 | ratio-based price with a floor of 1.
- listingFloor (L2Solo) | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/BotMarketPricing.js | 52-54 | priceAt at ratio 0.60.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Anchor a price to the lowest reference (min of base and an observed market price) | Reference is the lowest NPC offer (theirs, a design choice) |
| Ratio-based floor with a minimum of 1 | Listing floor ratio 0.60 (theirs) |
| Exclude enchanted or non-comparable items from the market reference | enchant > 0 and npcComparable flag (theirs) |
| Cache keyed on the data source and the rate, invalidated on change | Progression multiplier and spawn table as the keys (theirs) |
| Worker reads an immutable snapshot, never the live services | Snapshot passed by the main process (theirs) |

## 4. TypeScript sketch
simplified: the live branch (rate-keyed rebuild of the NPC price cache from town sellers' buy lists, donor L32-40) is replaced by a caller-supplied `live` map; base price scaling is passed in as `scaledBase`; ids are not coerced with Number().
```ts
// Licence: Apache-2.0 (pmbstyle-L2Solo). Logic lifted from
// src/GameServer/Bot/Economy/BotMarketPricing.js and rewritten in TS with local types.
interface Offer { selfId: number; price: number; }
interface Item { selfId: number; basePrice: number; enchant?: number; npcComparable?: boolean; }

let snapshotPrices: Map<number, number> | null = null;

export function indexOffers(offers: Offer[]): Map<number, number> {
  const prices = new Map<number, number>();
  for (const o of offers) {
    const price = Number(o.price || 0);
    if (price > 0) prices.set(o.selfId, Math.min(price, prices.get(o.selfId) ?? Infinity));
  }
  return prices;
}

export function useOfferSnapshot(offers: Offer[]): void {
  snapshotPrices = indexOffers(offers ?? []);
}

export function npcPrice(item: Item, live: Map<number, number>): number {
  if (item.npcComparable === false || (item.enchant ?? 0) > 0) return Infinity;
  const table = snapshotPrices ?? live;
  return table.get(item.selfId) ?? Infinity;
}

export function referencePrice(item: Item, scaledBase: number, live: Map<number, number>): number {
  return Math.min(scaledBase, npcPrice(item, live));
}

export function priceAt(item: Item, scaledBase: number, live: Map<number, number>, ratio: number): number {
  return Math.max(1, Math.floor(referencePrice(item, scaledBase, live) * ratio));
}

export const listingFloor = (item: Item, scaledBase: number, live: Map<number, number>) =>
  priceAt(item, scaledBase, live, 0.6);
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (price anchor as data next to the ledger); any listing price would be checked server-side in origins/server/shop-buy.ts (both named from sibling notes, not read here). Frankendom has no autonomous bots, so no consumer exists yet.
- Parity-checklist row: row 21 (catalogue price fields as runtime data) and row 18 (server-verified rewards share the one ledger); feature-map section: economy.
- Reuse tag: adapt (Apache-2.0, logic can be lifted; the anchor rule is a design choice to decide)
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- It is for bots. Frankendom's brief has no bot economy, so the price anchor has no consumer yet.
- Depends on NPC shop buy lists and a progression multiplier that Frankendom does not have.
- Min-of-NPC is a donor choice. Using it as a Frankendom price would fix the economy to NPC prices (a ruling for Lead).
- Snapshot is copied from main to worker, so a stale snapshot is possible. No freshness check is in this file.
