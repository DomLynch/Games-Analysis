// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Source {
  sound: string;   // which loop this source feeds
  x: number;
  y: number;
  volume: number;  // the source's own ambient volume
  falloff: number; // distance gain supplied by the caller (the donor uses the engine's falloff, not read)
  pitch: number;
}

export type Cmd = {
  sound: string;
  action: "start" | "set" | "stop";
  volume: number;
  pan: number;
  pitch: number;
};

interface Acc {
  volume: number;   // summed gain, clamped to one at frame end
  pitchSum: number;
  volSum: number;
  weight: number;   // falloff sum, for the centroid
  wx: number;
  wy: number;
}

interface Voice {
  cur: number;
  playing: boolean;
  pan: number;
  pitch: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class AmbientMix {
  private acc = new Map<string, Acc>();
  private voices = new Map<string, Voice>();
  private lx = 0;
  private ly = 0;

  constructor(
    private readonly ease = 0.11,       // per frame at 60 Hz
    private readonly startAt = 0.01,    // a loop starts above this
    private readonly stopAt = 0.001,    // and stops at or below this
    private readonly panScale = 20,     // sketch choice: distance that reaches full pan
  ) {}

  setListener(x: number, y: number): void {
    this.lx = x;
    this.ly = y;
  }

  // One contributing source this frame.
  add(s: Source): void {
    if (s.volume <= 0 || s.falloff <= 0) return;
    const gain = s.falloff * s.volume;
    let a = this.acc.get(s.sound);
    if (!a) {
      a = { volume: 0, pitchSum: 0, volSum: 0, weight: 0, wx: 0, wy: 0 };
      this.acc.set(s.sound, a);
    }
    a.volume += gain;
    a.pitchSum += s.pitch * gain;
    a.volSum += gain;
    a.weight += s.falloff;
    a.wx += s.x * s.falloff;
    a.wy += s.y * s.falloff;
  }

  // Once per frame. dtFrames is frame time in 60 Hz frames, so the ease is frame-rate independent.
  frame(dtFrames: number, paused: boolean): Cmd[] {
    // Fix: a pause drops this frame's sums instead of carrying them into the first frame after resume.
    if (paused) {
      this.acc.clear();
      return [];
    }
    const alpha = 1 - Math.pow(1 - this.ease, dtFrames);
    const out: Cmd[] = [];
    const names = new Set<string>([...this.acc.keys(), ...this.voices.keys()]);

    for (const name of names) {
      const a = this.acc.get(name);
      const v = this.voices.get(name) ?? { cur: 0, playing: false, pan: 0, pitch: 1 };
      const target = a ? Math.min(1, a.volume) : 0;
      v.cur += (target - v.cur) * alpha;
      if (a && a.weight > 0) v.pan = clamp((a.wx / a.weight - this.lx) / this.panScale, -1, 1);
      if (a && a.volSum > 0) v.pitch = a.pitchSum / a.volSum;
      this.voices.set(name, v);

      if (!v.playing && v.cur > this.startAt) {
        v.playing = true;
        out.push({ sound: name, action: "start", volume: v.cur, pan: v.pan, pitch: v.pitch });
      } else if (v.playing && v.cur <= this.stopAt) {
        v.playing = false;
        out.push({ sound: name, action: "stop", volume: 0, pan: v.pan, pitch: v.pitch });
      } else if (v.playing) {
        out.push({ sound: name, action: "set", volume: v.cur, pan: v.pan, pitch: v.pitch });
      }
    }
    this.acc.clear();
    return out;
  }
}

export {};
