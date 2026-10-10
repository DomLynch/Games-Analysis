import sys
D="/mnt/frankendom-donors/flareteam-flare-engine/src/"
G="flareteam-flare-engine"
rows=[
("kill XP award sits in StatBlock::takeDamage","StatBlock.cpp",879,"void StatBlock::takeDamage(float dmg, bool crit, int source_type) {"),
("death rewards only for non-hero, non-ally-or-converted enemies","StatBlock.cpp",893,"if (!hero_ally || converted) {"),
("death reward comment","StatBlock.cpp",892,"// enemy died; do rewards"),
("party share multiplier","StatBlock.cpp",920,"xp_multiplier = eset->misc.party_exp_percentage / 100.0f;"),
("level-scaling multiplier applied to kill XP","StatBlock.cpp",922,"xp_multiplier *= xp_scaling->getMultiplier(this, &(pc->stats));"),
("kill XP passed to rewardXP with silent flag","StatBlock.cpp",924,"camp->rewardXP(static_cast<float>(xp) * xp_multiplier, !CampaignManager::XP_SHOW_MSG);"),
("loot generated after XP reward","StatBlock.cpp",927,"loot->addEnemyLoot(this);"),
("default party share 100 percent","EngineSettings.cpp",73,"party_exp_percentage = 100;"),
("XP_GAIN stat key","Stats.cpp",101,'KEY[XP_GAIN] = "xp_gain";'),
("silent kill flag is a constant true","CampaignManager.h",72,"static const bool XP_SHOW_MSG = true;"),
("neutral multiplier when no scaling table","XPScaling.cpp",139,"if (!enemy_stats || !player_stats || enemy_stats->xp_scaling_table == 0)"),
("getMultiplier signature","XPScaling.cpp",136,"float XPScaling::getMultiplier(StatBlock* enemy_stats, StatBlock* player_stats) {"),
("absolute table keyed by enemy level","XPScaling.cpp",147,"int level = enemy_stats->level;"),
("absolute table hit multiplies","XPScaling.cpp",151,"multiplier *= absolute_it->second;"),
("absolute clamp above max level","XPScaling.cpp",156,"else if (level > table.absolute_level_max)"),
("absolute clamp uses max-level entry","XPScaling.cpp",157,"multiplier *= table.absolute[table.absolute_level_max];"),
("relative table keyed by enemy minus player level","XPScaling.cpp",162,"int level = enemy_stats->level - player_stats->level;"),
("relative table hit multiplies","XPScaling.cpp",166,"multiplier *= relative_it->second;"),
("gap filling at load","XPScaling.cpp",119,"// ensure there are no gaps in the level tables"),
("rewardXP signature","CampaignManager.cpp",207,"void CampaignManager::rewardXP(float amount, bool show_message) {"),
("dead-frame gate in rewardXP","CampaignManager.cpp",208,"if (pc->block_xp_gain)"),
("XP_GAIN percent bonus on each award","CampaignManager.cpp",211,"bonus_xp += (amount * (100.0f + static_cast<float>(pc->stats.get(Stats::XP_GAIN))))"),
("whole XP taken from accumulator","CampaignManager.cpp",213,"int whole_xp = static_cast<int>(bonus_xp);"),
("whole XP added to total","CampaignManager.cpp",214,"pc->stats.addXP(whole_xp);"),
("fraction kept for next award","CampaignManager.cpp",215,"bonus_xp -= static_cast<float>(whole_xp); // remainder"),
("addXP signature","StatBlock.cpp",1543,"void StatBlock::addXP(int amount) {"),
("total XP capped at max-level threshold in addXP","StatBlock.cpp",1547,"xp = std::min(xp, xp_max);"),
("recalc clamps hero XP to max and derives level","StatBlock.cpp",957,"level = eset->xp.getLevelFromXP(xp);"),
("max spendable stat points","StatBlock.cpp",1412,"max_spendable_stat_points = eset->xp.getMaxLevel() * stat_points_per_level;"),
("stat points per level default 1","StatBlock.cpp",102,", stat_points_per_level(1)"),
("level-up restore HP only if flagged","StatBlock.cpp",967,"if (!level_up || (level_up && (levelup_restore_hp || hp > get(Stats::HP_MAX))))"),
("getLevelFromXP scans table","EngineSettings.cpp",1359,"if (level_xp >= xp_table[i])"),
("getLevelXP returns 0 at level 1 or below","EngineSettings.cpp",1343,"if (level <= 1 || xp_table.empty())"),
("getLevelXP clamps above table","EngineSettings.cpp",1346,"return xp_table.back();"),
("XP table loader signature","EngineSettings.cpp",1298,"void EngineSettings::XPTable::load() {"),
("load repairs non-increasing XP thresholds","EngineSettings.cpp",1331,"xp_table[i] = xp_table[i-1] + 1;"),
("level-up check each frame in Avatar::logic","Avatar.cpp",523,"stats.xp >= eset->xp.getLevelXP(stats.level + 1)"),
("level recomputed from total XP","Avatar.cpp",525,"stats.level = eset->xp.getLevelFromXP(stats.xp);"),
("one-frame window comment","Avatar.cpp",543,"we have a window of 1 frame to check if the player leveled up when dying"),
("death-frame XP block set each frame","Avatar.cpp",544,"block_xp_gain = (stats.hp == 0);"),
("Avatar::logic signature","Avatar.cpp",463,"void Avatar::logic() {"),
("total-XP death penalty switch","MenuInventory.cpp",321,"if (eset->death_penalty.xp > 0) {"),
("current-level death penalty branch","MenuInventory.cpp",326,"else if (eset->death_penalty.xp_current > 0) {"),
("current-level penalty base","MenuInventory.cpp",327,"if (pc->stats.xp - eset->xp.getLevelXP(pc->stats.level) > 0)"),
("death penalty floor check","MenuInventory.cpp",333,"if (pc->stats.xp < eset->xp.getLevelXP(pc->stats.level))"),
("death penalty floor set","MenuInventory.cpp",334,"pc->stats.xp = eset->xp.getLevelXP(pc->stats.level);"),
("level_up flag cleared by menu","MenuManager.cpp",663,"pc->stats.level_up = false;"),
("skill points formula","MenuCharacter.cpp",885,"skill_points = ((pc->stats.level - 1) * pc->stats.stat_points_per_level) - spent;"),
("event XP reward path","EventManager.cpp",1150,"camp->rewardXP(static_cast<float>(ec->data[0].Int), CampaignManager::XP_SHOW_MSG);"),
("hero XP cap in recalc","StatBlock.cpp",955,"xp = std::min(xp, xp_max);"),
("dead target guard in takeHit","Entity.cpp",338,"//if the target is already dead, they cannot be hit"),
("dead target guard condition","Entity.cpp",339,"if (stats.cur_state == StatBlock::ENTITY_DEAD"),
("takeHit applies damage via takeDamage","Entity.cpp",532,"stats.takeDamage(dmg, crit, h.source_type);"),
("reflect damage also calls takeDamage (guard not read)","Entity.cpp",604,"h.src_stats->takeDamage(dmg_return"),
("default death penalty xp_current_level 0","/mnt/frankendom-donors/flareteam-flare-engine/mods/default/engine/death_penalty.txt",14,"xp_current_level=0"),
]
out=[("note","claim","donor_file","line","quote")]
for claim,f,line,q in rows:
    path = f if f.startswith("/") else D+f
    out.append((G,claim,path,str(line),q))
# game-data receipts from the sibling donor (read-only)
out.append((G,"sample XP table (empyrean_campaign) level 20 threshold","/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/engine/xp_table.txt","20","level=20,134217472"))
out.append((G,"sample XP scaling table (il.txt) level 20 multiplier","/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/enemies/xp_scaling/il.txt","21","level=20,508288"))
with open(sys.argv[1],"w") as fh:
    for r in out: fh.write("\t".join(r)+"\n")
for r in out[1:]:
    if not (15<=len(r[4])<=90): print("LEN",len(r[4]),r[1])
print(len(out)-1,"receipts")
