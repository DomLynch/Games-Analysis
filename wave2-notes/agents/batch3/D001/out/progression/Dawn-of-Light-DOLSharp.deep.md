# Dawn-of-Light-DOLSharp (progression, cell 10)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AbstractServerRules.cs` (`OnPlayerKilled` 1466-1608: the realm-point split on a player kill) with `GameServer/gameobjects/GamePlayer.cs` (`GainRealmPoints` 4207-4282, the rank table 4385-4519, `CalculateRealmLevelFromRPs` 4536-4555, `RealmPointsValue` 4559-4573, `RealmSpecialtyPoints` 4092-4095) | Licence: GPL-2.0-or-later (AbstractServerRules.cs and GamePlayer.cs headers: "either version 2 ... or (at your option) any later version") | C# | symbol `OnPlayerKilled` / `GainRealmPoints`

Checked: read in full: `OnPlayerKilled` (1466-1620; the bounty and XP split after 1620 not read), `GainRealmPoints` (4207-4282), `CalculateRPsFromRealmLevel` and `CalculateRealmLevelFromRPs` (4526-4555), `RealmPointsValue` (4559-4573), `RealmSpecialtyPoints` and `RealmRankTitle` (4084-4125), the load path (12358-12359), `GetPlayerRealmPointsTotal` (1844-1847), the NPC variant `OnLivingKilled` (1335-1426, read 1340-1425), the ability cost classes (`RealmAbility.cs` 31-120, 336-420), and the purchase handler (`PlayerTrainRequestHandler.cs` 150-170). Callers not read: who invokes `OnPlayerKilled` and `OnLivingKilled`, and the other `GainRealmPoints` callers (quests, keeps, zone bonus recursion). camera_scope: not applicable. Confidence: high on the award order and the rank loop. Medium on the worth-window clock: `DeathTime` and `PlayedTime` are read as used, but where they are set was not read.

## 1. Mechanism

Two parts. The first is how RP is earned on a player kill. The second is how total RP becomes a rank, and how rank becomes a spending budget.

Part A: award on a player kill (`OnPlayerKilled`, AbstractServerRules.cs 1466-1608).
- Step 1, worth window (1471-1474): the victim's last-death RP is reset, then if `DeathTime + RP_WORTH_SECONDS > PlayedTime` the function returns with no RP and no XP to anyone. This is a play-time clock, not wall-clock time. Default 300 (ServerProperties.cs 979).
- Step 2, total damage (1492-1508): sums damage over the XPGainers table. Any gainer with PrivLevel > 1 sets `dealNoXP` (1502) and the whole award is skipped (1511-1519). The donor does not guard a zero total (the division at 1564 is unguarded).
- Step 3, victim worth (1525): `playerRPValue = killedPlayer.RealmPointsValue`. Worth is `max(1, (Level - 20)^2 + 5 x (RealmLevel + 10))`, with `Level - 20` floored at 0 (GamePlayer.cs 4567-4571). A higher-rank or higher-level victim is worth more.
- Step 4, per gainer (1561-1606): skip a gainer outside `MAX_EXPFORKILL_DISTANCE` (16384, WorldMgr.cs 59). Share = `damage / total`, multiplied by 0.25 if the gainer is dead (1564-1566). The cap is `2 x gainer.RealmPointsValue` (1569). Then the award is computed in this order, each truncated to an int:
  1. `RP = trunc(victimWorth x share)` (1570);
  2. rank-gap factor, unless the battleground rule blocks it: `RP = trunc(RP x (1 + 2 x (victimRank - killerRank) / 900))` (1579-1581). A higher-ranked victim raises the award; a lower-ranked one lowers it;
  3. group factor, only if the killer is in a group of more than 1: `RP = trunc(RP x (1 + 0.125 x count))`, where count is group members within range of the victim (1582-1592);
  4. clamp to the cap (1596);
  5. if RP > 0: add to the victim's `LastDeathRealmPoints` (1602) and call `GainRealmPoints(RP)` on the gainer (1606).
