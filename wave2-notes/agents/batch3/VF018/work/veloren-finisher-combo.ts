// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Consumption = "all" | "half" | "cost";

interface Scaling {
  target: "attack" | "buff";
  kind: "linear" | "sqrt";
  maxFactor: number;
}

interface Finisher {
  minimumCombo: number;
  consumption: Consumption;
  costPerUse: number;        // used only by the "cost" rule
  baseDamage: number;
  damagePerFactor: number;   // added per factor step when the attack is scaled
  scaling?: Scaling;
}

interface Fighter {
  combo: number;
}

interface FinisherResult {
  spent: number;
  factor: number;
  damage: number;
}

// Donor gate (ability.rs 1427): usable only when combo >= minimum.
function canActivate(f: Finisher, a: Fighter): boolean {
  return a.combo >= f.minimumCombo;
}

// Donor: factor = linear value/norm or sqrt(value/norm), capped at max_factor.
// Fix: the donor divides by the minimum, which is 0 for a zero-minimum finisher (0/0 = NaN, which then takes the cap).
function scaleFactor(s: Scaling, comboAtUse: number, minimum: number): number {
  if (minimum <= 0) return 0;
  const ratio = comboAtUse / minimum;
  const raw = s.kind === "linear" ? ratio : Math.sqrt(ratio);
  return Math.min(raw, s.maxFactor);
}

// Donor: "all" spends the whole counter, "half" spends ceil(counter / 2), "cost" spends the minimum.
function spendAmount(rule: Consumption, comboNow: number, cost: number): number {
  if (rule === "all") return comboNow;
  if (rule === "half") return Math.ceil(comboNow / 2);
  return cost;
}

// Fire once at the action tick. Fix: spend and scale both read the same counter value (the donor scales from the
// combo at activation but spends from the counter at the action tick, so they can disagree).
// stunBonus is the donor's AdditionalDamage factor for a stunned target (0 = none).
function fireFinisher(f: Finisher, a: Fighter, targetStunned: boolean, stunBonus: number): FinisherResult | null {
  if (!canActivate(f, a)) return null;
  const comboNow = a.combo;

  let factor = 0;
  let damage = f.baseDamage;
  if (f.scaling) {
    factor = scaleFactor(f.scaling, comboNow, f.minimumCombo);
    if (f.scaling.target === "attack") damage += f.damagePerFactor * factor;
  }
  if (targetStunned && stunBonus > 0) damage += stunBonus * damage; // donor: AdditionalDamage multiplies the hit

  const spent = Math.min(comboNow, spendAmount(f.consumption, comboNow, f.costPerUse));
  a.combo = comboNow - spent;
  return { spent, factor, damage };
}
