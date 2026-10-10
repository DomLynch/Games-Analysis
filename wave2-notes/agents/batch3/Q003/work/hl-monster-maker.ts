// Licence: Valve HL1 SDK terms in the donor (monstermaker.cpp header: use restricted to non-commercial enhancements of Valve products). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface MakerState {
  budget: number;          // spawns left in total (zone data); 0 at start is not guarded in the donor
  liveMax: number;         // max children alive at once (zone data); 0 means no cap
  live: number;            // children alive, lowered by a death notice
  intervalS: number;       // seconds between attempts (zone data)
  nextAtS: number;         // time of the next attempt, in seconds
  disabled: boolean;
}

// One attempt, run when its timer is due. The timer is re-armed first,
// so a refused attempt waits a full interval before it tries again.
function attempt(m: MakerState, nowS: number, spotFree: () => boolean, spawn: () => void): void {
  if (m.disabled || nowS < m.nextAtS) return;
  m.nextAtS = nowS + m.intervalS;

  if (m.liveMax > 0 && m.live >= m.liveMax) return; // at the live cap
  if (!spotFree()) return;                          // a player or monster is in the spot

  spawn();
  m.live += 1;
  m.budget -= 1;
  if (m.budget === 0) m.disabled = true;            // budget spent: stop attempting
}

// Death notice from one spawned child. Called from that child's death path.
function childDied(m: MakerState): void {
  m.live -= 1;
}

export {};
