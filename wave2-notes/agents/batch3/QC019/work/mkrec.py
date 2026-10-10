# Build receipts by grepping the exact substring on the VPS. Line number comes from grep, quote is the substring itself.
# usage: mkrec.py <note> <spec.tsv> <out.tsv> [append]
#   spec.tsv rows: claim<TAB>donor_file<TAB>substring   (substring 15-90 chars, must match exactly one line)
import subprocess,sys,collections
note,specf,outf=sys.argv[1],sys.argv[2],sys.argv[3]
append=len(sys.argv)>4 and sys.argv[4]=='append'
rows=[l.rstrip('\n').split('\t') for l in open(specf) if l.strip() and not l.startswith('#')]
byfile=collections.defaultdict(list)
for r in rows: byfile[r[1]].append(r)
out=[];errs=[]
SSH=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18']
for f,rs in byfile.items():
    # run one grep per substring, all in one ssh call, separated by markers
    script=" ; ".join("echo '@@%d'; grep -nF -- %s '%s'"%(i,"'"+r[2].replace("'","'\\''")+"'",f) for i,r in enumerate(rs))
    res=subprocess.run(SSH+[script],capture_output=True,text=True,stdin=subprocess.DEVNULL)
    blocks=collections.defaultdict(list); cur=None
    for l in res.stdout.split('\n'):
        if l.startswith('@@'): cur=int(l[2:]); continue
        if cur is not None and ':' in l:
            n,t=l.split(':',1); blocks[cur].append((int(n),t))
    for i,r in enumerate(rs):
        q=r[2]
        if not (15<=len(q)<=90): errs.append(('LEN',r[0],len(q))); continue
        m=blocks[i]
        if len(m)!=1: errs.append(('MATCH%d'%len(m),r[0],f,q[:60])); continue
        out.append((note,r[0],f,str(m[0][0]),q))
mode='a' if append else 'w'
with open(outf,mode) as fh:
    if not append: fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for o in out: fh.write('\t'.join(o)+'\n')
print('written',len(out),'errors',len(errs))
for e in errs: print(' ERR',e)
