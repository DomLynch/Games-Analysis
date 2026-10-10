// Licence: MIT (donor, Daggerfall Unity; RandomEncounters.cs header and LICENSE). Shape adapted; numbers become zone data.

export type ZoneKind = 'night-location' | 'wilderness-day' | 'wilderness-night' | 'dungeon-rest';

export interface ZoneOdds {
  oneIn: number;          // 1-in-N chance per in-game minute while the window is open
  minDistance: number;    // spawn ring inside maxDistance (world units)
  maxDistance: number;
  losCheck: boolean;      // spawn outside the view cone (false in the donor's dungeon rest case)
}

// Donor values (PlayerEntity.cs 550-552, FormulaHelper.cs 1771/1784/1797/1810, FoeSpawner.cs 37).
export const DONOR_ODDS: Record<ZoneKind, ZoneOdds> = {
  'night-location':  { oneIn: 24, minDistance: 10, maxDistance: 20, losCheck: true },
  'wilderness-day':  { oneIn: 36, minDistance: 10, maxDistance: 20, losCheck: true },
  'wilderness-night':{ oneIn: 24, minDistance: 10, maxDistance: 20, losCheck: true },
  'dungeon-rest':    { oneIn: 36, minDistance: 8,  maxDistance: 20, losCheck: false },
};

// Window: 12 minutes out of every 144 (donor: (minute / 12) % 12 === 0).
export function inWindow(minute: number): boolean {
  return Math.floor(minute / 12) % 12 === 0;
}

// Night band: before 06:00 or after 18:00 on the 1440-minute clock.
export function isNightClock(minute: number): boolean {
  const t = minute % 1440;
  return t < 360 || t > 1080;
}

// Catch-up over elapsed minutes (fromMinute, toMinute]. The first success ends the batch;
// the caller sets its clock to toMinute, so the remaining minutes of the batch are dropped.
export function catchUpRoll(
  fromMinute: number,
  toMinute: number,
  zoneFor: (minute: number) => ZoneKind | null,
  rollBelow: (n: number) => number,        // integer in [0, n)
): { minute: number; zone: ZoneKind } | null {
  for (let m = fromMinute + 1; m <= toMinute; m++) {
    if (!inWindow(m)) continue;
    const zone = zoneFor(m);
    if (zone === null) continue;
    if (rollBelow(DONOR_ODDS[zone].oneIn) === 0) return { minute: m, zone };
  }
  return null;
}

// Level-band pick over a 20-entry table (donor: RandomEncounters.ChooseRandomEnemy, d100 roll).
export function pickIndex(
  playerLevel: number,
  listLength: number,
  roll100: number,
  randInt: (lo: number, hi: number) => number,  // inclusive bounds
): number {
  let min: number;
  let max: number;
  if (roll100 > 80) {
    if (roll100 > 95) {
      min = 0;
      max = playerLevel <= 5 ? playerLevel + 2 : 19;
    } else {
      min = 0;
      max = playerLevel + 1;
    }
  } else {
    min = playerLevel - 3;
    max = playerLevel + 3;
  }
  if (min < 0) { min = 0; max = 5; }
  if (max > 19) { min = 14; max = 19; }
  if (max + 1 > listLength) {
    max = listLength - 1;
    // donor uses an exclusive upper bound here (Random.Range(0, max)); mirrored as randInt(0, max - 1)
    min = max >= 5 ? max - 5 : randInt(0, max - 1);
  }
  return randInt(min, max);
}
export {};
