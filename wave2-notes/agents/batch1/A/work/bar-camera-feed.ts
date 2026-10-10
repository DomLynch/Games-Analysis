// Licence: GNU LGPL v2.1 or later (donor file header). clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
const MIN_PERIOD = 0.1;    // seconds between sends with few players
const MAX_PERIOD = 0.35;   // seconds between sends with many players; spectators always use this
const SCALE_START = 8;     // active players at which the rate starts to slow
const SCALE_END = 32;      // active players at which the rate is at its slowest

type View = Record<string, number>;

function periodFor(activePlayers: number, isSpectator: boolean): number {
  if (isSpectator) return MAX_PERIOD;
  if (activePlayers <= SCALE_START) return MIN_PERIOD;
  if (activePlayers >= SCALE_END) return MAX_PERIOD;
  const t = (activePlayers - SCALE_START) / (SCALE_END - SCALE_START);
  return MIN_PERIOD + (MAX_PERIOD - MIN_PERIOD) * t;
}

class CameraFeed {
  private acc = 0;
  private last: View = {};

  constructor(private keys: string[], private quantise: (n: number) => number) {}

  // Call once per frame. Returns the whole quantised view when a send is due and something changed.
  tick(dt: number, activePlayers: number, isSpectator: boolean, view: View): View | null {
    this.acc += dt;
    const period = periodFor(activePlayers, isSpectator);
    if (this.acc < period) return null;
    this.acc -= period; // keep the remainder, as the donor does
    let changed = false;
    for (const k of this.keys) {
      const q = this.quantise(view[k]);
      if (q !== this.last[k]) changed = true;
      this.last[k] = q;
    }
    return changed ? { ...this.last } : null; // the whole view goes, not only the field that changed
  }
}

export {};
