import csv
V="/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.cpp"
H="/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGCreature.h"
C="/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/CGHeroInstance.cpp"
S="/mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/army/CCreatureSet.cpp"
R="/mnt/frankendom-donors/vcmi-vcmi/include/vstd/RNG.h"
N="vcmi-vcmi"
rows=[
("takenAction is the single decision: fight, flee, join","int CGCreature::takenAction(const CGHeroInstance *h, bool allowJoin) const",V,350),
("relative strength = hero diplomacy value / monster army strength","double relStrength = static_cast<double>(h->getValueForDiplomacy())",V,353),
("top power band: ratio >= 7 gives factor 11","if(relStrength >= 7)",V,356),
("top power band value","powerFactor = 11;",V,357),
("middle band: factor 2*(ratio-1) truncated","powerFactor = static_cast<int>(2 * (relStrength - 1));",V,360),
("band 0.5 to 1 gives -1","powerFactor = -1;",V,363),
("band 0.333 threshold","else if(relStrength >= 0.333)",V,365),
("band below 0.333 gives -3","powerFactor = -3;",V,368),
("sympathy: at least one similar creature","sympathy++; // 1 - if hero have at least 1 similar creature",V,386),
("sympathy: more than half similar","sympathy++; // 2 - hero have similar creatures more that 50%",V,388),
("diplomacy disposition capped at 3","static constexpr int maxDiplomacyDisposition = 3;",V,392),
("diplomacy is min of WANDERING_CREATURES_JOIN_BONUS and cap","int diplomacy = std::min<int>(h->valOfBonuses(",V,393),
("charisma = power factor + diplomacy + sympathy","int charisma = powerFactor + diplomacy + sympathy;",V,394),
("FIGHT when charisma below aggression","if(charisma < agression)",V,396),
("free join test uses diplomacy + sympathy + 1","diplomacy + sympathy + 1 >= agression",V,401),
("gold join test uses diplomacy*2 + sympathy + 1","if(diplomacy * 2 + sympathy + 1 >= agression)",V,404),
("FLEE only when charisma above aggression and not neverFlees","if (charisma > agression && !neverFlees)",V,414),
("aggression for FRIENDLY is a random roll 1..7","agression = gameRandomizer.getDefault().nextInt(1, 7);",V,290),
("aggression for HOSTILE is a random roll 4..10","agression = gameRandomizer.getDefault().nextInt(4, 10);",V,296),
("aggression for SAVAGE is 10","agression = 10;",V,299),
("aggression for COMPLIANT is -4","agression = -4;",V,287),
("initObj sets aggression by character","void CGCreature::initObj(IGameRandomizer & gameRandomizer)",V,281),
("caller: hover popup asks takenAction with joins allowed","int decision = takenAction(hero, true);",V,94),
("caller: onHeroVisit acts on takenAction","int action = takenAction(h);",V,173),
("caller: refused offer re-asks flee decision with joins off","if(takenAction(h,false) == FLEE)",V,436),
("fleeDecision: pursue means fight","void CGCreature::fleeDecision(",V,420),
("fleeDecision: no pursue removes the creature","gameEvents.removeObject(this, h->getOwner());",V,428),
("flee shows a blocking dialog to the hero","gameEvents.showBlockingDialog(&ynd);",V,520),
("flee stores FLEE as the visit state","gameEvents.setVisitState(h, JsonNode(static_cast<int32_t>(FLEE)));",V,521),
("answer to flee dialog routes to fleeDecision","fleeDecision(gameEvents, hero, answer);",V,597),
("enum values FIGHT -2 FLEE -1 JOIN_FOR_FREE 0","FIGHT = -2, FLEE = -1, JOIN_FOR_FREE = 0",H,21),
("aggression field type and range comment","int8_t agression = 0; // h3 range: -4 -> compliant, 10 -> savage, set on init",H,40),
("hero diplomacy value: sqrt of attack and defence skill factors","double heroStrength = sqrt(",C,791),
("factor 0.05 per attack point","(1.0 + 0.05 * getPrimSkillLevel(PrimarySkill::ATTACK)) *",C,792),
("hero value is heroStrength times army strength","return heroStrength * armyStrength;",C,796),
("army strength is a sum over stacks","ui64 CCreatureSet::getArmyStrength() const",S,313),
("army strength adds each stack power","ret += elem.second->getPower();",S,317),
("nextInt range is inclusive","/// Returns random number in range [lower, upper]",R,21),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q019/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,q,path,ln in rows:
        assert "\t" not in q
        w.writerow([N,claim,path,ln,q])
print("wrote",len(rows))
