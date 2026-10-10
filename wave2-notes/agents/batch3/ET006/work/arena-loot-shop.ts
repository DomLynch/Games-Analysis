// Licence: MIT (donor, LICENSE.txt). Adapted shape, written from the mechanism as read.
interface Rng { next(exclusiveMax: number): number; } // donor: next(n) returns 0..n-1

interface CityCtx {
  isVillage: boolean;   // the donor halves some gold in villages and doubles it elsewhere
  cityIndex: number;    // index into the per-city palace table (the donor has 3 entries)
}

type Interior = "house" | "palace" | "noble" | "dungeon" | "crypt";

// Gold on a loot container. Mirrors the donor's case order: house, palace, noble, dungeon/crypt.
function lootGold(kind: Interior, city: CityCtx, levelIndex: number, rng: Rng, palaceTable: number[]): number {
  switch (kind) {
    case "house": {
      let g = rng.next(9) + 2;                         // 2..10 when next(9) is 0..8
      g = city.isVillage ? Math.trunc(g / 2) : g * 2;
      return g;
    }
    case "palace":
      return palaceTable[city.cityIndex];              // fixed per city class (data table)
    case "noble": {
      let g = rng.next(9) + 2;
      g = city.isVillage ? Math.trunc(g / 2) : g * 2;
      return g * 10;                                   // nobles carry ten times the house amount
    }
    case "dungeon":
    case "crypt":
      return levelIndex * levelIndex + (rng.next(100) + 1); // grows with the square of the level, plus 1..100
    default:
      return 0;
  }
}

// Each container slot is filled on its own roll: populated when roll (1..100) <= the slot's chance (data table).
function populatedLootSlots(chances: number[], rng: Rng): boolean[] {
  return chances.map((c) => rng.next(100) + 1 <= c);
}

// Shop: buy at the full catalogue price (must be affordable); sell at three quarters, integer division.
function shopBuyPrice(basePrice: number): number {
  return basePrice;
}
function shopSellPrice(basePrice: number): number {
  return Math.trunc((3 * basePrice) / 4);
}
function tryBuy(gold: number, price: number): { ok: boolean; gold: number } {
  return gold >= price ? { ok: true, gold: gold - price } : { ok: false, gold };
}

// Catalogue prices built from two tables: a material multiplier x 50 for armour-class items,
// and base item price + attribute price for attribute enhancements.
function armourClassAccessoryPrice(materialMultiplier: number): number {
  return materialMultiplier * 50;
}
function enhancementAccessoryPrice(baseItemPrice: number, attributePrice: number): number {
  return baseItemPrice + attributePrice;
}

export {};
