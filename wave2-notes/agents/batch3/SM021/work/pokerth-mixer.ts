// Licence: AGPL-3.0 (donor). Clean-room sketch from the described mechanism; shape only, no line-by-line translation.
// Voice mixer: equal-power gain for overlapping one-shot cues, with a gain ramp and a voice cap.

export interface Voice {
  samples: Float32Array;
  pos: number;
}

export const MAX_VOICES = 8; // fix: donor is uncapped (donor voices.append at qtaudioplayer.cpp:161); value is a proposal, not donor data

export class CueMixer {
  private voices: Voice[] = [];
  private gain = 1; // gain used by the previous buffer; the donor steps the gain per call, this ramps it

  // Donor drops a play request when there is no sink (qtaudioplayer.cpp:622). Here: refuse at the cap.
  play(samples: Float32Array): boolean {
    if (this.voices.length >= MAX_VOICES) return false;
    this.voices.push({ samples, pos: 0 });
    return true;
  }

  // Donor stopAll on background resume (qtaudioplayer.cpp:704) so stale cues are not replayed.
  stopAll(): void {
    this.voices = [];
  }

  // Fills out with mono samples in -1..1. Each voice is scaled by 1/sqrt(N) (equal power), ramped from the previous gain.
  read(out: Float32Array): void {
    out.fill(0);
    const target = this.voices.length > 1 ? 1 / Math.sqrt(this.voices.length) : 1;
    const start = this.gain;
    for (let i = 0; i < out.length; i++) {
      const g = start + (target - start) * ((i + 1) / out.length);
      let mixed = 0;
      for (const v of this.voices) {
        if (v.pos + i < v.samples.length) mixed += v.samples[v.pos + i] * g;
      }
      out[i] = Math.max(-1, Math.min(1, mixed)); // donor clamps with qBound to the 16-bit range
    }
    this.gain = target;
    for (const v of this.voices) v.pos += out.length;
    this.voices = this.voices.filter((v) => v.pos < v.samples.length); // donor removes finished voices after mixing
  }
}

export {};
