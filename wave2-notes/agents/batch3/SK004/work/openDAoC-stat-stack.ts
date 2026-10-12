// Licence: GPL-3.0 repo LICENSE; source headers say GPL-2.0 or later (Dawn of Light). clean-room sketch written from the described mechanism, not a translation.
// Fixes applied: the donor's HP formula uses integer division (GamePlayer.cs CalculateMaxHealth hp1 / 50); the sketch keeps the division in floating point.

interface StatInput {
  level: number;
  isPlayer: boolean;
  baseAndItem: number;      // base stat plus item bonus
  ability: number;          // ability bonus (not debuffable here)
  baseBuff: number;         // base-category buff bonus
  specBuff: number;         // spec-category buff bonus
  baseDebuff: number;       // base-category debuff, positive magnitude
  specDebuff: number;       // spec-category debuff, positive magnitude
  buffMult: number;         // multiplier applied after buffs and debuffs
  deathConDebuff: number;   // constitution lost at death (CON only)
  isConstitution: boolean;
}

// Engine constants (donor StatCalculator.cs lines 8-10). A debuff point spent on a stat point
// is worth 1 / modifier of that stat: modifier 0.5 means 2 stat points per debuff point.
const SPEC_VS_BUFF = 0.5;   // spec debuff vs buff: 200 percent effective
const BASE_VS_BUFF = 1;     // base debuff vs buff: 100 percent effective
const VS_BASE_AND_ITEM = 2; // any debuff vs base or item stat: 50 percent effective

// One debuff against one stat. Returns the new debuff and stat values.
function applyDebuff(debuff: number, stat: number, modifier: number): { debuff: number; stat: number } {
  const remaining = debuff - stat * modifier;
  if (remaining > 0) return { debuff: Math.trunc(remaining), stat: 0 };
  return { debuff: 0, stat: stat - Math.trunc(debuff / modifier) };
}

// Four-step ladder in the donor's order: spec vs buff, spec vs base, base vs buff, base vs base.
function applyLadder(d: { base: number; spec: number; buff: number; stat: number }) {
  let { spec, buff, stat } = d;
  let base = d.base;
  if (spec > 0 && buff > 0) ({ debuff: spec, stat: buff } = applyDebuff(spec, buff, SPEC_VS_BUFF));
  if (spec > 0 && stat > 0) ({ debuff: spec, stat } = applyDebuff(spec, stat, VS_BASE_AND_ITEM));
  if (base > 0 && buff > 0) ({ debuff: base, stat: buff } = applyDebuff(base, buff, BASE_VS_BUFF));
  if (base > 0 && stat > 0) ({ debuff: base, stat } = applyDebuff(base, stat, VS_BASE_AND_ITEM));
  return { buff, stat };
}

// Buff caps only apply to players: base buffs up to level x 1.25, spec buffs up to level x 1.5 x 1.25.
function cappedBuffs(i: StatInput): number {
  if (!i.isPlayer) return i.baseBuff + i.specBuff;
  const baseCap = Math.trunc(i.level * 1.25);
  const specCap = Math.trunc(i.level * 1.5 * 1.25);
  return Math.min(i.baseBuff, baseCap) + Math.min(i.specBuff, specCap);
}

// Resolved stat for one character. Order: buffs (capped), debuffs (ladder), multiplier, death debuff, floor 1.
function resolveStat(i: StatInput): number {
  const buffs = cappedBuffs(i);
  const r = applyLadder({ base: i.baseDebuff, spec: i.specDebuff, buff: buffs, stat: i.baseAndItem });
  let stat = r.stat + r.buff + i.ability;
  stat = Math.trunc(stat * i.buffMult);
  if (i.isConstitution) stat -= i.deathConDebuff;
  return Math.max(1, stat);
}

// Max HP from level and constitution. Constitution below 50 counts double. Keeps the division as a float.
function maxHealth(baseHp: number, level: number, con: number): number {
  let c = con - 50;
  if (c < 0) c *= 2;
  const hp1 = baseHp * level;
  const hp2 = (hp1 * c) / 10000;
  const hp4 = 20 + hp1 / 50 + hp2;
  return Math.max(1, Math.trunc(hp4));
}

export {};
