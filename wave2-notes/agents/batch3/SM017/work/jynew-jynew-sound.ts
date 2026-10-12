// Licence: restricted (donor LICENSE is a custom notice; file header says MIT for code). Clean-room sketch from the described mechanism.
export type Cancel = () => void;

// Zone music pair as the donor reads it: OutMusic (leave track), InMusic (entry track),
// ForceSetLeaveMusicId (overrides OutMusic when >= 0). -1 means "no track".
export interface ZoneMusic {
  inTrack: number;
  outTrack: number;
  forceLeaveTrack: number | null;
}

export class MusicDirector {
  private current: number | null = null;
  private loadToken = 0;

  constructor(
    private load: (id: number) => Promise<string | null>,
    private play: (clip: string) => void,
  ) {}

  // Zone transition: the leave track of the zone being left wins; otherwise the entry track of the new zone.
  enterZone(prev: ZoneMusic | null, next: ZoneMusic): void {
    let leave = -1;
    if (prev !== null) {
      leave = prev.forceLeaveTrack !== null && prev.forceLeaveTrack !== -1 ? prev.forceLeaveTrack : prev.outTrack;
    }
    this.setTrack(leave !== -1 ? leave : next.inTrack);
  }

  // Battle: remember the current track, play the battle track, and return the saved track for endBattle.
  beginBattle(battleTrack: number): number | null {
    const saved = this.current;
    this.setTrack(battleTrack);
    return saved;
  }

  endBattle(saved: number | null): void {
    if (saved !== null) this.setTrack(saved);
  }

  setTrack(id: number): void {
    if (id === -1 || id === this.current) return; // -1 is a no-op; the same track is not restarted
    this.current = id;
    // Fix: a slow load must not overwrite a newer request (donor PlayMusicAtPath has no such check).
    const token = ++this.loadToken;
    void this.load(id).then((clip) => {
      if (clip !== null && token === this.loadToken) this.play(clip);
    });
  }
}

// Two optional sound slots per skill, each with its own delay (donor: audio/audioDelay, audio2/audioDelay2).
export interface CueSlot {
  clip: string | null;
  delayS: number;
}

export function scheduleCueSlots(
  slots: CueSlot[],
  play: (clip: string) => void,
  after: (seconds: number, fn: () => void) => Cancel,
): Cancel[] {
  const cancels: Cancel[] = [];
  for (const s of slots) {
    if (s.clip === null) continue;
    const clip = s.clip;
    if (s.delayS === 0) {
      play(clip);
      continue;
    }
    cancels.push(after(s.delayS, () => play(clip)));
  }
  return cancels; // caller runs these when the caster is destroyed (donor: observable.AddTo)
}

export {};
