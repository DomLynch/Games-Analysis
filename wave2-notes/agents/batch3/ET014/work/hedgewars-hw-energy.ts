// Licence: donor repository is GPL-2.0 (COPYING); the script has no header licence. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface EnergyRules {
  initial: number;          // starting energy, capped at max
  perRound: number;         // income at the start of each turn after the first
  max: number;              // cap for energy at all times
  cratesPerRound: number;   // crate placements per turn
  generatorTicks: number;   // generator ticks per one energy point
}

interface ClanEnergy {
  energy: number;
  firstTurn: boolean;       // the first turn of a clan gets no income
  cratesThisTurn: number;
}

function startClan(rules: EnergyRules): ClanEnergy {
  return { energy: Math.min(rules.initial, rules.max), firstTurn: true, cratesThisTurn: 0 };
}

// Start of a turn: income (not on the first turn), clamp to the cap, reset the crate counter.
function beginTurn(c: ClanEnergy, rules: EnergyRules): void {
  if (c.firstTurn) {
    c.firstTurn = false;
  } else {
    c.energy = Math.min(c.energy + rules.perRound, rules.max);
  }
  c.cratesThisTurn = 0;
}

// One generator tick gate. The counter resets even when the cap blocks the energy point.
interface Generator { counts: number; }

function generatorTick(g: Generator, c: ClanEnergy, rules: EnergyRules): void {
  g.counts += 1;
  if (g.counts < rules.generatorTicks) return;
  g.counts = 0;
  if (c.energy + 1 <= rules.max) c.energy += 1;   // at the cap the point is lost
}

// Placement: crate limit and funds are checked first; energy is spent only if the placement succeeded.
function tryPlace(c: ClanEnergy, cost: number, isCrate: boolean, rules: EnergyRules,
                  place: () => boolean): boolean {
  if (isCrate && c.cratesThisTurn >= rules.cratesPerRound) return false;
  if (c.energy < cost) return false;
  if (!place()) return false;
  c.energy -= cost;
  if (isCrate) c.cratesThisTurn += 1;
  return true;
}
