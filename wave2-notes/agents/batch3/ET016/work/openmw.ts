// Licence: GPL-3.0 (donor; repo LICENSE is GNU GPL Version 3, 29 June 2007). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Trader {
  skill: number;        // trade skill; the formula caps it at 100
  luck: number;         // attribute value
  personality: number;  // attribute value
  fatigueTerm: number;  // multiplier from current fatigue (game settings give its shape)
}

// Buy or sell offer for one item. `standing` is the seller's view of the buyer, 0..100 (clamped here).
// One formula serves buying and selling: the two terms are built from the same difference.
function barterOffer(basePrice: number, buying: boolean, standing: number,
                     player: Trader, seller: Trader): number {
  if (basePrice === 0) return basePrice;
  const s = Math.min(100, Math.max(0, standing));
  const a = Math.min(player.skill, 100);
  const b = Math.min(0.1 * player.luck, 10);
  const c = Math.min(0.2 * player.personality, 10);
  const d = Math.min(seller.skill, 100);
  const e = Math.min(0.1 * seller.luck, 10);
  const f = Math.min(0.2 * seller.personality, 10);
  const pcTerm = (s - 50 + a + b + c) * player.fatigueTerm;
  const npcTerm = (d + e + f) * seller.fatigueTerm;
  const buyTerm = 0.01 * (100 - 0.5 * (pcTerm - npcTerm));   // 1.0 when the two sides match
  const sellTerm = 0.01 * (50 - 0.5 * (npcTerm - pcTerm));   // 0.5 when the two sides match
  const offer = Math.trunc(basePrice * (buying ? buyTerm : sellTerm));
  return Math.max(1, offer);
}

// The trade window's own cap: the player never buys below 75% of base, and an NPC never pays above 75% of base.
function windowPrice(basePrice: number, buying: boolean, offer: number): number {
  const cap = Math.max(1, Math.trunc(0.75 * basePrice));
  return buying ? Math.max(cap, offer) : Math.min(cap, offer);
}

export {};
