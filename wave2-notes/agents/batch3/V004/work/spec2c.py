C="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature"
O="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects"
RG=O+"/region/SpawnAreaImplementation.cpp"
S=[
("AI tick cancelled when no players and no follow object", C+"/ai/AiAgentImplementation.cpp", "if ((!alwaysActive && numberOfPlayersInRange.get() <= 0\t3890"),
("AI arrival of a player schedules the tick", C+"/ai/AiAgentImplementation.cpp", "activateAiBehavior();\t2185"),
("grace event clears itself first", C+"/events/DespawnCreatureOnPlayerDissappear.h", "strongRef->clearDespawnEvent();"),
("theater entry cancels its grace timer", O+"/intangible/TheaterObjectImplementation.cpp", "clearDespawnEvent();"),
("spawn call for a lair", RG, "creatureManager->spawn(lairHashCode, lairLevel, lairBuildingLevel"),
("player level for lair difficulty: group level", RG, "level = group->getGroupLevel();"),
("lair building level 5 default", RG, "int lairBuildingLevel = 5;"),
("counter clamped at zero on area exit", RG, "numberOfPlayersInRange.set(0);"),
]
for t in S:
    print("\t".join(str(x) for x in t))