- Worked arithmetic (from the formula, not a donor test): victim level 50 at rank 43 has worth 900 + 5 x 53 = 1165. An alive attacker with 75% of the damage, same rank, solo, gets trunc(1165 x 0.75) = 873, and the cap (2 x their own worth, at least 2330) does not bind. A dead attacker with 25% of the damage gets trunc(1165 x 0.25 x 0.25) = 72.

Part A also applies to the NPC and keep path (`OnLivingKilled`, 1335-1426): the same damage share, dead x0.25, cap 2 x own worth, and group factor (1395-1426). It has no worth window, no rank-gap factor and no battleground check (what I read).

Part B: RP becomes rank (`GainRealmPoints`, 4207-4282).
- Order (as the code runs): RP_RATE multiplies the amount when `modify` is true (4215). The zone bonus is added (4220-4231). The item/ToA percent bonus is added (4232-4236, inside the `modify` branch). The amount is added to the character total (4242). If the player is not a GM, it is also added to the guild total (4244-4245). Then the climb loop (4250-4263): while total >= threshold[rank + 1] and rank < 130, rank++. Every rank that is a multiple of 10 sends the rank-up messages (4255). Multi-level climbs happen in one call.
- Thresholds: `REALMPOINTS_FOR_LEVEL` is a 131-entry table, levels 0-130 (4385-4519). Read values: level 2 = 25, level 3 = 125, level 13 = 16250, level 20 = 61750, level 26 = 138125, level 130 = 187917143 (4389, 4390, 4400, 4407, 4413, 4517). Beyond the table a cubic formula is used (4528-4532). That branch is unreachable from the climb loop, which stops at index 130.
- Rank from total (load path and reverse lookup): `CalculateRealmLevelFromRPs` scans down from index 130 and returns the first index whose threshold is <= points; 0 points gives 0 (4536-4555). On load, if the stored rank is 0 it is recomputed from total points (12358-12359).
- Rank title: rank number is `RealmLevel / 10 + 1` (4123). So rank 5 level 3 is RealmLevel 43 (doc comment at 4539: "RR5L3 = 43").

Part C: rank becomes a spending budget.
- `RealmSpecialtyPoints` = `GetPlayerRealmPointsTotal` minus the sum of `CostForUpgrade(i)` over every level of every ability except RR5 (4092-4095). `GetPlayerRealmPointsTotal` is the rank level itself (RealmLevel), floored at 1 once the character is level 20 or above (AbstractServerRules.cs 1846). The budget is in rank levels, not RP.
- Purchase (PlayerTrainRequestHandler.cs 157-160): cost = `CostForUpgrade(current level)`; refused if budget < cost; then `CheckRequirement`; then the ability is added.
- Cost tables (RealmAbility.cs): timed actives: new scaling 5, 5, 5, 7, 8 then 1000 (lines 88-97); legacy `(level + 1) x 5` (102). Passives (L5): new scaling 1, 1, 2, 3, 3, 5, 5, 7, 7 then 1000 (343-356); legacy 1, 3, 6, 10, 14 then 1000 (364-368). Base default 1000 (35-37). RR5 abilities cost 0 and require RealmLevel >= 40 (401-420), and are excluded from purchase and from the spend sum.

## 2. Key functions

- `OnPlayerKilled`: `AbstractServerRules.cs` 1466-1608 (player-victim award).
- `OnLivingKilled`: `AbstractServerRules.cs` 1335-1426 (NPC and keep award; read 1340-1425).
- `GainRealmPoints(long, bool, bool, bool)`: `GamePlayer.cs` 4207-4282 (gain, climb, rank messages).
- Rank lookup: `GamePlayer.cs` 4526-4555 (`CalculateRPsFromRealmLevel`, `CalculateRealmLevelFromRPs`).
- Victim worth: `GamePlayer.cs` 4559-4573.
- Specialty budget: `GamePlayer.cs` 4092-4095; `AbstractServerRules.cs` 1844-1847.
- Ability cost: `RealmAbility.cs` 35-37 (base), 86-103 (timed), 341-370 (L5), 401-420 (RR5); purchase at `PlayerTrainRequestHandler.cs` 150-170.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Share of the award = damage share, zero for those who did not hit, quartered for the dead | Dead share 0.25 (theirs, AbstractServerRules.cs 1566) |
| Cap a single award at a multiple of the recipient's own worth (stops over-rewarding a strong player) | 2 x (theirs, 1569) |
| Worth of a target = squared level above 20 plus rank term | `(Level - 20)^2 + 5 x (RealmLevel + 10)`, floor 1 (theirs, GamePlayer.cs 4567-4571) |
| Rank-gap factor: a higher-ranked target pays more, a lower one pays less | `1 + 2 x gap / 900` (theirs, 1581) |
| Group factor, per member within range | 0.125 per member (theirs, 1592); range 16384 (WorldMgr.cs 59) |
| Anti-farm window after a death, in play time | 300 s (theirs, RP_WORTH_SECONDS default, ServerProperties.cs 979) |
| Threshold ladder with a reverse lookup | 131 thresholds (theirs, GamePlayer.cs 4385-4517) |
| Budget = rank minus spent cost | Floor 1 at character level 20 (theirs, AbstractServerRules.cs 1846) |
| Ability cost ladders | Active 5/5/5/7/8; passive 1/1/2/3/3/5/5/7/7 (new), 1/3/6/10/14 (legacy); unlisted level 1000 (theirs, RealmAbility.cs 88-368) |

