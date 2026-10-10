import csv,sys
S="/mnt/frankendom-donors/angband-angband/src/"
MM=S+"mon-make.c"; GW=S+"game-world.c"; GC=S+"gen-cave.c"; MU=S+"mon-util.c"; CV=S+"cave-view.c"
CT="/mnt/frankendom-donors/angband-angband/lib/gamedata/constants.txt"
LIC_MM=MM
N="angband-angband"
rows=[
("get_mon_num signature","depth pick: race for generated level and current level",MM,221,"struct monster_race *get_mon_num(int generated_level, int current_level)"),
("OOD comment","comment says 1/25 boost of up to four levels",MM,211,"There is a small chance (1/25) of boosting the given depth by"),
("OOD comment cap","comment says up to four levels",MM,212,"a small amount (up to four levels), except in the town."),
("OOD roll","1 in ood-chance boost, always depth > 0",MM,231,"if (generated_level > 0 && one_in_(z_info->ood_monster_chance))"),
("OOD amount","boost is min(level/4 + 2, ood-amount)",MM,232,"generated_level += MIN(generated_level / 4 + 2,"),
("extra draws comment","comment says the extra draw is 50 percent; code threshold p < 60 on line 280 (too short to receipt)",MM,277,'monster once (50%) or twice (10%)'),
("roll range","p is drawn 0-99 for the extra-draw test",MM,278,"p = randint0(100);"),
("keep deeper","replace only when the new draw is not shallower",MM,287,"if (race->level < old->level) race = old;"),
("pick far cell signature","trickle placement picks a far grid first",MM,1483,"bool pick_and_place_distant_monster(struct chunk *c, struct loc to_avoid,"),
("attempt budget","10000 random tries for a far empty grid",MM,1487,"attempts_left = 10000;"),
("attempt loop","random grid each try",MM,1492,"while (--attempts_left) {"),
("far gate","accept only grids farther than dis",MM,1504,"if (distance(grid, to_avoid) > dis) break;"),
("monster after cell","monster chosen only after the cell is found",MM,1515,"if (pick_and_place_monster(c, grid, depth, sleep, true, ORIGIN_DROP))"),
("distance metric","longer axis plus half the shorter",CV,45,"return ay > ax ? ay + (ax >> 1) : ax + (ay >> 1);"),
("compact signature","compaction deletes monsters to free slots",MM,482,"void compact_monsters(struct chunk *c, int num_to_compact)"),
("pass level bound","pass k spares monsters above level 5k",MM,497,"max_lev = 5 * iter;"),
("pass distance bound","pass k spares monsters nearer than 5*(20-k)",MM,500,"min_dis = 5 * (20 - iter);"),
("level skip","monsters above max_lev are skipped",MM,510,"if (mon->race->level > max_lev) continue;"),
("distance skip","monsters nearer than min_dis are skipped",MM,513,"if ((min_dis > 0) && (mon->cdis < min_dis)) continue;"),
("default save","every monster gets a saving throw (chance 90 is on line 516; too short to receipt)",MM,525,"/* All monsters get a saving throw */"),
("unique save","uniques saved at 99 percent",MM,523,"if (monster_is_unique(mon)) chance = 99;"),
("save roll","roll under chance keeps the monster",MM,526,"if (randint0(100) < chance) continue;"),
("process_world comment","process_world runs every ten game turns",GW,1074,"/* Process the world every ten turns */"),
("process_world call","process_world only when turn is a multiple of ten",GW,1075,"if (!(turn % 10) && !player->upkeep->generate_level) {"),
("process_world signature","world tick entry",GW,457,"void process_world(struct chunk *c)"),
("cap trigger","compact 64 when count + 32 exceeds the level max",GW,462,"if (cave_monster_count(c) + 32 > z_info->level_monster_max)"),
("cap compact call","compaction target 64",GW,463,"compact_monsters(c, 64);"),
("trickle roll","one roll per process_world call",GW,506,"if (one_in_(z_info->alloc_monster_chance)) {"),
("trickle distance","spawn at max_sight + 5 from the player",GW,508,"z_info->max_sight + 5, true, player->depth);"),
("classic depth term","k = clamp(depth/3, 2, 10)",GC,1295,"k = MAX(MIN(c->depth / 3, 10), 2);"),
("initial population","base 14 plus randint1(8) plus k",GC,1313,"i = z_info->level_monster_min + randint1(8) + k;"),
("constant chance","mon-gen chance 500 (1 in 500 per call)",CT,18,"mon-gen:chance:500"),
("constant level-min","mon-gen level-min 14",CT,21,"mon-gen:level-min:14"),
("constant level max","level-max monsters 1024",CT,11,"level-max:monsters:1024"),
("constant ood chance","mon-gen ood-chance 25",CT,33,"mon-gen:ood-chance:25"),
("constant ood amount","mon-gen ood-amount 10",CT,36,"mon-gen:ood-amount:10"),
("constant group max","mon-gen group-max 25",CT,39,"mon-gen:group-max:25"),
("constant group dist","mon-gen group-dist 5",CT,42,"mon-gen:group-dist:5"),
("constant max sight","player max-sight 20",CT,195,"player:max-sight:20"),
("group cap","group size capped at group-max",MM,1230,"total = MIN(total, z_info->monster_group_max);"),
("cdis formula","approximate distance stored per monster",MU,329,"d = (dy > dx) ? (dy + (dx >>  1)) : (dx + (dy >> 1));"),
("cdis store comment","distance is saved for the monster (assignment on line 335, too short to receipt)",MU,334,"/* Save the distance */"),
("player grid source","pgrid is player grid in the dungeon",MU,301,"struct loc pgrid = character_dungeon ? player->grid :"),
("licence GPL option","dual licence, GPL-2 option",MM,10,"the GNU General Public License as published by the Free Software"),
("licence Angband option","dual licence, non-commercial option",MM,14,"This software may be copied and distributed for educational, research,"),
]
w=csv.writer(sys.stdout,delimiter='\t',lineterminator='\n',quoting=csv.QUOTE_NONE,escapechar=None)
w.writerow(["note","claim","donor_file","line","quote"])
bad=0
for name,claim,f,l,q in rows:
    if not (15<=len(q)<=90): print("LEN",len(q),q,file=sys.stderr); bad+=1
    w.writerow([N,name+": "+claim,f,l,q])
print("len-problems",bad,file=sys.stderr)
