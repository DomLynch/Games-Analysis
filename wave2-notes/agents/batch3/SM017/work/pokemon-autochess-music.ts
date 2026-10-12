// Licence: copyleft (GPL-3.0, per donor LICENSE). Clean-room sketch from the described mechanism.
export interface Handle {
  key: string;
  onLoopEnd(fn: () => void): void; // one-shot per loop boundary (donor: once("looped"))
  stop(): void;
}

export interface Mixer {
  start(key: string, volume: number): Handle;
}

export class BedDirector {
  private handle: Handle | null = null;

  constructor(private mixer: Mixer) {}

  // Same key: no restart (donor: scene.music?.key === "music_" + name returns early).
  play(key: string, volume: number): void {
    if (this.handle !== null && this.handle.key === key) return;
    if (this.handle !== null) this.handle.stop(); // donor destroys the old music object first
    this.handle = this.mixer.start(key, volume);
  }

  // Encounter track plays one loop, then the region track returns (donor: once("looped") on the encounter handle).
  playEncounter(encounterKey: string, regionKey: string, volume: number): void {
    this.play(encounterKey, volume);
    const h = this.handle;
    if (h !== null) {
      h.onLoopEnd(() => {
        if (this.handle === h) this.play(regionKey, volume);
      });
    }
  }
}

export interface Sound {
  onEnded(fn: () => void): void;
}

// Stinger then bed: the bed starts 1000 ms after the stinger ends; bed volume is musicVolume / 300 (loop volume is / 100).
export function stingerThenBed(
  playSting: (key: string, volume: number) => Sound | null,
  startBed: (key: string, volume: number) => void,
  schedule: (ms: number, fn: () => void) => void,
  stingerKey: string,
  bedKey: string,
  musicVolume: number, // 0-100
): void {
  const sting = playSting(stingerKey, musicVolume / 100);
  const startIt = () => schedule(1000, () => startBed(bedKey, musicVolume / 300));
  // Fix: donor only attaches the bed to a stinger that loaded (jingle?.addEventListener); a missing stinger silenced the bed.
  if (sting !== null) sting.onEnded(startIt);
  else startIt();
}

export {};
