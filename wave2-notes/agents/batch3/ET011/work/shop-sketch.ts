// Licence: BSD-3-Clause (donor, Evennia). Adaptable; this sketch is written from the described mechanism and is not a line-by-line translation.
// clean-room
export interface ShopRates { upsell: number; miser: number }   // donor defaults: 1.0 and 0.5
export const DEFAULT_RATES: ShopRates = { upsell: 1.0, miser: 0.5 };

export interface Ware { value: number; size: number; quest: boolean }
export interface Player { coins: number; freeSlots: number }

// Price the shop asks for an item (the donor keeps a float for object wares and truncates prototype wares; here one integer rule).
export function buyPrice(baseValue: number, rates: ShopRates): number {
  return Math.floor(baseValue * rates.upsell);
}

// Price the shop pays. Zero means the shop will not take the item (quest items, or nothing after truncation).
export function sellPrice(baseValue: number, rates: ShopRates, quest: boolean): number {
  if (quest) return 0;
  const v = Math.floor(baseValue * rates.miser);
  return v > 0 ? v : 0;
}

// Server-side purchase: the coin and slot checks run here, not only on the confirm screen.
export function buy(p: Player, ware: Ware, rates: ShopRates): { ok: boolean; price: number; reason?: string } {
  const price = buyPrice(ware.value, rates);
  if (p.coins < price) return { ok: false, price, reason: "coins" };
  if (ware.size > p.freeSlots) return { ok: false, price, reason: "slots" };
  p.coins -= price;
  p.freeSlots -= ware.size;
  return { ok: true, price };
}

// Server-side sale: the item leaves the player and is destroyed (the donor's docstring says so; its code moves the item to the shop).
export function sell(p: Player, ware: Ware, rates: ShopRates): { ok: boolean; price: number } {
  const price = sellPrice(ware.value, rates, ware.quest);
  if (price === 0) return { ok: false, price };
  p.coins += price;
  p.freeSlots += ware.size;
  return { ok: true, price };
}
