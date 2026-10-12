// Licence: GPL-2.0 donor (STJr-SRB2). Clean-room sketch of the shape only, not a translation.
export interface SoundDef {
  id: string;
  priority: number;          // higher keeps its voice
  family?: string;           // sounds that may stop each other
  singleton?: boolean;       // a new copy anywhere stops the old copy
  noMultiple?: boolean;      // a copy already playing anywhere blocks this one
  noInterrupt?: boolean;     // a copy from the same origin blocks this one
  totallySingle?: boolean;   // same family, same origin: a new member stops the other member
  rangeMul?: number;         // 1 = normal; 2, 4 or 8 = heard from that many times farther
}

interface Voice {
  def: SoundDef;
  origin: string | null;
  startedAt: number;
}

export interface Grant {
  slot: number;
  stopped: Voice | null;     // the voice that was silenced to make room, if any
}

export class VoicePool {
  private voices: (Voice | null)[];

  constructor(size: number) {
    this.voices = new Array<Voice | null>(size).fill(null);
  }

  // Returns a voice slot, or null when the new sound must not play.
  // The caller checks audibility first, so an inaudible sound never takes a voice.
  request(def: SoundDef, origin: string | null, now: number): Grant | null {
    // 1. Rules against sounds already playing. Every voice is checked, not only the ones before the first free slot.
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      if (!v) continue;
      const same = v.def.id === def.id;
      const sameOrigin = origin !== null && v.origin === origin;
      if (same && def.noMultiple) return null;
      if (same && def.singleton) return this.grant(i, def, origin, now);
      if (same && sameOrigin) {
        if (def.noInterrupt) return null;
        return this.grant(i, def, origin, now);
      }
      if (
        sameOrigin && !same && def.totallySingle && v.def.totallySingle &&
        def.family !== undefined && def.family === v.def.family
      ) {
        return this.grant(i, def, origin, now);
      }
    }

    // 2. A free voice.
    const free = this.voices.indexOf(null);
    if (free >= 0) return this.grant(free, def, origin, now);

    // 3. Full: silence the lowest-priority voice (ties: the oldest), unless it outranks the new sound.
    if (this.voices.length === 0) return null;
    let victim = 0;
    for (let i = 1; i < this.voices.length; i++) {
      const a = this.voices[i] as Voice;
      const b = this.voices[victim] as Voice;
      if (a.def.priority < b.def.priority || (a.def.priority === b.def.priority && a.startedAt < b.startedAt)) {
        victim = i;
      }
    }
    const weakest = this.voices[victim] as Voice;
    if (weakest.def.priority > def.priority) return null;
    return this.grant(victim, def, origin, now);
  }

  private grant(i: number, def: SoundDef, origin: string | null, now: number): Grant {
    const stopped = this.voices[i];
    this.voices[i] = { def, origin, startedAt: now };
    return { slot: i, stopped };
  }

  // Once per frame: free voices whose sound has ended.
  reap(isPlaying: (slot: number) => boolean): void {
    for (let i = 0; i < this.voices.length; i++) {
      if (this.voices[i] && !isPlaying(i)) this.voices[i] = null;
    }
  }
}

// Linear distance gain: full at closeDist, zero at clipDist (map units). rangeMul divides the distance.
export function distanceGain(dist: number, rangeMul = 1, closeDist = 160, clipDist = 1536): number {
  const d = dist / rangeMul;
  if (d >= clipDist) return 0;
  if (d <= closeDist) return 1;
  return (clipDist - d) / (clipDist - closeDist);
}
