import subprocess
N="TrinityCore-TrinityCore"
G="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/"
pairs=[
("licence: any later version (KillRewarder header)","Entities/Player/KillRewarder.cpp",7),
("KillRewarder group-data init","Entities/Player/KillRewarder.cpp",89),
("count only killer or alive in-range members","Entities/Player/KillRewarder.cpp",97),
("count increment","Entities/Player/KillRewarder.cpp",101),
("sumLevel accumulation","Entities/Player/KillRewarder.cpp",103),
("comment claims all members for full XP","Entities/Player/KillRewarder.cpp",49),
("top non-gray member recorded","Entities/Player/KillRewarder.cpp",111),
("full XP flag tests only top member","Entities/Player/KillRewarder.cpp",116),
("solo count is 1","Entities/Player/KillRewarder.cpp",119),
("base XP from Trinity::XP::Gain","Entities/Player/KillRewarder.cpp",130),
("zero XP gate: alive and not above top non-gray level","Entities/Player/KillRewarder.cpp",148),
("full share","Entities/Player/KillRewarder.cpp",151),
("half share plus one","Entities/Player/KillRewarder.cpp",152),
("zero otherwise","Entities/Player/KillRewarder.cpp",154),
("aura XP multiplier","Entities/Player/KillRewarder.cpp",159),
("GiveXP receives group rate","Entities/Player/KillRewarder.cpp",163),
("per-member rate is group rate times level over sum","Entities/Player/KillRewarder.cpp",206),
("RewardXP called with that rate","Entities/Player/KillRewarder.cpp",210),
("group branch: max-level base","Entities/Player/KillRewarder.cpp",227),
("group rate from count and raid flag","Entities/Player/KillRewarder.cpp",238),
("reward distance check per member","Entities/Player/KillRewarder.cpp",246),
("reward each member","Entities/Player/KillRewarder.cpp",247),
("solo killer path","Entities/Player/KillRewarder.cpp",279),
("group rate function signature","Miscellaneous/Formulas.h",221),
("raid group rate 0.99","Miscellaneous/Formulas.h",229),
("count switch","Miscellaneous/Formulas.h",233),
("rate 1.0 for counts 0 to 2","Miscellaneous/Formulas.h",238),
("rate 1.166 for count 3","Miscellaneous/Formulas.h",241),
("rate 1.3 for count 4","Miscellaneous/Formulas.h",244),
("rate 1.4 for count 5 and up","Miscellaneous/Formulas.h",248),
("gray level function exists (body not read)","Miscellaneous/Formulas.h",70),
("base Gain function exists (body not read)","Miscellaneous/Formulas.h",181),
("GiveXP signature takes group_rate","Entities/Player/Player.cpp",2110),
("GiveXP skips creature without loot recipient","Entities/Player/Player.cpp",2121),
("rest bonus added on kill","Entities/Player/Player.cpp",2139),
("group_rate only sent to client","Entities/Player/Player.cpp",2146),
("new XP sums base, rest and current","Entities/Player/Player.cpp",2150),
]
def fetch(files_lines):
    cmd=" ; ".join(f'printf "%s\\t" {n}; sed -n "{n}p" {G}{f}' for f,n in files_lines)
    return subprocess.run(["ssh","-o","BatchMode=yes","-o","ConnectTimeout=8","-i","/Users/domininclynch/.ssh/binance_futures_tool","root@49.12.7.18",cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
# one ssh per file for efficiency
rows=[]
for claim,f,n in pairs:
    rows.append((claim,f,n))
got={}
byfile={}
for claim,f,n in rows: byfile.setdefault(f,set()).add(n)
for f,ns in byfile.items():
    cmd=" ; ".join(f'sed -n "{n}p" {G}{f} | sed "s/^/{n}\\t/"' for n in sorted(ns))
    out=subprocess.run(["ssh","-o","BatchMode=yes","-o","ConnectTimeout=8","-i","/Users/domininclynch/.ssh/binance_futures_tool","root@49.12.7.18",cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    for l in out.split("\n"):
        if "\t" in l:
            n,t=l.split("\t",1); got[(f,int(n))]=t
out_rows=[]
for claim,f,n in rows:
    raw=got[(f,n)]
    s=raw.strip()
    if len(s)>=15: q=s[:90]
    else: q=raw.rstrip()
    assert q.strip() in raw, (f,n)
    if not (15<=len(q.strip())<=90): print("LEN?",f,n,len(q.strip()),q)
    out_rows.append((N,claim,G+f,str(n),(q if len(s)<15 else q.strip())))
with open("/private/tmp/p2/wave2-haiku/batch3/V011/work/cell2-receipts.tsv","w") as fh:
    fh.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in out_rows: fh.write("\t".join(r)+"\n")
for r in out_rows: print(r[3], len(r[4]), r[4][:70])
