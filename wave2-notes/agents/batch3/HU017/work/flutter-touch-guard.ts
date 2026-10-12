// Licence: MIT (donor, Very Good Ventures 2021). Written from the mechanism; the donor's defects are fixed here.
type Side = 'left' | 'right';

// Per-finger ownership of a side. A side's guard stays up while any finger still holds it.
class TouchGuardInput {
  private owner = new Map<number, Side>();          // pointerId -> side this finger holds
  private holders: Record<Side, number> = { left: 0, right: 0 };
  private armed = false;                            // true only while the fight is live

  constructor(
    private canvasWidth: () => number,
    private setGuard: (side: Side, up: boolean) => void,
    private isRocketHit: (x: number, y: number) => boolean,
    private onRocketTap: () => void,                // stands in for the plunger auto-pull
  ) {}

  // Engine state drives the gate. Closing it drops every hold.
  setArmed(on: boolean): void {
    this.armed = on;
    if (!on) for (const id of [...this.owner.keys()]) this.up(id);
  }

  down(pointerId: number, x: number, y: number, isTouch: boolean): void {
    if (!isTouch || !this.armed) return;
    if (this.isRocketHit(x, y)) { this.onRocketTap(); return; }
    if (this.owner.has(pointerId)) return;
    const side: Side = x < this.canvasWidth() / 2 ? 'left' : 'right';
    this.owner.set(pointerId, side);
    this.holders[side] += 1;
    if (this.holders[side] === 1) this.setGuard(side, true);   // first finger raises the guard
  }

  up(pointerId: number): void {
    const side = this.owner.get(pointerId);
    if (side === undefined) return;                 // unknown or already released: nothing to do
    this.owner.delete(pointerId);                   // the pointer entry is removed on release
    this.holders[side] -= 1;
    if (this.holders[side] === 0) this.setGuard(side, false);  // only the last finger drops it
  }

  cancel(pointerId: number): void {
    this.up(pointerId);
  }
}

export {};
