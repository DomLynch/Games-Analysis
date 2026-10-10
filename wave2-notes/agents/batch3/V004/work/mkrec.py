import sys
# usage: python3 -I mkrec.py spec.tsv ; spec columns: claim, file, quote
# prints receipts rows (note set via NOTE env var default swgemu-Core3) and reports problems to stderr
import os
note = os.environ.get("NOTE", "swgemu-Core3")
cache = {}
def load(path):
    if path not in cache:
        cache[path] = open(path, encoding="utf-8", errors="replace").read().split("\n")
    return cache[path]
rows = []
bad = 0
for raw in open(sys.argv[1], encoding="utf-8"):
    raw = raw.rstrip("\n")
    if not raw.strip() or raw.startswith("#"):
        continue
    parts = raw.split("\t")
    claim, path, quote = parts[0], parts[1], parts[2]
    minline = int(parts[3]) if len(parts) > 3 else 1
    lines = load(path)
    hits = [i + 1 for i, l in enumerate(lines) if quote in l and i + 1 >= minline]
    if len(quote) < 15 or len(quote) > 90:
        print("LEN-BAD %d %r" % (len(quote), quote), file=sys.stderr); bad += 1; continue
    if not hits:
        print("NOT-FOUND %r in %s" % (quote, path), file=sys.stderr); bad += 1; continue
    if len(hits) > 1:
        print("AMBIGUOUS %s lines %s : %r" % (path, hits, quote), file=sys.stderr)
    rows.append((note, claim, path, hits[0], quote))
for r in rows:
    print("\t".join(str(x) for x in r))
print("PROBLEMS=%d" % bad, file=sys.stderr)
