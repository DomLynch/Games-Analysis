// Licence: MIT (donor, Lost City). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export const enum HitType { BLOCK, DAMAGE, POISON }

export interface Splat { damage: number; type: HitType; }

export class HitTarget {
  hp: number;
  // two visible splat slots per tick; the slot is chosen by hit parity
  shown: [Splat | null, Splat | null] = [null, null];
  private hitCount = 0;

  constructor(maxHp: number) { this.hp = maxHp; }

  // Apply one hit. Health is clamped at 0; the splat shows the HP actually removed (no overkill).
  applyHit(damage: number, type: HitType): number {
    if (damage < 0) throw new Error("negative damage");
    const effective = this.hp - damage <= 0 ? this.hp : damage;
    this.hp = Math.max(0, this.hp - damage);
    this.shown[this.hitCount % 2] = { damage: effective, type };
    this.hitCount++;
    return effective;
  }

  // Called once at tick end, after the splats have been sent: the next tick starts clean.
  endTick(): void {
    this.shown = [null, null];
    this.hitCount = 0;
  }
}

export {};
