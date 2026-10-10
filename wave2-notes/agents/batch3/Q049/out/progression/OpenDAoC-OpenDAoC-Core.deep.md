# OpenDAoC-OpenDAoC-Core (progression, cell 10)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/NpcKillRewardProcessor.cs` | Licence: GPL-3.0 (repo `LICENSE` file, "Version 3, 29 June 2007"; the header of `ICharacterClass.cs` says "version 2 ... or (at your option) any later version"; `NpcKillRewardProcessor.cs` has no licence header) | C# | symbol `NpcKillRewardProcessor.ProcessRewards`

Checked: Read: `NpcKillRewardProcessor.cs` 1-300 (300-345, the XP-stats message, not read; ProcessRewards 63-94, group split 152-243, cap 245-254, camp 256-274, group bonus 276-285); `AbstractServerRules.cs` OnNpcKilled 1015-1060, ProcessXpGainers 1094-1170, AwardPlayerOnNpcKill 1180-1207, GetExperienceForLiving 573-600; `GamePlayer.cs` level table 4112-4204, GainExperience 4312-4431, death loss in ProcessDeath 5908-5985, release loss 1642-1654; `GameLiving.cs` 480-523 and 657-660; `ServerProperties.cs` defaults (729-730, 741-742, 1875, 1881, 2275); `ConLevelGrid.cs` enum 223-233 and builder 1-80. The hint file `ICharacterClass.cs` (lines 1-80 read) is an interface of class properties with no progression maths. The only construction site of `NpcKillRewardProcessor` in the repo is `AbstractServerRules.cs` 1198-1206 (grep), so the caller list is complete. NOT read: `CalculateOutpostExperienceBonus` (1442-), `AddXPGainer` (GamePlayer 5719), GameNPC `CampBonus` initial value, the body of `GetExperienceForLiving` beyond the table lookup and the start of the formula (586-600 only), the XP table values in `GameLiving.XPForLiving`, `GameGravestone`, `ForceGainExperience` callers, the `Lord` ExceedXPCapAmount override, the BAF brain field source. Confidence: high on the kill-award order (read end to end); medium on the death-loss numbers, which I read but did not trace through the gravestone. Camera scope: not a camera cell.

Best transferable idea: Cap each contributor's kill XP at a multiple of their own level XP before scaling by their damage share, so a low-level player cannot farm a high-level mob.
Decision (proposed): adapt — the cap-then-share order and the even split among contributors fit Frankendom's up-to-3 attackers and server-verified kills, but the con-colour re-levelling, the camp bonus and the guild/BAF stack are PvE idle mechanics the Pit and the duel do not need.
Acceptance: A server test: a level-3 player who dealt 10% of the damage to a level-30 mob receives `floor(levelXp(3) x 1.25 x 0.10)` (the cap applies first, then the share); a 3-attacker kill gives each member `ceil(mobXp / 3)` scaled by their group's damage share; and a death penalty can never take XP below the current level's floor.

## 1. Mechanism

- Trigger: `OnNpcKilled` (AbstractServerRules.cs 1015). If the NPC is not eligible, nothing is awarded. `ProcessXpGainers` (1094-1170) sums the damage of every XP gainer, including out-of-range ones (1116), and denies the whole kill if any gainer is grey to the NPC or is a guard (1119). Only players inside `MAX_EXPFORKILL_DISTANCE` get a share (1123). It builds per-player, per-group and per-battlegroup contributor counts (`Count` incremented at 1156) and per-entity damage (1157). Then `AwardPlayerOnNpcKill` (1049, 1180-1207) builds one `NpcKillRewardProcessor` per contributor, using the group's totals if the player is grouped.
- Order of steps inside `ProcessRewards` (NpcKillRewardProcessor.cs 63-94), as the code runs:
  (a) Base XP. Grouped players call `CalculateNpcExperienceModifiedByGroup` (65). With one contributor the base is the mob's ExperienceValue (156-157). If the highest-level contributor cons grey, the base is 0 (178-179). The "challenge" colour threshold is Yellow for 1-3 contributors, Orange for 4-7 and Red for 8 or more (187-192). If the highest contributor's con colour is at or above the threshold (195-196), or the receiver's own con to the NPC is at or below that colour (200-201), the base is `ceil(ExperienceValue / count)`. Otherwise the code searches for the NPC level whose con colour matches the highest contributor's, and the base is `ceil(XP of that level / count)` (208-242).
  (b) Cap. `xpCap` = XP for the receiver's own level x `XP_CAP_PERCENT` / 100 x `ExceedXPCapAmount` (252-253). Base = min(base, cap) (73-74). The comment at 79 gives the reason: capping must come before the damage share, or a low-level player could tag any high-level mob and hit the cap.
  (c) Damage share. `damagePercent` = contributor (or group) damage / total NPC damage, clamped to 1.0 (98-106). Base = base x damagePercent (80).
  (d) Zero check. Realm points and bounty points are awarded before this check (70-71). If base <= 0 the function returns with no XP (76-77).
  (e) Bonuses, all computed from the post-share base: camp (262-273), group `base x (contributors - 1) x 0.125` (284), guild `GUILD_BUFF_XP` percent when the guild bonus is XP (289-292), BAF `BafAddCount x 0.075` for standard mob brains (297-300), outpost (not read).
  (f) Hand-off to `GamePlayer.GainExperience` (4312). A gain is refused when `GainXP` is off (4316). Hardcore groups get 0 if any member is more than 5 levels above (4319-4328). With `AllowMultiply`, the zone bonus is a separate nested gain (4337-4347); the base is multiplied by `XP_RATE` (or `RvR_XP_RATE` in RvR zones) and by the XpPoints percent (4349-4357), but the camp, group, guild and BAF bonuses are not multiplied (4335, 4359).
  (g) Floor clamp. If the award would leave XP below the current level's threshold, it is raised to that threshold (4372-4375). Uses the second-stage threshold when `IsLevelSecondStage` is set (4365-4371).
  (h) Level-up. At level 5 without class advancement, XP still accrues but the level is held and the player is told to see a trainer (4411-4417). At level 40-49, the half-way point (`ExperienceForCurrentLevelSecondStage`, 4246) sets the second stage and spec points `SpecPointsMultiplier x Level / 20` (4795). Otherwise `Level++` runs once per call when XP reaches the next threshold (4424-4426). The level setter fires `OnLevelUp`, which resets `DeathCount` (4747).
