# usage: mkrec.py <out.tsv> <note> <spec.py>  ; spec.py defines REC = [(claim, donor_file, quote), ...]
# Line numbers are looked up on the VPS with grep -n -F; a quote must hit exactly one line of its file.
import sys, shlex, subprocess, csv, runpy, collections
out, note, spec = sys.argv[1], sys.argv[2], sys.argv[3]
REC = runpy.run_path(spec)["REC"]
byfile = collections.OrderedDict()
FIRST = {}
for entry in REC:
    claim, f, q = entry[0], entry[1], entry[2]
    if len(entry) > 3 and entry[3] == "first":
        FIRST[(f, q)] = True
    byfile.setdefault(f, []).append((claim, q))
rows = []
bad = []
for f, items in byfile.items():
    cmds = []
    for i, (claim, q) in enumerate(items):
        cmds.append(f"echo {i}; grep -n -F -- {shlex.quote(q)} {shlex.quote(f)} | cut -d: -f1 | tr '\\n' ' '; echo")
    res = subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',"; ".join(cmds)],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout.strip().split("\n")
    hits = {}
    k = None
    for line in res:
        line = line.strip()
        if line.isdigit() and k is None:
            k = int(line); hits[k] = ""; continue
        if k is not None:
            hits[k] = line; k = None
    # the loop above is fragile; redo parse by pairs
    pairs = []
    lines = res
    for i in range(0, len(lines)-1, 2):
        pairs.append((lines[i], lines[i+1]))
    for i, (claim, q) in enumerate(items):
        idx, nums = pairs[i][0].strip(), pairs[i][1].strip()
        ls = [int(x) for x in nums.split()]
        if len(ls) > 1 and FIRST.get((f, q)):
            ls = ls[:1]
        if len(ls) != 1:
            print("NOT UNIQUE OR MISSING:", len(ls), f.split("/")[-1], repr(q[:70]), ls); bad.append(q); continue
        rows.append([note, claim, f, str(ls[0]), q.strip()])
with open(out, "w") as fh:
    fh.write("\t".join(["note","claim","donor_file","line","quote"]) + "\n")
    for r in rows:
        assert "\t" not in r[4] and "\n" not in r[4]
        fh.write("\t".join(r) + "\n")
print("wrote", len(rows), "rows to", out, "BAD", len(bad))
