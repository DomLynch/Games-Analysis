// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type AttackType = "physical" | "special" | "true";

interface Defender {
  hp: number;
  def: number;
  speDef: number;
  armorReduced: boolean;  // defence halved (rounded) by a status, as in the donor
  shield: number;
  flinched: boolean;
  protected: boolean;     // protect or skydiving: the hit does nothing
  flatBlock: number;      // summed flat reduction from named defensive effects, 0 if none
  mana: number;
}

const ARMOR_FACTOR = 0.05;

// Attacker side: split one basic attack. The true part takes full crit power and is split off
// before the defender's crit reduction, which only scales the remaining physical part.
function splitAttack(
  atk: number,
  trueFrac: number,
  crit: boolean,
  critPower: number,
  critFactor: number // 1 = no reduction, 0 = crit extra negated, floored at 0 by the caller
): { phys: number; trueDmg: number } {
  const trueDmg = atk * trueFrac * (crit ? critPower : 1);
  let phys = Math.max(0, atk * (1 - trueFrac));
  if (crit) phys *= 1 + (critPower - 1) * critFactor;
  return { phys: Math.round(phys), trueDmg: Math.round(trueDmg) };
}

// Defender side: one hit. Order: alive gate, protect gate, armour divisor, flat block,
// floor of 1, shield layer, overflow into HP, mana from HP damage only.
function applyHit(
  d: Defender,
  incoming: number,
  type: AttackType
): { taken: number; dead: boolean } {
  if (d.hp <= 0) return { taken: 0, dead: false };
  if (d.protected) return { taken: 0, dead: false };

  const def = d.armorReduced ? Math.round(d.def / 2) : d.def;
  const speDef = d.armorReduced ? Math.round(d.speDef / 2) : d.speDef;

  let reduced = incoming;
  if (type === "physical") reduced = incoming / (1 + ARMOR_FACTOR * def);
  else if (type === "special") reduced = incoming / (1 + ARMOR_FACTOR * speDef);
  if (type !== "true") reduced -= d.flatBlock;
  reduced = Math.max(1, Math.ceil(reduced));

  let residual = reduced;
  let taken = 0;
  if (d.shield > 0) {
    let onShield: number;
    if (d.flinched) {
      onShield = Math.ceil(reduced * 0.5);
      residual = Math.ceil(reduced * 0.5);
    } else {
      onShield = reduced;
      residual = 0;
    }
    if (onShield >= d.shield) {
      residual += onShield - d.shield;
      onShield = d.shield;
    }
    d.shield = Math.max(0, d.shield - onShield);
    taken += onShield;
  }

  taken += Math.min(residual, d.hp);
  d.hp = Math.max(0, d.hp - residual);
  d.mana += Math.ceil(residual / 10);
  return { taken: Math.round(taken), dead: d.hp <= 0 };
}

export {};
