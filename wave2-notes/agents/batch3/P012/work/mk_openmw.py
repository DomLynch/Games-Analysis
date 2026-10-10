M="/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/"
C=M+"combat.cpp"; A=M+"actors.cpp"; AH=M+"actor.hpp"; MM=M+"mechanicsmanagerimp.cpp"
T="/mnt/frankendom-donors/openmw/components/misc/timer.hpp"
D="/mnt/frankendom-donors/openmw/apps/opencs/model/world/defaultgmsts.cpp"
G="/mnt/frankendom-donors/openmw/components/settings/categories/game.hpp"
L="/mnt/frankendom-donors/openmw/LICENSE"
N="openmw"
rows=[
("Fight term is the Fight setting plus distance and disposition biases",C,556,"int getFightTerm(const MWWorld::Ptr& actor, const MWWorld::Ptr& target)"),
("Creatures use a fixed disposition of 50",C,559,"? mechanicsManager->getDerivedDisposition(actor) : 50;"),
("Fight term reads the modified Fight AI setting",C,560,"getAiSetting(AiSetting::Fight).getModified()"),
("Distance and disposition biases are added with truncation to int",C,561,"+ static_cast<int>("),
("Disposition bias is (50 - disposition) times fFightDispMult",C,574,"return ((50.f - disposition) * fFightDispMult);"),
("Distance bias is iFightDistanceBase minus multiplier times distance",C,595,"return (iFightDistanceBase - fFightDistanceMultiplier * d);"),
("Aggro distance is measured in the aggro helper",C,582,"float d = getAggroDistance(actor1, pos1, pos2);"),
("isAggressive entry point",C,623,"bool isAggressive(const MWWorld::Ptr& actor, const MWWorld::Ptr& target)"),
("Already in combat with the target counts as aggressive",C,625,"// If already in combat with target, consider aggressive"),
("Aggression needs an aggression-capable actor",C,629,"if (!isAggressionCapable(actor))"),
("Werewolf target adds iWerewolfFightMod for NPC pairs",C,642,"fight += iWerewolfFightMod->mValue.getInteger();"),
("Aggressive when the term reaches 100",C,646,"return (fight >= 100);"),
("engageCombat entry point",A,615,"void Actors::engageCombat("),
("engageCombat returns if actor1 is dead or already fighting actor2",A,619,"if (creatureStats1.isDead() || creatureStats1.getAiSequence().isInCombat(actor2))"),
("engageCombat skips targets beyond the processing range",A,631,"if (sqrDist > actorsProcessingRange * actorsProcessingRange)"),
("engageCombat starts with aggressive false",A,636,"bool aggressive = false;"),
("engageCombat stops for targets that cannot be fought",A,710,"if (!canFight(actor1, actor2))"),
("Aggression check runs only against the player or its followers",A,740,"aggressive = isAggressive(actor1, actor2);"),
("Aggressive actors need line of sight to start combat",A,795,"const bool los = world->getLOS(actor1, actor2)"),
("Combat starts only when aggressive is set",A,793,"if (aggressive)"),
("Engage timer is updated per actor each frame",A,1588,"actor.updateEngageCombatTimer(duration);"),
("Actor tests the others only when the engage timer elapses",A,1620,"if (engageCombatTimerStatus == Misc::TimerStatus::Elapsed)"),
("Elapsed actor calls engageCombat against each other actor",A,1632,"actor.getPtr(), otherActor.getPtr(), cachedAllies, otherActor.getPtr() == player);"),
("Engage timer is 1.0 s period with 0.25 s deviation",AH,77,"Misc::DeviatingPeriodicTimer mEngageCombat{ 1.0f, 0.25f,"),
("Periodic timer counts down and reports Waiting",T,26,"if (mTimeLeft > 0)"),
("Periodic timer redraws the period with deviation then reports Elapsed",T,32,"mTimeLeft = Rng::deviate(mPeriod, mDeviation, prng);"),
("Periodic timer returns Elapsed",T,33,"return TimerStatus::Elapsed;"),
("awarenessCheck entry point",MM,1601,"bool MechanicsManager::awarenessCheck("),
("Sneak term is zero unless sneaking",MM,1611,"float sneakTerm = 0;"),
("Sneak term uses skill, agility, luck and boots",MM,1627,"sneakTerm = fSneakSkillMult * sneak + 0.2f * agility"),
("Distance term grows with range",MM,1635,"float distTerm = fSneakDistBase + fSneakDistMult * (pos1 - pos2).length();"),
("x is sneak times distance times fatigue plus chameleon",MM,1639,"float x = sneakTerm * distTerm * stats.getFatigueTerm() + chameleon;"),
("Invisibility adds 100 to x",MM,1640,"if (invisibility > 0.f)"),
("Observer term includes sneak, agility, luck and blind",MM,1649,"float obsTerm = obsSneak + 0.2f * obsAgility + 0.1f * obsLuck - obsBlind;"),
("Observer facing check uses 90 degrees",MM,1661,"if (angleRadians > osg::DegreesToRadians(90.f))"),
("Behind the observer uses fSneakNoViewMult",MM,1662,"y = obsTerm * observerStats.getFatigueTerm() * fSneakNoViewMult;"),
("In view uses fSneakViewMult",MM,1664,"y = obsTerm * observerStats.getFatigueTerm() * fSneakViewMult;"),
("Target is x minus y",MM,1667,"float target = x - y;"),
("Roll 0-99 must reach the target",MM,1671,"return Misc::Rng::roll0to99(prng) >= target;"),
("Fight setting clamped to 0-100 on change",M+"mechanicsmanagerimp.cpp",669,"AiSetting::Fight, std::clamp(fight + int(std::min(-iPerMinChange, -s)), 0, 100));"),
("GMST default fFightDispMult 0.2",D,1726,"0.2f, // fFightDispMult"),
("GMST default fFightDistanceMultiplier 0.005",D,1727,"0.005f, // fFightDistanceMultiplier"),
("GMST default iFightDistanceBase 20",D,1922,"20, // iFightDistanceBase"),
("GMST default fSneakNoViewMult 0.5",D,1804,"0.5f, // fSneakNoViewMult"),
("GMST default fSneakViewMult 1.5",D,1809,"1.5f, // fSneakViewMult"),
("Processing range clamp 3584 to 7168",G,31,"makeClampSanitizerInt(3584, 7168) };"),
("Licence is GPL version 3",L,2,"Version 3, 29 June 2007"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/P012/receipts.tsv","a") as f:
    for claim,path,line,q in rows:
        assert 15<=len(q)<=90, (len(q),q)
        assert "\t" not in q and "\t" not in claim
        f.write("\t".join([N,claim,path,str(line),q])+"\n")
print(len(rows),"rows appended")
