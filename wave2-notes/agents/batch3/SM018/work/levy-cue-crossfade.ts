// Licence: MIT (donor). clean-room sketch of the rules, written from the described mechanism.
// clean-room
const FADE_SECONDS = 2.2;
const STREAM_PAUSE_AFTER_S = 4;

// Time constants (seconds) per direction.
const ZONE_IN_TAU = FADE_SECONDS / 3; // zone returns slowly after a fight
const ZONE_OUT_TAU = 0.35; // zone is silenced fast when combat starts
const BATTLE_IN_TAU = 0.35; // battle cue rises fast
const BATTLE_OUT_TAU = FADE_SECONDS / 3; // battle cue falls slowly

export interface Cue {
  gain: number; // current linear gain 0..1 (simulated, not a WebAudio node)
  target: number; // 0 or 1
  tau: number; // time constant of the ramp in progress
  silentSince: number; // -1 while the cue has a target above 0
  paused: boolean;
}

export function newCue(): Cue {
  return { gain: 0, target: 0, tau: 1, silentSince: 0, paused: true };
}

// Exponential approach to target, the same shape as WebAudio setTargetAtTime.
export function stepGain(c: Cue, dt: number): void {
  c.gain = c.target + (c.gain - c.target) * Math.exp(-dt / c.tau);
}

// Sets a new target and time constant; no-op when the target is unchanged.
export function setTarget(c: Cue, target: number, tau: number, now: number): void {
  if (c.target === target) return;
  c.target = target;
  c.tau = tau;
  if (target > 0) {
    c.silentSince = -1;
    c.paused = false;
  } else {
    c.silentSince = now;
  }
}

export interface Mix {
  zone: string | null;
  combat: boolean;
  battleIdx: number;
  zoneCues: Map<string, Cue>;
  battleCues: Cue[];
}

export function newMix(zones: string[], battleCount: number): Mix {
  return {
    zone: null,
    combat: false,
    battleIdx: 0,
    zoneCues: new Map(zones.map((z) => [z, newCue()])),
    battleCues: Array.from({ length: battleCount }, () => newCue()),
  };
}

// Called on zone or combat change. In combat the zone is silent and one
// battle cue is up; the battle cue is picked once, at combat start.
export function update(m: Mix, zone: string, inCombat: boolean, rand: () => number, now: number): void {
  if (zone === m.zone && inCombat === m.combat) return;
  const combatStarting = inCombat && !m.combat;
  m.zone = zone;
  m.combat = inCombat;
  for (const [name, c] of m.zoneCues) {
    const target = name === zone && !inCombat ? 1 : 0;
    setTarget(c, target, target > 0 ? ZONE_IN_TAU : ZONE_OUT_TAU, now);
  }
  if (combatStarting && m.battleCues.length > 0) {
    const idx = Math.floor(rand() * m.battleCues.length);
    m.battleIdx = Math.min(m.battleCues.length - 1, Math.max(0, idx));
  }
  m.battleCues.forEach((c, idx) => {
    const target = inCombat && idx === m.battleIdx ? 1 : 0;
    setTarget(c, target, target > 0 ? BATTLE_IN_TAU : BATTLE_OUT_TAU, now);
  });
}

// The mix is audible only when enabled, not menu-paused, not boss-ducked and volume > 0.
export function mixAudible(enabled: boolean, menuPaused: boolean, bossActive: boolean, vol: number): boolean {
  return enabled && !menuPaused && vol > 0 && !bossActive;
}

// Runs on a timer. Revives cues that should play; pauses cues silent for longer than the limit.
export function keeper(cues: Cue[], audible: boolean, now: number): void {
  for (const c of cues) {
    if (audible && c.target > 0) {
      c.silentSince = -1;
      c.paused = false;
    } else if (c.silentSince < 0) {
      c.silentSince = now;
    } else if (!c.paused && now - c.silentSince > STREAM_PAUSE_AFTER_S) {
      c.paused = true;
    }
  }
}

export {};
