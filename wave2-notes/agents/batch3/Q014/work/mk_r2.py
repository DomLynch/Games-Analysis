import csv
N="Anuken-Mindustry"
A="/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/"
rows=[
("licence: GPL v3 title line","/mnt/frankendom-donors/Anuken-Mindustry/LICENSE",2,"Version 3, 29 June 2007"),
("claim: retarget interval 40 ticks with no target, 90 with a target",A+"entities/units/AIController.java",286,"return timer.get(timerTarget, target == null ? 40 : 90);"),
("claim: retarget() gates the main-target pick",A+"entities/units/AIController.java",174,"boolean ret = retarget();"),
("claim: main target chosen on the retarget tick",A+"entities/units/AIController.java",177,"target = findMainTarget(unit.x, unit.y, unit.range()"),
("claim: random initial phase for retarget timer",A+"entities/units/AIController.java",40,"timer.reset(timerTarget, Mathf.random(40f));"),
("claim: target invalidation forces an immediate re-pick",A+"entities/units/AIController.java",169,"timer.reset(timerTarget, -1f);"),
("claim: main target validity has no range check (invalid() passes no range)",A+"entities/units/AIController.java",138,"return Units.invalidateTarget(target, unit.team, unit.x, unit.y);"),
("claim: no-target time accumulates Time.delta (variable step)",A+"entities/units/AIController.java",180,"noTargetTime += Time.delta;"),
("claim: each weapon mount re-targets with its own point and range",A+"entities/units/AIController.java",212,"mount.target = findTarget(mountX, mountY, wrange"),
("claim: targetFlag = closest enemy with flag, no range limit",A+"entities/units/AIController.java",273,"return Geometry.findClosest(x, y, enemy ? indexer.getEnemy(unit.team, flag)"),
("claim: targetFlagActive filters on items or status",A+"entities/units/AIController.java",276,"public Teamc targetFlagActive(float x, float y, BlockFlag flag, boolean enemy){"),
("claim: closest-target fallback is a units-then-buildings search",A+"entities/units/AIController.java",282,"return Units.closestTarget(unit.team, x, y, range, u -> u.checkTarget(air, ground),"),
("claim: out-of-range mount target is dropped",A+"entities/units/AIController.java",216,"mount.target = null;"),
("claim: update order: targeting before movement",A+"entities/units/AIController.java",54,"updateTargeting();"),
("claim: update order movement line",A+"entities/units/AIController.java",55,"updateMovement();"),
("claim: retarget timers reset with random phase in resetTimers",A+"entities/units/AIController.java",39,"protected void resetTimers(){"),
("claim: range test in invalidateTarget",A+"entities/Units.java",153,"(range != Float.MAX_VALUE && !target.within(x, y, range + (target instanceof Sized hb"),
("claim: closestTarget checks units first",A+"entities/Units.java",275,"Unit unit = closestEnemy(team, x, y, range, unitPred);"),
("claim: closestTarget falls back to buildings",A+"entities/Units.java",279,"return indexer.findEnemyTile(team, x, y, range, UnitSorts.buildingDefault, tilePred, sourceTeam);"),
("claim: flying mount target: main target if in range else closest",A+"ai/types/FlyingAI.java",34,"public Teamc findTarget(float x, float y, float range, boolean air, boolean ground){"),
("claim: in-range override comment",A+"ai/types/FlyingAI.java",37,"//if the main target is in range, use it, otherwise target whatever is closest"),
("claim: in-range override rule",A+"ai/types/FlyingAI.java",38,"return checkTarget(result, x, y, range) ? target(x, y, range, air, ground) : result;"),
("claim: core in range is top priority",A+"ai/types/FlyingAI.java",45,"if(core != null && Mathf.within(x, y, core.getX(), core.getY(), range)){"),
("claim: main target walks the unit's targetFlags in order",A+"ai/types/FlyingAI.java",61,"for(var flag : unit.type.targetFlags){"),
("claim: null flag means closest target in range",A+"ai/types/FlyingAI.java",62,"if(flag == null){"),
("claim: flag lookup uses active targets",A+"ai/types/FlyingAI.java",66,"Teamc result = targetFlagActive(x, y, flag, true);"),
("claim: random-wave mode tries five random flags",A+"ai/types/FlyingAI.java",53,"for(int attempt = 0; attempt < 5; attempt++){"),
("claim: flying units move toward the main target at 0.8 of range",A+"ai/types/FlyingAI.java",23,"moveTo(target, unit.type.range * 0.8f);"),
("claim: default targetFlags is null (closest)",A+"type/UnitType.java",361,"public BlockFlag[] targetFlags = {null};"),
("claim: flare targets generators, then closest",A+"content/UnitTypes.java",1055,"targetFlags = new BlockFlag[]{BlockFlag.generator, null};"),
("claim: flare type declaration",A+"content/UnitTypes.java",1047,'flare = new UnitType("flare"){{'),
("claim: horizon targets factories, then closest",A+"content/UnitTypes.java",1105,"targetFlags = new BlockFlag[]{BlockFlag.factory, null};"),
("claim: zenith flag chain",A+"content/UnitTypes.java",1152,"targetFlags = new BlockFlag[]{BlockFlag.launchPad, BlockFlag.storage,"),
("claim: quad flag chain",A+"content/UnitTypes.java",1493,"targetFlags = new BlockFlag[]{BlockFlag.battery, BlockFlag.factory, null};"),
("claim: ground units go for core when within range/1.3",A+"ai/types/GroundAI.java",29,"if(core != null && unit.within(core, unit.range() / 1.3f"),
("claim: ground units path to core unless within half range",A+"ai/types/GroundAI.java",38,"if((core == null || !unit.within(core, unit.type.range * 0.5f))){"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q014/receipts-mindustry-tmp.tsv","w",newline="") as f:
    f.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
    for claim,fn,ln,q in rows:
        f.write("\t".join([N,claim,fn,str(ln),q])+"\n")
