import csv,sys
SIM="/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts"
GC="/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx"
LIC="/mnt/frankendom-donors/amilich-isometric-city/LICENSE"
N="amilich-isometric-city"
rows=[
("per-tile evolve step signature","evolveBuilding is the per-tile step for built zoned tiles",SIM,1518,"function evolveBuilding(grid: Tile[][], x: number, y: number, services: ServiceCoverage"),
("abandonment gate","abandon only below demand -20 and after age 30",SIM,1623,"if (zoneDemandValue < -20 && building.age > 30) {"),
("abandonment chance","chance is min(0.02, |demand+20|/4000)",SIM,1626,"const abandonmentChance = Math.min(0.02, Math.abs(zoneDemandValue + 20) / 4000);"),
("utility penalty","0.005 per missing utility, starters exempt",SIM,1629,"const utilityPenalty = isStarter ? 0 : ((!hasPower ? 0.005 : 0)"),
("low-level penalty","0.003 extra at level 2 or below",SIM,1632,"const levelPenalty = building.level <= 2 ? 0.003 : 0;"),
("abandon roll","single roll against summed chance",SIM,1634,"if (Math.random() < abandonmentChance + utilityPenalty + levelPenalty) {"),
("clearing gate","abandoned slots clear only above demand 10",SIM,1581,"if (zoneDemandValue > 10) {"),
("clearing chance","chance is min(0.12, (demand-10)/600)",SIM,1584,"const clearingChance = Math.min(0.12, (zoneDemandValue - 10) / 600);"),
("clearing roll","roll against clearing chance",SIM,1585,"if (Math.random() < clearingChance) {"),
("abandoned aging rate","abandoned slots age 0.1 per tick",SIM,1616,"building.age = (building.age || 0) + 0.1;"),
("built aging rate","built slots age 1 per tick, after abandon check",SIM,1642,"building.age = (building.age || 0) + 1;"),
("construction gate","no aging or evolve while under construction",SIM,1553,"if (building.constructionProgress !== undefined && building.constructionProgress < 100) {"),
("level target","target level from land value, services, age, demand",SIM,1668,"const targetLevel = Math.min(5, Math.max(1, Math.floor("),
("level step","incremental level step is +1 per tick (consolidation can set level directly)",SIM,1740,"Math.min(targetLevel, anchorBuilding.level + 1));"),
("spawn base chance","base spawn chance 0.05 per tick",SIM,2272,"const baseSpawnChance = 0.05;"),
("spawn demand factor","factor is clamp((demand+30)/80, 0, 1)",SIM,2273,"const demandFactor = Math.max(0, Math.min(1, (zoneDemandForSpawn + 30) / 80));"),
("spawn gate","needs road access, utilities or starter, and a roll",SIM,2283,"if (roadAccess && (hasUtilities || wouldBeStarter) && Math.random() < spawnChance) {"),
("spawn comment vs code","comment says 2.5% at demand 0; code gives 1.875%",SIM,2269,"At demand 0: 2.5% chance (reduced)"),
("evolve call and lagged demand","evolve reads state.stats.demand (previous tick)",SIM,2299,"newGrid[y][x].building = evolveBuilding(newGrid, x, y, services, state.stats.demand);"),
("tile loop","simulateTick visits every tile",SIM,2179,"for (let y = 0; y < size; y++) {"),
("simulateTick signature","one discrete step per call on the whole grid",SIM,2152,"export function simulateTick(state: GameState): GameState {"),
("residential demand input","demand from jobs and population",SIM,1881,"const baseResidentialDemand = (jobs - population * 0.7) / 18;"),
("demand clamp","demand clamped to -100..100 after tax",SIM,1892,"const residentialDemand = Math.min(100, Math.max(-100, residentialWithBonuses"),
("tax multiplier","multiplier falls to 0 at 100 percent tax",SIM,1842,"const taxMultiplier = Math.max(0, 1 - (effectiveTaxRate - 9) / 91);"),
("tick interval desktop","desktop tick 500/300/200 ms by speed",GC,812,"(state.speed === 1 ? 500 : state.speed === 2 ? 300 : 200);"),
("tick driver","wall-clock setInterval drives the sim",GC,814,"timer = setInterval(() => {"),
("tick call","one simulateTick call per interval",GC,819,"const newState = simulateTick(latestStateRef.current);"),
("licence line","MIT, Copyright 2025 amilich",LIC,3,"Copyright (c) 2025 amilich"),
]
w=csv.writer(sys.stdout,delimiter='\t',lineterminator='\n',quoting=csv.QUOTE_NONE,escapechar=None)
w.writerow(["note","claim","donor_file","line","quote"])
bad=0
for claim_name,claim,f,l,q in rows:
    if not (15<=len(q)<=90): print("LEN",len(q),q,file=sys.stderr); bad+=1
    w.writerow([N,claim_name+": "+claim,f,l,q])
print("len-problems",bad,file=sys.stderr)
