import sys
N="flareteam-flare-game"
E="/mnt/frankendom-donors/flareteam-flare-engine/src/"
EN=E+"Entity.cpp"; SB=E+"StatBlock.cpp"; ES=E+"EngineSettings.cpp"; UM=E+"UtilsMath.h"; HM=E+"HazardManager.cpp"; PM=E+"PowerManager.cpp"
MOD="/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/engine/combat.txt"
LIC_E="/mnt/frankendom-donors/flareteam-flare-engine/COPYING"
LIC_G="/mnt/frankendom-donors/flareteam-flare-game/LICENSE.txt"
R=[
("takeHit is the one hit resolver",EN,319,"bool Entity::takeHit(Hazard &h) {"),
("hazard checked against each target once per hazard",HM,126,"if (!hazard->hasEntity(e)) {"),
("hazard loop gate: dangerous now",HM,107,"if (hazard->isDangerousNow()) {"),
("hazard hits player via same resolver",HM,146,"hitEntity(hindex, pc->takeHit(*hazard));"),
("hazard radius test",HM,125,"if (Utils::isWithinRadius(hazard->pos, hazard->power->radius, e->stats.pos)) {"),
("hazard crit chance copied from source CRIT",PM,1451,"haz->crit_chance = src_stats->get(Stats::CRIT);"),
("hazard accuracy copied from source ACCURACY",PM,1452,"haz->accuracy = src_stats->get(Stats::ACCURACY);"),
("avoidance stat read",EN,400,"avoidance = stats.get(Stats::AVOIDANCE);"),
("raw margin: 100 - (accuracy - avoidance)",EN,403,"float true_avoidance = 100 - (accuracy - avoidance);"),
("overhit chance from margin before clamp",EN,404,"bool is_overhit = (true_avoidance < 0 && !h.src_stats->perfect_accuracy)"),
("margin clamped to avoidance limits",EN,405,"true_avoidance = std::min(std::max(true_avoidance, eset->combat.min_avoidance),"),
("miss roll on clamped avoidance",EN,408,"if (!h.src_stats->perfect_accuracy && Math::percentChanceF(true_avoidance)) {"),
("typed damage resisted per type",EN,428,"dmg += stats.applyResistToDamage(i, dmg_part);"),
("absorb rolled from ABS_MIN..ABS_MAX",EN,434,"absorption = Math::randBetweenF(stats.get(Stats::ABS_MIN), stats.get(Stats::ABS_MAX));"),
("absorb rounds up to 1",EN,454,"if (absorption == 0) absorption = 1;"),
("absorb subtracted from damage",EN,457,"dmg = dmg - absorption;"),
("capped absorb lets 1 through (non-block)",EN,463,"else if (!stats.effects.triggered_block && eset->combat.max_absorb < 100)"),
("crit chance from hazard",EN,475,"float true_crit_chance = h.crit_chance;"),
("crit roll",EN,487,"bool crit = Math::percentChanceF(true_crit_chance);"),
("crit multiplies damage by rolled crit percent",EN,490,"dmg = (dmg * Math::randBetweenF(eset->combat.min_crit_damage,"),
("overhit multiplies damage",EN,497,"dmg = (dmg * Math::randBetweenF(eset->combat.min_overhit_damage,"),
("miss multiplies damage",EN,503,"dmg = (dmg * Math::randBetweenF(eset->combat.min_miss_damage,"),
("damage rounded by resource round method",EN,506,"dmg = eset->combat.resourceRound(dmg);"),
("damage applied to HP",EN,532,"stats.takeDamage(dmg, crit, h.source_type);"),
("poise chance roll",EN,686,"poise_success = Math::percentChanceF(stats.get(Stats::POISE));"),
("hit reaction unless stunned or poised; crit ignores poise",EN,698,"if (!stats.effects.stun && (!poise_success || crit) && !stats.prevent_interrupt) {"),
("critical hits ignore poise (comment)",EN,681,"// however, critical hits ignore poise"),
("resist per type: clamp only non-negative",SB,1650,"if (resist < eset->combat.min_resist)"),
("resisted damage = damage x (100 - resist) / 100",SB,1656,"return (damage_out * (100-resist)) / 100;"),
("takeDamage: shields first, then HP",SB,880,"hp -= effects.damageShields(dmg);"),
("engine combat defaults: loads at",ES,348,"void EngineSettings::Combat::load() {"),
("default max absorb 100",ES,351,"max_absorb = 100;"),
("default miss damage 0",ES,358,"min_miss_damage = 0;"),
("default crit damage 200 percent",ES,360,"min_crit_damage = 200;"),
("default overhit damage 100 percent",ES,362,"min_overhit_damage = 100;"),
("default resource rounding",ES,364,"resource_round_method = EngineSettings::Combat::RESOURCE_ROUND_METHOD_ROUND;"),
("default poise style is chance",ES,366,"poise_style = EngineSettings::Combat::POISE_STYLE_CHANCE;"),
("mod key absorb_percent parsed",ES,372,'if (infile.key == "absorb_percent") {'),
("mod key avoidance_percent parsed",ES,390,'else if (infile.key == "avoidance_percent") {'),
("mod key miss_damage_percent parsed",ES,397,'else if (infile.key == "miss_damage_percent") {'),
("mod key overhit_damage_percent parsed",ES,409,'else if (infile.key == "overhit_damage_percent") {'),
("resource round to nearest",ES,452,"return roundf(resource_val);"),
("percent chance is a float roll below percent",UM,64,"return randBetweenF(0, 100) < percent;"),
("percent chance function",UM,63,"inline bool percentChanceF(float percent) {"),
("empyrean mod: absorb 0 to 90",MOD,1,"absorb_percent=0,90"),
("empyrean mod: avoidance 0 to 99",MOD,4,"avoidance_percent=0,99"),
("empyrean mod: miss 25 to 50",MOD,5,"miss_damage_percent=25,50"),
("empyrean mod: overhit 125 to 150",MOD,6,"overhit_damage_percent=125,150"),
("engine licence GPL version 3",LIC_E,2,"Version 3, 29 June 2007"),
("game data licence CC BY-SA 3.0",LIC_G,3,"Attribution-ShareAlike 3.0 Unported"),
]
out=open(sys.argv[1],"w")
out.write("note\tclaim\tdonor_file\tline\tquote\n")
for c,f,l,q in R:
    assert "\t" not in q
    out.write("\t".join([N,c,f,str(l),q])+"\n")
out.close(); print("rows",len(R))
