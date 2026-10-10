import csv,sys
G="rathena-rathena"
M="/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp"
H="/mnt/frankendom-donors/rathena-rathena/src/map/mob.hpp"
B="/mnt/frankendom-donors/rathena-rathena/src/map/battle.cpp"
MC="/mnt/frankendom-donors/rathena-rathena/conf/battle/monster.conf"
CC="/mnt/frankendom-donors/rathena-rathena/conf/battle/client.conf"
LIC="/mnt/frankendom-donors/rathena-rathena/LICENSE"
rows=[
("retarget gate: changetarget rules by AI state","%s"%M,1229,"static int32 mob_can_changetarget(mob_data* md, block_list* target, int32 mode)"),
("retarget in rush state needs MD_CHANGETARGETCHASE","%s"%M,1252,"return (mode&MD_CHANGETARGETCHASE);"),
("berserk retarget needs MD_CHANGETARGETMELEE","%s"%M,1242,"if (!(mode&MD_CHANGETARGETMELEE))"),
("mob_target locks the target id","%s"%M,1302,"md->target_id = bl->id;"),
("active search function","%s"%M,1314,"static int32 mob_ai_sub_hard_activesearch(block_list *bl,va_list ap)"),
("weak-target filter: skip targets at level >= mob level - 5","%s"%M,1330,"if ((mode&MD_TARGETWEAK) && status_get_lv(bl) >= md->level-5)"),
("nearest-wins: replace target only if current is not within the new distance","%s"%M,1346,"((*target) == nullptr || !check_distance_bl(md, *target, dist)) &&"),
("candidate must be inside range2 (view range) to be picked","%s"%M,1347,"battle_check_range(md,bl,md->db->range2)"),
("path length gate: standing range2, walking range3","%s"%M,1354,"if ((md->ud.walktimer == INVALID_TIMER && wpd.path_len > md->db->range2)"),
("changechase: rush/follow re-target within min(view, weapon range)","%s"%M,1384,"if(battle_check_range (md, bl, md->status.rhw.range))"),
("changechase search call","%s"%M,2040,"map_foreachinallrange (mob_ai_sub_hard_changechase, md, search_size"),
("view range becomes 1 when blinded","%s"%M,1894,"if (md->sc.getSCE(SC_BLIND))"),
("hard AI: skip while not due (next_thinktime)","%s"%M,1854,"if (DIFF_TICK(tick, md->next_thinktime) < 0)"),
("hard AI: set next_thinktime","%s"%M,1858,"md->next_thinktime = tick;"),
("skill check interval","%s"%M,1884,"skill_ready = (DIFF_TICK(tick, md->last_skillcheck) >= MOB_SKILL_INTERVAL);"),
("attacked-by check: attacker must pass mob_can_changetarget","%s"%M,1955,"(abl = map_id2bl(md->attacked_id)) && (!tbl || mob_can_changetarget(md, abl, mode))"),
("attacker outside the visual area is ignored","%s"%M,1959,"(dist = distance_bl(md, abl)) > AREA_SIZE"),
("self damage does not count as a rude attack","%s"%M,1973,"if (abl->id != md->id //Self damage does not cause rude attack"),
("switch target to the attacker","%s"%M,1986,"md->target_id = md->attacked_id; // set target"),
("rude-attack counter threshold","%s"%MC.replace("monster.conf","") if False else M,49,"#define RUDE_ATTACKED_COUNT 1"),
("clear attacked ids after the check","%s"%M,1994,"md->attacked_id = md->norm_attacked_id = 0;"),
("aggressive search runs only without a target (or after losing a slave target) or in follow state","%s"%M,2024,"if ((mode&MD_AGGRESSIVE && (!tbl || slave_lost_target)) || md->state.skillstate == MSS_FOLLOW)"),
("in-range new target switches to rush and clears aggressive","%s"%M,2030,"prev_id != md->target_id && battle_check_range(md, tbl, md->status.rhw.range)"),
("rush state set on engage","%s"%M,2032,"mob_setstate(*md, MSS_RUSH);"),
("in weapon range: engage the attack","%s"%M,2141,"if (battle_check_range(md, tbl, md->status.rhw.range))"),
("chase refresh: keep the path until mob_chase_refresh cells walked","%s"%M,2173,"md->ud.walkpath.path_pos <= battle_config.mob_chase_refresh"),
("angry state only chases when target is in range3","%s"%M,2208,"if (md->state.skillstate == MSS_ANGRY && !mob_can_reach(md, tbl, md->db->range3))"),
("walk to target to attack range","%s"%M,2213,"if(!unit_walktobl(md, tbl, md->status.rhw.range, 2))"),
("immobile trapped mob unlocks after mob_unlock_time since last move","%s"%M,2182,"if (DIFF_TICK(tick, md->last_canmove) > battle_config.mob_unlock_time) {"),
("unlock: default branch returns to idle with a random walk delay","%s"%M,1652,"md->next_walktime = tick+rnd()%1000+MIN_RANDOMWALKTIME;"),
("unlock: walk-instantly option","%s"%M,1649,"if(battle_config.mob_ai&0x8) //Walk instantly after dropping target"),
("unlock function signature","%s"%M,1627,"int32 mob_unlocktarget(mob_data *md, t_tick tick)"),
("hard AI function signature","%s"%M,1841,"static bool mob_ai_sub_hard(mob_data *md, t_tick tick)"),
("retaliate to master option","%s"%M,2282,"if (md2.master_id && battle_config.retaliate_to_master)"),
("set_attacked_id: attacker becomes attacked_id","%s"%M,2257,"void mob_set_attacked_id(int32 src_id, int32 target_id, t_tick tick, bool is_norm_attacked) {"),
("being attacked drops aggressive mode","%s"%M,2297,"As it was attacked, monster leaves aggressive mode"),
("being attacked runs the hard AI immediately","%s"%M,2301,"mob_ai_sub_hard(md, tick);"),
("per-client driver: hard AI for mobs in player view range","%s"%M,2351,"map_foreachinallrange(mob_ai_sub_hard_timer,sd, AREA_SIZE+ACTIVE_AI_RANGE"),
("per-client driver function","%s"%M,2348,"static int32 mob_ai_sub_foreachclient(map_session_data *sd,va_list ap)"),
("hard driver: mob_ai&0x20 switches to walking all mobs","%s"%M,2470,"if (battle_config.mob_ai&0x20)"),
("hard driver: each player's view","%s"%M,2473,"map_foreachpc(mob_ai_sub_foreachclient,tick);"),
("lazy AI skips when hard AI ran recently (twice the interval)","%s"%M,2403,"if (DIFF_TICK(tick, md->next_thinktime) < MIN_MOBTHINKTIME*2)"),
("lazy AI function signature","%s"%M,2359,"static int32 mob_ai_sub_lazy(mob_data *md, va_list args)"),
("hard timer interval: MIN_MOBTHINKTIME","%s"%M,7363,"add_timer_interval(gettick()+MIN_MOBTHINKTIME,mob_ai_hard,0,0,MIN_MOBTHINKTIME);"),
("lazy timer interval: 10 x MIN_MOBTHINKTIME","%s"%M,7364,"add_timer_interval(gettick()+MIN_MOBTHINKTIME*10,mob_ai_lazy,0,0,MIN_MOBTHINKTIME*10);"),
("constant: MIN_MOBTHINKTIME 100 ms","%s"%H,35,"const t_tick MIN_MOBTHINKTIME = 100;"),
("constant: MOB_SKILL_INTERVAL 1000","%s"%H,42,"const t_tick MOB_SKILL_INTERVAL = 1000;"),
("constant: ACTIVE_AI_RANGE 4 added to area size","%s"%M,46,"#define ACTIVE_AI_RANGE 4"),
("damage log: appended on each hit (reward data)","%s"%M,2771,"md->dmglog.push_back( dmg );"),
("damage log: self damage counts for tap bonus","%s"%M,2737,"Self damage increases tap bonus"),
("reach check helper","%s"%M,1007,"return unit_can_reach_bl(md, bl, range, 0, nullptr, nullptr);"),
("warp chase only when mob_ai bit 0x40 set","%s"%M,1778,"if ((battle_config.mob_ai&0x40) == 0)"),
("default mob_ai flags are zero","%s"%B,8580,"0x0000, 0x0000, 0x3FFF"),
("default mob_active_time (code default 5000; conf sets 0)","%s"%B,8622,"&battle_config.mob_active_time,"),
("chase refresh battle option","%s"%B,8748,"&battle_config.mob_chase_refresh,"),
("conf: mob_active_time is 0 in monster.conf","%s"%MC,89,"mob_active_time: 0"),
("conf: mob_unlock_time 2000 ms","%s"%MC,338,"mob_unlock_time: 2000"),
("conf: area_size 14","%s"%CC,39,"area_size: 14"),
("licence: GNU GPL title","%s"%LIC,1,"GNU GENERAL PUBLIC LICENSE"),
("licence: version 3","%s"%LIC,2,"Version 3, 29 June 2007"),
]
w=csv.writer(open(sys.argv[1],'w',newline=''),delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
w.writerow(['note','claim','donor_file','line','quote'])
for claim,f,ln,q in rows:
    assert '\t' not in q
    w.writerow([G,claim,f,str(ln),q])
print(len(rows),'rows')
