import csv
N="alexbatalov-fallout2-ce"
C="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc"
K="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc"
T="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat.cc"
L="/mnt/frankendom-donors/alexbatalov-fallout2-ce/LICENSE.md"
rows=[
("target selection entry","%s"%"_ai_danger_source",C,1529,"static Object* _ai_danger_source(Object* a1)"),
("non-party NPC keeps living hitter (no range check)","hitter first",C,1656,"if (attackWho == ATTACK_WHO_WHOMEVER || attackWho == -1) {"),
("returns whoHitMe immediately","hitter first",C,1657,"return whoHitMe;"),
("dead hitter: nearest living unit of hitter team into slot 0","dead hitter",C,1661,"targets[0] = _ai_find_nearest_team(a1, whoHitMe, 1);"),
("STRONGEST sorts by rating ascending (as written)","sort strength",C,1681,"_ai_sort_list_strength(targets, 4);"),
("default sort by distance (CLOSEST / -1)","sort distance",C,1689,"_ai_sort_list_distance(targets, 4, a1);"),
("first candidate seen (isWithinPerception) is taken","perception gate",C,1695,"if (candidate != nullptr && isWithinPerception(a1, candidate)) {"),
("reachable test (pathfinder result != 0)","reach or shot",C,1696,"pathfinderFindPath(a1, a1->tile, candidate->tile, nullptr, 0, _obj_blocking_at) != 0"),
("or primary shot is OK","reach or shot",C,1697,"== COMBAT_BAD_SHOT_OK) {"),
("party WHOMEVER_ATTACKING_ME: sticky last target","sticky target",C,1570,"Object* candidate = aiInfoGetLastTarget(a1);"),
("STRONGEST/WEAKEST/CLOSEST clear whoHitMe as a side effect","side effect",C,1642,"a1->data.critter.combat.whoHitMe = nullptr;"),
("aiFindAttackers stops at 3 found","cap 3",C,1483,"for (int index = 0; foundTargetCount < 3 && index < _curr_crit_num; index++) {"),
("aiFindAttackers sorts list by distance from critter","distance list",C,1476,"_ai_sort_list_distance(_curr_crit_list, _curr_crit_num, critter);"),
("attacker-of-me category has no team check","category1",C,1488,"&& candidate->data.critter.combat.whoHitMe == critter) {"),
("strength comparator: ascending by rating","asc rating",C,1343,"if (rating1 < rating2) {"),
("strength comparator defined","strength cmp",C,1327,"static int _compare_strength(const void* a1, const void* a2)"),
("weakness comparator: descending by rating","desc rating",C,1379,"if (rating1 < rating2) {"),
("rating = melee/weapon max damage + armour class","rating",C,3480,"return melee_damage + critterGetStat(obj, STAT_ARMOR_CLASS);"),
("nearest-team finder flag 0x01 selects same team as the given unit","flags",C,1417,"|| ((flags & 0x01) && team == obj->data.critter.combat.team))) {"),
("run-away HP table","hp table",C,253,"static const int _hp_run_away_value[6] = {"),
("flee threshold min_hp formula","min_hp",C,833,"ai->min_hp = maximumHp - maximumHp * _hp_run_away_value[runAwayMode] / 100;"),
("combat AI driver defined","driver",C,3053,"void _combat_ai(Object* a1, Object* a2)"),
("flee gate on hp below min_hp","flee gate",C,3077,"|| critterGetStat(a1, STAT_CURRENT_HIT_POINTS) < ai->min_hp) {"),
("flee gate on hurt_too_much results bits","flee gate 2",C,3076,"|| (combatData->results & ai->hurt_too_much) != 0"),
("driver calls danger source only when no defender given","driver call",C,3088,"a2 = _ai_danger_source(a1);"),
("leash: disengage when beyond max_dist","leash",C,3109,"combatData->maneuver |= CRITTER_MANEUVER_DISENGAGING;"),
("perception gate defined","perception",C,3499,"bool isWithinPerception(Object* critter, Object* target)"),
("seen range = perception x 5","x5",C,3509,"int maxDistance = perception * 5;"),
("unseen range = perception x 2 in combat","x2",C,3532,"maxDistance = perception * 2;"),
("retaliation: switch to attacker only if its rating is higher","retaliation",C,3490,"if (candidateRating > whoHitMeRating) {"),
("retaliation function defined","retaliation def",C,3484,"void _combatai_check_retaliation(Object* a1, Object* a2)"),
("set whoHitMe (critter.cc)","set hitme",K,1285,"int _critter_set_who_hit_me(Object* a1, Object* a2)"),
("set whoHitMe assignment","set hitme assign",K,1297,"a1->data.critter.combat.whoHitMe = a2;"),
("AI attack sets attacker whoHitMe to defender","try attack",C,2694,"_critter_set_who_hit_me(attacker, defender);"),
("only caller of _combat_ai passes current defender","caller",T,3302,"_combat_ai(obj, _gcsd != nullptr ? _gcsd->defender : nullptr);"),
("attack sets last target","last target set",T,3558,"aiInfoSetLastTarget(attacker, defender);"),
("party leash check reachable (pathfinder == 0 means no path)","reach usage",C,1609,"pathfinderFindPath(a1, a1->tile, critter->tile, nullptr, 0, _obj_blocking_at) == 0"),
("licence","licence",L,1,"# Sustainable Use License"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q023/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,_,path,line,q in rows:
        assert "\t" not in q
        w.writerow([N,claim,path,line,q])
print(len(rows))
