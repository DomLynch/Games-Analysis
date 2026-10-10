import csv
S="/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts"
G="/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx"
N="amilich-isometric-city"
rows=[
("service building set header",S,1244,"export const SERVICE_BUILDING_TYPES = new Set(["),
("money debit on upgrade",S,1389,"money: state.stats.money - upgradeCost,"),
("tick visits every tile",S,2180,"for (let x = 0; x < size; x++) {"),
("tick runs on a browser timer",G,814,"timer = setInterval(() => {"),
("coverage averages four services",S,1650,"const serviceCoverage = ("),
("coverage sums police first",S,1651,"services.police[y][x] +"),
("coverage divides by four",S,1655,") / 4;"),
("abandonment only when demand below -20 and age over 30",S,1623,"if (zoneDemandValue < -20 && building.age > 30) {"),
("abandonment chance capped at 0.02",S,1626,"const abandonmentChance = Math.min(0.02, Math.abs(zoneDemandValue + 20) / 4000);"),
("consolidation needs age over 12",S,1718,"const ageRequirement = 12;"),
("consolidation can set level straight to target",S,1726,"anchor.level = targetLevel;"),
("consolidation fallback gains at most one",S,1731,"building.level = Math.min(targetLevel, building.level + 1);"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q043/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,file,line,q in rows:
        w.writerow([N,claim,file,line,q])
print("wrote",len(rows))
