// Clean-room shape of a multi-stage instance hand-off (rules re-expressed in our own words; no donor code copied).
type Status = 'alive' | 'unconscious' | 'dead' | 'out';
interface Unit { id: number; party: boolean; status: Status; onExit: boolean; canPlace: boolean; }
type Where = 'start' | 'exit' | 'other' | 'none';
interface Item { id: number; ownerId: number | null; recoverable: boolean; researched: boolean; isCorpse: boolean; isAmmo: boolean; at: Where; }
type Bucket = 'home' | 'conditional' | 'nextStage' | 'discard';
type Chrono = 'FORCE_LOSE' | 'FORCE_ABORT' | 'FORCE_WIN';

export interface Handoff {
  carried: number[];            // party ids placed on the next stage
  flaggedOut: number[];         // ids kept in the list but detached and inactive
  toRecovery: number[];         // fix: party members that could not be placed go to recovery, not to the live count
  enemiesAlive: number;
  buckets: Map<number, Bucket>;
}

const isOut = (u: Unit): boolean => u.status === 'dead' || u.status === 'unconscious' || u.status === 'out';

export function handOff(units: Unit[], items: Item[], aborted: boolean, allEnemiesDown: boolean): Handoff {
  const res: Handoff = { carried: [], flaggedOut: [], toRecovery: [], enemiesAlive: 0, buckets: new Map<number, Bucket>() };

  // 1. Units. Enemies always leave the stage. Party members who are not dead leave only
  //    if the run was aborted and they are not on the exit tile.
  for (const u of units) {
    if (u.party) {
      if (u.status === 'dead') continue;
      if (aborted && !u.onExit) { u.status = 'out'; res.flaggedOut.push(u.id); }
    } else {
      if (!isOut(u)) res.enemiesAlive++;
      u.status = 'out';
      res.flaggedOut.push(u.id);
    }
  }

  // 2. Items. Ammo follows its weapon; owned items stay with a living party member;
  //    loose recoverable items are bucketed by protocol.
  for (const it of items) {
    if (it.isAmmo) continue;
    const owner = it.ownerId === null ? undefined : units.find(u => u.id === it.ownerId);
    let b: Bucket = 'discard';
    if (owner !== undefined && owner.party && !isOut(owner)) {
      b = 'nextStage';
    } else if (it.recoverable && it.ownerId === null) {
      if (allEnemiesDown) {
        b = it.isCorpse || !it.researched ? 'home' : 'nextStage';
      } else if (it.at === 'start') {
        b = 'home';
      } else if (it.at === 'exit') {
        b = it.isCorpse ? 'conditional' : 'nextStage';
      } else if (it.at === 'other') {
        b = 'conditional';
      }
    }
    res.buckets.set(it.id, b);
  }

  // 3. Placement. A party member that is not out is placed on the next stage if a spawn works;
  //    otherwise it goes to recovery and is flagged out (donor leaves it unplaced and still live).
  for (const u of units) {
    if (!u.party || isOut(u)) continue;
    if (u.canPlace) {
      res.carried.push(u.id);
    } else {
      u.status = 'out';
      res.toRecovery.push(u.id);
    }
  }
  return res;
}

// Stage gate: the next stage loads only if the mission names one and someone is still counted (exit tile or survivors).
export function stageGate(nextStage: string | undefined, countedForGate: number): 'loadNext' | 'debrief' {
  return nextStage !== undefined && nextStage !== '' && countedForGate > 0 ? 'loadNext' : 'debrief';
}

// Turn limit: only when the limit is above 0 and the turn is past it. The chrono trigger picks the outcome.
export function turnLimitOutcome(turn: number, limit: number, trigger: Chrono): 'none' | 'abort' | 'win' | 'lose' {
  if (limit <= 0 || turn <= limit) return 'none';
  if (trigger === 'FORCE_ABORT') return 'abort';
  if (trigger === 'FORCE_WIN') return 'win';
  return 'lose';
}

export {};
