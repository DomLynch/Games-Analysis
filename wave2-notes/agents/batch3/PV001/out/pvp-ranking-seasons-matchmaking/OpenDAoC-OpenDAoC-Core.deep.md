# OpenDAoC-OpenDAoC-Core (pvp-ranking-seasons-matchmaking, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/PlayerKillRewardProcessor.cs` (reward maths), with the kill path in `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/AbstractServerRules.cs` 1307-1440 and the death call in `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 6012-6014 | Licence: GPL-3.0 (repo `LICENSE`, "Version 3, 29 June 2007"; PlayerKillRewardProcessor.cs has no per-file header) | C# | symbols `PlayerKillRewardProcessor.ProcessRewards`, `AbstractServerRules.OnPlayerKilled`

Checked: Opened `PlayerKillRewardProcessor.cs` in full (1-188), `AbstractServerRules.cs` 1307-1440 (the PvP path, read in full for the parts used) and 1020-1110 (NPC path, read for contrast only), `GamePlayer.cs` 3524-3545, 4012-4030, 5990-6023, `ServerProperties.cs` 735 and 849-850, and the repo LICENSE header. Callers: `PlayerKillRewardProcessor.ProcessRewards` has one caller (AbstractServerRules.cs 1439); the PvP path is entered from `GamePlayer.Die` through `ServerRules.OnPlayerKilled` (GamePlayer.cs 6012). AbstractServerRules.cs 1206 calls the NPC processor, not this one. Not read: `CalculateOutpostExperienceBonus` (AbstractServerRules.cs 1442 onward), bounty point and money rules, `UpdateKillStatsOnPlayerKill`, the `PlayedTime` property, the battleground class (`MaxRealmLevel`), and where `XPGainers` is filled. Confidence: high on the order of steps in the reward processor and the kill path; medium on the time base, because `PlayedTime` was not read. camera_scope: not applicable.

Best transferable idea: Pay a kill only if the victim's previous death is at least N seconds old, and cap a kill's base reward at a multiple of the killer's own worth, so farming and feeding stop paying.

Decision (proposed): adapt - keep the worth timer and the self-relative caps (both are anti-farm and anti-feed controls for the kill path), keep the damage-share split and the group bonus shape; drop the realm-points, bounty and money currencies (one ledger: XP and loot only) and fix the defects in section 6.
Acceptance: A server test: a victim killed again within 300 played-seconds of their last death gives 0 XP and 0 RP; a kill never gives the awardee more XP than 125% of their own XP value; a three-damager group's RP total is 1.25 times the single-damager base share.

## 1. Mechanism

- Trigger: `GamePlayer.Die` calls `ServerRules.OnPlayerKilled` (GamePlayer.cs 6012), then records `DeathTime = PlayedTime` (6013-6014) unless the release is a duel. So the reward code sees the victim's previous death time, not this one.
- Entry (AbstractServerRules.cs 1307-1323): the victim's damage table (`XPGainers`) is summed into `totalDamage` before the range filter (1358-1360), then only players active and within `MAX_EXPFORKILL_DISTANCE` of the victim are kept (1363). Each kept damager is grouped by solo or by group. A group's pair counts its damagers and sums their damage (1368-1374, 1385-1386).
- For each kept damager (AbstractServerRules.cs 1328-1336) the processor is built with the awardee, the victim, the solo or group share, and `totalDamage` (1431-1439).
- Inside `ProcessRewards` (PlayerKillRewardProcessor.cs 41-74), in order:
  1. Worth: `isWorthAnything = DeathTime + RP_WORTH_SECONDS <= PlayedTime` (line 43). If false, no reward is paid and the awardee gets a "no realm points, no experience" message (68-70, 182-186); the kill stats still update with 0 RP (line 73). Default `RP_WORTH_SECONDS` is 300 (ServerProperties.cs 849-850).
  2. Damage share: `damagePercent = share.Damage / totalDamageTaken`, clamped to 1.0 with an error log (76-89).
  3. Base values: victim's RP value, XP value, bounty points, and money, each divided by the damager count (`entityCount`, lines 49-55).
  4. Caps on the base, each relative to the awardee's own value: RP at 2 x awardee RP value (58, 91-94); bounty points at 2 x awardee value (59, 96-99); XP at awardee XP value x `XP_PVP_CAP_PERCENT` / 100, default 125 (60, 101-104); money at 2 x awardee money value (61, 106-109).
  5. RP (111-126): `realmPoints = base x damagePercent` (113); if no battleground or the awardee is below the battleground's `MaxRealmLevel`, multiply by `1 + 2 x (victimRealmLevel - awardeeRealmLevel) / 900` (117-118); add the group bonus (120); pay only if above 0 (122-123).
  6. Group bonus (128-134): `realmPoints x (groupDamagerCount - 1) x 0.125`, so +12.5% per extra damager in the group.
  7. XP (156-163): `base x damagePercent`, plus an outpost bonus (not read), paid if above 0.
