// Licence: MIT (donor LICENSE, Very Good Ventures 2021). Adapted shape, written from the mechanism.
type ActorPhase = 'releasing' | 'pulling' | 'autoPulling';

interface StripClip {
  frames: number;    // frames in the shared strip (10 for the donor's plunger pull)
  stepTime: number;  // seconds per frame (1 / 24 in the donor)
}

const isPulling = (p: ActorPhase): boolean => p === 'pulling' || p === 'autoPulling';

class PhaseClipPlayer {
  private phase: ActorPhase = 'releasing';
  private elapsed = 0;

  constructor(private readonly clip: StripClip) {}

  // Mirrors onNewState: the clip restarts only on a phase edge, so pulling -> autoPulling keeps running.
  setPhase(next: ActorPhase): void {
    const startedReleasing = next === 'releasing' && this.phase !== 'releasing';
    const startedPulling = isPulling(next) && !isPulling(this.phase);
    this.phase = next;
    if (startedReleasing || startedPulling) this.elapsed = 0;
  }

  // Frame index for this instant. Release plays the same strip backwards.
  frame(dt: number): number {
    this.elapsed += dt;
    const step = Math.min(this.clip.frames - 1, Math.floor(this.elapsed / this.clip.stepTime));
    return this.phase === 'releasing' ? this.clip.frames - 1 - step : step;
  }
}

// Idle replay for a one-shot clip: wait, play once, wait again.
class IdleReplay {
  private wait: number;
  private playing = false;
  private elapsed = 0;

  constructor(private readonly cooldown: number, private readonly clip: StripClip) {
    this.wait = cooldown;
  }

  // Returns true while the clip is playing.
  update(dt: number): boolean {
    if (!this.playing) {
      this.wait -= dt;
      if (this.wait > 0) return false;
      this.playing = true;
      this.elapsed = 0;
      return true;
    }
    this.elapsed += dt;
    if (this.elapsed < this.clip.frames * this.clip.stepTime) return true;
    this.playing = false; // onComplete: stop, then restart the cooldown
    this.wait = this.cooldown;
    return false;
  }
}

export {};
