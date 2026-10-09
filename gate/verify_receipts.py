import sys,csv,subprocess,collections
rows=list(csv.reader(open(sys.argv[1],newline=''),delimiter='\t',quoting=csv.QUOTE_NONE))[1:]
byfile=collections.defaultdict(list)
for r in rows:
    if len(r)>=5: byfile[r[2]].append(r)
bad=[];ok=0
for f,rs in byfile.items():
    lines=sorted({int(r[3]) for r in rs if r[3].isdigit()})
    if not lines: continue
    cmd="awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s'"%(",".join(map(str,lines)),f)
    out=subprocess.run(['ssh','-o','BatchMode=yes','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    got={}
    for l in out.split('\n'):
        if '\t' in l:
            n,t=l.split('\t',1); got[int(n)]=t
    for r in rs:
        n=int(r[3]) if r[3].isdigit() else -1
        if n in got and r[4].strip() and r[4].strip() in got[n]: ok+=1
        else: bad.append((r[0],r[1],f,r[3],r[4][:50]))
print('receipts ok',ok,'failed',len(bad))
for b in bad[:50]: print(' FAIL',b)