- Realm level scale: `RealmLevel / 10 + 1` is the rank (GamePlayer.cs 3553); a difference of 10 in `RealmLevel` is one rank. So at a difference of one rank, the RP factor is 1 + 20/900, about +2.2%. (Hand arithmetic from the formula.)
- Victim value: `RealmPointsValue = max(1, (Level - 20)^2) + RealmLevel` (GamePlayer.cs 4024-4025). So a level-50 victim at realm level 0 is worth 900 RP.
- Group effect on totals: each grouped damager runs the same group share, so a group's total is `victimRP x groupDamageShare x (1 + 0.125 x (n - 1))` (hand arithmetic from lines 52, 113, 133; the division by n in step 3 cancels across the n members).

## 2. Key functions

- `PlayerKillRewardProcessor.ProcessRewards`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/PlayerKillRewardProcessor.cs` 41-74. Order of steps in section 1.
- `CalculateRpCap` / `CalculateXpCap`: PlayerKillRewardProcessor.cs 91-94 and 101-104. Caps relative to the awardee.
- `RewardRealmPoints`: PlayerKillRewardProcessor.cs 111-126. The level-gap factor and the battleground check.
- `CalculateGroupBonus`: PlayerKillRewardProcessor.cs 128-134.
- `AbstractServerRules.OnPlayerKilled`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/AbstractServerRules.cs` 1307-1341. Builds the damage table, calls the award per damager, then sets `LastDeathRealmPoints`.
- `AbstractServerRules.AwardPlayerOnPlayerKill`: AbstractServerRules.cs 1409-1440. Solo or group share lookup, then the processor.
- `GamePlayer.Die` death call: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 6010-6014.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A kill pays only if the victim's previous death is old enough | 300 seconds of played time (theirs, ServerProperties.cs 849-850; default in the attribute) |
| Damage share, clamped to 1 | Clamp 1.0 (theirs, PlayerKillRewardProcessor.cs 85) |
| Victim's value split across attackers | Division by damager count (theirs, line 52) |
| The base reward of one kill is capped at a multiple of the killer's own value (the cap applies to the base, before the gap factor and group bonus) | RP base x 2 (theirs, line 93); XP base x 125% (theirs, line 103; ServerProperties.cs 735) |
| Rank-gap bonus for the higher side | 1 + 2 x gap / 900 (theirs, line 118); rank = RealmLevel / 10 (theirs, GamePlayer.cs 3553) |
| Group bonus per extra member | 0.125 (theirs, line 133) |
| Victim value formula | max(1, (Level - 20)^2) + RealmLevel (theirs, GamePlayer.cs 4024-4025) |

## 4. TypeScript sketch

