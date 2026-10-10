import csv,sys
G="freeciv-freeciv"
U="/mnt/frankendom-donors/freeciv-freeciv/ai/default/daiunit.c"
T="/mnt/frankendom-donors/freeciv-freeciv/ai/default/daitools.c"
A="/mnt/frankendom-donors/freeciv-freeciv/server/advisors/advtools.c"
AH="/mnt/frankendom-donors/freeciv-freeciv/server/advisors/advtools.h"
ABH="/mnt/frankendom-donors/freeciv-freeciv/server/advisors/advbuilding.h"
D="/mnt/frankendom-donors/freeciv-freeciv/ai/difficulty.c"
COP="/mnt/frankendom-donors/freeciv-freeciv/COPYING"
rows=[
("kill_desire: numerator (benefit x attack - loss x vuln) x victims","%s"%U,347,"desire = (benefit * attack - loss * vuln) * victim_count"),
("kill_desire: scaled by SHIELD_WEIGHTING over attack + vuln x victims","%s"%U,348,"* SHIELD_WEIGHTING / (attack + vuln * victim_count);"),
("kill_desire function signature","%s"%U,341,"adv_want kill_desire(adv_want benefit, int attack, int loss, int vuln,"),
("find_something_to_kill signature","%s"%U,1214,"adv_want find_something_to_kill(struct ai_type *ait, struct player *pplayer,"),
("no attacking power: no target","%s"%U,1275,"if (attack_value == 0) {"),
("unit target: attack is the squared attack rating of the attacker","%s"%U,1614,"attack = unit_att_rating_squared(punit);"),
("unit target: only the main defender of a tile is a candidate","%s"%U,1642,"aunit != get_defender(nmap, punit, atile, nullptr)"),
("unit target: defence rating of the victim, squared","%s"%U,1652,"vulnerability = unit_def_rating_squared(punit, aunit);"),
("unit target: too far (more than 10 turns) scores 0","%s"%U,1656,"if (10 < move_time) {"),
("unit target: want = kill_desire(benefit, attack, loss, vuln, 1)","%s"%U,1660,"want = kill_desire(benefit, attack, bcost, vulnerability, 1);"),
("unit target: time penalty per turn (SHIELD_WEIGHTING)","%s"%U,1663,"want -= move_time * SHIELD_WEIGHTING;"),
("unit target: amortized by delay (move time plus build time)","%s"%U,1668,"want = military_amortize(pplayer, game_city_by_number(punit->homecity),"),
("unit target: fuzzy accept when it beats the best so far","%s"%U,1670,"if (want > best && ai_fuzzy(pplayer, TRUE)) {"),
("city target: attack is the sum of attacker and city attack, squared","%s"%U,1517,"attack = attack_value + acity_data->attack;"),
("city target: squared","%s"%U,1518,"attack *= attack;"),
("city target: too far scores 0","%s"%U,1530,"} else if (10 < move_time) {"),
("city target: kill_desire with victim count plus one","%s"%U,1539,"want = kill_desire(benefit, attack, bcost + acity_data->bcost,"),
("city target: unhappiness penalty term","%s"%U,1542,"want -= move_time * (unhap ? SHIELD_WEIGHTING + 2 * TRADE_WEIGHTING"),
("city target: fuzzy accept","%s"%U,1593,"if (want > best && ai_fuzzy(pplayer, TRUE)) {"),
("military_amortize signature","%s"%T,117,"adv_want military_amortize(struct player *pplayer, struct city *pcity,"),
("military_amortize: delay plus build time","%s"%T,129,"return amortize(value, delay + build_time);"),
("amortize: benefit times (1 - 1/MORT) to the power of delay","%s"%A,35,"return benefit * pow(discount, delay);"),
("MORT interest constant 24","%s"%AH,19,"#define MORT 24"),
("SHIELD_WEIGHTING constant 17","%s"%ABH,20,"#define SHIELD_WEIGHTING (adv_want)17"),
("TRADE_WEIGHTING constant 18","%s"%ABH,21,"#define TRADE_WEIGHTING (adv_want)18"),
("ai_fuzzy: returns the opposite with probability fuzzy/1000","%s"%D,339,"bool ai_fuzzy(const struct player *pplayer, bool normal_decision)"),
("ai_fuzzy: the roll","%s"%D,344,"if (fc_rand(1000) >= pplayer->ai_common.fuzzy) {"),
("fuzzy level table: easy value","%s"%D,154,"    return 300;"),
("licence: GPL version 2 title","%s"%COP,2,"Version 2, June 1991"),
("licence: or any later version (file header)","%s"%U,5,"either version 2, or (at your option)"),
]
w=csv.writer(open(sys.argv[1],'w',newline=''),delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
w.writerow(['note','claim','donor_file','line','quote'])
for claim,f,ln,q in rows:
    assert '\t' not in q
    w.writerow([G,claim,f,str(ln),q])
print(len(rows),'rows')
