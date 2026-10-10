# Appends receipts after checking each quote is an exact substring of the donor line (fetched over ssh, read-only).
import sys, subprocess, json
SSH = ['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18']
cache = {}
def lines_of(path):
    if path not in cache:
        out = subprocess.run(SSH + ['cat ' + path], capture_output=True, text=True, stdin=subprocess.DEVNULL).stdout
        cache[path] = out.split('\n')
    return cache[path]
def check(note, claim, path, line, quote):
    L = lines_of(path)
    ok = 15 <= len(quote) <= 90 and 1 <= line <= len(L) and quote in L[line-1]
    return ok
if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    bad = 0
    rows = []
    for r in spec:
        note, claim, path, line, quote = r
        if check(note, claim, path, line, quote):
            rows.append('\t'.join([note, claim, path, str(line), quote]))
        else:
            bad += 1
            print('BAD', path, line, repr(quote)[:80])
    with open(out, 'a') as f:
        for x in rows: f.write(x + '\n')
    print('appended', len(rows), 'bad', bad)
