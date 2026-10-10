import sys,csv
# usage: mkrec.py <receipts.tsv> <spec.tsv>   spec columns: note,claim,donor_file(abs),line,quote ; local copy = copies/<map>
# copies map: donor abs path -> local copy (passed in spec as 6th col "local")
rows=list(csv.reader(open(sys.argv[2]),delimiter='\t'))
out=[]
for r in rows[1:]:
    if not r or not r[0].strip(): continue
    note,claim,donor,line,quote,local=r[:6]
    L=open(local,encoding='utf-8').read().split('\n')
    n=int(line)
    ok = 1<=n<=len(L) and quote in L[n-1] and 15<=len(quote)<=90
    if not ok:
        print('BAD',note,claim[:40],donor,line,repr(quote)); continue
    out.append([note,claim,donor,line,quote])
with open(sys.argv[1],'a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for o in out: w.writerow(o)
print('wrote',len(out))
