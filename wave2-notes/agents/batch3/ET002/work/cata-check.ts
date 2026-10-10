// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Party {
  int: number;      // intelligence stat
  speech: number;   // social skill level
  isNpc: boolean;
}

// Skill gap -> multiplier. The gap is capped at 5 levels, so the factor tops out at 2.0.
function skillFactor(gap: number): number {
  const s = Math.min(5, Math.abs(gap));
  const val = 0.045 * s * s - 0.025 * s + 1;
  return gap >= 0 ? val : 1 / val;
}

// Seller-side adjustment. An NPC seller gets the value; a player seller gets its negative reciprocal.
function netAdjust(buyer: Party, seller: Party): number {
  const intDiff = seller.int - buyer.int;
  const intAdj = 1 + 0.05 * Math.min(19, Math.abs(intDiff));
  const socAdj = skillFactor(Math.round(seller.speech - buyer.speech));
  const adjust = intDiff >= 0 ? intAdj * socAdj : socAdj / intAdj;
  return seller.isNpc ? adjust : -1 / adjust;
}

// One item's price. base = market price (already multiplied by any NPC value factor by the caller).
function tradePrice(base: number, buyer: Party, seller: Party, amount: number, charges: number): number {
  let price = base;
  if (amount >= 0) price *= amount / charges; // charge-based stacks
  price *= 1 + 0.25 * netAdjust(buyer, seller);
  return Math.ceil(price);
}

// Signed balance for the whole offer. Positive means the trader owes the player (credit).
// owed = trader's remembered debt; valueYou = what the trader would pay for the player's offer;
// valueTrader = what the player would pay for the trader's offer; bankDelta = bank movement.
function tradeBalance(owed: number, cost: number, valueYou: number, valueTrader: number, bankDelta: number): number {
  return owed - cost + valueYou - valueTrader + bankDelta;
}

// The trader accepts while the balance stays within its credit limit.
function traderAccepts(balance: number, maxCredit: number): boolean {
  return balance + maxCredit >= 0;
}

console.log("skillFactor(2)", skillFactor(2), "skillFactor(-2)", skillFactor(-2));
console.log("NPC 2 speech above player, NPC sells:", tradePrice(100, { int: 10, speech: 1, isNpc: false }, { int: 10, speech: 3, isNpc: true }, -1, 1));
console.log("NPC 2 speech below player, NPC sells:", tradePrice(100, { int: 10, speech: 3, isNpc: false }, { int: 10, speech: 1, isNpc: true }, -1, 1));
console.log("NPC int 19 above player, equal speech:", tradePrice(100, { int: 10, speech: 0, isNpc: false }, { int: 29, speech: 0, isNpc: true }, -1, 1));
console.log("player sells to NPC, equal stats:", tradePrice(100, { int: 10, speech: 0, isNpc: true }, { int: 10, speech: 0, isNpc: false }, -1, 1));
console.log("speech gap 5 NPC seller:", tradePrice(100, { int: 10, speech: 0, isNpc: false }, { int: 10, speech: 5, isNpc: true }, -1, 1));
console.log("charges 5 of 10 at 100:", tradePrice(100, { int: 10, speech: 0, isNpc: false }, { int: 10, speech: 0, isNpc: true }, 5, 10));
