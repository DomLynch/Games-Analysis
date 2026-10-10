import subprocess, sys, collections, importlib.util
spec=importlib.util.spec_from_file_location("spec", sys.argv[1]); S=importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
out=sys.argv[2]
by=collections.OrderedDict()
for f,n,c,q in S.R: by.setdefault(f,[]).append((n,c,q))
rows=[]; bad=0
for f,items in by.items():
    lines=sorted({n for n,_,_ in items})
    cmd="awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s'"%(",".join(map(str,lines)),f)
    o=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    got={}
    for l in o.split('\n'):
        if '\t' in l:
            a,b=l.split('\t',1); got[int(a)]=b.rstrip('\r')
    for n,c,q in items:
        if n in got and q in got[n] and 15<=len(q)<=90: rows.append((S.NOTE,c,f,str(n),q))
        else: bad+=1; print("BAD",f.split('/')[-1],n,repr(q),repr(got.get(n,''))[:100])
with open(out,'w') as fh:
    fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in rows: fh.write("\t".join(r)+"\n")
print("written",len(rows),"of",len(S.R),"bad",bad)
