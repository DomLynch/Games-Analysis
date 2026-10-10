import sys
N="ioquake-ioq3"
UI="/mnt/frankendom-donors/ioquake-ioq3/code/ui/ui_atoms.c"
GA="/mnt/frankendom-donors/ioquake-ioq3/code/game/g_arenas.c"
MA="/mnt/frankendom-donors/ioquake-ioq3/code/ui/ui_main.c"
CM="/mnt/frankendom-donors/ioquake-ioq3/code/qcommon/cmd.c"
CU="/mnt/frankendom-donors/ioquake-ioq3/code/client/cl_ui.c"
SV="/mnt/frankendom-donors/ioquake-ioq3/code/server/sv_game.c"
CG="/mnt/frankendom-donors/ioquake-ioq3/code/cgame/cg_servercmds.c"
SY="/mnt/frankendom-donors/ioquake-ioq3/code/game/g_syscalls.c"
LI="/mnt/frankendom-donors/ioquake-ioq3/COPYING.txt"
R=[
("post-game entry point",UI,240,"static void UI_CalcPostGameStats( void ) {"),
("postgame command dispatch",UI,382,'if ( Q_stricmp (cmd, "postgame") == 0 ) {'),
("dispatch calls the calc",UI,383,"UI_CalcPostGameStats();"),
("per-map record file name",UI,255,'Com_sprintf(fileName, MAX_QPATH, "games/%s_%i.game", map, game);'),
("accuracy read from arg 3",UI,268,"newInfo.accuracy = atoi(UI_Argv(3));"),
("base score read from arg 9",UI,274,"newInfo.baseScore = atoi(UI_Argv(9));"),
("time read from arg 13",UI,278,"time = atoi(UI_Argv(13));"),
("run time in seconds from match start",UI,281,'newInfo.time = (time - trap_Cvar_VariableValue("ui_matchStartTime")) / 1000;'),
("time bonus gate",UI,283,"if (newInfo.time < adjustedTime) {"),
("time bonus 10 per second under par",UI,284,"newInfo.timeBonus = (adjustedTime - newInfo.time) * 10;"),
("shutout gate (red ahead, blue at 0)",UI,289,"if (newInfo.redScore > newInfo.blueScore && newInfo.blueScore <= 0) {"),
("shutout bonus constant 100",UI,290,"newInfo.shutoutBonus = 100;"),
("skill multiplier from cvar",UI,295,'newInfo.skillBonus = trap_Cvar_VariableValue("g_spSkill");'),
("skill floor of 1",UI,296,"if (newInfo.skillBonus <= 0) {"),
("score = base + shutout + time bonus",UI,299,"newInfo.score = newInfo.baseScore + newInfo.shutoutBonus + newInfo.timeBonus;"),
("score multiplied by skill",UI,300,"newInfo.score *= newInfo.skillBonus;"),
("new high only if red ahead and higher",UI,303,"newHigh = (newInfo.redScore > newInfo.blueScore && newInfo.score > oldInfo.score);"),
("record overwritten on new high",UI,311,"trap_FS_Write(&newInfo, sizeof(postGameInfo_t), f);"),
("new best time check (no win gate)",UI,316,"if (newInfo.time < oldInfo.time) {"),
("both score sets shown",UI,329,"UI_SetBestScores(&newInfo, qtrue);"),
("post-game screen with new-high flag",UI,330,"UI_ShowPostGame(newHigh);"),
("match start time set by cgame",CG,492,'trap_Cvar_Set("ui_matchStartTime", va("%i", cg.time));'),
("five named skill levels",MA,46,"static const char *skillLevels[] = {"),
("skill count from table",MA,54,"static const int numSkillLevels = ARRAY_LEN( skillLevels );"),
("time to beat parsed per gametype digit",MA,4848,"if (!Int_Parse(p, &uiInfo.mapList[uiInfo.mapCount].timeToBeat[token[0] - 0x30])) {"),
("game sends postgame line (appended)",GA,134,"trap_SendConsoleCommand( EXEC_APPEND, msg );"),
("base build postgame has 8 values",GA,117,'"postgame %i %i %i %i %i %i %i %i", level.numNonSpectatorClients'),
("base build perfect flag",GA,116,"perfect = ( level.clients[playerClientNum].ps.persistant[PERS_RANK] == 0"),
("MISSIONPACK build postgame has 14 values",GA,110,'"postgame %i %i %i %i %i %i %i %i %i %i %i %i %i %i", level.numNonSpectatorClients'),
("sorted client list appended to line",GA,126,"n = level.sortedClients[i];"),
("client list entry is client, rank, score",GA,127,"Com_sprintf( buf, sizeof(buf), \" %i %i %i\", n, level.clients[n]"),
("MISSIONPACK guard opens",GA,85,"#ifdef MISSIONPACK"),
("unhandled command falls to UI",CM,808,"if ( com_cl_running && com_cl_running->integer && UI_GameCommand() ) {"),
("UI console command entry",CU,1167,"return VM_Call( uivm, UI_CONSOLE_COMMAND, cls.realtime );"),
("server runs game console text",SV,322,"Cbuf_ExecuteText( args[1], VMA(2) );"),
("game trap for console command",SY,91,"syscall( G_SEND_CONSOLE_COMMAND, exec_when, text );"),
("ui licence header later version",UI,10,"or (at your option) any later version."),
("gpl version 2 text",LI,2,"Version 2, June 1991"),
("new high banner length 20 s",UI,307,"uiInfo.newHighScoreTime = uiInfo.uiDC.realTime + 20000;"),
("new best time banner length 20 s",UI,317,"uiInfo.newBestTime = uiInfo.uiDC.realTime + 20000;"),
("old record is zeroed when no file",UI,257,"memset(&oldInfo, 0, sizeof(postGameInfo_t));"),
]
out=open(sys.argv[1],"w")
out.write("note\tclaim\tdonor_file\tline\tquote\n")
for c,f,l,q in R:
    assert "\t" not in q and "\t" not in c
    out.write("\t".join([N,c,f,str(l),q])+"\n")
out.close()
print("rows",len(R))
