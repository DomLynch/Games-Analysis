# OpenDAoC-OpenDAoC-Core (progression, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/PlayerKillRewardProcessor.cs` (with `serverrules/AbstractServerRules.cs`, `gameobjects/GamePlayer.cs`, `gameobjects/GameLiving.cs`, `serverproperty/ServerProperties.cs`) | Licence: GPL-3.0 per the repo `LICENSE` file (Version 3); the processor file has no header of its own; copyleft, clean-room only | C# | symbol `PlayerKillRewardProcessor.ProcessRewards` / `GamePlayer.GainRealmPoints`

Checked: cell 2 is row 2 of `cells-D002.tsv` (category_no 10, list 12, hint: realm points and realm ranks). Read end to end: `PlayerKillRewardProcessor.cs` 1-187 (whole file). `AbstractServerRules.cs` 1307-1440 (OnPlayerKilled, its local ProcessXpGainers and ProcessDamage, AwardPlayerOnPlayerKill). `GamePlayer.cs` 3526-3560 (RealmLevel, rank title), 3600-3721 (GainRealmPoints), 3842-3976 (cumulative table, 131 entries), 3978-4027 (fallback formula, reverse lookup, victim value), 5719-5733 (player `AddXPGainer` override and the `ProcessDeath` header), 6008-6016 (order of death stamp). `GameLiving.cs` 1293-1339 (TakeDamage gainers) and 1821-1829 (AddXPGainer). `ServerProperties.cs` 735-736, 759-760, 849-850 (property lines). Candidates opened: 5 files; grep only: `GuildEvents.cs`, `NpcKillRewardProcessor.cs`, `DataQuest.cs`. Not read: `ZoneBonus`, `GetModified` (ToA bonus), `RespecRealm`, `REALM_RANK_NAMES`, the `GainRP` flag (GamePlayer 3636, where it is set), the rank event handlers in `GuildEvents.cs`, news creation. The `GamePlayer.cs` 3721-3838 range was not read. Confidence: high on the award order and the numbers (worked by hand from the code, not run); high on the 0-damage group member rule (GameLiving 1327-1332); medium on the battleground branch, because the comment and the code disagree (see section 6). Camera scope: not a camera cell.

Best transferable idea: A kill's credit is a per-attacker damage ledger, not a last-hit flag: each attacker's share is their damage over all damage taken, split across the party members who were in range, with a cap at twice the awardee's own value, and a victim who died less than a set time ago is worth nothing.
Decision (proposed): adapt - take the damage-share split, the range gate and the worth timer, which fit server-verified kills with MAX_ATTACKERS = 3; drop the party bonus (it lets a party earn more than the victim is worth) and the level-gap factor unless Strategy wants them, and write one number per award to the one ledger.
Acceptance: a server test in a 3-attacker fight with ungrouped attackers (damage 60, 30, 10 of 100 on a victim worth 100, same realm level, cap not binding) awards 60, 30 and 10 and writes one ledger entry each; a re-kill of the same player within the worth window awards 0; a party case asserts the total the decision chooses.

## 1. Mechanism

