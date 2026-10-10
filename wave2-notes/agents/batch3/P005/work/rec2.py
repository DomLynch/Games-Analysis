import sys
W="/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/"
N="id-Software-wolf3d (ai-aggro, cell 2)"
rows=[
("SightPlayer is the sight/noise/proximity wake check", W+"WL_STATE.C", 1404, "boolean SightPlayer (objtype *ob)"),
("reaction countdown in tics", W+"WL_STATE.C", 1414, "ob->temp2 -= tics;"),
("no wake unless noise or line of sight", W+"WL_STATE.C", 1432, "if (!madenoise && !CheckSight (ob))"),
("guard random reaction delay", W+"WL_STATE.C", 1440, "ob->temp2 = 1+US_RndT()/4;"),
("dog random reaction delay", W+"WL_STATE.C", 1452, "ob->temp2 = 1+US_RndT()/8;"),
("ambush actors need sight before waking", W+"WL_STATE.C", 1421, "if (!areabyplayer[ob->areanumber])"),
("auto-sight box constant", W+"WL_STATE.C", 1185, "#define MINSIGHT"),
("auto-sight box test (1.5 tiles)", W+"WL_STATE.C", 1203, "if (deltax > -MINSIGHT && deltax < MINSIGHT"),
("CheckSight entry", W+"WL_STATE.C", 1187, "boolean CheckSight (objtype *ob)"),
("CheckSight falls through to the tile line trace", W+"WL_STATE.C", 1236, "return CheckLine (ob);"),
("CheckLine is the unobstructed-line test", W+"WL_STATE.C", 1037, "boolean CheckLine (objtype *ob)"),
("FirstSighting puts the actor into chase", W+"WL_STATE.C", 1253, "void FirstSighting (objtype *ob)"),
("guard chase state and speed multiplier", W+"WL_STATE.C", 1262, "NewState (ob,&s_grdchase1);"),
("guard speed x3 when chasing", W+"WL_STATE.C", 1263, "ob->speed *= 3;"),
("DamageActor sets the noise flag", W+"WL_STATE.C", 966, "madenoise = true;"),
("DamageActor doubles damage on an unaware actor", W+"WL_STATE.C", 971, "if ( !(ob->flags & FL_ATTACKMODE) )"),
("DamageActor sends the actor to combat on a hit", W+"WL_STATE.C", 981, "FirstSighting (ob);"),
("DamageActor entry", W+"WL_STATE.C", 964, "void DamageActor (objtype *ob, unsigned damage)"),
("noise flag cleared once per play loop", W+"WL_PLAY.C", 1404, "madenoise = false;"),
("PlayLoop calls DoActor for every object", W+"WL_PLAY.C", 1368, "void PlayLoop (void)"),
("DoActor counts a state's tics down", W+"WL_PLAY.C", 1300, "ob->ticcount-=tics;"),
("CalcTics measures tics since last frame", W+"WL_DRAW.C", 1249, "tics = newtime-lasttimecount;"),
("tics are clamped to MAXTICS", W+"WL_DRAW.C", 1262, "if (tics>MAXTICS)"),
("clamp value", W+"WL_DRAW.C", 1265, "tics = MAXTICS;"),
("T_Stand calls SightPlayer each tic", W+"WL_ACT2.C", 3049, "SightPlayer (ob);"),
("T_Path checks SightPlayer while patrolling", W+"WL_ACT2.C", 3372, "if (SightPlayer (ob))"),
("T_Chase entry", W+"WL_ACT2.C", 3069, "void T_Chase (objtype *ob)"),
("T_Chase checks line of sight", W+"WL_ACT2.C", 3079, "if (CheckLine(ob))"),
("shot chance is (tics*16)/distance", W+"WL_ACT2.C", 3087, "chance = (tics<<4)/dist;"),
("shot roll against chance", W+"WL_ACT2.C", 3089, "if ( US_RndT()<chance)"),
("dodge when in sight and no shot", W+"WL_ACT2.C", 3147, "SelectDodgeDir (ob);"),
("chase when no line of sight", W+"WL_ACT2.C", 3149, "SelectChaseDir (ob);"),
("SelectDodgeDir entry", W+"WL_STATE.C", 359, "void SelectDodgeDir (objtype *ob)"),
("turnaround allowed only on first attack", W+"WL_STATE.C", 372, "turnaround = nodir;"),
("dodge uses a 50/50 swap of preference", W+"WL_STATE.C", 425, "if (US_RndT() < 128)"),
("dodge diagonal toward the player", W+"WL_STATE.C", 435, "dirtry[0] = diagonal [ dirtry[1] ] [ dirtry[2] ];"),
("SelectChaseDir entry", W+"WL_STATE.C", 475, "void SelectChaseDir (objtype *ob)"),
("chase search direction is random", W+"WL_STATE.C", 536, "if (US_RndT()>128)"),
("licence: educational use only", W+"README/LICENSE.DOC", 27, "For educational purposes only"),
("licence header", W+"README/LICENSE.DOC", 12, "ID SOFTWARE LICENSE"),
("random table start", "/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_US_A.ASM", 19, "rndtable db    0,   8, 109, 220"),
("random table comment: range", "/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_US_A.ASM", 81, "Return a random # between 0-255"),
("random function is a table walk (declaration comment)", "/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_US_A.ASM", 80, "int US_RndT (void)"),
]
out=open(sys.argv[1],"a")
for claim,f,l,q in rows:
    assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
    out.write("\t".join([N,claim,f,str(l),q])+"\n")
print("wrote",len(rows))
