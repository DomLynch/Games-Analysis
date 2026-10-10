// Licence: MIT (donor, Daggerfall Workshop). Clean-room sketch of the mechanism, re-expressed for Frankendom; not a line-by-line translation.
// clean-room

// C# integer division truncates toward zero; Math.trunc matches it.
const idiv = (a: number, b: number): number => Math.trunc(a / b);

// Shop list price (CalculateCost shape). regionIndex: 1000 = 1.0x, clamped by the daily walk to 250..4000.
function listCost(baseValue: number, quality: number, regionIndex: number): number {
  let cost = Math.max(baseValue, 1);
  cost = Math.max(1, idiv(cost * regionIndex, 1000));
  return 2 * (idiv(cost * (quality - 10), 100) + cost);
}

// Trade price (CalculateTradePrice shape). Fixed point: each product is shifted back by 8 bits.
// skill = player Mercantile (0-100), personality = player Personality (0-100).
function tradePrice(cost: number, quality: number, selling: boolean, skill: number, personality: number): number {
  const level = 5 * (quality - 10) + 50;
  if (selling) {
    const dm = (((idiv((100 - level) << 8, 200) + 128) * (idiv(skill << 8, 200) + 128)) >> 8);
    const dp = (((idiv((100 - level) << 8, 200) + 128) * (idiv(personality << 8, 200) + 128)) >> 8);
    return (((((179 * dm) >> 8) + ((51 * dp) >> 8)) * cost) >> 8);
  }
  const dm = (((idiv(level << 8, 200) + 128) * (idiv((100 - skill) << 8, 200) + 128)) >> 8);
  const dp = ((((idiv(level << 8, 200) + 128) * (idiv((100 - personality) << 8, 200) + 128)) >> 8) << 6);
  return (((((192 * dm) >> 8) + (dp >> 8)) * cost) >> 8);
}

// One daily step of a region's index. powerDiff = merchants faction power minus region faction power.
// rnd() returns an integer 0..99; the index rises when the roll is below the chance (Dice100 shape).
function dailyIndexStep(index: number, powerDiff: number, rnd: () => number): number {
  const chanceRise = idiv(powerDiff, 5) + 50 - idiv(index - 1000, 25);
  const rise = rnd() < chanceRise;
  const next = rise ? idiv(51 * index, 50) : idiv(49 * index, 50);
  return Math.min(4000, Math.max(250, next));
}

// Flags the player sees: above 2000 is "high", below 500 is "low", 500 to 2000 is neither.
function priceFlag(index: number): "high" | "low" | "none" {
  if (index > 2000) return "high";
  if (index < 500) return "low";
  return "none";
}

export { listCost, tradePrice, dailyIndexStep, priceFlag };
export {}
