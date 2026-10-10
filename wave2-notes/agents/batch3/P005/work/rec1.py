import sys
F="/mnt/frankendom-donors/FWGS-xash3d-fwgs/"
N="FWGS-xash3d-fwgs (combat-sim, cell 1)"
rows=[
("weapon state struct starts at line 20", F+"common/weaponinfo.h", 20, "typedef struct weapon_data_s"),
("weapon state carries an aimed-damage field", F+"common/weaponinfo.h", 35, "m_fAimedDamage;"),
("aim-bonus field sits next to it", F+"common/weaponinfo.h", 36, "m_fNextAimBonus;"),
("engine net encoding lists aimed damage (only other reference)", F+"engine/common/net_encode.c", 144, "WPDT_DEF( m_fAimedDamage )"),
("takedamage has three values, AIM is 2", F+"common/const.h", 105, "#define DAMAGE_AIM"),
("Quake damage message is parsed and forwarded, not resolved", F+"engine/client/parse/cl_qparse.c", 597, "static void CL_ParseQuakeDamage( sizebuf_t *msg )"),
("Quake damage is handed to the client dispatcher", F+"engine/client/parse/cl_qparse.c", 604, "CL_DispatchQuakeMessage( \"Damage\" );"),
("GoldSrc damage message case", F+"engine/client/parse/cl_parse_gs.c", 625, "case svc_goldsrc_damage:"),
("GoldSrc damage message is ignored by the engine", F+"engine/client/parse/cl_parse_gs.c", 627, "// this does nothing"),
("autoaim entry point (called by game DLL via API)", F+"engine/server/sv_game.c", 2250, "static void GAME_EXPORT pfnGetAimVector"),
("start point is eye origin plus view offset", F+"engine/server/sv_game.c", 2263, "VectorAdd( start, ent->v.view_ofs, start );"),
("straight trace reaches 2048 units", F+"engine/server/sv_game.c", 2267, "VectorMA( start, 2048, dir, end );"),
("early return when the straight shot already hits an enemy", F+"engine/server/sv_game.c", 2271, "|| ent->v.team <= 0 ||"),
("default search threshold when autoaim is allowed", F+"engine/server/sv_game.c", 2277, "bestdist = sv_aim.value;"),
("threshold is 0 when autoaim is off", F+"engine/server/sv_game.c", 2278, "else bestdist = 0;"),
("candidate must have the AIM takedamage flag", F+"engine/server/sv_game.c", 2285, "if( check->v.takedamage != DAMAGE_AIM )"),
("same-team skip when shooter has a team", F+"engine/server/sv_game.c", 2291, "if( ent->v.team > 0 && ent->v.team == check->v.team )"),
("dot product must beat the running best", F+"engine/server/sv_game.c", 2304, "if( dist < bestdist )"),
("visibility trace: first hit must be the candidate", F+"engine/server/sv_game.c", 2309, "if( tr.ent == check )"),
("sv_aim cvar default is 1", F+"engine/server/sv_main.c", 25, "sv_aim, \"1\", FCVAR_ARCHIVE|FCVAR_SERVER"),
("sv_allow_autoaim cvar default is 0", F+"engine/server/sv_main.c", 26, "sv_allow_autoaim, \"0\", FCVAR_ARCHIVE|FCVAR_SERVER"),
]
out=open(sys.argv[1],"a")
for claim,f,l,q in rows:
    assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
    out.write("\t".join([N,claim,f,str(l),q])+"\n")
print("wrote",len(rows))