- Credit is collected while the fight runs. The `TakeDamage` override in `GameLiving.cs` (1293-1339) adds the damage to the victim's gainers list (`XPGainers`). A player hitting a player who is in a group registers every active group member of the attacker that is within `MAX_EXPFORKILL_DISTANCE` (1323-1335): the attacker gets the damage, the others get 0 (1329-1332), so a member who only stood nearby is counted. An ungrouped attacker is registered alone (1336-1337). A pet's damage is credited to its owner (1299-1300). The player override of `AddXPGainer` (`GamePlayer.cs` 5719-5727) returns without adding any gainer of the victim's own realm, so same-realm damage (duels, confusion) earns nothing; the base `AddXPGainer` (`GameLiving.cs` 1823-1829) accumulates the damage. Mauler's Gift of Perizor, if present, removes 25% of the damage before it is credited (1309-1313).
- At death, `GamePlayer.ProcessDeath` (5733) calls `ServerRules.OnPlayerKilled` (6012) and only then sets `DeathTime = PlayedTime` (6013-6014) unless it was a duel. So when rewards are computed, `DeathTime` still holds the victim's previous death.
- `OnPlayerKilled` (`AbstractServerRules.cs` 1307-1407): `totalDamage` is the sum over all gainers, taken before the range filter (1358-1360), so out-of-range attackers still dilute everyone's share. Then only gainers that are active and within `MAX_EXPFORKILL_DISTANCE` of the victim are kept (1363-1364). For each one: its damage and count go into a per-player entry (1366), and its group, if any, into a per-group entry with a count and damage (1368-1374). Count rises by one per in-range gainer, zero-damage members included (1385).
- For each in-range player, `AwardPlayerOnPlayerKill` (1409-1440) chooses the group entry if the player is grouped (1420-1421), otherwise the player's own entry (1422-1423), and runs `PlayerKillRewardProcessor` (1431-1439).
- `ProcessRewards` (`PlayerKillRewardProcessor.cs` 41-74): (a) worth gate: `DeathTime + RP_WORTH_SECONDS <= PlayedTime` (43), else no RP and no XP (69-70). (b) Damage share = entry damage / `totalDamage`, clamped to 1 with an error log (76-89). (c) `baseRp = victim.RealmPointsValue / entry.Count` (52), then capped at `awardee.RealmPointsValue * 2` (58, 91-94). (d) `RewardRealmPoints` (111-126): `rp = (int)(baseRp * share)` (113); if there is no battleground, or the awardee's realm level is below the battleground's `MaxRealmLevel`, `rp = (int)(rp * (1 + 2*(victimRL - awardeeRL)/900))` (117-118); then `rp += (int)(rp * (Count - 1) * 0.125)` for a group entry (120, 128-134); then `GainRealmPoints(rp, true)` if above zero (122-123).
- Order of the realm-point math, as the donor runs it: victim value, divided by the entry count, capped, scaled by damage share, level-gap scaling (if under the battleground cap or outside a battleground), party bonus, then in `GainRealmPoints`: RP_RATE (3642-3644), zone bonus (3646-3656), ToA bonus (3658-3663), add to total (3669), add to guild RP when the player's priv level is 1 (3672-3673).
- Victim value: `max(1, (Level - 20)^2) + RealmLevel` (4024-4025). Awardee cap: the same formula for the awardee, times 2 (93).
- Rank ladder: `REALMPOINTS_FOR_LEVEL` (3842-3976) is a cumulative table indexed by realm level: 0, 0, 25, 125, 350, 750, 1375, 2275, 3500, 5100, 7125 for levels 0-10 (the table ends at level 130, 187917143). `GainRealmPoints` (3678-3705) climbs while total >= table[level+1] and level < table length - 1. At each multiple of 10 it sends the rank messages and fires `RRLevelUp`; otherwise `RLLevelUp` (3684-3698). Rank number is `level / 10 + 1` (3553). The rank title is looked up from realm, gender and level / 10 (3592).
- Demotion: a negative amount recomputes the level with `CalculateRealmLevelFromRPs` (3707-3718), which searches the table only (3997-4011), and calls `RespecRealm(false)` when the level drops (3714).
- The fallback formula (3983-3990) covers levels beyond the table. Its only caller is `GainRealmPoints` (3678). C# evaluates the left operand first, so at `RealmLevel` 130 the fallback is called for level 131 and its value is compared; the length check after it is then false, so the fallback never changes a level (as read; the other callers of `CalculateRealmLevelFromRPs` are at GamePlayer.cs 3709 and 10499).

Worked by hand from the code, not run:
- Solo, victim level 50 with realm level 0: victim value 900; awardee cap 1800 (awardee level 50, RL 0); share 1; RP 900.
- Party of 4 in range, all the damage: base 900/4 = 225; share 1; no level gap; party bonus `(int)(225 * 3 * 0.125)` = 84; each member gets 309; total 1236, which is about 1.37 times the victim's 900.
- Level gap: victim RL 90 and awardee RL 0 solo: victim value 990 (level 50); scaling `1 + 2*90/900` = 1.2; RP about 1188.

## 2. Key functions

