# OpenDAoC-OpenDAoC-Core (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/AbstractGameKeep.cs` (with `keeps/GameKeep.cs`, `keeps/GameTower.cs`, `keeps/RelicGameKeep.cs`, `serverrules/PvPServerRules.cs`, `serverproperty/ServerProperties.cs`, `ECS-Services/TimerService.cs`) | Licence: GPL-3.0 per the repo `LICENSE` file (Version 3); `GameTower.cs` carries a GPL-2.0-or-later header; copyleft, clean-room only | C# | symbol `AbstractGameKeep.CheckForClaim` / `Claim` / `ChangeLevelTimerCallback`

Checked: cell 1 is row 1 of `cells-D002.tsv` (category_no 20, list 12, hint: keep ownership, claiming, relics, battlegrounds). Read end to end: `AbstractGameKeep.cs` 576-662 (CheckForClaim), 668-694 (Claim), 772-792 (Release), 801-810 (ChangeLevel, head), 894-1020 (ramp start and callback), 1026-1037 (base CalculateTimeToUpgrade), 1047-1117 (Reset); `GameKeep.cs` 1-132 (whole file); `GameTower.cs` 40-94; `RelicGameKeep.cs` 19-58; `PvPServerRules.cs` 486-515; `DialogResponseHandler.cs` 178-190; `TimerService.cs` 1-140; `GameLoop.cs` 94-109; `GameLoopTickPacer.cs` 73-95; `GameServiceUtils.cs` 13-21; `ServerProperties.cs` keep entries and the loop rate. Candidates opened: 8 files. Grep hits only, not read: `KeepManager.cs`, `GameRelic.cs`, `GameRelicPad.cs`. Not read: `AbstractGameKeep.LoadFromDatabase` head (only 526-538 read), `SaveIntoDatabase`, guard and banner `ChangeGuild`/`ChangeRealm` bodies, `GameKeepComponent`, `KeepManager`, the rest of the `GameLoop` service list (only the timer service and the pacer were read). Confidence: high on the claim gate and the level table; medium-high on the timer-restart arithmetic (read, not run). Camera scope: not a camera cell.

Best transferable idea: A capture point is claimed only when the claiming group has enough members physically inside the point's area (not just in the group), is refused during combat, and then ramps level one step per timer; a lord kill flips the owner's realm to the killer's group leader's realm and resets the level.
Decision (proposed): adapt - the claim gate and the owner reset are the shape Frankendom needs for capturable zone points (zone data, server-verified claims), but Frankendom has no guild or keep model, and the donor's ramp is off by default (`ENABLE_KEEP_UPGRADE_TIMER` false), so port the gate and the reset only, not the ramp.
Acceptance: a server test asserts that a claim with fewer group members inside the point's radius than the zone's `groupMinimum` is refused with a reason; a complete claim sets owner and level to `startLevelOwned`; a lord kill by group G changes the point's realm to G's leader's realm and drops the level to `startLevelUnowned`.

## 1. Mechanism

