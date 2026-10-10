import csv
S="/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts"
P="/mnt/frankendom-donors/amilich-isometric-city/src/components/game/panels/TileInfoPanel.tsx"
G="/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx"
N="amilich-isometric-city"
rows=[
("max level is 5",S,1250,"export const SERVICE_MAX_LEVEL = 5;"),
("range rises 0.2 per level",S,1251,"export const SERVICE_RANGE_INCREASE_PER_LEVEL = 0.2;"),
("upgrade cost base is 2",S,1252,"export const SERVICE_UPGRADE_COST_BASE = 2;"),
("upgrade entry point",S,1351,"export function upgradeServiceBuilding(state: GameState, x: number, y: number)"),
("refuses non-service buildings",S,1359,"if (!SERVICE_BUILDING_TYPES.has(buildingType)) return null;"),
("refuses at max level",S,1362,"if (building.level >= SERVICE_MAX_LEVEL) return null;"),
("refuses while under construction",S,1365,"building.constructionProgress < 100) {"),
("refuses abandoned buildings",S,1370,"if (building.abandoned) return null;"),
("cost is base times 2 to the level",S,1377,"const upgradeCost = baseCost * Math.pow(SERVICE_UPGRADE_COST_BASE, building.level);"),
("refuses without funds",S,1380,"if (state.stats.money < upgradeCost) return null;"),
("level goes up by exactly one",S,1384,"newGrid[y][x].building.level = building.level + 1;"),
("range formula with 0.2 per level",S,1292,"const effectiveRange = baseRange * (1 + (level - 1) * SERVICE_RANGE_INCREASE_PER_LEVEL);"),
("evolve entry for zoned buildings",S,1518,"function evolveBuilding(grid: Tile[][], x: number, y: number, services: ServiceCoverage"),
("abandoned branch returns before growth",S,1577,"if (building.abandoned) {"),
("age goes up one per tick",S,1642,"building.age = (building.age || 0) + 1;"),
("demand boost above 30",S,1666,"const demandLevelBoost = Math.max(0, (zoneDemandForLevel - 30) / 70) * 0.7;"),
("target clamped to 1..5",S,1668,"const targetLevel = Math.min(5, Math.max(1, Math.floor("),
("target sums land, coverage, age, demand",S,1669,"(landValue / 24) + (serviceCoverage / 28) + (building.age / 60) + demandLevelBoost"),
("level steps at most one toward target",S,1740,"Math.min(targetLevel, anchorBuilding.level + 1));"),
("tick branch evolves zoned non-grass tiles",S,2296,"} else if (tile.zone !== 'none' && tile.building.type !== 'grass') {"),
("only tick call site of evolveBuilding",S,2299,"newGrid[y][x].building = evolveBuilding(newGrid, x, y, services, state.stats.demand);"),
("tick entry point",S,2152,"export function simulateTick(state: GameState): GameState {"),
("default land value 50",S,758,"landValue: 50,"),
("lake tiles set to land value 60",S,285,"grid[tile.y][tile.x].landValue = 60;"),
("desktop tick 500/300/200 ms by speed",G,812,": (state.speed === 1 ? 500 : state.speed === 2 ? 300 : 200);"),
("mobile tick 750/450/300 ms by speed",G,811,"? (state.speed === 1 ? 750 : state.speed === 2 ? 450 : 300)"),
("UI caller of upgrade handler",G,980,"const upgradedState = upgradeServiceBuilding(prev, x, y);"),
("UI repeats cost formula for display",P,56,"const upgradeCost = baseCost * Math.pow(SERVICE_UPGRADE_COST_BASE, currentLevel);"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q043/receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    for claim,file,line,q in rows:
        assert "\t" not in q
        w.writerow([N,claim,file,line,q])
print("wrote",len(rows))