- `PlayerKillRewardProcessor.ProcessRewards`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/PlayerKillRewardProcessor.cs` 41-74. The order: worth gate, damage share, base split, cap, realm points, bounty, XP, money, stats.
- `RewardRealmPoints` and `CalculateGroupBonus`: same file 111-134.
- `AbstractServerRules.OnPlayerKilled` and its local `ProcessXpGainers` and `ProcessDamage`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/AbstractServerRules.cs` 1307-1406.
- `AbstractServerRules.AwardPlayerOnPlayerKill`: same file 1409-1440.
- `GamePlayer.GainRealmPoints`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 3634-3721.
- Player `AddXPGainer` override: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 5719-5727 (same-realm gainers dropped).
- `TakeDamage` override (gainers) and `AddXPGainer`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameLiving.cs` 1293-1339 and 1823-1829 (both inside `abstract class GameLiving`, line 28).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (default in code) |
|---|---|
| Victim is worth its value, scaled by its own level | `max(1, (Level-20)^2) + RealmLevel` (GamePlayer 4024-4025): 25 at level 25, 900 at level 50 (the comment at 4020-4023 says so) |
| Split across the entity's count | Count of in-range gainers, zero-damage members included (GameLiving 1332; AbstractServerRules 1385) |
| Share of damage over all damage taken, clamp at 1 | Division by total damage received, incl. out-of-range attackers (AbstractServerRules 1360; PlayerKillRewardProcessor 78-86) |
| Cap at twice the awardee's own value | `* 2` (PlayerKillRewardProcessor 93) |
| Level gap: plus or minus 2 per 900 realm levels of gap | `2.0 * (victimRL - awardeeRL) / 900.0` (PlayerKillRewardProcessor 118) |
| Party bonus: 12.5% per extra member | `* (Count - 1) * 0.125` (PlayerKillRewardProcessor 133) |
| Worth window: 300 played seconds since last death | `RP_WORTH_SECONDS` default 300 (ServerProperties 849-850) |
| Rate: 1.0 | `RP_RATE` default 1.0 (ServerProperties 759-760) |
| Rank ladder: cumulative per level, rank every 10 levels | `REALMPOINTS_FOR_LEVEL` 131 entries (GamePlayer 3842-3976); rank = level / 10 + 1 (3553) |
| XP cap on PvP kills: 125% of the victim's experience value | `XP_PVP_CAP_PERCENT` default 125 (ServerProperties 735-736; PlayerKillRewardProcessor 103) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the realm-point math (worth gate, share, base split, cap, level-gap scaling, party bonus, rate), but it takes one entity per awardee, as the donor does after the stats are chosen, and it skips the out-of-range filter, the per-group construction and the most-damaging-entity bookkeeping (NPC loot only). It omits the bounty points, XP, money, the zone bonus, the ToA bonus, the guild RP, the rank messages and news, the demotion and respec, the Gift of Perizor credit cut, and the pet owner mapping. The rank table is passed in as data (the donor table has 131 entries; this note does not copy them).

```ts
// Licence: GPL-3.0 (donor, OpenDAoC LICENSE). Clean-room sketch of the mechanism, not a translation of the donor.
interface Entity {          // a player, or a group, that gained credit for the kill
  count: number;            // members in range (zero-damage members included)
  damage: number;           // damage dealt by this entity
}

interface Victim {
  level: number;
  realmLevel: number;
  playedSinceLastDeath: number;   // seconds, measured before the death stamp is set
  totalDamageTaken: number;       // all attackers, including those out of range
}

interface Awardee {
  level: number;
  realmLevel: number;
  battlegroundCapRealmLevel: number | null;  // null outside a battleground
}

interface RpRules {         // engine constants and zone data; donor values in comments
  worthSeconds: number;     // RP_WORTH_SECONDS, 300
  levelGapDivisor: number;  // 900 (donor literal)
  groupStep: number;        // 0.125 (donor literal)
  rateModifier: number;     // RP_RATE, 1.0
  capFactor: number;        // 2 (donor literal)
  rankTable: number[];      // cumulative RP per realm level; donor table has 131 entries
}