- Claim is a guarded state change. A player asks for the nearest keep within `WorldMgr.VISIBILITY_DISTANCE`, the server runs `CheckForClaim`, and only if that passes calls `Claim` (`DialogResponseHandler.cs` 178-187).
- Order of checks in `GameKeep.CheckForClaim` (`GameKeep.cs` 93-111): a GM priv level above 1 returns true at once (96-97, skipping every later check); no group, refused (99-102); group `MemberCount` below `CLAIM_NUM` (default 8), refused (104-107); otherwise the base check runs.
- Base `AbstractGameKeep.CheckForClaim` (`AbstractGameKeep.cs` 576-662), in order: in combat refused (578-583); player realm must equal keep realm (585-589); `DBKeep.BaseLevel` must be 50 unless `ALLOW_BG_CLAIM` (592-596, which is how battleground keeps are kept out by default); no guild (598-601); no guild Claim rank (603-606); keep already owned (608-611); guild claim limit switch: 0 disables claiming, 1 allows one keep per guild, n allows n (613-635); then group members whose `CurrentAreas` contains the keep's area must number at least `CLAIM_NUM`, halved for towers, with the GM bypass setting it to 0 (640-660).
- `Claim` (668-694): sets guild; sets level to `STARTING_KEEP_CLAIM_LEVEL` (675, default 5); broadcasts; guards and banners change guild; saves; reloads (691), which may start the upgrade ramp; fires `KeepClaimed`.
- Ramp (only when `ENABLE_KEEP_UPGRADE_TIMER` is true, 896-904). `LoadFromDatabase` (535-536) starts a ramp toward `MAX_KEEP_LEVEL` when owned and below max; and a ramp toward `STARTING_KEEP_LEVEL` (537-538) when unowned and above start. On each fire, `ChangeLevelTimerCallback` (982-1020) steps the level by one: up toward max when owned (1004-1006), down toward start when unowned (1008-1009). It then returns the wait for the new level (1011-1013).
- Wait per level: `GameKeep.UpgradeTime` (`GameKeep.cs` 38-50) is in ms; the entry at index i is the wait to reach level i (minutes: 12, 12, 12, 12, 12, 24, 60, 120, 240, 480, 960 for indexes 0-10). `CalculateTimeToUpgrade` (80-86) returns `UpgradeTime[Level + 1]`. So a point claimed at level 5 waits 60 min for level 6, then 120 min for level 7, and so on.
- Restart while running (`StartChangeLevelTimer`, 936-954; as read): the new interval starts as the full target. If the timer is alive, `elapsed = Interval - TimeUntilElapsed` (942). If elapsed is more than the old interval, the interval becomes 1 ms (944-945). If elapsed is less than the new target, the interval becomes the old remaining time, `Interval - elapsed` (947-948), so the old deadline is kept. Otherwise the full new target is used. Then the timer restarts from now (953).
- Stop rule (1011-1018): the callback stops and saves only when the level is the literal 10 or 1. It does not compare with `MAX_KEEP_LEVEL` or `STARTING_KEEP_LEVEL`. So once an owned keep reaches the max, the callback does not stop: it returns `CalculateTimeToUpgrade()` for that level and fires again with no change (for example, with max 6, a keep at level 6 re-fires every `UpgradeTime[7]`, 120 min). With the default max of 5 the ramp never starts, because loading only starts it below max. Reading only; not run.
- Release by the owner (`Release`, 772-792): removes the keep from the guild list, clears `Guild`, stops the ramp (778), sets level to `STARTING_KEEP_LEVEL` (779), changes guard and banner guild, saves.
- Lord killed (`PvPServerRules.ResetKeep`, 489-513): the new realm is the killer's group leader's realm when the killer is in a group (495-499), the killer's realm when solo, and a pet's owner group for a controlled pet (502-510); then `Reset(realm)` (512).
- `Reset` (`AbstractGameKeep.cs` 1047-1117): sets `Realm` (1052); sets level to `STARTING_KEEP_LEVEL` (1056); releases the owning guild if any (1059-1061); repairs non-raised components and kills hook-point objects (1063-1073); changes the realm for clients; resets doors and guards (non-lord guards die); changes banners; updates base levels and live bonuses when configured; saves; fires `KeepTaken` (1115).
- Realm points on claim: `GameKeep.CalculRP` returns `KEEP_RP_CLAIM_MULTIPLIER * DifficultyLevel` (117-120), and `GameTower.CalculRP` returns `TOWER_RP_CLAIM_MULTIPLIER * DifficultyLevel` (90-93). The only caller is `ClaimCallBack` (737-748), and its timer is commented out (718-721: "we dont give RPs to guilds for holding onto claimed keeps currently"). In this build no RP is awarded for holding or claiming (as read).
- Relics: `RelicGameKeep` refuses claims (`RelicGameKeep.cs` 52-56) and has the same table. Relic count does not change the upgrade time; the base has the formula as a TODO comment (`AbstractGameKeep.cs` 1028-1036) and returns 0 (1037). The three subclasses I read all override it.
- Battlegrounds: non-50 base-level keeps are not claimable unless `ALLOW_BG_CLAIM` (592-596).
- Timer loop (read): `GameLoop.Run` (`Managers/GameLoop/GameLoop.cs` 94-109) repeats `TickServices()` (98) and then `GameLoopTime = _tickPacer.WaitForNextTick()` (99). That is a fixed-rate paced loop, not an accumulator and not a variable step: `game_loop_tick_rate` defaults to 30 ticks per second (`ServerProperties.cs` 274-275). The pacer sleeps, then spins to a deadline; when the loop is a full tick late it resets the deadline instead of catching up (`GameLoopTickPacer.cs` 92-94). Inside `TickServices`, `TimerService.Tick` runs each due timer once per loop pass: `ShouldTick` is `NextTick - GameLoopTime <= 0` (`GameServiceUtils.cs` 20), and `TimerService.cs` 51-55 calls `timer.Tick()` only when it is due. `ECSGameTimer.Start` sets `NextTick = GameLoopTime + interval` (`TimerService.cs` 105-108); `Tick` takes the callback's return as the next interval, stops at 0 or less, and otherwise advances `NextTick` by the interval (121-131), so a late timer fires again on the next pass until it catches up. Timer resolution is therefore one loop tick (about 33 ms at the default rate).

## 2. Key functions

