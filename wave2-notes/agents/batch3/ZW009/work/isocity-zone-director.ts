// Licence: MIT (amilich-isometric-city, Copyright (c) 2025 amilich). Adapted shape, rewritten here.
// Zone population director: one slot per zoned tile; demand is a lagged -100..100 signal per zone.

type SlotState = 'empty' | 'built' | 'abandoned';

interface Slot {
  state: SlotState;
  age: number; // ticks since built; abandoned slots age at one tenth the rate
}

interface ZoneTuning {
  spawnBase: number;      // 0.05 chance per tick at full demand
  spawnZeroAt: number;    // -30: no spawns at or below this demand
  spawnFullAt: number;    // 50: full base chance at or above this demand
  abandonBelow: number;   // -20: abandonment only when demand is below this
  abandonGrace: number;   // 30: built slot must be older than this (ticks)
  abandonCap: number;     // 0.02: per-tick abandonment cap
  abandonDivisor: number; // 4000: how fast the chance grows below the threshold
  recoverAbove: number;   // 10: abandoned slots can clear only above this demand
  clearCap: number;       // 0.12: per-tick clearing cap
  clearDivisor: number;   // 600: how fast the clearing chance grows above the threshold
}

type TickEvent = 'none' | 'spawned' | 'abandoned' | 'cleared';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function spawnChance(demand: number, t: ZoneTuning): number {
  const factor = clamp01((demand - t.spawnZeroAt) / (t.spawnFullAt - t.spawnZeroAt));
  return t.spawnBase * factor;
}

export function abandonChance(demand: number, t: ZoneTuning): number {
  return Math.min(t.abandonCap, Math.abs(demand - t.abandonBelow) / t.abandonDivisor);
}

export function clearChance(demand: number, t: ZoneTuning): number {
  return Math.min(t.clearCap, (demand - t.recoverAbove) / t.clearDivisor);
}

// One tick for one slot. `demand` is the previous tick's value; `rand` returns a number in [0, 1).
export function tickSlot(slot: Slot, demand: number, t: ZoneTuning, rand: () => number): TickEvent {
  if (slot.state === 'empty') {
    if (rand() < spawnChance(demand, t)) {
      slot.state = 'built';
      slot.age = 0;
      return 'spawned';
    }
    return 'none';
  }
  if (slot.state === 'abandoned') {
    if (demand > t.recoverAbove && rand() < clearChance(demand, t)) {
      slot.state = 'empty';
      slot.age = 0;
      return 'cleared';
    }
    slot.age += 0.1;
    return 'none';
  }
  // built: abandonment check first, then age on the survivor
  if (demand < t.abandonBelow && slot.age > t.abandonGrace && rand() < abandonChance(demand, t)) {
    slot.state = 'abandoned';
    return 'abandoned';
  }
  slot.age += 1;
  return 'none';
}
export {}
