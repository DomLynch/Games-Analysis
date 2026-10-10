G="alexbatalov-fallout2-ce"
S="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/"
rows=[
("XP needed to reach a level is a closed-form table: pcGetExperienceForLevel",S+"stat.cc",662,"int pcGetExperienceForLevel(int level)"),
("Odd levels use level/2 x level x 1000",S+"stat.cc",670,"return 1000 * v1 * level;"),
("Even levels use level/2 x (level-1) x 1000",S+"stat.cc",672,"return 1000 * v1 * (level - 1);"),
("Level cap is 99",S+"stat_defs.h",19,"#define PC_LEVEL_MAX 99"),
("AddExperience entry point with a2 flag for party level-ups",S+"stat.cc",731,"int pcAddExperienceWithOptions(int xp, bool a2, int* xpGained)"),
("Swift Learner adds 5 percent of the award per rank (integer division)",S+"stat.cc",737,"newXp += perkGetRank(gDude, PERK_SWIFT_LEARNER) * 5 * xp / 100;"),
("Stored XP is written after clamping",S+"stat.cc",747,"gPcStatValues[PC_STAT_EXPERIENCE] = newXp;"),
("Level loop runs while below the level cap",S+"stat.cc",749,"while (gPcStatValues[PC_STAT_LEVEL] < PC_LEVEL_MAX) {"),
("Loop breaks when XP is below the next level threshold",S+"stat.cc",750,"if (newXp < pcGetExperienceForNextLevel()) {"),
("HP per level = endurance/2 + 2",S+"stat.cc",771,"int hpPerLevel = endurance / 2 + 2;"),
("Lifegiver perk adds 4 HP per rank per level",S+"stat.cc",772,"hpPerLevel += perkGetRank(gDude, PERK_LIFEGIVER) * 4;"),
("Max HP bonus grows by hpPerLevel on level-up",S+"stat.cc",775,"critterSetBonusStat(gDude, STAT_MAXIMUM_HIT_POINTS, bonusHp + hpPerLevel);"),
("Current HP moves by the same delta as max HP",S+"stat.cc",778,"critterAdjustHitPoints(gDude, maxHpAfter - maxHpBefore);"),
("Kill XP comes from the victim proto experience value",S+"critter.cc",924,"return proto->critter.data.experience;"),
("Attack resolution sums XP for foes that died in this attack, not already dead",S+"actions.cc",1748,"if (attack->defender != nullptr && attack->defender != sourceObj) {"),
("Main target XP only if it was not dead before the attack",S+"actions.cc",1750,"if (sourceObj == gDude && !mainTargetWasDead) {"),
("Main target XP amount is the victim proto experience",S+"actions.cc",1751,"xp += critterGetExp(attack->defender);"),
("Extra targets XP only if not dead before the attack",S+"actions.cc",1763,"if (sourceObj == gDude && !extrasWasDead[index]) {"),
("Hero's own attack gives the summed XP immediately",S+"actions.cc",1796,"_combat_give_exps(xp);"),
("Living defenders record the hero as whoHitMe after damage",S+"actions.cc",1754,"_critter_set_who_hit_me(attack->defender, sourceObj);"),
("Kill XP is also accumulated inside damage application",S+"combat.cc",4862,"if (whoHitMe == gDude || (whoHitMe != nullptr"),
("Accumulated kill XP is added to the combat total",S+"combat.cc",4870,"_combat_exps += critterGetExp(a1);"),
("Combat end gives the accumulated total",S+"combat.cc",2816,"_combat_give_exps(_combat_exps);"),
("Combat end function",S+"combat.cc",2755,"static void _combat_over()"),
("Give-XP function pays through pcAddExperience",S+"combat.cc",2875,"pcAddExperience(exp_points, &xpGained);"),
("Proto default experience value is 60 (proto_critter_init)",S+"proto.cc",508,"data->experience = 60;"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/Q050/receipts.tsv","a")
for claim,path,line,q in rows:
    assert "\t" not in q and 15<=len(q.strip())<=90, (len(q),q)
    out.write("\t".join([G,claim,path,str(line),q])+"\n")
out.close()
print(len(rows),"rows appended")
