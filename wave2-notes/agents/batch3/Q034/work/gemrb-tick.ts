// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TICK_STAGGER = 16;     // each object evaluates its script step once per 16 ticks, offset by its id
export const IDLE_FORCE_TICKS = 15; // an idle object is forced to evaluate after more than 15 quiet ticks
export const TRIGGER_COUNTDOWN = 5; // after a trigger, evaluate for 5 more ticks

export interface Entity {
  id: number;             // stable id, used for the stagger bucket
  busy: boolean;          // has an action running
  engaged: boolean;       // in the fight: adaptation, never staggered or hibernated
  hibernating: boolean;   // off-screen neutral: skip the full AI step
  triggerCountdown: number;
  idleTicks: number;
}

// Wall-clock gate. Fires when at least one tick interval has passed since the last tick.
// The caller stores the time of THIS tick as the new reference, so lateness is not made up later.
export function tickDue(nowMs: number, lastTickMs: number, tickMs: number): boolean {
  return nowMs - lastTickMs >= tickMs;
}

// Decide whether one entity runs its AI step on this tick.
export function shouldEvaluate(e: Entity, tick: number): boolean {
  if (e.engaged) return true;                                    // adaptation: fight entities are not staggered
  if (tick % TICK_STAGGER !== e.id % TICK_STAGGER) return false; // stagger bucket
  if (e.hibernating) return false;                               // off-screen neutral: no full AI
  const needs = !e.busy || e.triggerCountdown > 0 || e.idleTicks > IDLE_FORCE_TICKS;
  if (!needs) {
    e.idleTicks++;
    return false;
  }
  e.idleTicks = 0;
  if (e.triggerCountdown > 0) e.triggerCountdown--;
  return true;
}
export {};
