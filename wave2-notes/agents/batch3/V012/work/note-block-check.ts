// Licence: restricted (donor is leaked proprietary source, no licence).
// clean-room: written from the described mechanism (banded hit chance, nested damage draw, armour fraction, interval decay). No donor code, constants or identifiers.
// Numbers below are placeholders chosen for this sketch, not the donor's.
export {};

type Rng = () => number; // uniform in [0, 1)

interface ChanceTuning {
  basePct: number;   // hit chance (percent) when attack equals defence
  minPct: number;    // floor
  maxPct: number;    // ceiling
  bandUnits: number; // attack-minus-defence points per gap unit
  bandPct: number;   // chance points per full band
}

// Gap is measured in units. Band k costs k units (1, 2, 3, ...), so reaching band k
// costs k(k+1)/2 units in total: each extra band is harder than the last.
// Partial progress into the next band is linear. The chance is then clamped.
function hitChancePct(gap: number, t: ChanceTuning): number {
  const sign = Math.sign(gap);
  const units = Math.abs(gap) / t.bandUnits;
  const maxBands = Math.ceil((t.basePct - t.minPct) / t.bandPct);

  let full = 0;
  while (full < maxBands - 1 && units > ((full + 1) * (full + 2)) / 2) {
    full += 1;
  }
  let pct = t.basePct + sign * full * t.bandPct;
  if (full < maxBands - 1) {
    const used = (full * (full + 1)) / 2;
    pct += sign * ((units - used) / (full + 1)) * t.bandPct;
  }
  return Math.min(t.maxPct, Math.max(t.minPct, pct));
}

// Hit roll. Sketch uses a plain [0,1) draw; the donor adds 1 to a [0,99) draw (see omissions).
function rollHit(gap: number, t: ChanceTuning, rng: Rng): boolean {
  return rng() * 100 < hitChancePct(gap, t);
}

// Damage is drawn only on a hit. shift = raw gap / damage scale, so 0 means centred.
// The midpoint of [lo, hi] moves with the shift. If it leaves the range, the range is shrunk
// on the far side by the overshoot so the midpoint sits on the edge. Then: a point between lo and mid, a point between mid
// and hi, and a final point between those two. That concentrates results near the midpoint.
function rollDamage(lo0: number, hi0: number, shift: number, rng: Rng): number {
  let lo = Math.min(lo0, hi0);
  let hi = Math.max(lo0, hi0);
  const dist = Math.min(2, Math.max(-1, 0.5 + shift));
  let mid = lo + (hi - lo) * dist;
  if (mid < lo) { hi += mid - lo; mid = lo; }
  if (mid > hi) { lo += mid - hi; mid = hi; }
  const a = lo + rng() * (mid - lo);
  const b = mid + rng() * (hi - mid);
  return a + rng() * (b - a);
}

// Armour soaks a fixed fraction of the hit. Stored as a 0..1 fraction here.
function armourSoak(damage: number, armourFraction: number): number {
  return damage * armourFraction;
}

// Attack interval: each speed point multiplies the interval by decay^points, and the
// result approaches a floor (a soft cap on attack speed) instead of reaching zero.
function attackInterval(baseInterval: number, speedPoints: number, decay: number, floor: number): number {
  return baseInterval * (floor + (1 - floor) * Math.pow(decay, speedPoints));
}

// Example tuning (our numbers): base 75, min 50, max 95, 10 gap units per band, 5 points per band.
const tune: ChanceTuning = { basePct: 75, minPct: 50, maxPct: 95, bandUnits: 10, bandPct: 5 };
void tune; void rollHit; void rollDamage; void armourSoak; void attackInterval;
