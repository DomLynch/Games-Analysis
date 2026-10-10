import csv,sys
OUT='/private/tmp/p2/wave2-haiku/batch3/QC003/receipts.tsv'
D='/mnt/frankendom-donors/STJr-SRB2/src/'
PU=D+'p_user.c'; PM=D+'p_mobj.c'; PMAP=D+'p_map.c'; PT=D+'p_tick.c'; RM=D+'r_main.c'; RF=D+'r_fps.c'; GG=D+'g_game.c'
N='STJr-SRB2'
R=[
("P_ResetCamera is the snap to behind the player",PU,9897,"void P_ResetCamera(player_t *player, camera_t *thiscam)"),
("reset puts camera behind player by radius on camera angle",PU,9909,"x = player->mo->x - P_ReturnThrustX(player->mo, thiscam->angle, player->mo->radius)"),
("reset height is 41/48 of player height",PU,9914,"z = player->mo->z + (41*player->height/48);"),
("reset retries MoveChaseCamera up to 2*TICRATE",PU,9941,"while (!P_MoveChaseCamera(player,thiscam,true) && ++tries < 2*TICRATE);"),
("P_MoveChaseCamera is the per-tic camera update",PU,9944,"boolean P_MoveChaseCamera(player_t *player, camera_t *thiscam, boolean resetcalled)"),
("camera speed from cvar cam_speed",PU,10056,"camspeed = cv_cam_speed.value;"),
("standard distance from cv_cam_dist",PU,10060,"camdist = FixedMul(cv_cam_dist.value, mo->scale);"),
("standard height from cv_cam_height",PU,10061,"camheight = FixedMul(cv_cam_height.value, mo->scale);"),
("standard dist set to camdist",PU,10183,"dist = camdist;"),
("ideal z is eye + camheight + distz",PU,10302,"z = mo->z + pviewheight + camheight + distz;"),
("ceiling pull-down z = ceiling - height - 11 scaled",PU,10460,"z = myceilingz - thiscam->height-FixedMul(11*FRACUNIT, mo->scale);"),
("crushed camera triggers reset",PU,10443,"if (myceilingz <= myfloorz + thiscam->height && !resetcalled && !cameranoclip)"),
("look point 64 units ahead of player",PU,10506,"dist = FixedMul(64 << FRACBITS, mo->scale);"),
("camera yaw aims at look point",PU,10519,"thiscam->angle = R_PointToAngle2(thiscam->x, thiscam->y, viewpointx, viewpointy);"),
("pitch eases by dist>>3 per tic",PU,10577,"thiscam->aiming -= (dist>>3);"),
("xy velocity = gap x camspeed",PU,10545,"thiscam->momx = FixedMul(x - thiscam->x, camspeed);"),
("z velocity = gap x camspeed",PU,10555,"thiscam->momz = FixedMul(z - thiscam->z, camspeed);"),
("camera yaw follows local input angle (standard)",PU,10037,"focusangle = localangle;"),
("camera holds yaw when camstill",PU,10090,"else if (camstill || resetcalled || player->playerstate == PST_DEAD)"),
("CS_SIMPLE side shift from facing",PU,10156,"FixedMul(FINESINE((player->mo->angle - angle) >> ANGLETOFINESHIFT)"),
("default standard saved distance 192",PU,9855,'CVAR_INIT ("cam_dist", "192",'),
("default simple distance 256",PU,9859,'CVAR_INIT ("cam_simpledist", "256",'),
("default standard saved height 40",PU,9866,'CVAR_INIT ("cam_height", "40",'),
("default simple height 60",PU,9870,'CVAR_INIT ("cam_simpleheight", "60",'),
("default cam_speed 0.3",PU,9836,'consvar_t cv_cam_speed = CVAR_INIT ("cam_speed", "0.3",'),
("speed FOV add gated by fovchange",PU,8866,"if (cv_fovchange.value)"),
("speed threshold 20 units",PU,8869,"const fixed_t runnyspeed = 20*FRACUNIT;"),
("fovadd = speed - runnyspeed",PU,8877,"player->fovadd = speed-runnyspeed;"),
("fov = cvar + fovadd",RM,942,"fixed_t fov = cv_fov.value + player->fovadd;"),
("fovchange default Off",RM,165,'consvar_t cv_fovchange = CVAR_INIT ("fovchange", "Off", CV_SAVE, CV_OnOff, NULL);'),
("hit shake intensity 8 units",PU,9236,"quake.intensity = 8*inflictor->scale;"),
("hit shake time 8 tics",PU,9237,"quake.time = 8;"),
("shake countdown guarded by quake.time",PT,859,"if (quake.time)"),
("shake falls off with distance to epicenter",RM,1168,"ir = FixedMul(ir, FRACUNIT - FixedDiv(dist, quake.radius));"),
("shake offset drawn per render frame",RM,1171,"quake.x = M_RandomRange(-ir,ir);"),
("chase view uses camera x",RM,1184,"newview->x = thiscam->x;"),
("render lerp of view x between tics",RF,198,"viewx = R_LerpFixed(prevview->x, newview->x, frac);"),
("input pitch clamp ANGLE_90-1",GG,843,"limitangle = ANGLE_90 - 1;"),
("P_CameraThinker applies stored momentum first",PM,3511,"if (thiscam->momx || thiscam->momy)"),
("camera move via P_TryCameraMove with stored momentum",PM,3513,"if (!P_TryCameraMove(thiscam->x + thiscam->momx, thiscam->y + thiscam->momy, thiscam))"),
("reset when no sight to player",PM,3522,"&& !P_CheckSight(&dummy, player->mo))"),
("slide on blocked camera move",PM,3528,"P_SlideCameraMove(thiscam);"),
("reset if momentum length unchanged after slide",PM,3530,"if (!resetcalled && P_AproxDistance(thiscam->momx, thiscam->momy) == camspeed)"),
("z integrated from momz",PM,3551,"thiscam->z += thiscam->momz + player->mo->pmomz;"),
("P_TryCameraMove definition",PMAP,2491,"boolean P_TryCameraMove(fixed_t x, fixed_t y, camera_t *thiscam)"),
("P_SlideCameraMove definition",PMAP,3554,"void P_SlideCameraMove(camera_t *thiscam)"),
("P_Ticker loops players to P_PlayerAfterThink",PT,806,"P_PlayerAfterThink(&players[i]);"),
("P_Ticker function header",PT,715,"void P_Ticker(boolean run)"),
("P_PreTicker also calls P_PlayerAfterThink",PT,961,"P_PlayerAfterThink(&players[i]);"),
("alive camera move guarded by server or added",PU,13129,"if (server || addedtogame)"),
("alive camera move call",PU,13130,"P_MoveChaseCamera(player, thiscam, false); // calculate the camera movement"),
("standard saved camera distance cvar",PU,9853,"consvar_t cv_cam_savedist[2][2] = {"),
("R_SetupFrame called at end of tick for interpolation",PT,895,"R_SetupFrame(player1);"),
("R_SetupFrame called per rendered frame",RM,1511,"R_SetupFrame(player);"),
("tick-end interpolation comment",PT,884,"Ensures view interpolation is T-1 to T in poor network conditions"),
("shake base intensity is half of intensity",RM,1151,"fixed_t ir = quake.intensity>>1;"),
("single-player fade inside 48 units",PU,10594,"< FixedMul(48*FRACUNIT, mo->scale))"),
("camera pitch target clipped",PU,10575,"G_ClipAimingPitch((INT32 *)&angle);"),
("camera pitch eases toward target",PU,10576,"dist = thiscam->aiming - angle;"),
("camera radius scaled by mo.scale",PU,10017,"thiscam->radius = FixedMul(20*FRACUNIT, mo->scale);"),
("cam_orbit default Off",PU,9840,'consvar_t cv_cam_orbit = CVAR_INIT ("cam_orbit", "Off",'),
("cam_adjust default On",PU,9841,'consvar_t cv_cam_adjust = CVAR_INIT ("cam_adjust", "On",'),
("camera disabled when cv_chasecam off",PU,9991,"if (!cv_chasecam.value && thiscam == &camera)"),
("P_CameraThinker definition",PM,3501,"boolean P_CameraThinker(player_t *player, camera_t *thiscam, boolean resetcalled)"),
]
rows=[]
for claim,f,line,q in R:
    q=q.strip()
    if not (15<=len(q)<=90): print('LEN',len(q),claim,q)
    rows.append([N,claim,f,str(line),q])
with open(OUT,'w') as fh:
    fh.write('note\tclaim\tdonor_file\tline\tquote\n')
    for r in rows:
        assert all('\t' not in c for c in r)
        fh.write('\t'.join(r)+'\n')
print('wrote',len(rows))