- `AbstractGameKeep.CheckForClaim`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/AbstractGameKeep.cs` 576-662. The ordered gate: combat, realm, battleground level, guild, rank, owned, guild limit, group presence.
- `AbstractGameKeep.Claim`: same file 668-694. Owner set, level to claim start, guards and banners, save, reload (which can start the ramp).
- `AbstractGameKeep.StartChangeLevel` and `StartChangeLevelTimer`: same file 894-954. Gate on the switch, then the restart arithmetic.
- `AbstractGameKeep.ChangeLevelTimerCallback`: same file 982-1020. One step per fire, then re-arm or stop.
- `GameKeep.CalculateTimeToUpgrade` and `UpgradeTime`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/GameKeep.cs` 38-50 and 80-86.
- `AbstractGameKeep.Release` and `Reset`: same file 772-792 and 1047-1117.
- `PvPServerRules.ResetKeep`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/PvPServerRules.cs` 489-513. Realm goes to the killer's group leader.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (default in code) |
|---|---|
| Claim needs a group whose members are physically inside the point's area | `CLAIM_NUM` 8 for the group total (GameKeep 104) and 8 inside the area (AbstractGameKeep 650); towers half (652). Defaults: `ServerProperties.cs` 1396-1397 |
| Level set to a claim-start value, then bounded between a start value and a max value | Claim start 5 (`ServerProperties.cs` 1438), unowned start 4 (1432), max 5 (1444) |
| One step per timer fire, with a wait table indexed by the level being reached | `UpgradeTime` in ms, 12 min to 960 min (`GameKeep.cs` 40-50; 60 min at index 6, line 46) |
| Fixed wait for towers | 12 min (`GameTower.cs` 57) |
| One claimed point per owner | `GUILDS_CLAIM_LIMIT` 1 (`ServerProperties.cs` 2263-2264) |
| Ramp off unless switched on | `ENABLE_KEEP_UPGRADE_TIMER` false (1450-1451, 896) |
| Points not claimable unless the base level is 50 | `BaseLevel != 50` (592); `ALLOW_BG_CLAIM` false (2428) |
| Reward on claim | `KEEP_RP_CLAIM_MULTIPLIER` 1000 times difficulty (`GameKeep.cs` 119; default 1000 in `ServerProperties.cs` 1492); dead in this build |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the claim gate, with the group-size check first as the donor's `GameKeep` override runs it first. It omits the GM bypass, the battleground base-level check, the tower half threshold, the save calls, the guard and banner changes, the realm-points award (dead in the donor), the donor's timer-restart arithmetic (the sketch uses one fixed wait per level), and the lord-kill repairs. It changes the donor's stop rule: the donor stops at literal 10 and 1 and re-arms at max; the sketch stops when the configured bound is reached. Level values come from zone data, not donor constants.

```ts
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
```

## 5. Lands in

- TARGET `origins/server/zone-capture.ts` (new file): capture points as zone data, claim and reset decided on the server. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer), since it is the zone-state row; no row in the addendum covers capture points, so Lead should decide whether to add one (see section 6).
- today: (not read) - no Frankendom file was opened for this note.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only; shape, not lines)
- Brief rule served: zones as data (per-point numbers in zone data); server-verified claims; one ledger for owner and realm. Rules 7-9 n/a.

## 6. Gaps and risks

- Copyleft (GPL-3.0): clean-room. The sketch is written from the described mechanism only.
- The donor's gate counts group members whose server-side `CurrentAreas` contain the keep's area; that is a presence check, so Frankendom must test presence on the server, not from the client.
- The owner is a guild in the donor. Frankendom has no guild or keep model; the owner id has to be a decision (party, realm or ledger entry). This note does not decide it.
- The ramp is off by default and its restart arithmetic is odd (a restart can keep the old deadline or fire at once). Do not copy the restart rule; if the ramp is adopted, write fresh tests for it.
- The stop rule hard-codes 10 and 1 (1011), so an owned keep at a configured max keeps re-firing with no change (120 min at max 6). Do not copy.
- The GM bypass (`GameKeep.cs` 96-97) returns true before every other check, including combat and realm. Frankendom should not have an admin bypass that skips claim checks without a logged reason.
- The lord-kill flip gives the point to the killer's group leader's realm, so one leader's realm decides ownership for the whole group. Frankendom's one-ledger rule must say which kill counts and whose realm wins.
- Relic-based upgrade time is a TODO (`AbstractGameKeep.cs` 1028-1036) and was not built. Do not port it.
- Not read: `LoadFromDatabase` head, `SaveIntoDatabase`, guard and banner bodies, `KeepManager`, the other services in the loop's tick sequence. The timer cadence is known from the loop code above; the keep ramp was not run, so its real timing is not measured.
