// Licence: GPL-3.0 (dhewm3, COPYING.txt). Clean-room: shape only, written from the described mechanism.
// dB-linear fade that retargets from its current value, and the donor's layer composition.

export class DbFade {
  private startT = 0;
  private endT = 0;
  private spanS = 0;
  private startDb: number;
  private endDb: number;

  constructor(initialDb = 0) {
    this.startDb = initialDb;
    this.endDb = initialDb;
  }

  // Hold the end value after the fade, the start value before it, and interpolate in dB between.
  valueDbAt(t: number): number {
    if (t >= this.endT) return this.endDb;
    if (t > this.startT) {
      return this.startDb + ((this.endDb - this.startDb) * (t - this.startT)) / this.spanS;
    }
    return this.startDb;
  }

  // Same target and same length as the running fade: do nothing. Otherwise start from the current value, so it never jumps.
  // latencyS: the mixer reads the fade one block later (the donor adds one mix block).
  fadeTo(now: number, toDb: number, overS: number, latencyS: number): void {
    if (this.endDb === toDb && this.spanS === overS) return;
    const start = now + latencyS;
    this.startDb = this.valueDbAt(start);
    this.startT = start;
    this.spanS = overS;
    this.endT = start + overS;
    this.endDb = toDb;
  }
}

// Donor dB2Scale: at or below -60 dB is silence, otherwise 2^(dB/6). The donor quantises to 0.1 dB through a table; this is exact.
export function dbToGain(db: number): number {
  if (db <= -60) return 0;
  return Math.pow(2, db / 6);
}

export interface Layer {
  volume: number;
  channelFade: DbFade;
  classFade: DbFade;
}

// Donor: the layer volume times the channel fade times the class fade, both read at the same time.
export function gainAt(layer: Layer, t: number): number {
  return layer.volume * dbToGain(layer.channelFade.valueDbAt(t)) * dbToGain(layer.classFade.valueDbAt(t));
}

// Crossfade two beds: the outgoing one goes to silence (-60 dB), the incoming one to full (0 dB), both starting now.
export function crossfade(out: DbFade, incoming: DbFade, now: number, overS: number, latencyS: number): void {
  out.fadeTo(now, -60, overS, latencyS);
  incoming.fadeTo(now, 0, overS, latencyS);
}

// Duck a sound class (for example, the ambience class during a boss intro) and restore it later with a second call.
export function duck(cls: DbFade, toDb: number, downS: number, now: number, latencyS: number): void {
  cls.fadeTo(now, toDb, downS, latencyS);
}

export {};
