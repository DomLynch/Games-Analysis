// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

// Data (zone data): meter ceiling and rates. Rates are per SECOND here (donor code runs them per 10 s tick).
interface MeterConfig {
  max: number;          // ceiling of the fed meter (donor: 100)
  drainPerSec: number;  // donor default 2 per 10 s = 0.2 per s
  starvePerSec: number; // donor default 3 per 10 s = 0.3 per s (its config comment says 3 per second)
}

interface Condition {
  energy: number;  // 0..max
  health: number;
  frozen: boolean; // true while asleep or AFK: no drain, no starvation
}

// The only function that lowers health. Sleep and starvation both call it (the donor's sleep path does not).
export function takeDamage(c: Condition, amount: number): void {
  if (amount <= 0) return;
  c.health = Math.max(0, c.health - amount);
}

// Advance the meter by dt seconds. The caller decides how often to call it (donor: every 10 s).
export function step(c: Condition, dtS: number, cfg: MeterConfig): { starving: boolean; dead: boolean } {
  if (!c.frozen) {
    c.energy = Math.max(0, Math.min(cfg.max, c.energy - cfg.drainPerSec * dtS));
    if (c.energy === 0) takeDamage(c, cfg.starvePerSec * dtS);
  }
  return { starving: c.energy === 0, dead: c.health <= 0 };
}

// Eating adds the food's energy, clamped to 0..max.
export function eat(c: Condition, foodEnergy: number, cfg: MeterConfig): void {
  c.energy = Math.max(0, Math.min(cfg.max, c.energy + foodEnergy));
}

// Respawn resets the meter and health.
export function respawn(c: Condition, cfg: MeterConfig, maxHealth: number): void {
  c.energy = cfg.max;
  c.health = maxHealth;
  c.frozen = false;
}

// Sleep and AFK only switch the freeze flag. The energy value is never rewritten on wake or return.
export function setFrozen(c: Condition, frozen: boolean): void {
  c.frozen = frozen;
}

// Donor default rates expressed per second (see the comment on MeterConfig).
export const DONOR_DEFAULT: MeterConfig = { max: 100, drainPerSec: 2 / 10, starvePerSec: 3 / 10 };
