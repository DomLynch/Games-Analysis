// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Stage = "LikeNew" | "Slightly" | "Somewhat" | "Fairly" | "Greatly" | "IDOC" | "Collapsed";

// One decay period drives every stage. (Donor defect: its staged path ignores DecayPeriod.)
const PERIOD_S = 5 * 24 * 3600;

// Entry points as a fraction of the period: the donor's own legacy percent thresholds
// (0.5%, 25%, 50%, 75%, 95%, 100%).
const ENTRY: ReadonlyArray<readonly [Stage, number]> = [
  ["Slightly", 0.005],
  ["Somewhat", 0.25],
  ["Fairly", 0.5],
  ["Greatly", 0.75],
  ["IDOC", 0.95],
  ["Collapsed", 1.0],
];

// Frankendom default, not a donor value: +/-10% spread so plots do not all lapse together.
const JITTER = 0.1;

interface Plot {
  id: string;
  stage: Stage;
  next: number;        // index into ENTRY of the next entry point to apply
  entryAt: number[];   // absolute seconds for each ENTRY item, non-decreasing
}

// A refresh (owner pays or restores) restarts the clock at LikeNew.
function refresh(p: Plot, nowS: number, rand: () => number): void {
  p.stage = "LikeNew";
  p.next = 0;
  let floor = nowS;
  p.entryAt = ENTRY.map(([, frac]) => {
    const t = nowS + frac * PERIOD_S * (1 + JITTER * (2 * rand() - 1));
    floor = Math.max(floor, t); // never earlier than the entry before it
    return floor;
  });
}

// Runs once per minute over every plot, from the server tick (never from a read).
// Returns true when the plot must be removed this tick (donor: CheckDecay -> Decay_Sandbox).
function decayTick(p: Plot, nowS: number): boolean {
  while (p.next < ENTRY.length && nowS >= p.entryAt[p.next]) {
    p.stage = ENTRY[p.next][0];
    p.next++;
  }
  return p.stage === "Collapsed";
}

export {};
