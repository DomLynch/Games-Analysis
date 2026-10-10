import csv
N="STJr-SRB2"
E="/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c"
M="/mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c"
rows=[
("look-for-players defined",E,447,"boolean P_LookForPlayers(mobj_t *actor, boolean allaround, boolean tracer, fixed_t dist)"),
("budget counter declared",E,449,"INT32 c = 0, stop;"),
("scan cursor first-time init",E,454,"if (actor->lastlook < 0)"),
("cursor wraps to MAXPLAYERS",E,457,"actor->lastlook %= MAXPLAYERS;"),
("stop = one cycle back",E,459,"stop = (actor->lastlook - 1) & PLAYERSMASK;"),
("budget: third in-game slot returns false",E,470,"if (c++ == 2)"),
("invisible players skipped",E,478,"if (player->pflags & PF_INVIS)"),
("dead players skipped",E,484,"if (player->mo->health <= 0)"),
("3D distance cap",E,494,"P_AproxDistance(P_AproxDistance(player->mo->x - actor->x, player->mo->y - actor->y)"),
("behind-the-back angle test",E,500,"an > ANGLE_90 && an < ANGLE_270"),
("behind branch overwrites dist (quirk)",E,502,"dist = P_AproxDistance(player->mo->x - actor->x, player->mo->y - actor->y);"),
("behind: melee reach only",E,504,"if (dist > FixedMul(MELEERANGE, actor->scale))"),
("line of sight check",E,509,"if (!P_CheckSight(actor, player->mo))"),
("tracer variant sets tracer",E,513,"P_SetTarget(&actor->tracer, player->mo);"),
("target set on success",E,515,"P_SetTarget(&actor->target, player->mo);"),
("A_Look defined",E,720,"void A_Look(void *data)"),
("A_Look calls scan with var1 cone and range",E,729,"if (!P_LookForPlayers(actor, locvar1 & 65535, false"),
("A_Chase defined",E,754,"void A_Chase(void *data)"),
("threshold counter present",E,770,"if (actor->threshold)"),
("threshold reset when no live target",E,773,"actor->threshold = 0;"),
("re-look when target not shootable (allaround, no range)",E,790,"if (!actor->target || !(actor->target->flags & MF_SHOOTABLE))"),
("re-look call with allaround true and dist 0",E,793,"if (P_LookForPlayers(actor, true, false, 0))"),
("multiplayer re-look gate",E,831,"if (multiplayer && !actor->threshold && (actor->target->health <= 0"),
("chase step or new direction",E,836,"if (--actor->movecount < 0 || (!P_Move(actor, actor->info->speed)"),
("A_SharpChase re-look call",E,1705,"if (P_LookForPlayers(actor, true, false, 0))"),
("threshold set when a missile attack starts",E,1718,"actor->threshold = actor->info->painchance;"),
("MELEERANGE constant",  "/mnt/frankendom-donors/STJr-SRB2/src/p_local.h",47,"#define MELEERANGE (64*FRACUNIT)"),
("MAXPLAYERS constant","/mnt/frankendom-donors/STJr-SRB2/src/doomdef.h",244,"#define MAXPLAYERS 32"),
("licence header","/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c",8,"terms of the GNU General Public License, version 2."),
("boss targeting defined",M,3969,"boolean P_BossTargetPlayer(mobj_t *actor, boolean closest)"),
("boss cursor init",M,3976,"if (actor->lastlook < 0)"),
("boss cycle end test",M,3986,"else if (actor->lastlook == stop)"),
("boss closest returns when a player was found",M,3987,"return (closest && lastdist > 0);"),
("boss non-closest budget of two",M,3992,"if (!closest && c++ == 2)"),
("boss closest uses 2D distance",M,4011,"dist = P_AproxDistance(actor->x - player->mo->x, actor->y - player->mo->y);"),
("boss closest keeps nearest",M,4012,"if (!lastdist || dist < lastdist)"),
("pyre caller range 1500",M,9010,"P_LookForPlayers(mobj, true, false, 1500*FRACUNIT);"),
("pterabyte caller range 256",M,9081,"P_LookForPlayers(mobj, true, false, 256*FRACUNIT);"),
("tracer caller radius x16",M,9426,"P_LookForPlayers(mobj, true, true, mobj->radius*16);"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q023/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,path,line,q in rows:
        assert "\t" not in q
        w.writerow([N,claim,path,line,q])
print(len(rows))
