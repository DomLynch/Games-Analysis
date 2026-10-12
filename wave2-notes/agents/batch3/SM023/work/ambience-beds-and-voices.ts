// Licence: GPL-3.0-or-later (donor, xoreos). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

/** Zone sound data (designer fields). Volume uses the donor's 0..127 scale. */
export interface ZoneSound {
  dayBed: string | null;
  nightBed: string | null;
  battleTrack: string | null;
  stingers: string[];   // donor table allows 3 (Stinger1..3)
  bedVolume127: number; // 0..127
}

/** Donor curve: 0 -> 0, 127 -> 1.0, and the middle of the slider reads louder than linear. */
export function bedGain(volume127: number): number {
  const v = Math.min(127, Math.max(0, volume127));
  return 1.25 * (1 - Math.pow(5, -(v / 127)));
}

export interface MusicState { inCombat: boolean; night: boolean; }

/** Which bed should be playing now. Night falls back to day, as the donor does for an empty track. */
export function pickBed(z: ZoneSound, s: MusicState): string | null {
  if (s.inCombat && z.battleTrack) return z.battleTrack;
  if (s.night && z.nightBed) return z.nightBed;
  return z.dayBed;
}

/** Stinger played once when combat starts, before the battle track. Our selection rule. */
export function stingerFor(z: ZoneSound, encounterNo: number): string | null {
  if (z.stingers.length === 0) return null;
  return z.stingers[encounterNo % z.stingers.length];
}

/** Bed crossfade driven by delta time (ms), never by frame count. */
export class BedCrossfader {
  private inId: string | null = null;
  private outId: string | null = null;
  private inTarget = 0;
  private outStart = 0;
  private t = 1;   // ms into the current fade
  private dur = 1; // fade length in ms

  get bedId(): string | null { return this.inId; }
  get fadingOutId(): string | null { return this.outId; }

  /** Zone enter or day/night change: fade the audible bed out and the new bed in. */
  switchTo(id: string | null, gain: number, fadeMs: number): void {
    if (id === this.inId && gain === this.inTarget) return;
    this.outStart = this.inLevel();
    this.outId = this.inId;
    this.inId = id;
    this.inTarget = gain;
    this.t = 0;
    this.dur = Math.max(1, fadeMs);
  }

  tick(dtMs: number): void {
    this.t = Math.min(this.dur, this.t + Math.max(0, dtMs));
  }

  outLevel(): number { return this.outStart * (1 - this.t / this.dur); }
  inLevel(): number { return this.inTarget * (this.t / this.dur); }
}

/** Donor: pitch = 1 + ((r / 1000) / 5 - 0.1), which is 1 + 0.2 * (r - 0.5) for r in [0, 1]. */
export function pitchJitter(r: number): number {
  return 1 + 0.2 * (r - 0.5);
}

/** Donor: the channel gain is multiplied by the bus (type) gain. */
export function effectiveGain(busGain: number, clipGain: number): number {
  return busGain * clipGain;
}

interface Voice { id: number; cls: string; emitter: number; priority: number; }

/** One-shot voices: per-emitter single voice, per-class caps, and priority steal. Donor has none of these. */
export class VoicePool {
  private voices: Voice[] = [];
  private nextId = 1;

  constructor(private readonly total: number, private readonly caps: Record<string, number>) {}

  get count(): number { return this.voices.length; }

  /** Returns a voice id, or null when refused. emitter 0 means not tied to one object. */
  play(cls: string, emitter: number, priority: number): number | null {
    // Donor Object::playSound stops the previous voice on the same object first.
    if (emitter !== 0) this.voices = this.voices.filter(v => v.emitter !== emitter);

    const cap = this.caps[cls] as number | undefined;
    const sameClass = this.voices.filter(v => v.cls === cls);
    if (cap !== undefined && sameClass.length >= cap && !this.steal(sameClass, priority)) return null;

    if (this.voices.length >= this.total && !this.steal(this.voices, priority)) return null;

    const id = this.nextId++;
    this.voices.push({ id, cls, emitter, priority });
    return id;
  }

  release(id: number): void {
    this.voices = this.voices.filter(v => v.id !== id);
  }

  /** Drop the lowest-priority voice in the pool if it is weaker than the new one. */
  private steal(pool: Voice[], priority: number): boolean {
    if (pool.length === 0) return false;
    let weakest = pool[0];
    for (const v of pool) if (v.priority < weakest.priority) weakest = v;
    if (weakest.priority >= priority) return false;
    const victim = weakest.id;
    this.voices = this.voices.filter(v => v.id !== victim);
    return true;
  }
}

export {};
