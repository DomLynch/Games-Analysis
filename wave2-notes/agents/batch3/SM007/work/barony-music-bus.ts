// Licence: BSD-2-Clause donor (TurningWheel-Barony). Clean-room re-expression of the shape, not a translation.
export type MusicState = 'level' | 'shop' | 'combat' | 'sanctum' | 'minotaur' | 'herx' | 'devil';

export interface MusicFlags {
  devil: boolean;
  herx: boolean;
  minotaur: boolean;
  sanctum: boolean;
  combat: boolean;
  shop: boolean;
}

// Priority ladder: the first true flag wins, as in the donor's if/else chain.
export function topState(f: MusicFlags): MusicState {
  if (f.devil) return 'devil';
  if (f.herx) return 'herx';
  if (f.minotaur) return 'minotaur';
  if (f.sanctum) return 'sanctum';
  if (f.combat) return 'combat';
  if (f.shop) return 'shop';
  return 'level';
}

// Per-state fade multipliers (donor values): bosses fade faster; combat and shop rise fast and fall at the base rate.
const TUNING: Record<MusicState, { inMul: number; outMul: number }> = {
  level: { inMul: 1, outMul: 1 },
  shop: { inMul: 4, outMul: 1 },
  combat: { inMul: 4, outMul: 1 },
  sanctum: { inMul: 2, outMul: 2 },
  minotaur: { inMul: 5, outMul: 5 },
  herx: { inMul: 2, outMul: 2 },
  devil: { inMul: 2, outMul: 2 },
};

// Base rates per second. Donor per-step values (0.002 in, 0.005 out, 0.005 duck) x2 or x5 x ~50 steps per second.
const BASE_IN_PER_S = 0.2;
const BASE_OUT_PER_S = 0.5;
const DUCK_PER_S = 1.25;
const FLOOR_NOTIFICATION = 0.5; // donor default for the notification duck floor
const FLOOR_ENSEMBLE = 0.0;     // donor default for the ensemble duck floor

interface Channel {
  track: string;
  volume: number;
}

export class MusicBus {
  private live: Channel | null = null;   // the track that is (or is becoming) the music
  private fading: Channel[] = [];        // tracks on their way to silence; each keeps its own volume
  private inRate = BASE_IN_PER_S;
  private outRate = BASE_OUT_PER_S;

  // Called when the chosen state or its track may have changed. The track is chosen by the caller.
  request(state: MusicState, track: string): void {
    const t = TUNING[state];
    this.inRate = BASE_IN_PER_S * t.inMul;
    this.outRate = BASE_OUT_PER_S * t.outMul;
    if (this.live && this.live.track === track) return;

    // Reversal: the wanted track is still fading out. Bring it back at its current volume (no reset to 0).
    const back = this.fading.findIndex((c) => c.track === track);
    if (back >= 0) {
      const [c] = this.fading.splice(back, 1);
      if (this.live) this.fading.push(this.live);
      this.live = c;
      return;
    }

    // New track: the old live track keeps its volume and fades out. Tracks already fading keep fading too.
    if (this.live) this.fading.push(this.live);
    this.live = { track, volume: 0 };
  }

  // Call every frame with the real frame time in seconds.
  // duck: notification or ensemble playback pulls the live track down to its floor.
  step(dt: number, duck: { notification: boolean; ensemble: boolean }): void {
    if (this.live) {
      const target = duck.ensemble ? FLOOR_ENSEMBLE : duck.notification ? FLOOR_NOTIFICATION : 1;
      if (this.live.volume > target) {
        this.live.volume = Math.max(target, this.live.volume - DUCK_PER_S * dt);
      } else {
        this.live.volume = Math.min(target, this.live.volume + this.inRate * dt);
      }
    }
    for (const c of this.fading) c.volume = Math.max(0, c.volume - this.outRate * dt);
    this.fading = this.fading.filter((c) => c.volume > 0);
  }

  // Gains for the mixer: one entry per track still audible.
  gains(): { track: string; volume: number }[] {
    const out = this.fading.map((c) => ({ track: c.track, volume: c.volume }));
    if (this.live) out.push({ track: this.live.track, volume: this.live.volume });
    return out;
  }
}
