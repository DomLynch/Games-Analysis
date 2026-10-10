import sys, csv
# usage: add_rows.py <receipts.tsv> ; reads rows from stdin: note|claim|file|line|quote
path = sys.argv[1]
rows = []
for raw in sys.stdin.read().splitlines():
    if not raw.strip():
        continue
    parts = raw.split('|', 4)
    assert len(parts) == 5, raw
    rows.append(parts)
with open(path, 'a') as f:
    for r in rows:
        assert '\t' not in ''.join(r)
        f.write('\t'.join(r) + '\n')
print('appended', len(rows))
