import subprocess,sys,json
base='/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/'
def find(rel, subs):
    out={}
    for s in subs:
        cmd="grep -nF -- %s %s" % ("'"+s.replace("'","'\\''")+"'", "'"+base+rel+"'")
        r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL)
        out[s]=[int(l.split(':',1)[0]) for l in r.stdout.splitlines() if ':' in l]
    return out
rel=sys.argv[1]; subs=sys.argv[2:]
print(json.dumps(find(rel,subs),indent=0))
