// Licence: BSD-2-Clause (donor, LICENSE.txt). Adapted shape, written from the mechanism as read.
type Status = 0 | 1 | 2 | 3 | 4; // BROKEN, DECREPIT, WORN, SERVICABLE, EXCELLENT (donor enum order)

interface Priced {
  baseGold: number;        // catalogue gold value (tome and jewel overrides already applied)
  glassGold: number;       // catalogue value of the plain glass gem, used for unidentified gems on sale
  identified: boolean;
  isGem: boolean;
  isGlassGem: boolean;     // unidentified glass gem buys at a flat price in the donor
  beatitude: number;       // curse/bless scale; the range is not read
  status: Status;
  quiver: boolean;         // stackable ammo: price scales with count
  qty: number;             // stack count (1 for non-quivers)
  shopConsumable: boolean; // shop-stock consumable, buy price has its own multiplier
}

const trunc = (x: number): number => Math.trunc(x); // the donor keeps an int and truncates on every step

// Player buys from a shop. trading = the buyer's trading proficiency (0..100 base, plus equipment bonus).
function buyPrice(it: Priced, trading: number, consumableMultPct = 100): number {
  let v = it.baseGold;
  if (it.identified) v = trunc(v * 0.8);                 // identified: cheaper
  else v = it.isGlassGem ? 1400 : trunc(v * 1.25);       // unidentified: dearer, glass gems flat
  v = it.beatitude > 0
    ? trunc(v * it.beatitude * 3)                         // blessed: steep multiplier
    : trunc(v * (1 + it.beatitude / 2));                  // cursed: linear discount
  v = trunc(v * ((it.status + 5) / 10));                  // worn items cost less
  v = trunc(v / ((50 + trading) / 150));                  // skilled buyers pay less
  v = Math.max(1, v);
  if (it.shopConsumable) v = trunc(Math.max(1, consumableMultPct / 100) * v);
  const unit = Math.max(v, it.baseGold);                  // never below the catalogue price
  return it.quiver ? unit * it.qty : unit;
}

// Player sells to a shop. chr and trading apply to player sales only (the donor passes no player for crafting costs).
function sellPrice(it: Priced, trading: number | null, chr: number): number {
  let v = it.baseGold;
  if (it.identified) v = trunc(v * 1.2);
  else v = it.isGem ? it.glassGold : trunc(v * 0.75);     // unidentified: lower offer
  v = trunc(v * (1 + it.beatitude / 20));
  v = trunc(v * ((it.status + 5) / 10));
  if (trading !== null) {
    v = trunc(v * ((50 + trading) / 150));                // skilled sellers get more
    v = trunc(v * (1 + chr / 20));                        // charisma adds to the offer
  }
  v = Math.max(1, v);
  const unit = Math.min(v, it.baseGold);                  // never above the catalogue price
  return it.quiver ? unit * it.qty : unit;
}

// Trading skill gain on a player buy: certain at 100 gold or more, else rand()%100 <= max(10, price).
function tradeSkillGainChance(price: number): number {
  if (price >= 100) return 1;
  return (Math.max(10, price) + 1) / 100;
}

interface Ledger { playerGold: number; shopGold: number; }

// Server-side buy. Simplified: the donor's server path charges the packet's item fields and floors the
// player's gold at 0 (net.cpp 7979-7982) with no affordability check; this sketch checks first and rejects.
function serverBuy(l: Ledger, stockItem: Priced, trading: number): { ok: true; paid: number } | { ok: false; reason: string } {
  const paid = buyPrice(stockItem, trading);
  if (l.playerGold < paid) return { ok: false, reason: "insufficient gold" };
  l.playerGold -= paid;
  l.shopGold += paid;                                     // the shop pool is credited with the same amount
  return { ok: true, paid };
}

// Server-side sell. Simplified: the donor debits the shop pool with no check (shops.cpp 674); this sketch refuses
// a sale the shop pool cannot pay.
function serverSell(l: Ledger, item: Priced, trading: number, chr: number): { ok: true; paid: number } | { ok: false; reason: string } {
  const paid = sellPrice(item, trading, chr);
  if (l.shopGold < paid) return { ok: false, reason: "shop cannot pay" };
  l.playerGold += paid;
  l.shopGold -= paid;
  return { ok: true, paid };
}

export {};
