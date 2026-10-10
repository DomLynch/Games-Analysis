import csv,sys
N='alexbatalov-fallout1-ce'
W='/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc'
M='/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc'
rows=[
(W,1426,'movement sub-step loop runs at most twice per frame','while (v109 < 2) {'),
(W,1562,'encounter check fires every wmap_day steps','if (++wmap_mile >= wmap_day) {'),
(W,1566,'encounter roll is 3d6 (first die)','random_enc_chance = roll_random(1, 6);'),
(W,1569,'no random encounter inside a town cell','if (InCity(world_xpos, world_ypos) == -1) {'),
(W,1570,'region tier looked up on a 50-tile cell grid','switch (WorldEcountChanceTable[world_ypos / 50][world_xpos / 50]) {'),
(W,1572,'tier 0 triggers on a 3d6 sum below 6','if (random_enc_chance < 6) {'),
(W,1577,'tier 1 triggers on a 3d6 sum below 7','if (random_enc_chance < 7) {'),
(W,1582,'tier 2 triggers on a 3d6 sum below 9','if (random_enc_chance < 9) {'),
(W,1587,'tier 3 triggers on a 3d6 sum below 10','if (random_enc_chance < 10) {'),
(W,300,'region tier table is 30 by 28 cells','static const unsigned char WorldEcountChanceTable[30][28] = {'),
(W,301,'first row of tier values (0 to 3)','{ 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2'),
(W,1597,'special gate starts with a 3d6 roll','special_enc_chance = roll_random(1, 6);'),
(W,1600,'special gate subtracts 5 from the 3d6 sum','special_enc_chance -= 5;'),
(W,1601,'special gate adds the Luck stat','special_enc_chance += stat_level(obj_dude, STAT_LUCK);'),
(W,1602,'special gate adds 2 per Explorer perk level','special_enc_chance += 2 * perk_level(PERK_EXPLORER);'),
(W,1603,'special gate passes to a plain encounter at below 18 or when all six are used','if (special_enc_chance < 18 || encounter_specials == 63) {'),
(W,1608,'special pick is a d100 roll','special_enc_chance = roll_random(1, 100);'),
(W,1610,'d100 picks one of six ranges','if (special_enc_chance >= SpclEncRange[v109].start'),
(W,1611,'a range already used is skipped (bitmask test)','if ((encounter_specials & (1 << v109)) != 0) {'),
(W,1616,'a special is marked used in the bitmask','encounter_specials |= 1 << v109;'),
(W,1618,'the chosen special sets the fixed map number','special_enc_num = v109 + 1;'),
(W,256,'six d100 ranges for specials (table start)','} SpclEncRange[6] = {'),
(W,892,'bitmask of used specials is cleared at world map init','encounter_specials = 0;'),
(W,911,'bitmask of used specials is written to the save','if (db_fwriteInt32(stream, encounter_specials) == -1) return -1;'),
(W,926,'bitmask of used specials is read from the save','if (db_freadInt32(stream, &encounter_specials) == -1) return -1;'),
(W,1029,'special index reset when the world map session starts','special_enc_num = 0;'),
(W,3725,'Outdoorsman is capped at 100 for the step interval','if (outdoorsman > 100.0f) {'),
(W,3729,'steps per encounter check: 60 plus 0.6 times Outdoorsman','wmap_day = (unsigned int)((outdoorsman / 100.0f) * 60.0f + 60.0f);'),
(W,3730,'time per step is 864000 over wmap_day','time_adder = (unsigned int)(864000.0f / (float)wmap_day);'),
(W,3733,'Pathfinder cuts step time by 25 percent per level','time_adder = (unsigned int)(time_adder * (1.0 - perk_level(PERK_PATHFINDER) * 0.25f));'),
(W,497,'random encounter map names: four terrains by three slots','static const char* RandEnctNames[4][3] = {'),
(W,521,'six fixed special map names','static const char* spcl_map_name[6] = {'),
(W,2126,'region tier is stored as a world global for the map','game_global_vars[GVAR_WORLD_TERRAIN] = WorldEcounTable[world_ypos / 50][world_xpos / 50];'),
(W,2134,'a special encounter loads its fixed map','if (LoadTownMap(spcl_map_name[special_enc_num - 1], 0) == -1) {'),
(W,2140,'terrain key for a normal encounter','terrain = WorldTerraTable[world_ypos / 50][world_xpos / 50];'),
(W,2142,'normal encounter picks one of three slots at random','map_index = roll_random(0, 2);'),
(W,2143,'reroll while the picked slot is empty','if (RandEnctNames[terrain][map_index] != NULL) {'),
(W,2158,'normal encounter loads the picked terrain map','if (LoadTownMap(RandEnctNames[terrain][map_index], 2) == -1) {'),
(M,1230,'map_leave_map stores the exit transition as the next map state','memcpy(&map_state, transition, sizeof(map_state));'),
(M,1288,'on arrival the dude is placed at the stored tile','obj_move_to_tile(obj_dude, map_state.tile, map_state.elevation, NULL);'),
]
out=sys.argv[1]
with open(out,'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for path,line,claim,quote in rows:
        assert '\t' not in quote and '\t' not in claim
        w.writerow([N,claim,path,str(line),quote])
print('appended',len(rows))
for path,line,claim,quote in rows:
    if not (15<=len(quote)<=90): print('LEN',len(quote),line,quote[:50])
