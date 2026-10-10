import csv,sys
N='alexbatalov-fallout2-ce'
W='/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc'
rows=[
(W,1782,'entry counter defaults to -1 (not spent)','encounterTableEntry->counter = -1;'),
(W,1438,'entry counter is set from the table config','strParseIntWithKey(&string, "counter", &(encounterTableEntry->counter), ":");'),
(W,1219,'entry counter is restored from the save','if (fileReadInt32(stream, &(encounterTableEntry->counter)) == -1) return -1;'),
]
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for path,line,claim,quote in rows:
        w.writerow([N,claim,path,str(line),quote])
print('ok')
