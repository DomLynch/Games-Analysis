// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Bed {
  id: string;
  gain: number;      // current linear gain, 0..1
  target: number;    // gain the bed is heading to
  rate: number;      // gain change per second
  fadeOutS: number;  // seconds to fade out
  alive: boolean;
  priority: number;  // higher wins a voice
}

export function startBed(id: string, volume: number, fadeInS: number, fadeOutS: number, priority: number): Bed {
  return { id, gain: 0, target: volume, rate: fadeInS > 0 ? volume / fadeInS : Infinity, fadeOutS, alive: true, priority };
}

export function stopBed(bed: Bed): void {
  bed.target = 0;
  bed.rate = bed.fadeOutS > 0 ? bed.gain / bed.fadeOutS : Infinity;
}

// One frame step with the real frame time dt (seconds, dt > 0).
export function stepBed(bed: Bed, dt: number): void {
  if (bed.gain < bed.target) bed.gain = Math.min(bed.target, bed.gain + bed.rate * dt);
  else if (bed.gain > bed.target) bed.gain = Math.max(bed.target, bed.gain - bed.rate * dt);
  if (bed.target === 0 && bed.gain === 0) bed.alive = false;
}

export interface VoiceTable { beds: Bed[]; maxVoices: number; }

// Admit a bed. When the cap is full, the lowest-priority audible bed is faded out,
// but only if it is strictly lower priority than the newcomer.
export function admit(t: VoiceTable, bed: Bed): boolean {
  const audible = t.beds.filter((b) => b.alive && b.target > 0);
  if (audible.length < t.maxVoices) { t.beds.push(bed); return true; }
  let worst = audible[0];
  for (const b of audible) if (b.priority < worst.priority) worst = b;
  if (worst.priority >= bed.priority) return false;
  stopBed(worst);
  t.beds.push(bed);
  return true;
}

export function stepAll(t: VoiceTable, dt: number): void {
  for (const b of t.beds) stepBed(b, dt);
  t.beds = t.beds.filter((b) => b.alive);
}

export interface EnvSpec { song: string; bed: string; event: string; eventDelayS: number; }
export interface Env { current?: EnvSpec; song?: Bed; bed?: Bed; eventTimer: number; }

// Zone change: the old bed fades out while the new one fades in (the overlap is the crossfade).
// The song is restarted only when the song id actually changes.
export function setEnvironment(env: Env, t: VoiceTable, next: EnvSpec, vols: { song: number; bed: number }, fadeInS: number, fadeOutS: number): void {
  if (env.current?.song !== next.song) {
    if (env.song) stopBed(env.song);
    env.song = startBed(next.song, vols.song, fadeInS, fadeOutS, 10);
    admit(t, env.song);
  }
  if (env.current?.bed !== next.bed) {
    if (env.bed) stopBed(env.bed);
    env.bed = startBed(next.bed, vols.bed, fadeInS, fadeOutS, 5);
    admit(t, env.bed);
  }
  env.current = next;
}

// Ambient one-shot every eventDelayS seconds with a random stereo pan in -1..1.
// The timer keeps its phase (adds the delay) instead of resetting to zero. Guard against 0 delay.
export function tickEvents(env: Env, dt: number, playEvent: (pan: number) => void): void {
  env.eventTimer -= dt;
  if (env.current && env.current.eventDelayS > 0 && env.eventTimer < 0) {
    env.eventTimer += env.current.eventDelayS;
    playEvent(Math.random() * 2 - 1);
  }
}

export {};
