// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// A clip advanced once per logic tick, an attack that fires on its active frame and can hold on a windup frame,
// and a hit gate that lets a small hit pass without a stagger. Time is in logic ticks (donor: max_fps, 60 by default).

class Clip {
  private sub = 0;               // index into subFrames (one entry per logic tick of the clip)
  private subF = 0;              // fractional position, advanced by speed each tick
  private timesPlayed = 0;
  private activeFired = false;   // play-once clips fall back to their last frame if the active frame was skipped
  private readonly subFrames: number[];

  constructor(
    frames: number,
    durationTicks: number,
    private readonly playOnce: boolean,
    private readonly activeFrames: number[],   // frames that can fire the power
    private readonly speed: number,            // sub-frames per tick (donor: attack speed % / 100)
  ) {
    this.subFrames = [];
    for (let t = 0; t < durationTicks; t++) {
      this.subFrames.push(Math.min(frames - 1, Math.floor((t * frames) / durationTicks)));
    }
  }

  frameNow(): number {
    return this.subFrames[this.sub];
  }

  isLastFrame(): boolean {
    return this.sub === this.subFrames.length - 1;
  }

  advance(): void {
    const last = this.subFrames.length - 1;
    if (this.sub < last) {
      this.subF += this.speed;
      this.sub = Math.min(last, Math.floor(this.subF));
    } else if (this.playOnce) {
      this.timesPlayed = 1;     // holds the last frame
    } else {
      this.sub = 0;             // looped: wrap
      this.subF = 0;
      this.timesPlayed++;
    }
  }

  // True once, at the end sub-frame of an active frame (donor default). A play-once clip that reaches
  // its last frame without having fired reports active there.
  isActiveFrame(): boolean {
    const frame = this.frameNow();
    if (this.activeFrames.includes(frame)) {
      let lastSub = this.sub;
      while (lastSub + 1 < this.subFrames.length && this.subFrames[lastSub + 1] === frame) lastSub++;
      if (this.sub === lastSub && this.subF === this.sub) {
        if (this.playOnce) this.activeFired = true;
        return true;
      }
      return false;
    }
    if (this.playOnce && this.isLastFrame() && !this.activeFired) return true;
    return false;
  }

  getTimesPlayed(): number {
    return this.timesPlayed;
  }
}

interface AttackRun {
  timerTicks: number;        // state timer; counts down one per logic tick
  holdFrame: number | null;  // hold the clip on this frame while the timer runs (windup), or null
  holding: boolean;
}

// One logic tick of an attack. Fires the power once on the active frame, unless held.
// Returns "done" on the last frame once the timer is spent.
function stepAttack(run: AttackRun, clip: Clip, fire: () => void): "running" | "done" {
  if (!run.holding) clip.advance();
  if (run.holdFrame !== null && !run.holding && clip.frameNow() === run.holdFrame && run.timerTicks > 0) {
    run.holding = true;
  }
  if (run.timerTicks <= 0) run.holding = false;
  if (clip.isActiveFrame() && !run.holding) fire();
  run.timerTicks -= 1;
  return clip.isLastFrame() && run.timerTicks <= 0 ? "done" : "running";
}

interface HitInput { dmg: number; crit: boolean; }

interface TargetState {
  maxHp: number;             // health maximum (donor: HP_MAX)
  poisePct: number;          // poise as a percent of max health (HP poise style)
  stunned: boolean;
  preventInterrupt: boolean; // set while a power that resists hits is active
  hitCooldownDone: boolean;  // donor: cooldown_hit has ended
}

// Whether a hit staggers into the hit clip. A hit whose damage is at most poisePct of max health
// does not stagger, unless it is critical. Stun and prevent-interrupt always block the stagger.
function hitStaggers(h: HitInput, s: TargetState): boolean {
  if (!s.hitCooldownDone || s.stunned || s.preventInterrupt) return false;
  const poiseOk = s.maxHp > 0 && (h.dmg / s.maxHp) * 100 <= s.poisePct;
  return !poiseOk || h.crit;
}
