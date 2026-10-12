// Licence: GPL-3.0 with Electronic Arts additional terms under GPL section 7 (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
export const NONE = -1; // no track
export const PICK_ANOTHER = -2; // choose the next track when the current one ends

export interface TrackInfo {
  name: string;
  repeat: boolean; // loop this track instead of moving on
}

export interface AudioBackend {
  isPlaying(): boolean; // donor: Sample_Status (a stub in this donor)
  start(name: string): void; // donor: File_Stream_Sample_Vol
  fadeOut(ms: number): void; // donor: Fade_Sample (a stub in this donor)
  stop(): void; // donor: Stop_Sample
}

export interface DirectorOptions {
  rng: () => number; // donor: Sim_Random_Pick (the simulation's own RNG), returns [0, 1)
  allowed: (track: number) => boolean; // donor: Is_Allowed (flags, scenario, mode)
  shuffle: boolean; // donor: Options.IsScoreShuffle
  repeatAll: boolean; // donor: Options.IsScoreRepeat
  fadeMs: number; // donor: THEME_DELAY = TIMER_SECOND = 60 ticks
}

export class MusicDirector {
  private current: number = NONE;
  private pending: number = NONE;
  private fading = false;

  constructor(
    private readonly tracks: TrackInfo[],
    private readonly audio: AudioBackend,
    private readonly opts: DirectorOptions,
  ) {}

  // simplified: this follows the donor's pending-slot order, with three intended differences.
  // (1) the newest request replaces the pending one even while a fade is running (donor: the
  // request is dropped unless Pending is NONE or PICK_ANOTHER, THEME.CPP 282);
  // (2) an empty or single-track pick returns NONE instead of looping forever (donor: the
  // do-while loops at THEME.CPP 243 and 256);
  // (3) update() is a per-tick poll with the audio backend passed in, not the donor's Sample_Status poll.
  // It omits the scenario and mode checks inside Is_Allowed (passed in as allowed()), the DEMO
  // build, the .VAR variation files, and the file lookup.
  request(track: number): void {
    this.pending = track;
    if (this.current !== NONE && !this.fading) {
      this.audio.fadeOut(this.opts.fadeMs);
      this.fading = true;
    }
  }

  // Call once per tick. A pending track starts only when the old one has stopped.
  update(): void {
    if (this.pending === NONE) return;
    if (this.current !== NONE && this.audio.isPlaying()) return;
    let next = this.pending;
    if (next === PICK_ANOTHER) next = this.pickFrom(this.current);
    if (next === NONE) {
      this.pending = NONE;
      this.current = NONE;
      this.fading = false;
      return;
    }
    this.audio.start(this.tracks[next].name);
    this.current = next;
    this.pending = PICK_ANOTHER; // when this one ends, pick the next
    this.fading = false;
  }

  stop(): void {
    this.audio.stop();
    this.current = NONE;
    this.pending = NONE;
    this.fading = false;
  }

  private pickFrom(current: number): number {
    const n = this.tracks.length;
    if (current !== NONE && (this.tracks[current].repeat || this.opts.repeatAll)) {
      return this.opts.allowed(current) ? current : NONE;
    }
    if (this.opts.shuffle) {
      const ok: number[] = [];
      for (let i = 0; i < n; i++) {
        if (this.opts.allowed(i)) ok.push(i);
      }
      if (ok.length === 0) return NONE; // donor would loop forever here
      const others = ok.filter((i) => i !== current);
      const pool = others.length > 0 ? others : ok; // never the same track twice if another exists
      return pool[Math.floor(this.opts.rng() * pool.length)];
    }
    const start = current < 0 ? -1 : current;
    for (let step = 1; step <= n; step++) {
      const cand = (start + step) % n;
      if (this.opts.allowed(cand)) return cand;
    }
    return NONE; // nothing allowed
  }
}

export {};