// Realm-point value of a victim (donor RealmPointsValue).
function victimValue(v: Victim): number {
  const modified = v.level - 20;
  return Math.max(1, modified * modified) + v.realmLevel;
}

// Awardee's own value, used for the cap (donor CalculateRpCap: RealmPointsValue * 2).
function awardeeValue(a: Awardee): number {
  const modified = a.level - 20;
  return Math.max(1, modified * modified) + a.realmLevel;
}

// Realm points for one awardee, from the kill's entity stats. Integer steps are truncated as in the donor.
function rpForAwardee(a: Awardee, v: Victim, e: Entity, rules: RpRules): number {
  if (v.playedSinceLastDeath < rules.worthSeconds) return 0;

  const share = Math.min(1, e.damage / v.totalDamageTaken);
  let base = Math.floor(victimValue(v) / e.count);
  base = Math.min(base, awardeeValue(a) * rules.capFactor);

  let rp = Math.floor(base * share);
  if (a.battlegroundCapRealmLevel === null || a.realmLevel < a.battlegroundCapRealmLevel) {
    rp = Math.floor(rp * (1 + (2 * (v.realmLevel - a.realmLevel)) / rules.levelGapDivisor));
  }
  rp += Math.floor(rp * (e.count - 1) * rules.groupStep);
  return Math.floor(rp * rules.rateModifier);
}

// Cumulative table walk, one rank step at a time (donor GainRealmPoints loop).
function realmLevelFor(total: number, rules: RpRules, current: number): number {
  let level = current;
  while (level < rules.rankTable.length - 1 && total >= rules.rankTable[level + 1]) level += 1;
  return level;
}

// Rank number as the donor shows it: level 0-9 is rank 1, and so on.
function rankOf(realmLevel: number): number {
  return Math.floor(realmLevel / 10) + 1;
}
```

## 5. Lands in

- TARGET `src/fight/kill-rewards.ts` (new file): one award per kill per attacker, written once to the one ledger, with the worth timer on the server. Parity-checklist row 18 (loot roll and XP award). The server tick sub-line (post-K item 3) is not claimed: the donor's tick and kill timing were not read.
- today: (not read) - no Frankendom file was opened for this note.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only; shape, not lines)
- Brief rule served: server-verified kills (credit comes from damage the server recorded); one ledger (one award per kill per attacker); MAX_ATTACKERS = 3 (the share split is over up to three attackers). Rules 7-9 n/a.

## 6. Gaps and risks

- Copyleft (GPL-3.0): clean-room. The sketch is written from the described mechanism only.
- The party bonus can pay a party more than the victim is worth (1236 against 900 in the worked case). Frankendom's one-ledger rule needs a stated total, so this needs a decision, not a copy.
- The division by count combined with the share means a party's total is the victim's value times the party's damage share times `1 + 0.125*(n-1)`. Test that formula; do not assume the total is the victim value.
- Out-of-range attackers dilute everyone's share (the total includes them, 1360). Frankendom must decide whether damage from a fighter who has left the fight still counts.
- The worth check reads the victim's previous death, because the death stamp is set after the rewards (6012-6014). A first death is always worth RP. Frankendom should set the stamp in its own order and test the first-death case.
- The battleground comment says "Only award RPs if the player is under the battleground's cap" (116), but the code only skips the level-gap scaling at or above the cap (117-118); RP are still added. Do not copy the comment as a rule.
- Same-realm damage earns no credit (GamePlayer 5723-5724). That is right for RvR, but it means duel and friendly-fire damage is invisible to the kill ledger; Frankendom should decide that on purpose.
- The Mauler RA credit cut (GameLiving 1309-1313) changes the damage that counts for shares; Frankendom should not have a per-class credit cut hidden in the damage path.
- The rank table is cumulative. Its fallback formula is evaluated once at the cap (3678) but cannot change the outcome. Do not port the fallback; port the table as data.
- Not read: `ZoneBonus`, `GetModified` (ToA), `RespecRealm`, the `GainRP` flag (GamePlayer 3636), `REALM_RANK_NAMES`, `GuildEvents.cs` rank handlers. The timing of the death event relative to the tick loop is not read.
