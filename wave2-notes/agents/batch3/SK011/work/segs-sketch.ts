// Licence: BSD-3-Clause (donor LICENSE.md). Written from the mechanism read in WorldSimulation.cpp, DataHelpers.cpp, EntityHelpers.cpp and CharacterHelpers.cpp; not a line-by-line translation.
// Frankendom target: src/fight/resources.ts (endurance gate, tick regen, activation, recharge and toggle upkeep).

export interface PowerData {
  cost: number;            // EnduranceCost (catalogue data)
  activateTime: number;    // TimeToActivate, seconds
  rechargeTime: number;    // RechargeTime, seconds (click powers)
  isToggle: boolean;
  activatePeriod: number;  // seconds between toggle upkeep fires
}

export interface Resource {
  hp: number; maxHp: number;
  end: number; maxEnd: number;
  dead: boolean;
}

// Fix (donor defect): the donor uses the raw measured frame time, with no cap.
export const MAX_DT = 0.25;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Regen per tick: health uses Regeneration/20, endurance uses Recovery/4.9, both over 12 (donor formula).
export function regenTick(r: Resource, regeneration: number, recovery: number, dtSec: number): void {
  if (r.dead) return;
  const dt = Math.min(dtSec, MAX_DT);
  r.hp = clamp(r.hp + r.maxHp * (regeneration / 20 * dt / 12), 0, r.maxHp);
  r.end = clamp(r.end + r.maxEnd * (recovery / 4.9 * dt / 12), 0, r.maxEnd);
}

// Use gate (donor usePower checks endurance against the cost before queuing).
export function canUse(r: Resource, p: PowerData): boolean {
  return r.end >= p.cost;
}

// Fire: spend the cost. Fix (donor defect): re-check here, because the donor spends without a re-check and the setter clamps at zero, losing the shortfall silently.
export function fire(r: Resource, p: PowerData): { fired: boolean; shortfall: number } {
  if (r.end < p.cost) return { fired: false, shortfall: p.cost - r.end };
  r.end -= p.cost;
  return { fired: true, shortfall: 0 };
}

// Countdowns: activation and recharge drop by the frame time (donor 210 and 256).
export interface Timers { activateLeft: number; rechargeLeft: number; }

export function tickTimers(t: Timers, dtSec: number): void {
  const dt = Math.min(dtSec, MAX_DT);
  t.activateLeft -= dt;
  t.rechargeLeft -= dt;
}

// Toggle upkeep: when the period timer reaches zero, fire once and add one period (donor checkAutoToggleTimers). Off when endurance is below the cost.
export interface ToggleState { on: boolean; periodLeft: number; }

export function toggleTick(r: Resource, p: PowerData, t: ToggleState, dtSec: number): void {
  if (!t.on) return;
  if (r.end < p.cost) { t.on = false; return; }
  if (t.periodLeft <= 0) {
    fire(r, p);
    t.periodLeft += p.activatePeriod;
  } else {
    t.periodLeft -= Math.min(dtSec, MAX_DT);
  }
}

// Revive fraction by level 1..6 (donor ReviveLevel: AWAKEN, BOUNCE_BACK, RESTORATION, IMMORTAL_RECOVERY, REGEN_REVIVE, FULL).
export const REVIVE_HP: Record<number, number> = { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1, 5: 0.75, 6: 1 };
export const REVIVE_END: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.5, 6: 1 };

// Health change. Donor changeHP: clamp to max; below 0.1 the character dies and endurance is zeroed.
export function setHpFromEvent(r: Resource, newHp: number): void {
  r.hp = Math.min(newHp, r.maxHp);
  if (r.hp < 0.1) {
    r.dead = true;
    r.hp = 0;
    r.end = 0;
  }
}

export {};
