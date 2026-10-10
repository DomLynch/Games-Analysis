import sys
D="/mnt/frankendom-donors/dkfans-keeperfx/src/"
N="dkfans-keeperfx"
rows=[
("apply_damage_to_thing is the damage entry point for a thing", D+"thing_stats.c", 1125, "HitPoints apply_damage_to_thing(struct Thing *thing, HitPoints dmg,"),
("a thing already below zero health takes no more damage", D+"thing_stats.c", 1132, "if (thing->health < 0)"),
("creature armour is read through calculate_correct_creature_armour", D+"thing_stats.c", 984, "long carmor = calculate_correct_creature_armour(thing);"),
("PreventDamage flag returns 0 before armour and health", D+"thing_stats.c", 980, "if ((cctrl->creature_control_flags & CCFlg_PreventDamage) != 0) {"),
("armour soak: damage * (256 - armour) / 256", D+"thing_stats.c", 986, "HitPoints cdamage = (dmg * (256 - carmor)) / 256;"),
("a landed hit always does at least 1 damage", D+"thing_stats.c", 987, "if (cdamage <= 0)"),
("health is reduced by the post-armour damage", D+"thing_stats.c", 990, "thing->health -= cdamage;"),
("last_turn_damaged is set to the game turn plus one", D+"thing_stats.c", 991, "thing->last_turn_damaged = get_gameturn() + 1;"),
("object damage takes the raw amount with no armour", D+"thing_stats.c", 1018, "HitPoints cdamage = dmg;"),
("kill credit is recorded only when no player holds it yet", D+"thing_stats.c", 1144, "if ((cctrl->fighting_player_idx == -1) && (dealing_plyr_idx != -1))"),
("kill credit is set to the dealing player", D+"thing_stats.c", 1146, "cctrl->fighting_player_idx = dealing_plyr_idx;"),
("armour base is multiplied by 320/256 under the armour spell", D+"thing_stats.c", 707, "max_param = (320 * max_param) / 256;"),
("armour is capped at 204 after the buff", D+"thing_stats.c", 709, "if (max_param > 204)"),
("donor comment: 80 percent absorb cap", D+"thing_stats.c", 708, "// This limit makes armour absorb up to 80% of damage even with the buff."),
("dungeon modifier scales armour by percent", D+"thing_stats.c", 718, "max_param = (max_param * modifier) / 100;"),
("armour is capped at 255", D+"thing_stats.c", 721, "if (max_param >= 255)"),
("defence has no dungeon modifier yet (TODO in donor)", D+"thing_stats.c", 731, "// TODO: Add a dungeon modifier."),
("hit roll: hitchance is (shot dexterity - defence) / 2", D+"thing_shots.c", 970, "long hitchance = ((long)shotng->shot.dexterity - crdefense) / 2;"),
("hitchance clamped at -96", D+"thing_shots.c", 971, "if (hitchance < -96)"),
("hit lands if a 0..255 roll is below 128 + hitchance", D+"thing_shots.c", 979, "if (THING_RANDOM(shotng, 256) < (128 + hitchance))"),
("NeverBlock shots skip the hit roll", D+"thing_shots.c", 967, "if (NeverBlock)"),
("melee blow doubles when the luck roll is under luck", D+"thing_stats.c", 517, "if (THING_RANDOM(thing, 100) < luck)"),
("melee blow doubling result", D+"thing_stats.c", 518, "max_param *= 2;"),
("calculate_melee_damage passes strength into the luck roll", D+"thing_creature.c", 3610, "long damage = compute_creature_attack_melee_damage(strength,"),
("melee shot hit path calls the damage wrapper with the shooter owner", D+"thing_shots.c", 1120, "damage = apply_damage_to_thing_and_display_health(trgtng, damage, shooter->owner);"),
("display wrapper calls apply_damage_to_thing", D+"thing_creature.c", 6236, "cdamage = apply_damage_to_thing(thing, dmg, inflicting_plyr_idx);"),
("health bar display turns set to 8 on damage", D+"thing_creature.c", 6241, "thing->creature.health_bar_turns = 8;"),
("per-thing random seed macro used for the rolls", D+"game_merge.h", 61, "#define THING_RANDOM(thing, range) LbRandomSeries(range, &((struct Thing*)"),
("licence header: any later version of GPL 2", D+"thing_stats.c", 16, "(at your option) any later version."),
]
out=["note\tclaim\tdonor_file\tline\tquote"]
for claim,f,l,q in rows:
    out.append("\t".join([N,claim,f,str(l),q]))
open(sys.argv[1],"w").write("\n".join(out)+"\n")
print(len(rows),"rows")
