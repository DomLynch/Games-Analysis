import subprocess,sys,json
# usage: fetch.py  -> reads specs from stdin: file<TAB>line  ; prints file<TAB>line<TAB>text
rows=[l.rstrip('\n').split('\t') for l in sys.stdin if l.strip()]
by={}
for f,n in rows: by.setdefault(f,set()).add(int(n))
out=[]
for f,ns in by.items():
    cmd="awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s'"%(",".join(map(str,sorted(ns))),f)
    r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL)
    for l in r.stdout.split('\n'):
        if '\t' in l:
            n,t=l.split('\t',1); out.append((f,int(n),t))
for f,n,t in sorted(out,key=lambda x:(x[0],x[1])):
    print(f"{f}\t{n}\t{t}")
