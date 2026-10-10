import subprocess,shlex,sys,json
items=json.loads(sys.stdin.read())
root='/mnt/frankendom-donors/l1j-en-classic/'
cmds=[]
for rel,q in items:
    cmds.append("echo %s; grep -nF -- %s %s | head -4; echo ===" % (shlex.quote(rel+' :: '+q), shlex.quote(q), shlex.quote(root+rel)))
remote=' ; '.join(cmds)
out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',remote],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
print(out)
