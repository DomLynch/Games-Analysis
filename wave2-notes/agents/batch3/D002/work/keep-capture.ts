// Licence: GPL-3.0 (donor, OpenDAoC LICENSE). Clean-room sketch of the mechanism, not a translation of the donor.
interface CapturePoint {
  owner: string | null;   // guild id, null when unclaimed
  realm: number;          // 1, 2 or 3
  level: number;
}

interface CaptureData {   // zone data; donor values in comments
  groupMinimum: number;        // CLAIM_NUM, 8
  startLevelOwned: number;     // STARTING_KEEP_CLAIM_LEVEL, 5
  startLevelUnowned: number;   // STARTING_KEEP_LEVEL, 4
  maxLevelOwned: number;       // MAX_KEEP_LEVEL, 5
  rampEnabled: boolean;        // ENABLE_KEEP_UPGRADE_TIMER, false
  guildClaimLimit: number;     // GUILDS_CLAIM_LIMIT, 1
  waitMsToReach: number[];     // ms; index = level being reached; donor table is in minutes (12..960)
}

interface ClaimContext {
  groupSize: number;
  groupInArea: number;
  inCombat: boolean;
  sameRealm: boolean;
  guildId: string | null;
  guildMayClaim: boolean;
  guildClaimCount: number;
  pointOwned: boolean;
}

// First failing check wins, in the donor's order.
function claimRefusal(c: ClaimContext, d: CaptureData): string | null {
  if (c.groupSize < d.groupMinimum) return "group too small";
  if (c.inCombat) return "under attack";
  if (!c.sameRealm) return "not your realm";
  if (c.guildId === null) return "no guild";
  if (!c.guildMayClaim) return "no claim rank";
  if (c.pointOwned) return "already owned";
  if (d.guildClaimLimit === 0) return "claiming disabled";
  if (d.guildClaimLimit >= 1 && c.guildClaimCount >= d.guildClaimLimit) return "guild at limit";
  if (c.groupInArea < d.groupMinimum) return "not enough group members inside the area";
  return null;
}

// Claim: owner set, level set to the claim start; returns the first timer wait, or null if no ramp.
function onClaim(p: CapturePoint, guildId: string, d: CaptureData): number | null {
  p.owner = guildId;
  p.level = d.startLevelOwned;
  if (!d.rampEnabled || p.level >= d.maxLevelOwned) return null;
  return d.waitMsToReach[p.level + 1];
}

// Timer fire: one step toward the owned max (owned) or the unowned start (unowned).
// Returns the next wait in ms, or null to stop.
function onTimerFire(p: CapturePoint, d: CaptureData): number | null {
  if (p.owner !== null && p.level < d.maxLevelOwned) p.level += 1;
  else if (p.owner === null && p.level > d.startLevelUnowned) p.level -= 1;
  const atTarget = p.owner !== null ? p.level >= d.maxLevelOwned : p.level <= d.startLevelUnowned;
  if (atTarget) return null;
  return d.waitMsToReach[p.level + 1];
}

// Release by the owner: owner dropped, timer stopped by the caller, level back to the unowned start.
function onRelease(p: CapturePoint, d: CaptureData): void {
  p.owner = null;
  p.level = d.startLevelUnowned;
}

// Point's lord killed: realm follows the killer's group leader, then the point resets.
function onLordKilled(p: CapturePoint, killerLeaderRealm: number, d: CaptureData): void {
  onRelease(p, d);
  p.realm = killerLeaderRealm;
}
