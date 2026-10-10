import csv
D="/mnt/frankendom-donors/endless-sky-endless-sky/source/"
N="endless-sky-endless-sky"
rows=[
("claim: single target-choice function","AI.cpp",1554,"shared_ptr<Ship> AI::FindTarget(const Ship &ship) const"),
("claim: candidates are hostile ships in system","AI.cpp",1628,"const auto enemies = GetShipsList(ship, true);"),
("claim: pursuit fence gate","AI.cpp",1403,"bool AI::CanPursue(const Ship &ship, const Ship &target) const"),
("claim: reach limit for non-hunting ships","AI.cpp",1617,"double closest = person.IsHunting() ? numeric_limits<double>::infinity() :"),
("claim: reach 1.5x max range or 4000","AI.cpp",1618,"(minRange > 1000.) ? maxRange * 1.5 : 4000."),
("claim: prediction one second ahead","AI.cpp",1641,"Estimate the range a second from now, so ships prefer foes they are approaching."),
("claim: previous/parent target preferred","AI.cpp",1646,"if(preferredTarget)"),
("claim: preferred bonus -500","AI.cpp",1645,"bool preferredTarget = (foe == oldTarget.get() || foe == parentTarget.get());"),
("claim: prediction formula uses 60 x velocity","AI.cpp",1642,"double range = (foe->Position() + 60. * foe->Velocity()).Distance("),
("claim: over-target gate applies only when count > 2 and not preferred","AI.cpp",1672,"if(!preferredTarget && targeterCount > 2)"),
("claim: quarter-of-allies penalty","AI.cpp",1675,"if(targeterStrength >= 0.25 * alliedStrength)"),
("claim: twice-own-strength penalty","AI.cpp",1678,"if(targeterStrength >= 2. * foe->Strength())"),
("claim: unarmed penalty 1000*(1+!plunders)","AI.cpp",1695,"range += 1000. * (!IsArmed(*foe) * (1 + !person.Plunders()));"),
("claim: nearly-dead focus weight 500","AI.cpp",1699,"range += 500. * (foe->ShieldFraction() + foe->HullFraction());"),
("claim: overheat weight 3000 above 0.9","AI.cpp",1702,"range += 3000. * (foe->HeatFraction() - .9);"),
("claim: lowest score wins","AI.cpp",1703,"if((isPotentialNemesis && !hasNemesis) || range < closest)"),
("claim: strength-scaled targeter count via Ship API","Ship.cpp",4326,"ship->targetingList.push_back(weak_from_this());"),
("claim: targeter strength decays by 1.05 each update","Ship.cpp",4411,"targeterStrength = targeterStrength < 1. ? 0 : targeterStrength / 1.05;"),
("claim: targeter strength sums attackers' Strength()","Ship.cpp",4420,"targeterStrength += targeter->Strength();"),
("claim: step counter 0..63 per AI step","AI.cpp",771,"step = (step + 1) & 63;"),
("claim: targeting twice per second comment","AI.cpp",772,"// Targeting occurs about twice per second, so the target step only goes from 0 to 30."),
("claim: target step is step & 31","AI.cpp",773,"int targetStep = step & 31;"),
("claim: per-ship turn increments with mask 31","AI.cpp",898,"targetTurn = (targetTurn + 1) & 31;"),
("claim: retarget when turn matches or target missing","AI.cpp",899,"if(targetTurn == targetStep || !target || target->IsDestroyed() ||"),
("claim: forced retarget on fleeing and merciful","AI.cpp",901,"|| (target->IsFleeing() && personality.IsMerciful()) || !target->IsTargetable())"),
("claim: retarget comment","AI.cpp",896,"Each ship only switches targets about twice a second, so that it can"),
("claim: ShouldFlee is a function of health","AI.cpp",350,"bool ShouldFlee(Ship &ship)"),
("claim: retreat threshold 0.25","AI.cpp",348,"const double RETREAT_HEALTH = .25;"),
("claim: low-health flee rule with coward bonus","AI.cpp",360,"const bool lowHealth = ship.HealthFraction() < RETREAT_HEALTH + .25 * personality.IsCoward();"),
("claim: daring ships do not flee on low health","AI.cpp",361,"if(!personality.IsDaring() && lowHealth)"),
("claim: no-ammo flee rule","AI.cpp",364,"if(ship.GetAICache().NeedsAmmo())"),
("claim: retarget call site","AI.cpp",903,"target = FindTarget(*it);"),
("claim: flee call site in AI step","AI.cpp",929,"const bool shouldFlee = ShouldFlee(*it);"),
("claim: AI step driven once per unpaused frame","Engine.cpp",1734,"ai.Step(activeCommands);"),
("claim: game loop locked to 60 FPS","main.cpp",573,"// Lock the game loop to 60 FPS."),
("claim: AI step function entry","AI.cpp",732,"void AI::Step(Command &activeCommands)"),
("licence: GPL v3 or later header","AI.cpp",6,"Foundation, either version 3 of the License, or (at your option) any later version."),
("claim: invisible fence increments outside radius","AI.cpp",757,"value = min(FENCE_MAX, value + FENCE_DECAY + 1);"),
("claim: fence max 600","AI.cpp",411,"const int FENCE_MAX = 600;"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q014/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,fn,ln,q in rows:
        w.writerow([N,claim,D+fn,ln,q])
