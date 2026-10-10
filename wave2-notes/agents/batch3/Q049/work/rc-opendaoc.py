import csv,sys
D='/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/'
NKRP=D+'serverrules/NpcKillRewardProcessor.cs'
ASR=D+'serverrules/AbstractServerRules.cs'
GP=D+'gameobjects/GamePlayer.cs'
SP=D+'serverproperty/ServerProperties.cs'
GL=D+'gameobjects/GameLiving.cs'
CLG=D+'gameutils/ConLevelGrid.cs'
N='OpenDAoC-OpenDAoC-Core'
rows=[
("kill base XP is the mob ExperienceValue, split when grouped",NKRP,65,"_baseXpReward = _isGrouped ? CalculateNpcExperienceModifiedByGroup()"),
("ProcessRewards caps base XP before damage share",NKRP,73,"_xpCap = CalculateXpCap();"),
("cap is applied with a min against base",NKRP,74,"_baseXpReward = Math.Min(_baseXpReward, _xpCap);"),
("comment: damage share must come after the cap",NKRP,79,"This has to be done after capping xp, otherwise a very low level player"),
("damage share multiplies base after the cap",NKRP,80,"_baseXpReward = (long) (_baseXpReward * _damagePercent);"),
("early return when base XP is zero (RP/BP already given)",NKRP,76,"if (_baseXpReward <= 0)"),
("realm points rewarded before the zero-XP return",NKRP,70,"RewardRealmPoints();"),
("damage percent = entity damage over total NPC damage",NKRP,98,"double damagePercent = _entityStats.Damage / _npcTotalDamage;"),
("damage percent clamped to 1.0",NKRP,100,"if (damagePercent > 1.0)"),
("group challenge threshold: 8 or more members means Red",NKRP,187,"if (memberCount >= 8)"),
("group challenge threshold: 4 or more members means Orange",NKRP,189,"else if (memberCount >= 4)"),
("same-band case returns ExperienceValue divided by members",NKRP,196,"return (long) Math.Ceiling((double) _npc.ExperienceValue / memberCount);"),
("mixed-level group: XP of a matched NPC level, divided",NKRP,242,"return (long) Math.Ceiling((double) _npc.GetExperienceValueForLevel(level) / memberCount);"),
("camp bonus full value depends on dungeon or not",NKRP,262,"double fullCampBonus = _npc.CurrentZone.IsDungeon"),
("camp bonus time test: 1800000 ms since spawn",NKRP,265,"if (GameLoop.GameLoopTime - _npc.SpawnTick > 1800000)"),
("camp bonus is a fraction of base XP",NKRP,273,"return (long) (_baseXpReward * Math.Max(0, campBonusPerc));"),
("group bonus = base x (contributors - 1) x 0.125",NKRP,284,"return (long) (_baseXpReward * (value.Count - 1) * 0.125);"),
("XP cap = level XP x XP_CAP_PERCENT / 100 x ExceedXPCapAmount",NKRP,253,"return (long) (xpCap * Properties.XP_CAP_PERCENT / 100.0"),
("cap uses the receiver's own level",NKRP,252,"long xpCap = GameServer.ServerRules.GetExperienceForLiving(_player.Level);"),
("award loop calls AwardPlayerOnNpcKill per contributor",ASR,1049,"AwardPlayerOnNpcKill(player, totalDamage, killedNpc, playerCountAndDamage"),
("camp bonus drops by 0.02 per kill",ASR,1057,"killedNpc.CampBonus -= 0.02;"),
("total damage counts every XP gainer, before range filter",ASR,1116,"totalDamage += pair.Value; // Should be done before excluding players."),
("any grey-con XP gainer denies the whole kill",ASR,1119,"if (pair.Key.IsObjectGreyCon(killedNpc) || pair.Key is GameGuard)"),
("only players in MAX_EXPFORKILL_DISTANCE get a share",ASR,1123,"player.IsWithinRadius(killedNpc, WorldMgr.MAX_EXPFORKILL_DISTANCE)"),
("contributor count and damage added per in-range player",ASR,1126,"ProcessDamage(player, pair.Value, player, mostDamagingPlayer, playerCountAndDamage);"),
("GetExperienceForLiving is the level XP table lookup",ASR,579,"return GameLiving.XPForLiving[level];"),
("GetExperienceForLiving declaration",ASR,573,"public virtual long GetExperienceForLiving(int level)"),
("living ExperienceValue = XP for its level",GL,487,"return GetExperienceValueForLevel(Level);"),
("ExceedXPCapAmount default is 1.0",GL,523,"get { return 1.0; }"),
("ExceedXPCapAmount declaration",GL,521,"public virtual double ExceedXPCapAmount"),
("XP_CAP_PERCENT server property, default 125",SP,729,"[ServerProperty(\"rates\", \"XP_Cap_Percent\""),
("XP_RATE server property",SP,741,"\"xp_rate\", \"The Experience Points Rate Modifier"),
("dungeon camp bonus default 0.66",SP,1881,"\"max_dungeon_camp_bonus\", \"Max camp bonus, 0.55 = 55%\""),
("outside camp bonus default 0.55",SP,1875,"\"max_camp_bonus\", \"Max camp bonus, 0.55 = 55%\""),
("guild XP buff default 5",SP,2275,"\"guild_buff_xp\", \"Extra XP gain percent for the guild"),
("XP-for-level table: level 2 needs 50",GP,4154,"50, // xp to level 2"),
("level-to-XP lookup uses level minus one",GP,4127,"return GetExperienceAmountForLevel(level - 1);"),
("MAX_LEVEL is 50",GP,4114,"public const byte MAX_LEVEL = 50;"),
("GainExperience ignores gains when GainXP is off",GP,4316,"if (!GainXP && expTotal > 0)"),
("zone bonus recomputed through a nested GainExperience",GP,4345,"GainExperience(new(zoneBonus, 0, 0, 0, 0, 0, false, false, eXPSource.Other), false);"),
("AllowMultiply: bonus removed from expTotal, base kept",GP,4335,"expTotal -= baseXp;"),
("XP_RATE multiplies the base XP only",GP,4352,"baseXp = (long) (baseXp * Properties.XP_RATE);"),
("XpPoints modifier applied to base",GP,4357,"baseXp += baseXp * xpBonus / 100;"),
("total re-formed as base plus bonuses",GP,4359,"expTotal += baseXp;"),
("floor clamp: never below current level XP",GP,4372,"else if (Experience + expTotal < ExperienceForCurrentLevel)"),
("floor clamp body",GP,4374,"expTotal = ExperienceForCurrentLevel - Experience;"),
("level 5 gate: needs advancement, else message only",GP,4411,"if (Level >= 5 && !CharacterClass.HasAdvancedFromBaseClass())"),
("level 40 second stage branch",GP,4419,"else if (Level >= 40 && Level < MAX_LEVEL && !IsLevelSecondStage"),
("one level step per call when XP reaches next level",GP,4424,"else if (Level < MAX_LEVEL && Experience >= ExperienceForNextLevel)"),
("second-stage spec points = SpecPointsMultiplier x Level / 20",GP,4795,"int specpoints = CharacterClass.SpecPointsMultiplier * Level / 20;"),
("death XP loss percent: 50 minus level below 40",GP,5912,"xpLossPercent = MAX_LEVEL - Level;"),
("death XP loss percent above 40 is 10",GP,5916,"xpLossPercent = MAX_LEVEL - 40;"),
("first death divides the penalty by 3",GP,5960,"xpLossPercent /= 3;"),
("second death multiplies by 2/3",GP,5964,"xpLossPercent = xpLossPercent * 2 / 3;"),
("death loss = span x per-mille / 1000",GP,5970,"long xpLoss = (ExperienceForNextLevel - ExperienceForCurrentLevel)"),
("death applies the loss via GainExperience, no multiply",GP,5971,"GainExperience(new(-xpLoss, 0, 0, 0, 0, 0, false, true, eXPSource.Other));"),
("release applies the stored loss a second time",GP,1649,"GainExperience(eXPSource.Other, -lastDeathExpLoss);"),
("comment: 5 percent first penalty (does not match 1/3 code)",GP,5908,"first penalty is 5% of expforlevel, second penalty comes from release"),
("comment: half penalty first death (code divides by 3)",GP,5955,"if this is the first death in level, you lose only half the penalty"),
("ConColor Grey = -3",CLG,226,"Grey = -3,"),
("ConColor Yellow = 0",CLG,229,"Yellow = 0,"),
("ConColor Red = 2",CLG,231,"Red = 2,"),
("inside GainExperience base multiply uses XP_RATE for RvR zones",GP,4350,"baseXp = (long) (baseXp * Properties.RvR_XP_RATE);"),
("death XP loss sits in ProcessDeath",GP,5733,"public override void ProcessDeath(GameObject killer)"),
("release XP loss sits in Release",GP,1391,"public virtual void Release(eReleaseType releaseCommand, bool forced)"),
("only caller of NpcKillRewardProcessor constructor",ASR,1198,"NpcKillRewardProcessor processor = new("),
]

print('\t'.join(['note','claim','donor_file','line','quote']))
for c,f,l,q in rows:
    assert '\t' not in q
    print('\t'.join([N,c,f,str(l),q]))