- Death, for context (not the kill path): in `ProcessDeath` (5733), a PvE death removes `xpLossPercent` per-mille of the level span (`ExperienceForNextLevel - ExperienceForCurrentLevel`) (5970). The percent is `50 - Level` below level 40 and `10` at 40+ (5910-5917). The first death in a level divides it by 3 (5956-5961); the second multiplies by 2/3 (5963-5966). A death on a GST_Normal RvR server sets it to 0 (5926-5931). The stored amount is removed again at `Release` (1649), and the release-time loss goes to a gravestone (1652-1653).
- Tick: no tick. The award is synchronous: `OnNpcKilled` runs one `ProcessRewards` per contributor in a loop (1043-1049). Its caller was not read. The camp timer reads `GameLoop.GameLoopTime` against `SpawnTick` (265).

## 2. Key functions

- `ProcessRewards`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/NpcKillRewardProcessor.cs` 63-94. Order: base, cap, damage share, zero check, bonuses, hand-off.
- `CalculateNpcExperienceModifiedByGroup`: same file, 152-243. The con-colour challenge rule and the even split.
- `CalculateXpCap`: same file, 245-254. Cap at `XP_CAP_PERCENT` percent of the receiver's own level XP, times `ExceedXPCapAmount`.
- `CalculateCampBonus`: same file, 256-274. Full bonus after 30 minutes since spawn (265-269), otherwise full x the NPC's `CampBonus`.
- `CalculateGroupBonus`: same file, 276-285. Uses contributor count, not group size.
- `OnNpcKilled` / `ProcessXpGainers` / `AwardPlayerOnNpcKill`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/serverrules/AbstractServerRules.cs` 1015-1060, 1094-1170, 1180-1207.
- `GamePlayer.GainExperience(GainedExperienceEventArgs)`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 4312-4431. Multiply, floor clamp, level gates.
- Death and release loss: `GamePlayer.cs` 5908-5985 (in `ProcessDeath`, 5733) and 1642-1654 (in `Release`, 1391).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Split the mob's XP across contributors, rounding up | Even split (theirs, NpcKillRewardProcessor.cs 196, 242) |
| Challenge threshold by contributor count | 1-3 Yellow, 4-7 Orange, 8+ Red (theirs, 187-192) |
| Cap the award at a multiple of the receiver's own level XP, before the share | 125 percent (theirs, ServerProperties.cs 729-730, default 125); `ExceedXPCapAmount` 1.0 (theirs, GameLiving.cs 523) |
| Share = contributor damage / total damage, clamped | Clamp 1.0 (theirs, NpcKillRewardProcessor.cs 100-101) |
| Group bonus per extra contributor | 0.125 (theirs, 284) |
| Camp bonus gate on time since spawn | 1800000 ms (theirs, 265); outside 0.55, dungeon 0.66 (theirs, ServerProperties.cs 1875, 1881); -0.02 per kill (theirs, AbstractServerRules.cs 1057) |
| Guild bonus | 5 percent (theirs, ServerProperties.cs 2275) |
| Server rate applies to the base only | `XP_RATE` default 1.0 (theirs, ServerProperties.cs 741-742) |
| Floor: a loss cannot cross the level threshold | Threshold = XP for current level (theirs, GamePlayer.cs 4372-4374) |
| Level gates | 5 (theirs, 4411); 40 with second stage (theirs, 4419); max 50 (theirs, 4114) |
| Death loss per-mille of level span | 50 - Level below 40, 10 at 40+ (theirs, 5912, 5916); /3 then 2/3 (theirs, 5960, 5964) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one receiver: even split among the receiver's group (or the receiver alone), cap on the receiver's own level, damage share after the cap, zero check, group bonus, `XP_RATE` on the base only, then the level floor and one level step per call. It omits the con-colour re-levelling of the base for mixed-level groups, the camp, guild, BAF and outpost bonuses, the realm and bounty points, the zone bonus, the hardcore rule, the XpPoints modifier, the level-5 trainer gate, the level-40 second stage and spec points, and the death and release losses. The donor applies the loss through the same `GainExperience` path; the sketch's `applyXp` does that for awards and losses.

