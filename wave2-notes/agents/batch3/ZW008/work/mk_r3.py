import csv,sys
N='alexbatalov-fallout2-ce'
W='/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc'
rows=[
(W,3322,'random encounter check is a single function','static int wmRndEncounterOccurred()'),
(W,3324,'the throttle uses wall-clock ticks','unsigned int now = getTicks();'),
(W,3325,'checks are at least 1500 ms apart','if (getTicksBetween(now, wmLastRndTime) < 1500) {'),
(W,3329,'the check time is recorded after the throttle','wmLastRndTime = now;'),
(W,3331,'no check unless the X offset since the last fired roll is 3 or more','if (abs(wmGenData.oldWorldPosX - wmGenData.worldPosX) < 3) {'),
(W,3335,'no check unless the Y offset since the last fired roll is 3 or more','if (abs(wmGenData.oldWorldPosY - wmGenData.worldPosY) < 3) {'),
(W,3341,'no random encounter inside a located area','if (areaIdx != -1) {'),
(W,3394,'day part comes from the game clock hour','int gameTimeHour = gameTimeGetHour();'),
(W,3395,'night is 18:00 to 06:00','if (gameTimeHour >= 1800 || gameTimeHour < 600) {'),
(W,3403,'tile frequency by day part, read from a named level','int frequency = wmFreqValues[wmGenData.currentSubtile->encounterChance[dayPart]];'),
(W,3405,'difficulty modifier is one fifteenth of the frequency','int modifier = frequency / 15;'),
(W,3416,'occurrence roll is 0 to 100','int chance = randomBetween(0, 100);'),
(W,3417,'no encounter when the roll is at or above the frequency','if (chance >= frequency) {'),
(W,3421,'an encounter picks its table entry after the roll passes','wmRndEncounterPick();'),
(W,3445,'car travel uses a day-part modifier','if (wmGenData.isInCar) {'),
(W,3451,'car travel subtracts the day-part modifier from frequency','frequency -= modifiers[dayPart];'),
(W,3455,'an encounter is detected by skill when frequency beats the roll','if (frequency > chance) {'),
(W,3460,'a motion sensor owned by the dude adds 20 to outdoorsman','outdoorsman += 20;'),
(W,3464,'outdoorsman is capped at 95 before the tile modifier','if (outdoorsman > 95) {'),
(W,3473,'the tile encounter difficulty modifier is added after the cap','outdoorsman += tile->encounterDifficultyModifier;'),
(W,3475,'detection roll is 1 to 100 under outdoorsman','if (randomBetween(1, 100) < outdoorsman) {'),
(W,3478,'avoidance experience is 100 minus outdoorsman','int xp = 100 - outdoorsman;'),
(W,3498,'in car, a roll at or above the reduced frequency is detected without a skill check','randomEncounterIsDetected = true;'),
(W,3501,'the reference position is set only when an encounter fires','wmGenData.oldWorldPosX = wmGenData.worldPosX;'),
(W,3564,'table id comes from the tile subtile type','wmGenData.encounterTableId = wmGenData.currentSubtile->encounterType;'),
(W,3575,'entries are filtered by their condition','if (wmEvalConditional(&(encounterTableEntry->condition), nullptr) == 0) {'),
(W,3579,'an entry with counter 0 is not selectable','if (encounterTableEntry->counter == 0) {'),
(W,3585,'total weight is the sum of selectable entry chances','totalChance += encounterTableEntry->chance;'),
(W,3589,'luck shifts the pick by luck minus 5','int effectiveLuck = critterGetStat(gDude, STAT_LUCK) - 5;'),
(W,3590,'pick roll is 0 to total plus luck','int chance = randomBetween(0, totalChance) + effectiveLuck;'),
(W,3592,'Explorer perk adds 2 to the pick roll','if (perkHasRank(gDude, PERK_EXPLORER)) {'),
(W,3607,'easy difficulty clamps the pick roll to the total','if (chance > totalChance) {'),
(W,3620,'walk the selectable entries by weight','for (index = 0; index < candidatesLength; index++) {'),
(W,3626,'weight is subtracted as the walk passes each entry','chance -= encounterTableEntry->chance;'),
(W,3629,'a roll past the end is clamped to the last candidate (no guard for zero candidates)','if (index == candidatesLength) {'),
(W,3636,'a positive counter is spent on pick','if (encounterTableEntry->counter > 0) {'),
(W,3637,'the spend is one per pick','encounterTableEntry->counter--;'),
(W,3640,'entry map -1 means use the table or terrain map list','if (encounterTableEntry->map == -1) {'),
(W,3643,'terrain map list is picked uniformly','int randommapIdx = randomBetween(0, terrain->mapsLength - 1);'),
(W,3650,'a fixed entry map overrides the lists','wmGenData.encounterMapId = encounterTableEntry->map;'),
(W,3693,'each sub-entry rolls a critter count between its min and max','int critterCount = randomBetween(encounterTableSubEntry->minimumCount,'),
(W,3697,'easy difficulty takes 2 off the count, floored at the minimum','critterCount -= 2;'),
(W,3703,'hard difficulty adds 2 to the count','critterCount += 2;'),
(W,3708,'a party above two members adds 2 critters','if (partyMemberCount > 2) {'),
(W,4106,'condition type list includes a global variable compare','case ENCOUNTER_CONDITION_TYPE_GLOBAL:'),
(W,4118,'random condition is a 0 to 100 roll','value = randomBetween(0, 100);'),
(W,4119,'random condition passes at or below its parameter','if (value > conditionEntry->param) {'),
(W,4136,'time of day condition reads the clock hour','value = gameTimeGetHour();'),
(W,4145,'an AND condition stops at the first failure','if (condition->logicalOperators[index] == ENCOUNTER_LOGICAL_OPERATOR_AND) {'),
(W,570,'day part frequency modifiers (values 40, 30, 0 at lines 571-573)','static const int gDayPartEncounterFrequencyModifiers[DAY_PART_COUNT] = {'),
(W,176,'day part order starts at morning','DAY_PART_MORNING,'),
(W,178,'day part list ends at night','DAY_PART_NIGHT,'),
(W,604,'named frequency levels (none to forced)','static const char* wmFreqStrs[ENCOUNTER_FREQUENCY_TYPE_COUNT] = {'),
(W,1333,'tile encounter difficulty is read from the map config','tile->encounterDifficultyModifier = encounterDifficulty;'),
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
