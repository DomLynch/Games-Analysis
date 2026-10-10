// Licence: MIT (donor, LICENSE.txt at the donor root). Written as our own sketch from the described formulas; not a line-by-line translation.
type Block = "none" | "shield" | "perfect";

interface Actor {
  level: number;
  pAtk: number;        // attacker physical attack
  levelMod: number;    // donor getLevelMod(), not read: passed in
  critDamage: number;  // crit damage stat (skill or auto-attack path)
  ranged: boolean;
}

interface Defender {
  level: number;
  pDef: number;
  defCritRate: number;     // defence crit-rate stat, already including the add term
  defCritDamage: number;
  shieldDef: number;
  shieldRate: number;
  conMul: number;          // donor BaseStat.CON.calcBonus(target), not read: passed in
  shieldArcAll: boolean;   // true when the shield covers all directions
}

const FRONT_ARC_DEG = 120;       // shield blocks only inside this arc, centred on the defender's facing
const RANGED_SHIELD_MUL = 1.3;   // ranged attacks face a higher shield block rate
const PERFECT_BLOCK_DAMAGE = 1;  // donor: a perfect block leaves the initial damage at 1

function rnd100(rand: () => number): number {
  return Math.floor(rand() * 100);
}

// angleOffDeg = absolute difference between the defender's facing and the bearing to the attacker, wrapped to 0..180
// (the donor takes a raw difference with no wrap, so it mis-blocks across 0/360).
function rollShield(d: Defender, attackerRanged: boolean, angleOffDeg: number, rand: () => number): Block {
  if (!d.shieldArcAll && angleOffDeg > FRONT_ARC_DEG / 2) return "none";
  let rate = d.shieldRate * d.conMul;
  if (attackerRanged) rate *= RANGED_SHIELD_MUL;
  if (!(rate > rnd100(rand))) return "none";
  return 100 - 2 * d.conMul < rnd100(rand) ? "perfect" : "shield";
}

// Auto-attack crit: positional multiplier times defence crit-rate (divided by 10) times height,
// plus a level term at level 78 and up, clamped to 3..97 percent.
function autoCritChance(a: Actor, d: Defender, posMul: number, heightMul: number): number {
  let rate = posMul * (d.defCritRate / 10) * heightMul;
  if (a.level >= 78 || d.level >= 78) rate += Math.sqrt(a.level) * (a.level - d.level) * 0.125;
  return Math.min(97, Math.max(3, rate)) / 100;
}

// Physical skill crit: skill crit value times stat bonus times rate bonus times defence factor, clamped to 5..90 percent.
function skillCritChance(skillCrit: number, statBonus: number, rateBonus: number, defenceMul: number): number {
  return Math.min(90, Math.max(5, skillCrit * statBonus * rateBonus * defenceMul)) / 100;
}

// Physical skill hit. Melee uses 77, ranged 70 and adds attack + power again for ranged.
function physicalDamage(
  a: Actor,
  d: Defender,
  block: Block,
  crit: boolean,
  power: number,
  pAtkMod: number
): number {
  if (block === "perfect") return PERFECT_BLOCK_DAMAGE;
  const defence = Math.max(1, d.pDef + (block === "shield" ? d.shieldDef : 0));
  const attack = a.pAtk * pAtkMod;
  const weaponMod = a.ranged ? 70 : 77;
  const rangedBonus = a.ranged ? attack + power : 0;
  const baseMod = (weaponMod * (attack * a.levelMod + power + rangedBonus)) / defence;
  const critMod = crit ? 2 * a.critDamage * d.defCritDamage : 1;
  return baseMod * critMod;
}

export {};
