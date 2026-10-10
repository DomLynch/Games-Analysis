# Dawn-of-Light-DOLSharp (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/keeps/AbstractGameKeep.cs` (claim, timer, release; overrides in `GameKeep.cs` and `GameTower.cs`) | Licence: GPL-2.0-or-later (AbstractGameKeep.cs header lines 5-7: "either version 2 ... or (at your option) any later version") | C# | symbol `CheckForClaim` / `Claim` / `ClaimCallBack`

Checked: `CheckForClaim`, `Claim`, `ClaimCallBack`, `Release`, the `InCombat` and `LastAttackedByEnemyTick` setter, `LoadFromDatabase`, and the `GameKeep`/`GameTower` overrides were read in full (AbstractGameKeep.cs 60-126, 532-556, 586-810, 1046-1056; GameKeep.cs 94-120; GameTower.cs 62-93). Two callers were read (DialogResponseHandler.cs 255-270 and playercommands/guild.cs 2098-2110); both call `GetKeepCloseToSpot` first, then `CheckForClaim`, then `Claim`. Confidence: high on the gates, the accrual and the release. Medium on timing semantics: `RegionTimer` was not read, so I do not know whether `return timer.Interval` reschedules from the fire time or the start time. Not read: the body of `KeepManager.GetKeepCloseToSpot` (distance), `Guild.RealmPoints` and `ClaimedKeeps`, the per-keep DB difficulty values, the relic code (`Managers/RelicMgr.cs`, `RelicGateMgr`), and the portal-keep gameplay beyond the `IsPortalKeep` definition. camera_scope: not applicable (world objective, no camera read).

## 1. Mechanism

