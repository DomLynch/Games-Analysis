# OpenDAoC-OpenDAoC-Core (death-respawn-penalty, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/` (gameobjects/GamePlayer.cs, gameobjects/GameGravestone.cs, ECS-Services/GravestoneService.cs, gameobjects/GameLiving.cs, events/gameobjects/GainedExperienceEventArgs.cs, ECS-Effects/ResurrectionIllnessECSEffect.cs, serverproperty/ServerProperties.cs) | Licence: GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (`/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/LICENSE`) | C# | symbol `GamePlayer.ProcessDeath` (5733) with `GamePlayer.Release` (1391)

Checked: Read in full: GamePlayer.ProcessDeath death-penalty block (5836-5986 region, including the PvP and PvE branches, DeathCount, con loss, release timer start 5888-5895), Release (1391-1430 and the penalty block 1636-1665), ReleaseTimerCallback (1722-1745), GainExperience (4312-4375), GameLiving.GainExperience overload (2003-2008), GainedExperienceEventArgs constructor (19-31), GameGravestone (1-148), GravestoneService (1-120), ResurrectionIllnessECSEffect (1-40), prayer at grave (1850-1877), property defaults (ServerProperties 685, 741, 1349, 1983, 1989). Candidates opened and set aside for this topic: ServerRules PvP/PvE stats files (only stat text), Healer.cs (cure path, lines not used). Confidence: high on the penalty order and numbers; medium on the release routing (only the Normal branch read in full); not read: the function that holds the DeathCount reset at 4747, the CL/ML death path, the item and durability side (not searched), the full body of the 1-hour rez logic. Necromancy on corpses: not searched. Item loss on death: not searched.

Best transferable idea: a death costs XP in two stages, one at death and one at release, and the release stage is kept in a grave that the player recovers by praying near it, so a loss is recoverable and not just taken.
Decision (proposed): adapt — keep the two-stage loss, the grave-and-pray recovery and the PvP-free death, but make the loss a fixed data field (no XP rate or XP item scaling), let the grave accumulate instead of being overwritten, and fix the stale 5% comment.
Acceptance: a level 6 PvE death (test character seeded with at least 2 stage amounts of XP above the level's start, so the level-start floor does not clamp the loss) shows the stage-one loss at death (1.4 percent of the level's XP span) and the same amount again at release; the grave holds that release amount; praying 5 s at the grave returns it in full; a second death before praying adds to the grave rather than replacing it (server test).

## 1. Mechanism

Order of events on a death, as the code runs (ProcessDeath, GamePlayer.cs 5733 on):

