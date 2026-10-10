// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V3 { x: number; y: number; z: number; }

// Frame-history smoothing: keep the newest `frames` samples and average them with weights decay^i (newest is i = 0).
class HistorySmoother {
  private history: V3[] = [];
  constructor(private readonly frames: number, private readonly decay: number = 0.9) {}

  push(sample: V3): V3 {
    this.history.unshift({ ...sample });
    while (this.history.length > this.frames) this.history.pop();
    let wSum = 0, x = 0, y = 0, z = 0;
    this.history.forEach((s, i) => {
      const k = Math.pow(this.decay, i);
      wSum += k;
      x += s.x * k; y += s.y * k; z += s.z * k;
    });
    return { x: x / wSum, y: y / wSum, z: z / wSum };
  }
}

interface FovState { active: number; target: number; }
const FOV_EASE_PER_SECOND = 50;   // degrees per second toward the target (donor counts seconds of delta)

// Ease the active FOV toward the target; snap when within 1 degree.
function stepFov(f: FovState, dt: number): void {
  if (Math.abs(f.active - f.target) < 1) { f.active = f.target; return; }
  const step = FOV_EASE_PER_SECOND * dt;
  if (f.active < f.target) f.active = Math.min(f.target, f.active + step);
  else f.active = Math.max(f.target, f.active - step);
}

// Mode-keyed FOV target: the base FOV, plus an extension while the mode asks for it.
function fovTarget(baseFov: number, extraFov: number, extended: boolean): number {
  return extended ? baseFov + extraFov : baseFov;
}
export {}
