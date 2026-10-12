// Licence: MIT (donor, Daggerfall Unity). Shape adapted; code written fresh for this sketch.
export type Preset = 'none' | 'rain' | 'storm' | 'sunny' | 'night';

export interface PresetSpec {
  loop: string | null;     // looped bed id, or null
  oneShots: string[];      // one-shot ids, picked at random
  minWait: number;         // seconds, integer; donor MinWaitTime = 4
  maxWait: number;         // seconds, exclusive upper bound; donor MaxWaitTime = 35
  fadeSeconds: number;     // fix: donor hard-cuts the loop; we ramp it
}

export const PRESETS: Record<Preset, PresetSpec> = {
  none:  { loop: null,           oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
  rain:  { loop: 'rain-loop',    oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
  storm: { loop: 'rain-loop',    oneShots: ['thunder-far', 'thunder-roll'], minWait: 4, maxWait: 35, fadeSeconds: 2 },
  sunny: { loop: null,           oneShots: ['bird-a', 'bird-b'],           minWait: 4, maxWait: 35, fadeSeconds: 2 },
  night: { loop: 'crickets-loop', oneShots: [],                              minWait: 4, maxWait: 35, fadeSeconds: 2 },
};

// Priority: rain or storm beat day/night (donor WeatherManager.SetAmbientEffects order).
export function pickPreset(raining: boolean, storming: boolean, isDay: boolean): Preset {
  if (raining) return storming ? 'storm' : 'rain';
  return isDay ? 'sunny' : 'night';
}

export interface Bed {
  preset: Preset;
  loopGain: number;   // 0..1, ramped toward loopTarget
  loopTarget: number;
  waitLeft: number;   // seconds until the next one-shot
  busy: boolean;      // at most one ambient one-shot at a time
}

export interface Rng {
  int(min: number, maxExclusive: number): number;
  unit(): number; // 0 <= x < 1
}

export type Pt = { x: number; z: number };
export type Emit = (clipId: string, at: Pt) => void;

export function setPreset(b: Bed, p: Preset, rng: Rng): void {
  b.preset = p;
  b.loopTarget = PRESETS[p].loop !== null ? 1 : 0;
  b.waitLeft = rng.int(PRESETS[p].minWait, PRESETS[p].maxWait);
}

// Called every frame with real dt (variable step, like the donor's Time.deltaTime).
export function tick(b: Bed, dt: number, player: Pt, suppressed: boolean, rng: Rng, emit: Emit): void {
  const spec = PRESETS[b.preset];
  const step = dt / spec.fadeSeconds;
  b.loopGain = b.loopGain < b.loopTarget
    ? Math.min(b.loopTarget, b.loopGain + step)
    : Math.max(b.loopTarget, b.loopGain - step);

  b.waitLeft -= dt;
  if (b.waitLeft > 0) return;
  // Like the donor, the countdown restarts whether or not a sound plays. A blocked sound is skipped, not queued.
  b.waitLeft = rng.int(spec.minWait, spec.maxWait);
  if (suppressed || spec.oneShots.length === 0 || b.busy) return;

  const id = spec.oneShots[rng.int(0, spec.oneShots.length)];
  const radius = Math.sqrt(100 + rng.unit() * 300); // donor: sqrt(Random.Range(10^2, 20^2))
  const angle = rng.unit() * 2 * Math.PI;
  b.busy = true; // set now, not read back from the player (donor reads isPlaying, which lags a clip load)
  emit(id, { x: player.x + Math.cos(angle) * radius, z: player.z + Math.sin(angle) * radius });
}

// The caller must call this when the one-shot finishes or is dropped.
export function clipEnded(b: Bed): void {
  b.busy = false;
}

export {};