## 4. TypeScript sketch

simplified: the sketch follows the donor award order: worth window, damage share with the dead quarter, base award, rank-gap factor, group factor, then the cap. It also follows the rank climb loop and the reverse lookup. It omits: the battleground cap (AbstractServerRules.cs 1579); the bounty and XP split; the PrivLevel rule that zeroes the whole award (1502, 1511-1519); the victim's LastDeathRealmPoints bookkeeping; the NPC branch (`OnLivingKilled`); the zone bonus and item bonus; the guild total; the rank-up messages; and the ability purchase and requirement checks. The caller must count group members near the victim (donor counts them with `IsWithinRadius`, 1590-1592) and pass the range check result. The sketch adds a zero-total guard that the donor does not have. The threshold table is passed in as data; no values are copied.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Fighter {
  id: number;
  level: number;        // character level
  rank: number;         // realm level, 0..130 (donor RealmLevel)
  alive: boolean;
  distance: number;     // distance to the victim at the kill (donor IsWithinRadius, MAX_EXPFORKILL_DISTANCE)
  groupSize: number;    // size of the fighter's group (1 = solo)
  groupNear: number;    // group members within range of the victim (counted by the caller)
}

interface Victim extends Fighter {
  deathPlayedS: number; // play time at last death
  playedS: number;      // play time now
}

interface RpCfg {
  worthWindowS: number;   // 300 (donor RP_WORTH_SECONDS)
  maxRange: number;       // 16384 (donor MAX_EXPFORKILL_DISTANCE)
  deadShare: number;      // 0.25
  rankGapCoeff: number;   // 2 (donor 1 + 2 * gap / 900)
  rankGapScale: number;   // 900
  groupStep: number;      // 0.125 per group member near
  capMultiple: number;    // 2: award cannot exceed 2 x the fighter's own worth
  rankTable: number[];    // donor REALMPOINTS_FOR_LEVEL, passed in as data
}

// Worth of a player as a victim (donor GamePlayer.RealmPointsValue): level above 20 squared plus 5 per (rank + 10).
function worth(f: Fighter): number {
  const lv = Math.max(0, f.level - 20);
  return Math.max(1, lv * lv + (f.rank + 10) * 5);
}

// Awards by damage share. damage: attacker id -> damage dealt to the victim.
function rpAwards(v: Victim, damage: Map<number, number>, fighters: Map<number, Fighter>, cfg: RpCfg): Map<number, number> {
  const out = new Map<number, number>();
  // Victim died inside the worth window (play time): nobody is paid.
  if (v.deathPlayedS + cfg.worthWindowS > v.playedS) return out;

  let total = 0;
  for (const d of damage.values()) total += d;
  if (total <= 0) return out;   // the sketch guards this; the donor divides and does not check

  const value = worth(v);
  for (const [id, dealt] of damage) {
    const f = fighters.get(id);
    if (!f || f.distance > cfg.maxRange) continue;

    let share = dealt / total;
    if (!f.alive) share *= cfg.deadShare;

    const cap = worth(f) * cfg.capMultiple;
    let rp = Math.trunc(value * share);
    rp = Math.trunc(rp * (1 + cfg.rankGapCoeff * (v.rank - f.rank) / cfg.rankGapScale));
    if (f.groupSize > 1) rp = Math.trunc(rp * (1 + f.groupNear * cfg.groupStep));
    rp = Math.min(rp, cap);
    if (rp > 0) out.set(id, rp);
  }
  return out;
}

