import subprocess, sys, json
from collections import defaultdict
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-i", "/Users/domininclynch/.ssh/binance_futures_tool", "root@49.12.7.18"]
# usage: make_rows.py <note> <donor_root> <spec.json> <out.tsv>
note, DR, specf, outf = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
SPEC = json.load(open(specf, encoding="utf-8"))  # list of [file, line, substring, claim]
byfile = defaultdict(set)
for f, n, s, c in SPEC: byfile[f].add(n)
text = {}
for f, ns in byfile.items():
    awk = "awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s%s'" % (",".join(map(str, sorted(ns))), DR, f)
    out = subprocess.run(SSH + [awk], capture_output=True, text=True, stdin=subprocess.DEVNULL).stdout
    d = {}
    for l in out.split("\n"):
        if "\t" in l:
            a, b = l.split("\t", 1); d[int(a)] = b
    text[f] = d
rows = []; bad = []
for f, n, s, c in SPEC:
    line = text[f].get(n, "")
    if s in line and 15 <= len(s) <= 90 and "\t" not in s:
        rows.append("\t".join((note, c, DR + f, str(n), s)))
    else:
        bad.append((f, n, s, len(s), s in line))
open(outf, "w", encoding="utf-8").write("\n".join(rows) + ("\n" if rows else ""))
print("rows", len(rows), "bad", len(bad))
for b in bad: print("BAD", b)
