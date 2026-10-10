// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = { id: string; baseValue: number };

interface Shop {
  stock: Map<string, Item>;   // items for sale, keyed by id
  buyback: Item[];            // newest last; capped at BUYBACK_HISTORY
}

interface Wallet {
  gold: number;               // the one spendable balance
  earned: number;             // lifetime gold earned, used for score; moves with sales and buybacks
}

const BUYBACK_HISTORY = 3;
const BAND_DEPTHS = 5;        // price multiplier steps every 5 depths
const BAND_MULTIPLIER = 5;

// What the shop asks: base value times 5, times one more for each full 5-depth band.
export function buyPrice(item: Item, depth: number): number {
  return item.baseValue * BAND_MULTIPLIER * (Math.floor(depth / BAND_DEPTHS) + 1);
}

// Buying is checked and spent in one step. The refusal is decided here, not by the client.
export function buy(w: Wallet, shop: Shop, itemId: string, depth: number): Item | "refused" {
  const item = shop.stock.get(itemId);
  if (!item) return "refused";
  const price = buyPrice(item, depth);
  if (w.gold < price) return "refused";
  w.gold -= price;
  shop.stock.delete(itemId);
  return item;
}

// Selling pays the base value, with no depth band. The item joins the buyback list.
export function sell(w: Wallet, shop: Shop, item: Item): void {
  w.gold += item.baseValue;
  w.earned += item.baseValue;
  shop.buyback.push(item);
  while (shop.buyback.length > BUYBACK_HISTORY) shop.buyback.shift();
}

// Buying back costs the same base value the seller received, so a sell and buy-back round trip nets zero.
export function buyBack(w: Wallet, shop: Shop, index: number): Item | "refused" {
  const item = shop.buyback[index];
  if (!item) return "refused";
  if (w.gold < item.baseValue) return "refused";
  w.gold -= item.baseValue;
  w.earned -= item.baseValue;
  shop.buyback.splice(index, 1);
  return item;
}

export {};
