// Licence: GPL-3.0 (donor, openmw). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class HitFlash {
  private alpha = 0;        // overlay opacity, 0 = clear, 1 = full flash
  private fadeLeft = 0;     // seconds left in the fade; 0 = idle
  private readonly fadeTime: number;

  constructor(fadeTime = 0.5) {
    this.fadeTime = fadeTime;
  }

  // interrupt = true: a landed hit restarts the flash at once.
  // interrupt = false: a damage-over-time tick does nothing while a flash is still running.
  trigger(interrupt: boolean): void {
    if (!interrupt && this.fadeLeft > 0) return;
    this.alpha = 1;                 // instant peak, no fade-in
    this.fadeLeft = this.fadeTime;  // then a linear fade to clear
  }

  // dt = seconds since the last frame; called once per rendered frame.
  update(dt: number): number {
    if (this.fadeLeft > 0) {
      this.fadeLeft = Math.max(0, this.fadeLeft - dt);
      this.alpha = this.fadeTime > 0 ? this.fadeLeft / this.fadeTime : 0;
    }
    return this.alpha;
  }
}

// Example: a landed hit, then 0.2 s later a second hit that restarts the flash.
const f = new HitFlash(0.5);
f.trigger(true);
f.update(0.2);
f.trigger(true);
export const alphaAfterRestart = f.update(0.1);