```ts
// Licence: GPL-3.0 (donor repo LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Contributor {
  damage: number;            // damage this player dealt to the mob
  level: number;             // player level now
  groupId: number | null;    // group the player is in, or null
}

interface Player {
  xp: number;
  level: number;
}

interface KillInput {
  mobXp: number;                      // XP value of the mob (donor: ExperienceValue)
  mobExceedCap: number;               // 1.0 for ordinary mobs (donor: ExceedXPCapAmount)
  capPercent: number;                 // 125 = cap at 1.25 x the receiver's own level XP (donor: XP_CAP_PERCENT)
  totalDamage: number;                // all damage the mob took from everyone
  attackers: Contributor[];           // everyone who hit the mob (MAX_ATTACKERS = 3 in Frankendom)
  receiver: Contributor;              // the player being awarded; must be in attackers
  xpRate: number;                     // multiplier on the base only (donor: XP_RATE)
  groupBonusPerExtra: number;         // 0.125 per extra contributor in the group (donor constant)
  levelXp: (level: number) => number; // XP needed to reach a level (donor table: XPForLevel)
  maxLevel: number;                   // 50 in the donor
}

// Base XP for one receiver. Order: even split, cap on the receiver's own level, damage share, group bonus, rate.
function killBaseXp(k: KillInput): number {
  const unit = k.receiver.groupId === null
    ? [k.receiver]
    : k.attackers.filter(a => a.groupId === k.receiver.groupId);
  const count = unit.length;
  const unitDamage = unit.reduce((sum, a) => sum + a.damage, 0);

  let base = count > 1 ? Math.ceil(k.mobXp / count) : k.mobXp; // even split (donor also re-levels this for mixed groups; omitted)
  const cap = Math.floor(k.levelXp(k.receiver.level) * (k.capPercent / 100) * k.mobExceedCap);
  base = Math.min(base, cap);                                  // cap FIRST, against the receiver's own level
  const share = Math.min(1, unitDamage / k.totalDamage);
  base = Math.floor(base * share);                             // damage share AFTER the cap
  if (base <= 0) return 0;

  const groupBonus = Math.floor(base * Math.max(0, count - 1) * k.groupBonusPerExtra);
  return Math.floor(base * k.xpRate) + groupBonus;             // rate applies to the base only, not to the bonus
}

// Apply an XP change. A loss can never take the player below the floor of the current level.
function applyXp(p: Player, delta: number, k: KillInput): void {
  const floor = k.levelXp(p.level);
  if (p.xp + delta < floor) delta = floor - p.xp;
  p.xp += delta;
  // one level step per call, and only on a gain (donor: Level++ once, not a loop)
  if (delta >= 0 && p.level < k.maxLevel && p.xp >= k.levelXp(p.level + 1)) p.level += 1;
}
```

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (new engine module): the one place a server-verified kill turns into XP for each contributor, and the one place XP changes (award and penalty) pass the level floor. Parity-checklist row 18 (loot roll and XP award).
- today: (not read; Frankendom's current XP code is outside this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only, shape not code)
- Brief rule served: one ledger and server-verified kills (XP is written only by the engine award); MAX_ATTACKERS = 3 (the even split and cap apply to at most three contributors); row 18.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the mechanism and was typechecked on the VPS only; it has no tests.
- Con colours come from an external table (`ConLevelGrid.cs` 73-74, data from an outside site). Frankendom has no con colour. Take the shape "a kill's base XP is set by the level gap of the awarded player", not the grid, and only if a designer wants it.
- Camp bonus is an idle-camping PvE mechanic keyed to time since spawn. The Pit is a fixed gladiator fight with no camping, so it does not transfer. For world zones it would be zone data (dungeon 0.66 and outside 0.55 in the donor), not a constant.
- Frankendom caps contributors at 3. The donor code read has no contributor cap; its group bonus and split scale with however many in range hit the mob. Our sketch inherits the cap by construction; it is not a copy of a donor limit.
- Level-up is one step per call (4424-4426). A single large award that crosses two thresholds gives one level until another award arrives. I did not find a catch-up loop in the code I read. Frankendom should loop, not copy the single step.
- The donor's death loss is applied twice (at death and at release, 5970-5971 and 1649), and the release amount goes to a gravestone. Whether to copy that double penalty is a design decision for the owner; it is not in the sketch.
- The donor's comments disagree with its code: the comment at 5908 says 5 percent and the comment at 5955 says half, but the code divides the first-death penalty by 3 (5960). Treat the code as the behaviour and the comments as stale.
- `AddXPGainer` (GamePlayer 5719) and the outpost bonus (AbstractServerRules 1442-) were not read. Who may be an XP gainer, and the outpost rate, are therefore not described here.
