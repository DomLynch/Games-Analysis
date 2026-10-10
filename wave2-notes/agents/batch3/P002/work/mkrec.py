# Helper: finds each quote's line on the VPS (grep -nF) and appends a receipt row.
# Usage: python3 mkrec.py <receipts.tsv> <specs.json>
import json, shlex, subprocess, sys
REC, SPEC = sys.argv[1], sys.argv[2]
specs = json.load(open(SPEC))
ROOT = "/mnt/frankendom-donors/"
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-i", "/Users/domininclynch/.ssh/binance_futures_tool", "root@49.12.7.18"]
out_rows = []
for s in specs:
    path = ROOT + s["file"]
    q = s["quote"]
    if not (15 <= len(q) <= 90):
        print("LENGTH FAIL", len(q), q); continue
    cmd = "grep -nF -- " + shlex.quote(q) + " " + shlex.quote(path) + " | head -5"
    r = subprocess.run(SSH + [cmd], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    hits = [int(l.split(":", 1)[0]) for l in r.stdout.splitlines() if ":" in l]
    if not hits:
        print("NOT FOUND", s["file"], q); continue
    line = s.get("line")
    if line is None:
        if len(hits) > 1:
            print("AMBIGUOUS, give line:", s["file"], hits, q); continue
        line = hits[0]
    elif line not in hits:
        print("LINE MISMATCH", s["file"], line, hits, q); continue
    out_rows.append([s["note"], s["claim"], path, str(line), q])
with open(REC, "a") as fh:
    for row in out_rows:
        fh.write("\t".join(row) + "\n")
print("appended", len(out_rows), "of", len(specs))
