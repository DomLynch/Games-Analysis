// Licence: Apache-2.0 (donor). Own code written from the described mechanism.
interface Vec { x: number; y: number }

export class FightCamera {
  pos: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };
  baseZoom = 1;
  private bop = 1;
  constructor(private follow = 0.04, private decay = 0.95, private pulseSize = 1.015) {}

  focus(p: Vec): void { this.target = { ...p }; }
  pulse(size = this.pulseSize): void { this.bop = Math.max(this.bop, size); }

  update(elapsedSec: number): number {
    const dt = elapsedSec * 60;
    const k = 1 - Math.pow(1 - this.follow, dt);
    this.pos.x += (this.target.x - this.pos.x) * k;
    this.pos.y += (this.target.y - this.pos.y) * k;
    this.bop = 1 + (this.bop - 1) * Math.pow(this.decay, dt);
    return this.baseZoom * this.bop;
  }
}

export {}