simplified: keeps the worth timer (read before this death is recorded), the damage-share clamp, the split by damager count, both self-relative caps (RP and XP only), the realm-level factor on RP, and the group bonus. It omits bounty points, money, outpost bonuses, the kill-stat update, and the messages. It takes `totalDamageTaken` from the caller (the donor sums every damager, including those out of range). The caller must record the victim's new death time after all awards (donor order), and must read the worth flag once, before the loop (the donor overwrites it inside the loop). The realm-level factor is not clamped, matching the donor (see section 6).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS (/tmp/PV001-opendaoc-kill-reward.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/kill-reward.ts` (new module; the engine's kill settlement, server side, so the worth timer and the caps are server-verified). Parity-checklist row 18 (loot roll and XP award). Row 17 (death and respawn) is the other candidate; I used 18 because the output here is XP and loot.
- today: Frankendom's current kill-settlement location was not read (not read); this section is the target only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: addendum "keep the idea, fix the defect" (Dom 2026-10-10): the idea is kept, the defects are fixed in the sketch, decision is adapt; ruling "server-verified kills" and "one ledger" (section 6). MAX_ATTACKERS = 3 bounds the damager count, so the group bonus is at most +25% (count 3 gives 1 + 0.125 x 2).

## 6. Gaps and risks

- DEFECT 1, worth flag overwritten inside the loop (AbstractServerRules.cs 1325-1341). `isWorthAnything` is an out parameter, and each `AwardPlayerOnPlayerKill` call overwrites it (1334). `LastDeathRealmPoints` is then set from the last value (1340-1341). The worth test depends only on the victim, so the overwrite is harmless when every call computes it the same way, but the null-share path sets it to false (1425-1428), so a rare path can leave the victim's last-death RP unset. Fix: compute the worth flag once from the victim before the loop (the sketch does this).
- DEFECT 2, comment and code disagree on the battleground cap (PlayerKillRewardProcessor.cs 116-118). The comment says RPs are awarded only when under the battleground's cap. The code applies only the realm-level factor under the cap; the RP is still paid at or above the cap (lines 120-125 run unconditionally). Fix: decide the intent and write it down; if the cap should stop RP, the code must return early, not skip the factor.
- RISK 3, realm-level factor is not clamped (line 118). The factor is 1 + 2 x gap / 900, which is 0 at a gap of -450 and negative below it. Line 122 stops a negative RP from being paid, but nothing bounds the factor. Whether the gap can reach -450 in this build was not checked (max `RealmLevel` not read). Fix: clamp the factor as data.
- RISK 4, time base. The worth test uses `PlayedTime` (per-character played time, not wall-clock). Whether `PlayedTime` only advances while logged in was not read. Frankendom must choose a time base; the sketch uses the value passed in.
- Duel deaths do not set `DeathTime` (GamePlayer.cs 6013). So a Pit duel loss does not start the worth timer. This matches the donor and fits Frankendom if Pit duels are not world kills; it must be a stated rule.
- One ledger ruling. The donor pays four currencies: RP, bounty points, XP and money (lines 52-55, 64-67). Frankendom keeps XP and loot only. Drop the other three; they belong to a realm-points system Frankendom does not have.
- Server authority. The damage table (XPGainers) and the group sums live in the server's kill path, which is what Frankendom needs. The donor does not check the damage list for cheating; Frankendom must derive damage from the engine's duel and hate tables, not from client reports.
- MAX_ATTACKERS = 3 is a Frankendom ruling; the donor allows any number of damagers, so the group bonus and the division by count are sized for larger groups. With 3 it is a small bonus (+25% at most).
- Not read: the outpost experience bonus, bounty and money rules, the kill-stat update, the battleground `MaxRealmLevel` source, and where `XPGainers` is filled. Any claim about those is not made here.
- Licence: GPL-3.0. Clean-room only: the sketch is written from the mechanism, not translated from the C#.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All claims checked hold (ProcessRewards order and lines 41-74, worth test, defaults 300 / 125, caps, RP gap factor, group bonus, damage-share clamp, OnPlayerKilled 1307-1341, DeathTime ordering, licence GPL-3). Defects 1-3 are real.
- Trivial: the file is at serverproperty/ServerProperties.cs (path shorthand in the note).
- Missed (not material): `PlayedTime` is wall-clock since LastPlayed plus the stored DBCharacter.PlayedTime (GamePlayer.cs 9763-9774), so it advances only while logged in; the note flagged it as unread.
