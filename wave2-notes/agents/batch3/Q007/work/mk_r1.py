import csv
D="/mnt/frankendom-donors/dkfans-keeperfx/"
N="dkfans-keeperfx"
rows=[
("process entry point per turn","src/room_entrance.c",382,"void process_entrance_generation(void)"),
("called from process_dungeons each update pass","src/game_update.cpp",276,"process_entrance_generation();"),
("process_dungeons runs in the per-turn update block","src/game_update.cpp",507,"process_dungeons();"),
("game turn counter advances once per update pass","src/game_update.cpp",534,"game.play_gameturn++;"),
("per-player due check each turn","src/room_entrance.c",395,"if (generation_due_for_dungeon(dungeon))"),
("interval test: turns since last generation","src/room_entrance.c",103,"get_gameturn() - dungeon->last_entrance_generation_gameturn"),
("timer resets for active keeper after the attempt","src/room_entrance.c",403,"dungeon->last_entrance_generation_gameturn = get_gameturn();"),
("only active keepers not lost get generation","src/room_entrance.c",398,"if (is_active_keeper(plyr) && (plyr->victory_state != VicS_LostLevel) )"),
("population cap: active below max_creatures_attracted","src/room_entrance.c",119,"((long)dungeon->num_active_creatrs < (long)dungeon->max_creatures_attracted)"),
("map-wide creature limit gates generation (first check)","src/room_entrance.c",94,"if (!creature_count_below_map_limit(0))"),
("kind eligible only if pool count positive","src/room_entrance.c",201,"if (game.pool.crtr_kind[crmodel] <= 0) {"),
("forced kinds skip the room gate","src/room_entrance.c",213,"if (dungeon->creature_force_enabled[crmodel] > dungeon->creature_models_joined[crmodel]) {"),
("presence gate: required slabs per entrance room","src/room_entrance.c",229,"if (slabs_count < stats->entrance_slabs_req[i]) {"),
("selection weight = base entrance score plus excess attraction","src/room_entrance.c",269,"(long)crconf->entrance_score + calculate_excess_attraction_for_creature"),
("weight floored at 1","src/room_entrance.c",270,"if (score < 1) {"),
("excess attraction: later rooms count less","src/room_entrance.c",173,"First room adds fully to attraction, second adds only 1/2, third adds 1/3"),
("excess attraction divides by room index plus one","src/room_entrance.c",174,"calculate_attractive_room_quantity(room_kind, plyr_idx, crmodel) / (i+1);"),
("one attraction per 3 slabs, minus owned of this kind","src/room_entrance.c",148,"return slabs_count / 3 - (long)dungeon->owned_creatures_of_model[crmodel];"),
("dungeon heart and bridge: one per 9 slabs","src/room_entrance.c",136,"return slabs_count / 9 - (long)dungeon->owned_creatures_of_model[crmodel];"),
("lair attraction: half per free-capacity unit","src/room_entrance.c",132,"return (slabs_count * (256-used_fraction)) / 256 / 2"),
("weighted roll over cumulative weights with one draw","src/room_entrance.c",288,"long rnd = PLAYER_RANDOM(dungeon->owner, cum_freq);"),
("cumulative pick: first kind whose running sum exceeds roll","src/room_entrance.c",292,"while (rnd >= crtr_freq[crmodel])"),
("PLAYER_RANDOM draws from one seeded game series","src/game_merge.h",71,"LbRandomSeries(range, &game.player_random_seed, __func__, __LINE__)"),
("seeded player random seed is in net checksums","src/net_checksums.c",192,"checksums->player_seed = game.player_random_seed;"),
("spawn point: random room with CrPoolSpawn role","src/room_entrance.c",314,"pick_random_room_of_role(dungeon->owner, RoRoF_CrPoolSpawn)"),
("pool decremented only after a successful create","src/room_entrance.c",324,"remove_creature_from_generate_pool(crmodel);"),
("pool decrement is one unit","src/room_entrance.c",243,"game.pool.crtr_kind[crmodel]--;"),
("gold gate: pay vs owner gold, else nothing spawns","src/room_entrance.c",339,"if ((long)crconf->pay > dungeon->total_money_owned)"),
("lair gate: lair space at least zero","src/room_entrance.c",346,"else if (lair_space >= 0)"),
("comment: one homeless creature allowed","src/room_entrance.c",348,"But one homeless creature is also allowed."),
("theirs: base entrance score default 10","src/config_creature.c",457,"crconf->entrance_score = 10;"),
("theirs: default generate speed 350 (turns)","src/config_rules.c",169,"rooms.default_generate_speed), 350,"),
("theirs: default population cap 200","src/config_rules.c",170,"rooms.default_max_crtrs_gen_entrance), 200,"),
("cap initialised from rules per dungeon","src/dungeon_data.c",550,"dungeon->max_creatures_attracted = game.conf.rules[i].rooms"),
("interval formula: max score times speed over own score","src/player_utils.c",498,"max_manage_score * player->generate_speed / dungeon->manage_score;"),
("fallback interval when own manage score is 0 or less","src/player_utils.c",500,"dungeon->turns_between_entrance_generation = player->generate_speed;"),
("max-score loop compares total_score","src/player_utils.c",486,"if (dungeon->total_score > max_manage_score)"),
("max-score loop stores manage_score (field mismatch)","src/player_utils.c",487,"max_manage_score = dungeon->manage_score;"),
("manage score: mood can cut the score by up to half","src/dungeon_stats.c",277,"raw_score = raw_score / 2 + raw_score"),
("manage score stored from raw score","src/dungeon_stats.c",278,"dungeon->manage_score = raw_score;"),
("total score is 1000 times efficiency over max","src/dungeon_stats.c",268,"dungeon->total_score = 1000 * i / k;"),
("map-wide creature check: count versus rule","src/thing_creature.c",4909,"game.conf.rules[0].gameplay.creatures_count);"),
("map-wide hard ceiling check","src/thing_creature.c",4906,"if (game.thing_lists[TngList_Creatures].count >= CREATURES_COUNT-1)"),
("lair free space function header","src/room_lair.c",50,"long calculate_free_lair_space(struct Dungeon * dungeon)"),
("scavenging uses the same pool and cap gate","src/creature_states_scavn.c",244,"dungeon->num_active_creatrs >= dungeon->max_creatures_attracted"),
("scavenging pool gate","src/creature_states_scavn.c",241,"if (game.pool.crtr_kind[crtr_kind] <= 0) {"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q007/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,fn,ln,q in rows:
        assert "\t" not in q and "\n" not in q
        w.writerow([N,claim,D+fn,str(ln),q])
print(len(rows))
