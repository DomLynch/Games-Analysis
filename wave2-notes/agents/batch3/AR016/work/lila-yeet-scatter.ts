// Licence: AGPL-3.0-or-later (lila LICENSE and COPYING.md, read). Clean-room sketch written from the described mechanism; not a translation of round.yeet.ts.
// clean-room
export {};

const STEP = 1 / 60; // fixed step in seconds; the donor runs one step per requestAnimationFrame call

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Prop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
}

interface ScatterTuning {
  gravity: number; // donor 1.5 (added to vy every step)
  friction: number; // donor 0.97 (multiplies vx, vy and vrot every step)
  minAngle: number; // donor -0.436 rad
  maxAngle: number; // donor 3.576 rad
  minSpeed: number; // donor 250 (per step)
  maxSpeed: number; // donor 500 (per step)
  settleSpeed: number; // donor 0.5 (per step, both axes must be below it)
  floorGap: number; // donor 12 (px above the bottom edge)
  maxSteps: number; // not in the donor: hard cap added here
}

function launch(p: Prop, t: ScatterTuning, rand: () => number): void {
  const angle = rand() * (t.maxAngle - t.minAngle) + t.minAngle;
  const speed = rand() * (t.maxSpeed - t.minSpeed) + t.minSpeed;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.vrot = (rand() - 0.5) * 1.5; // donor: spin per step in -0.75..0.75 rad
}

// One step in the donor's order: move, bounce, gravity, friction, spin.
function step(p: Prop, t: ScatterTuning, box: Box): void {
  const oldX = p.x;
  const oldY = p.y;
  p.x += p.vx;
  p.y += p.vy;
  const hitX = p.x < box.minX || p.x > box.maxX;
  const hitY = p.y < box.minY || p.y > box.maxY;
  if (hitX || hitY) {
    p.x = oldX; // the donor resets both axes to the previous position
    p.y = oldY;
    if (hitX) p.vx = -p.vx;
    else p.vy = -p.vy; // else-if: at most one axis flips per step
  }
  p.vy += t.gravity;
  p.vx *= t.friction;
  p.vy *= t.friction;
  p.rot += p.vrot;
  p.vrot *= t.friction;
}

// A prop is still moving if it is fast on both axes, or more than floorGap above the bottom edge.
function moving(p: Prop, t: ScatterTuning, box: Box): boolean {
  const fast = Math.abs(p.vx) > t.settleSpeed && Math.abs(p.vy) > t.settleSpeed;
  return fast || box.maxY - p.y > t.floorGap;
}

export class Scatter {
  private acc = 0;
  private steps = 0;

  constructor(
    private readonly props: Prop[],
    private readonly t: ScatterTuning,
    private readonly box: Box,
    rand: () => number,
  ) {
    for (const p of props) launch(p, t, rand);
  }

  // Call once per frame with the frame time in seconds. Returns true when every prop has settled or the cap is hit.
  update(dt: number): boolean {
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.steps++;
      for (const p of this.props) step(p, this.t, this.box);
      const stillMoving = this.props.some(p => moving(p, this.t, this.box));
      if (!stillMoving || this.steps >= this.t.maxSteps) return true;
    }
    return false;
  }
}
