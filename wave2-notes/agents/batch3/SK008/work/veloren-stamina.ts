// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism; no donor lines translated.
// clean-room
// Stamina (energy) pool with a state-gated regen ramp. Units: pool units; rate in units per second; dt in seconds.
type RegenPhase = 'regen' | 'reset' | 'stall';

interface Stamina {
  current: number;   // 0..max
  max: number;
  rate: number;      // regen rate, ramps while regenerating, zeroed by actions
}

const RATE_CAP = 10.0;   // per second (donor cap)
const ACCEL_IDLE = 1.0;  // rate gained per second of regen (donor ENERGY_REGEN_ACCEL)
const ACCEL_SIT = 2.5;   // donor SIT_ENERGY_REGEN_ACCEL

// One tick. Order matches the donor: regen adds rate*dt first, then the rate ramps and caps.
function tickStamina(s: Stamina, phase: RegenPhase, accel: number, dt: number): void {
  if (phase === 'reset') { s.rate = 0; return; }   // attacks, rolls: no regen, ramp restarts
  if (phase === 'stall') return;                  // block, stun, item use: no regen, ramp kept
  if (s.current < s.max) {
    s.current = Math.min(s.max, s.current + s.rate * dt);
    s.rate = Math.min(s.rate + accel * dt, RATE_CAP);
  }
}

// Spend: refuse if the pool would go below zero (donor try_change_by).
function trySpend(s: Stamina, cost: number): boolean {
  if (s.current - cost < 0) return false;
  s.current -= cost;
  return true;
}

// Hit refund: adds energy without resetting the ramp (donor EnergyReward, reset_rate false).
// armourSum is the sum of equipped armour energy_reward values; the donor folds it as 1.0 + sum.
function hitRefund(s: Stamina, reward: number, armourSum: number, statMult: number): void {
  const armourMult = 1.0 + armourSum;
  s.current = Math.min(s.max, s.current + reward * armourMult * statMult);
}

// Max pool: base times a stat multiplier, plus flat stat and armour additions.
function maxPool(base: number, statMult: number, statAdd: number, armourMaxSum: number): number {
  return base * statMult + statAdd + armourMaxSum;
}

// Worked check: a humanoid pool of 100, idle regen from empty, dt 0.01 s. Expect about 15 s.
function secondsFromEmptyIdle(): number {
  const s: Stamina = { current: 0, max: 100, rate: 0 };
  let t = 0;
  while (s.current < s.max && t < 60) { tickStamina(s, 'regen', ACCEL_IDLE, 0.01); t += 0.01; }
  return t;
}
export const idleFullSeconds: number = secondsFromEmptyIdle();

// Worked check: sit regen from empty. Expect about 12 s.
function secondsFromEmptySit(): number {
  const s: Stamina = { current: 0, max: 100, rate: 0 };
  let t = 0;
  while (s.current < s.max && t < 60) { tickStamina(s, 'regen', ACCEL_SIT, 0.01); t += 0.01; }
  return t;
}
export const sitFullSeconds: number = secondsFromEmptySit();
export {};
