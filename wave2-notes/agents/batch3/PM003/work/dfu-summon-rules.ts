// Licence: MIT (donor). Sketch written from the described mechanism, not copied from the donor lines.
// clean-room
export {};

type BonusCond = "none" | "rain" | "thunder";

interface Weather {
  raining: boolean;
  storming: boolean;
}

interface Target {
  id: string;
  repWithPlayer: number;   // the player's reputation with this summoned entity's faction
  bonusCond: BonusCond;
}

interface Player {
  gold: number;
  summonedIds: Set<string>;
}

type SummonResult = "not-enough-gold" | "failed" | "already-summoned" | "summoned";

// Cost depends on the summoner's reputation, not the player's.
function summonCost(summonerRep: number): number {
  return 200000 - summonerRep * 1000;
}

// Chance in percent, no clamp in the donor formula.
function summonChance(targetRep: number, bonus: number): number {
  return 30 + targetRep + bonus;
}

// 30 applies when the condition is none, or when rain or thunder matches the weather.
function bonusFor(cond: BonusCond, w: Weather): number {
  const applies = cond === "none" || (cond === "rain" && w.raining) || (cond === "thunder" && w.storming);
  return applies ? 30 : 0;
}

// roll100() returns an integer 1..100. Order follows the donor: gold check, payment, replacement roll, chance roll, once-only flag.
function attemptSummon(
  target: Target,
  replacement: Target,
  summonerRep: number,
  player: Player,
  w: Weather,
  roll100: () => number,
): SummonResult {
  const cost = summonCost(summonerRep);
  if (player.gold < cost) return "not-enough-gold";
  player.gold -= cost;                          // paid before the roll: a failed summon keeps the gold

  const replaceChance = w.storming ? 15 : 5;
  const chosen = roll100() <= replaceChance ? replacement : target;

  const chance = summonChance(chosen.repWithPlayer, bonusFor(chosen.bonusCond, w));
  if (roll100() > chance) return "failed";

  if (player.summonedIds.has(chosen.id)) return "already-summoned";
  player.summonedIds.add(chosen.id);
  return "summoned";
}
