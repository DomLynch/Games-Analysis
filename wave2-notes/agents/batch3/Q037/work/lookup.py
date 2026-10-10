import subprocess,shlex,sys,json
# args: json list of [file_basename_relpath, quote]; prints file<TAB>line<TAB>quote (first match, and match count)
items=json.loads(sys.stdin.read())
root='/mnt/frankendom-donors/evennia-evennia/'
cmds=[]
for rel,q in items:
    cmds.append("echo %s; grep -nF -- %s %s | head -3; echo ===" % (shlex.quote(rel+' :: '+q), shlex.quote(q), shlex.quote(root+rel)))
remote=' ; '.join(cmds)
out=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',remote],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
print(out)
