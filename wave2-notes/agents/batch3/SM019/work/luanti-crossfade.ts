// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Ramp {
  step: number;   // gain per second; sign set from the direction of the ramp
  target: number; // gain the ramp stops at
}

class BedVoice {
  gain: number;
  dead = false;
  private ramp: Ramp | null = null;

  constructor(startGain: number) {
    this.gain = Math.max(0, startGain);
  }

  // Start or replace a ramp. The direction comes from the current gain, so a re-target mid-ramp reverses cleanly.
  fadeTo(gainPerSecond: number, targetGain: number): void {
    if (gainPerSecond === 0) return; // a zero rate is ignored
    const target = Math.max(0, Number.isNaN(targetGain) ? 0 : targetGain);
    const rate = Math.abs(gainPerSecond);
    this.ramp = { step: target - this.gain > 0 ? rate : -rate, target };
  }

  // Called once per step with the real elapsed seconds (variable step). Clamps at the target, so no overshoot.
  tick(dtime: number): void {
    if (this.dead || this.ramp === null) return;
    const r = this.ramp;
    let g = this.gain + r.step * dtime;
    g = r.step < 0 ? Math.max(g, r.target) : Math.min(g, r.target);
    if (g <= 0) {
      this.gain = 0;
      this.dead = true; // fading to zero ends the voice
      this.ramp = null;
      return;
    }
    this.gain = g;
    if (g === r.target) this.ramp = null;
  }
}

// Crossfade: the old bed falls to silence and the new bed rises to full, both over `seconds`.
function crossfade(oldBed: BedVoice, newBed: BedVoice, seconds: number): void {
  const rate = 1 / Math.max(seconds, 0.001);
  oldBed.fadeTo(rate, 0);
  newBed.fadeTo(rate, 1);
}

const oldBed = new BedVoice(1);
const newBed = new BedVoice(0);
crossfade(oldBed, newBed, 2);
oldBed.tick(0.5); // 0.5 s elapsed: old at 0.75
newBed.tick(0.5); // new at 0.25

export {};
