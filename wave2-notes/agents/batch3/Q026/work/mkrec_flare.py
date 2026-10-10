import csv,sys
S="/mnt/frankendom-donors/flareteam-flare-engine/src/"
EB=S+"EntityBehavior.cpp"; SB=S+"StatBlock.cpp"; GS=S+"GameStatePlay.cpp"; ST=S+"Settings.cpp"; EM=S+"EntityManager.cpp"; EN=S+"Entity.cpp"
N="flareteam-flare-engine"
rows=[
("EntityBehavior::logic runs doUpkeep, findTarget, checkMove, updateState",EB,82,"void EntityBehavior::logic() {"),
("logic() is called from Entity.cpp (behavior logic)",EN,102,"behavior->logic();"),
("logic gate: enemy only acts once the hero is within encounter_dist",EB,92,"if (Utils::calcDist(e->stats.pos, pc->stats.pos) <= settings->encounter_dist)"),
("encounter_dist derived from the view size",ST,260,"encounter_dist = sqrtf(powf(static_cast<float>(view_w/eset->tileset.tile_w), 2.f)"),
("findTarget starts at the hero and sets the stealth-scaled engage range",EB,154,"float stealth_threat_range = (e->stats.threat_range"),
("hero is the default target each tick",EB,160,"target_stats = &pc->stats;"),
("nearer AI ally in combat overrides the target (ally side)",EB,191,"else if (entity_dist < target_dist) {"),
("pick first available AI target when none selected",EB,185,"if (!target_stats || (e->stats.hero_ally && target_stats->hero)) {"),
("line of sight is only checked inside threat_range",EB,208,"if (target_stats && target_dist < e->stats.threat_range && pc->stats.alive)"),
("join combat when hero is inside the stealth-scaled range",EB,224,"close_to_target = target_dist < stealth_threat_range;"),
("join combat for other targets uses threat_range",EB,226,"close_to_target = target_dist < e->stats.threat_range;"),
("join combat needs alive, not in combat, line of sight, close, not passive",EB,228,"if (e->stats.alive && !e->stats.in_combat && los && close_to_target"),
("joining combat emits a beacon for allies",EB,245,"powers->activate(ai_power->id, &e->stats, e->stats.pos, e->stats.pos)"),
("leave combat beyond threat_range_far unless aggressive",EB,261,"if (target_dist > e->stats.threat_range_far)"),
("leave combat when line-of-sight cooldown has run out",EB,264,"if (e->stats.cooldown_los.getDuration() > 0 && e->stats.cooldown_los.isEnd())"),
("leave combat when either party is dead",EB,274,"if (!e->stats.alive || !pc->stats.alive || (target_stats && !target_stats->alive))"),
("pursue_pos is the target position while in combat",EB,278,"pursue_pos = target_stats->pos;"),
("chance-to-flee trigger conditions (stance, in combat, inside flee range)",EB,318,"e->stats.cur_state == StatBlock::ENTITY_STANCE &&"),
("flee trigger needs beyond melee range",EB,320,"target_dist >= e->stats.melee_range &&"),
("flee trigger rolls chance_flee and checks cooldown",EB,321,"Math::percentChanceF(e->stats.chance_flee) &&"),
("flee cooldown must have ended",EB,322,"e->stats.flee_cooldown_timer.isEnd()"),
("flee candidate directions: five around the away direction",EB,336,"for (int i = -2; i <= 2; ++i) {"),
("flee direction must be a valid position",EB,340,"if (mapr->collider.isValidPosition(test_pos.x, test_pos.y"),
("flee picks a random valid direction",EB,359,"int index = Math::randBetween(0, static_cast<int>(flee_dirs.size())-1);"),
("flee timer restarts when it has ended",EB,363,"e->stats.flee_timer.reset(Timer::BEGIN);"),
("stance holds position beyond flee range when flee-capable",EB,625,"if (target_dist >= e->stats.flee_range && e->stats.chance_flee > 0"),
("stance: pursue roll when beyond melee range",EB,631,"Math::percentChanceF(e->stats.chance_pursue)"),
("stance: move if in combat and out of line of sight at melee range",EB,631,"(target_dist <= e->stats.melee_range && !los)"),
("moving: stop to stance at melee with line of sight, not fleeing",EB,680,"target_dist < e->stats.melee_range && !fleeing && e->stats.in_combat && los"),
("stop_fleeing re-rolls chance_flee after the minimum duration",EB,669,"!Math::percentChanceF(e->stats.chance_flee);"),
("flee timer re-armed to one frame while the roll keeps passing",EB,675,"e->stats.flee_timer.setCurrent(1);"),
("stopping a flee starts the flee cooldown",EB,682,"e->stats.flee_cooldown_timer.reset(Timer::BEGIN);"),
("path recalculation chance grows 5 per frame",EB,504,"chance_calc_path += 5;"),
("path recalculation roll",EB,506,"bool calc_path_success = Math::percentChance(chance_calc_path);"),
("chance_pursue default 0",SB,139,"chance_pursue(0)"),
("chance_flee default 0 (enemy only)",SB,140,"chance_flee(0) // enemy only"),
("melee_range default 1.0",SB,145,"melee_range(1.0f)"),
("threat_range default 0; parsed as engage and stop radius",SB,146,"threat_range(0)"),
("threat_range parse: first value is the engage radius",SB,801,"threat_range = Parse::popFirstFloat(infile.val);"),
("threat_range_far defaults to double threat_range",SB,807,"threat_range_far = threat_range * 2;"),
("flee_range defaults to half threat_range",SB,871,"flee_range = threat_range / 2;"),
("cooldown_los data field",SB,848,"cooldown_los.setDuration(Parse::toDuration(infile.val));"),
("cooldown_los ticks in StatBlock logic",SB,1130,"cooldown_los.tick();"),
("hero_stealth default 0",SB,150,"hero_stealth(0)"),
("hero stealth is copied from the hero each frame, capped at 100",GS,891,"if (pc->stats.get(Stats::STEALTH) > 100) entitym->hero_stealth = 100;"),
("entity manager copies hero_stealth to every entity",EM,365,"(*it)->stats.hero_stealth = hero_stealth;"),
("flee_cooldown defaults to max_frames_per_sec",SB,159,"flee_cooldown_timer(settings->max_frames_per_sec)"),
("EntityManager calls each entity's logic",EM,367,"(*it)->logic();"),
]
with open(sys.argv[1],'w',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,path,line,q in rows:
        if not (15<=len(q)<=90): print("LEN",len(q),q)
        w.writerow([N,claim,path,str(line),q])
print("rows",len(rows))
