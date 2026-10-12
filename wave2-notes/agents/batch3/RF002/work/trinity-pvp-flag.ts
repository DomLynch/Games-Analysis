// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the shape only: hostile (PvP) flag, contest timer, helper taint, honour gate.
interface HostileState {
  flagged: boolean;          // hostile (PvP) flag is on
  decayStartS: number | null; // seconds timestamp the flag decay started; null = not running
  contestedMs: number;       // ms left on the contest timer (0 = not contested)
  inCombat: boolean;
  hostileArea: boolean;      // hostile zone, forcing quest or war mode
}

const CONTEST_MS = 30_000;   // donor: contest timer length (set on each contact)
const FLAG_DECAY_S = 300;    // donor: flag drops this long after the decay start (hard-coded in donor)

// A hostile act (attacking a player, or helping a contested player) refreshes both timers.
function onHostileAct(s: HostileState, nowS: number): void {
  s.flagged = true;
  s.decayStartS = nowS;      // donor restamps the end timer with now on every PvP-on
  s.contestedMs = CONTEST_MS;
}

// Helping a player who is contested flags the helper too (donor: spell path, assist case).
function onAssist(helper: HostileState, target: HostileState, nowS: number): void {
  if (target.contestedMs > 0) onHostileAct(helper, nowS);
}

// Area change: a hostile area keeps the flag on; leaving it starts the decay.
function onAreaChanged(s: HostileState, nowS: number, hostile: boolean): void {
  s.hostileArea = hostile;
  if (hostile) {
    s.flagged = true;
    s.decayStartS = null;
    return;
  }
  if (s.flagged && s.decayStartS === null) s.decayStartS = nowS;
}

// Per tick: the contest timer counts down only out of combat.
function tickContest(s: HostileState, diffMs: number): void {
  if (s.contestedMs <= 0 || s.inCombat) return;
  s.contestedMs = Math.max(0, s.contestedMs - diffMs);
}

// Per tick: the flag drops FLAG_DECAY_S after the decay start, never in a hostile area.
function tickFlag(s: HostileState, nowS: number): void {
  if (!s.flagged || s.decayStartS === null || s.hostileArea) return;
  if (nowS < s.decayStartS + FLAG_DECAY_S) return;
  s.flagged = false;
  s.decayStartS = null;
}

// Honour for a player kill (donor shape). baseHonour stands in for the donor's level table (not read).
function killHonour(killerLevel: number, victimLevel: number, grayLevel: number, sameTeam: boolean, baseHonour: number): number {
  if (sameTeam) return 0;
  if (victimLevel <= grayLevel) return 0;
  return Math.ceil(baseHonour * (victimLevel - grayLevel) / (killerLevel - grayLevel));
}

export {};
