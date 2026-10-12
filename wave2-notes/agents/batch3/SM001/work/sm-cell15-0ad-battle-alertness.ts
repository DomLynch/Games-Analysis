// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type MusicState = "PEACE" | "BATTLE";

export interface AlertConfig {
  periodMs: number;       // timer period, donor value 200
  windowPeriods: number;  // periods in the damage window, donor value 12
  rateThreshold: number;  // damage per ms that counts as fighting, donor value 0.04
  battleAt: number;       // alertness at or above this is BATTLE, donor value 4
  peaceAt: number;        // alertness at or below this is PEACE, donor value 0
  alertMax: number;       // alertness ceiling, donor value 8
}

interface Period {
  dmg: number;
  ms: number;
}

export class BattleAlertness {
  private dmgThisPeriod = 0;
  private window: Period[] = [];
  private alertness = 0;
  private state: MusicState = "PEACE";
  private ticksSinceCheck = 0;
  private running = false;

  constructor(private cfg: AlertConfig) {}

  // True while the caller should keep a period timer running.
  get active(): boolean {
    return this.running;
  }

  // Report damage that this player is part of (the caller chooses dealt, taken or both).
  onDamage(amount: number): void {
    if (!this.running) this.start();
    this.dmgThisPeriod += amount;
  }

  // One period tick. elapsedMs is the measured time since the previous tick, not the nominal period.
  tick(elapsedMs: number): MusicState {
    this.window.unshift({ dmg: this.dmgThisPeriod, ms: elapsedMs });
    this.window.length = Math.min(this.window.length, this.cfg.windowPeriods);
    this.dmgThisPeriod = 0;
    this.ticksSinceCheck++;

    // Idle: judge every period. Alert: judge once per full window.
    if (this.alertness === 0 || this.ticksSinceCheck >= this.cfg.windowPeriods) {
      this.ticksSinceCheck = 0;
      let dmgSum = 0;
      let msSum = 0;
      for (const p of this.window) {
        dmgSum += p.dmg;
        msSum += p.ms;
      }
      const rate = msSum > 0 ? dmgSum / msSum : 0;

      if (rate > this.cfg.rateThreshold) {
        this.alertness = Math.min(this.cfg.alertMax, this.alertness + 1);
      } else {
        this.alertness = Math.max(0, this.alertness - 1);
      }
      if (this.alertness === 0) this.running = false;

      // Hysteresis: between the two thresholds the state holds.
      if (this.alertness >= this.cfg.battleAt) this.state = "BATTLE";
      else if (this.alertness <= this.cfg.peaceAt) this.state = "PEACE";
    }
    return this.state;
  }

  private start(): void {
    // Clear the record on every start so an old fight cannot colour a new one.
    this.running = true;
    this.window = [];
    this.dmgThisPeriod = 0;
    this.ticksSinceCheck = 0;
  }
}

export {};
