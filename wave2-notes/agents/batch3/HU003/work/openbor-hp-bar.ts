// Licence of donor: BSD-3-Clause-style text (engine/LICENSE). Sketch written from the described mechanism, not a line translation.
// Client view only: the ghost value is drawn, never written back to health.

interface HpBarData {
  max: number;            // HP max of the entity (per character, data)
  segment: number;        // HP per segment (donor: min(bar pixel width, max); fixed here as its own field)
  drainPerSec: number;    // ghost drain speed in HP per second (donor: 1 HP per logic tick)
  tiers: [string, string, string]; // first segment: low (<=25%), mid (<=50%), high (<=100%)
  empty: string;          // background behind the first segment
  overflow: string[];     // colours for segment 2, 3, 4 ... (last colour repeats)
}

interface HpBarState {
  shown: number;          // the lagging value drawn on the bar
}

interface SegmentView {
  colour: string;         // colour of the top segment
  behind: string;         // colour of the empty part behind the fill
  fill: number;           // 0..1 fill of the top segment
}

// Step the ghost toward the real health at a fixed rate. dtMs is the frame time in milliseconds.
function stepGhost(st: HpBarState, real: number, dtMs: number, d: HpBarData): void {
  const step = (d.drainPerSec * dtMs) / 1000;
  if (st.shown < real) {
    st.shown = Math.min(real, st.shown + step);
  } else if (st.shown > real) {
    st.shown = Math.max(real, st.shown - step);
  }
}

// Split a value into the top segment (k = 0 is the first segment) and its fill and colours.
// Segment k covers (k * segment, (k + 1) * segment]; the boundary is exact at every k.
function segmentFor(value: number, d: HpBarData): SegmentView {
  const v = Math.min(Math.max(value, 0), d.max);
  if (v <= 0) {
    return { colour: d.tiers[0], behind: d.empty, fill: 0 };
  }
  const k = Math.ceil(v / d.segment) - 1;
  const fill = (v - k * d.segment) / d.segment;
  if (k === 0) {
    const f = v / d.segment;
    const tier = f <= 0.25 ? 0 : f <= 0.5 ? 1 : 2;
    return { colour: d.tiers[tier], behind: d.empty, fill };
  }
  const last = d.overflow.length - 1;
  const colour = d.overflow[Math.min(k - 1, last)];
  const behind = k === 1 ? d.tiers[2] : d.overflow[Math.min(k - 2, last)];
  return { colour, behind, fill };
}

export {};
