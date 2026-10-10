import sys,subprocess,shlex
# usage: findq.py  reads TSV lines "file<TAB>quote" from stdin, prints grep -n -F hits on the VPS
pairs=[l.rstrip('\n').split('\t',1) for l in sys.stdin if l.strip()]
cmd='; '.join('echo "## %s | %s"; grep -n -F -- %s %s || echo NOHIT' % (f.split('/')[-1], q[:40].replace('"',''), shlex.quote(q), shlex.quote(f)) for f,q in pairs)
out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL)
print(out.stdout); print(out.stderr[-500:])
