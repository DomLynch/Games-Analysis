// Donor licence: AGPL-3.0 (swgemu-Core3 COPYING); Lua data headers are LGPL. Clean-room sketch from the described mechanism, not a translation of the donor lines.
interface Pool { value: number; max: number; }
interface PowerDef { cost: number; durationS: number; }
interface Actor { pool: Pool; buffs: Set<string>; meditating: boolean; alive: boolean; }

type UseResult =
  | { ok: true; charged: number }
  | { ok: false; reason: 'armour' | 'blocked' | 'no-power' | 'invalid' };

const TICK = 5;      // points per regen tick
const MED_MULT = 3;  // tick multiplier while meditating

// Seconds between regen ticks for a given regen rate (donor: timer = regen / 5, interval = 10 / timer).
// A rate of 0 means no regen at all.
function regenIntervalS(regen: number): number {
  return regen > 0 ? 50 / regen : Infinity;
}

// One regen tick. Caps at max instead of overshooting.
function regenTick(a: Actor): void {
  if (!a.alive || a.pool.value >= a.pool.max) return;
  const tick = TICK * (a.meditating ? MED_MULT : 1);
  a.pool.value = Math.min(a.pool.max, a.pool.value + tick);
}

// Regen re-arms only while below max, so the engine owns the timer.
function needsRegenTimer(a: Actor): boolean {
  return a.alive && a.pool.value < a.pool.max;
}

// Self buff. Toggling off is free. Otherwise: armour and blocking buffs refuse, the pool must cover the cost,
// then the buff is applied and the cost is charged (donor order: add buff, then charge).
function useSelfBuff(a: Actor, buff: string, def: PowerDef, blocks: string[], armour: boolean): UseResult {
  if (a.buffs.has(buff)) {
    a.buffs.delete(buff);
    return { ok: true, charged: 0 };
  }
  if (armour) return { ok: false, reason: 'armour' };
  if (blocks.some((b) => a.buffs.has(b))) return { ok: false, reason: 'blocked' };
  if (a.pool.value < def.cost) return { ok: false, reason: 'no-power' };
  a.buffs.add(buff);
  a.pool.value -= def.cost;
  return { ok: true, charged: def.cost };
}

// Ranged power. Refused before the action when the pool is short. Charged after the action is accepted.
// A refusal from the action (invalid target, general error) charges nothing.
function useRanged(a: Actor, def: PowerDef, action: () => 'done' | 'invalid' | 'error'): UseResult {
  if (a.pool.value < def.cost) return { ok: false, reason: 'no-power' };
  const res = action();
  if (res === 'invalid') return { ok: false, reason: 'invalid' };
  if (res === 'error') return { ok: false, reason: 'invalid' };
  a.pool.value -= def.cost;
  return { ok: true, charged: def.cost };
}

// Command duration with combat haste. Fixed: clamped at zero (donor has no clamp, so haste of 100 or more gives zero or a negative time).
function commandDurationS(speed: number, hastePct: number): number {
  if (hastePct <= 0) return speed;
  return Math.max(0, speed * (1 - hastePct / 100));
}

// Modified cost with a council modifier. Fixed: Math.round, not (int)(x + 0.5), which truncates toward zero for negatives.
function modifiedCost(base: number, manipulationSkill: number, councilMod: number): number {
  if (manipulationSkill === 0 || councilMod === 0) return base;
  return base + Math.round(manipulationSkill * councilMod);
}

export {};