- (a) Killer and realm decide the branch. `killingBlowByEnemyRealm || InCombatPvP || killer?.Realm == Realm` (5919) marks a PvP-style death (`LastDeathPvP = true`). On a normal (RvR) server the death costs no XP and no con (5924-5932, `xpLossPercent = 0`, `m_deathtype = RvR`). On a PvP server it also costs no XP; con loss 3 applies when `PVP_DEATH_CON_LOSS` is true (5939-5944, default true).
- (b) Otherwise, a PvE death at or above `PVE_EXP_LOSS_LEVEL` (default 6, 5952) starts the loss. The base is `MAX_LEVEL - Level` (50 minus level, in per-mille of the level's XP span) for levels below 40, else `MAX_LEVEL - 40` = 10 (5908-5917). The first death this level takes one third of the base, the second takes two thirds, later deaths take the full base (5956-5966). `DeathCount` then increments (5968).
- (c) Stage one, at death. `xpLoss = (ExperienceForNextLevel - ExperienceForCurrentLevel) * xpLossPercent / 1000` (5970). It is applied right away with `GainExperience(new(-xpLoss, ..., false, true, Other))` (5971), i.e. with allowMultiply = true, so it goes through the gain multiplier path (section 6). The amount is stored in `DEATH_EXP_LOSS_PROPERTY` (5972).
- (d) Con loss, PvE. Gated by its own level property `PVE_CON_LOSS_LEVEL` (default 6; ServerProperties 1989-1990; checked at 5975 and again at release 1656), not by `PVE_EXP_LOSS_LEVEL`. `conLoss = DeathCount` clamped to 1..3 (5977-5981, stored as a temp property, applied at release). `DeathCount` only increments inside the exp-loss branch (5968), so a level between the two gates would get con loss of 1 with no count growth.
- (e) Release timer. The death timer is `RELEASE_TIME` = 900 s (1365), counted down by `ReleaseTimerCallback` (1722-1745): warnings at about 30 s and about 10 s remaining, release when zero. A duel death sets `m_automaticRelease` (5888) and releases after `RELEASE_MINIMUM_WAIT` = 10 s (1360, 1727).
- (f) Stage two, at release. `Release` (1642-1654): if level is at or above `PVE_EXP_LOSS_LEVEL` and the character is not hardcore, `lostExp = Experience` (1645), the stored stage-one value is removed again with `GainExperience(eXPSource.Other, -lastDeathExpLoss)` (1649, allowMultiply false, so no scaling), `lostExp -= Experience` (1650) gives the amount actually taken in stage two, and if it is positive `GameGravestone.Create(this, lostExp)` (1652-1653).
- (g) Con loss applied at release (1656-1665): `TotalConstitutionLostAtDeath += deathConLoss` (1662).
- (h) Grave. `GameGravestone.Create` (GameGravestone.cs 18-35) reuses the single grave: `PruneExcessGravestonesAndGetReusable` allows one per character (GravestoneService.cs 49-88, `MAX_GRAVESTONES_PER_PLAYER = 1`), then `Initialize` writes the new XP into `_xpValue` (132), overwriting any unclaimed amount. Graves decay after `GRAVESTONE_DECAY_TIME` days, default 7, checked daily; 0 means never (GravestoneService 90-93; ServerProperties 685-686).
- (i) Recovery. Praying at the grave (GamePlayer.cs 1840-1877): must be the owner, alive, not riding, within 2000 units (1849) and still; sits and runs an action for 5000 ms (1874), then `gravestone.Consume()` (1864) and `GainExperience(eXPSource.Praying, xpValue)` (1869). That gain has no allowMultiply, so the XP comes back unscaled.
- (j) Resurrection sickness (for reference). `ResurrectionIllnessECSGameEffect` (ECS-Effects, 1-40): while active it lowers `player.Effectiveness` by `Spell.Value * 0.01` (26) and returns on stop; duration is cut by `ResIllnessReduction` (19) and by a higher-level rez property (10-16).

## 2. Key functions

- `GamePlayer.ProcessDeath`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 5733-5986. The death branches, stage one, con loss, release timer.
- `GamePlayer.Release` (penalty block): same file 1391-1430 and 1636-1665. Stage two, grave creation, con loss at release.
- `GamePlayer.ReleaseTimerCallback`: same file 1722-1745. The 900 s timer and the duel minimum.
- `GamePlayer.GainExperience` (override): same file 4312-4375. Multiply path (4332-4359), level floor (4372-4375).
- `GameLiving.GainExperience(eXPSource, long, bool allowMultiply = false)`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameLiving.cs` 2003-2005.
- `GameGravestone.Create` and `Consume`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameGravestone.cs` 18-44, 122-135.
- `GravestoneService.PruneExcessGravestonesAndGetReusable`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Services/GravestoneService.cs` 49-88.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and formula |
|---|---|
| Base loss = (max level - level) per mille of the level's XP span, flat from level 40 (5912-5917) | max level 50 (GamePlayer.cs 4114); flat from 40 gives 10 per mille |
| Share by death count inside one level: integer 1/3, then 2/3, then full (5960, 5964) | e.g. level 6: base 44 per mille; first death 14 (1.4 percent of span); second 29 (2.9 percent); third and later 44 (4.4 percent) |
| Stage two equals stage one at release, and the release amount is what the grave holds (1645-1653) | same value; the grave holds the release-stage amount |
| Con loss = death count clamped 1..3 (5977-5981) | 1 to 3 |
| PvP server con loss (5942-5943) | 3 points, switch `PVP_DEATH_CON_LOSS` default true (ServerProperties 1349) |
| Release timer (1365) | 900 s |
| Duel auto release (1360, 1727) | 10 s minimum |
| Warnings near release (1738-1750) | about 10 s and about 30 s before release |
| Prayer channel (1874) | 5000 ms, must be near and still |
| Grave decay (ServerProperties 685) | 7 days default, 0 = never |
| One grave per character (GravestoneService 51) | 1 |
| PvE loss level gate (ServerProperties 1983) | `pve_exp_loss_level` default 6 |
| XP rate (ServerProperties 741) | default 1.0; applied to stage one only (4352) |

## 4. TypeScript sketch

simplified: keeps the level base, the one-third and two-thirds shares by death count, the two-stage loss (stage one at death, the same amount at release into a grave), the con loss clamp and the prayer claim. Omits the realm and PvP branches, the hardcore flag, the group rule, the duel auto release and timers, the level-span lookup (passed in as `levelSpanXp`), the level floor clamp, the decay, the con-loss application at release, and the resurrection sickness effect. Two deliberate changes, not donor behaviour: stage one is not scaled by XP rate or XP item bonus (donor 4332-4359), and a new death adds to an unclaimed grave instead of replacing it (donor GameGravestone 132).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Two-stage PvE death penalty: part is taken at death, the same amount again at release and kept in a grave.
export interface PenaltyCfg {
  maxLevel: number;   // donor 50
  flatFrom: number;   // donor 40: levels at or above this use the flat base
}

// Base loss in per-mille of the level's XP span. Donor: maxLevel - level, or maxLevel - flatFrom from flatFrom up.
export function basePermille(level: number, c: PenaltyCfg): number {
  return c.maxLevel - Math.min(level, c.flatFrom);
}

// Share of the base by PvE deaths already counted this level. Donor: integer /3, then *2/3, then full.
export function shareOfBase(base: number, deathsBefore: number): number {
  if (deathsBefore === 0) return Math.trunc(base / 3);
  if (deathsBefore === 1) return Math.trunc((base * 2) / 3);
  return base;
}

export interface PveDeathPenalty {
  stage1Xp: number;   // taken at death
  stage2Xp: number;   // taken at release and put into the grave
  conLoss: number;    // 1 to 3, by death count
}

export function pveDeath(level: number, levelSpanXp: number, deathsBefore: number, c: PenaltyCfg): PveDeathPenalty {
  const amount = Math.trunc((levelSpanXp * shareOfBase(basePermille(level, c), deathsBefore)) / 1000);
  const deathsNow = deathsBefore + 1;
  // Fix: no XP rate or XP item bonus on the loss; the donor scales stage one only.
  return { stage1Xp: amount, stage2Xp: amount, conLoss: Math.min(3, Math.max(1, deathsNow)) };
}

export interface Grave {
  xp: number;         // unclaimed XP held by the grave
  createdAtMs: number;
}

// Donor: one grave per character, and a new death overwrites an unclaimed grave.
// Fix: the XP accumulates, so an unclaimed grave is never silently emptied.
export function placeGrave(prev: Grave | undefined, xp: number, now: number): Grave {
  return { xp: (prev?.xp ?? 0) + xp, createdAtMs: now };
}

// Praying at the grave (donor: 5 s channel, must be near and still) returns the stored XP unscaled.
export function claimGrave(g: Grave): { xpBack: number; cleared: Grave } {
  return { xpBack: g.xp, cleared: { xp: 0, createdAtMs: g.createdAtMs } };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR003-OpenDAoC-death.ts): exit 0.

Worked example from the sketch (level 6, span S): base 44; first death trunc(44/3) = 14, so 0.014 S at death and 0.014 S at release; second death trunc(88/3) = 29, so 0.029 S each stage.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module, shared with the TrinityCore note: death window, release, grave). Parity-checklist row 17 (death/respawn).
- Current Frankendom death code was not read in this pass; the file above is the proposed home.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: rule 4 (server-verified: the grave and the claim are server state) and rule 1 (one engine; the grave prompt and timer are client display only); parity row 17

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Defect 1, the comment and the code disagree. The comment at 5908 says "first penalty is 5% of expforlevel". The code gives about 1.4 percent at level 6 and 0.3 percent at level 40 and above (base 10, first death 3). Fix: the percent is a data field; the comment is removed or made true.
- Defect 2, stage one is scaled, stage two is not. Stage one goes through the multiply path (5971 with allowMultiply true, then 4335, 4352, 4357, 4359), so it is multiplied by `XP_RATE` (1.0 default) or the RvR rate in RvR regions (4349-4350), and by the player's XpPoints bonus. Stage two (1649) is unscaled. With `XP_RATE` = 2.0 the first loss doubles and the second does not. Fix: death loss is a fixed data field; never routed through gain multipliers.
- Defect 5 (checker-found, verified): the XP floor. `GainExperience` clamps a negative gain so XP cannot fall below the level start (GamePlayer.cs 4372-4375). A character near the level start loses less than the formula in stage one, and stage two takes only what is left (`lostExp -= Experience`), so the grave can be small or absent (no grave when `lostExp` is not positive, 1652). The sketch omits the clamp, so its `stage2Xp` equals `stage1Xp` only when the character has enough XP above the level start. Fix: in the build, clamp each stage to the XP actually held and put the real stage-two amount in the grave.
- Defect 3, a grave is silently overwritten. `Create` reuses the single grave (GameGravestone 20-27), `Initialize` sets `_xpValue` (132), so an unclaimed grave's XP is lost when the next death happens. Fix: accumulate (sketch) or refuse and warn.
- Possible defect 4, hardcore in a group. The hardcore group rule sets `expTotal = 0` when any group member is more than 5 levels above (4319-4328). That same path receives the negative stage-one value, so a hardcore player in such a group may take no stage-one loss at death. Not confirmed by a test; the intent was not read. Fix: decide and test.
- The release stage is skipped for hardcore (1642) but stage one is not, so hardcore takes stage one only.
- Frankendom rulings: the death tier by PvP flag fits (no XP loss on a player kill, loss on a PvE death), and the grave-and-pray is a server state the client only shows. Duel auto release (10 s) maps to the Pit's post-fight release, which fits "Pit as client".
- Not verified: the item and durability side of death, the full Release routing (only the Normal branch read), the function that resets DeathCount at 4747, the resurrection spell durations (DB).
- For progression (the level span): stage one depends on `ExperienceForNextLevel - ExperienceForCurrentLevel`, so the loss scales with the level's XP table. Frankendom should store the table, not a fixed number.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: rule 4 (server-verified grave and claim) and rule 1 (one engine); parity row 17


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mostly exact: base 50-level / flat 10 from 40 (GamePlayer.cs 5908-5917), 1/3 and 2/3 integer shares via DeathCount (5956-5966), DeathCount++ 5968, xpLoss 5970, GainExperience allowMultiply=true 5971 (ctor arg1 is ExpBase so XP_RATE does scale stage one, defect 2 is real), Release 1642-1654 second removal and gravestone create, RELEASE_TIME 900 / MIN_WAIT 10, 5000 ms prayer, one-grave reuse and overwrite at GameGravestone.cs 132, GravestoneService 51, decay 7 days, defaults 6/6/true/1.0, GPL-3. Small slips: PvP-server branch con-loss lines are 5942-5948 not 5939-5944; the note says con loss gated by PVE_EXP_LOSS_LEVEL context but the donor gates it by a separate PVE_CON_LOSS_LEVEL (5977 block, ServerProperties 1989) and DeathCount only increments inside the exp-loss branch. Acceptance risk (not a donor error): GamePlayer.GainExperience clamps a negative gain so XP cannot fall below the level start (4372-4375); a level-6 test character sitting at/near level start gets a smaller stage one and a smaller or zero stage two (no grave since lostExp>0 check at 1652), so 'same amount again at release' fails unless the test seeds enough XP above level floor. The sketch also omits that clamp (listed as omitted).
Missed: Separate PVE_CON_LOSS_LEVEL gate (ServerProperties 1989) and the XP floor clamp at level start (GamePlayer.cs 4372-4375) which makes stage two shrink to what the player actually still has; prayer radius 2000 units (GamePlayer.cs ~1850 IsWithinRadius(gravestone,2000)).

Fixed 2026-10-12 (Sonnet fixer): acceptance now seeds the test character with XP above the level floor (the donor clamps loss at level start, 4372-4375, so the old acceptance could fail a correct build); the clamp is added to Gaps as Defect 5; con-loss gate corrected to `PVE_CON_LOSS_LEVEL` (verified 5975, 1656, ServerProperties 1990); prayer conditions corrected (owner, 2000-unit radius at 1849). Not changed: PvP con-loss cite 5939-5944 (the verified `if`/set block is 5940-5944, so the note stands). Also found: the 2000-unit prayer radius, added above.
