// Licence: GPL v2 (donor, FreeOrion source). Clean-room sketch written from the described mechanism, not a translation.
interface Pair {
  snapshot: number;       // value at the start of the exchange (donor: Initial, start of turn)
  live: number;           // current projected value (donor: Current)
  max: number | null;     // outline value (donor: the target or max meter), null = not shown
}

type Colour = 'gain' | 'loss';

// Scale: the largest value rounded up to a whole number of steps. At least one visible segment.
function scaleRange(pairs: Pair[], step: number): number {
  let largest = 0.1;
  for (const p of pairs) {
    largest = Math.max(largest, p.snapshot, p.live, p.max ?? 0);
  }
  return Math.ceil(largest / step) * step;
}

// Edges as fractions of the bar length. Clamped to the bar (the donor does not clamp).
function layers(p: Pair, range: number, barLen: number) {
  const x = (v: number): number => Math.min(barLen, Math.max(0, (v / range) * barLen));
  const snapX = x(p.snapshot);
  const liveX = x(p.live);
  const fill = { to: snapX };
  let delta: { from: number; to: number; colour: Colour } | null = null;
  if (liveX > snapX) delta = { from: snapX, to: liveX, colour: 'gain' };
  else if (liveX < snapX) delta = { from: liveX, to: snapX, colour: 'loss' };
  const outline = p.max === null ? null : { to: x(p.max) };
  return { fill, delta, outline };
}

// Tick lines: 5 per step, so one line every step/5 units (20 when the step is 100).
function ticks(range: number, step: number, barLen: number): number[] {
  const n = Math.round(range / step) * 5;
  const out: number[] = [];
  for (let i = 1; i <= n - 1; i++) out.push((i * barLen) / n);
  return out;
}

export {};
