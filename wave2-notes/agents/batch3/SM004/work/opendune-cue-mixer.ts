// Licence: GPL-2.0 (donor COPYING, version 2). Clean-room sketch of the mechanism, written from the described steps, not a translation of the donor.

// Cue id: one id is a speech clip if the cue has one, otherwise a sound effect with the same id.
export interface Cue {
  id: number;
  hasClip: boolean;
  prio: number;        // speech priority, used only when hasClip
  essential: boolean;  // still audible when sound is switched off (for example UI clicks)
}

export type Route = 'voice' | 'sfx' | 'dropped';

// Gain falls linearly from 1 at the listener to 0 at clampAt tiles. Fixes the donor's clamp-64 / divide-80 mismatch.
export function positionalGain(distanceTiles: number, clampAt = 80): number {
  const d = Math.min(Math.max(distanceTiles, 0), clampAt);
  return 1 - d / clampAt;
}

export class CueMixer {
  private voicePrio = -1;               // priority of the speech channel now playing, -1 when idle
  private readonly sfxSlots: (number | null)[] = [null, null, null, null];
  private sfxNext = 0;

  constructor(
    private readonly voiceBusy: () => boolean,   // true while a speech clip is playing
    private readonly soundOn: boolean,
  ) {}

  play(cue: Cue, distanceTiles: number): { route: Route; gain: number } {
    if (!this.soundOn && !cue.essential) return { route: 'dropped', gain: 0 };
    if (!this.voiceBusy()) this.voicePrio = -1;    // the channel frees when the clip ends
    if (cue.hasClip && cue.prio >= this.voicePrio) {
      this.voicePrio = cue.prio;
      return { route: 'voice', gain: positionalGain(distanceTiles) };  // speech also takes distance (the donor does not)
    }
    // Demoted to a sound effect: four slots, the oldest slot is overwritten whether or not it is still playing.
    this.sfxSlots[this.sfxNext] = cue.id;
    this.sfxNext = (this.sfxNext + 1) % 4;
    return { route: 'sfx', gain: positionalGain(distanceTiles) };
  }
}

export type Battle = 0 | 1 | -1;  // 0 idle, 1 stinger requested, -1 stinger track is playing

// Bed director: one stinger on the first alert of a fight, then calm beds with a rest gap. Speech gates new decisions.
export class BedDirector {
  battle: Battle = 0;
  private nextAt = 0;
  private last = -1;

  constructor(
    private readonly restTicks: number,
    private readonly bedRange: readonly [number, number],
    private readonly stingerRange: readonly [number, number],
    private readonly rng: (lo: number, hi: number) => number,  // inclusive range
  ) {}

  // Called on a unit alert. Only an idle director starts a stinger.
  requestStinger(): void {
    if (this.battle === 0) this.battle = 1;
  }

  // One frame. Returns the track to start, or null. The caller must restart a track even when the id repeats.
  tick(speechBusy: boolean, musicPlaying: boolean, now: number): number | null {
    if (speechBusy) return null;                          // speech holds back new music, it does not change the track
    if (this.battle === 1) {
      this.battle = -1;
      this.nextAt = now + this.restTicks;
      return this.pick(this.stingerRange);
    }
    if (this.battle === -1 && musicPlaying) return null;  // keep the battle state while its track plays
    this.battle = 0;
    if (!musicPlaying && now > this.nextAt) {
      this.nextAt = now + this.restTicks;
      return this.pick(this.bedRange);
    }
    return null;
  }

  private pick(range: readonly [number, number]): number {
    let t = this.rng(range[0], range[1]);
    // Avoid the track that just ended: bounded re-roll (at most 8 extra draws).
    for (let k = 0; k < 8 && t === this.last && range[1] > range[0]; k++) t = this.rng(range[0], range[1]);
    this.last = t;
    return t;
  }
}
