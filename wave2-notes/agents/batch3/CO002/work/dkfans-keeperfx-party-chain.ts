// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

type Objective = 'attack' | 'defend';
type Behaviour = 'none' | 'followLeader' | 'matchWorkRoom' | 'joinCombatOrFollow';

interface Unit {
  id: number;
  objective: Objective;
  isDigger: boolean;
  expLevel: number;   // 0..9 (donor CREATURE_MAX_LEVEL = 10)
  score: number;      // normalised score, 1..200 (donor scales to 200 and clamps to 8 bits)
  inBattle: boolean;
  fails: number;      // consecutive failed follow moves
  sinceTurn: number;  // turn of the last follow attempt
}

const FAIL_LIMIT = 12;   // donor: more than 12 consecutive fails drops the follower
const RETRY_TURNS = 16;  // donor: after a fail, wait 16 turns before the next attempt

// Role class of a group: 2 = a digger that is not defending, 1 = a digger that defends, 0 = none.
function diggerClass(u: Unit): number {
  if (!u.isDigger) return 0;
  return u.objective === 'defend' ? 1 : 2;
}

// Donor fix: the class is the MAXIMUM over the group (the donor returns the last member visited).
function groupDiggerClass(group: Unit[]): number {
  return group.reduce((best, u) => Math.max(best, diggerClass(u)), 0);
}

// Leader choice after a removal or at spawn: role class first, defenders last, then exp, then score.
function chooseLeader(group: Unit[]): Unit | undefined {
  const cls = groupDiggerClass(group);
  let best: Unit | undefined;
  for (const u of group) {
    const eligible = u.objective === 'defend' ? (cls < 1 || u.isDigger) : (cls < 2 || u.isDigger);
    if (!eligible) continue;
    const bestIsDefender = best !== undefined && best.objective === 'defend';
    if (u.objective !== 'defend' && bestIsDefender) { best = u; continue; }
    if (u.objective === 'defend' && best !== undefined && !bestIsDefender) continue;
    const bestExp = best?.expLevel ?? 0;
    const bestScore = best?.score ?? 0;
    if (bestExp <= u.expLevel && (u.score > bestScore || u.expLevel > bestExp)) best = u;
  }
  return best;
}

// Follower decision for the leader's current behaviour. 'reset' = the coach is absent: fall back to the idle state.
type ObeyResult = 'follow' | 'doorCombat' | 'keep' | 'reset';
function obey(leader: Unit | undefined, f: Unit, lb: Behaviour, leaderControlledByPlayer: boolean, enemyIsDoor: boolean): ObeyResult {
  if (!leader) return 'reset';
  if (leaderControlledByPlayer) return 'follow';
  switch (lb) {
    case 'followLeader':
      return 'follow';
    case 'joinCombatOrFollow':
      if (leader.inBattle && !f.inBattle) return enemyIsDoor ? 'doorCombat' : 'keep';
      return 'follow';
    default:
      return 'keep';
  }
}

// One follow tick for a non-leader. 'drop' removes the follower from the group.
type FollowResult = 'reset' | 'drop' | 'wait' | 'moved' | 'failed';
function followTick(
  f: Unit,
  leader: Unit | undefined,
  turn: number,
  attempt: () => boolean,
  cannotReachLeader: boolean,
): FollowResult {
  if (!leader) return 'reset';
  if (leader.id === f.id) return 'reset';
  if (f.fails > FAIL_LIMIT) return 'drop';
  if (f.fails > 0 && f.sinceTurn + RETRY_TURNS > turn) return 'wait';
  f.sinceTurn = turn;
  if (!attempt()) {
    if (cannotReachLeader) f.fails++;
    return 'failed';
  }
  f.fails = 0;
  return 'moved';
}

export {};
