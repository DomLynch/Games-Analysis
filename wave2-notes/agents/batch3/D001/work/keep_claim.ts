// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Seconds, not milliseconds. Donor numbers are the defaults; every cfg field is zone data or server config.
interface ClaimCfg {
  claimNum: number;                 // players who must be near the objective (donor CLAIM_NUM, default 8)
  claimLimitPerTeam: number;        // objectives one team may hold (donor GUILDS_CLAIM_LIMIT, default 1; 0 = off)
  claimLevel: number;               // level set on claim (donor STARTING_KEEP_CLAIM_LEVEL, 5)
  unclaimedLevel: number;           // level set on release (donor STARTING_KEEP_LEVEL, 4)
  quietS: number;                   // no claim or release this long after the last hit (donor 5 min)
  accrueS: number;                  // accrual interval (donor 60 min)
  pointsPerDifficulty: number;      // points per accrual, times difficulty (donor keep: 1000)
}

interface Player { realm: number; teamId: number | null; mayClaim: boolean; groupSize: number; nearbyInGroup: number; }

interface Objective {
  realm: number;
  claimable: boolean;               // donor: base level must be 50
  difficulty: number;               // per-objective, set in data
  ownerTeam: number | null;
  level: number;
  lastHitAt: number;                // 0 = never hit
  nextAccrueAt: number;             // Infinity = no accrual running
}

type Gate = { ok: true } | { ok: false; reason: string };

const inCombat = (o: Objective, now: number, cfg: ClaimCfg): boolean =>
  o.lastHitAt !== 0 && now - o.lastHitAt < cfg.quietS;

// Claim gates in donor order (AbstractGameKeep.CheckForClaim); the GM bypass is omitted on purpose.
function claimGate(p: Player, o: Objective, teamsClaimed: number, now: number, cfg: ClaimCfg): Gate {
  if (inCombat(o, now, cfg)) return { ok: false, reason: "under attack" };
  if (p.realm !== o.realm) return { ok: false, reason: "not your realm" };
  if (!o.claimable) return { ok: false, reason: "not claimable" };
  if (p.teamId === null) return { ok: false, reason: "no team" };
  if (!p.mayClaim) return { ok: false, reason: "no claim rank" };
  if (o.ownerTeam !== null) return { ok: false, reason: "already claimed" };
  if (cfg.claimLimitPerTeam === 0 || teamsClaimed >= cfg.claimLimitPerTeam) return { ok: false, reason: "team limit" };
  if (p.groupSize < cfg.claimNum) return { ok: false, reason: "group too small" };
  if (p.nearbyInGroup < cfg.claimNum) return { ok: false, reason: "not enough group nearby" };
  return { ok: true };
}

function claim(p: Player, o: Objective, now: number, cfg: ClaimCfg): void {
  o.ownerTeam = p.teamId;
  o.level = cfg.claimLevel;
  o.nextAccrueAt = now;             // donor starts the timer with a 1 ms delay: first accrual at the next tick
}

// Called once per server tick for each objective. The ledger is a plain map here; in Frankendom it is the one ledger.
function tickAccrual(o: Objective, ledger: Map<number, number>, now: number, cfg: ClaimCfg): void {
  if (o.ownerTeam === null) return;
  if (now < o.nextAccrueAt) return;
  ledger.set(o.ownerTeam, (ledger.get(o.ownerTeam) ?? 0) + cfg.pointsPerDifficulty * o.difficulty);
  o.nextAccrueAt += cfg.accrueS;    // donor returns timer.Interval from the fire time; this sketch keeps a fixed grid
}

function release(p: Player, o: Objective, now: number, cfg: ClaimCfg): Gate {
  if (inCombat(o, now, cfg)) return { ok: false, reason: "under attack" };
  if (o.ownerTeam === null || o.ownerTeam !== p.teamId) return { ok: false, reason: "not your claim" };
  o.ownerTeam = null;
  o.level = cfg.unclaimedLevel;
  o.nextAccrueAt = Infinity;
  return { ok: true };
}

// Hit recording: any damage above zero refreshes the quiet window (donor sets LastAttackedByEnemyTick on damage > 0).
function onHit(o: Objective, damage: number, now: number): void {
  if (damage > 0) o.lastHitAt = now;
}
export {};
