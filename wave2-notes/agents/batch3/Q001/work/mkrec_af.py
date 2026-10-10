import sys,csv
AF='/mnt/frankendom-donors/afritz1-OpenTESArena/'
EU=AF+'OpenTESArena/src/Entities/ArenaEntityUtils.cpp'
EH=AF+'OpenTESArena/src/Entities/ArenaEntityUtils.h'
GS=AF+'OpenTESArena/src/Game/GameState.cpp'
GM=AF+'OpenTESArena/src/Game/Game.cpp'
ECM=AF+'OpenTESArena/src/Entities/EntityChunkManager.cpp'
RND=AF+'OpenTESArena/src/Math/Random.cpp'
AMU=AF+'OpenTESArena/src/Math/ArenaMathUtils.cpp'
EXD=AF+'OpenTESArena/src/Assets/ExeData.cpp'
LIC=AF+'LICENSE.txt'
N='afritz1-OpenTESArena'
rows=[
("encounter minute gate: city allowed only when no citizens present",EU,1012,"return !areCitizensPresent; // During night"),
("encounter hour gate: wilderness is always eligible on an hour change",EU,1030,"if (environmentType == ArenaEnvironmentType::Wilderness)"),
("night defined in the encounter parameters as hour <= 5 or >= 18",EU,1059,"const bool isNightTime = (hour <= 5) || (hour >= 18);"),
("trespassing inside a building: fixed chance 20",EU,1074,"encounterChance = 20;"),
("wilderness table index comes from the terrain type argument",EU,1106,"encounterTableIndex = terrainType;"),
("night adds 7 to the encounter table index",EU,1142,"encounterTableIndex += 7;"),
("table index 13 or higher means no encounter",EU,1145,"if (encounterTableIndex >= 13)"),
("holiday nights override the chance to 25",EU,1157,"encounterChance = 25;"),
("weighted level: bounded dice roll with twice the level as max",EU,1166,"int rolledValue = ArenaMathUtils::rollBoundedDice(encounterLevel * 2, random);"),
("weighted level: folds values above the level back down",EU,1169,"rolledValue = (encounterLevel * 2) - rolledValue;"),
("encounter level: plus one, capped at 20 for scaling",EU,1179,"encounterLevel = std::min(encounterLevel + 1, maxEncounterScalingLevel);"),
("encounter level: adds a random 0 to 3",EU,1180,"encounterLevel = encounterLevel + random.next(4);"),
("encounter level: accept the roll only if at least half the level",EU,1185,"if (r >= (encounterLevel / 2))"),
("encounter level: otherwise round down to even and reroll",EU,1191,"encounterLevel = (encounterLevel >> 1) * 2;"),
("level-zero player gets a weak encounter (0 to 2)",EU,1196,"encounterLevel = random.next(3);"),
("main-quest floor relative to player level (not used by the caller)",EU,1201,"encounterLevel = playerLevel - random.next(3);"),
("two matching table rows, one picked by a coin flip",EU,1218,"const int chosen = matches[random.next() & 1];"),
("debug-only assertion that exactly two rows match",EU,1217,"DebugAssert(count == 2);"),
("ring spawn: 40 attempts per radius before widening",EU,1239,"while (attempts < 40)"),
("ring spawn: random offset is the signed 16-bit random value shifted right",EU,1241,"static_cast<int16_t>(random.next()) >> shift);"),
("ring spawn: a sample on the player's own tile is rejected",EU,1254,"if (tileIndex == playerTileIndex)"),
("ring spawn: widen the radius by halving the shift (comment at 1275)",EU,1275,"// Expand search radius"),
("tile snapping to tile centre",EU,1317,"return (coord & ~127) + 64;"),
("ring sampler wall and floor check sits inside a comment block",EU,1262,"else if (!ArenaEntityUtils::isSpawnTileValid(tileIndex, map1"),
("nearby-enemy gate uses the safe sleep distance",ECM,2102,"constexpr double distanceLimitSqr = PlayerConstants::SAFE_SLEEP_DISTANCE"),
("RNG: multiply-and-shift linear step",RND,68,"this->value *= 7143469;"),
("RNG: 16-bit output",RND,69,"return (this->value >> 16) & 0xFFFF;"),
("RNG: next(max) is modulo",RND,74,"return this->next() % exclusiveMax;"),
("dice: divisor search starts at 6 and goes down to 5",AMU,52,"for (int divisor = 6; divisor > 4; divisor--)"),
("dice: faces are divisor plus one",AMU,58,"diceParameters.exclusiveMax = divisor + 1;"),
("dice: roll count is value divided by divisor",AMU,59,"diceParameters.rollCount = value / divisor;"),
("bounded dice: small max uses one flat roll",AMU,89,"return random.next(maxValue);"),
("bounded dice: result above max rerolls",AMU,96,"return ArenaMathUtils::rollBoundedDice(maxValue, random);"),
("encounter trigger lives in GameState::tickGameClock",GS,1240,"void GameState::tickGameClock(double dt, Game &game)"),
("clock scale: game seconds per real second times camping scale",GS,1246,"const double timeScale = ArenaClockUtils::GameSecondsPerRealTimeSecond"),
("night for encounter caller: hour < 6 or > 18 (differs from utils at 18)",GS,1259,"const bool isNightForEncounters = (newHour < 6) || (newHour > 18);"),
("hour-change gate call site",GS,1273,"ArenaEntityUtils::isEnemyEncounterAllowedOnHourChanged("),
("minute-change gate call site",GS,1302,"ArenaEntityUtils::isEnemyEncounterAllowedOnMinuteChanged("),
("attempt needs an hour or minute gate and no enemy within the safe distance",GS,1305,"!entityChunkManager.anyEnemiesNearby(playerPosition);"),
("terrain type passed as constant 0 (caller todo)",GS,1311,"const int terrainType = 0; //@todo: Pass in terrain type"),
("encounter chance from the EXE table via getEncounterParameters",GS,1314,"ArenaEntityUtils::getEncounterParameters("),
("roll: chance is compared with a uniform 0 to 99",GS,1316,"if (encounterChance > arenaRandom.next(100))"),
("chooseEncounterEnemy called with the player level as encounter level",GS,1318,"ArenaEntityUtils::chooseEncounterEnemy(encounterChanceTableIndex"),
("spawn placement: ring sampler call",GS,874,"ArenaEntityUtils::findRandomSpawnLocationAroundPlayer(originalPlayerPositionArenaUnitsX"),
("spawn placement: floor and empty-voxel check after the ring sampler",GS,895,"const bool isSpawnVoxelValid = spawnVoxelShapeDef.mesh.isEmpty()"),
("spawn placement function signature",GS,848,"int GameState::spawnEncounterEnemies(Game &game"),
("encounter spawn call site",GS,1322,"this->spawnEncounterEnemies(game, encounterSpawnInfo);"),
("frame delta is clamped to the maximum frame duration",GM,132,"this->clampedDeltaTime = std::fmin(previousFrameDuration.count(),"),
("game loop passes clamped delta into the game clock",GM,925,"this->gameState.tickGameClock(clampedDeltaTime, *this);"),
("encounter chance table is read from the original EXE at load",EXD,536,'GetExeAddress(*section, "EnemyEncounterChances");'),
("encounter chance table is copied into ExeData",EXD,584,"initInt8Array(this->enemyEncounterChances, exeBytes, enemyEncounterChancesOffset);"),
("encounter struct: count, id, level",EH,46,"struct ArenaEnemyEncounter"),
("licence: MIT",LIC,1,"The MIT License (MIT)"),
]
path='/private/tmp/p2/wave2-haiku/batch3/Q001/receipts.tsv'
new=[]
for claim,f,l,q in rows:
    assert '\t' not in q and 15<=len(q)<=90, (claim,len(q))
    new.append('\t'.join([N,claim,f,str(l),q]))
open(path,'a').write('\n'.join(new)+'\n')
print(len(new),'rows appended')
