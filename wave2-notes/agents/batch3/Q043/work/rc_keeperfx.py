K="/mnt/frankendom-donors/dkfans-keeperfx/src/"
N="dkfans-keeperfx"
rows=[
("default stat gain per level is 35 percent",K+"config_creature.h",41,"#define CREATURE_PROPERTY_INCREASE_ON_EXP  35"),
("absolute max creature level constant",K+"thing_stats.h",29,"#define CREATURE_MAX_LEVEL"),
("XP gate function",K+"creature_control.c",342,"TbBool creature_can_gain_experience(const struct Thing *thing)"),
("XP gate: dungeon max level",K+"creature_control.c",347,"if (cctrl->exp_level >= dungeon->creature_max_level[thing->model])"),
("XP gate: absolute max unless grow-up",K+"creature_control.c",351,"if ((cctrl->exp_level >= (CREATURE_MAX_LEVEL-1)) && (crconf->grow_up == 0))"),
("hit XP function signature",K+"thing_shots.c",755,"TbBool apply_shot_experience(struct Thing *shooter, long exp_factor, CrtrExpLevel exp_level, long shot_model)"),
("hit XP magnitude from shot config",K+"thing_shots.c",761,"long exp_mag = shotst->experience_given_to_shooter;"),
("hit XP scales with target level",K+"thing_shots.c",762,"exp_on_hitting_increase_on_exp * exp_factor * (long)exp_level / 100)"),
("hit XP added to shooter points",K+"thing_shots.c",764,"shcctrl->exp_points += exp_gained;"),
("hit XP checks upgrade right away",K+"thing_shots.c",765,"if ( check_experience_upgrade(shooter) ) {"),
("hit XP factor comes from target exp_for_hitting",K+"thing_shots.c",776,"return apply_shot_experience(shooter, tgcrconf->exp_for_hitting, tgcctrl->exp_level, shot_model);"),
("hit call site: creature vs creature only",K+"thing_shots.c",1237,"apply_shot_experience_from_hitting_creature(shooter, trgtng, shotng->model);"),
("level-up cost check",K+"creature_states.c",4900,"TbBool check_experience_upgrade(struct Thing *thing)"),
("cost is table value shifted by 8",K+"creature_states.c",4904,"long i = crconf->to_level[cctrl->exp_level] << 8;"),
("not enough points: no level",K+"creature_states.c",4905,"if (cctrl->exp_points < i)"),
("points are spent on level-up",K+"creature_states.c",4909,"cctrl->exp_points -= i;"),
("level-up flag set when below max",K+"creature_states.c",4915,"cctrl->exp_level_up = true;"),
("apply pending level",K+"thing_creature.c",6419,"long update_creature_levels(struct Thing *thing)"),
("apply: clear flag",K+"thing_creature.c",6426,"cctrl->exp_level_up = false;"),
("apply: one level step",K+"thing_creature.c",6433,"set_creature_level(thing, cctrl->exp_level+1);"),
("apply: re-check for another level",K+"thing_creature.c",6434,"check_experience_upgrade(thing);"),
("creature update calls apply",K+"thing_creature.c",6685,"if (update_creature_levels(thing) == -1)"),
("creature update entry",K+"thing_creature.c",6498,"TngUpdateRet update_creature(struct Thing *thing)"),
("thing list update runs creatures",K+"thing_list.c",1371,"update_things_in_list(&game.thing_lists[TngList_Creatures]);"),
("things update entry",K+"thing_list.c",1359,"void update_things(void)"),
("compute max health: level clamp",K+"thing_stats.c",362,"exp_level = CREATURE_MAX_LEVEL-1;"),
("max health formula",K+"thing_stats.c",365,"health_increase_on_exp * (int64_t)base_health * (int64_t)exp_level) / 100;"),
("strength formula",K+"thing_stats.c",381,"strength_increase_on_exp * base_param * (long)exp_level) / 100;"),
("health kept as fraction on level change",K+"thing_stats.c",925,"TbBool update_relative_creature_health(struct Thing* creatng)"),
("recompute max health on rescale",K+"thing_stats.c",929,"cctrl->max_health = calculate_correct_creature_max_health(creatng);"),
("scaled health from permil",K+"thing_stats.c",931,"int64_t health_scaled = (int64_t)cctrl->max_health"),
("write scaled health",K+"thing_stats.c",932,"creatng->health = health_scaled;"),
("training XP source (not fully read)",K+"creature_states_train.c",469,"cctrl->exp_points += (room->efficiency * crconf->training_value);"),
("level table parsed from LEVELSTRAINVALUES",K+"config_crtrmodel.c",1889,"crconf->to_level[n] = k;"),
("grow-up cost parsed into last table slot",K+"config_crtrmodel.c",1902,"crconf->to_level[CREATURE_MAX_LEVEL-1] = k;"),
("UI shows the same cost",K+"frontmenu_ingame_tabs.c",1865,"long points_required = (crconf->to_level[cctrl->exp_level] << 8);"),
("per-turn update entry",K+"game_update.cpp",472,"void update(void)"),
("per-turn update calls things",K+"game_update.cpp",505,"update_things();"),
("turn counter advances",K+"game_update.cpp",534,"game.play_gameturn++;"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q043/receipts.tsv","a") as f:
    for claim,file,line,q in rows:
        assert "\t" not in q
        f.write("\t".join([N,claim,file,str(line),q])+"\n")
print("wrote",len(rows))
