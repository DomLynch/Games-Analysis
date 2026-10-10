import csv
G="amilich-isometric-city"; S="/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts"
rows=[("service cost: fire station count times 50",S,2005,"newBudget.fire.cost = fireCount * 50;"),
("service cost: hospital count times 100",S,2006,"newBudget.health.cost = hospitalCount * 100;"),
("service cost: schools and universities",S,2007,"newBudget.education.cost = schoolCount * 30 + universityCount * 100;"),
("service cost: roads, subway tiles, stations",S,2008,"newBudget.transportation.cost = roadCount * 2 + subwayTileCount * 3 + subwayStationCount * 25;"),
("service cost: parks",S,2009,"newBudget.parks.cost = parkCount * 10;"),
("service cost: water towers",S,2011,"newBudget.water.cost = waterCount * 75;")]
with open("receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for c,fn,ln,q in rows: w.writerow([G,c,fn,str(ln),q])
print(len(rows))
