import csv
N="alexbatalov-fallout2-ce"
C="/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/combat_ai.cc"
rows=[
("perception read for range","range base",C,3506,"int perception = critterGetStat(critter, STAT_PERCEPTION);"),
("in combat check for unseen range","combat range",C,3531,"if (isInCombat()) {"),
("unseen range out of combat = perception","x1",C,3534,"maxDistance = perception;"),
("teammate leash distance 5 for non-party","leash 5",C,3139,"int maxTeammateDistance = 5;"),
("run-away setter refuses index 6 and above","setter bound",C,825,"if (runAwayMode >= 6) {"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q023/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,_,path,line,q in rows:
        w.writerow([N,claim,path,line,q])
print("ok")
