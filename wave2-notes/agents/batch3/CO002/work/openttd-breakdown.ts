// Licence: GPL-2.0-only (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

// Table of 64 bands, indexed by condition >> 10 (condition 0..65535). Low condition = low band value = easier to trigger.
const BAND_THRESHOLD: readonly number[] = [
  3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 5, 5, 6, 6, 7, 7,
  8, 8, 9, 9, 10, 10, 11, 11,
  12, 13, 13, 13, 13, 14, 15, 16,
  17, 19, 21, 25, 28, 31, 34, 37,
  40, 44, 48, 52, 56, 60, 64, 68,
  72, 80, 90, 100, 110, 120, 130, 140,
  150, 170, 190, 210, 230, 250, 250, 250,
];

interface Fighter {
  condition: number;      // 0..65535 (donor reliability)
  decayPerDay: number;    // donor reliability_spd_dec
  maxCondition: number;   // engine maximum
  risk: number;           // 0..255 accumulator (donor breakdown_chance)
  runningLeft: number;    // donor breakdown_ctr: 0 = fit; >2 = running countdown; 2 = breaks now; 1 = sidelined
  sidelined: number;      // donor breakdown_delay: ticks out after the event
  ageYearsPastMax: number;
}

const RISK_CAP = 255;

// One economy day: decay, then (if not already in an event) roll for an event.
// roll is a server-side random 0..65535 and softer is the Reduced setting (zone data).
function dailyCheck(f: Fighter, roll: number, softer: boolean): 'none' | 'armed' {
  f.condition = Math.max(0, Math.min(f.maxCondition, f.condition - f.decayPerDay));
  if (f.runningLeft !== 0) return 'none';
  let risk = f.risk + 1;
  if ((roll & 0xffff) % 25 === 0) risk += 25; // 1-in-25 jump (modulus stand-in for Chance16I)
  f.risk = Math.min(RISK_CAP, risk);
  const band = Math.min(0xffff, softer ? f.condition + 0x6666 : f.condition) >> 10;
  if (BAND_THRESHOLD[band] <= f.risk) {
    f.runningLeft = 63 + ((roll >> 6) % 64); // donor: 63 to 126 running ticks before the event
    f.sidelined = 128 + ((roll >> 12) % 128); // donor: 128 to 255 ticks out
    f.risk = 0;
    return 'armed';
  }
  return 'none';
}

// One movement tick (donor HandleBreakdown, simplified). Returns 'broken' while the fighter is out.
// Simplified: the sideline counts every tick here; the donor counts it every second tick (every fourth for trains).
function tick(f: Fighter, loading: boolean): 'running' | 'broken' | 'fit' {
  if (f.runningLeft === 0) return 'running';
  if (f.runningLeft === 2) {
    f.runningLeft = 1;
    return 'broken';
  }
  if (f.runningLeft === 1) {
    f.sidelined--;
    if (f.sidelined <= 0) {
      f.runningLeft = 0;
      return 'fit';
    }
    return 'broken';
  }
  if (!loading) f.runningLeft--; // donor: the running countdown is frozen while loading
  return 'running';
}

// Depot service: full condition, accumulator cut by four (zeroed under softer).
function service(f: Fighter, softer: boolean): void {
  f.condition = f.maxCondition;
  f.risk = softer ? 0 : Math.floor(f.risk / 4);
}

// Age: decay doubles at each of five year starts after max age (isYearStart passed in by the caller).
function ageOneDay(f: Fighter, isYearStart: boolean): void {
  if (isYearStart && f.ageYearsPastMax >= 0 && f.ageYearsPastMax <= 4) {
    f.decayPerDay = Math.min(0xffff, f.decayPerDay * 2); // sketch caps instead of wrapping in 16 bits
  }
}

export {};