- A team takes a keep by claiming it. Ownership is a guild (the donor's word for a team), stored on the keep and restored at load by guild name (AbstractGameKeep.cs 539-548). The claim is a one-shot state change; RP then accrues per hour.
- Gates, in the order the base class runs them (AbstractGameKeep.cs 591-672), with the GameKeep group pre-check first:
  - (a) GameKeep only: a GM (`PrivLevel > 1`) returns true before every other check (GameKeep.cs 96-97). A non-GM with no group is refused (99); a group smaller than `CLAIM_NUM` is refused (104).
  - (b) The keep is under attack (`InCombat`): refused (592). `InCombat` is true when the last enemy hit was under 5 minutes ago (118).
  - (c) Realm must match (599).
  - (d) `DBKeep.BaseLevel` must equal 50 (605). A keep with `BaseLevel >= 100` (the `IsPortalKeep` case, AbstractGameKeep.cs 126) fails this check.
  - (e) The player must have a guild (611) with the Claim rank (616), and the keep must have no owner (621).
  - (f) Guild limit (626-649): 0 means claiming is off; 1 means the guild may hold one keep; N means N keeps (644).
  - (g) Group presence (653-668): members whose position maps to this keep (via `GetKeepCloseToSpot(p.Position, VISIBILITY_DISTANCE)`, distance not read) are counted. `needed = CLAIM_NUM` (662), halved for towers (663-664), zero for a GM (665-666). Refused if `count < needed` (667).
- `Claim` (AbstractGameKeep.cs 680-706): sets the guild (682); if the guild limit is above 1, sends a guild message (684); sets the level to `STARTING_KEEP_CLAIM_LEVEL` (687); broadcasts the claim (689); changes the guild on every guard and banner (690-696); saves (700); reloads (701); starts the claim timer with a 1 ms delay (702, 711); fires `KeepClaimed`.
- Accrual: the claim timer's interval is `CLAIM_CALLBACK_INTERVAL` = 60 min (AbstractGameKeep.cs 66, 728). Each fire runs `ClaimCallBack` (744-753): no guild means return 0 (what 0 does in `RegionTimer` was not read). Otherwise `amount = CalculRP()` is added to `Guild.RealmPoints` (749-750), and `timer.Interval` is returned (752).
- `CalculRP` is the only per-class difference. Keep: `KEEP_RP_CLAIM_MULTIPLIER * DifficultyLevel` (GameKeep.cs 119). Tower: `TOWER_RP_CLAIM_MULTIPLIER * DifficultyLevel` (GameTower.cs 92). `DifficultyLevel` is the per-realm DB value `m_difficultyLevel[Realm - 1]` (AbstractGameKeep.cs 224; loaded at 536-538).
- `Release` (764-800): refused if `InCombat` (766). Otherwise: removes the keep from the guild's list (781), broadcasts, clears the guild, stops the claim timer and the level timer (785), sets the level to `STARTING_KEEP_LEVEL` (786), changes guild on guards and banners, and saves (798).
- Combat clock: any damage above zero to a keep component (GameKeepComponent.cs 476) or door (GameKeepDoor.cs 300) sets `Keep.LastAttackedByEnemyTick = CurrentRegion.Time`. The setter (AbstractGameKeep.cs 79-101) sets `StartCombatTick` on the first hit after a quiet spell, unless a door is open and `StartCombatTick` is already set (97). The source realm is not checked in these lines (callers of `TakeDamage` not read).
- Capture value (not the claim path): `GetRealmPointsForKeep` (AbstractServerRules.cs 2024-2030) gives `max(50, KEEP_RP_BASE + (BaseLevel - 50) * KEEP_RP_MULTIPLIER)` for keeps, and `max(5, TOWER_RP_BASE + ...)` for towers. Its callers were not read.
- Tick: the claim accrual is driven by `RegionTimer` (a region-owned timer), not a fixed-step frame loop. The loop that fires it was not read.

## 2. Key functions

- `CheckForClaim`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/keeps/AbstractGameKeep.cs` 591-672 (base gates). The `GameKeep` override is `GameKeep.cs` 94-111, the `GameTower` override is `GameTower.cs` 62-84.
- `Claim`: `AbstractGameKeep.cs` 680-706.
- `ClaimCallBack` (hourly RP): `AbstractGameKeep.cs` 744-753; `CalculRP` per class: `GameKeep.cs` 117-120, `GameTower.cs` 88-93.
- `Release`: `AbstractGameKeep.cs` 764-800.
- `InCombat` and the combat-clock setter: `AbstractGameKeep.cs` 79-101 and 112-120.
- Load restores the claim and restarts the timer: `AbstractGameKeep.cs` 532-556.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Capture gate: no capture within a quiet window after the last hit | 5 min quiet window (theirs, AbstractGameKeep.cs 118) |
| Presence gate: N teammates must stand near the objective (server-side count) | `CLAIM_NUM` default 8, halved for towers (theirs, ServerProperties.cs 1491; GameTower.cs 77; AbstractGameKeep.cs 662-664) |
| One objective per team, with a configurable limit | `GUILDS_CLAIM_LIMIT` default 1 (theirs, ServerProperties.cs 2329) |
| Periodic accrual to a team ledger, scaled by a per-objective difficulty | 60 min interval (theirs, AbstractGameKeep.cs 66); 1000 per difficulty step for keeps (theirs, ServerProperties.cs 1587) |
| Level set on claim and on release | Claim level 5 (ServerProperties.cs 1533), unclaimed level 4 (ServerProperties.cs 1527) |
| Capture value by base level | Keep base 4500 (ServerProperties.cs 1599), +50 per base level above 50 (ServerProperties.cs 1617, AbstractServerRules.cs 2030) |
| Claimable only at base level 50 | 50 (theirs, AbstractGameKeep.cs 605) |

## 4. TypeScript sketch

simplified: the sketch keeps the gate set and the accrual, but (1) drops the GM bypass on purpose; (2) reorders the group-size check to run last (the donor runs it first in the `GameKeep` override, GameKeep.cs 99-104, before the base checks at 592 onward); (3) merges the donor's guild-limit switch (626-649) into one comparison; (4) drops towers, the guard and banner hand-over, the level timer, the guild message and the broadcast; (5) uses a fixed time grid for accrual (`nextAccrueAt += accrueS`), where the donor returns `timer.Interval` from the fire time (AbstractGameKeep.cs 752) and I did not confirm how `RegionTimer` schedules that; (6) the first accrual lands on the next tick, as the donor's 1 ms start does (711).

```ts
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
```

## 5. Lands in

- TARGET `origins/server/world-objectives.ts` (new, proposed; the Frankendom repo was not read in this pass): a zone objective (claim point) whose claim, release and accrual are server state changes, with numbers as zone data. Parity-checklist row 18 (ledger award), sub-line "server tick: fixed step, input intake, per-tick NPC budget": the accrual runs on the server tick and posts to the one ledger.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (objective numbers as zone fields); one ledger (accrual posted to it, no second RP counter); server-verified claim and release (the group count is computed on the server)

Best transferable idea: a capture point that cannot change owner during a quiet window after the last hit, needs a presence count of teammates on the server, and pays a difficulty-scaled amount to the owner on a fixed interval.

Decision (proposed): adapt - take the gate shape (quiet window, presence count, one objective per team) and the accrual, but change them to zone data and the one ledger; reject the guild, realm and keep model, which Frankendom has no ruling for.

Acceptance: in a zone with a claimable objective, a claim while the objective was hit in the last 300 s is refused as "under attack"; with 8 group members in range counted on the server, the claim succeeds; the owning team's ledger then gains 1000 x difficulty every 3600 s; a release inside the 300 s quiet window is refused.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The GM bypass (GameKeep.cs 96-97; base 665-666) skips every gate for `PrivLevel > 1`. Frankendom must not copy this as a silent path. If staff tools need it, make it an explicit, logged action.
- The donor's hit clock counts any damage above zero, with no check on the attacker's team in the lines read. Frankendom's rule is that only the other team's damage refreshes the quiet window; the caller check is not in the donor's read path (callers of `TakeDamage` not read).
- Accrual timing: the donor reschedules from the timer's fire time (`timer.Interval`), which drifts. Frankendom runs on a fixed server tick, so accrual should count ticks (row 18 fixed step), not wall-clock time. The sketch uses a fixed grid; this is a choice, not something the donor proves.
- Wall-clock: the donor uses `CurrentRegion.Time` (milliseconds). The sketch uses seconds. Frankendom should use server tick counts for the quiet window too.
- Presence: the donor counts members by mapping each position to the nearest keep (`GetKeepCloseToSpot`, distance not read). Frankendom's count must be server-side and tested at the edge of the radius.
- The "one ledger" ruling: the donor pays into a separate `Guild.RealmPoints` counter. Frankendom must post the accrual to the one ledger with a reason tag, and must not create a second currency.
- The donor's per-keep difficulty comes from DB columns (values not read). Frankendom's equivalent is zone data.
- Not read: `RegionTimer` scheduling; the `KeepManager.GetKeepCloseToSpot` distance math; `Guild.RealmPoints` and `ClaimedKeeps`; the keep guards and doors (GameKeepGuard.cs, GameKeepDoor.cs, which are large and are not part of the claim path); the relics (`Managers/RelicMgr.cs`, `RelicGateMgr`), which the hint asked about. Relics and the rest of the portal-keep gameplay are not covered by this note.
- Pit as client: keep claiming is a world-zone feature. Nothing here belongs in the Pit arena.
