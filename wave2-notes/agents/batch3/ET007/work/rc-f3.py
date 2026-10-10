import csv,sys
G="amilich-isometric-city"
D="/mnt/frankendom-donors/amilich-isometric-city/src/"
S=D+"lib/simulation.ts"; GC=D+"context/GameContext.tsx"; GT=D+"games/isocity/types/game.ts"; L="/mnt/frankendom-donors/amilich-isometric-city/LICENSE"
rows=[
("licence: MIT copyright line",L,3,"Copyright (c) 2025 amilich"),
("licence: MIT permission grant",L,5,"Permission is hereby granted, free of charge, to any person obtaining a copy"),
("start budget: funding 100 per service",S,1093,"police: { name: 'Police', funding: 100, cost: 0 },"),
("start tax rate 9 (effective matches)",S,1206,"effectiveTaxRate: 9, // Start matching taxRate"),
("monthly faucet: population and jobs at the raw tax rate",S,1897,"const income = Math.floor(population * taxRate * 0.1 + jobs * taxRate * 0.05);"),
("monthly sink: first service cost times funding",S,1900,"expenses += Math.floor(budget.police.cost * budget.police.funding / 100);"),
("monthly sink: last service in the sum",S,1907,"expenses += Math.floor(budget.water.cost * budget.water.funding / 100);"),
("per-building budget cost: police",S,2004,"newBudget.police.cost = policeCount * 50;"),
("per-building budget cost: power",S,2010,"newBudget.power.cost = powerCount * 150;"),
("demand multiplier from effective tax",S,1842,"const taxMultiplier = Math.max(0, 1 - (effectiveTaxRate - 9) / 91);"),
("demand additive from effective tax",S,1846,"const taxAdditiveModifier = (9 - effectiveTaxRate) * 2;"),
("tax lag: 3 percent of the gap per tick",S,2416,"const newEffectiveTaxRate = state.effectiveTaxRate + taxRateDiff * 0.03;"),
("stats recomputed each tick from the formulas",S,2419,"const newStats = calculateStats(newGrid, size, newBudget"),
("money carried over, not recomputed",S,2420,"newStats.money = state.stats.money;"),
("demand smoothing 12 percent per tick",S,2427,"const smoothingFactor = 0.12;"),
("day rolls at 30 ticks",S,2446,"if (newTick >= 30) {"),
("settlement on day multiples of 7",S,2451,"if (newDay % 7 === 0) {"),
("weekly deposit: quarter of monthly net",S,2452,"newStats.money += Math.floor((newStats.income - newStats.expenses) / 4);"),
("tick returns the new stats object",S,2502,"stats: newStats,"),
("tick entry point",S,2152,"export function simulateTick(state: GameState): GameState {"),
("service max level 5",S,1250,"export const SERVICE_MAX_LEVEL = 5;"),
("upgrade base 2 per level",S,1252,"export const SERVICE_UPGRADE_COST_BASE = 2;"),
("upgrade cost: base times 2 to the level",S,1377,"const upgradeCost = baseCost * Math.pow(SERVICE_UPGRADE_COST_BASE, building.level);"),
("upgrade gate: money must cover it",S,1380,"if (state.stats.money < upgradeCost) return null;"),
("upgrade debits the balance",S,1389,"money: state.stats.money - upgradeCost,"),
("finance advisor: net income below zero",S,2067,"const netIncome = stats.income - stats.expenses;"),
("finance advisor: critical below minus 500",S,2073,"priority: netIncome < -500 ? 'critical' : 'high',"),
("client tick interval table (desktop)",GC,812,"(state.speed === 1 ? 500 : state.speed === 2 ? 300 : 200);"),
("client tick: setInterval per speed",GC,814,"timer = setInterval(() => {"),
("client tick calls simulateTick once per interval",GC,819,"const newState = simulateTick(latestStateRef.current);"),
("tax rate setter clamps 0..100",GC,849,"setState((prev) => ({ ...prev, taxRate: clamp(rate, 0, 100) }));"),
("build gate: cost above zero needs the balance",GC,887,"if (cost > 0 && prev.stats.money < cost) return prev;"),
("build debit",GC,912,"money: nextState.stats.money - cost"),
("trade bonus one-time 5000",GC,1011,"const tradeBonus = 5000;"),
("trade income 200 per month",GC,1012,"const tradeIncome = 200; // Monthly income from trade"),
("trade income added to the monthly stats field",GC,1020,"income: prev.stats.income + tradeIncome,"),
("trade bonus added to the balance",GC,1019,"money: prev.stats.money + tradeBonus,"),
("addMoney entry point on the context",GC,1421,"const addMoney = useCallback((amount: number) => {"),
("addMoney adds to the balance",GC,1426,"money: prev.stats.money + amount,"),
("save to localStorage with compression",GC,348,"// Save game state to localStorage with lz-string compression"),
("save write",GC,375,"localStorage.setItem(STORAGE_KEY, compressed);"),
("load read",GC,178,"const saved = localStorage.getItem(STORAGE_KEY);"),
("ref synced from React state",GC,715,"latestStateRef.current = state;"),
("tool cost: bulldoze",GT,37,"bulldoze: { name: msg('Bulldoze'), cost: 10,"),
("tool cost: road",GT,38,"road: { name: msg('Road'), cost: 25,"),
("tool cost: residential zone",GT,44,"zone_residential: { name: msg('Residential'), cost: 50,"),
("tool cost: police station",GT,50,"police_station: { name: msg('Police'), cost: 500,"),
("tool cost: power plant",GT,58,"power_plant: { name: msg('Power Plant'), cost: 3000,"),
]
with open(sys.argv[1],"a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,fn,ln,q in rows:
        assert '\t' not in q
        w.writerow([G,claim,fn,str(ln),q])
print(len(rows),"rows")