// Rank from total points: highest index whose threshold is <= points (donor CalculateRealmLevelFromRPs).
function rankFromPoints(points: number, table: number[]): number {
  if (points === 0) return 0;
  let i = table.length - 1;
  for (; i > 0; i--) if (table[i] <= points) break;
  return i;
}

// Gain: add points, then climb while the next threshold is met, capped at the last table index (donor GainRealmPoints loop).
function gainPoints(p: { points: number; rank: number }, amount: number, table: number[]): void {
  p.points += amount;
  while (p.rank < table.length - 1 && p.points >= table[p.rank + 1]) p.rank++;
}

// Specialty budget (donor RealmSpecialtyPoints): rank, floored at 1 from character level 20, minus spent points.
function specialtyBudget(f: Fighter, spentCost: number): number {
  const base = f.level > 19 ? Math.max(1, f.rank) : f.rank;
  return base - spentCost;
}
```

## 5. Lands in

- TARGET `src/fight/rewards.ts` (new; the kill award after a fight ends, called by the engine when a kill is server-verified). Parity-checklist row 18 (loot roll and XP award): the damage-share split is the award step, and this sketch is its shape only.
- Frankendom's currency is XP and the one ledger, not realm points. Any RP or rank table would be a second currency, which the one-ledger ruling forbids. The rank table would only come back as zone data if RvR gets its own ledger.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (award posted as one entry, no second RP counter); server-verified kills (award computed on the server from recorded damage); zones as data (worth window, cap and ranges as data); MAX_ATTACKERS = 3 (the share split is over at most three recorded attackers).

Best transferable idea: a kill award split by recorded damage share, quartered for attackers who died before the kill, capped at twice the recipient's own worth, with no award when the victim was killed again inside a play-time window.

Decision (proposed): adapt - take the damage-share split, the dead-attacker quarter, the cap and the death window, and post them as XP to the one ledger; reject the realm-point currency, the rank ladder and the battleground rule unless Dom rules that RvR needs its own ledger.

Acceptance: in a fight with three recorded attackers, the kill award is split by damage share and posted to the one ledger; an attacker who is dead at the kill gets a quarter of their share; a victim killed again within 300 s of its own play time since the last death awards nothing; no attacker is credited above twice its own worth; the server test asserts each figure.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; the donor lines are not translated.
- The donor's worth window uses play time (`PlayedTime`, not wall-clock). Frankendom should count server ticks for the same rule (row 18 fixed step), so a pause or a tab-out does not change who is paid.
- The donor's PrivLevel rule (a GM gainer zeroes the whole award, 1502 and 1511-1519) is a staff rule inside the award. Frankendom must not hide a staff bypass here; test it explicitly if staff tools need it.
- The donor divides by the total damage with no zero guard. The sketch returns early. Frankendom's test should cover a kill with no recorded damage.
- The donor's rank-gap formula is written as `2 x gap / 900`, and its comment says "20%" for a R1L0 vs RR10 case. The formula gives about 22% at a 100-level gap (arithmetic, not a donor test). Frankendom should use the formula as data, not the comment.
- The donor's group factor counts group members within range of the victim, but it applies only if the killer's group has more than one member (1582). Frankendom's count must come from the server, not the client.
- The donor applies the battleground cap by comparing ranks (1579). That is RvR-specific and is not in the sketch.
- The cap uses the recipient's own worth. A strong player's cap grows with rank and level; Frankendom should check the cap against the zone's expected reward before shipping.
- Not read: who calls `OnPlayerKilled`; the bounty and XP split after 1620; where `DeathTime` and `PlayedTime` are set; the other `GainRealmPoints` callers; the ability `MaxLevel` values; the rank table values for levels 14-19 and 27-112 (not needed by the sketch).
- Pit as client: RP and rank are world-zone progression. The Pit does not award RP.
