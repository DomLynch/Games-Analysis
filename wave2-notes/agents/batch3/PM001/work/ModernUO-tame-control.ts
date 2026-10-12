// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Tame and command checks: a skill window for the tame roll, a loyalty-weighted control chance, loyalty moves and an hourly decay.
const MAX_LOYALTY = 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Skill window: below min fails, at or above max passes, otherwise a linear chance across the window.
function skillWindow(value: number, min: number, max: number, rnd: () => number): boolean {
  if (value < min) return false;
  if (value >= max || min >= max) return true;
  return (value - min) / (max - min) >= rnd();
}

// Final tame roll. The minimum rises by 6 per existing owner; the window is 50 wide and centred on that minimum.
function finalTameRoll(minTameSkill: number, owners: number, taming: number, rnd: () => number): boolean {
  const centre = minTameSkill + owners * 6 + 24.9;
  return skillWindow(taming, centre - 25, centre + 25, rnd);
}

// Per-command control chance (pre-ML branch). Skills are in tenths; minTameSkill is in skill points.
function controlChance(minTameSkill: number, taming10: number, lore10: number, loyalty: number): number {
  if (minTameSkill <= 29.1) return 1.0;
  const difficulty = Math.trunc(minTameSkill * 10);
  const weighted = Math.trunc((taming10 * 4 + lore10) / 5);
  let bonus = weighted - difficulty;
  bonus *= bonus <= 0 ? 14 : 6;
  const chance = clamp(700 + bonus, 220, 990) - (MAX_LOYALTY - loyalty) * 10;
  return chance / 1000;
}

// Loyalty after one command: +1 on success, -3 on failure, kept in 0..100.
function afterCommand(loyalty: number, ok: boolean): number {
  return clamp(loyalty + (ok ? 1 : -3), 0, MAX_LOYALTY);
}

// Hourly pass for a controlled pet off the internal map: -10; at 0 or below it is released and reset to 100.
function hourlyLoyalty(loyalty: number): { loyalty: number; release: boolean } {
  const next = clamp(loyalty - 10, 0, MAX_LOYALTY);
  return next <= 0 ? { loyalty: MAX_LOYALTY, release: true } : { loyalty: next, release: false };
}

// Feeding (pre-SE): heads in `amount` fair coins, capped at `max`; each head is worth 10 loyalty.
function feedGain(amount: number, max: number, rnd: () => number): number {
  let heads = 0;
  for (let i = 0; i < amount; i++) {
    if (rnd() < 0.5) heads++;
    if (heads >= max) return max * 10;
  }
  return heads * 10;
}

// Worked check: minTameSkill 50, taming 60.0, lore 50.0. Expect 0.99 at loyalty 100 and 0.79 at loyalty 80.
console.log(controlChance(50, 600, 500, 100), controlChance(50, 600, 500, 80));
console.log(afterCommand(100, false), hourlyLoyalty(5).release, finalTameRoll(50, 0, 60, () => 0.5));
console.log(feedGain(3, 10, () => 0.2));
export {};
