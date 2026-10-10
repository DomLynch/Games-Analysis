// Licence: GPL-3.0-or-later (donor, OpenRA). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MULT_LIMIT = 3;                        // per-axis clamp on the summed multiplier (donor: min/max data, default -3..3)
const INTENSITY_SCALE = 100 * 1024 * 1024;   // donor constant, applied to intensity / squared distance
const INTENSITY_CAP = 10;                    // cap on the summed intensity, px

interface ShakeEffect {
  expiryTick: number;
  x: number;                                 // event position, world units
  y: number;
  intensity: number;
  mult: { x: number; y: number };
}

interface View { cx: number; cy: number; }   // view centre, world units

class ScreenShake {
  private effects: ShakeEffect[] = [];
  private tick = 0;
  private prevX = 0;
  private prevY = 0;

  constructor(private readonly view: View) {}

  add(durationTicks: number, x: number, y: number, intensity: number, mult = { x: 1, y: 1 }): void {
    this.effects.push({ expiryTick: this.tick + durationTicks, x, y, intensity, mult });
  }

  // Once per game tick (fixed step). Moves the view by the change in the shake offset only, so the view's own logic is untouched.
  step(): void {
    this.effects = this.effects.filter(e => e.expiryTick > this.tick);
    let nx = 0, ny = 0;
    if (this.effects.length > 0) {
      let mx = 0, my = 0, sum = 0;
      for (const e of this.effects) {
        mx += e.mult.x; my += e.mult.y;
        const dx = e.x - this.view.cx, dy = e.y - this.view.cy;
        const d2 = Math.max(dx * dx + dy * dy, 1); // floored at 1 to avoid division by zero
        sum += e.intensity / d2;
      }
      const k = Math.min(INTENSITY_SCALE * sum, INTENSITY_CAP);
      const gx = Math.max(-MULT_LIMIT, Math.min(MULT_LIMIT, mx));
      const gy = Math.max(-MULT_LIMIT, Math.min(MULT_LIMIT, my));
      nx = gx * k * Math.sin((this.tick * 2 * Math.PI) / 4); // fixed pattern: period 4 ticks on x
      ny = gy * k * Math.cos((this.tick * 2 * Math.PI) / 5); // period 5 ticks on y
    }
    this.view.cx += nx - this.prevX;
    this.view.cy += ny - this.prevY;
    this.prevX = nx; this.prevY = ny;
    this.tick++;
  }
}
