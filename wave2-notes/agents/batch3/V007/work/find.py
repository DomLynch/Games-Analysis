import sys
# usage: python3 find.py patternsfile file1 file2 ...
pats=[l.rstrip('\n') for l in open(sys.argv[1],encoding='utf-8') if l.strip()]
for f in sys.argv[2:]:
    lines=open(f,encoding='utf-8-sig').read().split('\n')
    for p in pats:
        for i,l in enumerate(lines,1):
            if p in l:
                print(f"{f.split('/')[-1]}:{i}: {l.strip()}")
