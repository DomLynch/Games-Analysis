D="/mnt/frankendom-donors/ValveSoftware-halflife/"
CL=D+"dlls/client.cpp"; PM=D+"pm_shared/pm_shared.c"; CD=D+"cl_dll/cdll_int.cpp"; CB=D+"dlls/cbase.cpp"
U=D+"dlls/util.cpp"; PY=D+"dlls/python.cpp"; PH=D+"dlls/player.h"; UC=D+"common/usercmd.h"; EI=D+"engine/eiface.h"; LIC=D+"LICENSE"
N="ValveSoftware-halflife"
rows=[
("CmdStart is the per-input entry that stores the seed",CL,1789,"void CmdStart( const edict_t *player"),
("CmdStart stores the per-input random seed on the player",CL,1802,"pl->random_seed = random_seed;"),
("Donor contract: the game DLL decides lag compensation",EI,507,"The game .dll should return 1 if lag compensation"),
("AllowLagCompensation contract comment in client.cpp",CL,1927,"The game .dll should return 1 if lag compensation"),
("AllowLagCompensation entry point",CL,1934,"int AllowLagCompensation( void )"),
("StartFrame is the per-frame server hook",CL,794,"void StartFrame( void )"),
("StartFrame runs the game rules Think",CL,797,"g_pGameRules->Think();"),
("PM_Move entry point, shared client and server",PM,3326,"void PM_Move ( struct playermove_s *ppmove, int server )"),
("PM_Move calls PM_PlayerMove with the server flag",PM,3332,"PM_PlayerMove( ( server != 0 ) ? true : false );"),
("PM_PlayerMove sets the server flag then clamps input",PM,2959,"pmove->server = server;"),
("PM_PlayerMove calls PM_CheckParamters",PM,2962,"PM_CheckParamters();"),
("Frame time is the input msec as seconds",PM,2968,"pmove->frametime = pmove->cmd.msec * 0.001;"),
("PM_PlayerMove definition",PM,2954,"void PM_PlayerMove ( qboolean server )"),
("PM_CheckParamters definition",PM,2837,"void PM_CheckParamters( void )"),
("Speed ratio computed against maxspeed",PM,2868,"float fRatio = pmove->maxspeed / spd;"),
("Input vector scaled by the ratio",PM,2869,"pmove->cmd.forwardmove *= fRatio;"),
("Input zeroed when frozen, on a train or dead",PM,2878,"pmove->cmd.forwardmove = 0;"),
("Ducking halves speed while USE is held on the ground",PM,2861,"pmove->maxspeed *= 1.0f / 3.0f;"),
("PM_ReduceTimers runs timers down by input msec",PM,2916,"void PM_ReduceTimers( void )"),
("Step sound timer reduced by cmd msec",PM,2920,"pmove->flTimeStepSound -= pmove->cmd.msec;"),
("Author copyright and prohibition line",PM,11,"All other use, distribution, or modification is prohibited"),
("HUD_PlayerMove is the client prediction entry",CD,138,"void CL_DLLEXPORT HUD_PlayerMove( struct playermove_s *ppmove"),
("HUD_PlayerMove calls the same PM_Move",CD,142,"PM_Move( ppmove, server );"),
("Game DLL declares the same PM_Move for its own use",CB,26,'extern "C" void PM_Move ( struct playermove_s *ppmove'),
("UTIL_SharedRandomFloat entry point",U,112,"float UTIL_SharedRandomFloat( unsigned int seed, float low, float high )"),
("Shared random seeds the generator from seed and the float bits",U,117,"U_Srand( (int)seed + *(int *)&low + *(int *)&high );"),
("Shared random takes 16 bits of output",U,132,"tensixrand = U_Random() & 65535;"),
("Shared random maps the bits onto low to high",U,136,"return (low + offset * range );"),
("Python holster idle time drawn from the shared seed",PY,129,"m_flTimeWeaponIdle = UTIL_SharedRandomFloat( m_pPlayer->random_seed, 10, 15 );"),
("Player stores the shared seed",PH,104,"random_seed;    // See that is shared between client & server"),
("usercmd has a msec duration field",UC,24,"// Duration in ms of command"),
("usercmd has a client interpolation field lerp_msec",UC,23,"// Interpolation time on client"),
("Licence name is Half Life 1 SDK LICENSE",LIC,1,"Half Life 1 SDK LICENSE"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/P012/receipts.tsv","a") as f:
    for claim,path,line,q in rows:
        assert 15<=len(q)<=90, (len(q),q)
        assert "\t" not in q and "\t" not in claim
        f.write("\t".join([N,claim,path,str(line),q])+"\n")
print(len(rows),"rows appended")
