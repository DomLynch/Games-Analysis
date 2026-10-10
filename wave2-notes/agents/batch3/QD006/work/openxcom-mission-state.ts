// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Objective = 'site' | 'base' | 'infiltration' | 'score';

export interface Wave {
  ufoCount: number;     // UFOs in this wave
  spacingMin: number;   // the donor's spawnTimer, in minutes
}

export interface Mission {
  objective: Objective;
  waves: Wave[];
  points: number;       // activity paid to the zone when the objective pays
  nextWave: number;
  nextUfoCounter: number;
  countdownMin: number; // minutes until the next spawn, a multiple of 30
  liveUfos: number;
}

type Rng = (lo: number, hi: number) => number; // inclusive bounds assumed (not read)

// Spacing to the next UFO: half to one-and-a-half of the wave spacing, in 30-minute steps.
export function rollSpacing(spacingMin: number, rng: Rng): number {
  const halfHours = Math.floor(spacingMin / 30);
  return (Math.floor(halfHours / 2) + rng(0, halfHours)) * 30;
}

// One half-hour tick, in the donor's order: count down, spawn, advance the wave,
// loop or end, pay a built base, then reset the spacing.
export function tick(m: Mission, spawn: () => boolean, rng: Rng, payZone: (pts: number) => void): void {
  if (m.nextWave >= m.waves.length) return;
  if (m.countdownMin > 30) {
    m.countdownMin -= 30;
    return;
  }
  if (spawn()) m.liveUfos += 1; // a spawn may be a site with no UFO
  m.nextUfoCounter += 1;
  if (m.nextUfoCounter >= m.waves[m.nextWave].ufoCount) {
    m.nextUfoCounter = 0;
    m.nextWave += 1;
  }
  if (m.objective === 'infiltration' && m.nextWave === m.waves.length) m.nextWave = 0; // loops forever
  if (m.objective === 'base' && m.nextWave === m.waves.length && m.points > 0) payZone(m.points);
  if (m.nextWave !== m.waves.length) m.countdownMin = rollSpacing(m.waves[m.nextWave].spacingMin, rng);
}

// Over when no waves remain and no UFO is alive. Infiltration never ends.
export function isOver(m: Mission): boolean {
  return m.objective !== 'infiltration' && m.nextWave === m.waves.length && m.liveUfos === 0;
}

// A UFO that crashed or was destroyed delays the next wave by 24 to 224 hours, unless the last wave is out.
export function onUfoDown(m: Mission, rng: Rng): void {
  if (m.nextWave !== m.waves.length) m.countdownMin += 30 * (rng(0, 400) + 48);
}

// A landed UFO pays on lifting for every objective except base (base pays on completion) and infiltration.
export function onUfoLifted(m: Mission, payZone: (pts: number) => void): void {
  if (m.points > 0 && m.objective !== 'base' && m.objective !== 'infiltration') payZone(m.points);
}

export {};
