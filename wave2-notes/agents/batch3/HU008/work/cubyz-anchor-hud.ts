// clean-room sketch of an anchored-HUD solver and a heart-row mapper (shape only, GPL-3.0 donor)
type Attach = "lower" | "middle" | "upper";

type Rel =
  | { kind: "ratio"; ratio: number }
  | { kind: "frame"; self: Attach; other: Attach }
  | { kind: "window"; ref: Panel; self: Attach; other: Attach };

interface Panel {
  id: string;
  contentW: number;
  contentH: number;
  scale: number;
  size: [number, number];
  pos: [number, number];
  rel: [Rel, Rel];
}

const SNAP_PX = 3;
const MAX_PASSES = 8; // fix: the donor loops with no cap

function anchorPoint(a: Attach, start: number, length: number): number {
  return a === "lower" ? start : a === "middle" ? start + 0.5 * length : start + length;
}

function selfStart(a: Attach, point: number, size: number): number {
  return a === "lower" ? point : a === "middle" ? point - 0.5 * size : point - size;
}

function solveAxis(p: Panel, axis: 0 | 1, frame: [number, number]): number {
  const r = p.rel[axis];
  const size = p.size[axis];
  if (r.kind === "ratio") return frame[axis] * r.ratio - size / 2;
  if (r.kind === "frame") return selfStart(r.self, anchorPoint(r.other, 0, frame[axis]), size);
  return selfStart(r.self, anchorPoint(r.other, r.ref.pos[axis], r.ref.size[axis]), size);
}

// Re-solve every panel until no panel moves (squared move under 1e-3), with a pass cap.
function solveAll(panels: Panel[], frame: [number, number]): { passes: number; converged: boolean } {
  for (const p of panels) p.size = [p.contentW * p.scale, p.contentH * p.scale];
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    let changed = false;
    for (const p of panels) {
      const old: [number, number] = [p.pos[0], p.pos[1]];
      for (const axis of [0, 1] as const) {
        const raw = Math.floor(solveAxis(p, axis, frame));
        const lo = Math.max(raw, 0);
        p.pos[axis] = Math.min(lo, frame[axis] - p.size[axis]);
      }
      const dsq = (p.pos[0] - old[0]) ** 2 + (p.pos[1] - old[1]) ** 2;
      if (dsq >= 1e-3) changed = true;
    }
    if (!changed) return { passes: pass, converged: true };
  }
  return { passes: MAX_PASSES, converged: false };
}

// Health frames: half-heart units rounded up, whole hearts, empty frames to the max, row wrap.
type Frame = "full" | "half" | "empty";
function heartFrames(health: number, maxHealth: number, rowWidthPx = 160, cellPx = 20): { frames: Frame[]; perRow: number } {
  const units = Math.ceil(Math.max(0, health) * 2);
  const whole = Math.floor(units / 2);
  const half = units % 2;
  const total = Math.ceil(maxHealth);
  const frames: Frame[] = [];
  for (let i = 0; i < total; i++) {
    frames.push(i < whole ? "full" : i < whole + half ? "half" : "empty");
  }
  return { frames, perRow: Math.floor(rowWidthPx / cellPx) };
}

export { solveAll, heartFrames };
export {};
