O="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects"
M="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/creature"
C="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature"
RG=O+"/region/SpawnAreaImplementation.cpp"
CFG="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/conf/ConfigManager.h"
DYN=M+"/DynamicSpawnObserverImplementation.cpp"
AI=C+"/ai/AiAgentImplementation.cpp"
S=[
("world spawn: only while players are in the area", RG, "if (numberOfPlayersInRange <= 0 || entry == nullptr) {"),
("world spawn: minimum interval since last spawn", RG, "if (lastSpawn.miliDifference() < ConfigManager::instance()->getMinLairSpawnInterval()) {"),
("world spawn: global disable switch", RG, "if (ConfigManager::instance()->disableWorldSpawns()) {"),
("world spawn: total cap per area", RG, "if (totalSpawnCount >= maxSpawnLimit) {"),
("world spawn: weighted pick of lair entry", RG, "int choice = System::random(totalWeighting - 1);"),
("world spawn: per-template cap", RG, "if (spawnLimit > -1 && currentSpawnCount >= spawnLimit) {"),
("world spawn: random point near player", RG, "areaShape->getRandomPosition(worldPosition, 32.0f"),
("world spawn: spawn check range = size + config", RG, "float checkRange = finalSpawn->getSize()"),
("world spawn: permitted-at check", RG, "isSpawningPermittedAt(randomPosition.getX(), randomPosition.getY()"),
("world spawn: building level from player/lair level ratio", RG, "float difficultyVariable = playerLevel / lairLevel;"),
("world spawn: building level threshold 0.25", RG, "if (difficultyVariable < 0.25) {"),
("world spawn: last spawn time updated", RG, "lastSpawn.updateToCurrentTime();"),
("world spawn: count per template increments", RG, "spawnCountByType.put(lairTemplate.hashCode(), currentSpawnCount + 1);"),
("world spawn: count decrements on removal", RG, "--totalSpawnCount;"),
("lair removal leaves a no-spawn bubble", RG, "area->addAreaFlag(ActiveArea::NOSPAWNAREA);"),
("no-spawn bubble lasts 30 s", RG, "task->schedule(30000);"),
("config default: min lair spawn interval 5000 ms", CFG, "cachedMinSpawnDelay = getInt(\"Core3.Regions.minimumLairSpawnInterval\", 5000);"),
("config default: spawn check range 64", CFG, "cachedSpawnRange = getFloat(\"Core3.Regions.spawnCheckRange\", 64.f);"),
("lair spawn limit read from lair template", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/templates/mobile/LairTemplate.h", "spawnLimit = templateData->getIntField(\"spawnLimit\");"),
("LairSpawn default spawn limit -1 (none)", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/creature/LairSpawn.h", "spawnLimit = -1;"),
("dynamic lair: initial count from spawnLimit / 3", DYN, "int totalNumberToSpawn = (lairTemplate->getSpawnLimit() / 3) + spawnLimitAdjustment;"),
("dynamic lair: difficulty adjustment", DYN, "int spawnLimitAdjustment = (difficulty - 2) / 2;"),
("dynamic lair: at least one", DYN, "if (totalNumberToSpawn < 1)"),
("dynamic lair: placement offset from building", DYN, "float x = building->getPositionX() + (size - System::random(size * 20) / 10.0f);"),
("dynamic lair: creatures do not despawn on empty", DYN, "agent->setDespawnOnNoPlayerInRange(false);"),
("dynamic lair: four lives comment", DYN, "// Each creature should spawn 4 times"),
("dynamic lair: lives exhausted test", DYN, "if (agent->getRespawnCounter() > 2) {"),
("dynamic lair: lair empties -> despawn in 60 s", DYN, "task->schedule(60000);"),
("dynamic lair: respawn delay (60 + 2 x level) s", DYN, "task->schedule((60 + (level * 2)) * 1000);"),
("creature: death goes to home lair when it has observers", AI, "if (home != nullptr && home->getObserverCount(ObserverEventType::CREATUREDESPAWNED) > 0) {"),
("creature: own respawn timer when no home lair", AI, "if (respawnTimer > 0 && zone != nullptr) {"),
("creature: random respawn spread", AI, "respawn = System::random(respawn) + (respawn / 2.f);"),
("respawn increments the respawn counter", AI, "respawnCounter++;"),
("respawn refuses if still in a zone", AI, "// Fail to respawn if they are in the zone already"),
("creature: 30 s grace when last player leaves", AI, "despawnEvent->schedule(30000);"),
("grace event re-checks player count", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/events/DespawnCreatureOnPlayerDissappear.h", "if (strongRef->getNumberOfPlayersInRange() <= 0) {"),
("grace event respects the despawn flag", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/events/DespawnCreatureOnPlayerDissappear.h", "if (!strongRef->getDespawnOnNoPlayerInRange())"),
("theater: 300 s grace (idl)", O+"/intangible/TheaterObject.idl", "despawnEvent.schedule(300000);"),
("theater: leave activates grace only with flag", O+"/intangible/TheaterObjectImplementation.cpp", "if (val <= 0 && despawnOnNoPlayersInRange) {"),
("theater: destroy only if still empty", O+"/tangible/DespawnLairOnPlayerDisappear.cpp", "if (strongTheater->getNumberOfPlayersInRange() <= 0) {"),
("creature manager: dynamic lair theater flagged no-players despawn", M+"/CreatureManagerImplementation.cpp", "theater->setDespawnOnNoPlayersInRange(true);"),
("creature manager: initial mobiles for dynamic lair", M+"/CreatureManagerImplementation.cpp", "dynamicObserver->spawnInitialMobiles(theater);"),
("creature despawn task calls notifyDespawn", C+"/events/DespawnCreatureTask.h", "agent->notifyDespawn(zone);"),
]
for t in S:
    print("\t".join(str(x) for x in t))
