# Builds receipts.tsv rows by finding each quote's real line on the VPS (grep -nF). Usage: mkrec.py <spec.tsv> <out.tsv> [append]
# spec columns: note, claim, donor_file(absolute), quote   (quote must occur on exactly one line; ambiguous quotes are reported and skipped)
import sys, subprocess, shlex, csv
spec_path, out_path = sys.argv[1], sys.argv[2]
append = len(sys.argv) > 3 and sys.argv[3] == 'append'
rows = [r for r in csv.reader(open(spec_path, newline=''), delimiter='\t', quoting=csv.QUOTE_NONE) if r and r[0] != 'note']
parts = []
for i, r in enumerate(rows):
    note, claim, f, q = r[:4]
    parts.append("echo '@@%d'; grep -nF -- %s %s | head -4" % (i, shlex.quote(q), shlex.quote(f)))
cmd = '; '.join(parts)
out = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-i', '/Users/domininclynch/.ssh/binance_futures_tool', 'root@49.12.7.18', cmd],
                     capture_output=True, text=True, stdin=subprocess.DEVNULL).stdout
sections = {}
cur = None
for line in out.split('\n'):
    if line.startswith('@@'):
        cur = int(line[2:]); sections[cur] = []
    elif cur is not None and line:
        sections[cur].append(line)
good = []
bad = 0
for i, r in enumerate(rows):
    note, claim, f, q = r[:4]
    pick = r[4] if len(r) > 4 else 'only'
    hits = sections.get(i, [])
    if not (15 <= len(q) <= 90):
        print('LEN FAIL', i, len(q), q[:60]); bad += 1; continue
    if pick == 'first' and len(hits) >= 1:
        hits = hits[:1]
    if pick == 'last' and len(hits) >= 1:
        hits = hits[-1:]
    if len(hits) != 1:
        print('MATCH COUNT', len(hits), i, f, q[:70], hits[:3]); bad += 1; continue
    ln = hits[0].split(':', 1)[0]
    good.append([note, claim.replace('\t', ' '), f, ln, q])
mode = 'a' if append else 'w'
with open(out_path, mode, newline='') as fh:
    w = csv.writer(fh, delimiter='\t', quoting=csv.QUOTE_NONE, escapechar=None, lineterminator='\n')
    if not append: w.writerow(['note', 'claim', 'donor_file', 'line', 'quote'])
    for g in good: w.writerow(g)
print('written', len(good), 'skipped', bad)
