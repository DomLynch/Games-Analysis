// Licence: BSD-3-Clause-style (donor engine/LICENSE). Clean-room sketch of the mechanism; not a translation.

const GLOBAL_BLOCK_RATIO = 0.25;   // used only when the global block-ratio switch is on

interface Offense { factor: number; adjust: number; min: number; max: number; }
interface Defense {
  factor: number; adjust: number; min: number; max: number;   // unblocked hit
  blockRatio: number | null;                                  // null = use the global switch
  blockAdjust: number; blockMin: number; blockMax: number;    // blocked hit
  blockPower: number; blockThreshold: number;                 // which attacks may be blocked
}
interface Fighter {
  hp: number; maxHp: number;
  guard: number; guardMax: number; guardRate: number; guardNextTick: number;
  blocking: boolean;
}
interface Attack { force: number; guardCost: number; noBlock: number; }

function offenseDamage(o: Offense, force: number): number {
  let r = Math.trunc(force * o.factor);   // C (int) cast truncates
  r += o.adjust;
  return Math.min(o.max, Math.max(o.min, r));
}

function defenseDamage(d: Defense, force: number, blocked: boolean, globalBlockOn: boolean): number {
  const ratio = blocked ? (d.blockRatio ?? (globalBlockOn ? GLOBAL_BLOCK_RATIO : 0)) : d.factor;
  const adj = blocked ? d.blockAdjust : d.adjust;
  const lo = blocked ? d.blockMin : d.min;
  const hi = blocked ? d.blockMax : d.max;
  let r = Math.round(force * ratio) + adj;
  return Math.min(hi, Math.max(lo, r));
}

// Native block: the guard must still have points and the attack must be above the block threshold.
function canBlock(t: Fighter, a: Attack, d: Defense, threshold: number): boolean {
  if (!t.blocking) return false;
  if (t.guardMax > 0 && t.guard <= 0) return false;
  if ((a.noBlock > 0 || d.blockPower > 0) && a.noBlock >= d.blockPower) return false;
  if (threshold > a.force) return false;
  return true;
}

// One hit on one target. Returns the HP lost and whether the guard broke.
function resolveHit(t: Fighter, a: Attack, off: Offense, def: Defense, globalBlockOn: boolean, threshold: number) {
  if (canBlock(t, a, def, threshold)) {
    t.guard -= a.guardCost;
    const chip = defenseDamage(def, offenseDamage(off, a.force), true, globalBlockOn);
    t.hp -= chip;                      // chip damage; the donor sends a lethal chip to the full path (omitted)
    return { hpLost: chip, guardBroke: false };
  }
  if (t.guardMax > 0 && t.guard <= 0) {
    t.guard = t.guardMax;              // guard break: no damage, refill (donor refills in set_pain)
    return { hpLost: 0, guardBroke: true };
  }
  const dmg = defenseDamage(def, offenseDamage(off, a.force), false, globalBlockOn);
  t.hp = Math.max(0, t.hp - dmg);
  return { hpLost: dmg, guardBroke: false };
}

// Guard regenerates on a tick cadence; half rate while actively blocking.
function regenGuard(t: Fighter, nowTick: number, gameSpeedTicks: number): void {
  if (t.guardMax <= 0 || nowTick < t.guardNextTick) return;
  t.guard += t.blocking ? Math.trunc(t.guardRate / 2) : t.guardRate;
  if (t.guard > t.guardMax) t.guard = t.guardMax;
  t.guardNextTick = nowTick + gameSpeedTicks;
}

// Per-target hit cooldown: a target cannot be hit again until its next_hit_time has passed.
function nextHitTime(now: number, attackCooldown: number, gameSpeed: number): number {
  return now + (attackCooldown !== 0 ? attackCooldown : Math.trunc(gameSpeed / 5));
}
export {}
