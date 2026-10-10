// Licence: Sustainable Use License 1.0 (donor, alexbatalov-fallout2-ce). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// 0 bad, 1 neutral, 2 good. The mood nudge is added to the script barter modifier; BAD raises the price.
type Mood = 0 | 1 | 2;
const MOOD_MOD: Record<Mood, number> = { 0: 25, 1: 0, 2: -15 };

interface PriceInput {
  goodsCost: number;      // total cost of the NPC-side table, currency included
  goodsCaps: number;      // currency in that table; billed at face value
  npcBarter: number;      // NPC barter skill
  partyBestBarter: number; // best barter skill among the active party (the player's side)
  scriptMod: number;      // base modifier set by the dialogue script
  masterTrader: boolean;  // perk: lowers the multiplier by 25 points
  mood: Mood;
}

// Non-companion price in whole currency units.
function barterPriceF2(p: PriceInput): number {
  const perk = p.masterTrader ? 25 : 0;
  let mult = (p.scriptMod + MOOD_MOD[p.mood] + 100 - perk) * 0.01;
  if (mult < 0) mult = 0.0099999998; // floor only when the multiplier went negative
  const uncapped = p.goodsCost - p.goodsCaps;
  // Skill ratio with a 160 offset, applied to the doubled uncapped cost. The factor 2 is in the donor; no comment says why.
  const balanced = ((160 + p.npcBarter) / (160 + p.partyBestBarter)) * (uncapped * 2.0);
  return Math.trunc(mult * balanced + p.goodsCaps);
}

interface Offer {
  stacks: number;          // item stacks on the player's side
  queued: boolean;         // item is queued for use elsewhere
  releasable: boolean;     // true only when the queued item can be switched off (donor: a Geiger counter, turn-off succeeded)
  cost: number;            // total cost of the player's offer
  weight: number;          // total weight of the player's offer
}

type Result = "ok" | "too-heavy-for-player" | "too-heavy-for-npc" | "bad-offer";

interface TradeInput {
  companion: boolean;      // speaker is a party member: weight swap, no value check (donor branch)
  goodsWeight: number;     // weight of the NPC-side table
  playerCarryLeft: number; // player carry capacity minus current weight
  npcCarryLeft: number;
  price: number;           // barterPriceF2 result for the non-companion case
  offer: Offer;
}

// Donor order: the player's carry check comes first for every trade; then the companion or value branch.
function tryTradeF2(t: TradeInput): Result {
  if (t.goodsWeight > t.playerCarryLeft) return "too-heavy-for-player";
  if (t.companion) {
    return t.offer.weight > t.npcCarryLeft ? "too-heavy-for-npc" : "ok";
  }
  if (t.offer.stacks === 0) return "bad-offer";
  if (t.offer.queued && !t.offer.releasable) return "bad-offer";
  if (t.price > t.offer.cost) return "bad-offer";
  return "ok";
}

const p: PriceInput = { goodsCost: 100, goodsCaps: 0, npcBarter: 60, partyBestBarter: 100, scriptMod: 0, masterTrader: false, mood: 1 };
const price = barterPriceF2(p);
console.log(price, tryTradeF2({ companion: false, goodsWeight: 5, playerCarryLeft: 50, npcCarryLeft: 50, price, offer: { stacks: 1, queued: false, releasable: false, cost: 168, weight: 2 } }));
