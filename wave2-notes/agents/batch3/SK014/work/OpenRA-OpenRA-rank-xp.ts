// Licence: GPL-3.0-or-later (donor header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/rank.ts (proposed). Parity row 21 (catalogue fields).

export {};

// Percent modifiers multiply a number in turn; the donor truncates once at the end (Util.ApplyPercentageModifiers).
function applyPct(n: number, pcts: number[]): number {
  let a = n;
  for (const p of pcts) {
    a = a * p / 100;
  }
  return Math.trunc(a);
}

// Rank thresholds: key = percent of own cost. Stored XP is in the same units as a kill award (cost x 100).
interface RankStep {
  requiredXp: number;   // key x own cost
  rank: number;         // rank granted when this step is reached (1-based)
}

interface RankState {
  cost: number;         // own Valued cost
  xp: number;           // stored experience
  level: number;        // steps reached
  steps: RankStep[];
}

// Fix: the donor builds the steps by iterating the dictionary with no sort, so it relies on the
// YAML order. This sketch sorts the keys first.
function buildSteps(keys: number[], cost: number): RankStep[] {
  return [...keys].sort((a, b) => a - b).map((k, i) => ({ requiredXp: k * cost, rank: i + 1 }));
}

// Kill award: victim cost, then the victim's own percent modifiers, then the killer's modifiers
// including the kill-XP scale (10000 percent = x100 in the donor). Returns the amount to hand to the killer.
// Fix: the donor reassigns its own field `exp` here; this sketch uses a local so a second call cannot compound.
function killAward(victimCost: number, victimPcts: number[], killerPcts: number[]): number {
  const exp = applyPct(victimCost, victimPcts);
  return applyPct(exp, [...killerPcts, 10000]);
}

// Grant experience. Clamp to the top threshold, then grant every step reached (several levels can
// come from one award). Returns the ranks granted by this call.
function giveXp(e: RankState, amount: number): number[] {
  if (amount < 0) {
    throw new Error("Revoking experience is not implemented.");
  }
  if (e.steps.length === 0) {
    return [];
  }
  const top = e.steps[e.steps.length - 1].requiredXp;
  e.xp = Math.min(Math.max(e.xp + amount, 0), top);
  const granted: number[] = [];
  while (e.level < e.steps.length && e.xp >= e.steps[e.level].requiredXp) {
    granted.push(e.steps[e.level].rank);
    e.level++;
  }
  return granted;
}

// Rank multipliers are data rows (percent). Index 0 = green, 1 = veteran, 2 = elite.
// Values follow the TS mod's defaults, read from the YAML.
interface RankMods {
  firepowerPct: number;
  damagePct: number;     // applied to damage taken
  speedPct: number;
  reloadPct: number;
}

const RANK_MODS: RankMods[] = [
  { firepowerPct: 100, damagePct: 100, speedPct: 100, reloadPct: 100 },
  { firepowerPct: 110, damagePct: 90, speedPct: 120, reloadPct: 90 },
  { firepowerPct: 130, damagePct: 75, speedPct: 140, reloadPct: 75 },
];

// Warhead damage: raw damage x attacker firepower percents x versus-armour percent (one list, one truncation).
function warheadDamage(raw: number, firepowerPcts: number[], versusPct: number): number {
  return applyPct(raw, [...firepowerPcts, versusPct]);
}

// Victim take: the victim's damage percents apply only to positive damage (donor Health.cs 167),
// then HP is clamped to 0..max.
function victimHp(hp: number, maxHp: number, incoming: number, victimPcts: number[]): number {
  const take = incoming > 0 ? applyPct(incoming, victimPcts) : incoming;
  return Math.min(Math.max(hp - take, 0), maxHp);
}

// Self-heal trait: heal while below the threshold, after the damage cooldown, once per delay.
// The heal is a negative damage in the donor, so it does not reset the cooldown (only positive damage does).
interface HealRule {
  stepHp: number;
  percentStep: number;        // percent of max HP per step
  delayTicks: number;
  startIfBelowPct: number;
  damageCooldownTicks: number;
}

interface HealState {
  hp: number;
  maxHp: number;
  ticks: number;
  cooldown: number;
}

function healTick(s: HealState, r: HealRule): void {
  if (s.hp >= r.startIfBelowPct * s.maxHp / 100) {
    return;
  }
  if (s.cooldown > 0) {
    s.cooldown--;
    return;
  }
  s.ticks--;
  if (s.ticks <= 0) {
    s.ticks = r.delayTicks;
    const heal = r.stepHp + r.percentStep * s.maxHp / 100;
    s.hp = Math.min(s.hp + heal, s.maxHp);
  }
}

function onDamaged(s: HealState, r: HealRule, amount: number): void {
  if (amount > 0) {
    s.cooldown = r.damageCooldownTicks;
  }
}

// Usage check (not a test): a 200-cost unit killed by an equal-cost unit, then the victim's firepower.
const steps = buildSteps([500, 1000], 200);
const rs: RankState = { cost: 200, xp: 0, level: 0, steps };
const award = killAward(200, [], []);
const granted = giveXp(rs, award);
void granted;
const shot = warheadDamage(3600, [RANK_MODS[1].firepowerPct], 75);
void shot;
void victimHp(10000, 10000, shot, [RANK_MODS[2].damagePct]);
const hs: HealState = { hp: 5000, maxHp: 10000, ticks: 0, cooldown: 0 };
healTick(hs, { stepHp: 200, percentStep: 0, delayTicks: 100, startIfBelowPct: 100, damageCooldownTicks: 125 });
onDamaged(hs, { stepHp: 200, percentStep: 0, delayTicks: 100, startIfBelowPct: 100, damageCooldownTicks: 125 }, 1);
