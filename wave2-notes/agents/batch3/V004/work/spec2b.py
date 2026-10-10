O="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects"
DYN="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/creature/DynamicSpawnObserverImplementation.cpp"
S=[
("dynamic lair despawn task destroys the lair object", O+"/creature/events/DespawnDynamicSpawnTask.h", "spawn->destroyObjectFromWorld(true);"),
("dynamic lair empties check", DYN, "if (spawnedCreatures.isEmpty()) {"),
("lair object grace 300 s", O+"/tangible/LairObject.idl", "despawnEvent.schedule(300000);"),
("POI building grace 300 s", O+"/building/PoiBuilding.idl", "despawnEvent.schedule(300000);"),
("per-area total cap is set from region data", "/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/planet/PlanetManagerImplementation.cpp", "area->setMaxSpawnLimit(regionObject.getIntAt(7));"),
("dynamic lair mob placement uses building size", DYN, "float y = building->getPositionY() + (size - System::random(size * 20) / 10.0f);"),
("dynamic lair: herd leader is first mob of a herd template", DYN, "if (j == 0 && herdLeader == nullptr && creatureTemplate->isHerd()) {"),
("dynamic lair: followers set to FOLLOWING", DYN, "agent->setMovementState(AiAgent::FOLLOWING);"),
("dynamic lair: mob home set to building", DYN, "agent->setHomeObject(building);"),
("dynamic lair: mob added to spawned list", DYN, "spawnedCreatures.add(creo);"),
]
for t in S:
    print("\t".join(str(x) for x in t))
