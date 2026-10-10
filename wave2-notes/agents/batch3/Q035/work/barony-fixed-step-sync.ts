// Licence: BSD-2-Clause (donor Barony, LICENSE.txt). Clean-room sketch of the shape, written from the donor's order of operations.
const LOGIC_HZ = 50; // donor TICKS_PER_SECOND, game.hpp:389
const STEP_MS = 1000 / LOGIC_HZ; // 20 ms per logic step
const MAX_STEPS_PER_CALL = 5; // donor cap, game.cpp:4137-4139
const SEND_EVERY_TICKS = 6; // donor TICKS_PER_SECOND / 8 with integer division, game.cpp:2781
const RELIABLE_EVERY_SLOTS = 33; // sketch value: a reliable refresh every 33 send slots (about 3.96 s); not a donor constant

// Fixed logic step with a carried remainder. Steps beyond the cap are dropped, not carried.
class FixedStepClock {
  private carryMs = 0;

  constructor(private stepMs: number = STEP_MS) {}

  advance(elapsedMs: number): number {
    this.carryMs += elapsedMs;
    let steps = 0;
    while (this.carryMs >= this.stepMs) {
      this.carryMs -= this.stepMs;
      steps++;
    }
    return Math.min(steps, MAX_STEPS_PER_CALL);
  }
}

interface SyncEntity {
  uid: number;
  dirty: boolean; // donor UPDATENEEDED flag
  noUpdate: boolean; // donor NOUPDATE flag
}

interface SyncPlan {
  send: SyncEntity[];
  reliable: Set<number>; // uids that get the reliable send on this slot
}

// Dirty entities are pushed every SEND_EVERY_TICKS ticks. Each entity gets a reliable send on its own slot in the window.
function syncPlan(tick: number, entities: SyncEntity[]): SyncPlan {
  const plan: SyncPlan = { send: [], reliable: new Set<number>() };
  if (tick % SEND_EVERY_TICKS !== 0) {
    return plan;
  }
  const slot = Math.floor(tick / SEND_EVERY_TICKS);
  for (const e of entities) {
    if (!e.dirty || e.noUpdate) {
      continue;
    }
    plan.send.push(e);
    if (slot % RELIABLE_EVERY_SLOTS === e.uid % RELIABLE_EVERY_SLOTS) {
      plan.reliable.add(e.uid);
    }
  }
  return plan;
}

export {};
