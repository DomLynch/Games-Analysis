import csv
N="diasurgical-DevilutionX"
M="/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp"
rows=[
("UpdateEnemy defined",M,679,"void UpdateEnemy(Monster &monster)"),
("player loop skips dead players only in multiplayer",M,691,"|| (player.hasNoLife() && gbIsMultiplayer))"),
("room flag from transparency value compare",M,693,"const bool sameroom = (dTransVal[position.x][position.y] =="),
("walking distance to player",M,694,"const int dist = position.WalkingDistance(player.position.tile);"),
("same-room candidate wins over other-room best",M,695,"if ((sameroom && !bestsameroom)"),
("closer candidate wins only within the same room class",M,696,"|| ((sameroom || !bestsameroom) && dist < bestDist)"),
("player chosen clears TARGETS_MONSTER",M,698,"monster.flags &= ~MFLAG_TARGETS_MONSTER;"),
("monster candidate walking distance",M,720,"const int dist = otherMonster.position.tile.WalkingDistance(position);"),
("melee non-golem skips far non-ranged monsters",M,724,"&& !IsRanged(monster))"),
("monster chosen sets TARGETS_MONSTER",M,734,"monster.flags |= MFLAG_TARGETS_MONSTER;"),
("enemy set from target",M,744,"monster.enemyPosition = target;"),
("no candidate sets NO_ENEMY",M,746,"monster.flags |= MFLAG_NO_ENEMY;"),
("MonsterIdle defined",M,1069,"void MonsterIdle(Monster &monster)"),
("idle re-picks enemy at end of stand animation",M,1076,"if (monster.animInfo.isLastFrame())"),
("idle calls UpdateEnemy",M,1077,"UpdateEnemy(monster);"),
("target hit gets activeForTicks 255 if it was 0",M,1138,"if (target.activeForTicks == 0) {"),
("activeForTicks set to UINT8_MAX on being attacked",M,1139,"target.activeForTicks = UINT8_MAX;"),
("AiPlanPath defined",M,1860,"bool AiPlanPath(Monster &monster)"),
("path planning needs active monster",M,1863,"if (monster.activeForTicks == 0)"),
("path planning needs Stand mode",M,1865,"if (monster.mode != MonsterMode::Stand)"),
("path planning needs a normal, move or attack goal",M,1867,"if (IsNoneOf(monster.goal, MonsterGoal::Normal, MonsterGoal::Move, MonsterGoal::Attack))"),
("line of sight over walkable safe tiles",M,1873,"const bool clear = LineClear("),
("pathCount window test",M,1877,"if (!clear || (monster.pathCount >= 5 && monster.pathCount < 8)) {"),
("pathCount below 5 waits",M,1881,"if (monster.pathCount < 5)"),
("A* step planned via AiPlanWalk",M,1883,"if (AiPlanWalk(monster))"),
("pathCount reset when no step",M,1888,"monster.pathCount = 0;"),
("AiPlanWalk path call",M,1822,"monster.position.tile, monster.enemyPosition, path, MaxPathLengthMonsters) == 0) {"),
("ProcessMonsters defined",M,4257,"void ProcessMonsters()"),
("multiplayer per-monster RNG seed",M,4266,"SetRndSeed(monster.aiSeed);"),
("wake-up block: visible and inactive",M,4279,"if (isMonsterVisible && monster.activeForTicks == 0) {"),
("wake-up re-picks enemy",M,4295,"UpdateEnemy(monster);"),
("enemy position taken from the player's future position",M,4306,"monster.enemyPosition = player.position.future;"),
("last known position updated when visible",M,4308,"monster.position.last = player.position.future;"),
("visible monster keeps activeForTicks at 255",M,4315,"monster.activeForTicks = UINT8_MAX;"),
("unseen monster counts activeForTicks down",M,4317,"monster.activeForTicks--;"),
("AI proc call",M,4323,"AiProc[static_cast<int8_t>(monster.ai)](monster);"),
("mode stance step returns true to repeat",M,4326,"if (!UpdateModeStance(monster))"),
("ZombieAi defined",M,2069,"void ZombieAi(Monster &monster)"),
("zombie idle when tile not visible",M,2075,"if (!IsTileVisible(monster.position.tile)) {"),
("zombie act roll 2 x intelligence + 10 percent",M,2079,"if (GenerateRnd(100) < 2 * monster.intelligence + 10) {"),
("zombie wander threshold 2 x intelligence + 4",M,2082,"if (dist >= 2 * monster.intelligence + 4) {"),
("M_StartStand defined",M,3927,"void M_StartStand(Monster &monster, Direction md)"),
("stand start re-picks enemy",M,3939,"UpdateEnemy(monster);"),
("licence",    "/mnt/frankendom-donors/diasurgical-DevilutionX/LICENSE.md",1,"# Sustainable Use License"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q023/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,path,line,q in rows:
        assert "\t" not in q
        w.writerow([N,claim,path,line,q])
print(len(rows))
