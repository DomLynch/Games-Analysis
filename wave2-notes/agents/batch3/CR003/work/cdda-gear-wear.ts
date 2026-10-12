// clean-room: shape of the mechanism only (donor is CC BY-SA 3.0). Numbers are data fields, not copied.
interface Piece {
  damage: number;        // repairable wear, 0..maxDamage
  degradation: number;   // permanent floor set by wear; repair cannot go below it
  resist: number;        // the piece's own resist to this hit type
  fragile: boolean;
  sturdy: boolean;
  coveredParts: number;  // body parts covered (large pieces take more punishment)
  maxDamage: number;     // data field, donor default 4000
}

interface RepairInput {
  skill: number;
  dex: number;
  toolQuality: number;
  materialDifficulty: number; // hardest material of the piece
}

const STEP = 1000;   // one wear or repair step = one damage level
const LEVELS = 5;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// 0 = pristine; 1..5 by share of maxDamage.
function damageLevel(p: Piece): number {
  if (p.damage === 0) return 0;
  return clamp(1 + Math.floor((4 * p.damage) / p.maxDamage), 0, LEVELS);
}

// Protection left after wear: each level above 1 removes 12.5% of resist.
function protectionFactor(p: Piece): number {
  return Math.max(0, 1 - Math.max(0, damageLevel(p) - 1) * 0.125);
}

// Chance one hit wears the piece: logistic, 40% at the midpoint, capped at 80%.
function wearChance(p: Piece, premitigated: number): number {
  const mid = p.fragile ? p.resist * 0.6666 : Math.max(10, p.resist * 1.3333);
  const k = p.fragile ? 0.1 : 1.0;
  if (p.sturdy && premitigated < mid) return 0;
  let c = 0.8 / (1 + Math.exp(-k * (premitigated - mid)));
  if (!p.fragile) c /= p.coveredParts;
  return c;
}

// Applies one wear step when the roll hits. Returns 'destroyed' if the step would pass maxDamage.
function hitWear(p: Piece, premitigated: number, roll: number, degradePerLevel: number): 'undamaged' | 'damaged' | 'destroyed' {
  if (!(roll < wearChance(p, premitigated))) return 'undamaged';
  if (p.damage + STEP > p.maxDamage) return 'destroyed';
  const before = damageLevel(p);
  p.damage += STEP;
  const crossed = damageLevel(p) - before;
  if (crossed > 0) p.degradation = Math.min(p.maxDamage, p.degradation + crossed * degradePerLevel);
  p.damage = Math.max(p.damage, p.degradation);
  return 'damaged';
}

// One repair attempt. On 'failure' the caller must apply one wear step (donor damage_item); this function does not.
function repairOutcome(p: Piece, r: RepairInput, roll: number): 'success' | 'retry' | 'failure' {
  const difficulty = r.materialDifficulty + damageLevel(p);
  const success = clamp((10 + 2 * r.skill - 2 * difficulty + r.toolQuality / 5) / 100, 0, 1);
  const fail = clamp((difficulty - r.skill - (r.toolQuality + r.dex) / 5) / 100, 0, 1);
  const succ = Math.min(success, 1 - fail);
  if (roll > 1 - fail) return 'failure';
  if (roll < succ) return 'success';
  return 'retry';
}

function applyRepair(p: Piece): void {
  p.damage = Math.max(p.degradation, p.damage - STEP);
}
