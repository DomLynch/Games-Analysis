import sys, csv
# stdin: TSV draft with header note,claim,donor_file,line,quote (line may be blank)
# finds the 1-based line of each quote in its donor_file (exact substring, must match exactly one line)
rows = list(csv.reader(sys.stdin, delimiter='\t', quoting=csv.QUOTE_NONE))
hdr = rows[0]
out = ['\t'.join(hdr)]
cache = {}
errs = 0
for r in rows[1:]:
    if len(r) < 5:
        continue
    note, claim, f, _, q = r[0], r[1], r[2], r[3], r[4]
    if f not in cache:
        cache[f] = open(f, encoding='utf-8-sig', errors='replace').read().split('\n')
    lines = cache[f]
    hits = [i + 1 for i, l in enumerate(lines) if q in l]
    if len(hits) != 1:
        errs += 1
        sys.stderr.write('NOT UNIQUE/NOT FOUND (%d hits): %s | %s\n' % (len(hits), f, q))
        continue
    if not (15 <= len(q) <= 90):
        errs += 1
        sys.stderr.write('LENGTH %d: %s\n' % (len(q), q))
        continue
    out.append('\t'.join([note, claim, f, str(hits[0]), q]))
sys.stdout.write('\n'.join(out) + '\n')
sys.stderr.write('resolved %d rows, errors %d\n' % (len(out) - 1, errs))
