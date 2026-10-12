// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Distance LOD for one prop: thresholds come from the object's size and the quality tier, and the top level is never shown too close.
interface LodPlan {
  thresholdsSq: number[]; // squared camera distance at which each level stops being used (ascending; level 0 = best)
  minSwitchSq: number;    // squared floor: a level whose threshold is at or below this is skipped (unless it is the last level)
}

// Quality tiers 0..5: [distance multiplier, switch-floor factor]. Other values fall back to [1, 1] in the donor.
const QUALITY: [number, number][] = [
  [1.0, 0.75], [1.42, 0.55], [2.0, 0.4], [2.84, 0.3], [4.0, 0.23], [5.7, 0.18],
];

function autoLod(area: number, scale: number, quality: number, levels: number): LodPlan {
  const q = Math.min(Math.max(quality, 0), QUALITY.length - 1);
  const a = area * scale;

  // Two curves: a quadratic-ish one and a quartic-ish one, blended by how large the quartic term is.
  const p2 = 20 + 7 * Math.sqrt(a + 10);
  const p4 = 50 + 22 * Math.sqrt(Math.sqrt(a + 2));
  let ratio: number;
  if (p4 < 210) ratio = p4 / 220;
  else if (p4 < 230) ratio = (105 + p4 * 0.5) / 220;
  else ratio = 1;
  const base = ratio * p4 + (1 - ratio) * p2;

  const [distMul, floorMul] = QUALITY[q];
  const maxDraw = base * distMul;                 // distance units
  const minSwitch = (maxDraw * floorMul + 100) / 2; // distance units; floats, no truncation

  const maxSq = maxDraw * maxDraw;
  const thresholdsSq: number[] = [];
  for (let i = 0; i < levels; i++) {
    // level i ends at maxSq * (i+1) / (N * (N-i)); the last level ends at maxSq.
    thresholdsSq.push((maxSq * (i + 1)) / (levels * (levels - i)));
  }
  return { thresholdsSq, minSwitchSq: minSwitch * minSwitch };
}

// Returns the level to draw for this squared distance, or -1 when the prop is past its last threshold.
function pickLevel(distSq: number, plan: LodPlan): number {
  const n = plan.thresholdsSq.length;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    if (distSq < plan.thresholdsSq[i] && (isLast || plan.minSwitchSq < plan.thresholdsSq[i])) return i;
  }
  return -1;
}

const plan = autoLod(12.5, 1, 2, 3);
console.log(pickLevel(0.5, plan), pickLevel(plan.thresholdsSq[2] * 0.9, plan), pickLevel(plan.thresholdsSq[2] * 2, plan));
