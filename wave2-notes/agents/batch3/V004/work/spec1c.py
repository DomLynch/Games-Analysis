B="/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects"
TH=B+"/tangible/threat"; AI=B+"/creature/ai"; DOT=B+"/creature/commands/DotPackCommand.h"
S=[
("unique state refused when already held or on cooldown", TH+"/ThreatMap.cpp", "if ((hasState(state) && isUniqueState(state)) || !cooldownTimerMap.isPast(String::valueOf(state)))"),
("unique state forces a fresh evaluation", TH+"/ThreatMap.cpp", "cooldownTimerMap.updateToCurrentTime(\"doEvaluation\");"),
("DOT pack command adds damage with xp dotDMG", DOT, "targetCreature->getThreatMap()->addDamage(creature, dotDMG, \"dotDMG\");"),
("loot damage skips dotDMG", TH+"/ThreatMap.h", "if (type == \"dotDMG\")"),
("total damage sums all entries", TH+"/ThreatMap.h", "totalDamage += elementAt(i).getValue();"),
("addHeal entry point", TH+"/ThreatMap.cpp", "void ThreatMap::addHeal(TangibleObject* target, int value) {"),
("addAggro with duration schedules removal", TH+"/ThreatMap.cpp", "removeAggroTask->schedule(duration);"),
]
for t in S:
    print("\t".join(str(x) for x in t))
