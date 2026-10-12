// Clean-room shape of a party entering a zone: staggered spawn, leader election, retarget timers, exit-gate check
// (rules re-expressed in our own words; GPL-2.0 donor, shape only; no donor code copied).
export interface Member { kind: string; expLevel: number; score: number; defend: boolean; countdownTurns: number; target: number; }
export interface Party { name: string; members: Member[]; }   // donor caps a party at 30 members
export interface Live {
  id: number; expLevel: number; score: number; defend: boolean; leader: boolean;
  activeAtTurn: number; target: number; objective: string; originalObjective: string;
}

// Leader rule: a non-defending candidate replaces a defending leader; otherwise the higher level, then the higher score, leads.
function candidateLeads(leader: Live, cand: Member): boolean {
  if (!cand.defend && leader.defend) return true;
  if (cand.defend === leader.defend) {
    return cand.expLevel > leader.expLevel || (cand.expLevel === leader.expLevel && cand.score > leader.score);
  }
  return false;   // candidate defends, leader does not: join as follower
}

export function spawnParty(p: Party, nowTurn: number, firstId: number): { live: Live[]; leaderId: number } {
  if (p.members.length > 30) throw new Error('party too big (limit 30)');
  const live: Live[] = [];
  let leaderId = -1;
  p.members.forEach((m, k) => {
    const l: Live = {
      id: firstId + k, expLevel: m.expLevel, score: m.score, defend: m.defend, leader: false,
      activeAtTurn: nowTurn + Math.max(0, m.countdownTurns),   // staggered entry: each member waits its own countdown
      target: m.target, objective: m.kind, originalObjective: m.kind,
    };
    if (live.length === 0) {
      l.leader = true; leaderId = l.id;
    } else {
      const cur = live.find(x => x.id === leaderId)!;
      if (candidateLeads(cur, m)) { cur.leader = false; l.leader = true; leaderId = l.id; }
    }
    live.push(l);
  });
  return { live, leaderId };
}

// Retarget timers (donor numbers): every 64 turns look for an enemy zone; after 400 turns without a target
// the party is allowed to attack; when no target is found the party falls back to its original objective and
// retries after 16 turns; a broken task waits 200 turns.
export interface Retarget { target: number; waitSince: number; lookedAt: number; objective: string; originalObjective: string; retryAt: number; }
export function retargetStep(r: Retarget, nowTurn: number, findEnemyZone: () => number): 'idle' | 'attack' | 'retry' {
  if (nowTurn < r.retryAt) return 'idle';
  if (r.target === -1) {
    if (nowTurn - r.lookedAt > 64) {
      r.lookedAt = nowTurn;
      r.target = findEnemyZone();
    }
    if (r.target === -1) {
      if (r.originalObjective !== '') r.objective = r.originalObjective;
      r.retryAt = nowTurn + 16;
      return 'idle';
    }
  }
  if (nowTurn - r.waitSince > 400) return 'attack';
  return 'idle';
}

// Exit gate: the countdown runs down one step per turn; then the party returns at the same gate only if that gate
// still has the stamp it had when the hero went in. The donor stores the stamp in 8 bits, so the test fails for
// any gate created at turn 256 or later (fix: keep the full turn number). A countdown of 0 decides at once
// (the donor waits forever at 0).
export interface ExitWait { countdown: number; gateStamp: number; }
export function exitGateStep(w: ExitWait, gate: { creationTurn: number } | null): 'waiting' | 'returnAtGate' | 'removed' {
  if (w.countdown > 0) {
    w.countdown -= 1;
    if (w.countdown > 0) return 'waiting';
  }
  if (gate !== null && gate.creationTurn === w.gateStamp) return 'returnAtGate';
  return 'removed';
}

export {};
