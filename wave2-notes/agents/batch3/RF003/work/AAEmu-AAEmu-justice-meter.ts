// Licence: LGPL-3.0 per README (repo also ships LICENSE.GPL and LICENSE.MIT; per-file licence not read). Treated as copyleft.
// clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WANTED_AT = 50;      // donor CrimeManager.WantedCrimePointThreshold
const PIRATE_AT = 3000;    // donor CrimeManager.PirateCrimePointThreshold
const METER_MAX = 32767;   // donor meter is a short

interface Justice {
  meter: number;     // current crime points; cleared by any verdict
  infamy: number;    // lifetime total; reduced only by a not-guilty verdict
  wanted: boolean;   // derived from meter and infamy
  pirate: boolean;   // set when infamy reaches PIRATE_AT; cleared only by a not-guilty verdict with no infamy left
}

interface Evidence { kind: 'murder' | 'theft' | 'assault'; victimLevel: number | null }

function refresh(j: Justice): void {
  if (j.infamy >= PIRATE_AT) j.pirate = true;
  j.wanted = j.infamy >= PIRATE_AT || j.meter >= WANTED_AT;
}

// Fixed: the meter is clamped once. The donor's cast wraps large values to negative, then the setter zeroes them.
function addCrime(j: Justice, amount: number): void {
  j.meter = Math.max(0, Math.min(METER_MAX, j.meter + amount));
  j.infamy = Math.max(0, j.infamy + amount);
  refresh(j);
}

// Any verdict clears the meter. Not guilty also removes the same number of points from infamy.
function verdict(j: Justice, guilty: boolean): void {
  const counted = j.meter;
  j.meter = 0;
  if (!guilty) {
    j.infamy = Math.max(0, j.infamy - counted);
    if (j.infamy <= 0) j.pirate = false;
  }
  refresh(j);
}

// Jail minutes from evidence. Fixed: float infamy multiplier (donor integer division steps at each 1000).
function jailMinutes(evidence: Evidence[], infamy: number, pirate: boolean): number {
  let base = 0;
  for (const e of evidence) {
    let score = e.kind === 'murder' ? 20 : e.kind === 'theft' ? 8 : 0;
    if (e.victimLevel !== null && e.victimLevel < 30) score *= 10;
    base += score;
  }
  const minutes = base * (1 + infamy / 1000);
  return pirate ? 40 : minutes;
}

const SENTENCE_RATE: Record<number, number> = { 2: 0.2, 3: 0.5, 4: 0.8, 5: 1.0, 6: 1.2 };

// mostVoted: jury option index. 0 and 1 are not guilty; no votes defaults to 3.
function sentence(jailTime: number, mostVoted: number): { guilty: boolean; minutes: number } {
  const rate = SENTENCE_RATE[mostVoted];
  if (mostVoted <= 1 || rate === undefined) return { guilty: false, minutes: 0 };
  return { guilty: true, minutes: Math.round(jailTime * rate) };
}

export {};
