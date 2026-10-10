// Licence: MIT (donor, Lost City 2023-2025). Code may be adapted; the copyright notice must be kept if code is copied. This sketch is written from the mechanism.
// clean-room
export const MAX_SPLATS_PER_TICK = 3; // Frankendom MAX_ATTACKERS; a fix to the donor's single slot

export interface Splat {
  amount: number; // damage shown: only the health that was actually left
  type: number;   // hit type, passed through to the client
}

export class HitState {
  hp: number;
  readonly baseHp: number;
  splats: Splat[] = []; // fix: a short per-tick list, not one slot

  constructor(hp: number, baseHp: number) {
    this.hp = hp;
    this.baseHp = baseHp;
  }

  // Each hit reads the live hp, so several hits in one tick stack.
  applyDamage(amount: number, type: number): void {
    const before = this.hp;
    const shown = Math.min(amount, before);  // matches the donor: on a kill the splat is the health that was left
    this.hp = before - shown;                // never below 0
    if (this.splats.length < MAX_SPLATS_PER_TICK) {
      this.splats.push({ amount: shown, type });
    }
  }

  // Sent in the same per-tick update as the splats: current and base hp for the bar.
  infoForClient(): { hp: number; baseHp: number; splats: Splat[] } {
    return { hp: this.hp, baseHp: this.baseHp, splats: this.splats.slice() };
  }

  // Cleared at the end of every tick, after the info update has been built.
  endTick(): void {
    this.splats.length = 0;
  }
}

export {};
