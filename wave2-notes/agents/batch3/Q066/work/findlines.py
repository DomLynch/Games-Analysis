import subprocess,sys
def numbered(path):
    out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',"cat -n '%s'"%path],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    res=[]
    for l in out.split('\n'):
        t=l.strip()
        if not t: continue
        parts=t.split('\t',1)
        if len(parts)==2 and parts[0].isdigit(): res.append((int(parts[0]),parts[1]))
    return res
if __name__=='__main__':
    path=sys.argv[1]
    pats=[l.rstrip('\n') for l in open(sys.argv[2]) if l.strip()]
    lines=numbered(path)
    for p in pats:
        hits=[(n,t) for n,t in lines if p in t]
        if not hits: print('NOTFOUND |',p)
        for n,t in hits[:4]: print(n,'|',t[:120])
