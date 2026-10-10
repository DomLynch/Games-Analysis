import sys, json, base64, subprocess
# usage: mkrec.py <spec.json> <out.tsv(append)>  spec = [[note, claim, donor_file, quote], ...]
spec = json.load(open(sys.argv[1]))
remote = r'''
import sys, json, base64
items = json.loads(base64.b64decode(sys.argv[1]).decode())
res = []
cache = {}
for note, claim, f, q in items:
    if f not in cache:
        cache[f] = open(f, encoding="utf-8", errors="replace").read().split("\n")
    hits = [i + 1 for i, l in enumerate(cache[f]) if q in l]
    res.append([len(hits), hits[0] if hits else -1, cache[f][hits[0]-1] if hits else ""])
print(json.dumps(res))
'''
enc = base64.b64encode(json.dumps(spec).encode()).decode()
cmd = "python3 -c " + "'" + remote.replace("'", "'\"'\"'") + "' " + enc
out = subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL)
if out.returncode != 0:
    print("REMOTE ERROR", out.stderr[:800]); sys.exit(1)
res = json.loads(out.stdout)
rows = []
bad = 0
FIRST = len(sys.argv) > 3 and sys.argv[3] == 'first'
for (note, claim, f, q), (n, line, text) in zip(spec, res):
    if n != 1 and not (n > 1 and FIRST):
        print("MATCH COUNT", n, "for", f, repr(q)); bad += 1; continue
    if '\t' in q or len(q) < 15 or len(q) > 90:
        print("QUOTE LEN/TAB PROBLEM", len(q), repr(q)); bad += 1; continue
    rows.append((note, claim, f, str(line), q))
with open(sys.argv[2], "a", encoding="utf-8") as fh:
    for r in rows:
        fh.write("\t".join(r) + "\n")
print("wrote", len(rows), "rows; bad", bad)
