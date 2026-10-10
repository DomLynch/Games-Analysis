import subprocess,sys,json
# usage: findlines.py <donor_file> <pattern1> [pattern2 ...]  -> prints line numbers (grep -n -F) for each pattern
f=sys.argv[1]; pats=sys.argv[2:]
script="\n".join(f"echo '##PAT {i}'; grep -n -F -- {json.dumps(p)} {f} || echo NOHIT" for i,p in enumerate(pats))
# use a here-doc-free approach: pass patterns through a bash script with printf
import shlex
cmds=[]
for i,p in enumerate(pats):
    cmds.append(f"echo {shlex.quote('## '+p)}; grep -n -F -- {shlex.quote(p)} {shlex.quote(f)} || echo NOHIT")
out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18'," ; ".join(cmds)],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
print(out)
