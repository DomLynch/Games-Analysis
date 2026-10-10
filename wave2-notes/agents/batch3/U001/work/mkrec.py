# Builds receipt rows from a spec: note, claim, key, line[, quote]. Reads donor lines via ssh (VPS only).
import sys, subprocess, collections, csv
KEYS = {
 'BW':  '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Weapons/BaseWeapon.cs',
 'AOS': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/AOS.cs',
 'SKC': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs',
 'MOB': '/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs',
 'BAI': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/BaseAI.cs',
 'BCR': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs',
 'MEL': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/MeleeAI.cs',
 'SPB': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/BaseSpawner.cs',
 'SPE': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/SpawnerEntry.cs',
 'PRX': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Spawners/ProximitySpawner.cs',
 'ATM': '/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/AI/BaseAI/AITimer.cs',
}
spec, out = sys.argv[1], sys.argv[2]
rows = [l.rstrip('\n').split('\t') for l in open(spec) if l.strip()]
need = collections.defaultdict(set)
for r in rows: need[KEYS[r[2]]].add(int(r[3]))
text = {}
for f, ls in need.items():
    cmd = "awk 'BEGIN{split(\"%s\",a,\",\");for(i in a)w[a[i]]=1} (NR in w){print NR\"\\t\"$0}' '%s'" % (",".join(map(str, sorted(ls))), f)
    o = subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=8','-i','/Users/domininclynch/.ssh/binance_futures_tool','root@49.12.7.18',cmd],capture_output=True,text=True,stdin=subprocess.DEVNULL).stdout
    for l in o.split('\n'):
        if '\t' in l:
            n, t = l.split('\t', 1); text[(f, int(n))] = t
new = []
for r in rows:
    note, claim, key, line = r[0], r[1], r[2], int(r[3])
    f = KEYS[key]; t = text.get((f, line))
    if t is None: sys.exit('MISSING LINE %s %d' % (key, line))
    q = r[4] if len(r) > 4 else t.strip()
    if len(r) <= 4 and len(q) > 90:
        cut = q[:90]
        k = max(cut.rfind(' '), cut.rfind('('), cut.rfind(','))
        q = cut[:k].rstrip() if k >= 15 else cut
    if not (15 <= len(q) <= 90): sys.exit('BAD LEN %d: %s | %s %s' % (len(q), q, claim, line))
    if q not in t: sys.exit('NOT IN LINE %s %d: %s' % (key, line, q))
    new.append([note, claim, f, str(line), q])
w = csv.writer(open(out, 'a', newline=''), delimiter='\t', quoting=csv.QUOTE_NONE, escapechar='\\', lineterminator='\n')
for n in new: w.writerow(n)
print('appended', len(new))
