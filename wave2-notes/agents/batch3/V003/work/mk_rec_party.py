import sys
FE="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/Fellowship.cs"
PX="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Xp.cs"
PM="/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/PropertyManager.cs"
rows=[
("Fellowship XP share flags are recomputed from member levels (function header)",FE,453,"private void CalculateXPSharing()"),
("Even-share level is read from the fellowship_even_share_level property",FE,463,'PropertyManager.GetLong("fellowship_even_share_level").Item'),
("fellowship_even_share_level defaults to level 50",PM,624,'new Property<long>(50, "level when fellowship XP sharing is no longer restricted")'),
("all members at or above the even-share level get even share regardless of level gap",FE,464,"!fellows.Values.Any(f => (f.Level ?? 1) < allEvenShareLevel)"),
("if the leader is offline the function returns early and leaves the previous flags",FE,474,"if (leader == null)"),
("level gap is the maximum of |leader level - member level|",FE,477,"fellows.Values.Max(f => Math.Abs((leader.Level ?? 1) - (f.Level ?? 1)))"),
("level gap <= 5 gives even share",FE,479,"if (maxLevelDiff <= 5)"),
("level gap <= 10 gives proportional share",FE,484,"else if (maxLevelDiff <= 10)"),
("SplitXp entry signature",FE,502,"public void SplitXp(ulong amount, XpType xpType, ShareType shareType, Player player)"),
("SplitXp strips the Fellowship share flag before granting to members",FE,508,"shareType &= ~ShareType.Fellowship;"),
("quest turn-ins are a flat split unless fellow_quest_bonus is set",FE,511,"xpType == XpType.Quest && !PropertyManager.GetBool(\"fellow_quest_bonus\").Item"),
("flat quest split is amount divided by member count",FE,513,"var perAmount = (long)amount / fellowshipMembers.Count;"),
("even-share total is amount x member share percent",FE,527,"(ulong)Math.Round(amount * GetMemberSharePercent())"),
("even-share per member is total x distance scalar",FE,531,"(ulong)Math.Round(totalAmount * GetDistanceScalar(player, member, xpType))"),
("even-share comment says level range but the code uses distance (stale comment)",FE,523,"divides XP evenly to all the sharable fellows within level range,"),
("proportional-share comment says level range (stale: code sums every member)",FE,541,"divides XP to all sharable fellows within level range"),
("proportional weight sum is over all members' XP to next level",FE,545,"fellowshipMembers.Values.Select(p => p.GetXPToNextLevel(p.Level.Value)).Sum()"),
("proportional scale is member weight divided by the sum",FE,549,"(double)member.GetXPToNextLevel(member.Level.Value) / levelXPSum"),
("proportional share is amount x scale x distance scalar",FE,551,"(ulong)Math.Round(amount * levelXPScale * GetDistanceScalar(player, member, xpType))"),
("member share percent function header",FE,604,"internal double GetMemberSharePercent()"),
("the share table stops at 9 members (TODO in code)",FE,628,"TODO: handle fellowship mods with > 9 players?"),
("max fellowship size is 9",FE,26,"public static int MaxFellows = 9;"),
("distance full-share radius constant is 600",FE,633,"public const int MaxDistance = 600;"),
("distance scalar signature",FE,639,"public double GetDistanceScalar(Player earner, Player fellow, XpType xpType)"),
("quest XP uses scalar 1.0 (distance ignored)",FE,644,"if (xpType == XpType.Quest)"),
("indoor/outdoor mismatch gives zero share",FE,650,"if (earner.Location.Indoors != fellow.Location.Indoors)"),
("indoors in different landblocks gives zero share",FE,654,"earner.Location.Landblock != fellow.Location.Landblock"),
("beyond 2x MaxDistance gives zero share",FE,659,"if (dist >= MaxDistance * 2.0f)"),
("within MaxDistance gives full share",FE,662,"if (dist <= MaxDistance)"),
("falloff between MaxDistance and 2x MaxDistance is linear",FE,665,"var scalar = 1.0f - (dist - MaxDistance) / MaxDistance;"),
("scalar is clamped at zero",FE,667,"return Math.Max(0.0f, scalar);"),
("GetFellowshipMembers keeps only members with a live session",FE,750,"if (player != null && player.Session != null && player.Session.Player != null"),
("GetFellowshipMembers signature",FE,738,"public Dictionary<uint, Player> GetFellowshipMembers()"),
("CalculateXPSharing runs on member join",FE,160,"CalculateXPSharing();"),
("OnFellowLevelUp entry point",FE,699,"public void OnFellowLevelUp(Player player)"),
("CalculateXPSharing runs again on level-up",FE,701,"CalculateXPSharing();"),
("GrantXP routes to SplitXp when fellowship ShareXP is on",PX,63,"Fellowship.ShareXP && shareType.HasFlag(ShareType.Fellowship)"),
("GrantXP hands the amount to SplitXp",PX,67,"Fellowship.SplitXp((ulong)amount, xpType, shareType, this);"),
("GrantXP signature",PX,53,"public void GrantXP(long amount, XpType xpType, ShareType shareType = ShareType.All)"),
("EarnXP applies enchantment and xp_modifier before GrantXP",PX,35,"var m_amount = (long)Math.Round(amount * enchantment * modifier);"),
("xp_modifier default is 1.0",PM,672,'new Property<double>(1.0, "scales the amount of xp received by players")'),
]
lines=[]
for claim,path,line,quote in rows:
    assert "\t" not in quote
    lines.append("\t".join(["ACEmulator-ACE",claim,path,str(line),quote]))
with open(sys.argv[1],"a") as f:
    f.write("\n".join(lines)+"\n")
print("appended",len(lines))
