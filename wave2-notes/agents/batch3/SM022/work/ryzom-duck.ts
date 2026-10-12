// Licence: AGPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
interface DuckConfig {
  duckTo: number;  // bed gain while a sting plays (donor: 0)
  rampMs: number;  // ms for a full 0..1 move (donor: 500)
}

interface MusicDuck {
  gain: number;            // bed gain factor, 0..1
  eventName: string | null;
  eventLoop: boolean;
}

// Start an event (sting) track. Same name and loop flag as the one playing: no restart.
function playEvent(m: MusicDuck, name: string, loop: boolean): boolean {
  if (m.eventName !== null && m.eventName.toLowerCase() === name.toLowerCase() && m.eventLoop === loop) {
    return false;
  }
  m.eventName = name;
  m.eventLoop = loop;
  return true;
}

// Once per frame with the wall-clock delta in ms. A finished one-shot releases the bed first.
function stepDuck(m: MusicDuck, cfg: DuckConfig, dtMs: number, eventEnded: boolean): number {
  if (m.eventName !== null && !m.eventLoop && eventEnded) {
    m.eventName = null;
  }
  const span = 1 - cfg.duckTo;
  const step = (dtMs / cfg.rampMs) * span;
  const next = m.eventName !== null ? m.gain - step : m.gain + step;
  m.gain = Math.min(1, Math.max(cfg.duckTo, next));
  return m.gain;
}

// Release a looping, state-bound sting (the donor's stopEventMusic on respawn). The bed then climbs back.
function stopEvent(m: MusicDuck): void {
  m.eventName = null;
  m.eventLoop = false;
}

// The duck multiplies the bed channel only. The event channel is not multiplied.
function bedGain(musicVolume: number, m: MusicDuck): number {
  return musicVolume * m.gain;
}

export {};
