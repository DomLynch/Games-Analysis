B="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects"
TH=B+"/tangible/threat"; AI=B+"/creature/ai"
LUA="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/ai/default.lua"
S=[
("ThreatMatrix pick function", TH+"/ThreatMatrix.cpp", "TangibleObject* ThreatMatrix::getLargestThreat() {"),
("DOT note in source comment", AI+"/AiAgentImplementation.cpp", "it should not count towards loot and thus not be added to the threat map damage."),
("BT: flee skips main defender", LUA, "args={condition=FLEEING}},\t374"),
("pack notify throttle gate", AI+"/AiAgentImplementation.cpp", "if (!lastPackNotify.isPast() || closeObjectsVector == nullptr)"),
("pack notify function", AI+"/AiAgentImplementation.cpp", "void AiAgentImplementation::notifyPackMobs(SceneObject* attacker) {"),
("cached current threat still alive check", TH+"/ThreatMap.cpp", "if (currentCreo != nullptr && !currentCreo->isDead() && !currentCreo->isIncapacitated()) {"),
]
for t in S:
    print("\t".join(str(x) for x in t))
