// Licence: GPL-3.0-or-later (donor LICENSE, Audio.cpp header). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export interface Req {
  sound: string;
  x: number; // position relative to the listener, in game units
  y: number;
}

export interface Aggregated {
  sound: string;
  x: number; // the one source for this sound this frame
  y: number;
  z: number;
  distance: number; // distance from the listener to that source, in OpenAL units
}

// Donor: 500 game units count as 1 OpenAL unit, and a source at distance 0 has weight 1.
const UNITS_PER_OPENAL = 500;

// One call per frame. Requests for the same sound merge into one source at the weighted centroid.
export function aggregateFrame(reqs: readonly Req[]): Aggregated[] {
  const bySound = new Map<string, { sx: number; sy: number; w: number }>();
  for (const r of reqs) {
    const px = r.x / UNITS_PER_OPENAL;
    const py = r.y / UNITS_PER_OPENAL;
    const d = 1 / (1 + px * px + py * py); // nearer sources weigh more; far ones fade toward 0
    const acc = bySound.get(r.sound) ?? { sx: 0, sy: 0, w: 0 };
    acc.sx += d * px;
    acc.sy += d * py;
    acc.w += d;
    bySound.set(r.sound, acc);
  }
  const out: Aggregated[] = [];
  for (const [sound, acc] of bySound) {
    const ax = acc.sx / acc.w;
    const ay = acc.sy / acc.w;
    const scale = Math.sqrt(1 / (acc.w * (ax * ax + ay * ay + 1)));
    out.push({
      sound,
      x: ax * scale,
      y: ay * scale,
      z: -scale,
      distance: Math.sqrt(1 / acc.w), // equals |(x, y, z)|
    });
  }
  return out;
}

export const MAX_FADE = 65536; // donor: Fade::MAX_FADE

// Crossfade one chunk. The outgoing audio starts at full weight (fade = MAX_FADE) and the counter
// drops by fadePerSample for every output sample until it reaches 0 (incoming only).
// Returns the new counter so the caller can keep it between chunks.
export function crossfadeChunk(
  outgoing: Float32Array,
  incoming: Float32Array,
  fade: number,
  fadePerSample: number,
): number {
  let f = fade;
  for (let i = 0; i < incoming.length && f > 0; i++) {
    incoming[i] = (outgoing[i] * f + incoming[i] * (MAX_FADE - f)) / MAX_FADE;
    f = f > fadePerSample ? f - fadePerSample : 0;
  }
  return f;
}

// simplified: aggregateFrame keeps the donor's per-frame merge keyed by sound id, with the same
// distance weight and centroid. crossfadeChunk keeps the donor's counter (per sample, MAX_FADE
// steps) but uses float samples instead of int16 and needs no unsigned arithmetic.
// VoiceCap is the only addition: a per-sound limit with oldest-stop, which the donor does not
// have (defect D1). It omits the OpenAL distance model (AudioPlayer, not read), the looping
// bed players and their fast fade, the music chain of suppliers, the deferred queue for other
// threads, and the fast-forward variants.
export class VoiceCap {
  private live = new Map<string, number[]>();

  constructor(private readonly cap: number) {}

  start(sound: string, id: number, stop: (id: number) => void): void {
    const ids = this.live.get(sound) ?? [];
    ids.push(id);
    while (ids.length > this.cap) {
      const oldest = ids.shift();
      if (oldest !== undefined) stop(oldest);
    }
    this.live.set(sound, ids);
  }

  finished(sound: string, id: number): void {
    const ids = this.live.get(sound);
    if (ids !== undefined) this.live.set(sound, ids.filter((x) => x !== id));
  }
}

export {};
