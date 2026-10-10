import subprocess, csv
N="TrinityCore-TrinityCore"
G="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/"
pairs=[
("raid size FIXME (raid bonus not finished)","Miscellaneous/Formulas.h",227),
("pet XP share comment","Entities/Player/KillRewarder.cpp",165),
("gray test decides top non-grey member","Entities/Player/KillRewarder.cpp",110),
("max counted level tracked","Entities/Player/KillRewarder.cpp",105),
("RewardXP group check","Entities/Player/KillRewarder.cpp",143),
("RewardXP starts from base xp","Entities/Player/KillRewarder.cpp",142),
("personal rate is 100 percent","Entities/Player/KillRewarder.cpp",207),
("RewardXP only if xp nonzero","Entities/Player/KillRewarder.cpp",208),
("group loop skipped without counted members","Entities/Player/KillRewarder.cpp",222),
]
byfile={}
for c,f,n in pairs: byfile.setdefault(f,set()).add(n)
got={}
for f,ns in byfile.items():
    cmd=" ; ".join(f'sed -n "{n}p" {G}{f} | sed "s/^/{n}\\t/"' for n in sorted(ns))
    out=subprocess.run(["ssh","-o","BatchMode=yes","-o","ConnectTimeout=8","-i","/Users/domininclynch/.ssh/binance_futures_tool","root@49.12.7.18",cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    for l in out.split("\n"):
        if "\t" in l:
            n,t=l.split("\t",1); got[(f,int(n))]=t
rows=[]
for c,f,n in pairs:
    raw=got[(f,n)]; s=raw.strip()
    q = s[:90] if len(s)>=15 else raw.rstrip()
    assert q.strip() in raw
    rows.append((N,c,G+f,str(n),(q if len(s)<15 else q.strip())))
with open("/private/tmp/p2/wave2-haiku/batch3/V011/work/cell2-receipts-b.tsv","w") as fh:
    for r in rows: fh.write("\t".join(r)+"\n")
for r in rows: print(r[3], len(r[4]), repr(r[4][:70]))
