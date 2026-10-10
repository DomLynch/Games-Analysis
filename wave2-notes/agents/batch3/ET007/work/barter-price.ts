// Licence: Sustainable Use License 1.0 (donor, alexbatalov-fallout1-ce). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// 0 bad, 1 neutral, 2 good (donor enum NPC_REACTION_BAD / NEUTRAL / GOOD).
type ReactionLevel = 0 | 1 | 2;

// Added to the price modifier by the NPC's mood (donor values -25 / 0 / +50).
const REACTION_MOD: Record<ReactionLevel, number> = { 0: -25, 1: 0, 2: 50 };

interface Trader {
  barterSkill: number;   // skill points, added or subtracted in the modifier
  masterTrader: boolean; // perk: +25 to the modifier, applied only when the player is the buyer
}

interface Goods {
  totalCost: number;     // cost of every item in the table, currency included
  currencyValue: number; // the part of totalCost that is currency; never discounted
}

// Price the buyer pays for `goods`. 100 is face value; above 100 means the seller asks more.
function barterPrice(
  buyer: Trader,
  buyerIsPlayer: boolean,
  seller: Trader,
  goods: Goods,
  scriptMod: number,
  reaction: ReactionLevel,
): number {
  let mod = 100;
  if (buyerIsPlayer && buyer.masterTrader) mod += 25;
  mod += buyer.barterSkill - seller.barterSkill + scriptMod + REACTION_MOD[reaction];
  mod = Math.min(300, Math.max(10, mod));
  // Operands are non-negative here, so Math.trunc matches C integer division.
  const items = goods.totalCost - goods.currencyValue;
  return Math.trunc((100 * items) / mod) + goods.currencyValue;
}

interface Offer {
  totalCost: number;
  stacks: number;        // number of item stacks on the offering side
  locked: boolean;       // item queued for use elsewhere
}

// All-or-nothing accept: the offer must be non-empty, unlocked, and cover the price.
function tryBarter(offer: Offer, price: number): "ok" | "refused" {
  if (offer.stacks === 0) return "refused";
  if (offer.locked) return "refused";
  if (price > offer.totalCost) return "refused";
  return "ok";
}

// Example: a neutral NPC (0), equal barter skill 50 on both sides, script mod 0, goods 120 with 20 currency.
const example = barterPrice({ barterSkill: 50, masterTrader: false }, true, { barterSkill: 50, masterTrader: false }, { totalCost: 120, currencyValue: 20 }, 0, 1);
console.log(example, tryBarter({ totalCost: 90, stacks: 1, locked: false }, example));
