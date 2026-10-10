import csv
N="diasurgical-DevilutionX"
M="/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp"
T="/mnt/frankendom-donors/diasurgical-DevilutionX/Source/tables/monstdat.cpp"
rows=[
("pathCount counts unclear-line calls",M,1880,"monster.pathCount++;"),
("AiPlanWalk defined",M,1815,"bool AiPlanWalk(Monster &monster)"),
("zombie: mode must be Stand",M,2071,"if (monster.mode != MonsterMode::Stand) {"),
("zombie: far enemy walks on its facing",M,2083,"Direction md = monster.direction;"),
("zombie: far walk call",M,2087,"Walk(monster, md);"),
("zombie: mid-range random walk toward enemy direction",M,2089,"RandomWalk(monster, GetMonsterDirection(monster));"),
("zombie: adjacent enemy means attack",M,2092,"StartAttack(monster);"),
("zombie: distance test 2 or more",M,2081,"if (dist >= 2) {"),
("direction toward enemy",M,774,"return GetDirection(monster.position.tile, monster.enemyPosition);"),
("GetMonsterDirection defined",M,772,"Direction GetMonsterDirection(Monster &monster)"),
("SEARCH data flag enables path search",T,264,"if (value == \"SEARCH\") return MFLAG_SEARCH;"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q023/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,path,line,q in rows:
        w.writerow([N,claim,path,line,q])
print(len(rows))
