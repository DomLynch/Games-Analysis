// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V2 { x: number; y: number; }
export interface Tile { x: number; y: number; }

// anchor: the last committed tile (the camera's tile). pending: the step in progress, if any.
// stepPx: the screen-space vector of the full step (a data table in the engine, one per direction).
export interface StepState {
  anchor: Tile;
  pending: { to: Tile; stepPx: V2 } | null;
  progress: number; // 0..1 through the step animation
}

// Progress from game ticks: whole ticks into the step plus the fraction to the next tick (render-side interpolation).
export function stepProgress(ticksIntoStep: number, fractionToNextTick: number, ticksPerStep: number): number {
  const p = (ticksIntoStep + fractionToNextTick) / ticksPerStep;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

// The camera is anchored to the last committed tile. While a step is in progress the world is shifted
// by the step's screen vector scaled by progress, negated, so the view glides from the old tile to the new one.
export function cameraFor(s: StepState): { anchor: Tile; worldShiftPx: V2 } {
  if (!s.pending) return { anchor: s.anchor, worldShiftPx: { x: 0, y: 0 } };
  return {
    anchor: s.anchor,
    worldShiftPx: { x: -s.pending.stepPx.x * s.progress, y: -s.pending.stepPx.y * s.progress },
  };
}

// Called when the step's animation finishes: commit the tile and snap the anchor onto it.
// The glide offset returns to zero in the same call, so there is no visible jump.
export function commitStep(s: StepState): void {
  if (!s.pending) return;
  s.anchor = s.pending.to;
  s.pending = null;
  s.progress = 0;
}

// The player is drawn at the centre of the play area. The donor subtracts the main panel height first; the sketch takes the area as input.
export function playerScreenCentre(viewW: number, viewH: number): V2 {
  return { x: viewW / 2, y: viewH / 2 };
}
export {};
