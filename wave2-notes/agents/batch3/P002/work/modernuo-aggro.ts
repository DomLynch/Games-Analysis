// Licence: GPL-3.0-or-later (donor, ModernUO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type FightMode = 'none' | 'aggressor' | 'strongest' | 'weakest' | 'closest';

export interface Candidate {
  id: string;
  distSq: number;      // squared distance from the creature
  tactics: number;     // skill + strength, used by 'strongest'
  hits: number;        // current hit points, used by 'weakest'
  inLos: boolean;      // line of sight to the creature
  isPlayer: boolean;
}

export interface Mind {
  gate: number;            // no scan before this time (ms)
  reacquireDelay: number;  // full re-arm after every scan (ms)
  approachDelay: number;   // delay an enemy entering approach range pulls the scan to (ms)
  focus: string | null;
}

// Higher score wins. Mode 'closest' prefers the smallest distance.
function score(mode: FightMode, c: Candidate, playerOnly: boolean): number {
  if (playerOnly && !c.isPlayer) return -Infinity;
  if (mode === 'strongest') return c.tactics;
  if (mode === 'weakest') return -c.hits;
  return -c.distSq;
}

// One scan. Honours the gate the way the donor does, then re-arms the gate after the scan.
export function acquire(
  m: Mind, now: number, mode: FightMode, cands: Candidate[], playerOnly: boolean, anyAggressor: boolean,
): string | null {
  if (mode === 'none') { m.focus = null; return null; }
  if (mode === 'aggressor' && !anyAggressor) { m.focus = null; return null; }  // nobody hostile: no scan at all

  const remain = m.gate - now;
  if (remain > 0 && remain <= m.reacquireDelay) { m.focus = null; return null; }  // inside the gate
  // A gate further out than the re-arm is illegal and reads as open (the scan runs).

  let best: Candidate | null = null;
  let bestVal = -Infinity;
  for (const c of cands) {
    const v = score(mode, c, playerOnly);
    if (v > bestVal && c.inLos) { best = c; bestVal = v; }   // strict '>': the first candidate wins ties
  }
  m.gate = now + m.reacquireDelay;   // re-arm after every scan, found or not
  m.focus = best ? best.id : null;
  return m.focus;
}

// An enemy inside approach range pulls the next scan earlier. It clamps the deadline; it never extends it.
export function scheduleOnApproach(m: Mind, now: number): void {
  const deadline = now + m.approachDelay;
  if (deadline - m.gate < 0) m.gate = deadline;
}

// Being attacked: the next poll scans at once.
export function forceReacquire(m: Mind, now: number): void {
  m.gate = now;
}

export {};
