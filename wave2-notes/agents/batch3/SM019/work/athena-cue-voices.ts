// Licence: MIT (donor; permissive). Clean-room sketch written from the described mechanism; donor lines are not copied.
// clean-room
interface Voice {
  playing: boolean;
  gain: number;
  fadeFrom: number;    // gain when the fade started
  fadeLeftMs: number;  // time left in the fade; 0 = not fading
  fadeTotalMs: number;
}

// One voice per cue name: playing a name again restarts it, so a name never overlaps itself.
class CueVoices {
  private readonly voices = new Map<string, Voice>();

  private voice(name: string): Voice {
    let v = this.voices.get(name);
    if (v === undefined) {
      v = { playing: false, gain: 0, fadeFrom: 0, fadeLeftMs: 0, fadeTotalMs: 0 };
      this.voices.set(name, v);
    }
    return v;
  }

  // A rate of zero or less, or Infinity (instant mode), or zero volume is silent.
  play(name: string, rate: number, volume: number): void {
    if (!(rate > 0) || rate === Infinity || volume <= 0) return;
    const v = this.voice(name);
    v.playing = true;
    v.gain = volume;
    v.fadeLeftMs = 0; // a restart cancels any fade in progress
  }

  // Start only if not already playing, so a loop is not restarted on every step.
  playOrContinue(name: string, rate: number, volume: number): void {
    if (!this.voice(name).playing) this.play(name, rate, volume);
  }

  // Fade out over fadeMs; 0 stops at once.
  stop(name: string, fadeMs: number): void {
    const v = this.voice(name);
    if (!v.playing) return;
    if (fadeMs > 0) {
      v.fadeFrom = v.gain;
      v.fadeLeftMs = fadeMs;
      v.fadeTotalMs = fadeMs;
    } else {
      v.playing = false;
      v.gain = 0;
    }
  }

  // Called each frame with the elapsed milliseconds.
  tick(dtMs: number): void {
    for (const v of this.voices.values()) {
      if (v.fadeLeftMs <= 0) continue;
      v.fadeLeftMs = Math.max(0, v.fadeLeftMs - dtMs);
      v.gain = v.fadeFrom * (v.fadeLeftMs / v.fadeTotalMs);
      if (v.fadeLeftMs === 0) {
        v.playing = false;
        v.gain = 0;
      }
    }
  }

  gainOf(name: string): number {
    return this.voice(name).gain;
  }
}

// Timing for a unit reaching the end of its path. stepMs is one tile's move time.
// The loop fades out over a third of a step; the end tail fires after a quarter step
// (if the tail has the quarter delay) or at once; with no tail the loop stops at two thirds of a step.
function arrivalTiming(stepMs: number, tail: { quarterDelay: boolean } | null) {
  const third = stepMs / 3;
  const quarter = stepMs / 4;
  return {
    loopFadeMs: third,
    loopStopAtMs: tail ? (tail.quarterDelay ? quarter : 0) : third * 2,
  };
}

// Playback rate from two durations: normal 360 / 360 = 1; fast 360 / 90 = 4; instant 360 / 0 = Infinity (silent).
const rateFor = (globalDurationMs: number, localDurationMs: number) =>
  globalDurationMs / localDurationMs;

const cues = new CueVoices();
cues.playOrContinue('Movement/Tread', rateFor(360, 360), 1);
const timing = arrivalTiming(180, { quarterDelay: false });
cues.stop('Movement/Tread', timing.loopFadeMs);
cues.play('Movement/TreadEnd', rateFor(360, 360), 1);
cues.tick(30); // 30 ms into a 60 ms fade
const midFade = cues.gainOf('Movement/Tread'); // 0.5

export {};
