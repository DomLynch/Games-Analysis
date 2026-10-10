// Licence of donor: MIT. Clean-room sketch written from the described mechanism, not a translation.
type Presence = "outdoor-location" | "outdoor-wild" | "dungeon-resting" | "building" | "dungeon-moving";

interface SpawnRule {
  oneIn: number;          // roll passes when the dice returns 0 out of oneIn
  minDistance: number;    // world units from the player
  lineOfSight: boolean;   // place outside the camera view when true
}

const WINDOW_PERIOD = 144; // game minutes between window openings
const WINDOW_LENGTH = 12;  // game minutes per window; each minute is one roll

// True for the first 12 minutes of every 144-minute period.
function inWindow(minute: number): boolean {
  return Math.floor(minute / WINDOW_LENGTH) % (WINDOW_PERIOD / WINDOW_LENGTH) === 0;
}

// Presence and time of day decide the rule; null means no roll applies at this minute.
function ruleFor(presence: Presence, minute: number, alertActive: boolean): SpawnRule | null {
  const timeOfDay = minute % 1440;
  const day = timeOfDay >= 360 && timeOfDay <= 1080;
  switch (presence) {
    case "outdoor-location":
      return day ? null : { oneIn: 24, minDistance: 10, lineOfSight: true };
    case "outdoor-wild":
      return day
        ? { oneIn: 36, minDistance: 10, lineOfSight: true }
        : { oneIn: 24, minDistance: 10, lineOfSight: true };
    case "dungeon-resting":
      return alertActive ? { oneIn: 36, minDistance: 8, lineOfSight: false } : null;
    default:
      return null;
  }
}

interface Tick {
  spawnMinute: number | null;
  rule: SpawnRule | null;
}

// One frame: the clock moved from `last` to `now`; every minute in (last, now] is a roll.
// The first pass ends the loop for this frame; the caller still moves its cursor to `now`.
function catchUp(
  last: number,
  now: number,
  presence: Presence,
  alertActive: boolean,
  rollOneIn: (n: number) => number,
): Tick {
  for (let m = last + 1; m <= now; m++) {
    if (!inWindow(m)) continue;
    const rule = ruleFor(presence, m, alertActive);
    if (rule === null) continue;
    if (rollOneIn(rule.oneIn) === 0) return { spawnMinute: m, rule };
  }
  return { spawnMinute: null, rule: null };
}
export {}
