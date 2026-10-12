// Licence: GPL-3.0 (donor repo LICENSE, Version 3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Victim {
  lastDeathPlayed: number;   // played time of the victim's previous death (0 if none)
  playedNow: number;         // victim's played time at this death
  rpValue: number;           // base RP the victim is worth
  xpValue: number;           // base XP the victim is worth
  realmLevel: number;        // rank points; 10 units = 1 rank
}

interface Awardee {
  rpValue: number;           // the awardee's own RP value (cap basis)
  xpValue: number;           // the awardee's own XP value (cap basis)
  realmLevel: number;
}

interface Share {
  count: number;             // damagers in the awardee's group (or 1 if solo)
  damage: number;            // their summed damage to the victim
}

interface Award { xp: number; rp: number; worth: boolean; }

const WORTH_SECONDS = 300;       // rp_worth_seconds (server property, default 300)
const XP_PVP_CAP_PERCENT = 125;  // XP_PVP_Cap_Percent (default 125)
const RP_CAP_MULT = 2;           // RP per kill <= 2 x awardee's own RP value
const GAP_DIVISOR = 900;         // RP factor = 1 + 2 * (victim - awardee realm level) / 900
const GROUP_STEP = 0.125;        // +12.5% RP per extra group damager

// simplified: omits bounty points, money, outpost bonuses, the kill-stat update and the messages.
// simplified: takes totalDamageTaken from the caller (the donor sums every damager, including out-of-range ones).
// simplified: the caller must record the victim's new death time after all awards (donor order), and the worth flag is read once, before the loop.
function killAward(v: Victim, a: Awardee, share: Share, totalDamageTaken: number): Award {
  // 1. worth: the victim's previous death must be WORTH_SECONDS ago (read before this death is recorded).
  const worth = v.lastDeathPlayed + WORTH_SECONDS <= v.playedNow;
  if (!worth) return { xp: 0, rp: 0, worth };

  // 2. share of the victim's damage this awardee dealt, clamped to 1.
  const pct = Math.min(1, share.damage / totalDamageTaken);

  // 3. base value split across the damagers, then capped at a multiple of the awardee's own value.
  const baseRp = Math.min(Math.floor(v.rpValue / share.count), a.rpValue * RP_CAP_MULT);
  const baseXp = Math.min(Math.floor(v.xpValue / share.count), Math.floor((a.xpValue * XP_PVP_CAP_PERCENT) / 100));

  // 4. RP: damage share, then the realm-level factor, then the group bonus.
  let rp = Math.floor(baseRp * pct);
  rp = Math.floor(rp * (1 + (2 * (v.realmLevel - a.realmLevel)) / GAP_DIVISOR));
  rp += Math.floor(rp * (share.count - 1) * GROUP_STEP);

  // 5. XP: damage share only.
  const xp = Math.floor(baseXp * pct);

  return { xp: Math.max(0, xp), rp: Math.max(0, rp), worth };
}

export {};
