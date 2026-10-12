// Licence: GPL-2.0-or-later (donor, per the CharacterInfo_stats.cs header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface ApPool { ap: number; max: number; nextRegenMs: number; }

const AP_REGEN_MS = 1000;      // donor ACTION_REGEN_TIME
const AP_REGEN_GAIN = 25;      // donor +25 per regen
const AP_GLOBAL_RETRY_MS = 300; // donor retry while a global cooldown is active

// Regen step: add AP on the fixed interval, or retry in 300 ms while a global cooldown holds.
function tickAp(p: ApPool, nowMs: number, globalCooldownActive: boolean): void {
  if (nowMs < p.nextRegenMs) return;
  if (globalCooldownActive) {
    p.nextRegenMs = nowMs + AP_GLOBAL_RETRY_MS;
    return;
  }
  p.nextRegenMs = nowMs + AP_REGEN_MS;
  p.ap = Math.min(p.max, p.ap + AP_REGEN_GAIN);
}

// Cast: the gate is checked first, then the cost is taken (donor order).
function spendAp(p: ApPool, cost: number): boolean {
  if (cost > p.ap) return false;
  p.ap -= cost;
  return true;
}

// Flee: AP goes to zero and regen waits for lockMs (donor 10000).
function flee(p: ApPool, nowMs: number, lockMs: number): void {
  p.ap = 0;
  p.nextRegenMs = nowMs + lockMs;
}

// Reduction as a percent, capped at 75, floored at 2 (donor cap and floor; percent form is the fix).
function reducedDamage(raw: number, reduce: number): number {
  const r = Math.min(75, reduce);
  const out = raw * (1 - r / 100);
  return out < 2 ? 2 : out;
}

export {};
