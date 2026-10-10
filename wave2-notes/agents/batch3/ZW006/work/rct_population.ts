// Licence: GPL-3.0 (donor, OpenRCT2). Clean-room sketch written from the described mechanism, not a translation.
interface ZonePopulation {
  rating: number;             // zone score input; donor uses (rating - 200) clamped to 0..650
  present: number;            // guests inside the zone
  headingIn: number;          // guests on their way in
  suggestedMax: number;       // soft cap, recomputed on a slow cadence
  hardCeiling: number;        // above this the chance is cut again
  feeOverValue: boolean;      // entrance fee above the value of the attractions
  feeOverTwiceValue: boolean; // fee more than twice that value
  awardsPositive: number;
  awardsNegative: number;
  difficult: boolean;         // hard gate mode
}

// Chance of a spawn roll, on a 16-bit scale (0..65535). Same order as the donor: base, soft cap, hard ceiling, fee, awards.
function spawnThreshold(z: ZonePopulation): number {
  let p = 50 + Math.min(Math.max(z.rating - 200, 0), 650);
  const n = z.present + z.headingIn;
  if (n > z.suggestedMax) {
    p = Math.floor(p / 4);
    if (z.difficult) p = Math.floor(p / 4);
  }
  if (n > z.hardCeiling) p = Math.floor(p / 4);
  if (z.feeOverValue) {
    p = Math.floor(p / 4);
    if (z.feeOverTwiceValue) p = Math.floor(p / 4);
  }
  for (let i = 0; i < z.awardsPositive; i++) p += Math.floor(p / 4);
  for (let i = 0; i < z.awardsNegative; i++) p -= Math.floor(p / 4);
  return p;
}

// One roll per update against the stored threshold. In difficult mode no spawn while the zone is above suggestedMax + 150.
function tickRoll(
  z: ZonePopulation,
  threshold: number,
  rand16: () => number,         // returns 0..65535
  spawnAtRandomPoint: () => void,
): void {
  if (rand16() < threshold) {
    if (!z.difficult || z.suggestedMax + 150 >= z.present) spawnAtRandomPoint();
  }
}

export {};
