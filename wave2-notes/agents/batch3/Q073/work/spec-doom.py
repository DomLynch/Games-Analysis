import json
D = "/mnt/frankendom-donors/id-Software-DOOM/"
L = D + "linuxdoom-1.10/"
N = "id-Software-DOOM"
uniq = [
 (N, "licence: p_map.c header names the DOOM Source Code License", L+"p_map.c", "only under the terms of the DOOM Source Code License as"),
 (N, "top-level LICENSE.TXT is GPL v2 text (conflicts with file header)", D+"LICENSE.TXT", "GNU GENERAL PUBLIC LICENSE"),
 (N, "P_LineAttack damage-0 is a test trace", L+"p_map.c", "If damage == 0, it is just a test trace"),
 (N, "aim window starts at +-100/160 slope", L+"p_map.c", "topslope = 100*FRACUNIT/160;"),
 (N, "aim window bottom slope", L+"p_map.c", "bottomslope = -100*FRACUNIT/160;"),
 (N, "aim traverse narrows window at two-sided lines", L+"p_map.c", "if (topslope <= bottomslope)"),
 (N, "aim traverse: thing below window rejected", L+"p_map.c", "if (thingbottomslope > topslope)"),
 (N, "aim slope is midpoint of thing range clipped to window", L+"p_map.c", "aimslope = (thingtopslope+thingbottomslope)/2;"),
 (N, "shoot traverse rejects thing above aim slope", L+"p_map.c", "if (thingtopslope < aimslope)"),
 (N, "shoot traverse rejects thing below aim slope", L+"p_map.c", "if (thingbottomslope > aimslope)"),
 (N, "shoot traverse applies damage at first thing in window", L+"p_map.c", "P_DamageMobj (th, shootthing, shootthing, la_damage);"),
 (N, "shoot traverse skips la_damage zero", L+"p_map.c", "if (la_damage)"),
 (N, "P_LineAttack sets aimslope from argument", L+"p_map.c", "aimslope = slope;"),
 (N, "melee range constant", L+"p_local.h", "#define MELEERANGE"),
 (N, "missile range constant", L+"p_local.h", "#define MISSILERANGE"),
 (N, "fist damage 2 x (1..10)", L+"p_pspr.c", "damage = (P_Random ()%10+1)<<1;"),
 (N, "berserk multiplies fist by 10", L+"p_pspr.c", "if (player->powers[pw_strength])"),
 (N, "pistol damage 5 x (1..3)", L+"p_pspr.c", "damage = 5*(P_Random ()%3+1);"),
 (N, "bullet slope aim range 16 x 64", L+"p_pspr.c", "bulletslope = P_AimLineAttack (mo, an, 16*64*FRACUNIT);"),
 (N, "bullet slope probes +90 units of angle", L+"p_pspr.c", "an += 1<<26;"),
 (N, "bullet slope probes -90 units of angle", L+"p_pspr.c", "an -= 2<<26;"),
 (N, "pistol shot line attack", L+"p_pspr.c", "P_LineAttack (mo, angle, MISSILERANGE, bulletslope, damage);"),
 (N, "monster shot damage 3 x (1..5)", L+"p_enemy.c", "damage = ((P_Random()%5)+1)*3;"),
 (N, "monster shot aims first", L+"p_enemy.c", "slope = P_AimLineAttack (actor, angle, MISSILERANGE);"),
 (N, "monster shot spread", L+"p_enemy.c", "angle += (P_Random()-P_Random())<<20;"),
 (N, "monster shot line attack", L+"p_enemy.c", "P_LineAttack (actor, angle, MISSILERANGE, slope, damage);"),
 (N, "P_DamageMobj gate on shootable", L+"p_inter.c", "if ( !(target->flags & MF_SHOOTABLE) )"),
 (N, "baby skill halves player damage", L+"p_inter.c", "take half damage in trainer mode"),
 (N, "push uses damage over mass", L+"p_inter.c", "thrust = damage*(FRACUNIT>>3)*100/target->info->mass;"),
 (N, "chainsaw does not push", L+"p_inter.c", "|| source->player->readyweapon != wp_chainsaw))"),
 (N, "god/invuln absorbs hits under 1000", L+"p_inter.c", "if ( damage < 1000"),
 (N, "god/invuln comment", L+"p_inter.c", "ignore damage in GOD mode, or with INVUL power."),
 (N, "armour class 1 soaks a third", L+"p_inter.c", "saved = damage/3;"),
 (N, "armour class 2 soaks a half", L+"p_inter.c", "saved = damage/2;"),
 (N, "armour used up clamps saved to points", L+"p_inter.c", "if (player->armorpoints <= saved)"),
 (N, "armour points reduced by saved", L+"p_inter.c", "player->armorpoints -= saved;"),
 (N, "monster health reduced by damage", L+"p_inter.c", "target->health -= damage;"),
 (N, "death call when health <= 0", L+"p_inter.c", "P_KillMobj (source, target);"),
 (N, "pain roll against painchance", L+"p_inter.c", "if ( (P_Random () < target->info->painchance)"),
 (N, "retarget to source when not busy", L+"p_inter.c", "if ( (!target->threshold || target->type == MT_VILE)"),
 (N, "retarget sets target to source", L+"p_inter.c", "target->target = source;"),
 (N, "retarget sets threshold", L+"p_inter.c", "target->threshold = BASETHRESHOLD;"),
]
dup = [
 (N, "aim probe start shootz = z + half height + 8", L+"p_map.c", "shootz = t1->z + (t1->height>>1) + 8*FRACUNIT;"),
 (N, "P_PathTraverse in aim", L+"p_map.c", "PTR_AimTraverse );"),
 (N, "PTR_ShootTraverse is the line-attack callback", L+"p_map.c", "PTR_ShootTraverse );"),
 (N, "shotgun pellets 5 x (1..3) (20 pellets)", L+"p_pspr.c", "damage = 5*(P_Random ()%3+1);"),
 (N, "monster and pistol spread shift 18 bits", L+"p_pspr.c", "angle += (P_Random()-P_Random())<<18;"),
 (N, "double-barrel loop of 20 pellets", L+"p_pspr.c", "for (i=0 ; i<20 ; i++)"),
]
json.dump([list(s) for s in uniq], open("spec-doom.json","w"), indent=1)
json.dump([list(s) for s in dup], open("spec-doom-first.json","w"), indent=1)
print(len(uniq), len(dup))
