import csv,sys
S='/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/'
FS=S+'Entity/Fellowship.cs'; PX=S+'WorldObjects/Player_Xp.cs'; CD=S+'WorldObjects/Creature_Death.cs'
DH=S+'Entity/DamageHistory.cs'; PM=S+'Managers/PropertyManager.cs'
N='ACEmulator-ACE'
rows=[
("kill XP award: each damager gets XpOverride times their damage share",CD,167,"public void OnDeath_GrantXP()"),
("kill XP is granted at death, before the corpse, unless the landblock blocks it",CD,51,"if (!IsOnNoDeathXPLandblock)"),
("damage share = this attacker's damage over total damage",CD,191,"var damagePercent = totalDamage / totalHealth;"),
("kill XP per damager = XpOverride x damage share",CD,193,"var totalXP = (XpOverride ?? 0) * damagePercent;"),
("kill XP is passed to EarnXP as XpType.Kill",CD,195,"playerDamager.EarnXP((long)Math.Round(totalXP), XpType.Kill);"),
("total health is the sum of all damage credit",DH,54,"public float TotalHealth => TotalDamage.Values.Sum(i => i.TotalDamage);"),
("heal rescales every attacker's credit",DH,140,"private void OnHealInternal(uint healAmount, uint currentHealth, uint maxHealth)"),
("missing health before the heal",DH,143,"var missingHealth = maxHealth - (currentHealth - healAmount);"),
("heal scalar 1 - heal / missing",DH,145,"var scalar = 1.0f - (float)healAmount / missingHealth;"),
("heal applies scalar to each attacker",DH,150,"TotalDamage[attacker].TotalDamage *= scalar;"),
("EarnXP applies the server xp_modifier",PX,28,"var modifier = PropertyManager.GetDouble("),
("EarnXP applies the enchantment/aug modifier once, before any split",PX,35,"var m_amount = (long)Math.Round(amount * enchantment * modifier);"),
("GrantXP hands off to the fellowship split when ShareXP is on",PX,63,"if (Fellowship != null && Fellowship.ShareXP && shareType.HasFlag(ShareType.Fellowship))"),
("GrantXP calls SplitXp",PX,67,"Fellowship.SplitXp((ulong)amount, xpType, shareType, this);"),
("UpdateXpAndLevel caps XP at the max-level total",PX,100,"if (amount > amountLeftToEnd)"),
("level-up loop reads the dat XP table",PX,288,"while ((ulong)(TotalExperience ?? 0) >= xpTable.CharacterLevelXPList[(Level ?? 0) + 1])"),
("augmentation adds 0.05 per level to kill XP",PX,502,"if (xpType == XpType.Kill && AugmentationBonusXp > 0)"),
("augmentation bonus is 0.05 per level",PX,503,"augBonus = AugmentationBonusXp * 0.05f;"),
("modifier is 1 + enchantment + augmentation",PX,505,"var modifier = 1.0f + enchantmentBonus + augBonus;"),
("sharing is decided by CalculateXPSharing",FS,453,"private void CalculateXPSharing()"),
("all members at or above the even-share level share evenly",FS,463,"var allEvenShareLevel = PropertyManager.GetLong"),
("the even-share level check",FS,464,"var allOverEvenShareLevel = !fellows.Values.Any("),
("even share when all members are over the level",FS,466,"if (allOverEvenShareLevel)"),
("leader is the reference for the level band",FS,473,"var leader = PlayerManager.GetOnlinePlayer(FellowshipLeaderGuid);"),
("no online leader returns early, keeping the old share flags",FS,474,"if (leader == null)"),
("max level difference from the leader",FS,477,"var maxLevelDiff = fellows.Values.Max("),
("within 5 levels: even share",FS,479,"if (maxLevelDiff <= 5)"),
("within 10 levels: proportional share",FS,484,"else if (maxLevelDiff <= 10)"),
("SplitXp signature",FS,502,"public void SplitXp(ulong amount, XpType xpType, ShareType shareType, Player player)"),
("split strips the fellowship flag before granting",FS,508,"shareType &= ~ShareType.Fellowship;"),
("quest XP has a flat split unless the bonus is on",FS,511,"if (xpType == XpType.Quest && !PropertyManager"),
("even-share branch",FS,525,"else if (EvenShare)"),
("even-share total is amount x member share percent",FS,527,"var totalAmount = (ulong)Math.Round(amount * GetMemberSharePercent());"),
("even-share member amount uses the distance scalar",FS,531,"var shareAmount = (ulong)Math.Round(totalAmount * GetDistanceScalar("),
("proportional branch sums XP-to-next-level over all members",FS,545,"var levelXPSum = fellowshipMembers.Values.Select("),
("proportional scale is XP-to-next-level share",FS,549,"var levelXPScale = (double)member.GetXPToNextLevel(member.Level.Value) / levelXPSum;"),
("proportional member amount",FS,551,"var playerTotal = (ulong)Math.Round(amount * levelXPScale"),
("member share percent function",FS,604,"internal double GetMemberSharePercent()"),
("two-member share is .75",FS,613,"return .75;"),
("distance scalar function",FS,639,"public double GetDistanceScalar(Player earner, Player fellow, XpType xpType)"),
("indoor/outdoor mismatch gives 0",FS,650,"if (earner.Location.Indoors != fellow.Location.Indoors)"),
("distance at or past 2 x MaxDistance gives 0",FS,659,"if (dist >= MaxDistance * 2.0f)"),
("distance within MaxDistance gives 1",FS,662,"if (dist <= MaxDistance)"),
("linear falloff between MaxDistance and 2 x MaxDistance",FS,665,"var scalar = 1.0f - (dist - MaxDistance) / MaxDistance;"),
("MaxDistance is 600",FS,633,"public const int MaxDistance = 600;"),
("fellowship members: online players with a session",FS,750,"if (player != null && player.Session != null"),
("fellowship even-share level property default 50",PM,624,"new Property<long>(50,"),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    for claim,f_,ln,q in rows:
        w.writerow([N,claim,f_,str(ln),q])
print(len(rows))
