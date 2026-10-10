import csv
S='/mnt/frankendom-donors/freeciv-freeciv/'
B=S+'server/barbarian.c'
rows = [
("freeciv-freeciv","Each attempt samples one uniform random map position","%scommon/map.c"%S,1239,"int nat_x = fc_rand(MAP_NATIVE_WIDTH);"),
("freeciv-freeciv","Each attempt samples one random position","%s"%B,552,"ptile = rand_map_pos(nmap);"),
("freeciv-freeciv","Terrain flag TER_NO_BARBS blocks the attempt","%s"%B,554,"if (terrain_has_flag(tile_terrain(ptile), TER_NO_BARBS)) {"),
("freeciv-freeciv","Nearest city of any owner is found for the sampled tile","%s"%B,558,"if (!(pc = find_closest_city(ptile, NULL, NULL, FALSE, FALSE, FALSE, FALSE,"),
("freeciv-freeciv","Distance to the nearest city is measured as real map distance","%s"%B,566,"dist = real_map_distance(ptile, pc->tile);"),
("freeciv-freeciv","Distance band: reject outside MIN..MAX unrest distance","%s"%B,569,"if (dist > MAX_UNREST_DIST || dist < MIN_UNREST_DIST) {"),
("freeciv-freeciv","Spot is the tile or a neighbour with no units","%s"%B,574,"if (!(utile = find_empty_tile_nearby(ptile))"),
("freeciv-freeciv","Spot must be known to the victim unless it is ocean","%s"%B,575,"|| (!map_is_known(utile, victim)"),
("freeciv-freeciv","Spot must be near land (within the square of radius 4)","%s"%B,577,"|| !is_near_land(utile)) {"),
("freeciv-freeciv","Size gate: roll 1..30 must not exceed cities times (rate minus one)","%s"%B,584,"if ((int)fc_rand(30) + 1 >"),
("freeciv-freeciv","Size gate right-hand side: victim city count times (rate - 1)","%s"%B,585,"(int)city_list_size(victim->cities) * (game.server.barbarianrate - 1)"),
("freeciv-freeciv","Civil-war chance gate uses the victim's effect value","%s"%B,586,"|| fc_rand(100) > get_player_bonus(victim, EFT_CIVIL_WAR_CHANCE)) {"),
("freeciv-freeciv","Tier loop starts at the civ size step","%s"%B,605,"city_max = UPRISE_CIV_SIZE;"),
("freeciv-freeciv","Tier step: city_max grows by 1.2 times plus the civ size step","%s"%B,610,"city_max += (city_max * 1.2) + UPRISE_CIV_SIZE;"),
("freeciv-freeciv","Count = random 0..2 plus tier times barbarian rate","%s"%B,613,"barb_count = fc_rand(3) + uprise * game.server.barbarianrate;"),
("freeciv-freeciv","No units created means no notice and no vision","%s"%B,707,"if (really_created == 0) {"),
("freeciv-freeciv","Vision radius squared 9 for the uprising spot","%s"%B,718,"map_show_circle(barbarians, utile, BARBARIAN_INITIAL_VISION_RADIUS_SQ);"),
("freeciv-freeciv","Vision radius squared is 9","%s"%B,70,"#define BARBARIAN_INITIAL_VISION_RADIUS_SQ 9"),
("freeciv-freeciv","Near-land check iterates a square of radius 4","%s"%B,492,"square_iterate(&(wld.map), tile0, 4, ptile) {"),
("freeciv-freeciv","Empty-tile search covers a square of radius 1","%s"%B,506,"square_iterate(&(wld.map), ptile, 1, tile1) {"),
("freeciv-freeciv","Empty tile is one with zero units","%s"%B,507,"if (unit_list_size(tile1->units) == 0) {"),
("freeciv-freeciv","Per-turn gate: disabled or huts-only rates return","%s"%B,742,"if (BARBS_DISABLED == game.server.barbarianrate"),
("freeciv-freeciv","Onset gate: turn below onset returns","%s"%B,747,"if (game.info.turn < game.server.onsetbarbarian) {"),
("freeciv-freeciv","Attempts scale: tiles divided by MAP_FACTOR","%s"%B,751,"n = map_num_tiles() / MAP_FACTOR;"),
("freeciv-freeciv","Attempt count per turn is n times (rate minus one)","%s"%B,757,"for (i = 0; i < n * (game.server.barbarianrate - 1); i++) {"),
("freeciv-freeciv","Each attempt calls try_summon_barbarians","%s"%B,758,"try_summon_barbarians();"),
("freeciv-freeciv","Minimum unrest distance is 5","%sserver/barbarian.h"%S,23,"#define MIN_UNREST_DIST   5"),
("freeciv-freeciv","Maximum unrest distance is 8","%sserver/barbarian.h"%S,24,"#define MAX_UNREST_DIST   8"),
("freeciv-freeciv","Civ size step is 10","%sserver/barbarian.h"%S,26,"#define UPRISE_CIV_SIZE  10"),
("freeciv-freeciv","Map factor is 2000 tiles per attempt unit","%sserver/barbarian.h"%S,28,"#define MAP_FACTOR     2000"),
("freeciv-freeciv","Barbarian rate enum starts with DISABLED","%scommon/game.h"%S,52,"BARBS_DISABLED = 0,"),
("freeciv-freeciv","Default barbarian rate is NORMAL","%scommon/game.h"%S,666,"#define GAME_DEFAULT_BARBARIANRATE   BARBS_NORMAL"),
("freeciv-freeciv","Default onset is turn 60","%scommon/game.h"%S,668,"#define GAME_DEFAULT_ONSETBARBARIAN  60"),
("freeciv-freeciv","summon_barbarians is called from end_turn","%sserver/srv_main.c"%S,1670,"summon_barbarians(); /* Wild guess really, no idea where to put it, but"),
("freeciv-freeciv","end_turn is the enclosing function","%sserver/srv_main.c"%S,1609,"static void end_turn(void)"),
("freeciv-freeciv","Civil-war effect section for anarchy (value 99 on line 1151)","%sdata/civ2civ3/effects.ruleset"%S,1149,"[effect_civil_war_anarchy]"),
("freeciv-freeciv","Civil-war effect section for despotism (value 80 on line 1167)","%sdata/civ2civ3/effects.ruleset"%S,1165,"[effect_civil_war_despotism]"),
("freeciv-freeciv","Licence: GNU GPL version 2 (COPYING)","%sCOPYING"%S,2,"Version 2, June 1991"),
("freeciv-freeciv","Licence header: version 2 or any later version","%s"%B,5,"either version 2, or (at your option)"),
]
with open('/private/tmp/p2/wave2-haiku/batch3/Q005/receipts.tsv','a',newline='') as f:
    w = csv.writer(f, delimiter='\t', quoting=csv.QUOTE_NONE, escapechar='\\', lineterminator='\n')
    for r in rows:
        assert '\t' not in r[4] and '"' not in r[4]
        w.writerow(r)
print(len(rows),'appended')
