import csv
D="/mnt/frankendom-donors/coding-horror-basic-computer-games/28_Combat/java/Combat.java"
N="coding-horror-basic-computer-games"
rows=[
("pool cap per side is 72000",18,"private static final int MAX_UNITS = 72000;"),
("cpu starting army 30000",27,"private int cpuArmy = 30000;"),
("cpu starting navy 20000",28,"private int cpuNavy = 20000;"),
("cpu starting air force 22000",29,"private int cpuAir = 22000;"),
("distribution loop rejects totals above the cap",68,"while ((usrArmy + usrNavy + usrAir) > MAX_UNITS);"),
("first strike army: below one third of own army loses the men sent",97,"if (numUnits < (usrArmy / 3.0)) {"),
("first strike army: mid band reports one third of men lost",101,"else if (numUnits < (2.0 * usrArmy / 3.0)) {"),
("first strike army mid band message uses two thirds of cpu army (bug, see README)",102,"(int) Math.floor(2.0 * cpuArmy / 3.0));"),
("first strike army high band: usr army cut to one third",109,"usrArmy = (int) Math.floor(usrArmy / 3.0);"),
("first strike navy band is compared with cpu navy, not user navy",117,"if (numUnits < (cpuNavy / 3.0)) {"),
("first strike air band is compared with own air force",136,"if (numUnits < (usrAir / 3.0)) {"),
("first strike air: band boundary at two thirds of own air force",140,"else if (numUnits < (2.0 * usrAir / 3.0)) {"),
("second strike army: below half of cpu army repulses the attack",193,"if (numUnits < (cpuArmy / 2.0)) {"),
("second strike navy: below half of cpu navy",205,"if (numUnits < (cpuNavy / 2.0)) {"),
("second strike air: above half of cpu air leads to counterattack",221,"if (numUnits > (cpuAir / 2.0)) {"),
("second strike air: half or less sets the plane-crash win flag",231,"planeCrashWin = true;"),
("win test: user total above 3/2 of cpu total",245,"((int) Math.floor((3.0 / 2.0 * (cpuArmy + cpuNavy + cpuAir"),
("loss test: user total below 2/3 of cpu total",249,"((int) Math.floor((2.0 / 3.0 * (cpuArmy + cpuNavy + cpuAir"),
("treaty branch text, the peaceful outcome",255,"THE TREATY OF PARIS CONCLUDED THAT WE TAKE OUR"),
("only java.lang.Math and java.util.Scanner imported, no random source",2,"import java.util.Scanner;"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q074/receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for c,l,q in rows:
        assert '\t' not in q
        print(len(q), q[:60])
        w.writerow([N,c,D,l,q])
